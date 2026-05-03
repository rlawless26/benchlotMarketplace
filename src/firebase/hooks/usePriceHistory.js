/**
 * usePriceHistory — reads `priceSnapshots/{listingId}/snapshots`.
 *
 * Returns:
 *   { snapshots: array, loading, error,
 *     latestDrop: { from_cents, to_cents, drop_cents, drop_pct, days_since } | null }
 *
 * `latestDrop` summarizes the most recent price decrease that meets the
 * Price-Drop badge threshold (>= 10% AND >= $20) within the last 14 days.
 * Null when no qualifying drop. The drop math compares the most-recent
 * snapshot to the prior most-recent.
 *
 * Snapshots are append-only and only written when price/status changes
 * (see functions/ingest/externalListings.js#upsertListings), so a typical
 * listing has 0–3 snapshots. Reading the full subcollection is cheap.
 */

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

import { db } from '../config';

const SNAPSHOTS_COLLECTION = 'priceSnapshots';
const DROP_PCT_THRESHOLD = 0.10;       // 10%
const DROP_DOLLARS_THRESHOLD_CENTS = 2000; // $20
const DROP_FRESHNESS_DAYS = 14;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const cache = new Map(); // listingId -> { snapshots, latestDrop }

function snapshotMillis(snap) {
  if (!snap || !snap.scraped_at) return 0;
  if (typeof snap.scraped_at.toMillis === 'function') return snap.scraped_at.toMillis();
  if (typeof snap.scraped_at.seconds === 'number') return snap.scraped_at.seconds * 1000;
  return 0;
}

function deriveLatestDrop(snapshots) {
  if (!snapshots || snapshots.length < 2) return null;
  // snapshots is already oldest-first; look at the last two.
  const prev = snapshots[snapshots.length - 2];
  const curr = snapshots[snapshots.length - 1];
  const prevPrice = prev.price_cents;
  const currPrice = curr.price_cents;
  if (typeof prevPrice !== 'number' || typeof currPrice !== 'number') return null;
  if (currPrice >= prevPrice) return null;

  const dropCents = prevPrice - currPrice;
  const dropPct = dropCents / prevPrice;
  if (dropPct < DROP_PCT_THRESHOLD) return null;
  if (dropCents < DROP_DOLLARS_THRESHOLD_CENTS) return null;

  const ageMs = Date.now() - snapshotMillis(curr);
  if (ageMs > DROP_FRESHNESS_DAYS * ONE_DAY_MS) return null;

  return {
    from_cents: prevPrice,
    to_cents: currPrice,
    drop_cents: dropCents,
    drop_pct: dropPct,
    days_since: Math.floor(ageMs / ONE_DAY_MS),
  };
}

async function loadSnapshots(listingId) {
  if (!listingId) return { snapshots: [], latestDrop: null };
  if (cache.has(listingId)) return cache.get(listingId);

  const ref = collection(db, SNAPSHOTS_COLLECTION, listingId, 'snapshots');
  const snap = await getDocs(query(ref, orderBy('scraped_at', 'asc')));
  const snapshots = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const result = { snapshots, latestDrop: deriveLatestDrop(snapshots) };
  cache.set(listingId, result);
  return result;
}

export default function usePriceHistory(listingId) {
  const [state, setState] = useState({
    snapshots: [],
    latestDrop: null,
    loading: Boolean(listingId),
    error: null,
  });

  useEffect(() => {
    if (!listingId) {
      setState({ snapshots: [], latestDrop: null, loading: false, error: null });
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    loadSnapshots(listingId)
      .then((res) => {
        if (cancelled) return;
        setState({ ...res, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[usePriceHistory] failed:', err);
        }
        setState({ snapshots: [], latestDrop: null, loading: false, error: err });
      });
    return () => { cancelled = true; };
  }, [listingId]);

  return state;
}
