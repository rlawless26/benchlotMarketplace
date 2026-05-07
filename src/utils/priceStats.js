/**
 * Client-side mirror of `functions/pricestats/cluster.js`.
 *
 * Cluster-key derivation and reference-block selection for the price
 * guide. Logic must stay byte-for-byte identical to the server-side
 * module so that a key computed in the browser routes to the same
 * priceStats doc the build job wrote. If you change anything here,
 * mirror it in `functions/pricestats/cluster.js`.
 *
 * Trust-first v1 (2026-05-03): NO auto-tier classification. Both Jim
 * Bode-only sold-comp data and asking-block data are too biased on
 * their own to support confident tier judgments. Use the popover to
 * show users both distributions plus per-source-kind breakdowns; let
 * them reason. Auto-tier returns in v2 once stratified data + a
 * condition signal exist.
 */

export const SOLD_MIN_FOR_REFERENCE = 8;
export const ASKING_MIN_FOR_REFERENCE = 10;

export const ASKING_WINDOW_DAYS = 365;
export const SOLD_WINDOW_DAYS = null; // unwindowed by design

export function slug(s) {
  if (!s) return '_';
  const out = String(s)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return out || '_';
}

/**
 * Cluster-key grains (priority order, finest first):
 *   - type-fine    pt::{type}::{brand}::m-{model}::t-{plane_type_number}
 *   - model-fine   pt::{type}::{brand}::m-{model}
 *   - fine         pt::{type}::{brand}::{size}
 *   - coarse       pt::{type}::{brand}::_
 *
 * The `m-` and `t-` prefixes are namespace markers that prevent collision
 * with the existing size-based fine grain.
 */
export function clusterKey({ canonical_type, canonical_brand, canonical_size }) {
  return `pt::${slug(canonical_type)}::${slug(canonical_brand)}::${slug(canonical_size)}`;
}

export function clusterKeyFromSlugs(typeSlug, brandSlug, sizeSlug) {
  return `pt::${typeSlug || '_'}::${brandSlug || '_'}::${sizeSlug || '_'}`;
}

export function buildKeyFromUrlSlugs({ typeSlug, brandSlug, sizeSlug }) {
  return clusterKeyFromSlugs(typeSlug, brandSlug, sizeSlug);
}

export function clusterKeyModel({ canonical_type, canonical_brand, canonical_model }) {
  return `pt::${slug(canonical_type)}::${slug(canonical_brand)}::m-${slug(canonical_model)}`;
}

export function clusterKeyType({ canonical_type, canonical_brand, canonical_model, plane_type_number }) {
  return `pt::${slug(canonical_type)}::${slug(canonical_brand)}::m-${slug(canonical_model)}::t-${plane_type_number}`;
}

export function hasDisplayableStats(stats) {
  if (!stats) return false;
  const sold = (stats.sold_count || 0) >= SOLD_MIN_FOR_REFERENCE;
  const asking = (stats.asking_count || 0) >= ASKING_MIN_FOR_REFERENCE;
  return sold || asking;
}

/**
 * Single popover-headline reference distribution.
 *
 * v1 rule: prefer asking-block when it has comps (broader market mix —
 * dealers, eBay, FB, forums all included), fall back to sold-block.
 * Sold-block is dealer-skewed (Jim Bode-only today) so we don't lead
 * with it, but it's still shown alongside in the popover so users see
 * the gap themselves.
 *
 * Returns null when neither block meets its threshold.
 */
export function pickReference(stats) {
  if (!stats) return null;
  if ((stats.asking_count || 0) >= ASKING_MIN_FOR_REFERENCE) {
    return {
      source: 'asking',
      count: stats.asking_count,
      p25: stats.asking_p25,
      p50: stats.asking_p50,
      p75: stats.asking_p75,
      mean: stats.asking_mean,
    };
  }
  if ((stats.sold_count || 0) >= SOLD_MIN_FOR_REFERENCE) {
    return {
      source: 'sold',
      count: stats.sold_count,
      p25: stats.sold_p25,
      p50: stats.sold_p50,
      p75: stats.sold_p75,
      mean: stats.sold_mean,
    };
  }
  return null;
}

/**
 * Per-source-kind sub-blocks from the priceStats doc, returned as an
 * iterable of `{ kind, count, p25, p50, p75, mean }` for kinds where
 * the build job wrote a non-null sub-block. Used by the popover and
 * /guide pages to show "Dealer $X · Marketplace $Y · Forum $Z".
 *
 * `block` is 'sold' or 'asking'.
 */
export function perKindBlocks(stats, block) {
  if (!stats) return [];
  const root = block === 'sold' ? stats.sold_by_kind : stats.asking_by_kind;
  if (!root || typeof root !== 'object') return [];
  return ['Dealer', 'Marketplace', 'Forum']
    .map((kind) => {
      const sub = root[kind];
      if (!sub || !sub.count) return null;
      return {
        kind,
        count: sub.count,
        p25: sub.p25,
        p50: sub.p50,
        p75: sub.p75,
        mean: sub.mean,
      };
    })
    .filter(Boolean);
}

/**
 * Pick the best-grain reference from an ordered array of priceStats docs.
 * Iterates finest → coarsest (caller-supplied order) and returns the first
 * doc that produces a non-null `pickReference`. Returns null if no doc in
 * the array meets the display thresholds.
 *
 * Typical usage from a consumer:
 *   const docs = await Promise.all([
 *     getStats(clusterKeyType({...})),
 *     getStats(clusterKeyModel({...})),
 *     getStats(clusterKey({...})),       // existing fine grain (size)
 *     getStats(clusterKey({..., canonical_size: null})), // coarse
 *   ]);
 *   const ref = pickReferenceWithFallback(docs);
 */
export function pickReferenceWithFallback(statsDocsInPriorityOrder) {
  if (!Array.isArray(statsDocsInPriorityOrder)) return null;
  for (const stats of statsDocsInPriorityOrder) {
    const ref = pickReference(stats);
    if (ref) return { ...ref, _stats: stats };
  }
  return null;
}
