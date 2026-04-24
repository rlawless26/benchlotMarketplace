/**
 * Source registry for the aggregator.
 *
 * Each entry describes one external source we intend to index. Entries are
 * rendered across the sources strip (empty state), the source filter group
 * (results state), the source-distribution strip (results state), and every
 * ResultCard's source badge + footer.
 *
 * - `kind` drives visual categorization (color dot + badge icon)
 * - `shortName` is the compact label used inside cards
 * - `descriptor` is the second-line eyebrow shown in the sources strip
 * - `indexed` gates normal vs "coming soon" visual treatment
 *
 * When a new source comes online, flip `indexed: true` here — no other UI
 * code changes.
 */

const SOURCES = [
  {
    id: 'jimbode',
    name: 'Jim Bode Tools',
    shortName: 'Jim Bode',
    kind: 'Dealer',
    descriptor: 'Dealer · Katonah NY',
    indexed: true,
  },
  {
    id: 'leach',
    name: 'Patrick Leach',
    shortName: 'P. Leach',
    kind: 'Dealer',
    descriptor: 'Monthly list · Since 1998',
    indexed: false,
  },
  {
    id: 'hyperkitten',
    name: 'Hyperkitten',
    shortName: 'Hyperkitten',
    kind: 'Dealer',
    descriptor: 'Josh Clark · Dealer',
    indexed: true,
  },
  {
    id: 'sawmillcreek',
    name: 'Sawmill Creek',
    shortName: 'Sawmill Creek',
    kind: 'Forum',
    descriptor: 'Forum classifieds',
    indexed: true,
  },
  {
    id: 'woodnet',
    name: 'Woodnet',
    shortName: 'Woodnet',
    kind: 'Forum',
    descriptor: 'Forum classifieds',
    indexed: false,
  },
  {
    id: 'lumberjocks',
    name: 'LumberJocks',
    shortName: 'LumberJocks',
    kind: 'Forum',
    descriptor: 'Community listings',
    indexed: false,
  },
  {
    id: 'reddit',
    name: 'r/handtools',
    shortName: 'r/handtools',
    kind: 'Reddit',
    descriptor: 'Reddit · 148k members',
    indexed: false,
  },
  {
    id: 'ebay',
    name: 'eBay',
    shortName: 'eBay',
    kind: 'Marketplace',
    descriptor: 'Curated searches',
    indexed: false,
  },
];

/** Keyed lookup by source id, for O(1) access in cards/adapters. */
const SOURCES_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

/** Display-order list used by the sources strip. */
const SOURCES_STRIP_ORDER = SOURCES.map((s) => s.id);

/**
 * Color palette for source kinds — used for the kind dot on cards, the
 * segmented bar in the source-distribution strip, and the kind legend.
 * Matches `design_handoff_benchlot_homepage/ResultCard.jsx` KindDot.
 */
const KIND_COLORS = {
  Dealer: '#d4aa60',       // Honey
  Forum: '#2a6a4a',        // Success green
  Reddit: '#a83a2a',       // Error red
  Marketplace: '#2a5a6a',  // Info teal
  Auction: '#6a4a2a',      // Warm brown
};

/**
 * Look up a source by id. Returns a fallback with sane defaults if the
 * source isn't registered (so a new scraper source doesn't crash the UI
 * before the registry is updated).
 */
function getSource(id) {
  if (!id) return null;
  if (SOURCES_BY_ID[id]) return SOURCES_BY_ID[id];
  const titled = id
    .split(/[-_ ]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return {
    id,
    name: titled,
    shortName: titled,
    kind: 'Marketplace',
    descriptor: '',
    indexed: true,
  };
}

/** Pre-existing API used by the current adapter — keep stable. */
function sourceDisplayName(id) {
  const src = getSource(id);
  return src ? src.name : 'External source';
}

export { SOURCES, SOURCES_BY_ID, SOURCES_STRIP_ORDER, KIND_COLORS, getSource, sourceDisplayName };
export default SOURCES_BY_ID;
