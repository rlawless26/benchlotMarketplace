#!/usr/bin/env node

/**
 * Phase 2 of the training-corpus build.
 *
 * Walks the `externalListings` Firestore collection, fetches the hero image
 * for each qualifying plane listing, persists it to Storage, and writes a
 * `training_examples` doc with `label_provenance: 'normalizer'`. This is
 * the bulk-scale layer of the corpus — labels come from the M2 normalizer,
 * not expert review, but volume compensates.
 *
 * Filters (applied as Firestore queries + in-memory):
 *   - canonical_brand != null AND != 'Unknown'
 *   - canonical_type IN [plane categories — v5 scope]
 *   - status IN ['active', 'sold']  (skip 'expired', 'excluded_non_tool')
 *   - images.length > 0
 *
 * Stratification:
 *   - Per-cluster cap (default 500). Cumulative across runs — counts existing
 *     training_examples docs in each cluster before adding more.
 *
 * Idempotency:
 *   - Doc id format: `extlistings__{source}__{source_id}__0` (first image
 *     only in v1). Skip if doc already exists.
 *
 * Usage:
 *   node scripts/training-data/backfill-from-listings.js --dry-run --source jimbode --limit 50
 *   node scripts/training-data/backfill-from-listings.js --commit --source jimbode
 *   node scripts/training-data/backfill-from-listings.js --commit
 *   node scripts/training-data/backfill-from-listings.js --commit --max-per-cluster 200
 */

const path = require('path');
const fetch = require(path.join(__dirname, '..', '..', 'node_modules', 'node-fetch'));
const admin = require(path.join(__dirname, '..', '..', 'functions', 'node_modules', 'firebase-admin'));

const serviceAccount = require(path.join(__dirname, '..', '..', 'functions', 'service-account.json'));
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();

// ─── Config ─────────────────────────────────────────────────────────────────

const PLANE_TYPES = [
  'Bench Plane',
  'Block Plane',
  'Shoulder Plane',
  'Router Plane',
  'Plow Plane',
  'Rabbet Plane',
  'Moulding Plane',
  'Infill Plane',
  'Scrub Plane',
  'Combination Plane',
  'Chisel Plane',
  'Hawk Plane',
  'Spokeshave',
];

const STORAGE_PREFIX = 'training_data/external';
const USER_AGENT = 'Benchlot Training Data Backfill (research) +https://benchlot.com';

// Polite delay between image fetches per source. Conservative defaults to
// avoid getting rate-limited by source CDNs.
const FETCH_DELAY_MS = 350;

const args = process.argv.slice(2);
const dryRun = !args.includes('--commit');
function getArg(flag) {
  const idx = args.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
  if (idx === -1) return null;
  const a = args[idx];
  if (a.includes('=')) return a.split('=')[1];
  return args[idx + 1] || null;
}
const SOURCE = getArg('--source');
const LIMIT = getArg('--limit') ? parseInt(getArg('--limit'), 10) : null;
const MAX_PER_CLUSTER = getArg('--max-per-cluster')
  ? parseInt(getArg('--max-per-cluster'), 10)
  : 500;

// ─── Helpers ────────────────────────────────────────────────────────────────

function slug(s) {
  if (!s) return '_';
  const out = String(s)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return out || '_';
}

function clusterKey({ canonical_type, canonical_brand, canonical_size }) {
  return `pt::${slug(canonical_type)}::${slug(canonical_brand)}::${slug(canonical_size)}`;
}

function contentTypeToExt(ct) {
  if (!ct) return 'bin';
  const c = ct.toLowerCase();
  if (c.includes('jpeg') || c.includes('jpg')) return 'jpg';
  if (c.includes('png')) return 'png';
  if (c.includes('webp')) return 'webp';
  if (c.includes('heic')) return 'heic';
  return 'bin';
}

// Sniff image format from the first few bytes when the server doesn't send
// a content-type header (looking at you, Hyperkitten CDN). Returns the MIME
// type, or null if no known image signature matches.
function sniffImageContentType(buffer) {
  if (!buffer || buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  // WebP: "RIFF" .... "WEBP"
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  // HEIC: bytes 4-11 contain "ftypheic" / "ftypheix" / "ftypmif1"
  const ftyp = buffer.slice(4, 12).toString('ascii');
  if (ftyp.startsWith('ftypheic') || ftyp.startsWith('ftypheix') || ftyp.startsWith('ftypmif1')) return 'image/heic';
  // GIF: "GIF87a" or "GIF89a" — uncommon but cheap to detect
  if (buffer.slice(0, 6).toString('ascii').startsWith('GIF8')) return 'image/gif';
  return null;
}

async function fetchImageWithRetry(url, attempts = 2) {
  for (let i = 0; i < attempts; i++) {
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 15000,
      });
      if (!resp.ok) {
        if (i === attempts - 1) {
          return { error: `HTTP ${resp.status}` };
        }
        await sleep(500);
        continue;
      }
      const buffer = await resp.buffer();
      // Prefer the header's content-type when it's image/*; otherwise sniff
      // the bytes (some CDNs don't set a content-type header).
      let contentType = (resp.headers.get('content-type') || '').toLowerCase();
      if (!contentType.startsWith('image/')) {
        const sniffed = sniffImageContentType(buffer);
        if (sniffed) {
          contentType = sniffed;
        } else {
          return { error: `Not an image (header="${contentType}", sniff=null)` };
        }
      }
      return { buffer, contentType };
    } catch (err) {
      if (i === attempts - 1) {
        return { error: err.message };
      }
      await sleep(500);
    }
  }
  return { error: 'unreachable' };
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

// ─── Pre-flight: count existing training_examples per cluster ───────────────
// So the cap is cumulative across re-runs.
async function buildClusterCounts() {
  console.log('Pre-flight: counting existing training_examples per cluster...');
  const snap = await db.collection('training_examples')
    .where('label_provenance', '==', 'normalizer')
    .get();
  const counts = new Map();
  for (const doc of snap.docs) {
    const k = doc.data().cluster_key;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  console.log(`  ${snap.size} existing normalizer docs across ${counts.size} clusters\n`);
  return counts;
}

// ─── Per-listing processor ──────────────────────────────────────────────────

async function processListing(listing, clusterCounts, stats) {
  const { source, source_id, source_url } = listing;
  const docId = `extlistings__${source}__${source_id}__0`;
  const ref = db.collection('training_examples').doc(docId);

  // Idempotency check
  const existing = await ref.get();
  if (existing.exists) {
    stats.skipped_already_exists++;
    return;
  }

  // Cluster cap check
  const ck = clusterKey({
    canonical_type: listing.canonical_type,
    canonical_brand: listing.canonical_brand,
    canonical_size: listing.canonical_size || listing.canonical_model || null,
  });
  const currentCount = clusterCounts.get(ck) || 0;
  if (currentCount >= MAX_PER_CLUSTER) {
    stats.skipped_cluster_full++;
    return;
  }

  // Image url
  const imageUrl = Array.isArray(listing.images) && listing.images[0];
  if (!imageUrl) {
    stats.skipped_no_image++;
    return;
  }

  if (dryRun) {
    console.log(`  [dry-run] ${source}__${source_id}: ${listing.canonical_brand} / ${listing.canonical_type} / ${listing.canonical_model || '—'} (cluster=${currentCount}/${MAX_PER_CLUSTER})`);
    stats.dry_run++;
    clusterCounts.set(ck, currentCount + 1); // simulate the increment for accurate cluster-cap projection
    return;
  }

  // Fetch image
  await sleep(FETCH_DELAY_MS);
  const result = await fetchImageWithRetry(imageUrl);
  if (result.error) {
    console.warn(`  FAIL ${source}__${source_id}: image fetch failed (${result.error})`);
    stats.failed_fetch++;
    return;
  }

  // Quality: skip thumbnails / tiny images
  if (result.buffer.length < 8 * 1024) {
    stats.skipped_tiny_image++;
    return;
  }

  // Store
  const ext = contentTypeToExt(result.contentType);
  const storagePath = `${STORAGE_PREFIX}/${source}/${source_id}/0.${ext}`;
  try {
    await bucket.file(storagePath).save(result.buffer, {
      metadata: { contentType: result.contentType },
      resumable: false,
    });
  } catch (err) {
    console.warn(`  FAIL ${source}__${source_id}: storage save failed (${err.message})`);
    stats.failed_storage++;
    return;
  }

  // Write Firestore doc
  const doc = {
    image_path: storagePath,
    image_content_type: result.contentType,
    image_bytes: result.buffer.length,
    source: 'externalListings',
    source_id: `${source}__${source_id}`,
    source_url: source_url || null,
    listing_source: source,
    canonical_brand: listing.canonical_brand,
    canonical_type: listing.canonical_type,
    canonical_model: listing.canonical_model || null,
    canonical_size: listing.canonical_size || listing.canonical_model || null,
    plane_type_number: Number.isInteger(listing.plane_type_number) ? listing.plane_type_number : null,
    era_estimate: listing.era_estimate || null,
    condition: null, // not reliably populated in externalListings
    label_provenance: 'normalizer',
    label_confidence: 'medium',
    added_at: admin.firestore.FieldValue.serverTimestamp(),
    cluster_key: ck,
  };
  try {
    await ref.set(doc);
    clusterCounts.set(ck, currentCount + 1);
    stats.written++;
  } catch (err) {
    console.warn(`  FAIL ${source}__${source_id}: firestore set failed (${err.message})`);
    stats.failed_firestore++;
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`${dryRun ? 'DRY RUN' : 'COMMIT MODE'}`);
  console.log(`  source filter:   ${SOURCE || '(all)'}`);
  console.log(`  limit:           ${LIMIT || '(none)'}`);
  console.log(`  max per cluster: ${MAX_PER_CLUSTER}`);
  console.log('');

  const clusterCounts = await buildClusterCounts();

  // Build the Firestore query. Firestore's `in` operator caps at 10 values
  // per query — PLANE_TYPES has 13. We page through types in chunks of 10.
  const stats = {
    written: 0,
    skipped_already_exists: 0,
    skipped_cluster_full: 0,
    skipped_no_image: 0,
    skipped_tiny_image: 0,
    failed_fetch: 0,
    failed_storage: 0,
    failed_firestore: 0,
    dry_run: 0,
    seen: 0,
  };

  // Run query per status separately to keep payloads bounded and resumable.
  for (const status of ['active', 'sold']) {
    for (let typeOffset = 0; typeOffset < PLANE_TYPES.length; typeOffset += 10) {
      const typesSlice = PLANE_TYPES.slice(typeOffset, typeOffset + 10);
      let q = db.collection('externalListings')
        .where('status', '==', status)
        .where('canonical_type', 'in', typesSlice);
      if (SOURCE) q = q.where('source', '==', SOURCE);

      // Cursor pagination (Firestore caps single get at 1MB ≈ many docs)
      let lastSnap = null;
      while (true) {
        let pageQ = q.orderBy('__name__').limit(200);
        if (lastSnap) pageQ = pageQ.startAfter(lastSnap);
        const snap = await pageQ.get();
        if (snap.empty) break;

        for (const listingDoc of snap.docs) {
          if (LIMIT && stats.seen >= LIMIT) break;
          stats.seen++;
          const listing = listingDoc.data();

          // Belt-and-suspenders filters (the index might be eventually consistent)
          if (!listing.canonical_brand || listing.canonical_brand === 'Unknown') {
            continue;
          }
          if (!Array.isArray(listing.images) || listing.images.length === 0) {
            stats.skipped_no_image++;
            continue;
          }

          await processListing(listing, clusterCounts, stats);
        }

        if (LIMIT && stats.seen >= LIMIT) break;
        lastSnap = snap.docs[snap.docs.length - 1];
        if (snap.size < 200) break;
      }
      if (LIMIT && stats.seen >= LIMIT) break;
    }
    if (LIMIT && stats.seen >= LIMIT) break;
  }

  console.log('');
  console.log('=== Done ===');
  for (const [k, v] of Object.entries(stats)) {
    console.log(`  ${k.padEnd(28)} ${v}`);
  }
  if (dryRun) {
    console.log('\n(no writes performed — re-run with --commit to ingest)');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
