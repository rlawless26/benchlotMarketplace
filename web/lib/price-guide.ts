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
  grain: Grain;
  canonical_type: string | null;
  canonical_brand: string | null;
  canonical_size: string | null;
  canonical_model: string | null;
  plane_type_number: number | null;
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
  grain IN ('coarse', 'fine', 'model-fine', 'type-fine')
  AND canonical_type IS NOT NULL AND canonical_type <> 'Other'
  AND canonical_brand IS NOT NULL AND canonical_brand <> 'Unknown'
  AND (sold_count >= ${SOLD_MIN_FOR_REFERENCE} OR asking_count >= ${ASKING_MIN_FOR_REFERENCE})
`;

/**
 * Publishable pages that are also worth Google's attention. Ask-only pages
 * (fewer than 8 sales) stay live for the for-sale list and the alert form,
 * but carry noindex and are left out of the sitemap: with 248 sitemap URLs
 * sitting at "Discovered, currently not indexed" a month in, every thin page
 * in the sitemap was costing the strong ones crawl attention.
 */
const INDEXABLE = `coalesce(sold_count, 0) >= ${SOLD_MIN_FOR_REFERENCE}`;

export const isIndexable = (c: { sold_count: number | null }) =>
  (c.sold_count ?? 0) >= SOLD_MIN_FOR_REFERENCE;

/** Grains that get a URL. type-fine hangs off model-fine as a fourth segment. */
export type Grain = 'coarse' | 'fine' | 'model-fine' | 'type-fine';

export type ClusterRef = {
  cluster_key: string;
  grain: Grain;
  typeSlug: string;
  brandSlug: string;
  /** Third URL segment for a size page, e.g. "10-inch". */
  sizeSlug: string | null;
  /** Third URL segment for a model page, e.g. "no-4". Never set with sizeSlug. */
  modelSlug: string | null;
  /** Fourth URL segment "type-N" on a plane-type page. */
  planeType: number | null;
  canonical_type: string;
  canonical_brand: string;
  canonical_size: string | null;
  canonical_model: string | null;
  sold_count: number;
  asking_count: number;
};

type RefRow = {
  cluster_key: string; canonical_type: string; canonical_brand: string;
  canonical_size: string | null; canonical_model: string | null;
  sold_count: number | null; asking_count: number | null;
};
const REF_COLUMNS = `cluster_key, canonical_type, canonical_brand, canonical_size, canonical_model, sold_count, asking_count`;

/**
 * Cluster keys, as rebuild_price_stats() writes them:
 *   pt::type::brand::_                 coarse
 *   pt::type::brand::<size>            fine
 *   pt::type::brand::m-<model>         model-fine
 *   pt::type::brand::m-<model>::t-<n>  type-fine
 */
function toRef(r: RefRow): ClusterRef {
  const p = r.cluster_key.split('::');
  const third = p[3] ?? '_';
  const isModel = third.startsWith('m-');
  const typeMatch = /^t-(\d{1,2})$/.exec(p[4] ?? '');
  const grain: Grain = typeMatch ? 'type-fine' : isModel ? 'model-fine' : third === '_' ? 'coarse' : 'fine';
  return {
    cluster_key: r.cluster_key,
    grain,
    typeSlug: p[1],
    brandSlug: p[2],
    sizeSlug: !isModel && third !== '_' ? third : null,
    modelSlug: isModel ? third.slice(2) : null,
    planeType: typeMatch ? Number(typeMatch[1]) : null,
    canonical_type: r.canonical_type,
    canonical_brand: r.canonical_brand,
    canonical_size: r.canonical_size,
    canonical_model: r.canonical_model,
    sold_count: r.sold_count ?? 0,
    asking_count: r.asking_count ?? 0,
  };
}

export async function listPublishableClusters(
  opts: { indexableOnly?: boolean; grains?: Grain[] } = {}
): Promise<ClusterRef[]> {
  const conds = [PUBLISHABLE];
  const params: unknown[] = [];
  if (opts.indexableOnly) conds.push(INDEXABLE);
  if (opts.grains) { params.push(opts.grains); conds.push(`grain = ANY($${params.length})`); }
  const rows = await sql<RefRow>(
    `SELECT ${REF_COLUMNS}
     FROM price_stats
     WHERE ${conds.join(' AND ')}
     ORDER BY coalesce(sold_count,0) DESC, coalesce(asking_count,0) DESC`,
    params
  );
  return rows.map(toRef);
}

/**
 * Resolve a guide URL to a cluster, or null.
 *
 * The third segment is shared by size pages ("10-inch") and model pages
 * ("no-4"). Models are tried first: a real size never looks like a model, and
 * the stats rebuild drops model-shaped "sizes" ("No. 4 1/2" as a size is
 * normalizer noise) so the two cannot both be publishable at one URL. The
 * fourth segment is only ever "type-N" under a model page.
 *
 * Filtered by PUBLISHABLE on purpose: before 2026-09-22 any key in
 * price_stats rendered and was indexable, including one-sale clusters and the
 * raw "m-no-4" model keys.
 */
export async function getCluster(
  typeSlug: string,
  brandSlug: string,
  third?: string,
  fourth?: string
): Promise<Cluster | null> {
  const base = `pt::${typeSlug}::${brandSlug}`;
  let keys: string[];
  if (fourth) {
    const m = /^type-(\d{1,2})$/.exec(fourth);
    if (!m || !third) return null;
    keys = [`${base}::m-${third}::t-${Number(m[1])}`];
  } else if (third) {
    keys = [`${base}::m-${third}`, `${base}::${third}`];
  } else {
    keys = [`${base}::_`];
  }
  const rows = await sql<Cluster>(
    `SELECT cluster_key, grain, canonical_type, canonical_brand, canonical_size, canonical_model,
            plane_type_number,
            sold_count, sold_mean, sold_p10, sold_p25, sold_p50, sold_p75, sold_p90, sold_by_kind,
            asking_count, asking_count_active, asking_mean, asking_p25, asking_p50, asking_p75,
            asking_by_kind, last_built_at
     FROM price_stats
     WHERE cluster_key = ANY($1) AND ${PUBLISHABLE}
     ORDER BY array_position($1::text[], cluster_key)
     LIMIT 1`,
    [keys]
  );
  return rows[0] ?? null;
}

/**
 * Listing-table predicate for a cluster's scope, appended to the exact
 * (type, brand) match every query starts from. Mirrors the grain definitions
 * in rebuild_price_stats(): a size page filters on canonical_size, a model
 * page on canonical_model, a type page on both model and plane_type_number.
 */
function scopeClause(c: Cluster, params: unknown[]): string {
  let out = '';
  if (c.grain === 'fine' && c.canonical_size) {
    params.push(c.canonical_size);
    out += ` AND l.canonical_size = $${params.length}`;
  }
  if ((c.grain === 'model-fine' || c.grain === 'type-fine') && c.canonical_model) {
    params.push(c.canonical_model);
    out += ` AND l.canonical_model = $${params.length}`;
  }
  if (c.grain === 'type-fine' && c.plane_type_number) {
    params.push(c.plane_type_number);
    out += ` AND l.plane_type_number = $${params.length}`;
  }
  return out;
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
  first_seen_at: string | null;
  last_seen_at: string;
  /** Sold date for comps, listed date for active rows. Never null. */
  dated_at: string;
};

/**
 * Comp eligibility, shared with rebuild_price_stats() through the SQL
 * functions in migration/schema/009. The page must never show a row the
 * figures above it excluded, so this predicate is the only one either side
 * uses. `l` is the listings alias.
 */
const ELIGIBLE = `NOT bl_is_junk(l.title_raw, l.condition_raw) AND NOT bl_is_lot(l.title_raw)`;

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
  const sizeClause = scopeClause(c, params);
  params.push(limit);

  // Sold rows: the same sale sits in both jimbode and jimbode_valueguide, so
  // collapse identical (title, price) pairs exactly as the stats rebuild does.
  // Jim Bode's Value Guide never stamps sold_at (it publishes the sale date as
  // posted_at), which is why the sort and the displayed date both go through
  // dated_at rather than sold_at -- sorting on one and showing the other is
  // what scrambled the table.
  const dated =
    status === 'sold'
      ? `COALESCE(l.sold_at, l.posted_at, l.last_seen_at)`
      : `COALESCE(l.posted_at, l.first_seen_at, l.last_seen_at)`;

  return sql<Listing>(
    `SELECT * FROM (
       SELECT DISTINCT ON (lower(btrim(l.title_raw)), COALESCE(l.sold_price_cents, l.price_cents))
              l.id::text, l.source, s.name AS source_name, s.kind::text AS source_kind,
              l.source_url, l.title_raw,
              COALESCE(l.sold_price_cents, l.price_cents) AS price_cents,
              l.condition_raw, l.images, l.location_display,
              l.posted_at, l.sold_at, l.first_seen_at, l.last_seen_at,
              ${dated} AS dated_at
       FROM listings l JOIN sources s ON s.id = l.source
       WHERE l.canonical_type = $1 AND l.canonical_brand = $2 AND l.status = $3::listing_status
         AND l.price_cents IS NOT NULL AND ${ELIGIBLE}${sizeClause}
       ORDER BY lower(btrim(l.title_raw)), COALESCE(l.sold_price_cents, l.price_cents),
                l.sold_at DESC NULLS LAST, l.posted_at DESC NULLS LAST
     ) d
     ORDER BY d.dated_at DESC
     LIMIT $${params.length}`,
    params
  );
}

export const soldComps = (c: Cluster, limit = 24) => listingsFor(c, 'sold', limit);
export const activeListings = (c: Cluster, limit = 24) => listingsFor(c, 'active', limit);

/** Other brands making the same tool -- internal links Google can follow. */
export async function relatedClusters(c: Cluster, limit = 8): Promise<ClusterRef[]> {
  const rows = await sql<RefRow>(
    `SELECT ${REF_COLUMNS}
     FROM price_stats
     WHERE ${PUBLISHABLE} AND grain = 'coarse' AND canonical_type = $1 AND canonical_brand <> $2
     ORDER BY coalesce(sold_count,0) DESC LIMIT $3`,
    [c.canonical_type, c.canonical_brand, limit]
  );
  return rows.map(toRef);
}

export function clusterPath(c: {
  typeSlug: string; brandSlug: string; sizeSlug: string | null;
  modelSlug?: string | null; planeType?: number | null;
}) {
  const third = c.modelSlug ?? c.sizeSlug;
  if (!third) return `/guide/${c.typeSlug}/${c.brandSlug}`;
  const base = `/guide/${c.typeSlug}/${c.brandSlug}/${third}`;
  return c.modelSlug && c.planeType ? `${base}/type-${c.planeType}` : base;
}

type Nameable = {
  canonical_brand: string | null; canonical_type: string | null; canonical_size: string | null;
  canonical_model?: string | null; plane_type_number?: number | null; planeType?: number | null;
};
const typeNo = (c: Nameable) => c.plane_type_number ?? c.planeType ?? null;

export function clusterTitle(c: Nameable) {
  const t = typeNo(c);
  return [c.canonical_brand, c.canonical_model, t ? `Type ${t}` : null, c.canonical_type, c.canonical_size]
    .filter(Boolean).join(' ');
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
  const sizeClause = scopeClause(c, params);
  const rows = await sql<{ offer_count: string; low_cents: number | null; high_cents: number | null }>(
    `SELECT count(*)::text AS offer_count, min(price_cents) AS low_cents, max(price_cents) AS high_cents
     FROM listings l
     WHERE l.canonical_type = $1 AND l.canonical_brand = $2
       AND l.status = 'active' AND l.price_cents IS NOT NULL AND ${ELIGIBLE}${sizeClause}`,
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
  const sizeClause = scopeClause(c, params);
  return sql<SoldPoint>(
    `SELECT * FROM (
       SELECT DISTINCT ON (lower(btrim(l.title_raw)), COALESCE(l.sold_price_cents, l.price_cents))
              l.id::text, COALESCE(l.sold_price_cents, l.price_cents) AS price_cents,
              s.kind::text AS source_kind, s.name AS source_name, l.title_raw
       FROM listings l JOIN sources s ON s.id = l.source
       WHERE l.canonical_type = $1 AND l.canonical_brand = $2
         AND l.status = 'sold' AND l.price_cents IS NOT NULL AND l.price_cents > 0
         AND ${ELIGIBLE}${sizeClause}
       ORDER BY lower(btrim(l.title_raw)), COALESCE(l.sold_price_cents, l.price_cents)
     ) d
     ORDER BY d.price_cents
     LIMIT 2000`,
    params
  );
}


// ---------------------------------------------------------------------------
// Wording
// ---------------------------------------------------------------------------

const PLURAL_EXCEPTIONS: Record<string, string> = {
  Knife: 'Knives',
  Drawknife: 'Drawknives',
  Pliers: 'Pliers',
  Domino: 'Domino joiners',
  CNC: 'CNC machines',
  Workbench: 'Workbenches',
};

/** "Bench Plane" -> "Bench Planes", "Drill Press" -> "Drill Presses", "Knife" -> "Knives". */
export function typePlural(type: string): string {
  if (PLURAL_EXCEPTIONS[type]) return PLURAL_EXCEPTIONS[type];
  const i = type.lastIndexOf(' ');
  const head = i >= 0 ? type.slice(0, i + 1) : '';
  const last = i >= 0 ? type.slice(i + 1) : type;
  if (PLURAL_EXCEPTIONS[last]) return head + PLURAL_EXCEPTIONS[last];
  if (/(s|x|z|ch|sh)$/i.test(last)) return head + last + 'es';
  if (/[^aeiou]y$/i.test(last)) return head + last.slice(0, -1) + 'ies';
  return head + last + 's';
}

/** Lower-cases a type for running text but leaves initialisms ("CNC") alone. */
export function typeLower(type: string): string {
  return type
    .split(' ')
    .map((w) => (w.length <= 4 && w === w.toUpperCase() ? w : w.toLowerCase()))
    .join(' ');
}

/**
 * The cluster as it reads in a sentence: "Preston moulding planes",
 * "Bridge City 24 inch rules". Brand keeps its own casing.
 */
export function clusterPhrase(c: Nameable): string {
  const type = c.canonical_type ? typeLower(typePlural(c.canonical_type)) : 'tools';
  const t = typeNo(c);
  return [c.canonical_brand, c.canonical_model, t ? `Type ${t}` : null, c.canonical_size, type]
    .filter(Boolean).join(' ');
}

/** Singular attributive form for headings: "Preston moulding plane prices". */
export function clusterPhraseSingular(c: Nameable): string {
  const type = c.canonical_type ? typeLower(c.canonical_type) : 'tool';
  const t = typeNo(c);
  return [c.canonical_brand, c.canonical_model, t ? `Type ${t}` : null, c.canonical_size, type]
    .filter(Boolean).join(' ');
}

/**
 * Strips dealer stock numbers and "AS OF <date>" suffixes from a listing
 * title: "Rare PRESTON No. 13935 Beader - 119406" -> "Rare PRESTON No. 13935
 * Beader". Model numbers inside the title ("No. 13935") are untouched because
 * the suffix has to trail a dash, equals or asterisk at the very end.
 */
export function cleanTitle(title: string): string {
  let s = title.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i++) {
    const before = s;
    s = s
      .replace(/\s*[-–—=*]+\s*AS OF [A-Z]{3,9}\.?\s*\d{1,2}\s*$/i, '')
      .replace(/\s*[-–—=*]+\s*(EXCELSIOR\s+)?#?\d{4,6}[A-Z]{0,2}\s*$/, '')
      .replace(/\s*[-–—=*]+\s*$/, '')
      .trim();
    if (s === before) break;
  }
  return s || title;
}

// ---------------------------------------------------------------------------
// Per-page facts: what is unique about THIS cluster's evidence
// ---------------------------------------------------------------------------

export type ClusterFacts = {
  /** Eligible, de-duplicated sold comps by source, most first. */
  sources: { name: string; n: number }[];
  total: number;
  firstAt: string | null;
  lastAt: string | null;
  /** Comps dated within the last 365 days. */
  recent: number;
  /** Sold rows dropped because they were sets, pairs or lots. */
  lotsExcluded: number;
  /** Sold rows dropped as parts / as-is / project. */
  junkExcluded: number;
};

export async function clusterFacts(c: Cluster): Promise<ClusterFacts> {
  const params: unknown[] = [c.canonical_type, c.canonical_brand];
  const sizeClause = scopeClause(c, params);
  // One round trip: the per-source rows, plus a single summary row (name NULL)
  // carrying the exclusion counts. Two queries doubled the pool pressure on a
  // page that already issues seven others.
  const rows = await sql<{
    name: string | null; n: string; first_at: string | null; last_at: string | null;
    recent: string; lots: string; junk: string;
  }>(
    `WITH sold AS (
       SELECT l.title_raw, l.condition_raw, l.source, l.sold_at, l.posted_at,
              COALESCE(l.sold_price_cents, l.price_cents) AS price_cents
       FROM listings l
       WHERE l.canonical_type = $1 AND l.canonical_brand = $2 AND l.status = 'sold'
         AND l.price_cents IS NOT NULL${sizeClause}
     ),
     eligible AS (
       SELECT DISTINCT ON (lower(btrim(l.title_raw)), l.price_cents)
              s.name, COALESCE(l.sold_at, l.posted_at) AS dated_at
       FROM sold l JOIN sources s ON s.id = l.source
       WHERE NOT bl_is_junk(l.title_raw, l.condition_raw) AND NOT bl_is_lot(l.title_raw)
       ORDER BY lower(btrim(l.title_raw)), l.price_cents, l.sold_at DESC NULLS LAST
     )
     SELECT name, count(*)::text AS n,
            min(dated_at)::text AS first_at, max(dated_at)::text AS last_at,
            count(*) FILTER (WHERE dated_at > now() - interval '365 days')::text AS recent,
            '0' AS lots, '0' AS junk
     FROM eligible GROUP BY name
     UNION ALL
     SELECT NULL, '0', NULL, NULL, '0',
            count(*) FILTER (WHERE bl_is_lot(title_raw))::text,
            count(*) FILTER (WHERE bl_is_junk(title_raw, condition_raw) AND NOT bl_is_lot(title_raw))::text
     FROM sold
     ORDER BY 1 NULLS LAST`,
    params
  );

  const bySource = rows.filter((r) => r.name !== null);
  const summary = rows.find((r) => r.name === null);
  const sources = bySource
    .map((r) => ({ name: r.name as string, n: Number(r.n) }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  const dates = bySource.flatMap((r) => [r.first_at, r.last_at]).filter((d): d is string => !!d);
  return {
    sources,
    total: sources.reduce((n, s) => n + s.n, 0),
    firstAt: dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null,
    lastAt: dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null,
    recent: bySource.reduce((n, r) => n + Number(r.recent), 0),
    lotsExcluded: Number(summary?.lots ?? 0),
    junkExcluded: Number(summary?.junk ?? 0),
  };
}

/**
 * Same brand and type at other sizes, plus the brand page itself when this is
 * a size page. Sibling links are how a visitor who landed on "Stanley brace"
 * gets to "Stanley 10 inch brace" without going back to the index.
 */
export async function sizeClusters(c: Cluster, limit = 12): Promise<ClusterRef[]> {
  const rows = await sql<RefRow>(
    `SELECT ${REF_COLUMNS}
     FROM price_stats
     WHERE ${PUBLISHABLE} AND grain IN ('coarse', 'fine')
       AND canonical_type = $1 AND canonical_brand = $2 AND cluster_key <> $3
     ORDER BY (canonical_size IS NULL) DESC, coalesce(sold_count,0) DESC LIMIT $4`,
    [c.canonical_type, c.canonical_brand, c.cluster_key, limit]
  );
  return rows.map(toRef);
}

/**
 * Model pages under the same brand and type: the "By model" list on a brand
 * page, and the "other models" list on a model page. Publishable only; the
 * page itself carries noindex when it is thin.
 */
export async function modelClusters(c: Cluster, limit = 16): Promise<ClusterRef[]> {
  const rows = await sql<RefRow>(
    `SELECT ${REF_COLUMNS}
     FROM price_stats
     WHERE ${PUBLISHABLE} AND grain = 'model-fine'
       AND canonical_type = $1 AND canonical_brand = $2 AND cluster_key <> $3
     ORDER BY coalesce(sold_count,0) DESC LIMIT $4`,
    [c.canonical_type, c.canonical_brand, c.cluster_key, limit]
  );
  return rows.map(toRef);
}

export type TypeRow = ClusterRef & { sold_p50: string | null; publishable: boolean };

/**
 * Plane type-study breakdown for a model (Stanley No. 4: Type 11, 13, 16,
 * 19...). Every type with at least one sale is listed so the table describes
 * the whole model; only the publishable ones link to a page.
 */
export async function typeClusters(c: Cluster): Promise<TypeRow[]> {
  if (!c.canonical_model) return [];
  const rows = await sql<RefRow & { sold_p50: string | null; publishable: boolean }>(
    `SELECT ${REF_COLUMNS}, sold_p50, (${PUBLISHABLE}) AS publishable
     FROM price_stats
     WHERE grain = 'type-fine' AND canonical_type = $1 AND canonical_brand = $2
       AND canonical_model = $3 AND coalesce(sold_count, 0) > 0
     ORDER BY plane_type_number`,
    [c.canonical_type, c.canonical_brand, c.canonical_model]
  );
  return rows.map((r) => ({ ...toRef(r), sold_p50: r.sold_p50, publishable: r.publishable }));
}

/** Maker note, if one has been generated and published for this brand. */
export async function brandNote(brand: string | null): Promise<string | null> {
  if (!brand) return null;
  const rows = await sql<{ note: string }>(
    `SELECT note FROM brand_notes WHERE canonical_brand = $1 AND published`,
    [brand]
  );
  return rows[0]?.note ?? null;
}

/**
 * Header search. Every word typed must appear somewhere in "brand type size",
 * compared with punctuation stripped so "lie nielsen" finds "Lie-Nielsen".
 */
export async function searchClusters(q: string, limit = 60): Promise<ClusterRef[]> {
  const words = q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).slice(0, 6);
  if (words.length === 0) return [];
  const params: unknown[] = [...words, limit];
  const conds = words.map(
    (_, i) => `regexp_replace(lower(canonical_brand || ' ' || coalesce(canonical_model, '') || ' ' || canonical_type || ' ' || coalesce(canonical_size, '')), '[^a-z0-9]+', ' ', 'g') LIKE '%' || $${i + 1} || '%'`
  );
  const rows = await sql<RefRow>(
    `SELECT ${REF_COLUMNS}
     FROM price_stats
     WHERE ${PUBLISHABLE} AND grain IN ('coarse', 'fine', 'model-fine') AND ${conds.join(' AND ')}
     ORDER BY (grain = 'coarse') DESC, coalesce(sold_count,0) DESC, coalesce(asking_count,0) DESC
     LIMIT $${params.length}`,
    params
  );
  return rows.map(toRef);
}

// ---------------------------------------------------------------------------
// Retired URLs
// ---------------------------------------------------------------------------

/**
 * The canonical brand for a slug that no longer has a cluster, or null.
 * Brand spellings merged through brand_aliases (schema/010) keep answering at
 * their old URL with a 301, so nothing Google already indexed goes dark.
 */
export async function resolveBrandAlias(brandSlug: string): Promise<string | null> {
  const rows = await sql<{ slug: string }>(
    `SELECT bl_slug(canonical_brand) AS slug FROM brand_aliases WHERE bl_slug(alias) = $1 LIMIT 1`,
    [brandSlug]
  );
  return rows[0]?.slug ?? null;
}

/**
 * Where a retired guide URL should go, or null when it was never anything.
 * Tries, in order: the brand alias (same type and size), the normalised size
 * ("16oz" -> "16-oz"), and both together.
 */
export async function redirectTarget(
  typeSlug: string, brandSlug: string, sizeSlug?: string, fourth?: string
): Promise<string | null> {
  // Raw model keys ("m-no-4") were reachable before model pages had clean
  // URLs; send them to the clean one.
  if (sizeSlug?.startsWith('m-')) {
    const clean = sizeSlug.slice(2);
    const hit = await getCluster(typeSlug, brandSlug, clean, fourth);
    if (hit) return clusterPath({ typeSlug, brandSlug, sizeSlug: null, modelSlug: clean, planeType: hit.plane_type_number });
  }
  const brand = await resolveBrandAlias(brandSlug);
  const candidates: { b: string; s: string | null }[] = [];
  if (brand) candidates.push({ b: brand, s: sizeSlug ?? null });
  if (sizeSlug) {
    // Re-derive the normalised slug from the retired one ("16oz" -> "16-oz",
    // "9-1-2-inches" -> "9-1-2-inch"). No listing carries the old spelling
    // any more, so this cannot be looked up; it has to be recomputed.
    const rows = await sql<{ slug: string }>(
      `SELECT bl_slug(bl_normalize_size(replace($1, '-', ' '))) AS slug`,
      [sizeSlug]
    );
    const norm = rows[0]?.slug;
    if (norm && norm !== sizeSlug) {
      candidates.push({ b: brandSlug, s: norm });
      if (brand) candidates.push({ b: brand, s: norm });
    }
  }
  for (const c of candidates) {
    const hit = await getCluster(typeSlug, c.b, c.s ?? undefined, fourth);
    if (hit) {
      const isModel = hit.grain === 'model-fine' || hit.grain === 'type-fine';
      return clusterPath({
        typeSlug, brandSlug: c.b,
        sizeSlug: isModel ? null : c.s, modelSlug: isModel ? c.s : null,
        planeType: hit.plane_type_number,
      });
    }
  }
  return null;
}
