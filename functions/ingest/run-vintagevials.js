#!/usr/bin/env node
/**
 * Local CLI runner for the Vintage Vials ingestion pipeline.
 *
 * Usage:
 *   node functions/ingest/run-vintagevials.js              # full scrape
 *   node functions/ingest/run-vintagevials.js --max 1      # first page only
 *   node functions/ingest/run-vintagevials.js --dry-run    # scrape, skip writes
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
      console.log('Usage: node functions/ingest/run-vintagevials.js [--max N] [--dry-run]');
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
    console.log(`[run-vintagevials] using service account at ${saPath}`);
  } catch (e) {
    admin.initializeApp();
    console.log('[run-vintagevials] using default application credentials');
  }
}

async function main() {
  const args = parseArgs(process.argv);
  initAdmin();

  const vv = require('./vintagevials');

  if (args.dryRun) {
    const records = await vv.scrapeAll({ maxPages: args.maxPages });
    console.log(`[run-vintagevials] dry run — scraped ${records.length} listings, NOT writing.`);
    return;
  }

  const summary = await vv.runIngestion({ maxPages: args.maxPages });
  console.log('[run-vintagevials] done:');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-vintagevials] failed:', err);
    process.exit(1);
  });
