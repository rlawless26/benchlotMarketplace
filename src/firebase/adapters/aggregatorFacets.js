/**
 * Aggregator statistics + client-side facet counting.
 *
 * `getAggregatorStats()` hits the live-index chip data: total active listing
 * count (via Firestore's count aggregation — doesn't read docs) and the most
 * recent `scraped_at` timestamp (driven from the first page of newest-first
 * results so we don't need another round trip).
 *
 * `computeFacets(listings)` is a pure client-side reducer that produces
 * per-option counts for the filter rail. WatchRecon pattern: counts reflect
 * the current query result, not the full catalog, and update as filters
 * narrow. Cheap and sufficient at our current scale.
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getCountFromServer,
  getDocs,
} from 'firebase/firestore';

import { db } from '../config';

const COLLECTION = 'externalListings';

/**
 * Live-index stats — total active count + freshness.
 * @returns {Promise<{activeCount:number, lastScrapedAt:Date|null}>}
 */
export async function getAggregatorStats() {
  const col = collection(db, COLLECTION);
  const activeQuery = query(col, where('status', '==', 'active'));
  const countSnap = await getCountFromServer(activeQuery);
  const activeCount = countSnap.data().count || 0;

  // Grab the most recent scraped_at. Covered by our existing
  // (status, scraped_at DESC) index.
  let lastScrapedAt = null;
  try {
    const freshQuery = query(
      col,
      where('status', '==', 'active'),
      orderBy('scraped_at', 'desc'),
      limit(1)
    );
    const snap = await getDocs(freshQuery);
    if (!snap.empty) {
      const doc = snap.docs[0].data();
      const ts = doc.scraped_at;
      if (ts && typeof ts.toDate === 'function') lastScrapedAt = ts.toDate();
      else if (ts && typeof ts.seconds === 'number') lastScrapedAt = new Date(ts.seconds * 1000);
    }
  } catch (e) {
    // Non-fatal — chip just omits the "updated X ago" suffix.
    console.warn('[aggregatorFacets] failed to fetch lastScrapedAt:', e.message);
  }

  return { activeCount, lastScrapedAt };
}

/**
 * True per-source active counts via Firestore count() aggregates — no doc
 * reads, just one roundtrip per source. Used to populate the Source filter
 * with the real catalog size rather than the per-source fetch cap (2,500).
 * eBay alone has 5,000+ active listings, so the in-memory facet count
 * understates by a lot otherwise.
 *
 * @param {string[]} sourceIds
 * @returns {Promise<Object<string, number>>} sourceId → active count
 */
export async function getSourceCounts(sourceIds) {
  if (!Array.isArray(sourceIds) || sourceIds.length === 0) return {};
  const col = collection(db, COLLECTION);
  const entries = await Promise.all(
    sourceIds.map(async (id) => {
      try {
        const q = query(col, where('status', '==', 'active'), where('source', '==', id));
        const snap = await getCountFromServer(q);
        return [id, snap.data().count || 0];
      } catch (e) {
        console.warn(`[aggregatorFacets] getSourceCounts(${id}) failed:`, e.message);
        return [id, null];
      }
    })
  );
  return Object.fromEntries(entries);
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
