#!/usr/bin/env node

/**
 * Phase 1 of the training-corpus build.
 *
 * Walks `Test Photos/ground_truth.csv`, uploads each photo to Storage at
 * `gs://<bucket>/training_data/curated/<filename>`, and writes a Firestore
 * doc per row to the `training_examples` collection with
 * `label_provenance: 'curated'`. These are the highest-quality slice of the
 * corpus — hand-curated, expert-labeled, v5-schema-aligned.
 *
 * Usage:
 *   node scripts/training-data/import-curated-photos.js --dry-run
 *   node scripts/training-data/import-curated-photos.js --commit
 *   node scripts/training-data/import-curated-photos.js --commit --limit 10
 *
 * Idempotent: skips rows whose doc already exists in training_examples.
 * Re-runs are safe.
 *
 * Requires functions/service-account.json.
 */

const fs = require('fs');
const path = require('path');
// firebase-admin lives in functions/node_modules, not the repo root. Mirror
// the absolute-path require pattern from scripts/audit-brand-coverage.js.
const admin = require(path.join(__dirname, '..', '..', 'functions', 'node_modules', 'firebase-admin'));
const { parse } = require('csv-parse/sync');

// ─── Setup ──────────────────────────────────────────────────────────────────

const serviceAccountPath = path.join(__dirname, '..', '..', 'functions', 'service-account.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

const TEST_PHOTOS_DIR = path.join(__dirname, '..', '..', 'Test Photos');
const CSV_PATH = path.join(TEST_PHOTOS_DIR, 'ground_truth.csv');
const STORAGE_PREFIX = 'training_data/curated';

const args = process.argv.slice(2);
const dryRun = !args.includes('--commit');
const limitArg = args.find(a => a.startsWith('--limit'));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf(limitArg) + 1], 10) : null;

// ─── Bridges from CSV vocabulary → canonical_* vocabulary ───────────────────

// Maps CSV tool_type (more granular) to functions/normalize/vocabulary.js
// CANONICAL_TYPES (closed-list). Unknown types fall through to 'Other'.
const TYPE_BRIDGE = {
  // Bench planes — CSV is fine-grained (smoothing/jack/jointer/fore); v5 collapses to "Bench Plane"
  'smoothing plane': 'Bench Plane',
  'jack plane': 'Bench Plane',
  'jointer plane': 'Bench Plane',
  'fore plane': 'Bench Plane',
  'bench plane': 'Bench Plane',
  'low angle jack plane': 'Bench Plane',
  'low-angle jack plane': 'Bench Plane',
  'junior jack plane': 'Bench Plane',
  // Block planes
  'block plane': 'Block Plane',
  'low angle block plane': 'Block Plane',
  // Specialty planes
  'shoulder plane': 'Shoulder Plane',
  'shoulder/bullnose plane': 'Shoulder Plane',
  'router plane': 'Router Plane',
  'plow plane': 'Plow Plane',
  'rabbet plane': 'Rabbet Plane',
  'wooden molding plane': 'Moulding Plane',
  'moulding plane': 'Moulding Plane',
  'molding plane': 'Moulding Plane',
  'combination plane': 'Combination Plane',
  'tongue and groove plane': 'Combination Plane',
  'tongue & groove plane': 'Combination Plane',
  'scrub plane': 'Scrub Plane',
  'spokeshave': 'Spokeshave',
  // Chisels
  'bench chisel': 'Chisel',
  'bench chisel set': 'Chisel',
  'chisel set': 'Chisel',
  'chisel lot': 'Chisel',
  'japanese chisel': 'Chisel',
  'mortise chisel': 'Chisel',
  'paring chisel': 'Chisel',
  'firmer chisel': 'Chisel',
  // Gouges
  'carving gouge': 'Gouge',
  'carving gouge set': 'Gouge',
  // Cutting hand tools
  'drawknife': 'Drawknife',
  'card scraper': 'Card Scraper',
  'card scraper set': 'Card Scraper',
  'cabinet scraper': 'Cabinet Scraper',
  'marking knife': 'Knife',
  // Saws
  'handsaw': 'Hand Saw',
  'japanese pull saw': 'Japanese Saw',
  'tenon saw': 'Back Saw',
  'dovetail saw': 'Back Saw',
  'coping saw': 'Coping Saw',
  'fret saw': 'Coping Saw',
  'frame saw': 'Frame Saw',
  // Boring / drilling
  'brace': 'Brace',
  'brace (hand drill)': 'Brace',
  'ratchet brace': 'Brace',
  'hand drill': 'Eggbeater Drill',
  // Striking / shaping
  'adze': 'Adze',
  'hand adze': 'Adze',
  // Measuring / marking
  'marking gauge': 'Marking Gauge',
  'wheel marking gauge': 'Marking Gauge',
  'combination square': 'Square',
  'combination square set': 'Square',
  'sliding t-bevel': 'Bevel Gauge',
  'dividers': 'Caliper',
  'wing dividers': 'Caliper',
  'spring calipers': 'Caliper',
  // Workholding
  'holdfast': 'Holdfast',
  'bench hook': 'Vise',
  'bench vise': 'Vise',
  'woodworking vise': 'Vise',
  'moxon vise': 'Vise',
  'handscrew clamp': 'Clamp',
  'pipe clamp': 'Clamp',
  'bar clamp': 'Clamp',
  // Power tools
  'bandsaw': 'Band Saw',
  'table saw': 'Table Saw',
  'thickness planer': 'Thickness Planer',
  'track saw': 'Track Saw',
  'router': 'Router',
  'drill press': 'Drill Press',
};

// Maps CSV condition (free-form, sometimes compound) → v5 closed list
// (Excellent | Good | Fair | Project). Defaults to 'Good' for ambiguous strings.
function normalizeCondition(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  // Take the first slash-separated token for compound conditions like "Good/Fair"
  const first = s.split('/')[0].trim();
  if (first.includes('excellent') || first.includes('like new') || first.includes('new in') || first === 'new') return 'Excellent';
  if (first.includes('project') || first.includes('poor')) return 'Project';
  if (first.includes('fair')) return 'Fair';
  if (first.includes('good') || first.includes('very good') || first.includes('used') || first.includes('modern')) return 'Good';
  return 'Good';
}

function normalizeType(rawToolType) {
  if (!rawToolType) return 'Other';
  const key = String(rawToolType).trim().toLowerCase();
  return TYPE_BRIDGE[key] || 'Other';
}

// Extract Stanley type number (1-20) from the era field when explicitly stated.
// Examples: "1910-1918 (Type 11, Sweetheart)" → 11
//           "1919-1924 (Type 12)" → 12
function extractPlaneTypeNumber(eraRaw, modelRaw, brandRaw) {
  // Only meaningful for Stanley bench planes per v5 scope
  if (!brandRaw || !/^stanley/i.test(brandRaw)) return null;
  const candidates = [eraRaw, modelRaw].filter(Boolean).map(String);
  for (const s of candidates) {
    const m = s.match(/type[\s-]*(\d{1,2})/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 20) return n;
    }
  }
  return null;
}

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

// Mirrors functions/pricestats/cluster.js#clusterKey for cross-corpus joins.
function clusterKey({ canonical_type, canonical_brand, canonical_size }) {
  return `pt::${slug(canonical_type)}::${slug(canonical_brand)}::${slug(canonical_size)}`;
}

function contentTypeFor(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.heic') return 'image/heic';
  return 'application/octet-stream';
}

// ─── Per-row import ─────────────────────────────────────────────────────────

async function importRow(row, rowIndex) {
  const filename = (row.filename || '').trim();
  if (!filename) return { skipped: 'no_filename' };

  const filePath = path.join(TEST_PHOTOS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`  SKIP ${filename}: file not on disk`);
    return { skipped: 'no_file' };
  }

  const canonical_brand = (row.maker || '').trim() || null;
  const canonical_type = normalizeType(row.tool_type);
  const canonical_model = (row.model || '').trim() || null;
  const era_estimate = (row.era || '').trim() || null;
  const plane_type_number = extractPlaneTypeNumber(row.era, row.model, row.maker);
  const condition = normalizeCondition(row.condition);

  // Doc id: stable from filename, namespace-prefixed so curated rows can't
  // collide with externalListings rows that happen to share an id.
  const docId = `curated__${filename.replace(/\.[^.]+$/, '')}`;
  const ref = db.collection('training_examples').doc(docId);

  // Idempotency check
  const existing = await ref.get();
  if (existing.exists) {
    return { skipped: 'already_exists', docId };
  }

  if (dryRun) {
    console.log(
      `  [dry-run] ${filename.padEnd(50)} → ${canonical_brand || '—'} / ${canonical_type} / ${canonical_model || '—'} / type=${plane_type_number ?? '—'} / ${condition || '—'}`
    );
    return { dryRun: true };
  }

  // Upload image
  const storagePath = `${STORAGE_PREFIX}/${filename}`;
  const contentType = contentTypeFor(filename);
  const buffer = fs.readFileSync(filePath);
  await bucket.file(storagePath).save(buffer, {
    metadata: { contentType },
    resumable: false,
  });

  // Write Firestore doc
  const doc = {
    // Image
    image_path: storagePath,
    image_content_type: contentType,
    image_bytes: buffer.length,
    // Source
    source: 'curated',
    source_id: filename,
    source_url: (row.url || '').trim() || null,
    // Canonical label (v5 schema)
    canonical_brand,
    canonical_type,
    canonical_model,
    canonical_size: canonical_model, // mirror for priceStats compat
    plane_type_number,
    era_estimate,
    condition,
    // Label quality
    label_provenance: 'curated',
    label_confidence: 'high',
    // Lifecycle
    added_at: admin.firestore.FieldValue.serverTimestamp(),
    cluster_key: clusterKey({ canonical_type, canonical_brand, canonical_size: canonical_model }),
    // Curator metadata — useful for stress-test slicing later
    notable: (row.notable || '').trim() || null,
    why_good_test: (row.why_good_test || '').trim() || null,
  };

  await ref.set(doc);
  return { written: docId };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`ERROR: ${CSV_PATH} not found.`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parse(csvContent, { columns: true, skip_empty_lines: true });

  const total = LIMIT ? Math.min(LIMIT, rows.length) : rows.length;
  console.log(
    `${dryRun ? 'DRY RUN' : 'COMMIT MODE'} — importing ${total} rows from ground_truth.csv ` +
    `(${rows.length} total; limit=${LIMIT || 'none'})`
  );
  console.log('');

  const stats = {
    written: 0,
    skipped_no_file: 0,
    skipped_already_exists: 0,
    skipped_no_filename: 0,
    dry_run: 0,
    failed: 0,
  };

  for (let i = 0; i < total; i++) {
    try {
      const result = await importRow(rows[i], i);
      if (result.written) stats.written++;
      else if (result.skipped === 'no_file') stats.skipped_no_file++;
      else if (result.skipped === 'already_exists') stats.skipped_already_exists++;
      else if (result.skipped === 'no_filename') stats.skipped_no_filename++;
      else if (result.dryRun) stats.dry_run++;
    } catch (err) {
      console.error(`  FAIL ${rows[i].filename || `row ${i}`}: ${err.message}`);
      stats.failed++;
    }

    if ((i + 1) % 25 === 0) {
      console.log(`  ... ${i + 1}/${total} processed`);
    }
  }

  console.log('');
  console.log('=== Done ===');
  console.log(`  written:                ${stats.written}`);
  console.log(`  skipped (already exists): ${stats.skipped_already_exists}`);
  console.log(`  skipped (no file on disk): ${stats.skipped_no_file}`);
  console.log(`  skipped (no filename):  ${stats.skipped_no_filename}`);
  console.log(`  dry-run logged:         ${stats.dry_run}`);
  console.log(`  failed:                 ${stats.failed}`);
  if (dryRun) {
    console.log('\n(no writes performed — re-run with --commit to ingest)');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
