/**
 * ResultsState — the aggregator's results view (query entered OR filter applied).
 *
 * Per `design_handoff_benchlot_homepage/README.md` §2 Results State.
 *
 * Composition:
 *   - StickyTopBar (sticky wordmark + search + filters + sort)
 *   - Breadcrumb strip with query echo, result count, active chips, Save-Alert
 *   - Two-column: FilterRail (240) + results column (grid + distribution strip)
 *   - SiteFooter (shared editorial footer, replaces the earlier AggregatorFooter)
 *
 * Server-side data comes from `getAggregatedListings()`; facet counts are
 * derived client-side from the returned rows so narrowing a filter updates
 * counts without another Firestore round trip.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';

import { getAggregatedListings } from '../../firebase/adapters/externalListingAdapter';
import {
  computeFacets,
  getAggregatorStats,
} from '../../firebase/adapters/aggregatorFacets';

import StickyTopBar from '../../components/aggregator/StickyTopBar';
import FilterRail from '../../components/aggregator/FilterRail';
import ResultCard from '../../components/aggregator/ResultCard';
import SaveAlertButton from '../../components/aggregator/SaveAlertButton';
import SiteFooter from '../../components/siteChrome/SiteFooter';

const CHIP_GROUP_PREFIX = {
  cat: 'Type',
  maker: 'Maker',
  cond: 'Condition',
  src: 'Source',
  age: 'Age',
  price: 'Price',
};

function filterLocally(raw, state) {
  const { query, filters } = state;
  const q = (query || '').trim().toLowerCase();
  return (raw || []).filter((l) => {
    if (q) {
      const hay = [l.name, l.brand, l.category, l.canonical_model]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters?.cat && l.category && !filters.cat[l.category]) return false;
    if (filters?.maker && l.brand && !filters.maker[l.brand]) return false;
    if (filters?.cond && l.condition && !filters.cond[l.condition]) return false;
    if (filters?.src && l.source && !filters.src[l.source]) return false;
    const price = filters?.price;
    if (price) {
      const p = l.price ?? null;
      if (price.min != null && (p == null || p < price.min)) return false;
      if (price.max != null && (p == null || p > price.max)) return false;
    }
    // `age` filter not plumbed yet — posted_at vs now comparisons are TODO.
    return true;
  });
}

function activeSourceIds(filters) {
  if (!filters?.src) return undefined;
  const ids = Object.keys(filters.src).filter((k) => filters.src[k]);
  return ids.length === 1 ? ids[0] : undefined; // only push single-source to server
}

function activeCategory(filters) {
  if (!filters?.cat) return undefined;
  const keys = Object.keys(filters.cat).filter((k) => filters.cat[k]);
  return keys.length === 1 ? keys[0] : undefined;
}

const ResultsState = ({ state, actions }) => {
  const { query, filters, sort, activeFilterChips } = state;
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ activeCount: null, lastScrapedAt: null });
  const [visibleLimit, setVisibleLimit] = useState(24);

  useEffect(() => {
    getAggregatorStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  // Server query — push the cheapest filters to Firestore, refine client-side.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAggregatedListings({
      limit: 200,
      sort,
      source: activeSourceIds(filters),
      canonicalType: activeCategory(filters),
    })
      .then((res) => {
        if (!cancelled) {
          setRaw(res.tools || []);
          setVisibleLimit(24);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Results load failed:', err);
          setError('Could not load listings. Please try again.');
          setRaw([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sort, filters.src, filters.cat]); // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side refinement (search query, price, multi-select, condition).
  const filtered = useMemo(() => filterLocally(raw, { query, filters }), [raw, query, filters]);
  const visible = useMemo(() => filtered.slice(0, visibleLimit), [filtered, visibleLimit]);

  const facets = useMemo(() => computeFacets(filtered), [filtered]);

  const priceRangeHelper = useMemo(() => {
    const prices = filtered.map((l) => l.price).filter((p) => typeof p === 'number');
    if (prices.length === 0) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `$${Math.round(min)}`;
    return `$${Math.round(min)} – $${Math.round(max)}`;
  }, [filtered]);

  const filterCount = activeFilterChips.length;

  const filterRailRef = useRef(null);
  const handleFilterClick = () => {
    if (filterRailRef.current) {
      filterRailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const headerTitle = query || 'All listings';

  return (
    <div className="bg-bone">
      {/* Unified sticky region: top bar + breadcrumb header. */}
      <div
        className="sticky top-0"
        style={{
          zIndex: 50,
          background: 'rgba(242,240,235,0.92)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid #e4e2dc',
        }}
      >
        <StickyTopBar
          query={query}
          onQueryChange={actions.setQuery}
          filterCount={filterCount}
          onFilterClick={handleFilterClick}
        />

        {/* Breadcrumb header — always shown; ResultsState only renders when
            there's a query or active filters. */}
        <div style={{ borderTop: '1px solid #e4e2dc' }}>
            <div
              className="flex items-center justify-between flex-wrap"
              style={{
                maxWidth: 1280,
                margin: '0 auto',
                padding: '14px 40px',
                gap: 16,
              }}
            >
              <div className="flex items-baseline flex-wrap" style={{ gap: 12 }}>
                <span
                  style={{
                    fontFamily: "'Petrona', Georgia, serif",
                    fontWeight: 700,
                    fontSize: 22,
                    letterSpacing: '-0.6px',
                    color: '#0c1c1e',
                  }}
                >
                  {headerTitle}
                </span>
                <span
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 500,
                    fontSize: 13,
                    color: '#4a5a54',
                  }}
                >
                  · <span style={{ fontWeight: 600, color: '#0c1c1e' }}>{filtered.length}</span>{' '}
                  result{filtered.length === 1 ? '' : 's'}
                </span>

                {/* Sort control — contextual to results (not in top bar). */}
                <div className="relative" style={{ marginLeft: 4 }}>
                  <label
                    htmlFor="results-sort"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 500,
                      fontSize: 13,
                      color: '#4a5a54',
                      marginRight: 6,
                    }}
                  >
                    · Sort:
                  </label>
                  <select
                    id="results-sort"
                    value={sort}
                    onChange={(e) => actions.setSort(e.target.value)}
                    style={{
                      appearance: 'none',
                      padding: '4px 22px 4px 4px',
                      background: 'transparent',
                      border: 0,
                      borderBottom: '1px dashed #8a8a80',
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 600,
                      fontSize: 13,
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
                      right: 4,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#4a5a54',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>
              <SaveAlertButton query={query} filters={filters} sort={sort} />
            </div>
          </div>
      </div>

      {/* Active filter chips — separate row below the sticky header */}
      {activeFilterChips.length > 0 && (
        <div style={{ background: '#f2f0eb', borderBottom: '1px solid #e4e2dc' }}>
          <div
            className="flex items-center flex-wrap"
            style={{
              maxWidth: 1280,
              margin: '0 auto',
              padding: '12px 40px',
              gap: 6,
            }}
          >
            <span
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                color: '#8a8a80',
                marginRight: 8,
              }}
            >
              FILTERS:
            </span>
            {activeFilterChips.map((chip) => (
              <span
                key={`${chip.group}:${chip.key}`}
                className="inline-flex items-center gap-1.5"
                style={{
                  padding: '4px 6px 4px 10px',
                  borderRadius: 4,
                  background: '#f8f6f2',
                  border: '1px solid #e4e2dc',
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 500,
                  fontSize: 12,
                  color: '#0c1c1e',
                  letterSpacing: '0.01em',
                }}
              >
                <span style={{ color: '#8a8a80', fontSize: 10 }}>
                  {CHIP_GROUP_PREFIX[chip.group]}:
                </span>
                {chip.label}
                <button
                  type="button"
                  onClick={() => {
                    if (chip.group === 'price') actions.setPriceRange(null, null);
                    else actions.toggleFilter(chip.group, chip.key);
                  }}
                  aria-label={`Remove filter ${chip.label}`}
                  className="cursor-pointer"
                  style={{
                    width: 16,
                    height: 16,
                    marginLeft: 2,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    color: '#4a5a54',
                    padding: 0,
                  }}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={actions.clearAllFilters}
              className="cursor-pointer"
              style={{
                marginLeft: 8,
                background: 'transparent',
                border: 'none',
                padding: 0,
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 500,
                fontSize: 11,
                color: '#4a5a54',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
              }}
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Main: filter rail + results (or soft-empty guidance) */}
      <main
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '28px 40px 80px',
        }}
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: '240px 1fr', gap: 40, alignItems: 'flex-start' }}
        >
          <div ref={filterRailRef}>
            <FilterRail
              filters={filters}
              toggleFilter={actions.toggleFilter}
              setPriceRange={actions.setPriceRange}
              clearAllFilters={actions.clearAllFilters}
              facets={facets}
              priceRangeHelper={priceRangeHelper}
            />
          </div>

          <div>
            {loading && (
              <div
                className="text-center"
                style={{
                  padding: '80px 0',
                  fontFamily: "'Outfit', sans-serif",
                  color: '#8a8a80',
                  fontSize: 13,
                }}
              >
                Loading listings…
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 8,
                  background: '#fef2f0',
                  color: '#a83a2a',
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            {!loading && !error && visible.length === 0 && (
              <div
                className="text-center"
                style={{
                  padding: '80px 0',
                  fontFamily: "'Outfit', sans-serif",
                  color: '#4a5a54',
                  fontSize: 14,
                }}
              >
                No listings match. Try widening the filters or clearing the search.
              </div>
            )}

            {!loading && !error && visible.length > 0 && (
              <div
                className="grid"
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 20,
                }}
              >
                {visible.map((tool) => (
                  <ResultCard key={tool.id} listing={tool} />
                ))}
              </div>
            )}

            {!loading && !error && filtered.length > visibleLimit && (
              <div className="text-center" style={{ marginTop: 48 }}>
                <button
                  type="button"
                  onClick={() => setVisibleLimit((v) => v + 24)}
                  className="cursor-pointer"
                  style={{
                    padding: '12px 28px',
                    background: '#f8f6f2',
                    border: '1px solid #d4d2cc',
                    borderRadius: 6,
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: 13,
                    color: '#1a3030',
                  }}
                >
                  Show more
                </button>
                <div
                  style={{
                    marginTop: 14,
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 400,
                    fontSize: 12,
                    color: '#8a8a80',
                  }}
                >
                  Showing {visible.length} of {filtered.length} results
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
};

export default ResultsState;
