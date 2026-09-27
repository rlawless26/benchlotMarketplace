/**
 * AggregatorHomePage — the single `/` shell.
 *
 * Listings-first per the listings-first handoff. `/` always renders
 * ResultsState; the retired EmptyState's identity payload (live count,
 * "across the web" headline, quick-picks) lives on inside HomeIntroBanner,
 * which mounts at the top of ResultsState for first-time signed-out
 * visitors. State lives in `useAggregatorState` (URL-sync).
 */

import React from 'react';

import ResultsState from './ResultsState';
import { useAggregatorState } from '../../hooks/useAggregatorState';
import { usePageMeta } from '../../hooks/usePageMeta';

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

  usePageMeta({
    title: query
      ? `${query} — used tool listings and prices · Benchlot`
      : 'Benchlot — search used woodworking tools and see what they sell for',
    description:
      'One search across dealers, forum classifieds and auctions for used hand and power tools, with sold prices alongside. Save a search and get an email when a match appears.',
    canonical: query ? undefined : 'https://benchlot.com/',
  });

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
