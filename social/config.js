/**
 * Everything a person might reasonably want to tune without reading the code.
 * Secrets never live here; they come from the environment (see lib/env.js).
 */
module.exports = {
  siteUrl: 'https://benchlot.com',
  timezone: 'America/New_York',

  /**
   * Posting slots. Three fixed days a week plus every other Sunday gives
   * 14–16 posts a month (~3.5 a week). Times rotate through the list so the
   * same type does not always land in the same hour. All times are local to
   * `timezone` (ET).
   */
  schedule: {
    weekdays: [2, 4, 6],            // Tue, Thu, Sat (0 = Sunday)
    alternateWeekday: 0,            // Sunday, every other week
    times: ['07:30', '12:15', '18:45'],
    defaultDays: 30,
  },

  /**
   * Post types in rotation order. The generator walks this list slot by slot,
   * so two entries of one type give it twice the share. A type that cannot
   * fill its slot (no fresh listing, say) is replaced by the next one that can.
   */
  rotation: ['price-guide', 'just-listed', 'price-guide', 'just-listed'],

  /** Do not feature the same (tool type, maker) within this many days. */
  repeatGuardDays: 60,

  priceGuide: {
    minSold: 20,          // all-time recorded sales in the cluster
    historyQuarters: 12,  // sparkline window
    minPerQuarter: 3,     // a quarter needs this many sales to plot
    minQuarters: 5,       // and at least this many plottable quarters
    staleQuarters: 2,     // last plottable quarter must be this recent
  },

  justListed: {
    // Dealers only. Marketplace photos (eBay) are not used; dealer photos are
    // credited on the card and in the caption.
    sources: ['hyperkitten', 'jimbode', 'rouillard', 'teddawson', 'vintagevials', 'oldtools', 'thebestthings'],
    maxListingAgeDays: 10,     // first seen within this window
    scheduleWithinDays: 10,    // only slots this soon after generation (dealer stock turns in ~1 week)
    minPriceCents: 2500,
    minGuideSales: 8,          // caption compares to the guide only above this
  },

  /**
   * Hashtags go in the first comment, never the caption. Base set plus a few
   * per tool family plus the maker. Keep the whole thing under ~15.
   */
  hashtags: {
    base: ['#handtools', '#woodworking', '#vintagetools', '#oldtools', '#handtoolwoodworking', '#toolcollector', '#usedtools', '#benchlot'],
    byTypeKeyword: {
      plane: ['#handplane', '#handplanes'],
      saw: ['#handsaw', '#vintagesaws'],
      chisel: ['#chisels', '#woodworkingchisels'],
      gouge: ['#woodcarving', '#carvingtools'],
      brace: ['#bracebit'],
      square: ['#layouttools'],
      rule: ['#layouttools'],
      gauge: ['#layouttools'],
      spokeshave: ['#spokeshave'],
      scraper: ['#cabinetscraper'],
      vise: ['#workholding'],
      clamp: ['#workholding'],
      lathe: ['#woodturning'],
      'table saw': ['#tablesaw', '#woodshop'],
      'band saw': ['#bandsaw', '#woodshop'],
      jointer: ['#woodshop'],
      planer: ['#woodshop'],
    },
    max: 15,
  },

  /** Where publish failures go. The address the alert emails already reply to. */
  alertEmail: process.env.SOCIAL_ALERT_EMAIL || 'rob@benchlot.com',

  /**
   * Publisher. `csv` writes a bulk-upload file; `instagram` talks to the
   * Graph API directly. Both are built; the flag picks what `publish` does.
   * (The Instagram publisher and CSV export land in the next iteration.)
   */
  publisher: {
    mode: process.env.SOCIAL_PUBLISHER || 'csv',
    autoApprove: false,
  },

  render: {
    width: 1080,
    height: 1350,
  },
};
