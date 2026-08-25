#!/usr/bin/env node
/**
 * Phase 3: prove the migration didn't lose or corrupt anything.
 *
 * Three independent checks, because row counts alone can hide real damage:
 *   1. CENSUS  - Postgres counts vs the Firestore census taken before the move.
 *   2. PARITY  - Postgres counts vs the JSONL actually exported (catches a
 *                partial export that a census check alone would call "close").
 *   3. FIDELITY- field-by-field diff on randomly sampled rows (catches silent
 *                type coercion: a dropped array element, a shifted timestamp,
 *                a price rounded to nothing).
 *
 * Then reports two things Firestore could not answer without new indexes:
 * per-source scrape freshness, and canonical_type vocabulary drift.
 *
 *   node migration/validate.js
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Client } = require('pg');

const DATA = path.join(__dirname, 'data');
// Neon exposes a pooled URL (PgBouncer, -pooler host) and a direct one. Bulk
// loading needs the DIRECT connection: COPY, UNLOGGED staging tables, DDL and
// session state all misbehave through transaction-mode pooling, and they fail
// with errors that never mention pooling as the cause.
const DB_URL = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!DB_URL) { console.error('DATABASE_URL is not set.'); process.exit(1); }

/** Firestore census taken 2026-08-25, before any writes to Postgres. */
const CENSUS = {
  tables: {
    listings: 167850, listings_raw: 167850, price_stats: 60957,
    alerts: 2, email_sends: 38, tool_scans: 63, training_examples: 10823,
  },
  status: { active: 130850, sold: 34017, expired: 18, excluded_non_tool: 2965 },
  perSource: {
    jimbode: 2342, jimbode_valueguide: 26214, hyperkitten: 1099, sawmillcreek: 66,
    woodnet: 261, ebay: 128815, thebestthings: 423, reddit: 6, rouillard: 407,
    vintagevials: 177, oldtools: 221, fbmarketplace: 7819,
  },
};

let failures = 0;
const ok   = (m) => console.log(`  \x1b[32mPASS\x1b[0m  ${m}`);
const bad  = (m) => { failures++; console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`); };
const warn = (m) => console.log(`  \x1b[33mWARN\x1b[0m  ${m}`);

function cmp(label, actual, expected) {
  if (actual === expected) ok(`${label}: ${actual}`);
  else bad(`${label}: got ${actual}, expected ${expected}  (delta ${actual - expected})`);
}

async function countLines(file) {
  if (!fs.existsSync(file)) return null;
  let n = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim()) n++;
  return n;
}

/** Read a specific set of line numbers out of a JSONL file in one pass. */
async function readLines(file, wanted) {
  const want = new Set(wanted);
  const out = new Map();
  let i = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    if (want.has(i)) out.set(i, JSON.parse(line));
    i++;
    if (out.size === want.size) break;
  }
  return out;
}

/** Normalize both sides to comparable primitives before diffing. */
function norm(v) {
  if (v === undefined || v === null) return null;
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(norm);
  return v;
}
function eq(a, b) { return JSON.stringify(norm(a)) === JSON.stringify(norm(b)); }

(async () => {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  const q = async (sql, p) => (await client.query(sql, p)).rows;
  const one = async (sql, p) => (await q(sql, p))[0];

  console.log('\n=== 1. CENSUS — Postgres vs pre-migration Firestore counts ===');
  // listings_raw may be deliberately deferred to keep the database inside a
  // storage quota; the JSONL export on disk remains the durable copy. That is a
  // capacity decision, not data loss, so it must not read as a failed check.
  const rawDeferred = process.argv.includes('--raw-deferred');
  for (const [t, expected] of Object.entries(CENSUS.tables)) {
    let n = 0;
    try { n = (await one(`SELECT count(*)::int AS n FROM ${t}`)).n; }
    catch (e) { if (t === 'listings_raw' && rawDeferred) { warn('listings_raw: table absent — deferred by choice'); continue; } throw e; }
    if (t === 'listings_raw' && rawDeferred && n === 0) {
      warn(`listings_raw: 0 rows — deferred by choice (${expected} rows held in migration/data/listings_raw.jsonl)`);
      continue;
    }
    cmp(t, n, expected);
  }

  console.log('\n--- status distribution ---');
  const statusRows = await q(`SELECT status::text AS s, count(*)::int AS n FROM listings GROUP BY 1`);
  const gotStatus = Object.fromEntries(statusRows.map((r) => [r.s, r.n]));
  for (const [s, expected] of Object.entries(CENSUS.status)) cmp(`status=${s}`, gotStatus[s] || 0, expected);

  console.log('\n--- per-source counts ---');
  const srcRows = await q(`SELECT source, count(*)::int AS n FROM listings GROUP BY 1`);
  const gotSrc = Object.fromEntries(srcRows.map((r) => [r.source, r.n]));
  for (const [s, expected] of Object.entries(CENSUS.perSource)) cmp(`source=${s}`, gotSrc[s] || 0, expected);
  for (const s of Object.keys(gotSrc)) {
    if (!(s in CENSUS.perSource)) warn(`source=${s} present in Postgres but not in the census (${gotSrc[s]} rows)`);
  }

  console.log('\n=== 2. PARITY — Postgres vs exported JSONL ===');
  const files = { listings: 'listings.jsonl', listings_raw: 'listings_raw.jsonl',
    price_stats: 'price_stats.jsonl', alerts: 'alerts.jsonl', email_sends: 'email_sends.jsonl',
    tool_scans: 'tool_scans.jsonl', training_examples: 'training_examples.jsonl' };
  for (const [table, f] of Object.entries(files)) {
    if (table === 'listings_raw' && rawDeferred) continue;
    const lines = await countLines(path.join(DATA, f));
    if (lines === null) { warn(`${table}: no export file on disk`); continue; }
    const r = await one(`SELECT count(*)::int AS n FROM ${table}`);
    if (r.n === lines) ok(`${table}: ${r.n} rows == ${lines} exported`);
    else bad(`${table}: ${r.n} rows in Postgres vs ${lines} exported (delta ${r.n - lines})`);
  }

  console.log('\n=== 3. FIDELITY — field-level diff on 200 sampled listings ===');
  const total = await countLines(path.join(DATA, 'listings.jsonl'));
  const N = Math.min(200, total || 0);
  const picks = new Set();
  while (picks.size < N) picks.add(Math.floor(Math.random() * total));
  const sampled = await readLines(path.join(DATA, 'listings.jsonl'), [...picks]);

  const FIELDS = ['source_url','title_raw','description_raw','price_cents','currency',
    'condition_raw','images','tags','location_state','location_display','heuristic_brand',
    'heuristic_type','canonical_brand','canonical_type','canonical_model','canonical_size',
    'era_estimate','plane_type_number','normalizer_model','status','excluded_reason'];
  const TIMES = ['posted_at','scraped_at','first_seen_at','last_seen_at','sold_at',
    'normalized_at','last_post_at'];

  let checked = 0, mismatches = [];
  for (const doc of sampled.values()) {
    const row = await one(
      `SELECT * FROM listings WHERE source = $1 AND source_id = $2`,
      [doc.source, doc.source_id]
    );
    if (!row) { mismatches.push(`${doc._id}: MISSING from Postgres`); continue; }
    checked++;
    for (const f of FIELDS) {
      const want = doc[f] === undefined ? null : doc[f];
      let got = row[f];
      // Firestore stores these as absent/null interchangeably; both mean "no value".
      if (Array.isArray(want) && got == null) got = [];
      if (!eq(got, want)) {
        mismatches.push(`${doc._id}.${f}: pg=${JSON.stringify(norm(got))?.slice(0,60)} json=${JSON.stringify(want)?.slice(0,60)}`);
      }
    }
    for (const f of TIMES) {
      const want = doc[f] ? new Date(doc[f]).getTime() : null;
      const got = row[f] ? new Date(row[f]).getTime() : null;
      if (want !== got) mismatches.push(`${doc._id}.${f}: pg=${row[f]} json=${doc[f]}`);
    }
  }
  if (mismatches.length === 0) ok(`${checked} listings match on ${FIELDS.length + TIMES.length} fields each`);
  else {
    bad(`${mismatches.length} field mismatches across ${checked} sampled listings`);
    mismatches.slice(0, 25).forEach((m) => console.log(`        ${m}`));
    if (mismatches.length > 25) console.log(`        … and ${mismatches.length - 25} more`);
  }

  console.log('\n=== 4. INTEGRITY ===');
  const orphan = await one(`SELECT count(*)::int AS n FROM listings l LEFT JOIN sources s ON s.id = l.source WHERE s.id IS NULL`);
  cmp('listings with an unregistered source', orphan.n, 0);
  const nullv = await one(`SELECT count(*)::int AS n FROM listings WHERE search_vector IS NULL`);
  cmp('listings with a NULL search_vector', nullv.n, 0);
  if (!rawDeferred) {
    const rawOrphan = await one(`SELECT count(*)::int AS n FROM listings_raw r LEFT JOIN listings l ON l.id = r.listing_id WHERE l.id IS NULL`);
    cmp('orphaned listings_raw rows', rawOrphan.n, 0);
  }
  const badAlerts = await q(`SELECT email FROM alerts WHERE email LIKE 'UNRESOLVED:%'`);
  if (badAlerts.length) badAlerts.forEach((a) => warn(`alert email unresolved: ${a.email}`));
  else ok('all alert emails resolved');

  console.log('\n=== 5. SEARCH SMOKE TEST ===');
  for (const term of ['stanley 112', 'lie nielsen', 'bedrock 605', 'infill smoother']) {
    const r = await one(
      `SELECT count(*)::int AS n FROM listings
       WHERE status = 'active' AND search_vector @@ plainto_tsquery('english', $1)`, [term]);
    const t = await one(
      `SELECT count(*)::int AS n FROM listings
       WHERE status = 'active' AND title_raw ILIKE '%' || $1 || '%'`, [term]);
    console.log(`  "${term}": tsvector=${r.n}  ilike=${t.n}`);
  }

  console.log('\n=== 6. PER-SOURCE FRESHNESS (needed a composite index Firestore never had) ===');
  const fresh = await q(`
    SELECT source, count(*)::int AS rows, max(last_seen_at) AS last_seen,
           (now()::date - max(last_seen_at)::date) AS days_stale
    FROM listings GROUP BY 1 ORDER BY 4`);
  console.log('  source                 rows   last seen             days stale');
  for (const r of fresh) {
    const flag = r.days_stale > 7 ? '  <-- STALE' : '';
    console.log(`  ${r.source.padEnd(22)}${String(r.rows).padStart(6)}   ${new Date(r.last_seen).toISOString().slice(0,16).replace('T',' ')}   ${String(r.days_stale).padStart(5)}${flag}`);
  }

  console.log('\n=== 7. CANONICAL VOCABULARY DRIFT ===');
  const drift = await q(`
    SELECT canonical_type, count(*)::int AS n FROM listings
    WHERE canonical_type IS NOT NULL GROUP BY 1 ORDER BY 2 DESC`);
  console.log(`  ${drift.length} distinct canonical_type values`);
  // Collapse to a comparison key to expose near-duplicate labels.
  const byKey = {};
  for (const d of drift) {
    const k = d.canonical_type.toLowerCase().replace(/[^a-z]/g, '');
    (byKey[k] = byKey[k] || []).push(d);
  }
  const dupes = Object.values(byKey).filter((g) => g.length > 1);
  if (!dupes.length) ok('no near-duplicate canonical_type labels');
  else {
    for (const g of dupes) warn(`same type under ${g.length} labels: ${g.map((x) => `"${x.canonical_type}" (${x.n})`).join(' vs ')}`);
  }

  console.log('\n=== 8. STORAGE ===');
  const sizes = await q(`
    SELECT relname AS table, pg_size_pretty(pg_total_relation_size(c.oid)) AS total
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC`);
  sizes.forEach((s) => console.log(`  ${s.table.padEnd(22)}${s.total}`));
  const db = await one(`SELECT pg_size_pretty(pg_database_size(current_database())) AS s`);
  console.log(`  ${'TOTAL'.padEnd(22)}${db.s}`);

  console.log(`\n${failures === 0 ? '\x1b[32mAll checks passed.\x1b[0m' : `\x1b[31m${failures} check(s) failed.\x1b[0m`}\n`);
  await client.end();
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('\nFATAL', e); process.exit(1); });
