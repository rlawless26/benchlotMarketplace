/**
 * AggregatorHomePage — the single `/` shell.
 *
 * One page, two visual modes per the design handoff. State lives in
 * `useAggregatorState` (URL-sync), and we render EmptyState or ResultsState
 * based on `inResultsMode` — triggered by either a non-empty query or any
 * active filter. Scrolling does NOT change mode (PM contract).
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import EmptyState from './EmptyState';
import ResultsState from './ResultsState';
import { useAggregatorState } from '../../hooks/useAggregatorState';

const AggregatorHomePage = () => {
  const location = useLocation();
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

  // Single routing predicate per nav spec: EmptyState iff the URL is a truly
  // clean `/` (no query string at all). ANY search param — q, cat, maker,
  // src, browse=1, etc. — puts us in ResultsState. This is the "something in
  // the URL differentiates intentional browse from cold landing" contract.
  const isBrowseMode = location.search.length > 0;

  useEffect(() => {
    if (isBrowseMode) window.scrollTo({ top: 0 });
  }, [isBrowseMode]);

  useEffect(() => {
    document.title = isBrowseMode
      ? (query ? `${query} — Benchlot` : 'Results — Benchlot')
      : 'Benchlot';
  }, [isBrowseMode, query]);

  const actions = {
    setQuery,
    setSort,
    toggleFilter,
    setPriceRange,
    clearAllFilters,
  };

  if (isBrowseMode) {
    return (
      <ResultsState
        state={{ query, filters, sort, activeFilterChips, inResultsMode: isBrowseMode }}
        actions={actions}
      />
    );
  }

  return <EmptyState onSearch={setQuery} />;
};

export default AggregatorHomePage;
