#!/usr/bin/env node
/**
 * Local CLI runner for the OldTools.com ingestion pipeline.
 *
 * Usage:
 *   node functions/ingest/run-oldtools.js              # full scrape
 *   node functions/ingest/run-oldtools.js --max 5      # first 5 items only
 *   node functions/ingest/run-oldtools.js --dry-run    # scrape, skip writes
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
      console.log('Usage: node functions/ingest/run-oldtools.js [--max N] [--dry-run]');
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
    console.log(`[run-oldtools] using service account at ${saPath}`);
  } catch (e) {
    admin.initializeApp();
    console.log('[run-oldtools] using default application credentials');
  }
}

async function main() {
  const args = parseArgs(process.argv);
  initAdmin();

  const ot = require('./oldtools');

  if (args.dryRun) {
    const records = await ot.scrapeAll({ maxItems: args.maxItems });
    console.log(`[run-oldtools] dry run — scraped ${records.length} listings, NOT writing.`);
    return;
  }

  const summary = await ot.runIngestion({ maxItems: args.maxItems });
  console.log('[run-oldtools] done:');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-oldtools] failed:', err);
    process.exit(1);
  });
