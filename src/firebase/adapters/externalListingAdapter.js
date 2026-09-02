/**
 * externalListingAdapter
 *
 * Fetches the aggregator search pool from the Postgres-backed /api/search
 * endpoint (served by the benchlot-web project via a rewrite — see the root
 * vercel.json) and reshapes each row to match what <ToolListingCard> expects.
 * The adapter is the only coupling point between the aggregator data model
 * and the legacy marketplace UI.
 *
 * HISTORY: this used to query the `externalListings` Firestore collection
 * directly. Ingest moved to Postgres on 2026-09-01 and Firestore froze, so
 * reading it meant serving a permanently stale index. The function
 * signatures, return shapes, interleave behaviour and sort semantics are
 * unchanged — only the transport moved.
 *
 * `canonical_*` fields may be null on rows the normalizer hasn't reached;
 * we fall back to `heuristic_*` so the UI is populated regardless.
 */

import { sourceDisplayName } from './sources';

const DEFAULT_LIMIT = 60;

// Same-origin in production (benchlot.com rewrites /api/search to the
// benchlot-web project). Local CRA dev has no rewrite, so point directly at
// the deployed API — or a local `next dev` — via env.
const API_BASE = process.env.REACT_APP_SEARCH_API_BASE || '';

// Full US state list (50 states + DC), used to seed the Ships-from filter
// so chips for low-volume states still appear (gated by CheckboxList's
// top-N + Show more pattern).
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL',
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI',
  'WY',
];

/**
 * Reshape one API row (same field names the Firestore docs carried) into a
 * tool-card-compatible object. Exported for tests and callers who already
 * have the raw row. Timestamps arrive as ISO strings; relativeTime() and
 * Date.parse both accept them.
 */
export function adaptExternalListing(docId, data) {
  // Treat the sentinel 'Unknown' as no-brand — don't render "Brand: Unknown"
  // on the card. Canonical null + heuristic 'Unknown' both collapse to null.
  const rawBrand = data.canonical_brand || data.heuristic_brand;
  const brand = rawBrand && rawBrand !== 'Unknown' ? rawBrand : null;
  const type = data.canonical_type || data.heuristic_type || null;
  const priceDollars =
    typeof data.price_cents === 'number' ? data.price_cents / 100 : null;
  const imageUrl = Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : null;

  // Location: state is what filtering keys on. `listing.location` is
  // populated for the existing MapPin UI on the card — falls back through
  // display → state → null so a row with only a state code still renders.
  const locationState = data.location_state || null;
  const locationDisplay = data.location_display || null;
  const cardLocation = locationDisplay || locationState || null;

  return {
    id: docId,
    name: data.title_raw || '(untitled listing)',
    price: priceDollars,
    brand,
    category: type,
    condition: data.condition_raw || null,
    imageUrl,
    images: Array.isArray(data.images) ? data.images.map((url) => ({ url })) : [],
    location: cardLocation,

    // external-mode markers — ToolListingCard reads these when rendering.
    external: true,
    source: data.source,
    source_id: data.source_id,
    source_url: data.source_url,
    sourceName: sourceDisplayName(data.source),

    // location fields — used by the Ships-from filter and card metadata
    location_state: locationState,
    location_display: locationDisplay,

    // raw canonical fields preserved for downstream consumers (search, alerts).
    canonical_brand: data.canonical_brand || null,
    canonical_type: data.canonical_type || null,
    canonical_model: data.canonical_model || null,
    canonical_size: data.canonical_size || null,
    era_estimate: data.era_estimate || null,

    scraped_at: data.scraped_at || null,
    posted_at: data.posted_at || null,
    first_seen_at: data.first_seen_at || null,
  };
}

/**
 * Round-robin interleave arrays of per-source results. Page 1 takes the
 * freshest from each source, then the second-freshest, and so on. Within
 * a source the inner array is already first_seen_at desc — we preserve
 * that order, just rotate which source contributes each slot.
 *
 * Example with three sources:
 *   sources: [[A1, A2, A3], [B1, B2], [C1, C2, C3, C4]]
 *   output:  [A1, B1, C1, A2, B2, C2, A3, C3, C4]
 *
 * Sources with fewer items drop out of the rotation as they exhaust;
 * remaining sources continue contributing until everything is placed.
 */
function interleaveBySource(arrays) {
  const cursors = arrays.map(() => 0);
  const out = [];
  let active = arrays.length;
  while (active > 0) {
    active = 0;
    for (let i = 0; i < arrays.length; i += 1) {
      if (cursors[i] < arrays[i].length) {
        out.push(arrays[i][cursors[i]]);
        cursors[i] += 1;
        if (cursors[i] < arrays[i].length) active += 1;
      }
    }
  }
  return out;
}

/**
 * Fetch the per-source pools in one request. The API returns rows ordered by
 * (source, first_seen_at desc); regrouping by source therefore yields arrays
 * with the same per-source ordering the old per-source Firestore queries
 * produced, which is what the interleave and sorts below depend on.
 */
async function fetchPool({ limit, source, canonicalType, canonicalBrand }) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (source) params.set('source', source);
  if (canonicalType) params.set('type', canonicalType);
  if (canonicalBrand) params.set('brand', canonicalBrand);

  const res = await fetch(`${API_BASE}/api/search?${params.toString()}`);
  if (!res.ok) throw new Error(`search API ${res.status}`);
  const body = await res.json();
  const rows = Array.isArray(body.listings) ? body.listings : [];
  return rows.map((r) => adaptExternalListing(`${r.source}__${r.source_id}`, r));
}

/**
 * Fetch a page of active external listings with optional filters.
 *
 * When no `source` is provided, the pool spans EACH indexed source. The
 * merge strategy depends on `sort`:
 *
 *   - `best` (default) — round-robin interleave across sources. Page 1
 *     takes the freshest from each source, surfacing every source equally
 *     regardless of catalog size. Prevents eBay's volume from drowning out
 *     the others. User-facing label: "Best match".
 *   - `newest` — flat `first_seen_at desc` across the merged pool.
 *   - `price_low` / `price_high` — global sort by price after the merge.
 *
 * @param {object} [opts]
 * @param {number} [opts.limit=60]
 * @param {string} [opts.source]           — restrict to a single source slug
 * @param {string} [opts.canonicalType]    — filter by canonical_type (preferred)
 * @param {string} [opts.canonicalBrand]   — filter by canonical_brand
 * @param {'best'|'newest'|'price_low'|'price_high'} [opts.sort='best']
 * @returns {Promise<{tools: Array}>}
 */
export async function getAggregatedListings(opts = {}) {
  const {
    limit = DEFAULT_LIMIT,
    source,
    canonicalType,
    canonicalBrand,
    sort = 'best',
  } = opts;

  // Price sorts need a larger pool because price_cents is populated
  // inconsistently and sorting is client-side. Cap scales with limit but
  // tops out at 3000 per source — above current catalog size with headroom.
  const poolSize = sort === 'best' || sort === 'newest' ? limit : Math.min(limit * 4, 3000);

  const pool = await fetchPool({ limit: poolSize, source, canonicalType, canonicalBrand });

  let tools;
  if (source || sort !== 'best') {
    tools = pool;
  } else {
    // Regroup the flat (source-ordered) pool into per-source arrays, then
    // round-robin interleave so page 1 shows all sources equally.
    const bySource = new Map();
    for (const t of pool) {
      if (!bySource.has(t.source)) bySource.set(t.source, []);
      bySource.get(t.source).push(t);
    }
    tools = interleaveBySource([...bySource.values()]);
  }

  if (!source && sort === 'newest') {
    tools = [...tools].sort(
      (a, b) => (Date.parse(b.first_seen_at) || 0) - (Date.parse(a.first_seen_at) || 0)
    );
  }

  if (sort === 'price_low') {
    tools = [...tools].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  } else if (sort === 'price_high') {
    tools = [...tools].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
  }

  // Return the full merged pool — the consumer (ResultsState) applies client-
  // side text search + facet filtering and then paginates visible results.
  // Slicing to `limit` here would defeat the whole purpose of the per-source
  // fetch strategy.
  return { tools };
}
