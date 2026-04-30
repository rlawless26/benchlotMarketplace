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
import { useLocation, useNavigate } from 'react-router-dom';
import { X, ChevronDown, SlidersHorizontal } from 'lucide-react';

import { getAggregatedListings } from '../../firebase/adapters/externalListingAdapter';
import { computeFacets, getAggregatorStats, getSourceCounts } from '../../firebase/adapters/aggregatorFacets';
import { SOURCES } from '../../firebase/adapters/sources';
import { useAuth } from '../../firebase/hooks/useAuth';

import StickyTopBar from '../../components/aggregator/StickyTopBar';
import FilterRail from '../../components/aggregator/FilterRail';
import ResultCard from '../../components/aggregator/ResultCard';
import SaveAlertButton from '../../components/aggregator/SaveAlertButton';
import SiteFooter from '../../components/siteChrome/SiteFooter';
import HomeIntroBanner from '../../components/aggregator/HomeIntroBanner';
import { BROWSE_CHIPS } from './browseChips';

const HIB_STORAGE_KEY = 'benchlot.hib.dismissed';

const CHIP_GROUP_PREFIX = {
  cat: 'Type',
  maker: 'Maker',
  cond: 'Condition',
  src: 'Source',
  price: 'Price',
};

/**
 * A title that's selling a part, replacement piece, or accessory rather
 * than the named tool itself. eBay especially is full of "iron for Stanley
 * 4 1/2", "tote & knob for Lie Nielsen #4", "replacement blade for
 * WoodRiver block plane" — substring-search matches them on the brand
 * keyword and they crowd out actual tools at the top of results.
 *
 * Returns true for the accessory pattern. We use this to soft-demote
 * (NOT exclude) within search results — accessories still appear, just
 * after real tools in the same query.
 */
function isLikelyAccessory(name) {
  if (!name) return false;
  const t = ` ${String(name).toLowerCase()} `;
  return (
    / iron(s)? for /.test(t) ||
    / blade(s)? for /.test(t) ||
    / tote (and|&) knob /.test(t) ||
    / tote for /.test(t) ||
    / knob for /.test(t) ||
    / handle for /.test(t) ||
    / fence for /.test(t) ||
    / parts? for /.test(t) ||
    / assembly for /.test(t) ||
    / cap (iron|for) /.test(t) ||
    / chipbreaker /.test(t) ||
    / lever cap /.test(t) ||
    / cutting iron /.test(t) ||
    / plane iron(s)? /.test(t) ||
    / replacement (blade|iron|chipbreaker|knob|tote|fence|piece|part) /.test(t) ||
    / spare part /.test(t)
  );
}

function filterLocally(raw, state) {
  const { query, filters } = state;
  const q = (query || '').trim().toLowerCase();
  const matches = (raw || []).filter((l) => {
    if (q) {
      const hay = [l.name, l.brand, l.category, l.canonical_model]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters?.cat && !filters.cat[l.category]) return false;
    // Maker filter — null brand maps to the synthesized "Unknown" facet so
    // users can include or exclude no-brand listings explicitly.
    if (filters?.maker) {
      const key = l.brand || 'Unknown';
      if (!filters.maker[key]) return false;
    }
    if (filters?.cond && !filters.cond[l.condition]) return false;
    if (filters?.src && l.source && !filters.src[l.source]) return false;
    if (filters?.pics?.yes && !l.imageUrl) return false;
    const price = filters?.price;
    if (price) {
      const p = l.price ?? null;
      if (price.min != null && (p == null || p < price.min)) return false;
      if (price.max != null && (p == null || p > price.max)) return false;
    }
    return true;
  });

  // De-rank by tier so the front of the feed is dominated by signal. Three
  // independent demotion bits, summed:
  //   +4 — no image (sinks text-only forum posts below visual ones; forum
  //        sellers commonly post text-only, especially Sawmill Creek where
  //        ~70% of posts have no images)
  //   +2 — no brand AND no maker filter active (when the user has explicitly
  //        picked a maker, the listings already share that brand and there's
  //        nothing to de-rank by)
  //   +1 — accessory-language title AND there's a search query (without one,
  //        accessory-vs-tool inference is too noisy to act on)
  // Stable within each tier so the adapter's sort order (best/newest/price)
  // survives.
  const makerFilterActive = !!(filters?.maker && Object.keys(filters.maker).length > 0);
  const ranked = matches.map((m, i) => {
    const noImage = !m.imageUrl;
    const noBrand = !m.brand && !makerFilterActive;
    const acc = q ? isLikelyAccessory(m.name) : false;
    return { m, i, rank: (noImage ? 4 : 0) + (noBrand ? 2 : 0) + (acc ? 1 : 0) };
  });
  ranked.sort((a, b) => a.rank - b.rank || a.i - b.i);
  return ranked.map((r) => r.m);
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
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleLimit, setVisibleLimit] = useState(24);
  // Total active count across all sources — fetched via Firestore's count()
  // aggregate (one cheap roundtrip, no doc reads) and displayed in the
  // breadcrumb header when no filters/query are active. Lets us decouple
  // "what we render" from "how big the catalog actually is" so the
  // per-source fetch cap below can stay aggressive without making the
  // displayed total look small.
  const [totalActive, setTotalActive] = useState(null);
  // True per-source active counts — used by the Source filter so its
  // numbers reflect the real catalog instead of the 2,500/source fetch cap.
  // count() aggregates are a single roundtrip each with no doc reads.
  const [sourceCounts, setSourceCounts] = useState(null);
  useEffect(() => {
    getAggregatorStats()
      .then((s) => setTotalActive(s.activeCount))
      .catch(() => {});
    const indexedIds = SOURCES.filter((s) => s.indexed).map((s) => s.id);
    getSourceCounts(indexedIds)
      .then((counts) => setSourceCounts(counts))
      .catch(() => {});
  }, []);

  // HomeIntroBanner — dismissal is per-device, persisted in localStorage. We
  // own the state here (not in the banner) so the persistent quick-picks
  // chip row can stay in sync: chips show only when the banner is hidden AND
  // there's no query/filter narrowing the view.
  const [hibDismissed, setHibDismissed] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.localStorage &&
      window.localStorage.getItem(HIB_STORAGE_KEY) === '1'
  );
  useEffect(() => {
    // Debug reset — exposed so reviewers can re-trigger the banner from the
    // browser console without clearing all localStorage.
    if (typeof window === 'undefined') return undefined;
    window.__benchlotResetIntroBanner = () => {
      try {
        window.localStorage.removeItem(HIB_STORAGE_KEY);
      } catch (e) {}
      window.location.reload();
    };
    return undefined;
  }, []);
  const dismissHib = () => {
    try {
      window.localStorage.setItem(HIB_STORAGE_KEY, '1');
    } catch (e) {}
    setHibDismissed(true);
  };
  // Recall — re-open the banner without clearing the localStorage flag, so
  // the dismissal still sticks on refresh. Bound to the chevron on the
  // persistent quick-picks eyebrow.
  const recallHib = () => setHibDismissed(false);
  // Banner visibility — three conditions, cheapest first.
  const hibVisible = !user && location.search.length === 0 && !hibDismissed;
  // Persistent quick-picks chip row — appears only when the banner is
  // hidden, no query is active, and no filters are active. The active-filter
  // chip row already handles the "you have filters" case.
  const showPersistentChips =
    !hibVisible && !query && activeFilterChips.length === 0;
  const onChipClick = (chip) => {
    navigate(`/?${chip.param}=${encodeURIComponent(chip.value)}`);
  };

  // Server query — push the cheapest filters to Firestore, refine client-side.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAggregatedListings({
      // Per-source cap. History: 200 (initial) → 2500 (Jim Bode passed 200)
      // → 8000 (eBay launched at 5,829) → 2500 (post-launch perf pass —
      // fetching 9,500+ docs on every page load was making the all-listings
      // page slow on mobile). 2500 keeps client-side memory + network
      // payload manageable; the displayed "X results" total now comes from
      // a separate count() aggregate (totalActive) so the cap doesn't make
      // the count appear artificially low when no filter is active. If a
      // single source ever passes 2500 active items beyond eBay (Jim Bode
      // is currently 832), bump or split per-source limits.
      limit: 2500,
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
  // Mobile filter sheet — toggled by the Filters button in the breadcrumb
  // row. On md+ the FilterRail is always visible inline; this state is
  // mobile-only.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Lock body scroll while the mobile filter sheet is open so the rail
  // scrolls instead of the page underneath.
  useEffect(() => {
    if (!mobileFiltersOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileFiltersOpen]);

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
        />

        {/* Breadcrumb header — always shown; ResultsState only renders when
            there's a query or active filters. Tighter vertical padding on
            mobile (8px) so the sticky header doesn't eat the whole viewport
            on narrow screens; desktop keeps the original 14px breathing room. */}
        <div style={{ borderTop: '1px solid #e4e2dc' }}>
            <div
              className="flex items-center flex-wrap px-4 md:px-10"
              style={{
                maxWidth: 1280,
                margin: '0 auto',
                paddingTop: 8,
                paddingBottom: 8,
                rowGap: 8,
                columnGap: 12,
              }}
            >
              {/* Title cluster takes its own row on mobile (w-full) so the
                 Filters + Sort cluster can wrap below as a single 'refine'
                 toolbar — Filters left, Sort right, mirroring the desktop
                 left-rail/right-sort split. On md+ it sits inline with the
                 right cluster as before. */}
              <div className="flex items-baseline flex-wrap w-full md:w-auto" style={{ gap: 8 }}>
                <span
                  className="aggregator-header-title"
                  style={{
                    fontFamily: "'Petrona', Georgia, serif",
                    fontWeight: 700,
                    fontSize: 18,
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
                  · <span style={{ fontWeight: 600, color: '#0c1c1e' }}>
                    {/* Show the global active total when nothing is narrowing
                       the view; show the filtered subset count otherwise. The
                       total comes from a count() aggregate so it stays
                       accurate even though the per-source fetch cap is well
                       below the full catalog. While the count() is in flight
                       (totalActive=null) fall back to filtered.length so the
                       UI never blanks. */}
                    {(!query && activeFilterChips.length === 0 && totalActive != null
                      ? totalActive
                      : filtered.length
                    ).toLocaleString()}
                  </span>{' '}
                  result{filtered.length === 1 ? '' : 's'}
                </span>

                {/* Mobile-only banner recall — chevron next to the title,
                    same predicate as the desktop persistent chips row.
                    Click re-opens the HomeIntroBanner without clearing
                    localStorage, so the dismissal still sticks on refresh. */}
                {showPersistentChips && (
                  <button
                    type="button"
                    onClick={recallHib}
                    aria-label="Show intro again"
                    title="Show intro again"
                    className="md:hidden inline-flex items-center justify-center cursor-pointer"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: '1px solid #e4e2dc',
                      background: '#f8f6f2',
                      color: '#4a5a54',
                      padding: 0,
                    }}
                  >
                    <ChevronDown size={14} aria-hidden />
                  </button>
                )}
              </div>

              {/* Mobile-only Filters button. Lives in the same row as Sort
                  on mobile (per pattern: Filters and Sort are both 'refine
                  current results' controls, naturally paired). mr-auto pins
                  it to the left of the row. Hidden at md+ where the
                  FilterRail is permanently visible inline. */}
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                aria-label="Open filters"
                className="md:hidden inline-flex items-center cursor-pointer mr-auto"
                style={{
                  gap: 6,
                  padding: '6px 12px',
                  background: '#fff',
                  border: '1px solid #d4d2cc',
                  borderRadius: 6,
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
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

              {/* Right cluster — sort control + save-alert action. Sort is
                  conventionally right-aligned in aggregator toolbars (eBay,
                  Etsy, Reverb). ml-auto pins it to the right edge regardless
                  of which row it lands on (mobile: paired with Filters on
                  row 2; desktop: inline with title/count on row 1). */}
              <div className="flex items-center flex-wrap ml-auto" style={{ gap: 8 }}>
                <div className="relative flex items-center">
                  {/* Hide "Sort:" label on mobile to save horizontal space —
                     the dropdown's selected value is self-explanatory. */}
                  <label
                    htmlFor="results-sort"
                    className="hidden md:inline"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 500,
                      fontSize: 13,
                      color: '#4a5a54',
                      marginRight: 8,
                    }}
                  >
                    Sort:
                  </label>
                  <div className="relative">
                    <select
                      id="results-sort"
                      value={sort}
                      onChange={(e) => actions.setSort(e.target.value)}
                      style={{
                        appearance: 'none',
                        padding: '6px 28px 6px 12px',
                        background: '#fff',
                        border: '1px solid #d4d2cc',
                        borderRadius: 6,
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 600,
                        fontSize: 13,
                        color: '#0c1c1e',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="best">Best match</option>
                      <option value="newest">Newest</option>
                      <option value="price_low">Price: low to high</option>
                      <option value="price_high">Price: high to low</option>
                    </select>
                    <ChevronDown
                      size={14}
                      aria-hidden
                      style={{
                        position: 'absolute',
                        right: 8,
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
      </div>

      {/* HomeIntroBanner — first-visit identity strip for signed-out users
          on a clean `/`. Hides once dismissed (per-device localStorage),
          when signed in, or whenever a query/filter is active. */}
      <HomeIntroBanner visible={hibVisible} onDismiss={dismissHib} />

      {/* Persistent quick-picks row — slim chip strip that replaces the
          banner's chips for returning visitors. Only visible when the
          banner is hidden AND no query/filter is narrowing the view; the
          moment the user filters or searches, this hides and the
          active-filter chip row below takes over. Hidden on mobile —
          chips are too cramped on phones, and without chips the recall
          chevron has no obvious context. */}
      {showPersistentChips && (
        <div
          className="hidden md:block"
          style={{
            background: '#f2f0eb',
            borderBottom: '1px solid #eceae4',
          }}
        >
          <div
            className="flex items-center flex-wrap px-4 md:px-10"
            style={{
              maxWidth: 1280,
              margin: '0 auto',
              paddingTop: 10,
              paddingBottom: 10,
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#8a8a80',
                marginRight: 4,
              }}
            >
              Quick picks
            </span>
            {BROWSE_CHIPS.map((chip) => (
              <button
                key={`${chip.param}:${chip.value}`}
                type="button"
                onClick={() => onChipClick(chip)}
                className="cursor-pointer"
                style={{
                  padding: '5px 11px',
                  borderRadius: 999,
                  border: '1px solid #e4e2dc',
                  background: '#f8f6f2',
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 500,
                  fontSize: 12,
                  color: '#0c1c1e',
                }}
              >
                {chip.label}
              </button>
            ))}
            {/* Recall trigger — slot mirrors the dismiss X's position in the
                open-banner state so the affordance reads as "inverse of
                dismiss," not "more chips behind a disclosure." Click
                re-opens the banner; the localStorage flag is left intact so
                refresh still respects the prior dismissal. */}
            <button
              type="button"
              onClick={recallHib}
              aria-label="Show intro again"
              title="Show intro again"
              className="cursor-pointer"
              style={{
                marginLeft: 'auto',
                width: 28,
                height: 28,
                borderRadius: 6,
                border: '1px solid #e4e2dc',
                background: '#f8f6f2',
                color: '#4a5a54',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <ChevronDown size={14} aria-hidden />
            </button>
          </div>
        </div>
      )}

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
        className="px-4 md:px-10"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          paddingTop: 28,
          paddingBottom: 80,
        }}
      >
        <div
          className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 md:gap-10"
          style={{ alignItems: 'flex-start' }}
        >
          {/* Filter rail.
             - md+: inline 240px sidebar, always visible.
             - mobile: hidden by default; toggled into a full-height bottom
               sheet by the Filters button in StickyTopBar. The sheet covers
               the page content (z-50 + body scroll-lock) so the rail itself
               scrolls without the page moving underneath. */}
          <div ref={filterRailRef} className="hidden md:block">
            <FilterRail
              filters={filters}
              toggleFilter={actions.toggleFilter}
              setPriceRange={actions.setPriceRange}
              clearAllFilters={actions.clearAllFilters}
              facets={facets}
              sourceCounts={sourceCounts}
              priceRangeHelper={priceRangeHelper}
            />
          </div>

          {mobileFiltersOpen && (
            <div
              className="md:hidden fixed inset-0 flex flex-col"
              style={{ zIndex: 60, background: 'var(--bone)' }}
            >
              {/* Sticky sheet header — title + Done button. */}
              <div
                className="flex items-center justify-between px-4"
                style={{
                  paddingTop: 14,
                  paddingBottom: 14,
                  borderBottom: '1px solid #e4e2dc',
                  background: 'var(--bone)',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Petrona', Georgia, serif",
                    fontWeight: 700,
                    fontSize: 18,
                    color: '#0c1c1e',
                  }}
                >
                  Filters{filterCount > 0 ? ` · ${filterCount} active` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  aria-label="Close filters"
                  className="cursor-pointer inline-flex items-center"
                  style={{
                    gap: 4,
                    padding: '6px 12px',
                    background: '#0c1c1e',
                    color: '#f2f0eb',
                    border: 'none',
                    borderRadius: 6,
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  Done
                </button>
              </div>
              {/* Scrollable rail body. */}
              <div className="overflow-y-auto px-4" style={{ flex: 1, paddingTop: 12, paddingBottom: 24 }}>
                <FilterRail
                  filters={filters}
                  toggleFilter={actions.toggleFilter}
                  setPriceRange={actions.setPriceRange}
                  clearAllFilters={actions.clearAllFilters}
                  facets={facets}
                  priceRangeHelper={priceRangeHelper}
                />
              </div>
            </div>
          )}

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
      </main>

      <SiteFooter />
    </div>
  );
};

export default ResultsState;
