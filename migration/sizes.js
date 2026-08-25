const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
  await c.connect();
  const q = async (s) => (await c.query(s)).rows;
  const rows = await q(`
    SELECT c.relname,
           pg_size_pretty(pg_total_relation_size(c.oid)) AS sz,
           pg_total_relation_size(c.oid) AS b
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY b DESC`);
  console.log('  table                total size');
  for (const r of rows) console.log(`  ${r.relname.padEnd(20)}${r.sz}`);
  const counts = {};
  for (const r of rows) {
    try { counts[r.relname] = (await q(`SELECT count(*)::int n FROM ${r.relname}`))[0].n; } catch {}
  }
  console.log('\n  rows:', JSON.stringify(counts));
  const d = await q(`SELECT pg_size_pretty(pg_database_size(current_database())) s,
                            pg_database_size(current_database()) b`);
  console.log(`\n  DATABASE TOTAL: ${d[0].s}  (${Math.round(d[0].b/1048576)} MB of 512 MB limit)`);
  await c.end();
})().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
