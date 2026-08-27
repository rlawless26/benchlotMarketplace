#!/usr/bin/env node
/**
 * Normalize the Postgres backlog.
 *
 * Replaces the Firestore onDocumentWritten trigger, which could never settle:
 * scrapers write canonical_* as NULL on every upsert, that write re-fires the
 * trigger, and every listing is re-billed on every scrape forever. The Postgres
 * store omits those columns from its ON CONFLICT SET, so a pass here is
 * PERMANENT — this is a one-time backlog cost, not a recurring one.
 *
 * Two safe cost reductions, neither of which trades away precision:
 *
 *  - DEDUPE BY TITLE. 104,492 rows share 91,830 distinct titles, so 12% of
 *    calls are redundant. One call per distinct title, result fanned out to
 *    every row that shares it.
 *  - SKIP NON-TOOLS. Rows already classified excluded_non_tool never surface
 *    in search or price stats, so they are not worth a call.
 *
 * NOT done: using heuristic_type/heuristic_brand to skip the LLM on "easy"
 * titles. That was measured at 20-40% precision (it maps Lie-Nielsen tools to
 * Stanley and calls chip breakers bench planes) and reverted. Cheap and wrong
 * is worse than slow and right when the output is a published price.
 *
 *   node functions/normalize/run-postgres.js --sample 50   # measure real cost
 *   node functions/normalize/run-postgres.js --limit 5000
 *   node functions/normalize/run-postgres.js               # whole backlog
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const { normalizeListing } = require('./normalizer');
const { canonicalizeBrand } = require('./vocabulary');

const DB = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!DB) { console.error('DATABASE_URL is not set'); process.exit(1); }

const argv = process.argv.slice(2);
const num = (flag, dflt) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? Number(argv[i + 1]) : dflt;
};
const SAMPLE = num('--sample', 0);
const LIMIT = num('--limit', 0);
const CONCURRENCY = num('--concurrency', 6);
// Durable data only: sold comps (permanent) plus curated dealer/forum active
// inventory. Excludes eBay/FBM active listings, which churn off within weeks
// and account for 69% of the backlog cost.
const DURABLE_ONLY = argv.includes('--durable-only');
// Hard ceiling. Stops mid-run rather than overrunning an approved budget.
const MAX_COST = num('--max-cost', 0);

// Haiku 4.5, USD per million tokens.
const PRICE = { input: 1.0, output: 5.0, cacheWrite: 1.25, cacheRead: 0.1 };

function costOf(u) {
  return (
    ((u.input_tokens || 0) * PRICE.input +
      (u.output_tokens || 0) * PRICE.output +
      (u.cache_creation_input_tokens || 0) * PRICE.cacheWrite +
      (u.cache_read_input_tokens || 0) * PRICE.cacheRead) / 1e6
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry transient failures: a dropped Neon connection, a rate limit, a 5xx.
 * Deliberately does NOT retry a 4xx like an exhausted credit balance — that is
 * not going to fix itself and should surface immediately.
 */
async function withRetry(fn, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const transient =
        e.code === '57P01' || e.code === 'ECONNRESET' || e.code === 'ETIMEDOUT' ||
        e.status === 429 || (e.status >= 500 && e.status < 600);
      if (!transient) throw e;
      await sleep(500 * 2 ** i);
    }
  }
  throw lastErr;
}

async function mapWithConcurrency(items, n, worker) {
  let next = 0;
  const runners = Array.from({ length: Math.min(n, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

(async () => {
  const pool = new Pool({ connectionString: DB, max: 4 });

  // A pool that lives for hours WILL have idle clients terminated by the
  // server — Neon restarts the compute on plan changes, maintenance and
  // scale-to-zero, which surfaces as 57P01 "terminating connection due to
  // administrator command". Without this handler pg-pool emits an unhandled
  // 'error' event and takes the whole process down mid-run, which is exactly
  // what happened 10,314 rows in. The pool discards the dead client and opens
  // a fresh one on the next acquire, so logging is the right response.
  pool.on('error', (err) => {
    console.error(`\n  [pool] ${err.code || ''} ${err.message} — connection dropped, continuing`);
  });

  // One row per distinct title; `ids` carries every listing sharing it.
  const cap = SAMPLE || LIMIT || 0;
  // Group to get the id list, then join back for the payload. Aggregating the
  // tags column directly fails — array_agg cannot accumulate empty arrays, and
  // plenty of listings have none.
  const { rows: work } = await pool.query(
    `WITH grouped AS (
       SELECT lower(btrim(title_raw)) AS k,
              array_agg(id) AS ids,
              min(id) AS rep_id
         FROM listings
        WHERE canonical_type IS NULL
          AND status <> 'excluded_non_tool'
          AND title_raw IS NOT NULL
          ${DURABLE_ONLY ? `AND (status = 'sold' OR source NOT IN ('ebay','fbmarketplace'))` : ''}
        GROUP BY 1
        ORDER BY count(*) DESC
        ${cap ? `LIMIT ${cap}` : ''}
     )
     SELECT g.ids, l.title_raw, l.description_raw, l.tags,
            l.heuristic_brand, l.heuristic_type
       FROM grouped g
       JOIN listings l ON l.id = g.rep_id`
  );

  const totalRows = work.reduce((n, w) => n + w.ids.length, 0);
  console.log(`${work.length} distinct titles covering ${totalRows} listings` +
    (SAMPLE ? '  (SAMPLE — measuring cost)' : ''));

  let done = 0, failed = 0, rowsWritten = 0, cost = 0;
  const usageTotals = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  const t0 = Date.now();

  let stopped = false;
  await mapWithConcurrency(work, CONCURRENCY, async (w) => {
    if (stopped) return;
    if (MAX_COST && cost >= MAX_COST) {
      if (!stopped) { stopped = true; console.log(`\n  cost ceiling $${MAX_COST} reached — stopping`); }
      return;
    }
    try {
      const r = await withRetry(() => normalizeListing({
        title_raw: w.title_raw,
        description_raw: w.description_raw,
        tags: w.tags,
        heuristic_brand: w.heuristic_brand,
        heuristic_type: w.heuristic_type,
      }));
      cost += costOf(r.usage || {});
      for (const k of Object.keys(usageTotals)) usageTotals[k] += (r.usage || {})[k] || 0;

      // Never write a null type: a row with normalized_at set and no type is
      // indistinguishable from the treadmill damage this pass exists to repair.
      if (!r.canonical_type) { failed++; return; }

      const res = await withRetry(() => pool.query(
        `UPDATE listings SET
           canonical_brand = $2, canonical_type = $3, canonical_model = $4,
           canonical_size = $5, era_estimate = $6, plane_type_number = $7,
           normalized_at = now(), normalizer_model = $8,
           canonical_type_source = 'llm', canonical_brand_source = 'llm'
         WHERE id = ANY($1::bigint[])`,
        [w.ids, canonicalizeBrand(r.canonical_brand), r.canonical_type,
         r.canonical_model ?? null, r.canonical_size ?? null, r.era_estimate ?? null,
         r.plane_type_number ?? null, r.model]
      ));
      rowsWritten += res.rowCount;
    } catch (e) {
      failed++;
      if (failed <= 3) console.error(`\n  ${w.title_raw?.slice(0, 50)} — ${e.message}`);
    }
    if (++done % 25 === 0 || done === work.length) {
      const secs = (Date.now() - t0) / 1000;
      process.stdout.write(`\r  ${done}/${work.length} titles · ${rowsWritten} rows · $${cost.toFixed(4)} · ${(done / secs).toFixed(1)}/s   `);
    }
  });

  const secs = (Date.now() - t0) / 1000;
  console.log(`\n\ndone in ${secs.toFixed(0)}s — ${rowsWritten} rows written, ${failed} failed`);
  console.log(`cost: $${cost.toFixed(4)}  (avg $${(cost / Math.max(1, done)).toFixed(6)}/call)`);
  console.log(`tokens: ${JSON.stringify(usageTotals)}`);

  if (SAMPLE) {
    const remaining = (await pool.query(
      `SELECT count(DISTINCT lower(btrim(title_raw)))::int n FROM listings
        WHERE canonical_type IS NULL AND status <> 'excluded_non_tool'`)).rows[0].n;
    const per = cost / Math.max(1, done);
    console.log(`\nEXTRAPOLATION: ${remaining} titles remaining x $${per.toFixed(6)} = ~$${(remaining * per).toFixed(2)}`);
    console.log(`  at ${(done / secs).toFixed(1)} titles/s and concurrency ${CONCURRENCY}: ~${(remaining / (done / secs) / 3600).toFixed(1)}h`);
  }
  await pool.end();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
