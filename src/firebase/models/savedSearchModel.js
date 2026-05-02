/**
 * savedSearchModel — Firestore-backed alerts.
 *
 * Each saved search is `{ userId, query, filters, sort, hash, createdAt,
 * lastMatchedAt, notifications }`. The `hash` is a stable fingerprint of
 * `(query, filters, sort)` so the same search saved twice is an idempotent
 * no-op on the client (we check before writing).
 *
 * Cap enforced client-side at 8 (pivot-doc scarcity rule).
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../config';
import posthog from 'posthog-js';

const COLLECTION = 'saved_searches';
export const ALERT_CAP = 8;

/**
 * Stable, deterministic hash over a saved-search's shape. Sorted keys so
 * filter-order changes don't produce spurious duplicates.
 */
export function hashSavedSearch({ query: q, filters, sort }) {
  const normFilters = stableStringify(filters || {});
  return JSON.stringify({
    q: (q || '').trim().toLowerCase(),
    f: normFilters,
    s: sort || 'newest',
  });
}

function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

/**
 * Create a saved search for the given user. Returns `{ id, hash }` on success,
 * or `{ exists: true, id, hash }` if the user already has this exact search.
 *
 * The cap check uses the current alert count from Firestore — safer than
 * trusting a stale client cache. Rejects with Error('alert_cap_reached') if
 * the user is at the cap.
 */
export async function createSavedSearch(userId, state) {
  if (!userId) throw new Error('not_signed_in');
  const hash = hashSavedSearch(state);
  const col = collection(db, COLLECTION);

  // Dedup check — same hash for this user already exists?
  const dupSnap = await getDocs(
    query(col, where('userId', '==', userId), where('hash', '==', hash), limit(1))
  );
  if (!dupSnap.empty) {
    return { exists: true, id: dupSnap.docs[0].id, hash };
  }

  // Cap check
  const allSnap = await getDocs(query(col, where('userId', '==', userId), limit(ALERT_CAP + 1)));
  if (allSnap.size >= ALERT_CAP) {
    const err = new Error('alert_cap_reached');
    err.code = 'alert_cap_reached';
    throw err;
  }

  const docRef = await addDoc(col, {
    userId,
    query: (state.query || '').trim(),
    filters: state.filters || {},
    sort: state.sort || 'newest',
    hash,
    createdAt: serverTimestamp(),
    lastMatchedAt: null,
    notifications: { email: true },
  });
  posthog.capture('alert_created', {
    query: (state.query || '').trim() || null,
    filters: state.filters || {},
    sort: state.sort || 'newest',
  });
  return { exists: false, id: docRef.id, hash };
}

/**
 * List a user's saved searches, newest first.
 */
export async function listSavedSearches(userId) {
  if (!userId) return [];
  const col = collection(db, COLLECTION);
  const snap = await getDocs(
    query(col, where('userId', '==', userId), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Subscribe to a user's saved searches. Returns the Firestore unsubscribe fn.
 */
export function subscribeSavedSearches(userId, onChange, onError) {
  if (!userId) {
    onChange([]);
    return () => {};
  }
  const col = collection(db, COLLECTION);
  const q = query(col, where('userId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    onError
  );
}

export async function deleteSavedSearch(id) {
  if (!id) return;
  await deleteDoc(doc(db, COLLECTION, id));
  posthog.capture('alert_deleted', { alertId: id });
}

/**
 * Find an existing saved search matching this state for this user, if any.
 * Returns `{ id, ...data } | null`.
 */
export async function findSavedSearchByState(userId, state) {
  if (!userId) return null;
  const hash = hashSavedSearch(state);
  const col = collection(db, COLLECTION);
  const snap = await getDocs(
    query(col, where('userId', '==', userId), where('hash', '==', hash), limit(1))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}
