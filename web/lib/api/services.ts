/**
 * The write operations, as plain functions. The REST routes and the MCP
 * tools both call these; neither goes through HTTP to reach the other.
 */
import { sql } from '@/lib/db';
import { runScan, scanReference, scanActiveListings, TOOLSCAN_MODEL } from '@/lib/toolscan';
import { createAlert } from '@/lib/alerts';
import { sendEmail, confirmEmail } from '@/lib/email';
import { captureServer } from '@/lib/posthog-server';
import { SITE_URL } from '@/lib/site';
import { resolveTypeName, resolveBrandName, typeSuggestions } from './resolve';
import type { ApiContext } from './request';
import type { ApiError } from './envelope';
import type { IdentifyBody, AlertBody } from './schemas';

export type ServiceResult<T> =
  | { ok: true; data: T; meta?: Record<string, unknown> }
  | { ok: false; status: number; error: ApiError; meta?: Record<string, unknown> };

// 3 MB of base64 is ~2.2 MB of image, comfortably under Vercel's 4.5 MB body
// cap once the JSON wrapper is added. The scan page downscales client-side;
// an agent has to do the same (see /developers).
export const IDENTIFY_MAX_BASE64 = 3 * 1024 * 1024;

export type IdentifyResult = {
  scan_id: string;
  tool: Awaited<ReturnType<typeof runScan>> extends infer R ? (R extends { status: 200; results: { tool: infer T } } ? T : never) : never;
  notes: string | null;
  reference: { band: { low: string; high: string }; based_on: 'sold' | 'asking'; count: number; guide_url: string } | null;
  active_listings: Awaited<ReturnType<typeof scanActiveListings>>;
};

// Anonymous callers (ChatGPT's connector portal has no API-key option) get a
// quarter of the keyed scan allowance per IP hash; a key restores the full 20.
const ANON_SCANS_PER_WINDOW = 5;

async function anonScanLimited(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  const rows = await sql<{ n: number }>(
    `SELECT count(*)::int AS n FROM tool_scans WHERE created_at > now() - interval '15 minutes' AND created_ip = $1`,
    [ip]
  );
  return (rows[0]?.n ?? 0) >= ANON_SCANS_PER_WINDOW;
}

export async function identify(body: IdentifyBody, ctx: ApiContext): Promise<ServiceResult<IdentifyResult>> {
  if (!ctx.key && (await anonScanLimited(ctx.ip))) {
    return { ok: false, status: 429, error: { code: 'scan_rate_limited', message: `Anonymous callers get ${ANON_SCANS_PER_WINDOW} scans per 15 minutes. A free API key raises it to 20: see ${SITE_URL}/developers.` } };
  }
  const total = body.images.reduce((n, i) => n + i.data.length, 0);
  if (total > IDENTIFY_MAX_BASE64) {
    return { ok: false, status: 413, error: { code: 'payload_too_large', message: 'Images total more than 3 MB of base64. Downscale to about 1600px on the long edge.' } };
  }
  // A directory listing (Claude's, ChatGPT's) sends one shared key for every
  // user behind it. The scan limiter counts by distinct id, so key the bucket
  // by key + caller IP hash instead of the key alone; otherwise 20 scans per
  // 15 minutes would be the cap for the whole directory audience.
  const scanIdentity = ctx.key && ctx.ipHash ? `${ctx.distinctId}:${ctx.ipHash.slice(0, 12)}` : ctx.distinctId;
  const out = await runScan({
    images: body.images, context: body.context, previous_scan_id: body.previous_scan_id,
    distinct_id: scanIdentity, ip: ctx.ip,
  });
  if (out.status !== 200) {
    const code = out.status === 429 ? 'scan_rate_limited' : out.status === 400 ? 'invalid_parameter' : 'scan_failed';
    return { ok: false, status: out.status, error: { code, message: out.error } };
  }
  const tool = out.results.tool;
  const [reference, activeListings] = tool
    ? await Promise.all([scanReference(tool).catch(() => null), scanActiveListings(tool, 6).catch(() => [])])
    : [null, []];
  return {
    ok: true,
    data: {
      scan_id: out.scanId,
      tool: tool as IdentifyResult['tool'],
      notes: out.results.general_notes ?? null,
      reference: reference
        ? { band: { low: reference.low, high: reference.high }, based_on: reference.source, count: reference.count, guide_url: `${SITE_URL}${reference.guidePath}` }
        : null,
      active_listings: activeListings,
    },
    meta: {
      model: TOOLSCAN_MODEL,
      note: 'The identification is the model\'s reading of the photos; `tool.confidence` and `tool.confidence_reasoning` are its own assessment. Add photos with `previous_scan_id` when it asks (`next_photo_hint`).',
    },
  };
}

export const ALERT_PENDING = { status: 'pending_confirmation' as const, message: 'Check your email to confirm the alert.' };

/**
 * Same contract as /api/alerts: the answer is identical whatever happened
 * (created, re-sent, already confirmed, capped), so the endpoint cannot be
 * used to learn which addresses have alerts. The truthful status goes to
 * PostHog. The address still has to click the confirmation email.
 */
export async function requestAlert(body: AlertBody, ctx: ApiContext): Promise<ServiceResult<typeof ALERT_PENDING>> {
  const type = resolveTypeName(body.type);
  if (!type) {
    return {
      ok: false, status: 400,
      error: { code: 'unknown_type', message: `"${body.type}" is not a tool type Benchlot tracks. See /api/v1/types.`, field: 'type' },
      meta: { suggestions: typeSuggestions(body.type) },
    };
  }
  const brand = await resolveBrandName(body.brand);
  const size = body.size ?? null;
  const email = body.email.trim().toLowerCase();
  const maxPriceCents = body.max_price === undefined ? null : Math.round(body.max_price * 100);

  const result = await createAlert({
    email, canonical_type: type, canonical_brand: brand.name, canonical_size: size, max_price_cents: maxPriceCents,
    attribution: { posthog_distinct_id: ctx.distinctId, surface: ctx.surface === 'mcp' ? 'mcp' : 'api', placement: ctx.key?.name ?? null },
  });
  await captureServer(ctx.distinctId, 'alert_requested', {
    status: result.status, surface: ctx.surface === 'mcp' ? 'mcp' : 'api', placement: ctx.key?.name ?? null, variant: null,
    canonical_type: type, canonical_brand: brand.name, canonical_size: size,
  });
  if (result.status === 'created' || result.status === 'resent') {
    const summary = [brand.name, type, size].filter(Boolean).join(' ');
    const url = `${SITE_URL}/alerts/confirm/${result.confirmToken}`;
    const { subject, html } = confirmEmail(summary, url);
    await sendEmail({
      templateId: '12-alert-confirm', to: email, subject, html,
      vars: { summary, canonical_type: type, canonical_brand: brand.name, canonical_size: size, via: ctx.surface },
    });
  }
  return { ok: true, data: ALERT_PENDING, meta: { resolved: { type, brand: brand.name, size, max_price: body.max_price ?? null } } };
}
