/**
 * API keys (schema/014). Free, optional, revocable. The key is shown once at
 * issue time; only its sha256 is stored. scripts/api-key-issue.js uses the
 * same scheme from the command line.
 */
import { createHash, randomBytes } from 'crypto';
import { sql } from '@/lib/db';

export const KEY_PREFIX = 'bl_live_';

export type ApiKey = {
  id: string;
  name: string;
  rateLimitPerMin: number;
};

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function looksLikeKey(v: string): boolean {
  return /^bl_live_[0-9a-f]{32}$/.test(v);
}

export async function lookupKey(presented: string): Promise<ApiKey | null> {
  if (!looksLikeKey(presented)) return null;
  const rows = await sql<{ id: string; name: string; rate_limit_per_min: number }>(
    `SELECT id, name, rate_limit_per_min FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL`,
    [hashKey(presented)]
  );
  const r = rows[0];
  return r ? { id: r.id, name: r.name, rateLimitPerMin: r.rate_limit_per_min } : null;
}

export async function touchKey(id: string): Promise<void> {
  await sql(`UPDATE api_keys SET last_used_at = now() WHERE id = $1`, [id]);
}

export async function issueKey(input: {
  name: string; email: string; ip?: string | null; limit?: number; note?: string | null;
}): Promise<{ key: string; prefix: string }> {
  const key = `${KEY_PREFIX}${randomBytes(16).toString('hex')}`;
  const prefix = key.slice(0, 12);
  await sql(
    `INSERT INTO api_keys (key_prefix, key_hash, name, email, rate_limit_per_min, created_ip, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [prefix, hashKey(key), input.name, input.email.trim().toLowerCase(), input.limit ?? 120, input.ip ?? null, input.note ?? null]
  );
  return { key, prefix };
}

/** Self-serve issuance is capped per address and per IP per day (schema/014). */
export async function keyIssueRateLimited(ip: string | null, email: string): Promise<boolean> {
  const rows = await sql<{ n: string }>(
    `SELECT count(*)::text AS n FROM api_keys
      WHERE created_at > now() - interval '1 day'
        AND (lower(email) = $1 OR ($2::text IS NOT NULL AND created_ip = $2))`,
    [email.trim().toLowerCase(), ip]
  );
  return Number(rows[0]?.n ?? 0) >= 3;
}
