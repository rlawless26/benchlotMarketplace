#!/usr/bin/env node
/**
 * Local CLI runner for the Reddit ingestion pipeline.
 *
 * Use this to populate `externalListings` without waiting for the
 * scheduled function, and to validate the OAuth flow + scrape shape
 * before deploys.
 *
 * Usage:
 *   node functions/ingest/run-reddit.js                                # full scrape
 *   node functions/ingest/run-reddit.js --max-new 5                    # cap detail fetches
 *   node functions/ingest/run-reddit.js --bucket handtools             # one sub
 *   node functions/ingest/run-reddit.js --max-pages 2                  # shallow sweep
 *   node functions/ingest/run-reddit.js --dry-run --max-new 5
 *
 * Requirements:
 *   - functions/.env must contain REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET,
 *     REDDIT_USERNAME. Load them into your shell first:
 *       set -a; source .env; set +a
 *   - functions/service-account.json (or GOOGLE_APPLICATION_CREDENTIALS)
 *     for Firestore writes. Dry-run mode doesn't need write credentials.
 */

const path = require('path');
const admin = require('firebase-admin');

function parseArgs(argv) {
  const args = { maxNew: undefined, maxPages: undefined, bucket: undefined, dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--max-new') args.maxNew = Number(argv[++i]);
    else if (a.startsWith('--max-new=')) args.maxNew = Number(a.slice('--max-new='.length));
    else if (a === '--max-pages') args.maxPages = Number(argv[++i]);
    else if (a.startsWith('--max-pages=')) args.maxPages = Number(a.slice('--max-pages='.length));
    else if (a === '--bucket') args.bucket = argv[++i];
    else if (a.startsWith('--bucket=')) args.bucket = a.slice('--bucket='.length);
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node functions/ingest/run-reddit.js [--max-new N] [--max-pages N] [--bucket <subreddit>] [--dry-run]');
      console.log('Buckets: handtools, AntiqueToolBroker');
      process.exit(0);
    }
  }
  for (const [k, v] of [['maxNew', args.maxNew], ['maxPages', args.maxPages]]) {
    if (v !== undefined && (!Number.isInteger(v) || v <= 0)) {
      console.error(`--${k === 'maxNew' ? 'max-new' : 'max-pages'} expects a positive integer, got: ${v}`);
      process.exit(2);
    }
  }
  return args;
}

function initAdmin() {
  if (admin.apps.length) return;
  const saPath = path.resolve(__dirname, '..', 'service-account.json');
  try {
    const serviceAccount = require(saPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log(`[run-reddit] using service account at ${saPath}`);
  } catch (e) {
    admin.initializeApp();
    console.log('[run-reddit] using default application credentials');
  }
}

/**
 * Defensive PII assertion — the listing or raw payload should NEVER
 * contain Reddit user-identifiable fields. Mirrors the eBay seller-block
 * scrub assertion. Returns null if clean, or the first violation key.
 */
function piiCheck(record) {
  const serialized = JSON.stringify(record);
  const patterns = [
    { label: 'author', re: /"author"\s*:\s*"[^"]/ }, // ignore "author":null
    { label: 'author_fullname', re: /"author_fullname"\s*:/ },
    { label: 'author_flair_text', re: /"author_flair_text"\s*:/ },
    { label: 'author_premium', re: /"author_premium"\s*:/ },
    { label: 'subreddit_subscribers', re: /"subreddit_subscribers"\s*:/ },
    { label: 'subreddit_id', re: /"subreddit_id"\s*:/ },
  ];
  for (const { label, re } of patterns) {
    if (re.test(serialized)) return label;
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  initAdmin();

  const reddit = require('./reddit');

  if (args.dryRun) {
    const { records, knownPosts, bucketStats, skippedDueToCap } = await reddit.scrapeAll({
      maxNew: args.maxNew,
      maxPages: args.maxPages,
      bucket: args.bucket,
      skipFirestoreLookup: true,
    });

    const totalCandidates = bucketStats.reduce((acc, s) => acc + s.candidates, 0);
    console.log(`[run-reddit] dry run — ${records.length} records (detail-fetched) out of ${totalCandidates} candidates across ${bucketStats.length} bucket(s).`);
    if (skippedDueToCap > 0) {
      console.log(`[run-reddit] ${skippedDueToCap} candidates skipped via --max-new cap.`);
    }
    console.log('[run-reddit] per-bucket:');
    for (const s of bucketStats) {
      console.log(
        `  r/${s.subreddit.padEnd(20)} mode=${s.mode.padEnd(5)} pages=${s.pages}/${s.scanned} candidates=${String(s.candidates).padStart(3)} new=${String(s.new).padStart(3)} known=${String(s.known).padStart(3)} cutoff_hit=${s.reached_cutoff}`
      );
    }

    const sample = records.slice(0, 5).map(({ listing }) => ({
      source_id: listing.source_id,
      title: listing.title_raw,
      price_cents: listing.price_cents,
      heuristic_brand: listing.heuristic_brand,
      heuristic_type: listing.heuristic_type,
      posted_at: listing.posted_at ? listing.posted_at.toDate().toISOString() : null,
      image_count: listing.images.length,
      first_image: listing.images[0] || null,
      source_url: listing.source_url,
      desc_preview: (listing.description_raw || '').slice(0, 140).replace(/\s+/g, ' '),
      tags: listing.tags,
    }));
    console.log('[run-reddit] sample:', JSON.stringify(sample, null, 2));

    const brandCounts = {};
    const typeCounts = {};
    let nullPrice = 0;
    let zeroImages = 0;
    let nullDesc = 0;
    for (const { listing } of records) {
      brandCounts[listing.heuristic_brand] = (brandCounts[listing.heuristic_brand] || 0) + 1;
      typeCounts[listing.heuristic_type] = (typeCounts[listing.heuristic_type] || 0) + 1;
      if (listing.price_cents === null) nullPrice += 1;
      if (listing.images.length === 0) zeroImages += 1;
      if (!listing.description_raw) nullDesc += 1;
    }
    console.log('[run-reddit] heuristic brand distribution:', brandCounts);
    console.log('[run-reddit] heuristic type distribution:', typeCounts);
    console.log(`[run-reddit] null prices: ${nullPrice}, zero-image: ${zeroImages}, null description: ${nullDesc}`);

    // PII audit — the assertion that the scrape never persisted Reddit
    // user-identifiable fields. This MUST be 0/N. Same posture as the
    // eBay seller-block check.
    let piiHits = 0;
    let firstPiiLabel = null;
    for (const rec of records) {
      const label = piiCheck(rec);
      if (label) {
        piiHits += 1;
        firstPiiLabel = firstPiiLabel || label;
      }
    }
    if (piiHits > 0) {
      console.error(`[run-reddit] FAIL — PII audit: ${piiHits}/${records.length} records contain user-identifiable fields (first: ${firstPiiLabel}). Scraper bug.`);
      process.exit(3);
    }
    console.log(`[run-reddit] PII audit: 0/${records.length} (target: 0)`);
    return;
  }

  const summary = await reddit.runIngestion({
    maxNew: args.maxNew,
    maxPages: args.maxPages,
    bucket: args.bucket,
  });
  console.log('[run-reddit] done:');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-reddit] failed:', err);
    process.exit(1);
  });
