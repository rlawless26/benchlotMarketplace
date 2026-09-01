#!/usr/bin/env node
/**
 * Local CLI runner for the Hyperkitten ingestion pipeline.
 *
 * Use this to populate `externalListings` without waiting for the nightly
 * scheduled function, and to validate deploys end-to-end. Initializes
 * Firebase Admin with the service account at `functions/service-account.json`.
 *
 * Usage:
 *   node functions/ingest/run-hyperkitten.js              # full scrape
 *   node functions/ingest/run-hyperkitten.js --max 50     # first 50 items only (smoke test)
 *   node functions/ingest/run-hyperkitten.js --dry-run    # scrape, print samples, skip writes
 *
 * Requirements:
 *   - functions/service-account.json must exist and have Firestore write perms.
 *   - GOOGLE_APPLICATION_CREDENTIALS env var is an alternative to the file.
 */

const path = require('path');
const admin = require('firebase-admin');

function parseArgs(argv) {
  const args = { maxItems: undefined, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--max') args.maxItems = Number(argv[++i]);
    else if (a.startsWith('--max=')) args.maxItems = Number(a.slice('--max='.length));
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node functions/ingest/run-hyperkitten.js [--max N] [--dry-run]');
      process.exit(0);
    }
  }
  if (args.maxItems !== undefined && (!Number.isInteger(args.maxItems) || args.maxItems <= 0)) {
    console.error(`--max expects a positive integer, got: ${args.maxItems}`);
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
    console.log(`[run-hyperkitten] using service account at ${saPath}`);
  } catch (e) {
    admin.initializeApp(); // falls back to GOOGLE_APPLICATION_CREDENTIALS
    console.log('[run-hyperkitten] using default application credentials');
  }
}

async function main() {
  const args = parseArgs(process.argv);
  initAdmin();

  // Require after init so Admin is ready for downstream helpers.
  const hyperkitten = require('./hyperkitten');

  if (args.dryRun) {
    const records = await hyperkitten.scrapeAll({ maxItems: args.maxItems });
    console.log(`[run-hyperkitten] dry run — scraped ${records.length} listings, NOT writing to Firestore.`);
    const sample = records.slice(0, 5).map(({ listing, raw }) => ({
      source_id: listing.source_id,
      title: listing.title_raw,
      price_cents: listing.price_cents,
      heuristic_brand: listing.heuristic_brand,
      heuristic_type: listing.heuristic_type,
      tool_type: raw.tool_type,
      is_new: raw.is_new,
      image_count: listing.images.length,
      first_image: listing.images[0] || null,
      source_url: listing.source_url,
      tags: listing.tags,
    }));
    console.log('[run-hyperkitten] sample:', JSON.stringify(sample, null, 2));

    // Distribution stats — useful for eyeballing normalization seeds.
    const brandCounts = {};
    const typeCounts = {};
    const toolTypeCounts = {};
    let nullPrice = 0;
    let zeroImages = 0;
    for (const { listing, raw } of records) {
      brandCounts[listing.heuristic_brand] = (brandCounts[listing.heuristic_brand] || 0) + 1;
      typeCounts[listing.heuristic_type] = (typeCounts[listing.heuristic_type] || 0) + 1;
      toolTypeCounts[raw.tool_type] = (toolTypeCounts[raw.tool_type] || 0) + 1;
      if (listing.price_cents === null) nullPrice += 1;
      if (listing.images.length === 0) zeroImages += 1;
    }
    console.log('[run-hyperkitten] brand distribution:', brandCounts);
    console.log('[run-hyperkitten] type distribution:', typeCounts);
    console.log('[run-hyperkitten] data-tool_type distribution:', toolTypeCounts);
    console.log(`[run-hyperkitten] null prices: ${nullPrice}, zero-image items: ${zeroImages}`);
    return;
  }

  const summary = await hyperkitten.runIngestion({ maxItems: args.maxItems });
  console.log('[run-hyperkitten] done:');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-hyperkitten] failed:', err);
    process.exit(1);
  });
