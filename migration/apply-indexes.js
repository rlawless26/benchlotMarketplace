/**
 * Applies schema/002_indexes.sql statement-by-statement so a quota failure
 * names the exact index that ran out of room instead of aborting the file.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL });
  await c.connect();
  const sql = fs.readFileSync(path.join(__dirname, 'schema', '002_indexes.sql'), 'utf8');
  const stmts = sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  let failed = 0;
  for (const s of stmts) {
    const name = (s.match(/CREATE INDEX (\w+)/) || s.match(/^(ANALYZE \w+)/) || [, s.slice(0, 40)])[1];
    const t0 = Date.now();
    try {
      await c.query(s);
      const size = (await c.query(
        `SELECT pg_size_pretty(pg_database_size(current_database())) s`)).rows[0].s;
      console.log(`  ok    ${name.padEnd(34)} ${((Date.now() - t0) / 1000).toFixed(1)}s   db=${size}`);
    } catch (e) {
      failed++;
      console.log(`  FAIL  ${name.padEnd(34)} ${e.message}`);
    }
  }
  const d = (await c.query(`SELECT pg_size_pretty(pg_database_size(current_database())) s`)).rows[0].s;
  console.log(`\n  ${failed} failed. database: ${d} of 512 MB`);
  await c.end();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
