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
 * THREE MODES (schema/013):
 *
 *   sync (default)   one messages.create per title, written immediately.
 *   --batch-submit   same selection, same request params, sent to the Message
 *                    Batches API at 50% of standard pricing. Nothing is written
 *                    to listings; the batch id and its titles go to
 *                    normalize_batches / normalize_batch_items.
 *   --collect        fetch every ended batch and write its results back,
 *                    keyed by title and guarded by `canonical_type IS NULL` so
 *                    a row normalized elsewhere in the meantime is left alone.
 *
 * Every mode records failures: a title that threw or came back without a type
 * gets normalize_attempts + 1 and is skipped after three. Before 013 those
 * rows looked identical to never-tried rows and were re-billed every pass.
 *
 *   node functions/normalize/run-postgres.js --sample 50            # measure real cost
 *   node functions/normalize/run-postgres.js --limit 5000
 *   node functions/normalize/run-postgres.js                        # whole backlog, sync
 *   node functions/normalize/run-postgres.js --batch-submit --max-cost 20
 *   node functions/normalize/run-postgres.js --collect
 */
const path = require('path');
const { createHash } = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');
const {
  normalizeListing, buildRequestParams, parseClassification, shutdownClient, DEFAULT_MODEL,
} = require('./normalizer');
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
// --match <posix-regex>: restrict the pass to titles matching a pattern
// (case-insensitive, applied server-side with ~*). Exists for demand-targeted
// passes: Search Console showed which clusters draw impressions, so spend
// normalization money on titles that feed THOSE pages instead of the whole
// backlog. First use 2026-09-04: the power-tool slice of eBay actives
// (~10.6k of 68k titles, ~$28 of ~$168).
const mi = argv.indexOf('--match');
const MATCH = mi >= 0 ? argv[mi + 1] : null;
// Hard ceiling. Stops mid-run rather than overrunning an approved budget. In
// batch mode the request list is trimmed to fit the ceiling before submission.
const MAX_COST = num('--max-cost', 0);
const BATCH_SUBMIT = argv.includes('--batch-submit');
const COLLECT = argv.includes('--collect');
// Requests per Anthropic batch. The API allows 100k requests / 256 MB, and
// every request carries the full ~35 KB system prompt (batches cannot share
// it), so 10k requests is ~400 MB and was rejected with 413 on 2026-10-21.
// 2,500 is ~100 MB. Smaller batches also finish sooner and lose less on expiry.
const BATCH_CHUNK = num('--batch-chunk', 2_500);
// Attempts after which a title is left alone. Three real failures on the same
// title is the model declining, not the network.
const MAX_ATTEMPTS = 3;
const MODEL = process.env.BENCHLOT_NORMALIZER_MODEL || DEFAULT_MODEL;

// USD per million tokens, standard (synchronous) pricing. Cache write is
// 1.25x input, cache read 0.1x input. Batch pricing is half of every column.
const PRICES = {
  'claude-haiku-4-5': { input: 1.0, output: 5.0, cacheWrite: 1.25, cacheRead: 0.1 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 },
};
function priceFor(model, batch = false) {
  const base = PRICES[model] || PRICES['claude-haiku-4-5'];
  if (!PRICES[model]) console.warn(`[cost] no price table for ${model}; using Haiku 4.5 rates`);
  const k = batch ? 0.5 : 1;
  return { input: base.input * k, output: base.output * k, cacheWrite: base.cacheWrite * k, cacheRead: base.cacheRead * k };
}
function costOf(u, price) {
  return (
    ((u.input_tokens || 0) * price.input +
      (u.output_tokens || 0) * price.output +
      (u.cache_creation_input_tokens || 0) * price.cacheWrite +
      (u.cache_read_input_tokens || 0) * price.cacheRead) / 1e6
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const titleKey = (t) => String(t).trim().toLowerCase();
const customIdFor = (key) => createHash('sha1').update(key).digest('hex').slice(0, 40);

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

/** Plain SDK client for the Batches endpoints. The PostHog wrapper used by the
 * sync path instruments messages.create; batches are accounted for in
 * normalize_batches.actual_cost_usd instead. */
function plainClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  return new Anthropic.Anthropic({ apiKey });
}

/** One row per distinct title; `ids` carries every listing sharing it. */
async function selectWork(pool) {
  const cap = SAMPLE || LIMIT || 0;
  // Group to get the id list, then join back for the payload. Aggregating the
  // tags column directly fails — array_agg cannot accumulate empty arrays, and
  // plenty of listings have none.
  const { rows } = await pool.query(
    `WITH grouped AS (
       SELECT lower(btrim(title_raw)) AS k,
              array_agg(id) AS ids,
              min(id) AS rep_id
         FROM listings
        WHERE canonical_type IS NULL
          AND status <> 'excluded_non_tool'
          AND title_raw IS NOT NULL
          AND normalize_attempts < ${MAX_ATTEMPTS}
          -- A title stamped in the last two days is sitting in a batch that
          -- has not been collected yet (batches take up to 24h). Skip it.
          AND (normalize_last_attempt_at IS NULL
               OR normalize_last_attempt_at < now() - interval '2 days')
          ${DURABLE_ONLY ? `AND (status = 'sold' OR source NOT IN ('ebay','fbmarketplace'))` : ''}
          ${MATCH ? `AND title_raw ~* $1` : ''}
        GROUP BY 1
        ORDER BY count(*) DESC
        ${cap ? `LIMIT ${cap}` : ''}
     )
     SELECT g.k AS title_key, g.ids, l.title_raw, l.description_raw, l.tags,
            l.heuristic_brand, l.heuristic_type, l.source
       FROM grouped g
       JOIN listings l ON l.id = g.rep_id`,
    MATCH ? [MATCH] : []
  );
  if (MATCH) console.log(`match filter: ${MATCH}`);
  return rows;
}

const WRITE_SQL = `
  UPDATE listings SET
    canonical_brand = $2, canonical_type = $3, canonical_model = $4,
    canonical_size = $5, era_estimate = $6, plane_type_number = $7,
    normalized_at = now(), normalizer_model = $8,
    canonical_type_source = 'llm', canonical_brand_source = 'llm',
    normalize_last_error = NULL
  WHERE id = ANY($1::bigint[])`;

function writeParams(ids, r) {
  return [ids, canonicalizeBrand(r.canonical_brand), r.canonical_type,
    r.canonical_model ?? null, r.canonical_size ?? null, r.era_estimate ?? null,
    r.plane_type_number ?? null, r.model];
}

async function markFailed(pool, ids, message) {
  await withRetry(() => pool.query(
    `UPDATE listings SET normalize_attempts = normalize_attempts + 1,
            normalize_last_attempt_at = now(),
            normalize_last_error = left($2, 500)
      WHERE id = ANY($1::bigint[])`,
    [ids, String(message || 'no type returned')]
  ));
}

// ---------------------------------------------------------------------------
// sync mode
// ---------------------------------------------------------------------------
async function runSync(pool) {
  const price = priceFor(MODEL);
  const work = await selectWork(pool);
  const totalRows = work.reduce((n, w) => n + w.ids.length, 0);
  console.log(`${work.length} distinct titles covering ${totalRows} listings` +
    (SAMPLE ? '  (SAMPLE — measuring cost)' : '') + `  model=${MODEL}`);

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
        source: w.source,
      }, { model: MODEL }));
      cost += costOf(r.usage || {}, price);
      for (const k of Object.keys(usageTotals)) usageTotals[k] += (r.usage || {})[k] || 0;

      // Never write a null type: a row with normalized_at set and no type is
      // indistinguishable from the treadmill damage this pass exists to repair.
      if (!r.canonical_type) {
        failed++;
        await markFailed(pool, w.ids, 'model returned no canonical_type');
        return;
      }

      const res = await withRetry(() => pool.query(WRITE_SQL, writeParams(w.ids, r)));
      rowsWritten += res.rowCount;
    } catch (e) {
      failed++;
      if (failed <= 3) console.error(`\n  ${w.title_raw?.slice(0, 50)} — ${e.message}`);
      // A 4xx (credit balance, bad request) is not the title's fault and should
      // not consume one of its attempts; it stops the run instead.
      if (e.status && e.status >= 400 && e.status < 500 && e.status !== 429) {
        stopped = true;
        console.error(`\n  non-retryable ${e.status}: ${e.message} — stopping`);
        return;
      }
      try { await markFailed(pool, w.ids, e.message); } catch { /* best effort */ }
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
        WHERE canonical_type IS NULL AND status <> 'excluded_non_tool'
          AND normalize_attempts < ${MAX_ATTEMPTS}`)).rows[0].n;
    // Steady-state per-title cost: a sample's first calls write the prompt
    // cache (1.25x) before the rest read it (0.1x); at concurrency 6 that is
    // six writes in a 20-call sample, which overstates the real rate ~2x.
    const steady = costOf({
      ...usageTotals,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: usageTotals.cache_read_input_tokens + usageTotals.cache_creation_input_tokens,
    }, price);
    const per = steady / Math.max(1, done);
    console.log(`\nEXTRAPOLATION (steady-state, cache warm): ${remaining} titles remaining x $${per.toFixed(6)} = ~$${(remaining * per).toFixed(2)} sync, ~$${(remaining * per / 2).toFixed(2)} via --batch-submit`);
    console.log(`  at ${(done / secs).toFixed(1)} titles/s and concurrency ${CONCURRENCY}: ~${(remaining / (done / secs) / 3600).toFixed(1)}h sync`);
  }
  await shutdownClient();
}

// ---------------------------------------------------------------------------
// --batch-submit
// ---------------------------------------------------------------------------
async function runBatchSubmit(pool) {
  const client = plainClient();
  const price = priceFor(MODEL, true);
  const work = await selectWork(pool);
  if (work.length === 0) { console.log('nothing to submit'); return; }
  const totalRows = work.reduce((n, w) => n + w.ids.length, 0);
  console.log(`${work.length} distinct titles covering ${totalRows} listings  model=${MODEL}`);

  // Pre-flight: count the input tokens on a sample of real requests so the
  // ceiling is checked against this backlog, not a guess. countTokens is free.
  const sampleN = Math.min(50, work.length);
  let inputTokens = 0;
  for (const w of work.slice(0, sampleN)) {
    const p = buildRequestParams(w, MODEL);
    const { input_tokens } = await withRetry(() => client.messages.countTokens({
      model: p.model, system: p.system, tools: p.tools, tool_choice: p.tool_choice, messages: p.messages,
    }));
    inputTokens += input_tokens;
  }
  const avgInput = inputTokens / sampleN;
  const OUTPUT_GUESS = 80; // one tool call with six short fields
  // Worst case assumes no cache hits (batches cache best-effort). With the
  // ~8.8k-token system prompt cached the real figure is a fraction of this.
  const perTitleWorst = (avgInput * price.input + OUTPUT_GUESS * price.output) / 1e6;
  const perTitleCached = ((avgInput - 8000) * price.input + 8000 * price.cacheRead + OUTPUT_GUESS * price.output) / 1e6;
  console.log(`avg input ${avgInput.toFixed(0)} tokens → $${perTitleWorst.toFixed(5)}/title uncached, ~$${perTitleCached.toFixed(5)} cached`);

  let selected = work;
  if (MAX_COST) {
    const fit = Math.floor(MAX_COST / perTitleWorst);
    if (fit < work.length) {
      console.log(`cost ceiling $${MAX_COST}: submitting ${fit} of ${work.length} titles (worst-case pricing)`);
      selected = work.slice(0, fit);
    }
  }
  if (selected.length === 0) { console.log('ceiling too low for a single title'); return; }

  const flags = argv.join(' ');
  for (let i = 0; i < selected.length; i += BATCH_CHUNK) {
    const chunk = selected.slice(i, i + BATCH_CHUNK);
    const requests = chunk.map((w) => ({
      custom_id: customIdFor(w.title_key),
      params: buildRequestParams(w, MODEL),
    }));
    const estimate = chunk.length * perTitleWorst;
    const batch = await withRetry(() => client.messages.batches.create({ requests }));
    console.log(`submitted ${batch.id}: ${chunk.length} requests, status ${batch.processing_status}, est ≤ $${estimate.toFixed(2)}`);

    await pool.query(
      `INSERT INTO normalize_batches (id, model, request_count, estimated_cost_usd, flags)
       VALUES ($1, $2, $3, $4, $5)`,
      [batch.id, MODEL, chunk.length, estimate.toFixed(4), flags]
    );
    // Multi-row insert in slices; a 10k-row VALUES list is fine for pg but
    // keeps each statement well under any parameter limit.
    for (let j = 0; j < chunk.length; j += 1000) {
      const slice = chunk.slice(j, j + 1000);
      const values = [];
      const params = [];
      slice.forEach((w, k) => {
        params.push(batch.id, customIdFor(w.title_key), w.title_key);
        const b = k * 3;
        values.push(`($${b + 1}, $${b + 2}, $${b + 3})`);
      });
      await pool.query(
        `INSERT INTO normalize_batch_items (batch_id, custom_id, title_key) VALUES ${values.join(',')}
         ON CONFLICT DO NOTHING`,
        params
      );
    }
    const ids = chunk.flatMap((w) => w.ids);
    await pool.query(
      `UPDATE listings SET normalize_last_attempt_at = now() WHERE id = ANY($1::bigint[])`,
      [ids]
    );
  }
  console.log(`\nrun \`--collect\` once the batch has ended (usually within the hour, at most 24h).`);
}

// ---------------------------------------------------------------------------
// --collect
// ---------------------------------------------------------------------------
async function runCollect(pool) {
  const client = plainClient();
  const { rows: batches } = await pool.query(
    `SELECT id, model, request_count FROM normalize_batches
      WHERE status IN ('submitted', 'ended') ORDER BY submitted_at`
  );
  if (batches.length === 0) { console.log('no batches awaiting collection'); return; }

  for (const b of batches) {
    const price = priceFor(b.model, true);
    const info = await withRetry(() => client.messages.batches.retrieve(b.id));
    if (info.processing_status !== 'ended') {
      console.log(`${b.id}: ${info.processing_status} (${JSON.stringify(info.request_counts)}) — not yet`);
      continue;
    }
    await pool.query(`UPDATE normalize_batches SET status = 'ended' WHERE id = $1 AND status = 'submitted'`, [b.id]);
    console.log(`${b.id}: ended ${JSON.stringify(info.request_counts)} — collecting`);

    const { rows: items } = await pool.query(
      `SELECT custom_id, title_key FROM normalize_batch_items WHERE batch_id = $1 AND status = 'pending'`,
      [b.id]
    );
    const byCustomId = new Map(items.map((it) => [it.custom_id, it.title_key]));

    let good = [], bad = [], cost = 0, seen = 0;
    const usageTotals = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
    const flushGood = async () => {
      if (good.length === 0) return;
      // UPDATE ... FROM a VALUES list, one statement per ~2k titles. Each UPDATE
      // leaves dead tuples; chunking plus the VACUUM below keeps the Neon
      // free-tier footprint flat (migration/schema/005 explains the failure).
      const values = [], params = [];
      good.forEach((g, k) => {
        const base = k * 8;
        params.push(g.title_key, g.brand, g.type, g.model, g.size, g.era, g.ptn, b.model);
        values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}::smallint, $${base + 8})`);
      });
      const res = await withRetry(() => pool.query(
        `UPDATE listings l SET
           canonical_brand = v.brand, canonical_type = v.type, canonical_model = v.model,
           canonical_size = v.size, era_estimate = v.era, plane_type_number = v.ptn,
           normalized_at = now(), normalizer_model = v.nm,
           canonical_type_source = 'llm', canonical_brand_source = 'llm',
           normalize_last_error = NULL
         FROM (VALUES ${values.join(',')}) AS v(title_key, brand, type, model, size, era, ptn, nm)
         WHERE lower(btrim(l.title_raw)) = v.title_key
           AND l.canonical_type IS NULL`,
        params
      ));
      await pool.query(
        `UPDATE normalize_batch_items SET status = 'succeeded' WHERE batch_id = $1 AND custom_id = ANY($2::text[])`,
        [b.id, good.map((g) => g.custom_id)]
      );
      process.stdout.write(`\r  ${seen}/${items.length} results · ${res.rowCount} rows this chunk · $${cost.toFixed(4)}   `);
      good = [];
    };
    const flushBad = async () => {
      if (bad.length === 0) return;
      for (const x of bad) {
        await withRetry(() => pool.query(
          `UPDATE listings SET normalize_attempts = normalize_attempts + 1,
                  normalize_last_attempt_at = now(), normalize_last_error = left($2, 500)
            WHERE lower(btrim(title_raw)) = $1 AND canonical_type IS NULL`,
          [x.title_key, x.error]
        ));
        await pool.query(
          `UPDATE normalize_batch_items SET status = $3, error = left($4, 500)
            WHERE batch_id = $1 AND custom_id = $2`,
          [b.id, x.custom_id, x.status, x.error]
        );
      }
      bad = [];
    };

    let chunks = 0;
    for await (const result of await client.messages.batches.results(b.id)) {
      seen++;
      const title_key = byCustomId.get(result.custom_id);
      if (!title_key) continue; // already collected, or not ours
      const r = result.result;
      if (r.type === 'succeeded') {
        let parsed;
        try { parsed = parseClassification(r.message, b.model); } catch (e) {
          bad.push({ custom_id: result.custom_id, title_key, status: 'no_type', error: e.message });
          continue;
        }
        cost += costOf(parsed.usage, price);
        for (const k of Object.keys(usageTotals)) usageTotals[k] += parsed.usage[k] || 0;
        if (!parsed.canonical_type) {
          bad.push({ custom_id: result.custom_id, title_key, status: 'no_type', error: 'model returned no canonical_type' });
          continue;
        }
        good.push({
          custom_id: result.custom_id, title_key,
          brand: canonicalizeBrand(parsed.canonical_brand), type: parsed.canonical_type,
          model: parsed.canonical_model ?? null, size: parsed.canonical_size ?? null,
          era: parsed.era_estimate ?? null, ptn: parsed.plane_type_number ?? null,
        });
      } else if (r.type === 'errored') {
        bad.push({ custom_id: result.custom_id, title_key, status: 'errored', error: `${r.error?.type}: ${r.error?.message || ''}` });
      } else {
        // expired | canceled: not the title's fault, but recorded so a
        // resubmit is a deliberate choice. Attempts still increment; three
        // expirations in a row is a batch-sizing problem worth noticing.
        bad.push({ custom_id: result.custom_id, title_key, status: 'expired', error: r.type });
      }
      if (good.length >= 2000) {
        await flushGood();
        if (++chunks % 5 === 0) await pool.query('VACUUM listings');
      }
      if (bad.length >= 200) await flushBad();
    }
    await flushGood();
    await flushBad();

    await pool.query(
      `UPDATE normalize_batches SET status = 'collected', collected_at = now(), actual_cost_usd = $2 WHERE id = $1`,
      [b.id, cost.toFixed(4)]
    );
    const { rows: [tally] } = await pool.query(
      `SELECT count(*) FILTER (WHERE status = 'succeeded') AS ok,
              count(*) FILTER (WHERE status <> 'succeeded' AND status <> 'pending') AS failed,
              count(*) FILTER (WHERE status = 'pending') AS pending
         FROM normalize_batch_items WHERE batch_id = $1`, [b.id]
    );
    console.log(`\n${b.id}: collected — ${tally.ok} ok, ${tally.failed} failed, ${tally.pending} unmatched · $${cost.toFixed(4)} · tokens ${JSON.stringify(usageTotals)}`);
  }
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

  if (BATCH_SUBMIT && COLLECT) throw new Error('--batch-submit and --collect are separate runs');
  if (COLLECT) await runCollect(pool);
  else if (BATCH_SUBMIT) await runBatchSubmit(pool);
  else await runSync(pool);

  await pool.end();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
