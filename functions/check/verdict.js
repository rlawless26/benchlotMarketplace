/**
 * Verdict computation for the unified check flow.
 *
 * Pure function — no Firebase deps. Takes a listing price + a reference
 * distribution from `pickReference()` and returns the band, copy, and
 * approximate percentile to render. Returns null when no reference is
 * available; caller should render an "insufficient comp data" fallback.
 *
 * Internal naming: "verdict" / "band" stay internal-only. Surface copy
 * is what users see.
 */

/**
 * Approximate percentile of `price` within a 5-number summary
 * {p25, p50, p75}, optionally augmented with {p10, p90} when the
 * cluster has n>=20. Linear interpolation between known anchors;
 * extrapolates outside the range with a saturating curve.
 *
 * Used for analytics + display, not for the band selection (bands are
 * direct percentile-cutoff comparisons against the reference fields).
 */
function approxPercentile(price, ref) {
  if (!Number.isFinite(price) || price <= 0) return null;
  const anchors = [];
  if (Number.isFinite(ref.p10)) anchors.push([10, ref.p10]);
  anchors.push([25, ref.p25]);
  anchors.push([50, ref.p50]);
  anchors.push([75, ref.p75]);
  if (Number.isFinite(ref.p90)) anchors.push([90, ref.p90]);

  if (price < anchors[0][1]) {
    // Below smallest anchor — saturate toward 0
    return Math.max(0, Math.round(anchors[0][0] * (price / anchors[0][1])));
  }
  const last = anchors[anchors.length - 1];
  if (price > last[1]) {
    // Above largest anchor — saturate toward 100
    const ratio = Math.min(1, price / last[1] - 1);
    return Math.min(100, Math.round(last[0] + (100 - last[0]) * ratio));
  }
  for (let i = 0; i < anchors.length - 1; i++) {
    const [p1, v1] = anchors[i];
    const [p2, v2] = anchors[i + 1];
    if (price >= v1 && price <= v2) {
      if (v2 === v1) return p1;
      return Math.round(p1 + ((price - v1) / (v2 - v1)) * (p2 - p1));
    }
  }
  return null;
}

/**
 * Compute the verdict for a listing price against a reference distribution.
 *
 * @param {object} input
 * @param {number} input.price        Listing price in dollars (NOT cents)
 * @param {object|null} input.reference  Output of pickReference() — has p25/p50/p75 and optionally p10/p90
 * @returns {{band: string, copy: string, percentile: number|null} | null}
 */
function computeVerdict({ price, reference }) {
  if (!reference) return null;
  if (!Number.isFinite(price) || price <= 0) return null;

  const { p25, p50, p75, p90 } = reference;
  if (!Number.isFinite(p25) || !Number.isFinite(p50) || !Number.isFinite(p75)) return null;

  const percentile = approxPercentile(price, reference);

  // Five bands. The cutoff for `above-market` vs `overpriced` is p90 when
  // the cluster has tail percentiles, otherwise a soft p75*1.1 fallback.
  let band;
  let copy;
  if (price < p25) {
    band = 'below-market';
    copy = 'Looks like a good deal — below typical asking.';
  } else if (price < p50) {
    band = 'fair';
    copy = 'Fair price.';
  } else if (price < p75) {
    band = 'market';
    copy = 'In line with the market.';
  } else if (price < (Number.isFinite(p90) ? p90 : p75 * 1.1)) {
    band = 'above-market';
    copy = 'Asking on the high side.';
  } else {
    band = 'overpriced';
    copy = 'Significantly above market — there are better deals.';
  }

  return { band, copy, percentile };
}

module.exports = {
  computeVerdict,
  approxPercentile,
};
