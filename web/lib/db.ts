/**
 * Postgres access for the Benchlot price guide.
 *
 * node-postgres over a POOLED Neon connection: this runs per-request on Vercel
 * Fluid compute, which is the case Neon's pooler exists for. (The migration
 * scripts deliberately use the UNPOOLED URL instead -- COPY, DDL and session
 * state break through PgBouncer's transaction mode.)
 *
 * Lazily constructed: Next evaluates module top-level code at build time, and a
 * Pool built there would throw before env vars are wired on a first deploy.
 * Deliberately NOT a Proxy wrapper -- those break libraries that introspect the
 * client object.
 */
import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  // Lets Fluid compute drain in-flight queries instead of killing the sandbox
  // mid-request. No-op outside Vercel.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { attachDatabasePool } = require('@vercel/functions');
    attachDatabasePool(pool);
  } catch {
    /* not on Vercel, or the helper is unavailable -- safe to ignore */
  }

  return pool;
}

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}
