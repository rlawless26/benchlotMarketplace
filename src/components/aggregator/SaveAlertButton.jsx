/**
 * Save-Alert button — the breadcrumb's core CTA.
 *
 * Two paths, chosen by auth state:
 *   - Signed-in: writes to `saved_searches` Firestore collection via
 *     savedSearchModel. This is the real alert plumbing — M3b's matcher
 *     Cloud Function polls against these records.
 *   - Anonymous: opens the auth modal. After sign-in, the click can be
 *     re-attempted (user sees the unsaved state; clicks again → saves).
 *
 * Any query/filter/sort change resets the button to unsaved state so the
 * user can save the new search.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Bell, Check, ArrowRight } from 'lucide-react';

import { useAuth } from '../../firebase/hooks/useAuth';
import { openAuthModal } from '../../utils/featureFlags';
import {
  createSavedSearch,
  findSavedSearchByState,
  hashSavedSearch,
  ALERT_CAP,
} from '../../firebase/models/savedSearchModel';

const SaveAlertButton = ({ query, filters, sort }) => {
  const { user, loading: authLoading } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const stateHash = hashSavedSearch({ query, filters, sort });
  const uid = user?.uid; // stable across useAuth object-rebuild ticks

  // Reset + refresh saved state whenever the search shape changes or auth
  // resolves. Depending on `uid` (a string) instead of `user` (an object ref
  // that changes on every users/{uid} snapshot) avoids a tight re-subscribe
  // loop.
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setSaved(false);
    if (!uid || authLoading) return undefined;
    findSavedSearchByState(uid, { query, filters, sort })
      .then((existing) => {
        if (!cancelled) setSaved(Boolean(existing));
      })
      .catch(() => {
        // Rule denial or network hiccup — treat as unsaved; user can retry.
      });
    return () => {
      cancelled = true;
    };
  }, [stateHash, uid, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const onClick = useCallback(async () => {
    setError(null);

    if (!uid) {
      openAuthModal('signin', window.location.pathname + window.location.search);
      return;
    }

    if (busy || saved) return;
    setBusy(true);
    try {
      await createSavedSearch(uid, { query, filters, sort });
      setSaved(true);
    } catch (err) {
      if (err.code === 'alert_cap_reached') {
        setError(`You're at the ${ALERT_CAP}-alert limit. Delete one on /alerts to save a new search.`);
      } else {
        console.error('Save alert failed:', err);
        setError('Could not save. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }, [uid, busy, saved, query, filters, sort]);

  if (saved) {
    return (
      <div className="flex flex-col items-end" style={{ gap: 4 }}>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 cursor-default"
          style={{
            padding: '10px 18px',
            borderRadius: 6,
            background: '#d6ece4',
            color: '#2a6a4a',
            border: '1px solid #2a6a4a',
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 600,
            fontSize: 13,
            transition: 'all 150ms',
          }}
        >
          <Check size={14} />
          Alert saved
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end" style={{ gap: 4 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-1.5 cursor-pointer"
        style={{
          padding: '10px 18px',
          borderRadius: 6,
          background: '#d4aa60',
          color: '#0c1c1e',
          border: '1px solid #b08a40',
          boxShadow: '0 1px 2px rgba(12,28,30,0.08)',
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 600,
          fontSize: 13,
          transition: 'all 150ms',
          opacity: busy ? 0.7 : 1,
        }}
      >
        <Bell size={14} />
        {busy ? 'Saving…' : user ? 'Create alert' : 'Sign in to create alert'}
        <ArrowRight size={14} />
      </button>
      {error && (
        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 11,
            color: '#a83a2a',
            maxWidth: 320,
            textAlign: 'right',
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
};

export default SaveAlertButton;
