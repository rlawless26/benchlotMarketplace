#!/usr/bin/env node
/**
 * Local CLI runner for the Sawmill Creek ingestion pipeline.
 *
 * Use this to populate `externalListings` without waiting for the nightly
 * scheduled function, and to validate deploys end-to-end. Initializes
 * Firebase Admin with the service account at `functions/service-account.json`.
 *
 * Usage:
 *   node functions/ingest/run-sawmillcreek.js                             # full scrape
 *   node functions/ingest/run-sawmillcreek.js --max-pages 2               # first 2 pages
 *   node functions/ingest/run-sawmillcreek.js --max-threads 20            # first 20 new threads
 *   node functions/ingest/run-sawmillcreek.js --dry-run --max-pages 1 --max-threads 5
 *
 * Requirements:
 *   - functions/service-account.json must exist and have Firestore write perms.
 *   - GOOGLE_APPLICATION_CREDENTIALS env var is an alternative to the file.
 */

const path = require('path');
const admin = require('firebase-admin');

function parseArgs(argv) {
  const args = { maxPages: undefined, maxThreads: undefined, dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--max-pages') args.maxPages = Number(argv[++i]);
    else if (a.startsWith('--max-pages=')) args.maxPages = Number(a.slice('--max-pages='.length));
    else if (a === '--max-threads') args.maxThreads = Number(argv[++i]);
    else if (a.startsWith('--max-threads=')) args.maxThreads = Number(a.slice('--max-threads='.length));
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node functions/ingest/run-sawmillcreek.js [--max-pages N] [--max-threads N] [--dry-run]');
      process.exit(0);
    }
  }
  for (const [k, v] of [['maxPages', args.maxPages], ['maxThreads', args.maxThreads]]) {
    if (v !== undefined && (!Number.isInteger(v) || v <= 0)) {
      console.error(`--${k === 'maxPages' ? 'max-pages' : 'max-threads'} expects a positive integer, got: ${v}`);
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
    console.log(`[run-sawmillcreek] using service account at ${saPath}`);
  } catch (e) {
    admin.initializeApp();
    console.log('[run-sawmillcreek] using default application credentials');
  }
}

async function main() {
  const args = parseArgs(process.argv);
  initAdmin();

  const smc = require('./sawmillcreek');

  if (args.dryRun) {
    // In dry-run, treat all threads as new so we can inspect detail-fetch
    // quality without touching Firestore.
    const { scraped, newRecords } = await smc.scrapeAll({
      maxPages: args.maxPages,
      maxNewThreads: args.maxThreads,
      skipFirestoreLookup: true,
    });

    console.log(`[run-sawmillcreek] dry run — scraped ${scraped} threads from list pages.`);
    console.log(`[run-sawmillcreek] fetched detail for ${newRecords.length} threads (skipped ${scraped - newRecords.length} via max-threads cap or errors).`);

    const sample = newRecords.slice(0, 5).map(({ listing, raw }) => ({
      source_id: listing.source_id,
      title: listing.title_raw,
      price_cents: listing.price_cents,
      heuristic_brand: listing.heuristic_brand,
      heuristic_type: listing.heuristic_type,
      posted_at: listing.posted_at ? listing.posted_at.toDate().toISOString() : null,
      image_count: listing.images.length,
      first_image: listing.images[0] || null,
      source_url: listing.source_url,
      desc_preview: (listing.description_raw || '').slice(0, 150),
      author: raw.author,
    }));
    console.log('[run-sawmillcreek] sample:', JSON.stringify(sample, null, 2));

    // Distributions
    const brandCounts = {};
    const typeCounts = {};
    let nullPrice = 0;
    let zeroImages = 0;
    let nullDesc = 0;
    for (const { listing } of newRecords) {
      brandCounts[listing.heuristic_brand] = (brandCounts[listing.heuristic_brand] || 0) + 1;
      typeCounts[listing.heuristic_type] = (typeCounts[listing.heuristic_type] || 0) + 1;
      if (listing.price_cents === null) nullPrice += 1;
      if (listing.images.length === 0) zeroImages += 1;
      if (!listing.description_raw) nullDesc += 1;
    }
    console.log('[run-sawmillcreek] heuristic brand distribution:', brandCounts);
    console.log('[run-sawmillcreek] heuristic type distribution:', typeCounts);
    console.log(`[run-sawmillcreek] null prices: ${nullPrice}, zero-image: ${zeroImages}, null description: ${nullDesc}`);
    return;
  }

  const summary = await smc.runIngestion({ maxPages: args.maxPages, maxNewThreads: args.maxThreads });
  console.log('[run-sawmillcreek] done:');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-sawmillcreek] failed:', err);
    process.exit(1);
  });
