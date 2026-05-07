/**
 * Pure helpers for the price-guide cluster system. Server-side mirror
 * of `src/utils/priceStats.js` — keep them in sync.
 *
 * Cluster identity: a price-guide cluster is uniquely identified by
 * (canonical_type, canonical_brand, canonical_size?). The "fine" grain
 * includes a non-null size; the "coarse" grain omits it. Both grains
 * are written as separate priceStats docs, and consumers fall back from
 * fine to coarse when the fine grain doesn't meet display thresholds.
 *
 * Trust-first v1 (2026-05-03): NO auto-tier classification. Both Jim
 * Bode-only sold-comp data and asking-block data are too biased on
 * their own to support confident tier judgments. The popover shows
 * users both distributions plus per-source-kind breakdowns; let them
 * reason. Auto-tier returns in v2 once stratified data + a condition
 * signal exist.
 */

const SOLD_MIN_FOR_REFERENCE = 8;     // sold-block reference kicks in here
const ASKING_MIN_FOR_REFERENCE = 10;  // asking-block reference kicks in here

const ASKING_WINDOW_DAYS = 365;
const SOLD_WINDOW_DAYS = null;        // sold block is unwindowed by design

/**
 * Lower-case, alphanumeric-and-dash slug. Used to make cluster keys
 * Firestore-doc-ID-safe and to render readable URL slugs.
 */
function slug(s) {
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
 * Build a cluster key from canonical fields. Stable, deterministic.
 * Format: `pt::{typeSlug}::{brandSlug}::{sizeSlug}`
 *
 * Cluster-key grains (in priority order, finest first):
 *   - type-fine    pt::{type}::{brand}::m-{model}::t-{plane_type_number}
 *   - model-fine   pt::{type}::{brand}::m-{model}
 *   - fine         pt::{type}::{brand}::{size}
 *   - coarse       pt::{type}::{brand}::_
 *
 * The `m-` and `t-` prefixes are namespace markers that prevent collision
 * with the existing `(type, brand, size)` fine grain — a model slug like
 * "no-5" sharing the size slot with a literal size string would otherwise
 * occupy the same key.
 */
function clusterKey({ canonical_type, canonical_brand, canonical_size }) {
  return `pt::${slug(canonical_type)}::${slug(canonical_brand)}::${slug(canonical_size)}`;
}

function clusterKeyFromSlugs(typeSlug, brandSlug, sizeSlug) {
  return `pt::${typeSlug || '_'}::${brandSlug || '_'}::${sizeSlug || '_'}`;
}

function buildKeyFromUrlSlugs({ typeSlug, brandSlug, sizeSlug }) {
  return clusterKeyFromSlugs(typeSlug, brandSlug, sizeSlug);
}

/**
 * Model-fine cluster key. Used when canonical_model is non-null — e.g.,
 * Stanley "No. 5" across all type numbers, Lie-Nielsen "No. 4", etc.
 *
 * Distinct from the size-based fine grain: planes typically don't carry
 * a populated canonical_size (the model number IS the size), so the
 * model-fine grain is what produces useful per-model price clusters.
 */
function clusterKeyModel({ canonical_type, canonical_brand, canonical_model }) {
  return `pt::${slug(canonical_type)}::${slug(canonical_brand)}::m-${slug(canonical_model)}`;
}

/**
 * Type-fine cluster key. Used when both canonical_model is non-null and
 * plane_type_number is an integer 1-20 — only Stanley bench planes today.
 *
 * Hyper-fine grain. Sample sizes will be small per cluster; rely on the
 * existing display thresholds (>=8 sold, >=10 asking) and the model-fine
 * fallback for clusters that don't meet them.
 */
function clusterKeyType({ canonical_type, canonical_brand, canonical_model, plane_type_number }) {
  return `pt::${slug(canonical_type)}::${slug(canonical_brand)}::m-${slug(canonical_model)}::t-${plane_type_number}`;
}

/**
 * Predicate — does a priceStats doc have enough comps to surface ANY
 * indicator at all? Used to gate the result-card chip and the per-tool
 * detail page.
 */
function hasDisplayableStats(stats) {
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
function pickReference(stats) {
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
 * Pick the best-grain reference from an ordered array of priceStats docs.
 * Iterates finest → coarsest (caller-supplied order) and returns the first
 * doc that produces a non-null `pickReference`. Returns null if no doc in
 * the array meets the display thresholds.
 *
 * Typical usage from a consumer:
 *   const docs = await Promise.all([
 *     getStats(clusterKeyType({...})),
 *     getStats(clusterKeyModel({...})),
 *     getStats(clusterKey({...})),         // existing fine grain (size)
 *     getStats(clusterKey({..., canonical_size: null})), // coarse
 *   ]);
 *   const ref = pickReferenceWithFallback(docs);
 *
 * The single-doc `pickReference` is unchanged — callers that already have
 * one stats doc and want a reference shape should keep using it.
 */
function pickReferenceWithFallback(statsDocsInPriorityOrder) {
  if (!Array.isArray(statsDocsInPriorityOrder)) return null;
  for (const stats of statsDocsInPriorityOrder) {
    const ref = pickReference(stats);
    if (ref) return { ...ref, _stats: stats };
  }
  return null;
}

module.exports = {
  // constants
  SOLD_MIN_FOR_REFERENCE,
  ASKING_MIN_FOR_REFERENCE,
  ASKING_WINDOW_DAYS,
  SOLD_WINDOW_DAYS,
  // helpers
  slug,
  clusterKey,
  clusterKeyFromSlugs,
  buildKeyFromUrlSlugs,
  clusterKeyModel,
  clusterKeyType,
  hasDisplayableStats,
  pickReference,
  pickReferenceWithFallback,
};
