#!/usr/bin/env node
/**
 * Backfill canonical fields on existing externalListings whose
 * canonical_brand is null. Safe to run repeatedly — the apply helper skips
 * already-normalized rows.
 *
 * Usage:
 *   node functions/normalize/backfill-normalize.js                  # all unnormalized
 *   node functions/normalize/backfill-normalize.js --limit 50       # first 50 only (smoke)
 *   node functions/normalize/backfill-normalize.js --concurrency 5  # default 3
 *   node functions/normalize/backfill-normalize.js --source jimbode # filter by source
 *   node functions/normalize/backfill-normalize.js --force          # re-normalize all
 *   node functions/normalize/backfill-normalize.js --dry-run        # print summary, no writes
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

// Convenience: load functions/.env if ANTHROPIC_API_KEY isn't set.
(function loadLocalEnv() {
  if (process.env.ANTHROPIC_API_KEY) return;
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
})();

function parseArgs(argv) {
  const args = { limit: Infinity, concurrency: 3, source: undefined, force: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--concurrency') args.concurrency = Number(argv[++i]);
    else if (a === '--source') args.source = argv[++i];
    else if (a === '--force') args.force = true;
    else if (a === '--dry-run') args.dryRun = true;
  }
  return args;
}

function initAdmin() {
  if (admin.apps.length) return;
  const saPath = path.resolve(__dirname, '..', 'service-account.json');
  try {
    admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
  } catch (e) {
    admin.initializeApp();
  }
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function pump() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, pump));
  return results;
}

async function main() {
  const args = parseArgs(process.argv);
  initAdmin();

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[backfill-normalize] ANTHROPIC_API_KEY not set');
    process.exit(2);
  }

  const { normalizeListingDoc } = require('./apply');
  const db = admin.firestore();
  const col = db.collection('externalListings');

  // Fetch candidates. Firestore can't express "canonical_brand is null"
  // cleanly in compound queries with our current indexes, so we filter the
  // 'active' set client-side. At current scale (≤25k rows) this is fine.
  let query = col.where('status', '==', 'active');
  if (args.source) query = query.where('source', '==', args.source);
  console.log(`[backfill-normalize] querying active listings${args.source ? ` for source=${args.source}` : ''}...`);
  const snap = await query.get();
  const all = snap.docs;

  const candidates = (args.force ? all : all.filter((d) => !d.data().canonical_brand))
    .slice(0, Number.isFinite(args.limit) ? args.limit : undefined);

  console.log(`[backfill-normalize] ${all.length} total active; ${candidates.length} to normalize (force=${args.force}, limit=${args.limit})`);

  if (args.dryRun) {
    const sampleSize = Math.min(5, candidates.length);
    console.log(`[backfill-normalize] dry run — sample of ${sampleSize}:`);
    for (const doc of candidates.slice(0, sampleSize)) {
      const d = doc.data();
      console.log(`  ${doc.id}  title="${d.title_raw}"  heuristic_brand=${d.heuristic_brand}  canonical_brand=${d.canonical_brand ?? 'null'}`);
    }
    return;
  }

  if (candidates.length === 0) {
    console.log('[backfill-normalize] nothing to do.');
    return;
  }

  const totals = { normalized: 0, skipped: 0, errored: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  const t0 = Date.now();

  await runWithConcurrency(candidates, args.concurrency, async (doc, i) => {
    try {
      const result = await normalizeListingDoc(doc.ref, doc.data(), { force: args.force });
      if (result.normalized) {
        totals.normalized += 1;
        totals.input += result.usage.input_tokens;
        totals.output += result.usage.output_tokens;
        totals.cacheRead += result.usage.cache_read_input_tokens;
        totals.cacheWrite += result.usage.cache_creation_input_tokens;
      } else {
        totals.skipped += 1;
      }
    } catch (err) {
      totals.errored += 1;
      console.error(`\n[backfill-normalize] ${doc.id}: ${err.message}`);
    }
    const done = i + 1;
    if (done % 25 === 0 || done === candidates.length) {
      process.stdout.write(`\r[backfill-normalize] ${done}/${candidates.length} processed`);
    }
  });
  process.stdout.write('\n');

  // Haiku 4.5 pricing.
  const HAIKU = { input: 1.0, output: 5.0, cacheWrite: 1.25, cacheRead: 0.1 };
  const cost = (
    totals.input * HAIKU.input
    + totals.output * HAIKU.output
    + totals.cacheRead * HAIKU.cacheRead
    + totals.cacheWrite * HAIKU.cacheWrite
  ) / 1_000_000;

  console.log('[backfill-normalize] done:');
  console.log(JSON.stringify({
    normalized: totals.normalized,
    skipped: totals.skipped,
    errored: totals.errored,
    durationSec: ((Date.now() - t0) / 1000).toFixed(1),
    tokens: {
      input: totals.input,
      output: totals.output,
      cache_read: totals.cacheRead,
      cache_write: totals.cacheWrite,
    },
    cost_usd: cost.toFixed(4),
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n[backfill-normalize] fatal:', err);
    process.exit(1);
  });
