// src/Pages/MarketplacePage.js
//
// Aggregator search surface. Queries the `externalListings` collection via
// src/firebase/adapters/externalListingAdapter.js and renders external-mode
// <ToolListingCard>s that link out to the source dealer/forum.
//
// Intentionally no subcategory/condition/verified/location filters — those
// were marketplace concepts. Price + search + canonical type + source are
// what survive the pivot.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import posthog from 'posthog-js';
import {
  ChevronDown,
  X,
  Filter,
  ArrowDownAZ as SortAsc,
  Search,
  Loader,
} from 'lucide-react';

import ToolListingCard from '../components/ToolListingCard';
import { getAggregatedListings } from '../firebase/adapters/externalListingAdapter';
import { sourceDisplayName } from '../firebase/adapters/sources';

// Kept in sync with functions/normalize/vocabulary.js — duplicated to avoid
// importing Cloud Functions code into the React bundle. If this list grows,
// factor to a shared JSON config.
const CANONICAL_TYPE_OPTIONS = [
  'All types',
  'Bench Plane',
  'Block Plane',
  'Shoulder Plane',
  'Router Plane',
  'Plow Plane',
  'Rabbet Plane',
  'Moulding Plane',
  'Infill Plane',
  'Scrub Plane',
  'Combination Plane',
  'Spokeshave',
  'Chisel',
  'Gouge',
  'Drawknife',
  'Cabinet Scraper',
  'Card Scraper',
  'Knife',
  'Hand Saw',
  'Back Saw',
  'Japanese Saw',
  'Coping Saw',
  'Frame Saw',
  'Brace',
  'Eggbeater Drill',
  'Drill Bit',
  'Auger Bit',
  'Hammer',
  'Mallet',
  'Axe',
  'Adze',
  'Hatchet',
  'Square',
  'Bevel Gauge',
  'Marking Gauge',
  'Mortise Gauge',
  'Rule',
  'Caliper',
  'Level',
  'Vise',
  'Clamp',
  'Holdfast',
  'Boring Machine',
  'Shaper',
];

// Known sources (extend as dealers are added). Display names live in sources.js.
const SOURCE_OPTIONS = [
  { slug: '', label: 'All sources' },
  { slug: 'jimbode', label: sourceDisplayName('jimbode') },
  { slug: 'hyperkitten', label: sourceDisplayName('hyperkitten') },
  { slug: 'leach', label: sourceDisplayName('leach') },
  { slug: 'ebay', label: sourceDisplayName('ebay') },
];

const PRICE_MAX = 5000;
const FETCH_LIMIT = 120;

const MarketplacePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('All types');
  const [selectedSource, setSelectedSource] = useState('');
  const [priceRange, setPriceRange] = useState([0, PRICE_MAX]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawListings, setRawListings] = useState([]);

  const filtersMounted = useRef(false);

  useEffect(() => {
    document.title = 'Search | Benchlot';
  }, []);

  // Load filters from URL on mount and whenever URL changes.
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam && CANONICAL_TYPE_OPTIONS.includes(typeParam)) {
      setSelectedType(typeParam);
    }

    const sourceParam = searchParams.get('source');
    if (sourceParam && SOURCE_OPTIONS.some((o) => o.slug === sourceParam)) {
      setSelectedSource(sourceParam);
    }

    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    if (minPrice !== null || maxPrice !== null) {
      setPriceRange([
        minPrice !== null ? parseInt(minPrice, 10) : 0,
        maxPrice !== null ? parseInt(maxPrice, 10) : PRICE_MAX,
      ]);
    }

    const queryParam = searchParams.get('query');
    if (queryParam) setSearchQuery(queryParam);

    const sortParam = searchParams.get('sort');
    if (sortParam && ['newest', 'price_low', 'price_high'].includes(sortParam)) {
      setSortBy(sortParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push filter state to URL.
  const updateUrlParams = () => {
    const newParams = new URLSearchParams();
    if (selectedType !== 'All types') newParams.set('type', selectedType);
    if (selectedSource) newParams.set('source', selectedSource);
    if (priceRange[0] > 0) newParams.set('minPrice', String(priceRange[0]));
    if (priceRange[1] < PRICE_MAX) newParams.set('maxPrice', String(priceRange[1]));
    if (searchQuery) newParams.set('query', searchQuery);
    if (sortBy !== 'newest') newParams.set('sort', sortBy);
    setSearchParams(newParams);
  };

  // Fetch listings whenever the filters that change the server query change.
  // Price + search are applied client-side on the fetched slice.
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getAggregatedListings({
          canonicalType: selectedType !== 'All types' ? selectedType : undefined,
          source: selectedSource || undefined,
          sort: sortBy,
          limit: FETCH_LIMIT,
        });
        setRawListings(result.tools || []);
      } catch (err) {
        console.error('Failed to load aggregated listings:', err);
        setError('Could not load listings. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    if (filtersMounted.current) {
      posthog.capture('search_performed', {
        type: selectedType !== 'All types' ? selectedType : null,
        source: selectedSource || null,
        sort: sortBy,
      });
    } else {
      filtersMounted.current = true;
    }
    load();
    updateUrlParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedSource, sortBy]);

  // Reflect price + search changes back into the URL without refetching.
  useEffect(() => {
    updateUrlParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceRange, searchQuery]);

  // Track search query changes with debounce (500ms).
  useEffect(() => {
    if (!searchQuery) return;
    const timer = setTimeout(() => {
      posthog.capture('search_performed', { query: searchQuery });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Client-side text + price filter over the current fetched slice.
  const visibleListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rawListings.filter((t) => {
      const price = t.price ?? 0;
      if (price < priceRange[0] || price > priceRange[1]) return false;
      if (!q) return true;
      const haystack = [
        t.name,
        t.brand,
        t.category,
        t.canonical_model,
        t.canonical_size,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rawListings, searchQuery, priceRange]);

  const resetFilters = () => {
    setSelectedType('All types');
    setSelectedSource('');
    setPriceRange([0, PRICE_MAX]);
    setSearchQuery('');
    setSortBy('newest');
    setSearchParams({});
  };

  const filterPanel = (idPrefix = '') => (
    <>
      {/* Type */}
      <div className="mb-6">
        <h3 className="font-medium text-dark-teal mb-3">Type</h3>
        <div className="space-y-1 max-h-72 overflow-y-auto pr-2">
          {CANONICAL_TYPE_OPTIONS.map((type) => (
            <div key={type} className="flex items-center">
              <input
                type="radio"
                id={`${idPrefix}type-${type}`}
                name={`${idPrefix}type`}
                checked={selectedType === type}
                onChange={() => setSelectedType(type)}
                className="mr-2 h-4 w-4 text-spruce focus:ring-spruce"
              />
              <label htmlFor={`${idPrefix}type-${type}`} className="text-sm text-secondary">
                {type}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Source */}
      <div className="mb-6">
        <h3 className="font-medium text-dark-teal mb-3">Source</h3>
        <div className="space-y-2">
          {SOURCE_OPTIONS.map((opt) => (
            <div key={opt.slug || 'all'} className="flex items-center">
              <input
                type="radio"
                id={`${idPrefix}source-${opt.slug || 'all'}`}
                name={`${idPrefix}source`}
                checked={selectedSource === opt.slug}
                onChange={() => setSelectedSource(opt.slug)}
                className="mr-2 h-4 w-4 text-spruce focus:ring-spruce"
              />
              <label htmlFor={`${idPrefix}source-${opt.slug || 'all'}`} className="text-sm text-secondary">
                {opt.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Price */}
      <div className="mb-6">
        <h3 className="font-medium text-dark-teal mb-3">Price</h3>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-secondary">$</span>
          <input
            type="number"
            min="0"
            value={priceRange[0]}
            onChange={(e) => setPriceRange([parseInt(e.target.value, 10) || 0, priceRange[1]])}
            className="w-full px-3 py-1 border border-stone-300 rounded-md text-sm"
          />
          <span className="text-sm text-secondary">to</span>
          <span className="text-sm text-secondary">$</span>
          <input
            type="number"
            min="0"
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value, 10) || PRICE_MAX])}
            className="w-full px-3 py-1 border border-stone-300 rounded-md text-sm"
          />
        </div>
        <input
          type="range"
          min="0"
          max={PRICE_MAX}
          value={priceRange[1]}
          onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value, 10)])}
          className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <button
        className="w-full py-2 border border-stone-300 rounded-md text-secondary hover:bg-bone text-sm"
        onClick={resetFilters}
      >
        Reset Filters
      </button>
    </>
  );

  return (
    <div className="bg-bone min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-medium text-dark-teal mb-2">
            Search quality hand tools
          </h1>
          <p className="text-secondary">
            One search across the dealers, forums, and auctions woodworkers already trust. Every click goes back to the source.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop filters */}
          <div className="hidden lg:block">
            <div className="bg-bone-light p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-medium mb-4 text-dark-teal">Filters</h2>
              {filterPanel()}
            </div>
          </div>

          {/* Main */}
          <div className="lg:col-span-3">
            {/* Search + sort */}
            <div className="bg-bone-light p-4 rounded-lg shadow-md mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-1/2">
                <input
                  type="text"
                  placeholder="Search tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-md focus:outline-none focus:border-spruce"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-stone-400" />
              </div>

              <button
                className="lg:hidden flex items-center gap-2 px-4 py-2 border border-stone-300 rounded-md text-secondary"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>

              <div className="relative group w-full md:w-auto">
                <button className="w-full md:w-auto flex items-center justify-between gap-2 px-4 py-2 border border-stone-300 rounded-md text-secondary">
                  <div className="flex items-center gap-2">
                    <SortAsc className="h-4 w-4" />
                    <span>
                      Sort: {sortBy === 'newest' ? 'Newest' : sortBy === 'price_low' ? 'Price: Low to High' : 'Price: High to Low'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </button>
                <div className="absolute right-0 top-full mt-1 bg-bone-light shadow-lg rounded-md p-1 min-w-[200px] hidden group-hover:block z-10">
                  {[
                    ['newest', 'Newest'],
                    ['price_low', 'Price: Low to High'],
                    ['price_high', 'Price: High to Low'],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      className="w-full text-left px-3 py-2 text-secondary hover:bg-bone-dark hover:text-spruce rounded-md text-sm"
                      onClick={() => setSortBy(val)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active filter chips */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {selectedType !== 'All types' && (
                <span className="inline-flex items-center bg-bone-dark text-spruce text-xs px-2 py-1 rounded-full">
                  {selectedType}
                  <button className="ml-1 text-spruce" onClick={() => setSelectedType('All types')}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedSource && (
                <span className="inline-flex items-center bg-bone-dark text-spruce text-xs px-2 py-1 rounded-full">
                  {sourceDisplayName(selectedSource)}
                  <button className="ml-1 text-spruce" onClick={() => setSelectedSource('')}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {(priceRange[0] > 0 || priceRange[1] < PRICE_MAX) && (
                <span className="inline-flex items-center bg-bone-dark text-spruce text-xs px-2 py-1 rounded-full">
                  ${priceRange[0]} - ${priceRange[1]}
                  <button className="ml-1 text-spruce" onClick={() => setPriceRange([0, PRICE_MAX])}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center bg-bone-dark text-spruce text-xs px-2 py-1 rounded-full">
                  Search: {searchQuery}
                  <button className="ml-1 text-spruce" onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {(selectedType !== 'All types' || selectedSource || priceRange[0] > 0 || priceRange[1] < PRICE_MAX || searchQuery) && (
                <button className="text-xs text-spruce hover:text-spruce-light ml-2" onClick={resetFilters}>
                  Clear all
                </button>
              )}
            </div>

            {/* Count */}
            <div className="mb-4">
              <p className="text-secondary">
                {loading ? 'Loading listings...' : `Showing ${visibleListings.length} of ${rawListings.length} loaded`}
              </p>
            </div>

            {loading && (
              <div className="flex justify-center items-center py-12">
                <Loader className="h-8 w-8 text-spruce animate-spin" />
                <span className="ml-2 text-secondary">Loading listings...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-error px-4 py-3 rounded-md mb-6">
                {error}
              </div>
            )}

            {!loading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleListings.map((tool) => (
                  <ToolListingCard key={tool.id} tool={tool} />
                ))}
              </div>
            )}

            {!loading && !error && visibleListings.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-dark-teal mb-2">No listings match</h3>
                <p className="text-secondary mb-6">Try broadening the filters or clearing the search.</p>
                <button className="px-4 py-2 bg-honey text-dark-teal rounded-md hover:bg-honey-light" onClick={resetFilters}>
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile filter panel */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          <div className="absolute inset-0 bg-dark-teal bg-opacity-75" onClick={() => setMobileFiltersOpen(false)}></div>
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="relative w-screen max-w-md">
              <div className="h-full flex flex-col bg-bone-light shadow-xl overflow-y-scroll">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h2 className="text-lg font-medium text-dark-teal">Filters</h2>
                  <button className="text-secondary hover:text-dark-teal" onClick={() => setMobileFiltersOpen(false)}>
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="p-4">{filterPanel('mobile-')}</div>
                <div className="border-t px-4 py-4 mt-auto">
                  <div className="flex gap-4">
                    <button className="flex-1 px-4 py-2 border border-stone-300 rounded-md text-secondary hover:bg-bone" onClick={resetFilters}>
                      Reset
                    </button>
                    <button className="flex-1 px-4 py-2 bg-honey text-dark-teal rounded-md hover:bg-honey-light" onClick={() => setMobileFiltersOpen(false)}>
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;
