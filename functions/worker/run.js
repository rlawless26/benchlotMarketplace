#!/usr/bin/env node
/**
 * Standalone ingest worker.
 *
 * Runs one or more source scrapes outside Cloud Functions, against whichever
 * backend BENCHLOT_STORE selects. This is the target architecture (§4: one
 * cron worker replaces scheduled Cloud Functions) and it has an immediate
 * practical benefit: it needs no functions deploy, so scrapes can be pointed at
 * Postgres without touching the deployed Firebase surface at all.
 *
 *   node functions/worker/run.js vintagevials
 *   node functions/worker/run.js jimbode hyperkitten --max 2
 *   node functions/worker/run.js oldtools --dry-run
 *   node functions/worker/run.js --all
 *   BENCHLOT_STORE=firestore node functions/worker/run.js jimbode
 *
 * Defaults to BENCHLOT_STORE=postgres — the deployed Cloud Functions keep
 * their own default of firestore, so running this cannot change their
 * behaviour.
 *
 * Requires DATABASE_URL (or DATABASE_URL_UNPOOLED) for the postgres backend.
 */

if (!process.env.BENCHLOT_STORE) process.env.BENCHLOT_STORE = 'postgres';

const path = require('path');
const admin = require('firebase-admin');

/**
 * Sources this worker can run. The three forum sources are absent on purpose:
 * they read Firestore directly for two-phase bump detection and still need
 * porting onto the store's getListingMeta / applyListingUpdates.
 */
const SOURCES = {
  jimbode: '../ingest/jimbode',
  jimbode_valueguide: '../ingest/jimbode-valueguide',
  hyperkitten: '../ingest/hyperkitten',
  oldtools: '../ingest/oldtools',
  thebestthings: '../ingest/thebestthings',
  rouillard: '../ingest/rouillard',
  vintagevials: '../ingest/vintagevials',
  ebay: '../ingest/ebay',
  fbmarketplace: '../ingest/fbmarketplace',
};

const NOT_YET_PORTED = ['woodnet', 'sawmillcreek', 'reddit'];

function parseArgs(argv) {
  const args = { sources: [], dryRun: false, maxPages: undefined, all: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--all') args.all = true;
    else if (a === '--max') args.maxPages = Number(argv[++i]);
    else if (a.startsWith('--max=')) args.maxPages = Number(a.slice(6));
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node functions/worker/run.js <source...> [--max N] [--dry-run]

Sources: ${Object.keys(SOURCES).join(', ')}
Not yet ported (read Firestore directly): ${NOT_YET_PORTED.join(', ')}`);
      process.exit(0);
    } else if (a.startsWith('--')) {
      console.error(`unknown flag: ${a}`);
      process.exit(2);
    } else args.sources.push(a);
  }
  if (args.all) args.sources = Object.keys(SOURCES);
  return args;
}

/**
 * The nine ported scrapers touch firebase-admin only for
 * `admin.firestore.Timestamp.now()/.fromDate()`, which are static helpers
 * needing no app. Initialize anyway when credentials exist, so a run with
 * BENCHLOT_STORE=firestore behaves identically to the CLI runners.
 */
function initAdmin() {
  if (admin.apps.length) return;
  try {
    const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } catch {
    try { admin.initializeApp(); } catch { /* Timestamp statics work regardless */ }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const store = require('../ingest/store');

  if (args.sources.length === 0) {
    console.error('No source given. Try --help.');
    process.exit(2);
  }
  for (const s of args.sources) {
    if (NOT_YET_PORTED.includes(s)) {
      console.error(`"${s}" reads Firestore directly and is not yet ported to the store layer.`);
      process.exit(2);
    }
    if (!SOURCES[s]) {
      console.error(`Unknown source "${s}". Known: ${Object.keys(SOURCES).join(', ')}`);
      process.exit(2);
    }
  }

  initAdmin();
  console.log(`[worker] backend=${store.BACKEND}  sources=${args.sources.join(', ')}` +
    (args.dryRun ? '  (dry run)' : ''));

  const results = [];
  for (const name of args.sources) {
    const mod = require(SOURCES[name]);
    const t0 = Date.now();
    try {
      if (args.dryRun) {
        if (typeof mod.scrapeAll !== 'function') {
          console.log(`[worker] ${name}: no scrapeAll(), cannot dry-run`);
          continue;
        }
        const records = await mod.scrapeAll({ maxPages: args.maxPages });
        console.log(`[worker] ${name}: dry run scraped ${records.length} listings, wrote nothing`);
        results.push({ name, scraped: records.length, dryRun: true });
      } else {
        const summary = await mod.runIngestion({ maxPages: args.maxPages });
        const secs = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`[worker] ${name}: ${JSON.stringify(summary)}  (${secs}s)`);
        // Bookkeeping so a paused source and a broken one stop looking alike.
        await store.recordScrapeRun(name, { ok: true, note: JSON.stringify(summary) });
        results.push({ name, ...summary });
      }
    } catch (err) {
      console.error(`[worker] ${name}: FAILED — ${err.message}`);
      if (!args.dryRun) {
        await store.recordScrapeRun(name, { ok: false, note: err.message }).catch(() => {});
      }
      results.push({ name, error: err.message });
    }
  }

  await store.close();
  const failed = results.filter((r) => r.error);
  console.log(`\n[worker] ${results.length - failed.length}/${results.length} succeeded`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error('[worker] fatal:', e); process.exit(1); });
