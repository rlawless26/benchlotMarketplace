/**
 * The catalogue endpoints: what types and makers exist, and /meta — the
 * coverage, freshness and thresholds an agent should read before trusting a
 * number. Coverage comes from the nightly coverage_snapshots row
 * (scripts/coverage-report.js), never from a live scan of listings.
 */
import { sql } from '@/lib/db';
import { SITE_URL } from '@/lib/site';
import { brandHubPath } from '@/lib/guide-paths';
import { indexStats } from '@/lib/index-stats';
import {
  listPublishableClusters, listBrandHubs, SOLD_MIN_FOR_REFERENCE, ASKING_MIN_FOR_REFERENCE, FRESH_DAYS,
} from '@/lib/price-guide';
import { CANONICAL_TYPES, resolveTypeName } from './resolve';
import { refToApi } from './prices';
import { iso } from './license';
import { API_VERSION, DOCS_URL, LICENSE_URL, OPENAPI_URL } from './envelope';

export async function types() {
  const coarse = await listPublishableClusters({ grains: ['coarse'] });
  const agg = new Map<string, { brands: number; sold: number; for_sale_now: number; indexable_brands: number }>();
  for (const c of coarse) {
    const a = agg.get(c.canonical_type) ?? { brands: 0, sold: 0, for_sale_now: 0, indexable_brands: 0 };
    a.brands += 1;
    a.sold += c.sold_count;
    a.for_sale_now += c.asking_count_active;
    if (c.sold_count >= SOLD_MIN_FOR_REFERENCE) a.indexable_brands += 1;
    agg.set(c.canonical_type, a);
  }
  return CANONICAL_TYPES.filter((t) => t !== 'Other').map((t) => {
    const a = agg.get(t);
    return {
      type: t,
      slug: t.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      makers_with_prices: a?.brands ?? 0,
      makers_with_8_plus_sales: a?.indexable_brands ?? 0,
      sales_total: a?.sold ?? 0,
      for_sale_now: a?.for_sale_now ?? 0,
    };
  }).sort((x, y) => y.sales_total - x.sales_total || x.type.localeCompare(y.type));
}

export async function brands(typeInput?: string) {
  if (typeInput) {
    const type = resolveTypeName(typeInput);
    if (!type) return { type: null, items: [] as ReturnType<typeof refToApi>[] };
    const coarse = await listPublishableClusters({ grains: ['coarse'] });
    return { type, items: coarse.filter((c) => c.canonical_type === type).map(refToApi) };
  }
  const hubs = await listBrandHubs();
  return {
    type: null,
    items: hubs.map((h) => ({
      brand: h.canonical_brand,
      slug: h.brandSlug,
      types_with_prices: h.type_count,
      sales_total: h.sold_total,
      brand_url: `${SITE_URL}${brandHubPath(h.brandSlug)}`,
    })),
  };
}

export async function meta() {
  const [snapshot, index, sources, clusters] = await Promise.all([
    sql<{
      taken_at: string; pct_typed: string; pct_price_guide: string; total: string; typed: string;
      price_guide: string; unnormalized_titles: string; pending_batch_items: string;
    }>(`SELECT taken_at::text, pct_typed, pct_price_guide, total, typed, price_guide, unnormalized_titles, pending_batch_items
          FROM coverage_snapshots ORDER BY taken_at DESC LIMIT 1`).then((r) => r[0] ?? null),
    indexStats(),
    sql<{ id: string; name: string; kind: string; indexed: boolean; last_scraped_at: string | null; last_scrape_ok: boolean | null; home_url: string | null }>(
      `SELECT id, name, kind::text AS kind, indexed, last_scraped_at::text, last_scrape_ok, home_url FROM sources ORDER BY name`),
    sql<{ publishable: string; indexable: string; last_built_at: string | null }>(
      `SELECT count(*) FILTER (WHERE canonical_type <> 'Other' AND canonical_brand <> 'Unknown'
                                 AND (coalesce(sold_count,0) >= ${SOLD_MIN_FOR_REFERENCE} OR coalesce(asking_count,0) >= ${ASKING_MIN_FOR_REFERENCE}))::text AS publishable,
              count(*) FILTER (WHERE canonical_type <> 'Other' AND canonical_brand <> 'Unknown'
                                 AND coalesce(sold_count,0) >= ${SOLD_MIN_FOR_REFERENCE})::text AS indexable,
              max(last_built_at)::text AS last_built_at
         FROM price_stats`).then((r) => r[0]),
  ]);

  return {
    api_version: API_VERSION,
    docs_url: DOCS_URL,
    openapi_url: OPENAPI_URL,
    policy_url: LICENSE_URL,
    mcp_url: `${SITE_URL}/mcp`,
    what_this_is: 'Public statistics and listings for used woodworking hand tools and machines, aggregated from dealers, forums and marketplaces. Benchlot is not a marketplace, holds no inventory and takes no commission.',
    coverage: snapshot ? {
      as_of: iso(snapshot.taken_at),
      listings_total: Number(snapshot.total),
      listings_with_type: Number(snapshot.typed),
      pct_with_type: Number(snapshot.pct_typed),
      listings_in_price_guide: Number(snapshot.price_guide),
      pct_in_price_guide: Number(snapshot.pct_price_guide),
      titles_awaiting_normalization: Number(snapshot.unnormalized_titles),
      note: 'A listing enters the price guide once it has a type, a known maker and a price, and is neither a multi-item lot nor a parts listing.',
    } : null,
    index: {
      for_sale_now: index.activeCount,
      recorded_sales: index.soldCount,
      last_seen_at: iso(index.lastScrapedAt),
      sources_live: index.sourceCount,
    },
    price_guide: {
      pages_published: Number(clusters.publishable),
      pages_with_8_plus_sales: Number(clusters.indexable),
      last_built_at: iso(clusters.last_built_at),
      thresholds: {
        sold_min_for_median: SOLD_MIN_FOR_REFERENCE,
        asking_min_for_reference: ASKING_MIN_FOR_REFERENCE,
        sold_min_for_high_confidence: 20,
        active_window_days: FRESH_DAYS,
        asking_window_days: 365,
      },
    },
    sources: sources.map((s) => ({
      id: s.id, name: s.name, kind: s.kind, url: s.home_url,
      searchable: s.indexed, last_scraped_at: iso(s.last_scraped_at), last_scrape_ok: s.last_scrape_ok,
      for_sale_now: index.sourceCounts[s.id] ?? 0,
    })),
    vocabulary: { types: CANONICAL_TYPES.filter((t) => t !== 'Other'), types_url: `${SITE_URL}/api/v1/types` },
    licensing: {
      attribution_required: true,
      ebay_price_ttl_hours: 24,
      reddit_attribution: 'via r/handtools',
      no_affiliate_links: true,
    },
  };
}
