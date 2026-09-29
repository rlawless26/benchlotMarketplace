/**
 * ToolScan: photo -> identification, on the Next.js app.
 *
 * Port of the `/toolscan` route that lived in the `api` Cloud Function until
 * 2026-09-29. Scans are rows in `tool_scans`, photos are objects in the
 * private Vercel Blob store (`toolscans/{scanId}/{i}.{ext}`), and the model is
 * called through the Anthropic SDK. No auth: the scan page is anonymous.
 *
 * Request bodies on Vercel functions are capped at 4.5 MB, so the client
 * downscales photos before sending (src/utils/downscaleImage.js); the total
 * check below is the backstop, not the primary limit.
 */
import Anthropic from '@anthropic-ai/sdk';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { sql } from './db';
import { TOOLSCAN_SYSTEM_PROMPT } from './toolscan-prompt';
import {
  slug, resolveBrandAlias, clusterPath, SOLD_MIN_FOR_REFERENCE, ASKING_MIN_FOR_REFERENCE,
} from './price-guide';

export const TOOLSCAN_MODEL = 'claude-opus-5';
const MAX_IMAGES = 5;
const MAX_TOTAL_BASE64 = 4_000_000;
const RATE_WINDOW = '15 minutes';
const RATE_MAX = 20;

type MediaType = 'image/jpeg' | 'image/png' | 'image/webp';
const MEDIA_EXT: Record<MediaType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const isMediaType = (v: unknown): v is MediaType => typeof v === 'string' && v in MEDIA_EXT;

export type ScanImage = { data: string; media_type: MediaType };

export type ScanTool = {
  canonical_brand: string | null;
  canonical_type: string | null;
  canonical_model: string | null;
  plane_type_number: number | null;
  era_estimate: string | null;
  condition: string | null;
  condition_notes: string | null;
  confidence: string | null;
  confidence_reasoning?: string | null;
  next_photo_hint?: string | null;
};
export type ScanResults = { tool: ScanTool | null; general_notes?: string | null };

export type ScanOutcome =
  | { status: 200; scanId: string; imagePaths: string[]; results: ScanResults }
  | { status: 400 | 429 | 500; error: string };

/**
 * The caller's IP through the benchlot.com -> benchlot-web rewrite. Null when
 * nothing usable is present; the rate limiter treats null as "don't count",
 * never as a shared bucket.
 */
export function clientIp(headers: Headers): string | null {
  const pick = (v: string | null) => v?.split(',')[0]?.trim() || null;
  return pick(headers.get('x-vercel-forwarded-for'))
    ?? pick(headers.get('x-forwarded-for'))
    ?? pick(headers.get('x-real-ip'));
}

export async function scanRateLimited(ip: string | null, distinctId: string | null): Promise<boolean> {
  if (!ip && !distinctId) return false;
  const rows = await sql<{ n: number }>(
    `SELECT count(*)::int AS n FROM tool_scans
     WHERE created_at > now() - interval '${RATE_WINDOW}'
       AND ((created_ip IS NOT NULL AND created_ip = $1)
         OR (posthog_distinct_id IS NOT NULL AND posthog_distinct_id = $2))`,
    [ip, distinctId]
  );
  return (rows[0]?.n ?? 0) >= RATE_MAX;
}

function validateImages(raw: unknown): ScanImage[] | string {
  if (!Array.isArray(raw) || raw.length === 0) return 'At least one image is required.';
  if (raw.length > MAX_IMAGES) return `Maximum ${MAX_IMAGES} images per scan.`;
  const out: ScanImage[] = [];
  let total = 0;
  for (const img of raw) {
    const data = img && typeof img === 'object' ? (img as { data?: unknown }).data : null;
    const mt = img && typeof img === 'object' ? (img as { media_type?: unknown }).media_type : null;
    if (typeof data !== 'string' || !data) return 'Each image must have data and media_type fields.';
    if (!isMediaType(mt)) return `Unsupported image type: ${String(mt)}. Use JPEG, PNG, or WebP.`;
    total += data.length;
    if (total > MAX_TOTAL_BASE64) return 'Photos are too large. Try fewer or smaller photos.';
    out.push({ data, media_type: mt });
  }
  return out;
}

async function refinePromptFor(previousScanId: string | null, context: string | null): Promise<string> {
  let text = 'Identify the tool in this image.';
  if (previousScanId) {
    const rows = await sql<{ results: ScanResults | null }>(
      `SELECT results FROM tool_scans WHERE id = $1`, [previousScanId]
    );
    const prev = rows[0]?.results?.tool;
    if (prev) {
      const prevName = [prev.canonical_brand, prev.canonical_model].filter(Boolean).join(' ')
        || prev.canonical_type || 'unknown';
      const prevHint = (prev.next_photo_hint || 'a different angle').replace(/"/g, '');
      text = `On the previous photo you identified this as ${prevName}`
        + (Number.isInteger(prev.plane_type_number) ? `, Type ${prev.plane_type_number}` : '')
        + ` with ${prev.confidence || 'Medium'} confidence. The user is now sending the ${prevHint} view you requested. Refine your identification — your confidence should escalate if the new view confirms what you saw, or change if it reveals a different tool.`;
    }
  }
  if (context) text += `\n\nUser context: "${context}"`;
  return text;
}

/** Upload one photo; a failure is logged and yields null so the scan still answers. */
async function storeImage(scanId: string, i: number, img: ScanImage): Promise<string | null> {
  const pathname = `toolscans/${scanId}/${i}.${MEDIA_EXT[img.media_type]}`;
  try {
    const blob = await put(pathname, Buffer.from(img.data, 'base64'), {
      access: 'private', contentType: img.media_type, addRandomSuffix: false,
    });
    return blob.pathname;
  } catch (e) {
    console.warn(`[toolscan] image upload failed for ${pathname}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

export async function runScan(input: {
  images: unknown;
  context?: unknown;
  previous_scan_id?: unknown;
  distinct_id?: unknown;
  ip: string | null;
}): Promise<ScanOutcome> {
  const images = validateImages(input.images);
  if (typeof images === 'string') return { status: 400, error: images };

  const context = typeof input.context === 'string' && input.context.trim() ? input.context.trim().slice(0, 1000) : null;
  const previousScanId = typeof input.previous_scan_id === 'string' && input.previous_scan_id ? input.previous_scan_id.slice(0, 64) : null;
  const distinctId = typeof input.distinct_id === 'string' && input.distinct_id ? input.distinct_id.slice(0, 200) : null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[toolscan] ANTHROPIC_API_KEY is not set');
    return { status: 500, error: 'Scanning is not configured.' };
  }

  if (await scanRateLimited(input.ip, distinctId)) {
    return { status: 429, error: 'Too many scans in a short time. Please try again in a few minutes.' };
  }

  const scanId = randomUUID();
  const uploads = Promise.all(images.map((img, i) => storeImage(scanId, i, img)));

  const userText = await refinePromptFor(previousScanId, context);
  const content: Anthropic.ContentBlockParam[] = [
    ...images.map((img): Anthropic.ImageBlockParam => ({
      type: 'image',
      source: { type: 'base64', media_type: img.media_type, data: img.data },
    })),
    { type: 'text', text: userText },
  ];

  // Built per call, not at module top level: `next build` evaluates modules
  // without the key. Sampling params are rejected on this model; thinking is
  // on by default and shares max_tokens with the answer.
  const anthropic = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 1 });

  let message: Anthropic.Message;
  try {
    message = await anthropic.messages.create({
      model: TOOLSCAN_MODEL,
      max_tokens: 8192,
      system: TOOLSCAN_SYSTEM_PROMPT,
      output_config: { effort: 'medium' },
      messages: [{ role: 'user', content }],
    });
  } catch (e) {
    await uploads;
    if (e instanceof Anthropic.RateLimitError) {
      return { status: 429, error: 'AI service rate limit reached. Please try again in a moment.' };
    }
    if (e instanceof Anthropic.BadRequestError) {
      console.error('[toolscan] Anthropic 400:', e.message);
      return { status: 400, error: `Image could not be processed: ${e.message}` };
    }
    console.error('[toolscan] Anthropic error:', e instanceof Error ? e.message : e);
    return { status: 500, error: 'An error occurred during tool scanning.' };
  }

  const imagePaths = (await uploads).filter((p): p is string => p !== null);

  if (message.stop_reason === 'refusal') {
    console.warn('[toolscan] model declined the request', message.stop_details ?? null);
    await recordScan({ scanId, images, context, previousScanId, distinctId, ip: input.ip, imagePaths,
      results: null, usage: message.usage, stopReason: 'refusal' });
    return { status: 400, error: 'The image could not be analysed. Try a different photo.' };
  }

  const responseText = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text).join('');

  let parsed: ScanResults;
  try {
    const m = responseText.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('No JSON object found in response');
    parsed = JSON.parse(m[0]);
  } catch (e) {
    console.error('[toolscan] parse failure:', e instanceof Error ? e.message : e, responseText.slice(0, 500));
    return { status: 500, error: 'Failed to parse tool identification results.' };
  }

  await recordScan({ scanId, images, context, previousScanId, distinctId, ip: input.ip, imagePaths,
    results: parsed, usage: message.usage, stopReason: message.stop_reason });

  return { status: 200, scanId, imagePaths, results: parsed };
}

async function recordScan(r: {
  scanId: string; images: ScanImage[]; context: string | null; previousScanId: string | null;
  distinctId: string | null; ip: string | null; imagePaths: string[];
  results: ScanResults | null; usage: Anthropic.Usage; stopReason: string | null;
}) {
  try {
    await sql(
      `INSERT INTO tool_scans (id, user_id, image_count, tool_count, context, results, model, usage,
                               image_paths, previous_scan_id, created_ip, image_store,
                               posthog_distinct_id, stop_reason, created_at)
       VALUES ($1, 'anonymous', $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8::text[], $9, $10, 'blob', $11, $12, now())`,
      [r.scanId, r.images.length, r.results?.tool ? 1 : 0, r.context,
       r.results ? JSON.stringify(r.results) : null, TOOLSCAN_MODEL,
       JSON.stringify({ input_tokens: r.usage.input_tokens, output_tokens: r.usage.output_tokens }),
       r.imagePaths, r.previousScanId, r.ip, r.distinctId, r.stopReason]
    );
  } catch (e) {
    // The user still gets their result; the row is the audit trail, not the product.
    console.error('[toolscan] failed to store scan:', e instanceof Error ? e.message : e);
  }
}

// ---------------------------------------------------------------------------
// Reference band for the results email
// ---------------------------------------------------------------------------

export type ScanReference = {
  low: string; high: string; count: number; source: 'sold' | 'asking'; guidePath: string;
};

/**
 * p25–p75 for the identified tool: the model cluster first, then the brand
 * cluster. Sold prices when there are enough, asking prices otherwise, nothing
 * when neither clears the guide's own thresholds.
 */
export async function scanReference(tool: Pick<ScanTool, 'canonical_type' | 'canonical_brand' | 'canonical_model'>): Promise<ScanReference | null> {
  if (!tool.canonical_type || !tool.canonical_brand || tool.canonical_brand === 'Unknown') return null;
  const typeSlug = slug(tool.canonical_type);
  const rawBrand = slug(tool.canonical_brand);
  const brandSlug = (await resolveBrandAlias(rawBrand)) ?? rawBrand;
  const keys: string[] = [];
  if (tool.canonical_model) keys.push(`pt::${typeSlug}::${brandSlug}::m-${slug(tool.canonical_model)}`);
  keys.push(`pt::${typeSlug}::${brandSlug}::_`);

  const rows = await sql<{
    cluster_key: string; sold_count: number | null; asking_count: number | null;
    sold_p25: string | null; sold_p75: string | null; asking_p25: string | null; asking_p75: string | null;
  }>(
    `SELECT cluster_key, sold_count, asking_count, sold_p25, sold_p75, asking_p25, asking_p75
     FROM price_stats WHERE cluster_key = ANY($1)
     ORDER BY array_position($1::text[], cluster_key)`,
    [keys]
  );
  for (const r of rows) {
    const isModel = r.cluster_key.includes('::m-');
    const guidePath = clusterPath({
      typeSlug, brandSlug, sizeSlug: null,
      modelSlug: isModel && tool.canonical_model ? slug(tool.canonical_model) : null,
    });
    const dollars = (v: string | null) => (v === null ? null : `$${Math.round(parseFloat(v))}`);
    if ((r.sold_count ?? 0) >= SOLD_MIN_FOR_REFERENCE && r.sold_p25 && r.sold_p75) {
      return { low: dollars(r.sold_p25)!, high: dollars(r.sold_p75)!, count: r.sold_count!, source: 'sold', guidePath };
    }
    if ((r.asking_count ?? 0) >= ASKING_MIN_FOR_REFERENCE && r.asking_p25 && r.asking_p75) {
      return { low: dollars(r.asking_p25)!, high: dollars(r.asking_p75)!, count: r.asking_count!, source: 'asking', guidePath };
    }
  }
  return null;
}

/** "Stanley No. 5 · Type 11", falling back to the type. Mirrors the old email. */
export function scanToolName(tool: Partial<ScanTool>): string {
  const brand = tool.canonical_brand && tool.canonical_brand !== 'Unknown' && tool.confidence !== 'Low'
    ? tool.canonical_brand : null;
  let name = [brand, tool.canonical_model].filter(Boolean).join(' ');
  if (Number.isInteger(tool.plane_type_number)) {
    name = name ? `${name} · Type ${tool.plane_type_number}` : `Type ${tool.plane_type_number}`;
  }
  return name || tool.canonical_type || '';
}

// ---------------------------------------------------------------------------
// Leads and feedback
// ---------------------------------------------------------------------------

export const LEAD_SOURCES = new Set(['scan_email_gate', 'category_interest', 'waitlist', 'digest_footer']);
const LEAD_RATE_MAX = 5;

/** More than LEAD_RATE_MAX captures from one IP or one address in 15 minutes is a script. */
export async function leadRateLimited(ip: string | null, email: string): Promise<boolean> {
  const rows = await sql<{ n: number }>(
    `SELECT count(*)::int AS n FROM leads
     WHERE created_at > now() - interval '${RATE_WINDOW}'
       AND (lower(email) = lower($1) OR (created_ip IS NOT NULL AND created_ip = $2))`,
    [email, ip]
  );
  return (rows[0]?.n ?? 0) >= LEAD_RATE_MAX;
}

export async function recordLead(l: {
  email: string; source: string; scanId: string | null; payload: unknown; ip: string | null;
}): Promise<void> {
  await sql(
    `INSERT INTO leads (email, source, scan_id, payload, created_ip)
     VALUES ($1, $2, $3, $4::jsonb, $5)`,
    [l.email.toLowerCase(), l.source, l.scanId, JSON.stringify(l.payload ?? {}), l.ip]
  );
}

export async function recordFeedback(f: {
  scanId: string | null; vote: 'correct' | 'corrected'; email: string | null;
  originalResult: unknown; correctedResult: unknown; userEdits: unknown; hasEdits: boolean;
  imagePaths: string[]; ip: string | null;
}): Promise<void> {
  await sql(
    `INSERT INTO scan_feedback (scan_id, vote, email, original_result, corrected_result, user_edits,
                                has_edits, image_paths, created_ip)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8::text[], $9)`,
    [f.scanId, f.vote, f.email, JSON.stringify(f.originalResult ?? null),
     f.correctedResult == null ? null : JSON.stringify(f.correctedResult),
     f.userEdits == null ? null : JSON.stringify(f.userEdits),
     f.hasEdits, f.imagePaths, f.ip]
  );
}
