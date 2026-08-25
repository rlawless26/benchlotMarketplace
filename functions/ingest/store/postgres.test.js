/**
 * Behavioural test for the Postgres ingest store, run against the real
 * database using a throwaway source_id. Verifies the semantics that differ
 * from the Firestore layer and would corrupt data if they regressed.
 *
 *   node ingest/store/postgres.test.js
 */
const store = require('./postgres');
const { Pool } = require('pg');

// A DEDICATED source row, not a real one. markExpired operates on an entire
// source, so pointing this test at 'jimbode' would flip every active Jim Bode
// listing to sold. The row is created and dropped by the test.
const SOURCE = '__store_test__';
const SID = 'fixture-' + Date.now();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
});

let failures = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${label}` +
    (ok ? `  (${JSON.stringify(actual)})` : `  got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`));
};

const rec = (over = {}) => ({
  raw_format: 'shopify_product',
  raw: { test: true },
  listing: {
    source: SOURCE, source_id: SID,
    source_url: 'https://example.com/x',
    title_raw: 'Stanley No. 5 Jack Plane',
    description_raw: 'test',
    price_cents: 12500, currency: 'USD', condition_raw: null,
    images: ['https://example.com/a.jpg'], posted_at: null,
    tags: ['t1'], location_state: 'NY', location_display: null,
    heuristic_brand: 'Stanley', heuristic_type: 'Bench Plane',
    // Scrapers emit these as null on EVERY run — the behaviour that would
    // wipe normalization if the store copied Firestore's merge semantics.
    canonical_brand: null, canonical_type: null, canonical_model: null,
    canonical_size: null, era_estimate: null,
    ...over,
  },
});

const row = async () =>
  (await pool.query(
    `SELECT price_cents, status::text, canonical_brand, canonical_type, sold_at,
            first_seen_at, last_seen_at
       FROM listings WHERE source=$1 AND source_id=$2`, [SOURCE, SID])).rows[0];
const snaps = async () =>
  (await pool.query(
    `SELECT count(*)::int n FROM price_snapshots WHERE source=$1 AND source_id=$2`,
    [SOURCE, SID])).rows[0].n;

(async () => {
  await pool.query(
    `INSERT INTO sources (id, name, short_name, kind, indexed)
     VALUES ($1, 'Store Test', 'Test', 'Dealer', false)
     ON CONFLICT (id) DO NOTHING`, [SOURCE]);

  const t1 = new Date('2026-08-25T10:00:00Z');
  const t2 = new Date('2026-08-25T11:00:00Z');
  const t3 = new Date('2026-08-25T12:00:00Z');
  const t4 = new Date('2026-08-25T13:00:00Z');

  console.log('\n1. first upsert inserts and snapshots');
  let r = await store.upsertListings([rec()], t1);
  check('inserted', r.inserted, 1);
  check('updated', r.updated, 0);
  check('snapshot written', r.snapshots_written, 1);

  console.log('\n2. re-upsert with SAME price writes no new snapshot');
  r = await store.upsertListings([rec()], t2);
  check('updated', r.updated, 1);
  check('inserted', r.inserted, 0);
  check('no new snapshot', r.snapshots_written, 0);
  check('snapshot total still 1', await snaps(), 1);

  console.log('\n3. price change writes a snapshot');
  r = await store.upsertListings([rec({ price_cents: 9900 })], t3);
  check('snapshot written', r.snapshots_written, 1);
  check('price updated', (await row()).price_cents, 9900);

  console.log('\n4. first_seen_at is never updated');
  check('first_seen_at still t1', (await row()).first_seen_at.toISOString(), t1.toISOString());
  check('last_seen_at advanced to t3', (await row()).last_seen_at.toISOString(), t3.toISOString());

  console.log('\n5. CRITICAL: a scraper NULL must not wipe normalization');
  await pool.query(
    `UPDATE listings SET canonical_brand='Stanley', canonical_type='Bench Plane'
      WHERE source=$1 AND source_id=$2`, [SOURCE, SID]);
  await store.upsertListings([rec()], t4);   // emits canonical_* : null
  const after = await row();
  check('canonical_brand preserved', after.canonical_brand, 'Stanley');
  check('canonical_type preserved', after.canonical_type, 'Bench Plane');

  console.log('\n6. markExpired flips stale actives to sold');
  const later = new Date('2026-08-26T00:00:00Z');
  const m = await store.markExpired(SOURCE, later);
  const sold = await row();
  check('this row is now sold', sold.status, 'sold');
  check('sold_at set', sold.sold_at.toISOString(), later.toISOString());
  console.log(`  (markExpired touched ${m.expired} rows for source=${SOURCE})`);

  console.log('\n7. sold_at survives a later re-scrape that omits it');
  await store.upsertListings([rec()], new Date('2026-08-26T01:00:00Z'));
  check('sold_at preserved', (await row()).sold_at.toISOString(), later.toISOString());

  // Cleanup.
  await pool.query(`DELETE FROM price_snapshots WHERE source=$1`, [SOURCE]);
  await pool.query(`DELETE FROM listings WHERE source=$1`, [SOURCE]);
  await pool.query(`DELETE FROM sources WHERE id=$1`, [SOURCE]);
  console.log('\ncleaned up test rows');
  console.log(failures === 0 ? '\n\x1b[32mAll store checks passed.\x1b[0m\n'
                             : `\n\x1b[31m${failures} check(s) failed.\x1b[0m\n`);
  await pool.end(); await store.close();
  process.exit(failures ? 1 : 0);
})().catch(async (e) => { console.error('FATAL', e.message); process.exit(1); });
