/**
 * StickyTopBar — replaces the editorial header when in results state.
 * Pinned to top of viewport while scrolling results.
 *
 * Layout matches the homepage hero nav for smooth page-to-page transitions:
 *   Wordmark · [search input] · [mobile filter chip] · RAQ | (My Alerts | Sign in)
 *
 * Sort control used to live here but was moved to the breadcrumb row so the
 * top bar is just search + global nav (parallel to the homepage hero header).
 */

import React, { useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, X, SlidersHorizontal } from 'lucide-react';

import { useAuth } from '../../firebase/hooks/useAuth';
import { useAuthModal } from '../../context/AuthModalContext';

const StickyTopBar = ({ query, onQueryChange, filterCount = 0, onFilterClick }) => {
  const { user } = useAuth();
  const { open: openAuthModal } = useAuthModal();
  const location = useLocation();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // X-clear is a tactical "forget this query" action, NOT a navigation back
  // to the hero. Drop `q`, keep every other search param. If that would
  // leave the URL truly empty (just `/`), fall through to `/?browse=1` so
  // the user stays in the browsing shell rather than bouncing to EmptyState.
  // Per nav handoff Q2.
  const handleClear = () => {
    const params = new URLSearchParams(location.search);
    params.delete('q');
    const remaining = params.toString();
    navigate(remaining ? `/?${remaining}` : '/?browse=1', { replace: true });
    // Focus the input so users who cleared to type a new query can just go.
    window.requestAnimationFrame(() => {
      if (inputRef.current) inputRef.current.focus();
    });
  };
  // Wrapper is rendered by the parent (ResultsState owns the unified sticky
  // region so the distribution strip can pin alongside this bar).
  return (
    <div>
      <div
        className="flex items-center flex-wrap gap-y-2 gap-x-3 md:gap-x-5 px-4 md:px-10"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          paddingTop: 12,
          paddingBottom: 12,
        }}
      >
        {/* Wordmark */}
        <Link
          to="/"
          style={{
            flexShrink: 0,
            fontFamily: "'Petrona', Georgia, serif",
            fontWeight: 900,
            fontSize: 20,
            letterSpacing: '-1px',
            color: '#1a3030',
            textDecoration: 'none',
          }}
        >
          Benchlot
        </Link>

        {/* Search. On mobile, wraps to its own full-width row below the
            wordmark + nav (Reverb's mobile pattern — the search bar gets
            maximum room for placeholder text instead of being squeezed into
            an inline slot between logo and nav). On md+ it sits inline,
            flex-1 to grow with the available space, capped at 640px. The
            order-* classes drive the wrap behavior: wordmark (1) → nav (2)
            on row 1, search (3) wraps to row 2 on mobile; on md+ all three
            sit inline in their natural visual order (wordmark → search → nav). */}
        <div
          className="relative w-full order-3 md:order-2 md:w-auto md:flex-1"
          style={{ maxWidth: 640 }}
        >
          <Search
            size={18}
            aria-hidden
            style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#d4aa60',
              pointerEvents: 'none',
            }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search for a tool"
            style={{
              width: '100%',
              padding: '12px 44px 12px 46px',
              background: '#ffffff',
              border: '1.5px solid #1a3030',
              borderRadius: 8,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
              fontSize: 15,
              color: '#0c1c1e',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(12,28,30,0.06)',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="cursor-pointer"
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 26,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                color: '#4a5a54',
                padding: 0,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Right group: mobile filter button + global nav. order-2 on mobile
            (sits next to the wordmark on row 1, search wraps below); order-3
            on md+ (last in line, after the inline search). */}
        <div className="flex items-center gap-3 md:gap-5 order-2 md:order-3" style={{ flexShrink: 0, marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={onFilterClick}
            className="md:hidden inline-flex items-center cursor-pointer"
            style={{
              gap: 6,
              padding: '7px 12px',
              background: '#f8f6f2',
              border: '1px solid #e4e2dc',
              borderRadius: 6,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
              fontSize: 12,
              color: '#0c1c1e',
            }}
          >
            <SlidersHorizontal size={14} />
            Filters
            {filterCount > 0 && (
              <span
                className="inline-flex items-center justify-center"
                style={{
                  minWidth: 18,
                  height: 18,
                  borderRadius: 999,
                  background: '#d4aa60',
                  color: '#0c1c1e',
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 700,
                  fontSize: 10,
                  padding: '0 6px',
                }}
              >
                {filterCount}
              </span>
            )}
          </button>

          <nav
            className="flex items-center gap-3 md:gap-5"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            <Link to="/faq" style={{ color: '#4a5a54', textDecoration: 'none' }}>
              RAQ
            </Link>
            <span aria-hidden className="hidden sm:block" style={{ width: 1, height: 14, background: '#e4e2dc' }} />
            {user ? (
              <Link to="/alerts" style={{ color: '#1a3030', textDecoration: 'none' }}>
                My Alerts
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="cursor-pointer"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 500,
                  fontSize: 13,
                  color: '#1a3030',
                }}
              >
                Sign in
              </button>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default StickyTopBar;
