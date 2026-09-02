/**
 * Aggregator statistics + client-side facet counting.
 *
 * `getAggregatorStats()` and `getSourceCounts()` read /api/search/stats — a
 * single Postgres GROUP BY served by the benchlot-web project (rewrite in the
 * root vercel.json). They used Firestore count() aggregations until ingest
 * moved to Postgres on 2026-09-01 and the Firestore index froze. One fetch
 * feeds both; a short module-level cache keeps the chip, banner, footer and
 * filter rail from issuing four identical requests per page.
 *
 * `computeFacets(listings)` is a pure client-side reducer that produces
 * per-option counts for the filter rail. WatchRecon pattern: counts reflect
 * the current query result, not the full catalog, and update as filters
 * narrow. Cheap and sufficient at our current scale.
 */

const API_BASE = process.env.REACT_APP_SEARCH_API_BASE || '';
const STATS_TTL_MS = 60_000;

let statsCache = null; // { at: number, data: {activeCount,lastScrapedAt,sourceCounts} }
let statsInFlight = null;

async function fetchStats() {
  const now = Date.now();
  if (statsCache && now - statsCache.at < STATS_TTL_MS) return statsCache.data;
  if (statsInFlight) return statsInFlight;

  statsInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/search/stats`);
      if (!res.ok) throw new Error(`stats API ${res.status}`);
      const body = await res.json();
      const data = {
        activeCount: typeof body.activeCount === 'number' ? body.activeCount : 0,
        lastScrapedAt: body.lastScrapedAt ? new Date(body.lastScrapedAt) : null,
        sourceCounts: body.sourceCounts || {},
      };
      statsCache = { at: Date.now(), data };
      return data;
    } finally {
      statsInFlight = null;
    }
  })();
  return statsInFlight;
}

/**
 * Live-index stats — total active count + freshness.
 * @returns {Promise<{activeCount:number, lastScrapedAt:Date|null}>}
 */
export async function getAggregatorStats() {
  const { activeCount, lastScrapedAt } = await fetchStats();
  return { activeCount, lastScrapedAt };
}

/**
 * True per-source active counts. Used to populate the Source filter with the
 * real catalog size rather than the per-source fetch cap — eBay alone has
 * 100k+ active listings, so the in-memory facet count understates by a lot.
 *
 * @param {string[]} sourceIds
 * @returns {Promise<Object<string, number>>} sourceId → active count
 */
export async function getSourceCounts(sourceIds) {
  if (!Array.isArray(sourceIds) || sourceIds.length === 0) return {};
  try {
    const { sourceCounts } = await fetchStats();
    return Object.fromEntries(sourceIds.map((id) => [id, sourceCounts[id] ?? null]));
  } catch (e) {
    console.warn('[aggregatorFacets] getSourceCounts failed:', e.message);
    return Object.fromEntries(sourceIds.map((id) => [id, null]));
  }
}

/**
 * Reduce a result set into per-group counts for the filter rail.
 * Returns `{ category, maker, source, condition }` — each an object map of
 * option → count. Options with zero hits are omitted.
 */
export function computeFacets(listings) {
  const counts = { category: {}, maker: {}, source: {}, condition: {}, state: {} };
  if (!Array.isArray(listings)) return counts;

  for (const l of listings) {
    if (l.category) counts.category[l.category] = (counts.category[l.category] || 0) + 1;
    if (l.brand && l.brand !== 'Unknown') {
      counts.maker[l.brand] = (counts.maker[l.brand] || 0) + 1;
    } else {
      // Synthesize an "Unknown" maker bucket. The adapter collapses both
      // canonical "Unknown" and missing-brand into l.brand=null, so this
      // is the only signal we have for "no maker identifiable." Surfacing
      // it as a checkbox lets users explicitly include or exclude
      // no-brand listings rather than just relying on the de-rank.
      counts.maker.Unknown = (counts.maker.Unknown || 0) + 1;
    }
    if (l.source) counts.source[l.source] = (counts.source[l.source] || 0) + 1;
    if (l.condition) counts.condition[l.condition] = (counts.condition[l.condition] || 0) + 1;
    // State facet. Listings without a state are silently omitted — they'll
    // still show up in default unfiltered results, but no chip claims them
    // (a "no-state" chip would be a UX trap, since the label can't honestly
    // describe what selecting it would do).
    if (l.location_state) {
      counts.state[l.location_state] = (counts.state[l.location_state] || 0) + 1;
    }
  }

  return counts;
}

/**
 * Source-kind distribution of a result set — drives the colored bar + legend
 * in the Source Distribution Strip above the results grid.
 * @param {Array} listings
 * @param {(id:string) => {kind:string} | null} getSource — sources registry lookup
 */
export function computeKindDistribution(listings, getSource) {
  const counts = {};
  if (!Array.isArray(listings) || !getSource) return counts;
  for (const l of listings) {
    const src = getSource(l.source);
    if (!src || !src.kind) continue;
    counts[src.kind] = (counts[src.kind] || 0) + 1;
  }
  return counts;
}
