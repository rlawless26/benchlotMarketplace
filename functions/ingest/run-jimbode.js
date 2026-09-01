#!/usr/bin/env node
/**
 * Local CLI runner for the Jim Bode ingestion pipeline.
 *
 * Use this to populate `externalListings` without waiting for the nightly
 * scheduled function, and to validate deploys end-to-end. Initializes
 * Firebase Admin with the service account at `functions/service-account.json`.
 *
 * Usage:
 *   node functions/ingest/run-jimbode.js              # full scrape
 *   node functions/ingest/run-jimbode.js --max 2      # first 2 pages only (smoke test)
 *   node functions/ingest/run-jimbode.js --dry-run    # scrape, print counts, skip writes
 *
 * Requirements:
 *   - functions/service-account.json must exist and have Firestore write perms.
 *   - GOOGLE_APPLICATION_CREDENTIALS env var is an alternative to the file.
 */

const path = require('path');
const admin = require('firebase-admin');

function parseArgs(argv) {
  const args = { maxPages: undefined, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--max') args.maxPages = Number(argv[++i]);
    else if (a.startsWith('--max=')) args.maxPages = Number(a.slice('--max='.length));
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node functions/ingest/run-jimbode.js [--max N] [--dry-run]');
      process.exit(0);
    }
  }
  if (args.maxPages !== undefined && (!Number.isInteger(args.maxPages) || args.maxPages <= 0)) {
    console.error(`--max expects a positive integer, got: ${args.maxPages}`);
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
    console.log(`[run-jimbode] using service account at ${saPath}`);
  } catch (e) {
    admin.initializeApp(); // falls back to GOOGLE_APPLICATION_CREDENTIALS
    console.log('[run-jimbode] using default application credentials');
  }
}

async function main() {
  const args = parseArgs(process.argv);
  initAdmin();

  // Require after init so Admin is ready for downstream helpers.
  const jimbode = require('./jimbode');

  if (args.dryRun) {
    const records = await jimbode.scrapeAll({ maxPages: args.maxPages });
    console.log(`[run-jimbode] dry run — scraped ${records.length} listings, NOT writing to Firestore.`);
    const sample = records.slice(0, 5).map(({ listing, raw }) => ({
      source_id: listing.source_id,
      title: listing.title_raw,
      price_cents: listing.price_cents,
      heuristic_brand: listing.heuristic_brand,
      heuristic_type: listing.heuristic_type,
      raw_field_count: raw ? Object.keys(raw).length : 0,
      raw_variant_count: raw && Array.isArray(raw.variants) ? raw.variants.length : 0,
      raw_first_variant_available: raw && raw.variants && raw.variants[0] ? raw.variants[0].available : null,
      raw_tags: raw && Array.isArray(raw.tags) ? raw.tags.slice(0, 8) : [],
      raw_product_type: raw ? raw.product_type : null,
    }));
    console.log('[run-jimbode] sample:', JSON.stringify(sample, null, 2));
    return;
  }

  const summary = await jimbode.runIngestion({ maxPages: args.maxPages });
  console.log('[run-jimbode] done:');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-jimbode] failed:', err);
    process.exit(1);
  });
