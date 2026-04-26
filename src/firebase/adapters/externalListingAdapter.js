/**
 * externalListingAdapter
 *
 * Queries the `externalListings` Firestore collection and reshapes each doc
 * to match what <ToolListingCard> expects, without renaming canonical fields
 * in the underlying schema. The adapter is the only coupling point between
 * the aggregator data model and the legacy marketplace UI.
 *
 * During M2 rollout, `canonical_*` fields may be null on some rows (the
 * normalizer trigger hasn't touched them yet). We fall back to
 * `heuristic_*` so the UI is populated even before backfill completes.
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit as limitQ,
  getDocs,
} from 'firebase/firestore';

import { db } from '../config';
import { SOURCES, sourceDisplayName } from './sources';

const COLLECTION = 'externalListings';
const DEFAULT_LIMIT = 60;

/**
 * Reshape one raw Firestore doc into a tool-card-compatible object.
 * Exported for tests and callers who already have the raw doc.
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

  return {
    id: docId,
    name: data.title_raw || '(untitled listing)',
    price: priceDollars,
    brand,
    category: type,
    condition: data.condition_raw || null,
    imageUrl,
    images: Array.isArray(data.images) ? data.images.map((url) => ({ url })) : [],

    // external-mode markers — ToolListingCard reads these when rendering.
    external: true,
    source: data.source,
    source_id: data.source_id,
    source_url: data.source_url,
    sourceName: sourceDisplayName(data.source),

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
 * Fetch `limit` most-recent active listings for a single source, ordered by
 * `first_seen_at desc` — i.e. when Benchlot first ingested the listing.
 *
 * We deliberately use `first_seen_at` rather than `scraped_at`. `scraped_at`
 * gets bumped on every nightly run and clusters all listings from a single
 * source into the same timestamp band, which makes "newest first" surface
 * whichever source ran latest in the cron chain rather than actually-fresh
 * listings. `first_seen_at` is set once on first upsert and never updated,
 * so it cleanly captures "this listing wasn't in our index yesterday."
 *
 * Shared helper behind both the single-source and multi-source paths.
 */
async function fetchOneSource(sourceId, { limit, canonicalType, canonicalBrand }) {
  const constraints = [
    where('status', '==', 'active'),
    where('source', '==', sourceId),
  ];
  if (canonicalType) constraints.push(where('canonical_type', '==', canonicalType));
  if (canonicalBrand) constraints.push(where('canonical_brand', '==', canonicalBrand));
  constraints.push(orderBy('first_seen_at', 'desc'));
  constraints.push(limitQ(limit));
  const snap = await getDocs(query(collection(db, COLLECTION), ...constraints));
  return snap.docs.map((d) => adaptExternalListing(d.id, d.data()));
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
 * Fetch a page of active external listings with optional filters.
 *
 * When no `source` is provided, we fetch a fair share from EACH indexed
 * source in parallel and merge. The merge strategy depends on `sort`:
 *
 *   - `mixed` (default) — round-robin interleave across sources. Page 1
 *     takes the freshest from each source, surfacing all five sources
 *     equally regardless of catalog size. Prevents eBay's volume from
 *     drowning out the other four.
 *   - `newest` — flat `first_seen_at desc` across the merged pool.
 *     Surfaces whichever source has the absolute-newest listings, which
 *     in practice tends to be eBay (highest listing velocity).
 *   - `price_low` / `price_high` — global sort by price after the merge.
 *
 * @param {object} [opts]
 * @param {number} [opts.limit=60]
 * @param {string} [opts.source]           — restrict to a single source slug
 * @param {string} [opts.canonicalType]    — filter by canonical_type (preferred)
 * @param {string} [opts.canonicalBrand]   — filter by canonical_brand
 * @param {'mixed'|'newest'|'price_low'|'price_high'} [opts.sort='mixed']
 * @returns {Promise<{tools: Array}>}
 */
export async function getAggregatedListings(opts = {}) {
  const {
    limit = DEFAULT_LIMIT,
    source,
    canonicalType,
    canonicalBrand,
    sort = 'mixed',
  } = opts;

  // Price sorts need a larger pool because price_cents is populated
  // inconsistently and sorting is client-side. Cap scales with limit but
  // tops out at 3000 per source — above current catalog size with headroom.
  const poolSize = sort === 'mixed' || sort === 'newest' ? limit : Math.min(limit * 4, 3000);

  let tools;
  if (source) {
    // Single-source: server-side where('source') handles the restriction.
    tools = await fetchOneSource(source, { limit: poolSize, canonicalType, canonicalBrand });
  } else {
    // Multi-source: fetch `poolSize` from EACH indexed source in parallel.
    // Each per-source array is already first_seen_at desc — how we merge
    // depends on the sort mode below.
    const indexedSources = SOURCES.filter((s) => s.indexed).map((s) => s.id);
    const resultsPerSource = await Promise.all(
      indexedSources.map((s) => fetchOneSource(s, { limit: poolSize, canonicalType, canonicalBrand }))
    );

    if (sort === 'mixed') {
      // Round-robin interleave so page 1 shows all sources equally.
      tools = interleaveBySource(resultsPerSource);
    } else {
      // Flat newest-first across the merged pool.
      tools = resultsPerSource.flat();
      tools.sort((a, b) => {
        const at = a.first_seen_at?.toMillis?.() ?? a.first_seen_at?.seconds * 1000 ?? 0;
        const bt = b.first_seen_at?.toMillis?.() ?? b.first_seen_at?.seconds * 1000 ?? 0;
        return bt - at;
      });
    }
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
