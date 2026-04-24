/**
 * AlertsPage — user's saved-search management UI.
 *
 * Lists the current user's saved searches with a human summary of each
 * (query + active filter count), timestamp, and delete action. Clicking
 * a row navigates back to `/` with the saved query + filters reapplied
 * via URL params, which the aggregator state hook picks up automatically.
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Trash2, ArrowRight, AlertCircle } from 'lucide-react';

import { useAuth } from '../../firebase/hooks/useAuth';
import {
  subscribeSavedSearches,
  deleteSavedSearch,
  ALERT_CAP,
} from '../../firebase/models/savedSearchModel';
import SiteHeader from '../../components/siteChrome/SiteHeader';
import SiteFooter from '../../components/siteChrome/SiteFooter';

function summarizeAlert(alert) {
  const parts = [];
  if (alert.query && alert.query.trim()) parts.push(`"${alert.query.trim()}"`);
  const filterGroups = Object.keys(alert.filters || {}).filter((k) => {
    const val = alert.filters[k];
    if (!val) return false;
    if (typeof val === 'object' && !Array.isArray(val)) return Object.keys(val).length > 0;
    return true;
  });
  if (filterGroups.length > 0) {
    parts.push(
      `${filterGroups.length} filter${filterGroups.length === 1 ? '' : 's'}`
    );
  }
  if (alert.sort && alert.sort !== 'newest') parts.push(`sorted by ${alert.sort.replace('_', ' ')}`);
  if (parts.length === 0) return 'All listings, newest first';
  return parts.join(' · ');
}

function alertToParams(alert) {
  const params = new URLSearchParams();
  if (alert.query && alert.query.trim()) params.set('q', alert.query.trim());
  const filters = alert.filters || {};
  for (const group of ['cat', 'maker', 'cond', 'src', 'age']) {
    const g = filters[group];
    if (g && typeof g === 'object') {
      const keys = Object.keys(g).filter((k) => g[k]);
      if (keys.length > 0) params.set(group, keys.join('|'));
    }
  }
  if (filters.price?.min != null) params.set('min', String(filters.price.min));
  if (filters.price?.max != null) params.set('max', String(filters.price.max));
  if (alert.sort && alert.sort !== 'newest') params.set('sort', alert.sort);
  return params.toString();
}

function relativeDate(ts) {
  if (!ts) return '';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
  const diff = Date.now() - d.getTime();
  const day = Math.floor(diff / 86400000);
  if (day === 0) return 'today';
  if (day === 1) return 'yesterday';
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const AlertsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    document.title = 'Your alerts — Benchlot';
  }, []);

  // Depend on user?.uid (stable string) rather than user (new object ref on
  // every users/{uid} snapshot tick from useAuth). Otherwise the effect tears
  // down and re-subscribes on every auth snapshot, flickering the loading
  // state.
  const uid = user?.uid;
  useEffect(() => {
    if (authLoading) return undefined;
    if (!uid) {
      setAlerts([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const unsub = subscribeSavedSearches(
      uid,
      (list) => {
        setAlerts(list);
        setLoading(false);
      },
      (err) => {
        console.error('Alerts subscription failed:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [uid, authLoading]);

  async function onDelete(id) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteSavedSearch(id);
    } catch (err) {
      console.error('Delete alert failed:', err);
    } finally {
      setDeletingId(null);
    }
  }

  function onRun(alert) {
    const params = alertToParams(alert);
    navigate(`/${params ? `?${params}` : ''}`);
  }

  if (authLoading) {
    return null;
  }

  if (!user) {
    return (
      <div className="bg-bone min-h-screen">
        <SiteHeader current="alerts" />
        <main style={{ maxWidth: 640, margin: '80px auto', padding: '0 40px', textAlign: 'center' }}>
          <Bell size={32} style={{ color: '#d4aa60', margin: '0 auto 16px' }} />
          <h1
            style={{
              fontFamily: "'Petrona', Georgia, serif",
              fontWeight: 700,
              fontSize: 32,
              letterSpacing: '-0.6px',
              color: '#0c1c1e',
              marginBottom: 12,
            }}
          >
            Sign in to see your alerts
          </h1>
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 400,
              fontSize: 15,
              color: '#4a5a54',
              marginBottom: 24,
            }}
          >
            Alerts are saved per account. Sign in to see the searches you've saved, and get notified when new matches are indexed.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5"
            style={{
              padding: '12px 24px',
              borderRadius: 6,
              background: '#d4aa60',
              color: '#0c1c1e',
              border: '1px solid #b08a40',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 600,
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            Sign in
            <ArrowRight size={14} />
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-bone min-h-screen flex flex-col">
      <SiteHeader current="alerts" />

      <main
        className="flex-1"
        style={{
          maxWidth: 820,
          width: '100%',
          margin: '0 auto',
          padding: '48px 40px 80px',
        }}
      >
        <div className="flex items-end justify-between" style={{ marginBottom: 24 }}>
          <div>
            <div
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.22em',
                color: '#8a8a80',
                marginBottom: 8,
              }}
            >
              YOUR SAVED SEARCHES
            </div>
            <h1
              style={{
                fontFamily: "'Petrona', Georgia, serif",
                fontWeight: 700,
                fontSize: 36,
                letterSpacing: '-1.2px',
                color: '#0c1c1e',
                margin: 0,
              }}
            >
              Alerts
            </h1>
          </div>
          <span
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
              fontSize: 12,
              color: '#4a5a54',
            }}
          >
            {alerts.length} of {ALERT_CAP}
          </span>
        </div>

        {loading && (
          <div
            className="text-center"
            style={{
              padding: '64px 0',
              fontFamily: "'Outfit', sans-serif",
              color: '#8a8a80',
              fontSize: 13,
            }}
          >
            Loading your alerts…
          </div>
        )}

        {!loading && alerts.length === 0 && (
          <div
            className="text-center"
            style={{
              padding: '64px 24px',
              border: '1px dashed #d4d2cc',
              borderRadius: 10,
              background: '#f8f6f2',
            }}
          >
            <AlertCircle size={28} style={{ color: '#8a8a80', margin: '0 auto 14px' }} />
            <h2
              style={{
                fontFamily: "'Petrona', Georgia, serif",
                fontWeight: 700,
                fontSize: 20,
                color: '#0c1c1e',
                margin: '0 0 8px',
              }}
            >
              No alerts yet
            </h2>
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14,
                color: '#4a5a54',
                marginBottom: 20,
              }}
            >
              Run a search and click "Save this search as an alert." We'll email you when new matches are indexed.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5"
              style={{
                padding: '10px 18px',
                borderRadius: 6,
                background: '#d4aa60',
                color: '#0c1c1e',
                border: '1px solid #b08a40',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                fontSize: 13,
                textDecoration: 'none',
              }}
            >
              Start searching
              <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {!loading && alerts.length > 0 && (
          <ul className="flex flex-col" style={{ gap: 10 }}>
            {alerts.map((alert) => {
              const summary = summarizeAlert(alert);
              const createdLabel = alert.createdAt ? relativeDate(alert.createdAt) : '';
              const deleting = deletingId === alert.id;
              return (
                <li
                  key={alert.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: '16px 20px',
                    background: '#f8f6f2',
                    border: '1px solid #e4e2dc',
                    borderRadius: 10,
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 600,
                        fontSize: 15,
                        color: '#0c1c1e',
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {summary}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400,
                        fontSize: 12,
                        color: '#8a8a80',
                      }}
                    >
                      Saved {createdLabel}
                      {alert.lastMatchedAt && ` · last match ${relativeDate(alert.lastMatchedAt)}`}
                    </div>
                  </div>
                  <div className="flex items-center" style={{ gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => onRun(alert)}
                      className="inline-flex items-center gap-1 cursor-pointer"
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        background: '#f2f0eb',
                        border: '1px solid #e4e2dc',
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 500,
                        fontSize: 12,
                        color: '#1a3030',
                      }}
                    >
                      Run search
                      <ArrowRight size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(alert.id)}
                      disabled={deleting}
                      aria-label="Delete alert"
                      className="cursor-pointer"
                      style={{
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        border: '1px solid #e4e2dc',
                        borderRadius: 6,
                        color: '#a83a2a',
                        opacity: deleting ? 0.4 : 1,
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <SiteFooter />
    </div>
  );
};

export default AlertsPage;
