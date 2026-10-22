/**
 * Per-request plumbing shared by the REST routes and the MCP tools:
 * authentication (optional key), the rate limit, and the usage log.
 *
 * The limiter is a Postgres count, like scanRateLimited and leadRateLimited:
 * Fluid compute runs many sandboxes at once, so an in-memory window would be
 * per-sandbox and effectively unenforced. One round trip does both the count
 * and the log INSERT; the status and latency are patched in after the
 * response is sent (`after` from next/server), as is the PostHog event.
 *
 * Distinct ids: `agent:<key-id>` for keyed callers, `anon:<ip-hash>` for the
 * rest. Anonymous hashes are marked $process_person_profile:false so they do
 * not mint PostHog persons.
 */
import { createHash } from 'crypto';
import { after } from 'next/server';
import { sql } from '@/lib/db';
import { captureServer } from '@/lib/posthog-server';
import { clientIp } from '@/lib/toolscan';
import { lookupKey, touchKey, type ApiKey } from './keys';

export type Surface = 'rest' | 'mcp';

export type ApiContext = {
  key: ApiKey | null;
  ip: string | null;
  ipHash: string | null;
  distinctId: string;
  surface: Surface;
  route: string;
  userAgent: string | null;
  limit: number;
  remaining: number;
  requestId: string | null;
  startedAt: number;
};

export type Begin =
  | { kind: 'ok'; ctx: ApiContext }
  | { kind: 'unauthorized'; ctx: ApiContext; message: string }
  | { kind: 'limited'; ctx: ApiContext };

const ANON_LIMIT = Number(process.env.API_ANON_LIMIT_PER_MIN || 30);

function ipHash(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.API_IP_SALT;
  if (!salt) console.warn('[api] API_IP_SALT is not set; ip hashes use a fixed salt');
  return createHash('sha256').update(`${salt || 'benchlot-api'}:${ip}`).digest('hex').slice(0, 32);
}

/** Bearer, X-Api-Key, or ?api_key= — in that order. */
export function presentedKey(headers: Headers, url?: URL | null): string | null {
  const auth = headers.get('authorization');
  if (auth && /^bearer\s+/i.test(auth)) return auth.replace(/^bearer\s+/i, '').trim();
  const x = headers.get('x-api-key');
  if (x) return x.trim();
  const q = url?.searchParams.get('api_key');
  return q ? q.trim() : null;
}

/**
 * Authenticate, count, log. `auth: 'required'` turns a missing key into a
 * 401 before any work is done. A presented-but-unknown key is always a 401:
 * silently downgrading it to anonymous would hide a revoked key from its owner.
 */
export async function beginRequest(
  req: { headers: Headers; url?: string },
  surface: Surface,
  route: string,
  opts: { auth?: 'optional' | 'required' } = {}
): Promise<Begin> {
  const url = req.url ? new URL(req.url) : null;
  const ip = clientIp(req.headers);
  const presented = presentedKey(req.headers, url);
  const key = presented ? await lookupKey(presented) : null;
  const hash = ipHash(ip);
  const base: ApiContext = {
    key, ip, ipHash: hash,
    distinctId: key ? `agent:${key.id}` : `anon:${hash ?? 'unknown'}`,
    surface, route,
    userAgent: req.headers.get('user-agent')?.slice(0, 200) ?? null,
    limit: key ? key.rateLimitPerMin : ANON_LIMIT,
    remaining: 0,
    requestId: null,
    startedAt: Date.now(),
  };

  if (presented && !key) {
    return { kind: 'unauthorized', ctx: base, message: 'Unknown or revoked API key.' };
  }
  if (opts.auth === 'required' && !key) {
    return { kind: 'unauthorized', ctx: base, message: 'This endpoint needs an API key. Get a free one at ' + (process.env.NEXT_PUBLIC_SITE_URL || 'https://benchlot.com') + '/developers.' };
  }

  let n = 0;
  try {
    const rows = await sql<{ n: number; id: string }>(
      `WITH recent AS (
         SELECT count(*)::int AS n FROM api_requests
          WHERE created_at > now() - interval '1 minute'
            AND CASE WHEN $1::uuid IS NOT NULL THEN key_id = $1::uuid ELSE key_id IS NULL AND ip_hash = $2 END
       ),
       ins AS (
         INSERT INTO api_requests (key_id, ip_hash, surface, route, user_agent)
         VALUES ($1::uuid, $2, $3, $4, $5) RETURNING id::text
       )
       SELECT recent.n, ins.id FROM recent, ins`,
      [key?.id ?? null, hash, surface, route, base.userAgent]
    );
    n = rows[0]?.n ?? 0;
    base.requestId = rows[0]?.id ?? null;
  } catch (e) {
    // The limiter must never take the API down with it.
    console.error('[api] rate-limit query failed:', e instanceof Error ? e.message : e);
  }
  base.remaining = Math.max(0, base.limit - n - 1);
  if (key) after(() => touchKey(key.id).catch(() => {}));
  if (n >= base.limit) return { kind: 'limited', ctx: base };
  return { kind: 'ok', ctx: base };
}

/** Patch the log row and emit the PostHog event once the response is out. */
export function finishRequest(ctx: ApiContext, status: number, props: Record<string, unknown> = {}): void {
  const ms = Date.now() - ctx.startedAt;
  const work = async () => {
    if (ctx.requestId) {
      await sql(`UPDATE api_requests SET status = $2, ms = $3 WHERE id = $1`, [ctx.requestId, status, ms]).catch(() => {});
    }
    await captureServer(ctx.distinctId, 'api_request', {
      surface: ctx.surface,
      route: ctx.route,
      key_id: ctx.key?.id ?? null,
      key_name: ctx.key?.name ?? null,
      status, ms,
      user_agent: ctx.userAgent,
      $process_person_profile: !!ctx.key,
      ...props,
    });
  };
  try {
    after(work);
  } catch {
    // Outside a request scope (tests): fire and forget.
    void work();
  }
}

export function rateLimitHeaders(ctx: ApiContext): Record<string, string> {
  return { 'X-RateLimit-Limit': String(ctx.limit), 'X-RateLimit-Remaining': String(ctx.remaining) };
}
