/**
 * EmptyState — the aggregator's empty view (no query, no filters).
 *
 * Per `design_handoff_benchlot_homepage/README.md` §1 Empty State. Renders
 * editorial header, hero with live-index chip and search, sources strip,
 * "Latest listings" preview grid (real 6 newest from Firestore), and the
 * dark-teal footer.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';

import { SOURCES, SOURCES_STRIP_ORDER, getSource } from '../../firebase/adapters/sources';
import { getAggregatorStats } from '../../firebase/adapters/aggregatorFacets';
import { useAuth } from '../../firebase/hooks/useAuth';

import LiveIndexChip from '../../components/aggregator/LiveIndexChip';
import AggregatorFooter from '../../components/aggregator/AggregatorFooter';

// Round a listing count DOWN to the nearest 100 and return a "X00+" string.
// 823 → "800+", 10,555 → "10,500+". Numbers under 100 render as-is.
function roundedListingCount(n) {
  if (!Number.isFinite(n) || n < 100) return n != null ? String(n) : null;
  const floored = Math.floor(n / 100) * 100;
  return `${floored.toLocaleString()}+`;
}

export const SUGGESTIONS = [
  'Stanley No. 4',
  'Lie-Nielsen 62',
  'Veritas plow',
  'Narex chisels',
  'Disston D-8',
  'Japanese kanna',
];

const INDEXED_COUNT = SOURCES.filter((s) => s.indexed).length;

const EYEBROW = {
  fontFamily: "'Outfit', sans-serif",
  fontWeight: 700,
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.22em',
  color: '#8a8a80',
};

const EmptyState = ({ onSearch }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [stats, setStats] = useState({ activeCount: null, lastScrapedAt: null });

  useEffect(() => {
    getAggregatorStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  const searchLabel = stats.activeCount
    ? `Search ${roundedListingCount(stats.activeCount)} used tool listings`
    : null;

  const submit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (typeof onSearch === 'function') onSearch(q);
  };

  const chipClick = (text) => {
    setQuery(text);
    if (typeof onSearch === 'function') onSearch(text);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="bg-bone">
      {/* Editorial header */}
      <header
        style={{
          borderBottom: '1px solid #eceae4',
          padding: '22px 0',
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px' }}
        >
          <span
            style={{
              fontFamily: "'Petrona', Georgia, serif",
              fontWeight: 900,
              fontSize: 24,
              letterSpacing: '-1.2px',
              color: '#1a3030',
            }}
          >
            Benchlot
          </span>
          <nav
            className="flex items-center"
            style={{
              gap: 28,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
              fontSize: 13,
              color: '#4a5a54',
            }}
          >
            <Link to="/about" style={{ color: '#4a5a54', textDecoration: 'none' }}>
              About
            </Link>
            <Link to="/help" style={{ color: '#4a5a54', textDecoration: 'none' }}>
              FAQ
            </Link>
            <span aria-hidden style={{ width: 1, height: 14, background: '#e4e2dc' }} />
            {user ? (
              <Link to="/alerts" style={{ color: '#1a3030', textDecoration: 'none' }}>
                My Alerts
              </Link>
            ) : (
              <Link to="/login" style={{ color: '#1a3030', textDecoration: 'none' }}>
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative"
        style={{
          padding: '88px 40px 120px',
          background:
            'linear-gradient(180deg, #F2F0EB 0%, #F2F0EB 60%, #ECE9E1 100%)',
        }}
      >
        {/* Subtle radial-dot overlay */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(26,48,48,0.08) 1px, transparent 0)',
            backgroundSize: '22px 22px',
            opacity: 0.4,
          }}
        />
        <div
          className="relative text-center"
          style={{ maxWidth: 820, margin: '0 auto' }}
        >
          <LiveIndexChip />

          <h1
            style={{
              marginTop: 36,
              fontFamily: "'Petrona', Georgia, serif",
              fontWeight: 800,
              fontSize: 68,
              lineHeight: 1.04,
              letterSpacing: '-2px',
              color: '#0c1c1e',
              margin: '36px 0 0',
            }}
          >
            Find used hand tools{' '}
            <span
              style={{
                fontWeight: 500,
                fontStyle: 'italic',
                color: '#1a3030',
              }}
            >
              across the web.
            </span>
          </h1>

          <p
            style={{
              marginTop: 22,
              marginLeft: 'auto',
              marginRight: 'auto',
              maxWidth: 620,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 400,
              fontSize: 19,
              lineHeight: 1.55,
              color: '#4a5a54',
            }}
          >
            Dealers, forums, auctions, marketplaces — all in one search. We don't sell tools. We point you to them.
          </p>

          {/* Search label — "Search 800+ used tool listings" */}
          {searchLabel && (
            <div
              style={{
                marginTop: 36,
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 500,
                fontSize: 12,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#8a8a80',
              }}
            >
              {searchLabel}
            </div>
          )}

          {/* Search input */}
          <form
            onSubmit={submit}
            className="relative"
            style={{ maxWidth: 760, margin: '14px auto 0' }}
          >
            <Search
              size={20}
              aria-hidden
              style={{
                position: 'absolute',
                left: 22,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#4a5a54',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search for a tool (e.g. "Stanley No. 4", "Disston D-8")'
              style={{
                width: '100%',
                padding: '22px 178px 22px 58px',
                background: '#f8f6f2',
                border: '1.5px solid #1a3030',
                borderRadius: 10,
                boxShadow: '0 4px 20px rgba(12,28,30,0.08)',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 500,
                fontSize: 16,
                color: '#0c1c1e',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 cursor-pointer"
              style={{
                position: 'absolute',
                right: 8,
                top: 8,
                bottom: 8,
                padding: '0 22px',
                background: '#d4aa60',
                color: '#0c1c1e',
                border: 'none',
                borderRadius: 6,
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Search listings
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Suggestion chips */}
          <div
            className="flex items-center justify-center flex-wrap"
            style={{ marginTop: 18, gap: 8 }}
          >
            <span
              style={{
                ...EYEBROW,
                letterSpacing: '0.12em',
                color: '#8a8a80',
              }}
            >
              POPULAR:
            </span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => chipClick(s)}
                className="cursor-pointer"
                style={{
                  padding: '5px 12px',
                  border: '1px solid #e4e2dc',
                  borderRadius: 4,
                  background: 'transparent',
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 400,
                  fontSize: 12,
                  color: '#0c1c1e',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Sources strip */}
      <section style={{ maxWidth: 1100, margin: '88px auto 0', padding: '0 40px' }}>
        <div
          className="flex items-center justify-center"
          style={{ gap: 12, marginBottom: 20 }}
        >
          <span aria-hidden style={{ flex: '0 0 140px', height: 1, background: '#e4e2dc' }} />
          <span style={EYEBROW}>
            INDEXED FROM {INDEXED_COUNT} SOURCE{INDEXED_COUNT === 1 ? '' : 'S'}, MORE COMING
          </span>
          <span aria-hidden style={{ flex: '0 0 140px', height: 1, background: '#e4e2dc' }} />
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${SOURCES_STRIP_ORDER.length}, 1fr)`,
            borderTop: '1px solid #e4e2dc',
            borderBottom: '1px solid #e4e2dc',
          }}
        >
          {SOURCES_STRIP_ORDER.map((id, i) => {
            const s = getSource(id);
            const isIndexed = !!s.indexed;
            return (
              <div
                key={id}
                className="text-center"
                style={{
                  padding: '22px 16px',
                  borderLeft: i === 0 ? 'none' : '1px solid #e4e2dc',
                  opacity: isIndexed ? 1 : 0.55,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Petrona', Georgia, serif",
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: '-0.3px',
                    color: isIndexed ? '#0c1c1e' : '#4a5a54',
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 400,
                    fontSize: 11,
                    color: '#8a8a80',
                  }}
                >
                  {s.descriptor}
                </div>
                {!isIndexed && (
                  <div
                    style={{
                      marginTop: 6,
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 700,
                      fontSize: 9,
                      letterSpacing: '0.18em',
                      color: '#b08a40',
                      textTransform: 'uppercase',
                    }}
                  >
                    Coming
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Spacer before footer — the hero + sources strip stand alone now. */}
      <div style={{ height: 72 }} />

      <AggregatorFooter stats={stats} />
    </div>
  );
};

export default EmptyState;
