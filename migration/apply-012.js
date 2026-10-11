#!/usr/bin/env node
/**
 * One-off for schema/012 (2026-10-10): load expire_stale_listings(), undo the
 * oldtools false-sold sweep, expire stale actives, rebuild price stats.
 *
 *   node migration/apply-012.js            # dry run: shows what WOULD expire
 *   node migration/apply-012.js --apply    # does it
 *
 * Connection: DATABASE_URL_UNPOOLED if set, else DATABASE_URL, else the
 * DATABASE_URL line in web/.env.local. The nightly ingest workflow runs the
 * expiry and the rebuild on its own after this; only the function load and
 * the oldtools repair are truly one-off.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function connectionString() {
  if (process.env.DATABASE_URL_UNPOOLED) return process.env.DATABASE_URL_UNPOOLED;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = fs.readFileSync(path.join(__dirname, '..', 'web', '.env.local'), 'utf8');
  const m = env.match(/^DATABASE_URL=(.*)$/m);
  if (!m) throw new Error('No DATABASE_URL found');
  return m[1].trim().replace(/^"|"$/g, '');
}

const OLDTOOLS_BAD_STAMP = '2026-10-08T09:28:12.062Z';

(async () => {
  const apply = process.argv.includes('--apply');
  const c = new Client({ connectionString: connectionString(), ssl: { rejectUnauthorized: false } });
  await c.connect();
  const host = c.connectionParameters.host;
  console.log(`connected to ${host}${apply ? '' : '  (DRY RUN — pass --apply to change anything)'}`);

  const { rows: before } = await c.query(
    `SELECT source, count(*)::int AS active FROM listings WHERE status = 'active' GROUP BY 1 ORDER BY 1`
  );
  const { rows: bad } = await c.query(
    `SELECT count(*)::int AS n FROM listings WHERE source = 'oldtools' AND status = 'sold' AND sold_at = $1`,
    [OLDTOOLS_BAD_STAMP]
  );
  console.log(`\noldtools rows wrongly marked sold on 2026-10-08: ${bad[0].n}`);

  if (!apply) {
    const { rows } = await c.query(`
      SELECT l.source,
             count(*) FILTER (WHERE l.last_seen_at < now() - CASE
               WHEN l.source = 'ebay' THEN interval '30 days'
               WHEN s.kind = 'Marketplace' THEN interval '14 days'
               WHEN s.kind = 'Dealer' THEN interval '45 days'
               ELSE interval '60 days' END)::int AS would_expire,
             count(*)::int AS active
      FROM listings l JOIN sources s ON s.id = l.source
      WHERE l.status = 'active' GROUP BY 1 ORDER BY 1`);
    console.log('\nwhat --apply would expire:');
    console.table(rows.filter((r) => r.would_expire > 0));
    await c.end();
    return;
  }

  console.log('\n1. loading schema/012 (expire_stale_listings)…');
  await c.query(fs.readFileSync(path.join(__dirname, 'schema', '012_expire_stale.sql'), 'utf8'));

  console.log('2. restoring the oldtools rows…');
  const rep = await c.query(
    `UPDATE listings SET status = 'active', sold_at = NULL
      WHERE source = 'oldtools' AND status = 'sold' AND sold_at = $1`,
    [OLDTOOLS_BAD_STAMP]
  );
  console.log(`   restored ${rep.rowCount}`);

  console.log('3. expiring stale actives…');
  const t0 = Date.now();
  const ex = await c.query('SELECT * FROM expire_stale_listings()');
  console.table(ex.rows.filter((r) => Number(r.expired) > 0).map((r) => ({ source: r.source, expired: Number(r.expired) })));
  console.log(`   ${Date.now() - t0} ms`);

  console.log('4. rebuilding price stats…');
  const t1 = Date.now();
  const rb = await c.query('SELECT * FROM rebuild_price_stats()');
  console.log('  ', JSON.stringify(rb.rows[0]), `${Date.now() - t1} ms`);

  const { rows: after } = await c.query(
    `SELECT source, count(*)::int AS active FROM listings WHERE status = 'active' GROUP BY 1 ORDER BY 1`
  );
  const was = Object.fromEntries(before.map((r) => [r.source, r.active]));
  console.log('\nactive rows per source, before → after:');
  console.table(after.map((r) => ({ source: r.source, before: was[r.source] ?? 0, after: r.active })));
  await c.end();
})().catch((e) => { console.error('failed:', e.message); process.exit(1); });
