/**
 * AggregatorHomePage — the single `/` shell.
 *
 * One page, two visual modes per the design handoff. State lives in
 * `useAggregatorState` (URL-sync), and we render EmptyState or ResultsState
 * based on `inResultsMode` — triggered by either a non-empty query or any
 * active filter. Scrolling does NOT change mode (PM contract).
 */

import React, { useEffect, useRef, useState } from 'react';
import EmptyState from './EmptyState';
import ResultsState from './ResultsState';
import { useAggregatorState } from '../../hooks/useAggregatorState';

const AggregatorHomePage = () => {
  const state = useAggregatorState();
  const {
    query,
    filters,
    sort,
    inResultsMode,
    activeFilterChips,
    setQuery,
    setSort,
    toggleFilter,
    setPriceRange,
    clearAllFilters,
  } = state;

  // Once the user has engaged with search/filters, keep them in the results
  // shell even after they clear — ResultsState shows inline guidance instead
  // of dumping them back to the hero. Full reset only happens on remount
  // (e.g. navigating away and back).
  const hasEngagedRef = useRef(inResultsMode);
  const [hasEngaged, setHasEngaged] = useState(inResultsMode);
  useEffect(() => {
    if (inResultsMode && !hasEngagedRef.current) {
      hasEngagedRef.current = true;
      setHasEngaged(true);
    }
  }, [inResultsMode]);

  // Scroll to top on the initial transition into results mode only.
  useEffect(() => {
    if (inResultsMode) window.scrollTo({ top: 0 });
  }, [inResultsMode]);

  useEffect(() => {
    document.title = inResultsMode
      ? (query ? `${query} — Benchlot` : 'Results — Benchlot')
      : 'Benchlot — A search engine for quality hand tools';
  }, [inResultsMode, query]);

  const actions = {
    setQuery,
    setSort,
    toggleFilter,
    setPriceRange,
    clearAllFilters,
  };

  if (inResultsMode || hasEngaged) {
    return (
      <ResultsState
        state={{ query, filters, sort, activeFilterChips, inResultsMode }}
        actions={actions}
      />
    );
  }

  return <EmptyState onSearch={setQuery} />;
};

export default AggregatorHomePage;
