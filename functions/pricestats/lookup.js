/**
 * Server-side reader for priceStats clusters.
 *
 * Symmetric to src/firebase/hooks/usePriceStats.js — both implement the
 * same fine-then-coarse fallback rule, just on different SDKs. Used by
 * any Cloud Function that needs to know "what's the market on this
 * cluster?" — e.g. the alert matcher when scoring a Sleeper-tier match
 * (Track C), or any future server-rendered surface.
 */

const admin = require('firebase-admin');

const {
  clusterKey,
  hasDisplayableStats,
  pickReference,
} = require('./cluster');

const STATS_COLLECTION = 'priceStats';

/**
 * Look up the priceStats doc for a tool, preferring the fine grain when
 * its sample meets display thresholds. Returns null when neither grain
 * qualifies.
 *
 * @param {{canonical_type, canonical_brand, canonical_size?}} fields
 * @returns {Promise<object|null>} priceStats doc data with `_grain`
 *   indicating which grain was returned ('fine' | 'coarse').
 */
async function lookupStats(fields) {
  if (!fields || !fields.canonical_type || !fields.canonical_brand) return null;
  const db = admin.firestore();
  const col = db.collection(STATS_COLLECTION);

  // Try fine grain first when size is provided.
  if (fields.canonical_size) {
    const fineKey = clusterKey(fields);
    const fineSnap = await col.doc(fineKey).get();
    if (fineSnap.exists) {
      const fine = fineSnap.data();
      if (hasDisplayableStats(fine)) {
        return { ...fine, _grain: 'fine' };
      }
    }
  }

  // Fall back to coarse.
  const coarseKey = clusterKey({
    canonical_type: fields.canonical_type,
    canonical_brand: fields.canonical_brand,
    canonical_size: null,
  });
  const coarseSnap = await col.doc(coarseKey).get();
  if (!coarseSnap.exists) return null;
  const coarse = coarseSnap.data();
  if (!hasDisplayableStats(coarse)) return null;
  return { ...coarse, _grain: 'coarse' };
}

module.exports = {
  lookupStats,
  // re-exported for convenience
  pickReference,
};
