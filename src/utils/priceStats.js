/**
 * Client-side mirror of `functions/pricestats/cluster.js`.
 *
 * Cluster-key derivation, reference-block selection, and tier classification
 * for the price-guide system. Logic must stay byte-for-byte identical to
 * the server-side module so that a key computed in the browser routes to
 * the same priceStats doc the build job wrote.
 *
 * If you change anything here, mirror it in
 *   functions/pricestats/cluster.js
 * and vice versa.
 */

export const SOLD_MIN_FOR_REFERENCE = 8;
export const ASKING_MIN_FOR_REFERENCE = 10;
export const N_FOR_FIVE_TIER = 20;

export const ASKING_WINDOW_DAYS = 365;
export const SOLD_WINDOW_DAYS = 730;

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

export function clusterKey({ canonical_type, canonical_brand, canonical_size }) {
  return `pt::${slug(canonical_type)}::${slug(canonical_brand)}::${slug(canonical_size)}`;
}

export function clusterKeyFromSlugs(typeSlug, brandSlug, sizeSlug) {
  return `pt::${typeSlug || '_'}::${brandSlug || '_'}::${sizeSlug || '_'}`;
}

export function buildKeyFromUrlSlugs({ typeSlug, brandSlug, sizeSlug }) {
  return clusterKeyFromSlugs(typeSlug, brandSlug, sizeSlug);
}

export function hasDisplayableStats(stats) {
  if (!stats) return false;
  const sold = (stats.sold_count || 0) >= SOLD_MIN_FOR_REFERENCE;
  const asking = (stats.asking_count || 0) >= ASKING_MIN_FOR_REFERENCE;
  return sold || asking;
}

export function pickReference(stats) {
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
 * Returns one of the canonical tier ids:
 *   '5-tier': 'sleeper' | 'good_deal' | 'fair' | 'high' | 'overpriced'
 *   '3-tier': 'below_market' | 'around_market' | 'above_market'
 *   null if no badge should render
 */
export function classifyDealTier(listingPrice, reference) {
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

  if (listingPrice < reference.p25) return 'below_market';
  if (listingPrice <= reference.p75) return 'around_market';
  return 'above_market';
}

/** Human-readable label for each tier. */
export const TIER_LABELS = {
  sleeper: 'Sleeper',
  good_deal: 'Good deal',
  fair: 'Fair',
  high: 'High',
  overpriced: 'Overpriced',
  below_market: 'Below market',
  around_market: 'Around market',
  above_market: 'Above market',
};
