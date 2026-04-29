/**
 * Save-Alert button — the breadcrumb's core CTA.
 *
 * Rendering rule: only mounts when there IS something to save — a non-empty
 * query OR at least one active filter. An "alert for all listings" is spam,
 * not a feature; the absence of the button is itself the UX affordance.
 *
 * Two auth paths:
 *   - Signed-in: writes to `saved_searches` Firestore collection via
 *     savedSearchModel. M3b's matcher Cloud Function polls against these.
 *   - Anonymous: stash the pending intent in sessionStorage, open the auth
 *     modal. After sign-in (Google popup OR email-link round trip), the
 *     pending-intent effect below auto-completes the save — the user does
 *     not have to click the button a second time.
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

const PENDING_KEY = 'benchlot:pendingSaveAlert';

/**
 * Is any filter active? Matches the shape useAggregatorState writes.
 * Checked alongside query to decide whether SaveAlertButton renders.
 */
function hasAnyIntent({ query, filters }) {
  if (query && query.trim()) return true;
  if (!filters) return false;
  if (filters.price && (filters.price.min != null || filters.price.max != null)) return true;
  for (const group of ['cat', 'maker', 'cond', 'src', 'age']) {
    if (filters[group] && Object.keys(filters[group]).length > 0) return true;
  }
  return false;
}

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

  const doSave = useCallback(async () => {
    if (!uid) return { ok: false };
    setBusy(true);
    setError(null);
    try {
      await createSavedSearch(uid, { query, filters, sort });
      setSaved(true);
      return { ok: true };
    } catch (err) {
      if (err.code === 'alert_cap_reached') {
        setError(`You're at the ${ALERT_CAP}-alert limit. Delete one on /alerts to save a new search.`);
      } else {
        console.error('Save alert failed:', err);
        setError('Could not save. Please try again.');
      }
      return { ok: false, err };
    } finally {
      setBusy(false);
    }
  }, [uid, query, filters, sort]);

  // Auto-save after auth completion. When a signed-out user clicks Save,
  // we stash their intent in sessionStorage and open the auth modal. On
  // successful auth — Google popup (same-page) or email-link return
  // (full page reload via continueUrl = current href) — this effect runs:
  // if the stored intent matches the current URL state, execute the save.
  useEffect(() => {
    if (!uid || authLoading) return;
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;
    let parsed;
    try { parsed = JSON.parse(raw); } catch { window.sessionStorage.removeItem(PENDING_KEY); return; }
    if (!parsed || parsed.hash !== stateHash) return;
    window.sessionStorage.removeItem(PENDING_KEY);
    // Small delay so the user sees the auth-complete moment before the
    // button flips to saved — avoids a jarring flash.
    const t = setTimeout(() => { doSave(); }, 150);
    return () => clearTimeout(t);
  }, [uid, authLoading, stateHash, doSave]);

  const onClick = useCallback(async () => {
    setError(null);

    if (!uid) {
      // Stash the intent so post-auth we can complete it automatically.
      window.sessionStorage.setItem(
        PENDING_KEY,
        JSON.stringify({ hash: stateHash, query, filters, sort })
      );
      openAuthModal('signin', window.location.pathname + window.location.search);
      return;
    }

    if (busy || saved) return;
    await doSave();
  }, [uid, busy, saved, query, filters, sort, stateHash, doSave]);

  // Guard: don't render unless the user has something worth saving. An
  // "alert for everything" is spam, not a feature.
  if (!hasAnyIntent({ query, filters })) return null;

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
          padding: '6px 12px',
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
        {/* Two label lengths so we don't hog horizontal space on mobile.
           "Sign in to create alert" is ~190px wide and pushes Filters/Sort
           onto a third row at narrow widths. The mobile span shows just
           "Alert" while the desktop span keeps the full CTA. */}
        <span className="hidden md:inline">
          {busy ? 'Saving…' : user ? 'Create alert' : 'Sign in to create alert'}
        </span>
        <span className="md:hidden">
          {busy ? 'Saving…' : 'Alert'}
        </span>
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
