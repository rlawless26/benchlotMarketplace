/**
 * One source of truth for request validation (withApi), the OpenAPI document
 * (z.toJSONSchema) and the MCP tool input schemas. Descriptions here are what
 * an agent reads, so they explain, not just constrain.
 */
import { z } from 'zod';

const MAX_LIMIT = 100;

export const TypeParam = z.string().trim().min(2).max(60)
  .describe('Tool type, by name or slug: "Bench Plane", "bench-plane", "hand saw". Case-insensitive. See /api/v1/types.');
export const BrandParam = z.string().trim().min(1).max(60)
  .describe('Maker, by name or slug: "Stanley", "lie-nielsen", "Millers Falls". Known aliases are folded.');

export const PricesQuery = z.object({
  type: TypeParam,
  brand: BrandParam,
  model: z.string().trim().min(1).max(40).optional()
    .describe('Model designation, e.g. "No. 4", "D-8", "A5". Narrows to the model page when one exists.'),
  size: z.string().trim().min(1).max(40).optional()
    .describe('Primary size, e.g. "26 inch", "1/2 inch". Ignored when `model` is given.'),
  plane_type: z.coerce.number().int().min(1).max(20).optional()
    .describe('Stanley bench-plane type-study number (1-20). Needs `model`.'),
  include_comps: z.stringbool().optional().default(false)
    .describe('Also return up to 12 recent sold comps and 12 live listings that back the numbers.'),
});
export type PricesQuery = z.infer<typeof PricesQuery>;

export const PriceSearchQuery = z.object({
  q: z.string().trim().min(2).max(120).describe('Free text: "millers falls brace", "stanley 45".'),
  limit: z.coerce.number().int().min(1).max(60).optional().default(20),
});
export type PriceSearchQuery = z.infer<typeof PriceSearchQuery>;

export const ListingsQuery = z.object({
  q: z.string().trim().min(2).max(120).optional().describe('Full-text search over titles and canonical fields.'),
  type: TypeParam.optional(),
  brand: BrandParam.optional(),
  status: z.enum(['active', 'sold']).optional().default('active')
    .describe('`active`: for sale now (seen within 45 days). `sold`: recorded sales, newest first.'),
  source: z.string().trim().min(2).max(40).optional().describe('Source id from /api/v1/meta, e.g. "ebay", "jimbode".'),
  min_price: z.coerce.number().min(0).optional().describe('USD.'),
  max_price: z.coerce.number().min(0).optional().describe('USD.'),
  include_lots: z.stringbool().optional().default(false)
    .describe('Include multi-item lots and parts/project listings, which the price guide excludes.'),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(25),
  cursor: z.string().max(200).optional().describe('Opaque; from `meta.next_cursor` of the previous page.'),
});
export type ListingsQuery = z.infer<typeof ListingsQuery>;

export const ListingIdParam = z.string().regex(/^\d{1,12}$/);

export const BrandsQuery = z.object({
  type: TypeParam.optional().describe('Restrict to makers with a price-guide page for this type.'),
});
export type BrandsQuery = z.infer<typeof BrandsQuery>;

export const MediaType = z.enum(['image/jpeg', 'image/png', 'image/webp']);

export const IdentifyBody = z.object({
  images: z.array(z.object({
    data: z.string().min(100).describe('Base64, no data: prefix.'),
    media_type: MediaType,
  })).min(1).max(5).describe('One to five photos of ONE tool. Total base64 under 3 MB; downscale to ~1600px first.'),
  context: z.string().trim().max(500).optional().describe('Anything the photos do not show: markings, measurements, what the seller said.'),
  previous_scan_id: z.string().max(64).optional().describe('Scan id from an earlier call, to add photos of the same tool.'),
});
export type IdentifyBody = z.infer<typeof IdentifyBody>;

export const AlertBody = z.object({
  email: z.string().trim().email().max(254).describe('The person who will receive the alert. They must confirm by email before anything is sent.'),
  type: TypeParam,
  brand: BrandParam,
  size: z.string().trim().min(1).max(40).optional(),
  max_price: z.coerce.number().positive().max(100000).optional().describe('USD ceiling; listings above it are not sent.'),
});
export type AlertBody = z.infer<typeof AlertBody>;

export const KeyRequestBody = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(2).max(80).describe('Who or what will use the key: "Acme shopping agent".'),
});
export type KeyRequestBody = z.infer<typeof KeyRequestBody>;

// ---------------------------------------------------------------------------
// Response shapes (documentation + MCP structuredContent). Kept in step with
// prices.ts / license.ts / catalog.ts by the tsc build: those modules
// `satisfies` these types.
// ---------------------------------------------------------------------------

export const Confidence = z.enum(['high', 'medium', 'low', 'none'])
  .describe('high: 20+ recorded sales. medium: 8-19. low: fewer than 8 sales (asking prices only; do not quote a sold median). none: no evidence.');

export const PriceBlock = z.object({
  count: z.number().int(),
  median: z.number().nullable(),
  mean: z.number().nullable(),
  p10: z.number().nullable(),
  p25: z.number().nullable(),
  p75: z.number().nullable(),
  p90: z.number().nullable(),
  by_source_kind: z.record(z.string(), z.unknown()).nullable().describe('Dealer / Marketplace / Forum breakdown.'),
});

export const Source = z.object({
  id: z.string(), name: z.string(), kind: z.string(), url: z.string().url(),
});

export const Attribution = z.object({
  text: z.string(), link: z.string().url(), link_required: z.literal(true),
});

export const Listing = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['active', 'sold', 'expired']),
  price: z.object({ amount: z.number(), currency: z.string() }).nullable(),
  price_status: z.enum(['current', 'stale', 'realized', 'unknown'])
    .describe('current: asking price seen within the source licence window. stale: withheld (eBay prices are not redistributed past 24h; fetch source.url). realized: the sale price.'),
  price_observed_at: z.string().nullable(),
  price_valid_until: z.string().nullable(),
  condition: z.string().nullable(),
  images: z.array(z.string()),
  location: z.string().nullable(),
  listed_at: z.string().nullable(),
  sold_at: z.string().nullable(),
  first_seen_at: z.string().nullable(),
  last_seen_at: z.string().nullable(),
  type: z.string().nullable(), brand: z.string().nullable(), model: z.string().nullable(),
  size: z.string().nullable(), era: z.string().nullable(),
  guide_url: z.string().nullable(),
  source: Source,
  attribution: Attribution,
});
export type Listing = z.infer<typeof Listing>;

export const PriceGuide = z.object({
  cluster_key: z.string(),
  grain: z.enum(['coarse', 'fine', 'model-fine', 'type-fine']),
  type: z.string(), brand: z.string(),
  model: z.string().nullable(), size: z.string().nullable(), plane_type_number: z.number().nullable(),
  guide_url: z.string().url().describe('Cite this page.'),
  confidence: Confidence,
  confidence_note: z.string(),
  sold: PriceBlock.extend({ window: z.literal('all_time') }).describe('Recorded sales, USD. Percentiles are null below 8 sales.'),
  asking: PriceBlock.omit({ p10: true, p90: true }).extend({ count_active: z.number().int(), window_days: z.number().int() })
    .describe('Asking prices from the last 365 days, USD. Percentiles are null below 10 asks.'),
  for_sale_now: z.object({ count: z.number().int(), low: z.number().nullable(), high: z.number().nullable() }),
  freshness: z.object({
    stats_built_at: z.string().nullable(), first_sale_at: z.string().nullable(), last_sale_at: z.string().nullable(),
    sales_last_365d: z.number().int(), active_window_days: z.number().int(),
  }),
  coverage: z.object({
    sources: z.array(z.object({ name: z.string(), sales: z.number().int() })),
    sales_total: z.number().int(), lots_excluded: z.number().int(), parts_excluded: z.number().int(),
    method: z.string(),
  }),
  comps: z.object({ sold: z.array(Listing), active: z.array(Listing) }).optional(),
});
export type PriceGuide = z.infer<typeof PriceGuide>;

export const PriceGuideRef = z.object({
  cluster_key: z.string(), grain: z.string(), type: z.string(), brand: z.string(),
  model: z.string().nullable(), size: z.string().nullable(), plane_type: z.number().nullable(),
  sold_count: z.number().int(), sold_median: z.number().nullable(), asking_count: z.number().int(), for_sale_now: z.number().int(),
  confidence: Confidence, guide_url: z.string().url(), stats_built_at: z.string().nullable(),
});
export type PriceGuideRef = z.infer<typeof PriceGuideRef>;
