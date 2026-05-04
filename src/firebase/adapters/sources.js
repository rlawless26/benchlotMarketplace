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
    homeUrl: 'https://www.jimbodetools.com',
    indexed: true,
  },
  {
    // Jim Bode's published "Value Guide" — a curated archive of his sold
    // inventory with historical sold prices. Powers the sold-comp block of
    // the priceStats aggregator (see functions/pricestats/build.js). Not a
    // live-for-sale source; intentionally `indexed: false` so it never
    // appears in aggregator search. The price-guide build reads it by
    // `status: 'sold'` regardless of this flag.
    id: 'jimbode_valueguide',
    name: 'Jim Bode Value Guide',
    shortName: 'JB Value Guide',
    kind: 'Dealer',
    descriptor: 'Sold archive · Katonah NY',
    homeUrl: 'https://www.jimbodetools.com/collections/jim-bodes-value-guide-to-antique-tools',
    indexed: false,
  },
  {
    id: 'leach',
    name: 'Patrick Leach',
    shortName: 'P. Leach',
    kind: 'Dealer',
    descriptor: 'Monthly list · Since 1998',
    homeUrl: 'https://supertool.com',
    indexed: false,
  },
  {
    id: 'hyperkitten',
    name: 'Hyperkitten',
    shortName: 'Hyperkitten',
    kind: 'Dealer',
    descriptor: 'Josh Clark · Dealer',
    homeUrl: 'https://www.hyperkitten.com',
    indexed: true,
  },
  {
    id: 'sawmillcreek',
    name: 'Sawmill Creek',
    shortName: 'Sawmill Creek',
    kind: 'Forum',
    descriptor: 'Forum classifieds',
    homeUrl: 'https://sawmillcreek.org/forums/sawmill-creek-classifieds.10/',
    indexed: true,
  },
  {
    id: 'woodnet',
    name: 'Woodnet',
    shortName: 'Woodnet',
    kind: 'Forum',
    descriptor: 'Forum classifieds',
    homeUrl: 'https://forums.woodnet.net/forumdisplay.php?fid=4',
    indexed: true,
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
    name: 'Reddit',
    shortName: 'Reddit',
    kind: 'Reddit',
    descriptor: 'r/handtools · r/AntiqueToolBroker',
    homeUrl: 'https://www.reddit.com/r/handtools/new/',
    indexed: true,
  },
  {
    id: 'ebay',
    name: 'eBay',
    shortName: 'eBay',
    kind: 'Marketplace',
    descriptor: 'Marketplace · Curated woodworking',
    homeUrl: 'https://www.ebay.com/b/Carpentry-Woodworking/13870',
    indexed: true,
  },
  {
    id: 'thebestthings',
    name: 'The Best Things',
    shortName: 'Best Things',
    kind: 'Dealer',
    descriptor: 'Dealer · Premium vintage',
    homeUrl: 'https://www.thebestthings.com/vintools.htm',
    indexed: true,
  },
  {
    id: 'rouillard',
    name: 'Michael Rouillard Antique Tools',
    shortName: 'Rouillard',
    kind: 'Dealer',
    descriptor: 'Dealer · Antique · Since 1994',
    homeUrl: 'https://michaelrouillardtools.com',
    indexed: true,
  },
  {
    id: 'vintagevials',
    name: 'Vintage Vials',
    shortName: 'Vintage Vials',
    kind: 'Dealer',
    descriptor: 'Dealer · Antique · Rules & planes',
    homeUrl: 'https://shop.vintagevials.com',
    indexed: true,
  },
  {
    id: 'oldtools',
    name: 'OldTools.com',
    shortName: 'OldTools',
    kind: 'Dealer',
    descriptor: 'Dealer · Antique woodworking',
    homeUrl: 'https://www.oldtools.com/shop',
    indexed: true,
  },
  {
    id: 'fbmarketplace',
    name: 'Facebook Marketplace',
    shortName: 'FB Marketplace',
    kind: 'Marketplace',
    descriptor: 'Marketplace · Local listings',
    homeUrl: 'https://www.facebook.com/marketplace',
    indexed: true,
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
