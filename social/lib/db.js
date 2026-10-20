/**
 * Postgres access. Mirrors web/lib/db.ts: node-postgres over the POOLED Neon
 * URL, lazily constructed, small pool. The pipeline is a short-lived CLI, so
 * callers end the pool explicitly (see cli.js) rather than leaking a handle
 * that keeps the process alive.
 */
require('./env');
const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set (see social/README.md)');
  pool = new Pool({ connectionString, max: 4, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 30_000 });
  return pool;
}

async function sql(text, params = []) {
  const res = await getPool().query(text, params);
  return res.rows;
}

async function end() {
  if (pool) await pool.end();
  pool = null;
}

module.exports = { sql, end, getPool };
