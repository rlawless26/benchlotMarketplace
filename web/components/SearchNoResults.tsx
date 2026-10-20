'use client';

import { useEffect } from 'react';
import { track, SEARCH_NO_RESULTS_EVENT } from '@/lib/analytics';

/** Fires once per empty result page; the query is the list of pages the guide is missing. */
export default function SearchNoResults({ query }: { query: string }) {
  useEffect(() => {
    if (query) track(SEARCH_NO_RESULTS_EVENT, { query });
  }, [query]);
  return null;
}
