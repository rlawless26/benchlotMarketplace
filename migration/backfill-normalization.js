#!/usr/bin/env node
/**
 * Records normalization provenance, then backfills canonical_type /
 * canonical_brand from the free keyword heuristics.
 *
 * Why this exists: pricestats/build.js requires BOTH canonical_type and a
 * canonical_brand that isn't 'Unknown', so only 26% of the corpus reaches the
 * price guide — and the sold block, the moat, qualifies at 11.8%. The LLM
 * normalizer returned a NULL type on 31,087 of the 93,418 rows it ran on,
 * including titles the free heuristic classifies correctly. This recovers
 * those without an API call.
 *
 * Every backfilled label already exists in CANONICAL_TYPES, so nothing here
 * invents vocabulary; the *_source columns record what came from where, so the
 * LLM can later target exactly the heuristic-derived rows and the whole thing
 * reverts with one UPDATE.
 *
 * BATCHED WITH VACUUM. Each updated row leaves a dead tuple; a single UPDATE
 * across 77k rows exceeds the free-tier quota mid-statement and rolls back.
 *
 *   node migration/backfill-normalization.js --dry-run
 *   node migration/backfill-normalization.js
 *   node migration/backfill-normalization.js --revert
 */
const { Client } = require('pg');

const DB = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!DB) { console.error('DATABASE_URL is not set'); process.exit(1); }

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const REVERT = argv.includes('--revert');
const BATCH = 10000;

const UNKNOWN = `('Unknown','')`;

async function sizeOf(c) {
  return (await c.query(`SELECT pg_size_pretty(pg_database_size(current_database())) s`)).rows[0].s;
}

/** Run one UPDATE repeatedly over a bounded id window until it stops matching. */
async function batched(c, label, sql) {
  let total = 0;
  for (;;) {
    const { rowCount } = await c.query(sql, [BATCH]);
    if (!rowCount) break;
    total += rowCount;
    await c.query('VACUUM listings');
    process.stdout.write(`\r  ${label}: ${total} rows  (db ${await sizeOf(c)})   `);
  }
  console.log(`\r  ${label}: ${total} rows  (db ${await sizeOf(c)})        `);
  return total;
}

(async () => {
  const c = new Client({ connectionString: DB });
  await c.connect();
  console.log(`db before: ${await sizeOf(c)}\n`);

  if (REVERT) {
    await batched(c, 'revert type ', `
      UPDATE listings SET canonical_type = NULL, canonical_type_source = NULL
       WHERE id IN (SELECT id FROM listings WHERE canonical_type_source = 'heuristic' LIMIT $1)`);
    await batched(c, 'revert brand', `
      UPDATE listings SET canonical_brand = NULL, canonical_brand_source = NULL
       WHERE id IN (SELECT id FROM listings WHERE canonical_brand_source = 'heuristic' LIMIT $1)`);
    await c.end();
    return;
  }

  if (DRY) {
    const r = await c.query(`
      SELECT
        count(*) FILTER (WHERE canonical_type IS NOT NULL AND canonical_type_source IS NULL)::int AS mark_type_llm,
        count(*) FILTER (WHERE canonical_brand IS NOT NULL AND canonical_brand_source IS NULL)::int AS mark_brand_llm,
        count(*) FILTER (WHERE canonical_type IS NULL AND heuristic_type IS NOT NULL
                           AND heuristic_type NOT IN ('Other','Unknown')
                           AND status <> 'excluded_non_tool')::int AS fill_type,
        count(*) FILTER (WHERE (canonical_brand IS NULL OR canonical_brand IN ('Unknown',''))
                           AND heuristic_brand IS NOT NULL AND heuristic_brand NOT IN ('Unknown','')
                           AND status <> 'excluded_non_tool')::int AS fill_brand
      FROM listings`);
    console.log('  dry run —', JSON.stringify(r.rows[0], null, 1));
    await c.end();
    return;
  }

  // 1. Provenance for values the LLM already produced.
  await batched(c, 'mark llm type ', `
    UPDATE listings SET canonical_type_source = 'llm'
     WHERE id IN (SELECT id FROM listings
                   WHERE canonical_type IS NOT NULL AND canonical_type_source IS NULL LIMIT $1)`);
  await batched(c, 'mark llm brand', `
    UPDATE listings SET canonical_brand_source = 'llm'
     WHERE id IN (SELECT id FROM listings
                   WHERE canonical_brand IS NOT NULL AND canonical_brand_source IS NULL LIMIT $1)`);

  // 2. Heuristic backfill. Only where the LLM produced nothing.
  await batched(c, 'fill type     ', `
    UPDATE listings SET canonical_type = heuristic_type, canonical_type_source = 'heuristic'
     WHERE id IN (SELECT id FROM listings
                   WHERE canonical_type IS NULL AND heuristic_type IS NOT NULL
                     AND heuristic_type NOT IN ('Other','Unknown')
                     AND status <> 'excluded_non_tool' LIMIT $1)`);
  await batched(c, 'fill brand    ', `
    UPDATE listings SET canonical_brand = heuristic_brand, canonical_brand_source = 'heuristic'
     WHERE id IN (SELECT id FROM listings
                   WHERE (canonical_brand IS NULL OR canonical_brand IN ('Unknown',''))
                     AND heuristic_brand IS NOT NULL AND heuristic_brand NOT IN ('Unknown','')
                     AND status <> 'excluded_non_tool' LIMIT $1)`);

  console.log(`\ndb after: ${await sizeOf(c)}`);
  await c.end();
})().catch(async (e) => { console.error('\nFATAL', e.message); process.exit(1); });
