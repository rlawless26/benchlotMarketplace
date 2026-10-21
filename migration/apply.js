#!/usr/bin/env node
/**
 * Apply one schema file.
 *
 *   node migration/apply.js schema/013_normalizer_batches.sql
 *
 * Connection: DATABASE_URL_UNPOOLED if set, else DATABASE_URL, else the
 * DATABASE_URL line in web/.env.local with Neon's `-pooler` host suffix
 * removed (DDL and VACUUM want a direct connection; the pooled host also
 * works for plain DDL but not for everything the schema files do).
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function connectionString() {
  if (process.env.DATABASE_URL_UNPOOLED) return process.env.DATABASE_URL_UNPOOLED;
  let url = process.env.DATABASE_URL;
  if (!url) {
    const env = fs.readFileSync(path.join(__dirname, '..', 'web', '.env.local'), 'utf8');
    const m = env.match(/^DATABASE_URL=(.*)$/m);
    if (!m) throw new Error('No DATABASE_URL found');
    url = m[1].trim().replace(/^"|"$/g, '');
  }
  return url.replace('-pooler.', '.');
}

(async () => {
  const file = process.argv[2];
  if (!file) { console.error('usage: node migration/apply.js schema/NNN_name.sql'); process.exit(1); }
  const sql = fs.readFileSync(path.resolve(__dirname, file), 'utf8');
  const c = new Client({ connectionString: connectionString(), ssl: { rejectUnauthorized: false } });
  await c.connect();
  console.log(`connected to ${c.connectionParameters.host}; applying ${file}`);
  const t0 = Date.now();
  await c.query(sql);
  console.log(`done in ${Date.now() - t0} ms`);
  await c.end();
})().catch((e) => { console.error('failed:', e.message); process.exit(1); });
