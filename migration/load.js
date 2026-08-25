#!/usr/bin/env node
/**
 * Phase 2 of the migration: local JSONL -> Postgres.
 *
 * Strategy: COPY each JSONL file into a single-column JSONB staging table, then
 * INSERT..SELECT into the typed target. This beats row-by-row inserts by orders
 * of magnitude at 168k rows, and sidesteps every text[]/timestamp/NULL escaping
 * trap that per-row parameter binding would hit.
 *
 * Indexes are created only after all data has landed (see 002_indexes.sql).
 *
 *   node migration/load.js --init     # create schema + seed sources, then load
 *   node migration/load.js            # load only (schema assumed present)
 *   node migration/load.js --only=listings
 *   node migration/load.js --skip-raw # skip listings_raw (the storage hog)
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Client } = require('pg');
const { from: copyFrom } = require('pg-copy-streams');
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');

const DATA = path.join(__dirname, 'data');
const SCHEMA = path.join(__dirname, 'schema');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const only = (argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];

// Neon exposes a pooled URL (PgBouncer, -pooler host) and a direct one. Bulk
// loading needs the DIRECT connection: COPY, UNLOGGED staging tables, DDL and
// session state all misbehave through transaction-mode pooling, and they fail
// with errors that never mention pooling as the cause.
const DB_URL = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('DATABASE_URL is not set. Run `vercel env pull .env.local` and source it,');
  console.error('or export DATABASE_URL=postgres://... before running.');
  process.exit(1);
}

/**
 * Projections from staged JSONB into typed columns. Kept as SQL rather than JS
 * so the whole transform happens server-side in one statement per table.
 */
const jarr = (f) => `ARRAY(SELECT jsonb_array_elements_text(coalesce(doc->'${f}', '[]'::jsonb)))`;
const ts   = (f) => `(doc->>'${f}')::timestamptz`;
const int  = (f) => `(doc->>'${f}')::numeric::integer`;
const num  = (f) => `(doc->>'${f}')::numeric`;

const TABLES = [
  {
    key: 'listings',
    target: 'listings',
    sql: `
      INSERT INTO listings (
        source, source_id, source_url, title_raw, description_raw, price_cents,
        currency, condition_raw, images, posted_at, tags, location_state,
        location_display, heuristic_brand, heuristic_type, canonical_brand,
        canonical_type, canonical_model, canonical_size, era_estimate,
        plane_type_number, normalizer_model, normalized_at, status,
        excluded_reason, scraped_at, first_seen_at, last_seen_at, sold_at, last_post_at)
      SELECT
        doc->>'source', doc->>'source_id', doc->>'source_url',
        doc->>'title_raw', doc->>'description_raw', ${int('price_cents')},
        coalesce(doc->>'currency', 'USD'), doc->>'condition_raw',
        ${jarr('images')}, ${ts('posted_at')}, ${jarr('tags')},
        doc->>'location_state', doc->>'location_display',
        doc->>'heuristic_brand', doc->>'heuristic_type',
        doc->>'canonical_brand', doc->>'canonical_type',
        doc->>'canonical_model', doc->>'canonical_size', doc->>'era_estimate',
        ${int('plane_type_number')}, doc->>'normalizer_model', ${ts('normalized_at')},
        (doc->>'status')::listing_status, doc->>'excluded_reason',
        ${ts('scraped_at')}, ${ts('first_seen_at')}, ${ts('last_seen_at')},
        ${ts('sold_at')}, ${ts('last_post_at')}
      FROM stg
      ON CONFLICT (source, source_id) DO NOTHING`,
  },
  {
    key: 'listings_raw',
    target: 'listings_raw',
    skipIf: () => has('--skip-raw'),
    // Joins back to listings on the natural key to resolve the surrogate id.
    sql: `
      INSERT INTO listings_raw (listing_id, source, source_id, raw_format, raw, scraped_at)
      SELECT l.id, s.doc->>'source', s.doc->>'source_id',
             s.doc->>'raw_format', coalesce(s.doc->'raw', '{}'::jsonb), (s.doc->>'scraped_at')::timestamptz
      FROM stg s
      JOIN listings l ON l.source = s.doc->>'source' AND l.source_id = s.doc->>'source_id'
      ON CONFLICT (listing_id) DO NOTHING`,
  },
  {
    key: 'price_stats',
    target: 'price_stats',
    sql: `
      INSERT INTO price_stats (
        cluster_key, canonical_type, canonical_brand, canonical_model, canonical_size,
        plane_type_number, grain,
        asking_count, asking_count_active, asking_count_expired, asking_mean,
        asking_p10, asking_p25, asking_p50, asking_p75, asking_p90,
        asking_window_days, asking_by_kind,
        sold_count, sold_mean, sold_p10, sold_p25, sold_p50, sold_p75, sold_p90,
        sold_window_days, sold_by_kind, last_built_at)
      SELECT
        coalesce(doc->>'cluster_key', doc->>'_id'),
        doc->>'canonical_type', doc->>'canonical_brand', doc->>'canonical_model',
        doc->>'canonical_size', ${int('plane_type_number')}, doc->>'grain',
        ${int('asking_count')}, ${int('asking_count_active')}, ${int('asking_count_expired')},
        ${num('asking_mean')}, ${num('asking_p10')}, ${num('asking_p25')}, ${num('asking_p50')},
        ${num('asking_p75')}, ${num('asking_p90')}, ${int('asking_window_days')},
        doc->'asking_by_kind',
        ${int('sold_count')}, ${num('sold_mean')}, ${num('sold_p10')}, ${num('sold_p25')},
        ${num('sold_p50')}, ${num('sold_p75')}, ${num('sold_p90')}, ${int('sold_window_days')},
        doc->'sold_by_kind', ${ts('last_built_at')}
      FROM stg
      ON CONFLICT (cluster_key) DO NOTHING`,
  },
  {
    key: 'alerts',
    target: 'alerts',
    // _email is resolved during export from the legacy users collection. If it
    // could not be resolved the row still loads, with a placeholder that is
    // obviously wrong rather than silently plausible.
    sql: `
      INSERT INTO alerts (email, query, filters, sort, hash, email_enabled,
                          created_at, last_matched_at, legacy_user_id)
      SELECT
        coalesce(doc->>'_email', 'UNRESOLVED:' || (doc->>'userId')),
        coalesce(doc->>'query', ''),
        coalesce(doc->'filters', '{}'::jsonb),
        coalesce(doc->>'sort', 'best'),
        coalesce(doc->>'hash', doc->>'_id'),
        coalesce((doc->'notifications'->>'email')::boolean, true),
        ${ts('createdAt')}, ${ts('lastMatchedAt')}, doc->>'userId'
      FROM stg`,
  },
  {
    key: 'email_sends',
    target: 'email_sends',
    sql: `
      INSERT INTO email_sends (template_id, to_address, subject, vars, status,
                               attempts, resend_message_id, error_message, created_at, sent_at)
      SELECT doc->>'templateId', doc->>'to', doc->>'subject', doc->'vars',
             doc->>'status', coalesce(${int('attempts')}, 0), doc->>'resendMessageId',
             doc->>'error', ${ts('createdAt')}, ${ts('sentAt')}
      FROM stg`,
  },
  {
    key: 'tool_scans',
    target: 'tool_scans',
    sql: `
      INSERT INTO tool_scans (id, user_id, image_count, tool_count, context, results,
                              model, usage, image_paths, previous_scan_id, created_at)
      SELECT doc->>'_id', doc->>'userId', ${int('imageCount')}, ${int('toolCount')},
             doc->>'context', doc->'results', doc->>'model', doc->'usage',
             ${jarr('imagePaths')}, doc->>'previousScanId', ${ts('createdAt')}
      FROM stg
      ON CONFLICT (id) DO NOTHING`,
  },
  {
    key: 'training_examples',
    target: 'training_examples',
    sql: `
      INSERT INTO training_examples (id, image_path, image_content_type, image_bytes,
        source, source_id, source_url, listing_source, canonical_brand, canonical_type,
        canonical_model, canonical_size, plane_type_number, era_estimate, condition,
        label_provenance, label_confidence, cluster_key, notable, why_good_test, added_at)
      SELECT doc->>'_id', doc->>'image_path', doc->>'image_content_type', ${int('image_bytes')},
             doc->>'source', doc->>'source_id', doc->>'source_url', doc->>'listing_source',
             doc->>'canonical_brand', doc->>'canonical_type', doc->>'canonical_model',
             doc->>'canonical_size', ${int('plane_type_number')}, doc->>'era_estimate',
             doc->>'condition', doc->>'label_provenance', doc->>'label_confidence',
             doc->>'cluster_key', doc->>'notable', doc->>'why_good_test', ${ts('added_at')}
      FROM stg
      ON CONFLICT (id) DO NOTHING`,
  },
];

/** COPY text format needs backslashes doubled. JSON.stringify emits no raw
 *  newlines or tabs, so backslash is the only metacharacter in play. */
function escapeForCopy() {
  return new Transform({
    transform(chunk, _enc, cb) {
      cb(null, chunk.toString('utf8').replace(/\\/g, '\\\\'));
    },
  });
}

async function loadTable(client, t) {
  const file = path.join(DATA, `${t.key}.jsonl`);
  if (!fs.existsSync(file)) {
    console.log(`  [${t.key}] no export file, skipping`);
    return { key: t.key, staged: 0, inserted: 0, skipped: 'no-file' };
  }
  if (t.skipIf && t.skipIf()) {
    console.log(`  [${t.key}] skipped by flag`);
    return { key: t.key, staged: 0, inserted: 0, skipped: 'flag' };
  }

  const t0 = Date.now();
  await client.query('DROP TABLE IF EXISTS stg');
  await client.query('CREATE UNLOGGED TABLE stg (doc jsonb)');

  const stream = client.query(copyFrom('COPY stg (doc) FROM STDIN'));
  await pipeline(fs.createReadStream(file), escapeForCopy(), stream);

  const staged = (await client.query('SELECT count(*)::int AS n FROM stg')).rows[0].n;
  const res = await client.query(t.sql);
  await client.query('DROP TABLE stg');

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `  [${t.key}] staged ${staged} -> inserted ${res.rowCount} into ${t.target}  (${secs}s)`
  );
  return { key: t.key, staged, inserted: res.rowCount };
}

async function runSqlFile(client, file) {
  const sql = fs.readFileSync(path.join(SCHEMA, file), 'utf8');
  process.stdout.write(`  applying ${file} … `);
  const t0 = Date.now();
  await client.query(sql);
  console.log(`ok (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

(async () => {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log(`connected: ${DB_URL.replace(/:[^:@/]+@/, ':****@')}\n`);

  if (has('--init')) {
    console.log('creating schema:');
    await runSqlFile(client, '001_tables.sql');
    await runSqlFile(client, '003_seed_sources.sql');
    console.log('');
  }

  console.log('loading data:');
  const results = [];
  for (const t of TABLES) {
    if (only && t.key !== only) continue;
    results.push(await loadTable(client, t));
  }

  if (!only) {
    console.log('\ncreating indexes (deferred until after load):');
    await runSqlFile(client, '002_indexes.sql');
  }

  console.log('\nsummary:');
  for (const r of results) {
    console.log(`  ${r.key.padEnd(20)} staged ${String(r.staged).padStart(7)}  inserted ${String(r.inserted).padStart(7)}${r.skipped ? '  (' + r.skipped + ')' : ''}`);
  }

  await client.end();
  process.exit(0);
})().catch(async (e) => {
  console.error('\nFATAL', e.message);
  if (e.detail) console.error('detail:', e.detail);
  process.exit(1);
});
