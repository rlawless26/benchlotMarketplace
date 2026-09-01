#!/usr/bin/env node
/**
 * Local CLI runner for the Michael Rouillard ingestion pipeline.
 *
 * Use this to populate `externalListings` without waiting for the nightly
 * scheduled function, and to validate deploys end-to-end. Initializes
 * Firebase Admin with the service account at `functions/service-account.json`.
 *
 * Usage:
 *   node functions/ingest/run-rouillard.js              # full scrape
 *   node functions/ingest/run-rouillard.js --max 1      # first page only (smoke test)
 *   node functions/ingest/run-rouillard.js --dry-run    # scrape, print counts, skip writes
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
      console.log('Usage: node functions/ingest/run-rouillard.js [--max N] [--dry-run]');
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
    console.log(`[run-rouillard] using service account at ${saPath}`);
  } catch (e) {
    admin.initializeApp(); // falls back to GOOGLE_APPLICATION_CREDENTIALS
    console.log('[run-rouillard] using default application credentials');
  }
}

async function main() {
  const args = parseArgs(process.argv);
  initAdmin();

  const rouillard = require('./rouillard');

  if (args.dryRun) {
    const records = await rouillard.scrapeAll({ maxPages: args.maxPages });
    console.log(`[run-rouillard] dry run — scraped ${records.length} listings, NOT writing to Firestore.`);
    const sample = records.slice(0, 5).map(({ listing, raw }) => ({
      source_id: listing.source_id,
      title: listing.title_raw,
      price_cents: listing.price_cents,
      heuristic_brand: listing.heuristic_brand,
      heuristic_type: listing.heuristic_type,
      tag_count: listing.tags.length,
      image_count: listing.images.length,
      raw_field_count: raw ? Object.keys(raw).length : 0,
      raw_is_in_stock: raw ? raw.is_in_stock : null,
      raw_is_purchasable: raw ? raw.is_purchasable : null,
      raw_categories: raw && Array.isArray(raw.categories) ? raw.categories.map((c) => c.slug) : [],
    }));
    console.log('[run-rouillard] sample:', JSON.stringify(sample, null, 2));
    return;
  }

  const summary = await rouillard.runIngestion({ maxPages: args.maxPages });
  console.log('[run-rouillard] done:');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-rouillard] failed:', err);
    process.exit(1);
  });
