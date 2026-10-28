#!/usr/bin/env node
/**
 * Normalization coverage report (schema/013).
 *
 * Two numbers matter. `pct_typed` is the share of tool listings the normalizer
 * has named. `pct_price_guide` is the share that reach the price guide — the
 * `_qualifying` filter from rebuild_price_stats() (schema/006) reproduced row
 * for row: typed, branded, priced, not a lot, not parts, and either sold or
 * seen in the last year. The second number is the moat; the first is what
 * money buys.
 *
 * The full scan runs bl_is_junk()/bl_is_lot() on every row and takes seconds,
 * so the nightly cron stores the result in coverage_snapshots (--write) and
 * /api/v1/meta reads the latest row instead of recomputing.
 *
 *   node scripts/coverage-report.js            # print
 *   node scripts/coverage-report.js --json     # machine-readable, for before/after diffs
 *   node scripts/coverage-report.js --write    # also insert a coverage_snapshots row
 */
const { fromFunctions, loadEnv } = require('./lib/load-env');
loadEnv('functions/.env', 'web/.env.local');
const { Pool } = fromFunctions('pg');

const DB = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!DB) { console.error('DATABASE_URL is not set'); process.exit(1); }
const JSON_OUT = process.argv.includes('--json');
const WRITE = process.argv.includes('--write');
// Per-title batch price used for the "remaining cost" line; update when the
// model or the measured figure changes (see docs/normalizer-backfill-runbook.md).
const PER_TITLE_USD = Number(process.env.NORMALIZE_PER_TITLE_USD || 0.0013);

const QUALIFYING = `
  canonical_type IS NOT NULL
  AND canonical_brand IS NOT NULL AND canonical_brand NOT IN ('Unknown', '')
  AND price_cents BETWEEN 1 AND 5000000
  AND NOT bl_is_junk(title_raw, condition_raw)
  AND NOT bl_is_lot(title_raw)
  AND (status = 'sold' OR (status IN ('active', 'expired') AND last_seen_at > now() - interval '365 days'))`;

(async () => {
  const pool = new Pool({ connectionString: DB, max: 2 });
  try {
    const [{ rows: [totals] }, { rows: bySource }, { rows: byStatus }, { rows: [queue] }] = await Promise.all([
      pool.query(`
        SELECT count(*)::bigint AS total,
               count(*) FILTER (WHERE canonical_type IS NOT NULL)::bigint AS typed,
               count(*) FILTER (WHERE ${QUALIFYING})::bigint AS price_guide,
               count(*) FILTER (WHERE canonical_type IS NULL AND normalize_attempts >= 3)::bigint AS attempts_exhausted
          FROM listings WHERE status <> 'excluded_non_tool'`),
      pool.query(`
        SELECT source,
               count(*)::int AS total,
               count(*) FILTER (WHERE canonical_type IS NOT NULL)::int AS typed,
               count(*) FILTER (WHERE ${QUALIFYING})::int AS price_guide
          FROM listings WHERE status <> 'excluded_non_tool'
         GROUP BY source ORDER BY total DESC`),
      pool.query(`
        SELECT status::text AS status,
               count(*)::int AS total,
               count(*) FILTER (WHERE canonical_type IS NOT NULL)::int AS typed
          FROM listings WHERE status <> 'excluded_non_tool'
         GROUP BY status ORDER BY total DESC`),
      pool.query(`
        SELECT (SELECT count(DISTINCT lower(btrim(title_raw))) FROM listings
                 WHERE canonical_type IS NULL AND status <> 'excluded_non_tool'
                   AND normalize_attempts < 3)::bigint AS unnormalized_titles,
               (SELECT count(*) FROM normalize_batch_items WHERE status = 'pending')::bigint AS pending_batch_items,
               (SELECT count(*) FROM normalize_batches WHERE status IN ('submitted','ended'))::int AS open_batches`),
    ]);

    const n = (x) => Number(x);
    const report = {
      taken_at: new Date().toISOString(),
      total: n(totals.total),
      typed: n(totals.typed),
      price_guide: n(totals.price_guide),
      pct_typed: n(totals.typed) / Math.max(1, n(totals.total)),
      pct_price_guide: n(totals.price_guide) / Math.max(1, n(totals.total)),
      attempts_exhausted: n(totals.attempts_exhausted),
      unnormalized_titles: n(queue.unnormalized_titles),
      pending_batch_items: n(queue.pending_batch_items),
      open_batches: n(queue.open_batches),
      remaining_cost_usd_estimate: Number((n(queue.unnormalized_titles) * PER_TITLE_USD).toFixed(2)),
      by_source: Object.fromEntries(bySource.map((r) => [r.source, { total: r.total, typed: r.typed, price_guide: r.price_guide }])),
      by_status: Object.fromEntries(byStatus.map((r) => [r.status, { total: r.total, typed: r.typed }])),
    };

    if (WRITE) {
      await pool.query(
        `INSERT INTO coverage_snapshots
           (pct_typed, pct_price_guide, total, typed, price_guide, unnormalized_titles,
            attempts_exhausted, pending_batch_items, by_source, by_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [report.pct_typed.toFixed(4), report.pct_price_guide.toFixed(4), report.total, report.typed,
          report.price_guide, report.unnormalized_titles, report.attempts_exhausted,
          report.pending_batch_items, JSON.stringify(report.by_source), JSON.stringify(report.by_status)]
      );
    }

    if (JSON_OUT) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      const pct = (x) => `${(x * 100).toFixed(1)}%`;
      console.log(`coverage ${report.taken_at}${WRITE ? '  (snapshot written)' : ''}`);
      console.log(`  typed        ${pct(report.pct_typed)}  (${report.typed.toLocaleString()} of ${report.total.toLocaleString()})`);
      console.log(`  price guide  ${pct(report.pct_price_guide)}  (${report.price_guide.toLocaleString()})`);
      console.log(`  queue        ${report.unnormalized_titles.toLocaleString()} titles · ~$${report.remaining_cost_usd_estimate} via batch · ${report.pending_batch_items} results pending in ${report.open_batches} open batch(es) · ${report.attempts_exhausted} rows gave up`);
      console.log('\n  by source');
      console.table(bySource.map((r) => ({ source: r.source, total: r.total, typed: `${(100 * r.typed / r.total).toFixed(0)}%`, price_guide: `${(100 * r.price_guide / r.total).toFixed(0)}%` })));
      console.log('  by status');
      console.table(byStatus.map((r) => ({ status: r.status, total: r.total, typed: `${(100 * r.typed / r.total).toFixed(0)}%` })));
    }
  } finally {
    await pool.end();
  }
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
