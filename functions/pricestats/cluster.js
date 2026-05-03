/**
 * Pure helpers for the price-guide cluster system.
 *
 * Cluster identity: a price-guide cluster is uniquely identified by
 * (canonical_type, canonical_brand, canonical_size?). The "fine" grain
 * includes a non-null size; the "coarse" grain omits it. Both grains
 * are written as separate priceStats docs, and consumers fall back from
 * fine to coarse when the fine grain doesn't meet display thresholds.
 *
 * This module is intentionally side-effect-free and dependency-free so it
 * can be imported by Cloud Functions, by Node CLI runners, and (via a
 * mirror file or a shared package later) by the React client.
 */

const SOLD_MIN_FOR_REFERENCE = 8;     // sold-block reference kicks in here
const ASKING_MIN_FOR_REFERENCE = 10;  // asking-block reference kicks in here
const N_FOR_FIVE_TIER = 20;           // p10/p90 only meaningful at n >= 20

const ASKING_WINDOW_DAYS = 365;
const SOLD_WINDOW_DAYS = 730;

/**
 * Lower-case, alphanumeric-and-dash slug. Used to make cluster keys
 * Firestore-doc-ID-safe and to render readable URL slugs.
 *
 * - Diacritics are preserved as-is (Firestore tolerates them); the Latin
 *   antique-tool catalog rarely needs them but "Mathieson" / "Cammeyer"
 *   stay readable.
 * - Empty input returns `'_'` so cluster keys without a size component
 *   stay parseable as a 4-segment string.
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
 *
 * Format: `pt::{typeSlug}::{brandSlug}::{sizeSlug}`
 *
 * Window length is NOT part of the key — both the 365d asking block and
 * the 730d sold block live in the same priceStats doc.
 */
function clusterKey({ canonical_type, canonical_brand, canonical_size }) {
  return `pt::${slug(canonical_type)}::${slug(canonical_brand)}::${slug(canonical_size)}`;
}

/**
 * Inverse of clusterKey — used by URL routing to translate slugs back
 * into Firestore doc IDs. The caller hands us slugs (already trimmed,
 * lowercase, dashed), we just stitch them.
 *
 * sizeSlug is optional — when omitted the coarse cluster key is built.
 */
function clusterKeyFromSlugs(typeSlug, brandSlug, sizeSlug) {
  return `pt::${typeSlug || '_'}::${brandSlug || '_'}::${sizeSlug || '_'}`;
}

/**
 * Quick predicate — does a priceStats doc have enough comps to surface ANY
 * indicator at all? Used to gate the result-card badge and the per-tool
 * detail page.
 */
function hasDisplayableStats(stats) {
  if (!stats) return false;
  const sold = (stats.sold_count || 0) >= SOLD_MIN_FOR_REFERENCE;
  const asking = (stats.asking_count || 0) >= ASKING_MIN_FOR_REFERENCE;
  return sold || asking;
}

/**
 * Choose which block (sold or asking) is the reference distribution for
 * a given priceStats doc.
 *
 * Rule: prefer sold when it has enough comps (sold_count >= 8). Otherwise
 * fall back to asking when it has enough comps (asking_count >= 10).
 * Returns null when neither qualifies.
 *
 * Returned shape:
 *   { source: 'sold' | 'asking',
 *     count: number,
 *     p10, p25, p50, p75, p90, mean }
 *
 * `p10` / `p90` may be null when the chosen block has 10 <= n < 20 — the
 * 5-tier badge degrades to 3-tier in that case.
 */
function pickReference(stats) {
  if (!stats) return null;
  if ((stats.sold_count || 0) >= SOLD_MIN_FOR_REFERENCE) {
    return {
      source: 'sold',
      count: stats.sold_count,
      p10: stats.sold_p10 ?? null,
      p25: stats.sold_p25,
      p50: stats.sold_p50,
      p75: stats.sold_p75,
      p90: stats.sold_p90 ?? null,
      mean: stats.sold_mean,
    };
  }
  if ((stats.asking_count || 0) >= ASKING_MIN_FOR_REFERENCE) {
    return {
      source: 'asking',
      count: stats.asking_count,
      p10: stats.asking_p10 ?? null,
      p25: stats.asking_p25,
      p50: stats.asking_p50,
      p75: stats.asking_p75,
      p90: stats.asking_p90 ?? null,
      mean: stats.asking_mean,
    };
  }
  return null;
}

/**
 * Tier classification for a single listing's price against a chosen
 * reference block. Returns one of:
 *   'sleeper' | 'good_deal' | 'fair' | 'high' | 'overpriced'
 *   'below_market' | 'around_market' | 'above_market'   (3-tier fallback)
 *   null                                                 (no badge)
 *
 * 5-tier rules (when reference.count >= 20 AND p10/p90 populated):
 *   < p10        → 'sleeper'      (top tier, prominent)
 *   [p10, p25)   → 'good_deal'
 *   [p25, p75]   → 'fair'
 *   (p75, p90]   → 'high'
 *   > p90        → 'overpriced'
 *
 * 3-tier fallback (10 <= count < 20):
 *   < p25        → 'below_market'
 *   [p25, p75]   → 'around_market'
 *   > p75        → 'above_market'
 *
 * Returns null when listingPrice is missing or reference is missing.
 */
function classifyDealTier(listingPrice, reference) {
  if (!reference) return null;
  if (typeof listingPrice !== 'number' || !Number.isFinite(listingPrice)) return null;

  const useFiveTier =
    reference.count >= N_FOR_FIVE_TIER &&
    reference.p10 != null &&
    reference.p90 != null;

  if (useFiveTier) {
    if (listingPrice < reference.p10) return 'sleeper';
    if (listingPrice < reference.p25) return 'good_deal';
    if (listingPrice <= reference.p75) return 'fair';
    if (listingPrice <= reference.p90) return 'high';
    return 'overpriced';
  }

  // 3-tier fallback uses the same p25/p75 from the reference block.
  if (listingPrice < reference.p25) return 'below_market';
  if (listingPrice <= reference.p75) return 'around_market';
  return 'above_market';
}

/**
 * Map slug-style URL params back to the canonical fields the build job
 * uses to compute keys. Used by the per-tool guide page route. We can't
 * recover the original casing/punctuation from a slug alone — but the
 * build job writes both `cluster_key` AND the canonical_* fields on each
 * priceStats doc, so the URL slug only needs to round-trip through the
 * key.
 */
function buildKeyFromUrlSlugs({ typeSlug, brandSlug, sizeSlug }) {
  return clusterKeyFromSlugs(typeSlug, brandSlug, sizeSlug);
}

module.exports = {
  // constants
  SOLD_MIN_FOR_REFERENCE,
  ASKING_MIN_FOR_REFERENCE,
  N_FOR_FIVE_TIER,
  ASKING_WINDOW_DAYS,
  SOLD_WINDOW_DAYS,
  // helpers
  slug,
  clusterKey,
  clusterKeyFromSlugs,
  buildKeyFromUrlSlugs,
  hasDisplayableStats,
  pickReference,
  classifyDealTier,
};
