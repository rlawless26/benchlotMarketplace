#!/usr/bin/env node
/**
 * Issue (or revoke) an API key for the public data layer (schema/014).
 *
 *   node scripts/api-key-issue.js --name "Acme agent" --email dev@acme.com [--limit 120] [--note "..."]
 *   node scripts/api-key-issue.js --revoke bl_live_3f9a   # by prefix
 *   node scripts/api-key-issue.js --list
 *
 * The key is printed ONCE. Only its sha256 is stored (web/lib/api/keys.ts
 * uses the same scheme), so a lost key is replaced, not recovered.
 */
const path = require('path');
const { randomBytes, createHash } = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', 'web', '.env.local') });
const { Pool } = require(path.join(__dirname, '..', 'web', 'node_modules', 'pg'));

const argv = process.argv.slice(2);
const arg = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const DB = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!DB) { console.error('DATABASE_URL is not set'); process.exit(1); }

(async () => {
  const pool = new Pool({ connectionString: DB, max: 1 });
  try {
    if (argv.includes('--list')) {
      const { rows } = await pool.query(
        `SELECT key_prefix, name, email, rate_limit_per_min, created_at::date AS created, last_used_at::date AS last_used, revoked_at::date AS revoked
           FROM api_keys ORDER BY created_at DESC`);
      console.table(rows);
      return;
    }
    const revoke = arg('--revoke');
    if (revoke) {
      const r = await pool.query(`UPDATE api_keys SET revoked_at = now() WHERE key_prefix = $1 AND revoked_at IS NULL`, [revoke]);
      console.log(`${r.rowCount} key(s) revoked`);
      return;
    }
    const name = arg('--name'), email = arg('--email');
    if (!name || !email) { console.error('usage: --name "Client" --email a@b.c [--limit 120]'); process.exit(1); }
    const key = `bl_live_${randomBytes(16).toString('hex')}`;
    const hash = createHash('sha256').update(key).digest('hex');
    const prefix = key.slice(0, 12);
    await pool.query(
      `INSERT INTO api_keys (key_prefix, key_hash, name, email, rate_limit_per_min, note) VALUES ($1,$2,$3,$4,$5,$6)`,
      [prefix, hash, name, email, Number(arg('--limit') || 120), arg('--note')]
    );
    console.log(`\n  ${key}\n\nissued to ${name} <${email}>. This is the only time it is shown.`);
  } finally {
    await pool.end();
  }
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
