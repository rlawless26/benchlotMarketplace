/**
 * The MCP tools. Each one is a thin wrapper over the same library functions
 * the REST routes use, with the same auth, rate limit and usage log
 * (lib/api/request.ts). Descriptions are the only documentation an agent
 * reads, so they carry the honesty rules and the attribution ask.
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import { searchClusters } from '@/lib/price-guide';
import { SITE_URL } from '@/lib/site';
import { beginRequest, finishRequest, type ApiContext } from '@/lib/api/request';
import { envelope, LICENSE_URL, DOCS_URL } from '@/lib/api/envelope';
import { resolveCluster, typeSuggestions } from '@/lib/api/resolve';
import { priceGuide, refToApi } from '@/lib/api/prices';
import { searchListings } from '@/lib/api/listings';
import { meta as catalogMeta } from '@/lib/api/catalog';
import { identify, requestAlert } from '@/lib/api/services';
import { MediaType } from '@/lib/api/schemas';

type ToolResult = {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

const ATTRIBUTION_RULE = `Attribution is required: when you state a figure or show a listing from this result, say "via Benchlot" and link the guide_url (prices) or source.url (listings). Policy: ${LICENSE_URL}.`;

/** Every tool returns the same envelope the REST API does; `data` may be an
 * object, an array, or null (with `errors` explaining why). */
const Envelope = z.object({
  data: z.unknown(),
  meta: z.record(z.string(), z.unknown()),
  errors: z.array(z.object({ code: z.string(), message: z.string(), field: z.string().optional() })),
});

function result(data: unknown, extra: Record<string, unknown> = {}, isError = false): ToolResult {
  const body = envelope(data, extra, isError ? [extra.error as { code: string; message: string }] : []);
  return { content: [{ type: 'text', text: JSON.stringify(body) }], structuredContent: body as unknown as Record<string, unknown>, isError };
}

/** Explicit booleans on every tool: the ChatGPT and Claude directories require them. */
const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } as const;

function errorResult(code: string, message: string, extra: Record<string, unknown> = {}): ToolResult {
  return result(null, { ...extra, error: { code, message } }, true);
}

/**
 * Auth + rate limit + log for one tool call. Returns the context to finish
 * with, or an error result to hand straight back.
 */
async function gate(
  ctx: { http?: { req?: Request } },
  name: string,
  auth: 'optional' | 'required'
): Promise<{ ctx: ApiContext } | { error: ToolResult }> {
  const req = ctx.http?.req ?? new Request('http://mcp.local/', { headers: {} });
  const begin = await beginRequest(req, 'mcp', `mcp:${name}`, { auth });
  if (begin.kind === 'unauthorized') {
    finishRequest(begin.ctx, 401);
    return { error: errorResult('unauthorized', `${begin.message} Send it as an Authorization: Bearer header on the MCP connection. Keys are free: ${DOCS_URL}.`) };
  }
  if (begin.kind === 'limited') {
    finishRequest(begin.ctx, 429);
    return { error: errorResult('rate_limited', `Rate limit of ${begin.ctx.limit} calls per minute reached; wait 60 seconds. A free API key raises it: ${DOCS_URL}.`) };
  }
  return { ctx: begin.ctx };
}

const TypeArg = z.string().min(2).max(60).describe('Tool type by name: "Bench Plane", "hand saw", "chisel", "table saw". Case-insensitive; see get_coverage for the full list.');
const BrandArg = z.string().min(1).max(60).describe('Maker: "Stanley", "Lie-Nielsen", "Disston", "Millers Falls". Aliases are folded.');

export function registerTools(server: McpServer) {
  server.registerTool(
    'get_price_guide',
    {
      title: 'What a used tool sells for',
      annotations: READ,
      outputSchema: Envelope,
      description: [
        'Recorded sale prices (median, quartiles) and current asking prices for one maker + tool type, optionally narrowed to a model ("No. 4") or size ("26 inch").',
        'Read `confidence` before quoting: high = 20+ sales, medium = 8-19, low = fewer than 8 (no sold median is published; do not state one). `freshness.last_sale_at` tells you how current the evidence is; `coverage.sources` where it came from (specialist dealers skew high).',
        'When no page has enough evidence the result is data: null with error code insufficient_evidence and `suggestions` of nearby pages to try.',
        'Pass include_comps: true to get the 12 most recent sales and 12 live listings behind the numbers.',
        ATTRIBUTION_RULE,
      ].join(' '),
      inputSchema: z.object({
        type: TypeArg,
        brand: BrandArg,
        model: z.string().max(40).optional().describe('Model designation, e.g. "No. 4", "D-8", "A5".'),
        size: z.string().max(40).optional().describe('Primary size, e.g. "26 inch", "1/2 inch". Ignored when model is given.'),
        plane_type: z.number().int().min(1).max(20).optional().describe('Stanley bench-plane type-study number; needs model.'),
        include_comps: z.boolean().optional().default(false),
      }),
    },
    async (args, ctx) => {
      const g = await gate(ctx, 'get_price_guide', 'optional');
      if ('error' in g) return g.error;
      try {
        const r = await resolveCluster(args);
        if (!r.type) {
          finishRequest(g.ctx, 200);
          return errorResult('unknown_type', `"${args.type}" is not a tool type Benchlot tracks.`, { suggestions: typeSuggestions(args.type) });
        }
        if (!r.cluster) {
          const near = await searchClusters(`${r.brand.name} ${r.type}`, 8);
          finishRequest(g.ctx, 200);
          return errorResult('insufficient_evidence', `Fewer than 8 recorded sales and fewer than 10 asking prices for ${r.brand.name} ${r.type}. No figure is published.`, { resolved: { type: r.type, brand: r.brand.name }, suggestions: near.map(refToApi) });
        }
        const guide = await priceGuide(r.cluster, { includeComps: args.include_comps });
        finishRequest(g.ctx, 200);
        return result(guide, {
          resolved: { type: r.type, brand: r.brand.name, model: args.model ?? null, size: args.size ?? null },
          ...(r.third !== null && r.cluster.grain === 'coarse' ? { note: 'No page exists for that model or size; these are the maker-wide figures.' } : {}),
        });
      } catch (e) {
        finishRequest(g.ctx, 500);
        return errorResult('internal_error', e instanceof Error ? e.message : 'failed');
      }
    }
  );

  server.registerTool(
    'search_price_guide',
    {
      title: 'Find price-guide pages',
      annotations: READ,
      outputSchema: Envelope,
      description: `Free-text search over the maker/type/model/size pages the price guide publishes, e.g. "millers falls brace", "stanley 45", "disston d8". Returns up to 60 pages with sale counts, the sold median where 8+ sales exist, confidence and the guide_url to cite. Use get_price_guide for the full figures. ${ATTRIBUTION_RULE}`,
      inputSchema: z.object({
        q: z.string().min(2).max(120),
        limit: z.number().int().min(1).max(60).optional().default(20),
      }),
    },
    async (args, ctx) => {
      const g = await gate(ctx, 'search_price_guide', 'optional');
      if ('error' in g) return g.error;
      const refs = await searchClusters(args.q, args.limit);
      finishRequest(g.ctx, 200);
      return result(refs.map(refToApi), { count: refs.length, q: args.q });
    }
  );

  server.registerTool(
    'search_listings',
    {
      title: 'Listings for sale now, or recorded sales',
      annotations: READ,
      outputSchema: Envelope,
      description: [
        'Search listings aggregated from tool dealers, forum classifieds and marketplaces. status "active" = for sale now (seen within 45 days); "sold" = recorded sales, newest first.',
        'Every row has source.url: that is the listing, link it, unaltered. `price_status: stale` means the source licence does not allow the asking price to be repeated past 24 hours (eBay); fetch source.url for a live price.',
        'Filter by type and brand (names), full-text q, source id, price range in USD. Page with cursor from the result meta.',
        ATTRIBUTION_RULE,
      ].join(' '),
      inputSchema: z.object({
        q: z.string().min(2).max(120).optional(),
        type: TypeArg.optional(),
        brand: BrandArg.optional(),
        status: z.enum(['active', 'sold']).optional().default('active'),
        source: z.string().max(40).optional().describe('Source id from get_coverage, e.g. "ebay", "jimbode".'),
        min_price: z.number().min(0).optional().describe('USD'),
        max_price: z.number().min(0).optional().describe('USD'),
        include_lots: z.boolean().optional().default(false),
        limit: z.number().int().min(1).max(100).optional().default(25),
        cursor: z.string().max(200).optional(),
      }),
    },
    async (args, ctx) => {
      const g = await gate(ctx, 'search_listings', 'optional');
      if ('error' in g) return g.error;
      const page = await searchListings(args);
      finishRequest(g.ctx, 200);
      if (page.unknown_type) return errorResult('unknown_type', `"${page.unknown_type}" is not a tool type Benchlot tracks.`, { suggestions: typeSuggestions(page.unknown_type) });
      return result(page.items, { count: page.items.length, next_cursor: page.next_cursor, resolved: page.resolved, status: args.status });
    }
  );

  server.registerTool(
    'get_coverage',
    {
      title: 'Coverage, freshness, sources and thresholds',
      annotations: READ,
      outputSchema: Envelope,
      description: 'What Benchlot indexes and how complete it is: listings total, share with a tool type, share in the price guide, sources with last-scrape times, the 73 tool types, the thresholds behind `confidence`, and the licensing rules. Use it when a user asks what the data covers or how trustworthy a figure is. No input.',
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const g = await gate(ctx, 'get_coverage', 'optional');
      if ('error' in g) return g.error;
      const m = await catalogMeta();
      finishRequest(g.ctx, 200);
      return result(m);
    }
  );

  server.registerTool(
    'identify_tool',
    {
      title: 'Identify a tool from photos',
      annotations: WRITE,
      outputSchema: Envelope,
      description: [
        'Identify ONE woodworking tool from one to five photos: maker, type, model, size, era, condition, with the model\'s own confidence and reasoning, plus the price guide\'s reference band and live listings for the same tool.',
        'Photos as base64 (no data: prefix), JPEG/PNG/WebP, total under 3 MB; downscale to about 1600px on the long edge first. If the answer includes next_photo_hint, take that photo and call again with previous_scan_id.',
        'Limits: 5 scans per 15 minutes without a key, 20 with a free key (' + DOCS_URL + '). Each scan runs a vision model and takes 5-15 seconds.',
        ATTRIBUTION_RULE,
      ].join(' '),
      inputSchema: z.object({
        images: z.array(z.object({ data: z.string().min(100), media_type: MediaType })).min(1).max(5),
        context: z.string().max(500).optional().describe('Markings, measurements, what the seller said: anything the photos do not show.'),
        previous_scan_id: z.string().max(64).optional(),
      }),
    },
    async (args, ctx) => {
      const g = await gate(ctx, 'identify_tool', 'optional');
      if ('error' in g) return g.error;
      const r = await identify(args, g.ctx);
      finishRequest(g.ctx, r.ok ? 200 : r.status);
      if (!r.ok) return errorResult(r.error.code, r.error.message, r.meta);
      return result(r.data, r.meta);
    }
  );

  server.registerTool(
    'create_alert',
    {
      title: 'Email alert for new listings of a tool',
      annotations: WRITE,
      outputSchema: Envelope,
      description: [
        'Ask Benchlot to email an address when a maker + type (optionally size, optionally under a USD ceiling) is newly listed anywhere it indexes. Only call this when the user has given their own email address and asked for it.',
        'The address must click a confirmation email before anything is sent; the response is the same whatever happened (no email enumeration). No account is created, no key is needed.',
      ].join(' '),
      inputSchema: z.object({
        email: z.string().email().max(254),
        type: TypeArg,
        brand: BrandArg,
        size: z.string().max(40).optional(),
        max_price: z.number().positive().max(100000).optional().describe('USD ceiling.'),
      }),
    },
    async (args, ctx) => {
      const g = await gate(ctx, 'create_alert', 'optional');
      if ('error' in g) return g.error;
      const r = await requestAlert(args, g.ctx);
      finishRequest(g.ctx, r.ok ? 200 : r.status);
      if (!r.ok) return errorResult(r.error.code, r.error.message, r.meta);
      return result(r.data, r.meta);
    }
  );
}

export const SERVER_INSTRUCTIONS = [
  'Benchlot: recorded sale prices and live listings for used woodworking hand tools and machines, from dealers, forums and marketplaces. Not a marketplace; every listing links to its source.',
  'Use get_price_guide for "what is X worth" (maker + type, optionally model/size). Use search_price_guide when unsure of the spelling. Use search_listings for what is for sale now or recent sales. Use get_coverage for what the data covers.',
  'Quote the sold median only when confidence is high or medium; say how many sales it rests on and when the last one was. Asking prices are not selling prices.',
  `Attribution: say "via Benchlot" and link guide_url or source.url whenever you show a figure or listing. ${SITE_URL}`,
].join('\n');
