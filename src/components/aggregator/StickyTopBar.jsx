/**
 * StickyTopBar — replaces the editorial header when in results state.
 * Pinned to top of viewport while scrolling results.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';

import { useAuth } from '../../firebase/hooks/useAuth';

const StickyTopBar = ({ query, onQueryChange, sort, onSortChange, filterCount, onFilterClick }) => {
  const { user } = useAuth();
  // Wrapper is rendered by the parent (ResultsState owns the unified sticky
  // region so the distribution strip can pin alongside this bar).
  return (
    <div>
      <div
        className="flex items-center"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '12px 40px',
          gap: 20,
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

        {/* Search */}
        <div className="relative" style={{ flex: 1, maxWidth: 640 }}>
          <Search
            size={16}
            aria-hidden
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#4a5a54',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search across every source…"
            style={{
              width: '100%',
              padding: '10px 40px 10px 40px',
              background: '#f8f6f2',
              border: '1px solid #e4e2dc',
              borderRadius: 8,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
              fontSize: 14,
              color: '#0c1c1e',
              outline: 'none',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="Clear search"
              className="cursor-pointer"
              style={{
                position: 'absolute',
                right: 8,
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

        {/* Right group: filters (mobile only), sort, signin */}
        <div className="flex items-center" style={{ gap: 10, flexShrink: 0 }}>
          <button
            type="button"
            onClick={onFilterClick}
            className="md:hidden inline-flex items-center gap-1.5 cursor-pointer"
            style={{
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

          <div className="relative">
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              style={{
                appearance: 'none',
                padding: '7px 32px 7px 12px',
                background: '#f8f6f2',
                border: '1px solid #e4e2dc',
                borderRadius: 6,
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 500,
                fontSize: 12,
                color: '#0c1c1e',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="newest">Newest first</option>
              <option value="price_low">Price: low to high</option>
              <option value="price_high">Price: high to low</option>
              <option value="relevance">Relevance</option>
            </select>
            <ChevronDown
              size={12}
              aria-hidden
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#4a5a54',
                pointerEvents: 'none',
              }}
            />
          </div>

          {!user && (
            <>
              <span
                aria-hidden
                style={{ width: 1, height: 22, background: '#e4e2dc' }}
              />
              <Link
                to="/login"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 500,
                  fontSize: 13,
                  color: '#1a3030',
                  textDecoration: 'none',
                }}
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StickyTopBar;
