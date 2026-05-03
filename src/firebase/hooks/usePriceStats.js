/**
 * usePriceStats — React hook that resolves a priceStats cluster for a
 * tool, preferring the fine grain (type+brand+size) and falling back to
 * coarse (type+brand) when fine doesn't have enough comps.
 *
 * Returns:
 *   { stats: object|null, reference: object|null, grain: 'fine'|'coarse'|null,
 *     loading: boolean, error: Error|null }
 *
 *   - `stats` is the raw priceStats doc (sold and asking blocks, etc.)
 *     for the chosen grain, or null when neither grain meets display
 *     thresholds.
 *   - `reference` is the chosen distribution (pickReference) — sold-block
 *     when sold_count >= 8, otherwise asking-block when asking >= 10,
 *     otherwise null. Consumers should usually use this rather than
 *     reading the per-block fields directly.
 *   - `grain` indicates which doc was returned, useful for telemetry.
 *
 * Cache: per-page-load Map keyed on cluster_key. priceStats only update
 * once a day, so a session-level cache is correct; we don't wire up
 * cache invalidation.
 */

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '../config';
import {
  clusterKey,
  hasDisplayableStats,
  pickReference,
} from '../../utils/priceStats';

const STATS_COLLECTION = 'priceStats';

// Per-tab cache. Map<cluster_key, { stats, grain } | null>.
// Null means "we already looked and there was nothing displayable."
const cache = new Map();

async function readDoc(key) {
  if (cache.has(key)) return cache.get(key);
  const snap = await getDoc(doc(db, STATS_COLLECTION, key));
  if (!snap.exists()) {
    cache.set(key, null);
    return null;
  }
  return snap.data();
}

/**
 * Resolve the best (fine-then-coarse) priceStats doc for the given
 * canonical fields. Caches both grains' lookups separately.
 */
async function resolveStats({ canonical_type, canonical_brand, canonical_size }) {
  if (!canonical_type || !canonical_brand) return null;

  if (canonical_size) {
    const fineKey = clusterKey({ canonical_type, canonical_brand, canonical_size });
    const fine = await readDoc(fineKey);
    if (fine && hasDisplayableStats(fine)) {
      return { stats: fine, grain: 'fine', cluster_key: fineKey };
    }
  }

  const coarseKey = clusterKey({ canonical_type, canonical_brand, canonical_size: null });
  const coarse = await readDoc(coarseKey);
  if (coarse && hasDisplayableStats(coarse)) {
    return { stats: coarse, grain: 'coarse', cluster_key: coarseKey };
  }
  return null;
}

export default function usePriceStats({ canonical_type, canonical_brand, canonical_size } = {}) {
  const [state, setState] = useState({
    stats: null,
    reference: null,
    grain: null,
    cluster_key: null,
    loading: Boolean(canonical_type && canonical_brand),
    error: null,
  });

  useEffect(() => {
    if (!canonical_type || !canonical_brand) {
      setState({ stats: null, reference: null, grain: null, cluster_key: null, loading: false, error: null });
      return undefined;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    resolveStats({ canonical_type, canonical_brand, canonical_size })
      .then((res) => {
        if (cancelled) return;
        if (!res) {
          setState({ stats: null, reference: null, grain: null, cluster_key: null, loading: false, error: null });
          return;
        }
        setState({
          stats: res.stats,
          reference: pickReference(res.stats),
          grain: res.grain,
          cluster_key: res.cluster_key,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        // Don't bubble — price-guide is decorative; failure is silent.
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[usePriceStats] lookup failed:', err);
        }
        setState({ stats: null, reference: null, grain: null, cluster_key: null, loading: false, error: err });
      });

    return () => {
      cancelled = true;
    };
  }, [canonical_type, canonical_brand, canonical_size]);

  return state;
}
