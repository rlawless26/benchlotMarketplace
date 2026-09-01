/**
 * Price-guide data access.
 *
 * Cluster identity mirrors functions/pricestats/cluster.js:
 *   pt::{typeSlug}::{brandSlug}::{sizeSlug}   ('_' when a component is absent)
 *
 * Grains, finest first: type-fine, model-fine, fine (+size), coarse (type+brand).
 * Pages are generated from the `coarse` and `fine` grains, which are the two
 * that carry enough comps to be worth a URL.
 *
 * Display thresholds are the ones the existing product already uses, so a page
 * never shows a price claim the app itself would consider too thin to state.
 */
import { sql } from './db';

export const SOLD_MIN_FOR_REFERENCE = 8;
export const ASKING_MIN_FOR_REFERENCE = 10;

/** Mirror of slug() in functions/pricestats/cluster.js. Keep in sync. */
export function slug(s: string | null | undefined): string {
  if (!s) return '_';
  const out = String(s)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return out || '_';
}

export type Cluster = {
  cluster_key: string;
  grain: string;
  canonical_type: string | null;
  canonical_brand: string | null;
  canonical_size: string | null;
  sold_count: number | null;
  sold_mean: string | null;
  sold_p10: string | null;
  sold_p25: string | null;
  sold_p50: string | null;
  sold_p75: string | null;
  sold_p90: string | null;
  sold_by_kind: Record<string, number | null> | null;
  asking_count: number | null;
  asking_count_active: number | null;
  asking_mean: string | null;
  asking_p25: string | null;
  asking_p50: string | null;
  asking_p75: string | null;
  asking_by_kind: Record<string, number | null> | null;
  last_built_at: string | null;
};

/**
 * Every cluster worth a page: has real evidence behind it, and a tool type
 * specific enough to be a topic. `Other` is excluded deliberately -- it holds
 * 26k listings the hand-tool vocabulary can't name, so "Other Festool" would be
 * a page about nothing.
 */
const PUBLISHABLE = `
  grain IN ('coarse', 'fine')
  AND canonical_type IS NOT NULL AND canonical_type <> 'Other'
  AND canonical_brand IS NOT NULL AND canonical_brand <> 'Unknown'
  AND (sold_count >= ${SOLD_MIN_FOR_REFERENCE} OR asking_count >= ${ASKING_MIN_FOR_REFERENCE})
`;

export type ClusterRef = {
  cluster_key: string;
  typeSlug: string;
  brandSlug: string;
  sizeSlug: string | null;
  canonical_type: string;
  canonical_brand: string;
  canonical_size: string | null;
  sold_count: number;
  asking_count: number;
};

export async function listPublishableClusters(): Promise<ClusterRef[]> {
  const rows = await sql<{
    cluster_key: string; canonical_type: string; canonical_brand: string;
    canonical_size: string | null; sold_count: number | null; asking_count: number | null;
  }>(
    `SELECT cluster_key, canonical_type, canonical_brand, canonical_size,
            sold_count, asking_count
     FROM price_stats
     WHERE ${PUBLISHABLE}
     ORDER BY coalesce(sold_count,0) DESC, coalesce(asking_count,0) DESC`
  );

  return rows.map((r) => {
    const parts = r.cluster_key.split('::'); // pt :: type :: brand :: size
    return {
      cluster_key: r.cluster_key,
      typeSlug: parts[1],
      brandSlug: parts[2],
      sizeSlug: parts[3] === '_' ? null : parts[3],
      canonical_type: r.canonical_type,
      canonical_brand: r.canonical_brand,
      canonical_size: r.canonical_size,
      sold_count: r.sold_count ?? 0,
      asking_count: r.asking_count ?? 0,
    };
  });
}

export async function getCluster(
  typeSlug: string,
  brandSlug: string,
  sizeSlug?: string
): Promise<Cluster | null> {
  const key = `pt::${typeSlug}::${brandSlug}::${sizeSlug || '_'}`;
  const rows = await sql<Cluster>(
    `SELECT cluster_key, grain, canonical_type, canonical_brand, canonical_size,
            sold_count, sold_mean, sold_p10, sold_p25, sold_p50, sold_p75, sold_p90, sold_by_kind,
            asking_count, asking_count_active, asking_mean, asking_p25, asking_p50, asking_p75,
            asking_by_kind, last_built_at
     FROM price_stats WHERE cluster_key = $1`,
    [key]
  );
  return rows[0] ?? null;
}

export type Listing = {
  id: string;
  source: string;
  source_name: string;
  source_kind: string;
  source_url: string;
  title_raw: string;
  price_cents: number | null;
  condition_raw: string | null;
  images: string[];
  location_display: string | null;
  posted_at: string | null;
  sold_at: string | null;
  last_seen_at: string;
};

/**
 * Listings behind a cluster. Queried by exact canonical values rather than by
 * re-deriving slugs in SQL -- exact equality is what the composite indexes on
 * (status, canonical_type, ...) can actually serve.
 */
async function listingsFor(
  c: Cluster,
  status: 'sold' | 'active',
  limit: number
): Promise<Listing[]> {
  const params: unknown[] = [c.canonical_type, c.canonical_brand, status];
  let sizeClause = '';
  if (c.canonical_size) {
    params.push(c.canonical_size);
    sizeClause = ` AND l.canonical_size = $${params.length}`;
  }
  params.push(limit);

  return sql<Listing>(
    `SELECT l.id::text, l.source, s.name AS source_name, s.kind::text AS source_kind,
            l.source_url, l.title_raw, l.price_cents, l.condition_raw, l.images,
            l.location_display, l.posted_at, l.sold_at, l.last_seen_at
     FROM listings l JOIN sources s ON s.id = l.source
     WHERE l.canonical_type = $1 AND l.canonical_brand = $2 AND l.status = $3::listing_status
       AND l.price_cents IS NOT NULL${sizeClause}
     ORDER BY ${status === 'sold' ? 'coalesce(l.sold_at, l.last_seen_at)' : 'l.last_seen_at'} DESC
     LIMIT $${params.length}`,
    params
  );
}

export const soldComps = (c: Cluster, limit = 24) => listingsFor(c, 'sold', limit);
export const activeListings = (c: Cluster, limit = 24) => listingsFor(c, 'active', limit);

/** Other brands making the same tool -- internal links Google can follow. */
export async function relatedClusters(c: Cluster, limit = 8): Promise<ClusterRef[]> {
  const rows = await sql<{
    cluster_key: string; canonical_type: string; canonical_brand: string;
    canonical_size: string | null; sold_count: number | null; asking_count: number | null;
  }>(
    `SELECT cluster_key, canonical_type, canonical_brand, canonical_size, sold_count, asking_count
     FROM price_stats
     WHERE ${PUBLISHABLE} AND canonical_type = $1 AND cluster_key <> $2
     ORDER BY coalesce(sold_count,0) DESC LIMIT $3`,
    [c.canonical_type, c.cluster_key, limit]
  );
  return rows.map((r) => {
    const p = r.cluster_key.split('::');
    return {
      cluster_key: r.cluster_key, typeSlug: p[1], brandSlug: p[2],
      sizeSlug: p[3] === '_' ? null : p[3],
      canonical_type: r.canonical_type, canonical_brand: r.canonical_brand,
      canonical_size: r.canonical_size,
      sold_count: r.sold_count ?? 0, asking_count: r.asking_count ?? 0,
    };
  });
}

export function clusterPath(c: { typeSlug: string; brandSlug: string; sizeSlug: string | null }) {
  return c.sizeSlug
    ? `/guide/${c.typeSlug}/${c.brandSlug}/${c.sizeSlug}`
    : `/guide/${c.typeSlug}/${c.brandSlug}`;
}

export function clusterTitle(c: {
  canonical_brand: string | null; canonical_type: string | null; canonical_size: string | null;
}) {
  return [c.canonical_brand, c.canonical_type, c.canonical_size].filter(Boolean).join(' ');
}

export const money = (v: string | number | null | undefined) => {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (Number.isNaN(n)) return null;
  return n >= 1000
    ? `$${Math.round(n).toLocaleString('en-US')}`
    : `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
};

export const centsToMoney = (c: number | null) => (c === null ? null : money(c / 100));

export type ActiveAggregate = {
  offer_count: number;
  low_cents: number | null;
  high_cents: number | null;
};

/**
 * True min/max/count across EVERY priced active listing in the cluster.
 *
 * Structured data must describe the whole cluster, not the sample the page
 * happens to render. Deriving lowPrice/highPrice/offerCount from the displayed
 * 24 rows would contradict the visible listing count on the same page, which is
 * exactly the inconsistency search engines treat as untrustworthy markup.
 */
export async function activeAggregate(c: Cluster): Promise<ActiveAggregate> {
  const params: unknown[] = [c.canonical_type, c.canonical_brand];
  let sizeClause = '';
  if (c.canonical_size) {
    params.push(c.canonical_size);
    sizeClause = ` AND canonical_size = $${params.length}`;
  }
  const rows = await sql<{ offer_count: string; low_cents: number | null; high_cents: number | null }>(
    `SELECT count(*)::text AS offer_count, min(price_cents) AS low_cents, max(price_cents) AS high_cents
     FROM listings
     WHERE canonical_type = $1 AND canonical_brand = $2
       AND status = 'active' AND price_cents IS NOT NULL${sizeClause}`,
    params
  );
  const r = rows[0];
  return {
    offer_count: Number(r?.offer_count ?? 0),
    low_cents: r?.low_cents ?? null,
    high_cents: r?.high_cents ?? null,
  };
}

export type SoldPoint = {
  id: string;
  price_cents: number;
  source_kind: string;
  source_name: string;
  title_raw: string;
};

/**
 * EVERY sold price in the cluster, for the distribution chart.
 *
 * Deliberately not soldComps(): that one is LIMIT 24 for the table, and drawing
 * a distribution from the 24 most recent sales silently truncates it — the
 * chart would claim to describe the cluster while showing a recency-biased
 * slice. Capped at 2000 only as a runaway guard; the largest cluster is far
 * below it.
 */
export async function soldPricePoints(c: Cluster): Promise<SoldPoint[]> {
  const params: unknown[] = [c.canonical_type, c.canonical_brand];
  let sizeClause = '';
  if (c.canonical_size) {
    params.push(c.canonical_size);
    sizeClause = ` AND l.canonical_size = $${params.length}`;
  }
  return sql<SoldPoint>(
    `SELECT l.id::text, l.price_cents, s.kind::text AS source_kind, s.name AS source_name,
            l.title_raw
     FROM listings l JOIN sources s ON s.id = l.source
     WHERE l.canonical_type = $1 AND l.canonical_brand = $2
       AND l.status = 'sold' AND l.price_cents IS NOT NULL AND l.price_cents > 0${sizeClause}
     ORDER BY l.price_cents
     LIMIT 2000`,
    params
  );
}
