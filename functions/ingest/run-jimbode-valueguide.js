#!/usr/bin/env node
/**
 * Local CLI runner for the Jim Bode Value Guide ingestion pipeline.
 *
 * Use this to populate `externalListings` with sold-comp data without
 * waiting for the nightly scheduled function. Initializes Firebase Admin
 * with the service account at `functions/service-account.json`.
 *
 * Usage:
 *   node functions/ingest/run-jimbode-valueguide.js              # full scrape
 *   node functions/ingest/run-jimbode-valueguide.js --max 2      # first 2 pages only (smoke test)
 *   node functions/ingest/run-jimbode-valueguide.js --dry-run    # scrape, print counts, skip writes
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
      console.log('Usage: node functions/ingest/run-jimbode-valueguide.js [--max N] [--dry-run]');
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
    console.log(`[run-jimbode-valueguide] using service account at ${saPath}`);
  } catch (e) {
    admin.initializeApp();
    console.log('[run-jimbode-valueguide] using default application credentials');
  }
}

async function main() {
  const args = parseArgs(process.argv);
  initAdmin();

  const adapter = require('./jimbode-valueguide');

  if (args.dryRun) {
    const records = await adapter.scrapeAll({ maxPages: args.maxPages });
    console.log(`[run-jimbode-valueguide] dry run — scraped ${records.length} listings, NOT writing to Firestore.`);
    const sample = records.slice(0, 5).map(({ listing }) => ({
      source_id: listing.source_id,
      title: listing.title_raw,
      price_cents: listing.price_cents,
      sold_at: listing.sold_at ? listing.sold_at.toDate().toISOString() : null,
      heuristic_brand: listing.heuristic_brand,
      heuristic_type: listing.heuristic_type,
    }));
    console.log('[run-jimbode-valueguide] sample:', JSON.stringify(sample, null, 2));
    return;
  }

  const summary = await adapter.runIngestion({ maxPages: args.maxPages });
  console.log('[run-jimbode-valueguide] done:');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-jimbode-valueguide] failed:', err);
    process.exit(1);
  });
