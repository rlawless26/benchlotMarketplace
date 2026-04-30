/**
 * AggregatorHomePage — the single `/` shell.
 *
 * Listings-first per the listings-first handoff. `/` always renders
 * ResultsState; the retired EmptyState's identity payload (live count,
 * "across the web" headline, quick-picks) lives on inside HomeIntroBanner,
 * which mounts at the top of ResultsState for first-time signed-out
 * visitors. State lives in `useAggregatorState` (URL-sync).
 */

import React, { useEffect } from 'react';

import ResultsState from './ResultsState';
import { useAggregatorState } from '../../hooks/useAggregatorState';

const AggregatorHomePage = () => {
  const state = useAggregatorState();
  const {
    query,
    filters,
    sort,
    activeFilterChips,
    setQuery,
    setSort,
    toggleFilter,
    setPriceRange,
    clearAllFilters,
  } = state;

  useEffect(() => {
    document.title = query ? `${query} — Benchlot` : 'Benchlot';
  }, [query]);

  const actions = {
    setQuery,
    setSort,
    toggleFilter,
    setPriceRange,
    clearAllFilters,
  };

  return (
    <ResultsState
      state={{ query, filters, sort, activeFilterChips, inResultsMode: true }}
      actions={actions}
    />
  );
};

export default AggregatorHomePage;
