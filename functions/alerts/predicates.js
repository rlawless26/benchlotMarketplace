/**
 * Pure predicate functions that decide whether a listing satisfies a saved
 * search's query + filters. Shared between the matcher (server) and any
 * future preview logic. No Firestore SDK imports — pure objects in, boolean
 * out, so it's trivially testable.
 */

// Census Bureau 4-region split (DC bucketed with South). Mirrored client-side
// in `src/firebase/adapters/externalListingAdapter.js` — small + stable, no
// shared util because the ESM/CJS divide makes that more trouble than it's
// worth at our scale.
const STATE_TO_REGION = {
  CT: 'Northeast', ME: 'Northeast', MA: 'Northeast', NH: 'Northeast',
  NJ: 'Northeast', NY: 'Northeast', PA: 'Northeast', RI: 'Northeast',
  VT: 'Northeast',
  IL: 'Midwest', IN: 'Midwest', IA: 'Midwest', KS: 'Midwest',
  MI: 'Midwest', MN: 'Midwest', MO: 'Midwest', NE: 'Midwest',
  ND: 'Midwest', OH: 'Midwest', SD: 'Midwest', WI: 'Midwest',
  AL: 'South', AR: 'South', DE: 'South', DC: 'South', FL: 'South',
  GA: 'South', KY: 'South', LA: 'South', MD: 'South', MS: 'South',
  NC: 'South', OK: 'South', SC: 'South', TN: 'South', TX: 'South',
  VA: 'South', WV: 'South',
  AK: 'West', AZ: 'West', CA: 'West', CO: 'West', HI: 'West',
  ID: 'West', MT: 'West', NV: 'West', NM: 'West', OR: 'West',
  UT: 'West', WA: 'West', WY: 'West',
};

function regionForState(state) {
  if (!state) return 'Other';
  return STATE_TO_REGION[state] || 'Other';
}

function normQuery(q) {
  return (q || '').trim().toLowerCase();
}

/** Substring match over title + canonical fields. Case-insensitive. */
function queryMatches(listing, query) {
  const q = normQuery(query);
  if (!q) return true;
  const hay = [
    listing.title_raw,
    listing.canonical_brand,
    listing.heuristic_brand,
    listing.canonical_type,
    listing.heuristic_type,
    listing.canonical_model,
    listing.canonical_size,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

/**
 * Multi-select match: if the filter map is present and non-empty, listing's
 * value must be one of the selected keys. Returns true when the filter is
 * absent (unused).
 */
function multiMatch(filterMap, value) {
  if (!filterMap || typeof filterMap !== 'object') return true;
  const keys = Object.keys(filterMap).filter((k) => filterMap[k]);
  if (keys.length === 0) return true;
  if (!value) return false;
  return keys.includes(value);
}

function priceMatches(listing, price) {
  if (!price || typeof price !== 'object') return true;
  const cents = listing.price_cents;
  if (cents == null) {
    // No price on the listing — only match if no price filter is active.
    return price.min == null && price.max == null;
  }
  const dollars = cents / 100;
  if (price.min != null && dollars < Number(price.min)) return false;
  if (price.max != null && dollars > Number(price.max)) return false;
  return true;
}

function ageMatches(listing, ageMap) {
  if (!ageMap || typeof ageMap !== 'object') return true;
  const keys = Object.keys(ageMap).filter((k) => ageMap[k]);
  if (keys.length === 0) return true;
  const posted = listing.posted_at;
  if (!posted) return false;
  const postedMs = typeof posted.toMillis === 'function' ? posted.toMillis() : 0;
  const diffDays = (Date.now() - postedMs) / 86400000;
  // ANY selected age bucket satisfies — most permissive by design.
  for (const k of keys) {
    if (k === '24h' && diffDays <= 1) return true;
    if (k === '3d' && diffDays <= 3) return true;
    if (k === '7d' && diffDays <= 7) return true;
    if (k === '30d' && diffDays <= 30) return true;
  }
  return false;
}

/**
 * Does `listing` match the saved search defined by `alert`?
 * `alert` is the full saved_searches doc: { query, filters, sort, userId }.
 */
function matchesAlert(listing, alert) {
  if (!listing || !alert) return false;
  const { query, filters = {} } = alert;

  if (!queryMatches(listing, query)) return false;

  const brandForListing = listing.canonical_brand || listing.heuristic_brand;
  const typeForListing = listing.canonical_type || listing.heuristic_type;

  if (!multiMatch(filters.cat, typeForListing)) return false;
  if (!multiMatch(filters.maker, brandForListing)) return false;
  if (!multiMatch(filters.cond, listing.condition_raw)) return false;
  if (!multiMatch(filters.src, listing.source)) return false;
  if (!ageMatches(listing, filters.age)) return false;
  if (!priceMatches(listing, filters.price)) return false;
  // Region: derive from listing.location_state. eBay listings carry real
  // state (from postal-code prefix), so no special-case handling.
  if (filters.region && Object.keys(filters.region).length > 0) {
    if (!multiMatch(filters.region, regionForState(listing.location_state))) return false;
  }

  return true;
}

module.exports = {
  matchesAlert,
  queryMatches,
  multiMatch,
  priceMatches,
  ageMatches,
};
