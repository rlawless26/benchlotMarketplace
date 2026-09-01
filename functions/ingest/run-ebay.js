#!/usr/bin/env node
/**
 * Local CLI runner for the eBay Browse API ingestion pipeline.
 *
 * Use this to populate `externalListings` without waiting for the nightly
 * scheduled function, and to validate deploys end-to-end.
 *
 * Usage:
 *   node functions/ingest/run-ebay.js                       # default (max 2000)
 *   node functions/ingest/run-ebay.js --max-items 20        # small real write
 *   node functions/ingest/run-ebay.js --dry-run --max-items 5
 *
 * Requirements:
 *   - functions/.env must contain EBAY_APP_ID and EBAY_CERT_ID.
 *     Load them into your shell before running:  `set -a; source .env; set +a`
 *   - functions/service-account.json (or GOOGLE_APPLICATION_CREDENTIALS) for
 *     Firestore writes. Dry-run mode doesn't need write credentials.
 */

const path = require('path');
const admin = require('firebase-admin');

function parseArgs(argv) {
  const args = { maxItems: undefined, dryRun: false, buckets: undefined };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--max-items') args.maxItems = Number(argv[++i]);
    else if (a.startsWith('--max-items=')) args.maxItems = Number(a.slice('--max-items='.length));
    else if (a === '--bucket') args.buckets = (args.buckets || []).concat(argv[++i]);
    else if (a.startsWith('--bucket=')) args.buckets = (args.buckets || []).concat(a.slice('--bucket='.length));
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node functions/ingest/run-ebay.js [--max-items N] [--bucket <label> ...] [--dry-run]');
      console.log('  --bucket can be repeated to run a subset of buckets (e.g. --bucket festool --bucket sawstop)');
      process.exit(0);
    }
  }
  if (args.maxItems !== undefined && (!Number.isInteger(args.maxItems) || args.maxItems <= 0)) {
    console.error(`--max-items expects a positive integer, got: ${args.maxItems}`);
    process.exit(2);
  }
  return args;
}

function initAdmin() {
  if (admin.apps.length) return;
  const saPath = path.resolve(__dirname, '..', 'service-account.json');
  try {
    const serviceAccount = require(saPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log(`[run-ebay] using service account at ${saPath}`);
  } catch (e) {
    admin.initializeApp();
    console.log('[run-ebay] using default application credentials');
  }
}

/**
 * Confirm no PII leaked into listing or raw payload.
 * Returns null if clean, or a short description of the first violation.
 */
function piiCheck(record) {
  const serialized = JSON.stringify(record);
  const patterns = [
    { label: 'seller block', re: /"seller"\s*:/ },
    { label: 'feedbackScore', re: /"feedbackScore"/ },
    { label: 'feedbackPercentage', re: /"feedbackPercentage"/ },
    { label: 'username', re: /"username"/ },
  ];
  for (const { label, re } of patterns) {
    if (re.test(serialized)) return label;
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  initAdmin();

  const ebay = require('./ebay');

  if (args.dryRun) {
    const { records, bucketStats, pages } = await ebay.scrapeAll({
      maxItems: args.maxItems,
      buckets: args.buckets,
    });
    console.log(`[run-ebay] dry run — ${records.length} records fetched over ${pages} API page(s) across ${bucketStats.length} bucket(s).`);
    console.log('[run-ebay] per-bucket:');
    for (const s of bucketStats) {
      if (s.skipped) {
        console.log(`  ${s.label.padEnd(22)} SKIPPED (${s.reason})`);
      } else {
        console.log(`  ${s.label.padEnd(22)} new=${String(s.new).padStart(4)} pages=${s.pages} dup_skipped=${s.dup_skipped} total_avail=${s.total_available}`);
      }
    }

    const sample = records.slice(0, 5).map(({ listing }) => ({
      source_id: listing.source_id,
      title: listing.title_raw,
      price_cents: listing.price_cents,
      condition: listing.condition_raw,
      heuristic_brand: listing.heuristic_brand,
      heuristic_type: listing.heuristic_type,
      posted_at: listing.posted_at ? listing.posted_at.toDate().toISOString() : null,
      image_count: listing.images.length,
      first_image: listing.images[0] || null,
      source_url: listing.source_url,
      tags: listing.tags,
    }));
    console.log('[run-ebay] sample:', JSON.stringify(sample, null, 2));

    const brandCounts = {};
    const typeCounts = {};
    const condCounts = {};
    const leafCounts = {};
    let nullPrice = 0;
    let zeroImages = 0;
    let nullPosted = 0;
    for (const { listing } of records) {
      brandCounts[listing.heuristic_brand] = (brandCounts[listing.heuristic_brand] || 0) + 1;
      typeCounts[listing.heuristic_type] = (typeCounts[listing.heuristic_type] || 0) + 1;
      condCounts[listing.condition_raw || 'null'] = (condCounts[listing.condition_raw || 'null'] || 0) + 1;
      const leafTag = (listing.tags || []).find((t) => t.startsWith('ebay_leaf_name:')) || 'ebay_leaf_name:null';
      const leaf = leafTag.slice('ebay_leaf_name:'.length);
      leafCounts[leaf] = (leafCounts[leaf] || 0) + 1;
      if (listing.price_cents === null) nullPrice += 1;
      if (listing.images.length === 0) zeroImages += 1;
      if (!listing.posted_at) nullPosted += 1;
    }
    console.log('[run-ebay] heuristic brand distribution:', brandCounts);
    console.log('[run-ebay] heuristic type distribution:', typeCounts);
    console.log('[run-ebay] condition distribution:', condCounts);
    console.log('[run-ebay] leaf-category distribution:', leafCounts);
    console.log(`[run-ebay] null prices: ${nullPrice}, zero-image: ${zeroImages}, null posted_at: ${nullPosted}`);

    // PII audit — exemption commitment requires zero seller/user fields.
    let piiHits = 0;
    let firstPiiLabel = null;
    for (const rec of records) {
      const label = piiCheck(rec);
      if (label) {
        piiHits += 1;
        firstPiiLabel = firstPiiLabel || label;
      }
    }
    console.log(`[run-ebay] PII audit: ${piiHits}/${records.length} records reference seller fields (target: 0)${firstPiiLabel ? ' — first violation: ' + firstPiiLabel : ''}`);
    return;
  }

  const summary = await ebay.runIngestion({
    maxItems: args.maxItems,
    buckets: args.buckets,
  });
  console.log('[run-ebay] done:');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-ebay] failed:', err);
    process.exit(1);
  });
