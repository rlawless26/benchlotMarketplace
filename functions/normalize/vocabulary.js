/**
 * Canonical vocabulary for the normalizer.
 *
 * These are closed lists. The LLM must pick from them exactly (the tool-use
 * schema enforces this via `enum`). M2 ships with conservative coverage —
 * better a small right list than a sprawling one. Add entries as ingestion
 * surfaces tools we can't classify.
 *
 * canonical_model is free-form (e.g. "No. 5", "LAJ", "D-8") — we don't
 * constrain it. canonical_size is free-form too ("2 inch", "14 inch sole").
 * era_estimate is free-form but should follow "c. 1900-1915" or "1920s" shapes.
 */

/** Closed list of brands. "Unknown" is a valid value for no-brand items. */
const CANONICAL_BRANDS = [
  'Stanley',
  'Stanley-Bailey',
  'Stanley Bedrock',
  'Lie-Nielsen',
  'Veritas',
  'Record',
  'Norris',
  'Spiers',
  'Preston',
  'Disston',
  'Sargent',
  'Millers Falls',
  'Keen Kutter',
  'Winchester',
  'Chaplin',
  'Union',
  'Ohio Tool',
  'Greenfield',
  'Buck Brothers',
  'Marples',
  'Ward',
  'Mathieson',
  'Sorby',
  'Gramercy',
  'Clifton',
  'Hock',
  'Blue Spruce',
  'Barton',
  'Moulson',
  'Rabone',
  'Starrett',
  'Brown & Sharpe',
  'Lufkin',
  'Irwin',
  'Goodell-Pratt',
  'North Brothers',
  'Yankee',
  'Pexto',
  'Bridge City',
  'L.S. Starrett',
  'Henry Taylor',
  'Ashley Iles',
  'Narex',
  'Unknown',
];

/**
 * Closed list of tool types. Flat, ~30 entries, chosen to match common
 * search intents. Sub-types that matter for pricing (e.g. bench vs block
 * plane) are separated; sub-types that rarely matter (mortise vs paring
 * chisel) are collapsed to "Chisel" — users will filter further by title.
 */
const CANONICAL_TYPES = [
  // Planes
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
  'Chisel Plane',
  'Hawk Plane',
  'Spokeshave',

  // Cutting tools
  'Chisel',
  'Gouge',
  'Drawknife',
  'Cabinet Scraper',
  'Card Scraper',
  'Knife',

  // Saws
  'Hand Saw',
  'Back Saw',
  'Japanese Saw',
  'Coping Saw',
  'Frame Saw',

  // Boring / drilling
  'Brace',
  'Eggbeater Drill',
  'Drill Bit',
  'Auger Bit',

  // Hammering / striking
  'Hammer',
  'Mallet',
  'Axe',
  'Adze',
  'Hatchet',

  // Measuring / marking
  'Square',
  'Bevel Gauge',
  'Marking Gauge',
  'Mortise Gauge',
  'Rule',
  'Caliper',
  'Level',

  // Workholding
  'Vise',
  'Clamp',
  'Holdfast',
  'Pliers',

  // Machines / heavier
  'Boring Machine',
  'Shaper',

  // Catch-all
  'Other',
];

module.exports = {
  CANONICAL_BRANDS,
  CANONICAL_TYPES,
};
