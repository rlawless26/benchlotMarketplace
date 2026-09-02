/**
 * Aggregator state hook — single source of truth for the homepage's
 * `{ query, filters, sort }` shape. Synced to URL search params so deep
 * links, refreshes, and share-URLs all round-trip cleanly.
 *
 * Filter groups: cat (type), maker, cond, src. Multi-select stored as
 * Record<key, true>. Price handled as { min, max } separately.
 */

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const MULTI_GROUPS = ['cat', 'maker', 'cond', 'src', 'pics', 'state'];

// Some filter groups use opaque keys ("yes" for the pics toggle) where the
// raw key isn't a great chip label. Map those here.
const CHIP_LABEL_OVERRIDES = {
  pics: { yes: 'With photos' },
};
const VALID_SORTS = ['best', 'newest', 'price_low', 'price_high', 'relevance'];
// 'newest' — the neutral default. The old default, 'best', round-robins one
// slot per source, which is an editorial claim (every source deserves equal
// page-1 space) and in practice pinned a dead source's months-old listings to
// the top forever: reddit's 6 stale posts each took a first-dozen slot. Newest
// answers "what's in the index?" with the newest things in the index. 'best'
// survives as the "Mixed sources" option, and ?sort=best links still work.
const DEFAULT_SORT = 'newest';

function parseFromParams(params) {
  const query = params.get('q') || '';
  const sort = VALID_SORTS.includes(params.get('sort')) ? params.get('sort') : DEFAULT_SORT;
  const filters = {};

  for (const group of MULTI_GROUPS) {
    const raw = params.get(group);
    if (!raw) continue;
    const values = raw.split('|').map((v) => v.trim()).filter(Boolean);
    if (values.length > 0) {
      filters[group] = Object.fromEntries(values.map((v) => [v, true]));
    }
  }

  const minRaw = params.get('min');
  const maxRaw = params.get('max');
  const price = {};
  if (minRaw != null && minRaw !== '' && !Number.isNaN(Number(minRaw))) price.min = Number(minRaw);
  if (maxRaw != null && maxRaw !== '' && !Number.isNaN(Number(maxRaw))) price.max = Number(maxRaw);
  if (price.min != null || price.max != null) filters.price = price;

  return { query, filters, sort };
}

function serializeToParams(state) {
  const params = new URLSearchParams();
  // Don't trim the value — the input is controlled by URL state, so trimming
  // on every keystroke makes trailing spaces impossible (the space the user
  // just typed gets stripped before it round-trips back into the input). We
  // still gate on `.trim()` so a whitespace-only query doesn't pollute the
  // URL with `?q=+++`.
  if (state.query && state.query.trim()) params.set('q', state.query);
  for (const group of MULTI_GROUPS) {
    const g = state.filters?.[group];
    if (g && typeof g === 'object') {
      const keys = Object.keys(g).filter((k) => g[k]);
      if (keys.length > 0) params.set(group, keys.join('|'));
    }
  }
  const price = state.filters?.price;
  if (price?.min != null) params.set('min', String(price.min));
  if (price?.max != null) params.set('max', String(price.max));
  if (state.sort && state.sort !== DEFAULT_SORT) params.set('sort', state.sort);
  return params;
}

/**
 * Returns `{ query, filters, sort, actions, inResultsMode, activeFilterChips }`.
 * `actions` mutates URL params — state stays URL-canonical.
 */
export function useAggregatorState() {
  const [params, setParams] = useSearchParams();

  const state = useMemo(() => parseFromParams(params), [params]);

  const writeParams = useCallback(
    (next) => {
      const p = serializeToParams(next);
      // If the next state has zero query + zero filters + default sort, the
      // serialized URLSearchParams is empty. A clean `/` would re-show the
      // HomeIntroBanner for anon visitors, which is wrong for intra-session
      // actions like clearAllFilters — the user is mid-browse, not arriving
      // cold. Inject `browse=1` so the URL stays non-empty and the banner
      // visibility predicate keeps it hidden.
      if (p.toString() === '') p.set('browse', '1');
      setParams(p);
    },
    [setParams]
  );

  const setQuery = useCallback(
    (q) => writeParams({ ...state, query: q }),
    [state, writeParams]
  );

  const setSort = useCallback(
    (sort) => writeParams({ ...state, sort: VALID_SORTS.includes(sort) ? sort : DEFAULT_SORT }),
    [state, writeParams]
  );

  const toggleFilter = useCallback(
    (group, key) => {
      const next = { ...state, filters: { ...state.filters } };
      const current = { ...(next.filters[group] || {}) };
      if (current[key]) delete current[key];
      else current[key] = true;
      if (Object.keys(current).length === 0) delete next.filters[group];
      else next.filters[group] = current;
      writeParams(next);
    },
    [state, writeParams]
  );

  const setPriceRange = useCallback(
    (min, max) => {
      const next = { ...state, filters: { ...state.filters } };
      const price = {};
      if (min != null && min !== '' && !Number.isNaN(Number(min))) price.min = Number(min);
      if (max != null && max !== '' && !Number.isNaN(Number(max))) price.max = Number(max);
      if (price.min != null || price.max != null) next.filters.price = price;
      else delete next.filters.price;
      writeParams(next);
    },
    [state, writeParams]
  );

  const clearAllFilters = useCallback(() => {
    writeParams({ ...state, filters: {} });
  }, [state, writeParams]);

  const clearAll = useCallback(() => {
    writeParams({ query: '', filters: {}, sort: DEFAULT_SORT });
  }, [writeParams]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    for (const group of MULTI_GROUPS) {
      const g = state.filters?.[group];
      if (!g) continue;
      for (const key of Object.keys(g)) {
        if (g[key]) {
          const label = CHIP_LABEL_OVERRIDES[group]?.[key] ?? key;
          chips.push({ group, key, label });
        }
      }
    }
    if (state.filters?.price) {
      const { min, max } = state.filters.price;
      chips.push({
        group: 'price',
        key: 'range',
        label:
          min != null && max != null
            ? `$${min} – $${max}`
            : min != null
            ? `≥ $${min}`
            : `≤ $${max}`,
      });
    }
    return chips;
  }, [state.filters]);

  const inResultsMode = useMemo(
    () => Boolean(state.query && state.query.trim()) || activeFilterChips.length > 0,
    [state.query, activeFilterChips]
  );

  return {
    ...state,
    inResultsMode,
    activeFilterChips,
    setQuery,
    setSort,
    toggleFilter,
    setPriceRange,
    clearAllFilters,
    clearAll,
  };
}
