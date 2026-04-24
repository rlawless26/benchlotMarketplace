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
  };
}

/**
 * Fetch `limit` most-recent active listings for a single source.
 * Shared helper behind both the single-source and multi-source paths.
 */
async function fetchOneSource(sourceId, { limit, canonicalType, canonicalBrand }) {
  const constraints = [
    where('status', '==', 'active'),
    where('source', '==', sourceId),
  ];
  if (canonicalType) constraints.push(where('canonical_type', '==', canonicalType));
  if (canonicalBrand) constraints.push(where('canonical_brand', '==', canonicalBrand));
  constraints.push(orderBy('scraped_at', 'desc'));
  constraints.push(limitQ(limit));
  const snap = await getDocs(query(collection(db, COLLECTION), ...constraints));
  return snap.docs.map((d) => adaptExternalListing(d.id, d.data()));
}

/**
 * Fetch a page of active external listings with optional filters.
 *
 * When no `source` is provided, we fetch a fair share from EACH indexed
 * source in parallel and merge. This prevents whichever source was scraped
 * most recently from monopolizing the scraped_at-ordered pool — critical
 * for client-side text search to see cross-source results.
 *
 * @param {object} [opts]
 * @param {number} [opts.limit=60]
 * @param {string} [opts.source]           — restrict to a single source slug
 * @param {string} [opts.canonicalType]    — filter by canonical_type (preferred)
 * @param {string} [opts.canonicalBrand]   — filter by canonical_brand
 * @param {'newest'|'price_low'|'price_high'} [opts.sort='newest']
 * @returns {Promise<{tools: Array}>}
 */
export async function getAggregatedListings(opts = {}) {
  const {
    limit = DEFAULT_LIMIT,
    source,
    canonicalType,
    canonicalBrand,
    sort = 'newest',
  } = opts;

  // Price sorts need a larger pool because price_cents is populated
  // inconsistently and sorting is client-side. Cap scales with limit but
  // tops out at 3000 per source — above current catalog size with headroom.
  const poolSize = sort === 'newest' ? limit : Math.min(limit * 4, 3000);

  let tools;
  if (source) {
    // Single-source: server-side where('source') handles the restriction.
    tools = await fetchOneSource(source, { limit: poolSize, canonicalType, canonicalBrand });
  } else {
    // Multi-source: fetch `poolSize` from EACH indexed source in parallel,
    // then merge. Giving each source a full poolSize (not poolSize/N) is
    // critical — client-side text search ("stanley") needs the same per-source
    // coverage it'd get under a single-source filter, otherwise "all sources"
    // returns fewer hits than "just Jim Bode". Total reads scale with source
    // count but remain negligible at current volume (2 sources × 200 = 400).
    const indexedSources = SOURCES.filter((s) => s.indexed).map((s) => s.id);
    const resultsPerSource = await Promise.all(
      indexedSources.map((s) => fetchOneSource(s, { limit: poolSize, canonicalType, canonicalBrand }))
    );
    tools = resultsPerSource.flat();
    tools.sort((a, b) => {
      const at = a.scraped_at?.toMillis?.() ?? a.scraped_at?.seconds * 1000 ?? 0;
      const bt = b.scraped_at?.toMillis?.() ?? b.scraped_at?.seconds * 1000 ?? 0;
      return bt - at;
    });
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
