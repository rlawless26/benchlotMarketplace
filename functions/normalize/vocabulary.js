/**
 * Canonical vocabulary for the normalizer.
 *
 * These are closed lists. The LLM must pick from them exactly (the tool-use
 * schema enforces this via `enum`). M2 shipped with hand-tool-focused
 * coverage; M5 expanded to include stationary power tools, modern precision
 * tools, and the Festool/SawStop/Laguna/Woodpeckers ecosystems surfaced by
 * forum-classifieds sources (Woodnet especially).
 *
 * canonical_model is free-form (e.g. "No. 5", "LAJ", "D-8") — we don't
 * constrain it. canonical_size is free-form too ("2 inch", "14 inch sole").
 * era_estimate is free-form but should follow "c. 1900-1915" or "1920s" shapes.
 */

/**
 * Preferred canonical forms for well-known brands. The LLM emits brand as
 * free-form (so long-tail makers aren't lost) but matches these exact strings
 * when one of the below is identified — prevents "Stanley"/"stanley"/
 * "STANLEY" drift across rows. See prompt.js for the guidance the LLM reads.
 */
const CANONICAL_BRANDS = [
  // Hand-tool vintage / antique
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

  // Modern precision / woodworking (M5)
  'Festool',
  'Woodpeckers',
  'SawStop',
  'Laguna',
  'Powermatic',
  'Delta',
  'Jet',
  'Rikon',
  'Grizzly',
  'Shop Fox',
  'Oneida',
  'Mafell',
  'Felder',
  'Martin',
  'Minimax',
  'SCM',
  'Hammer',
  'Oneway',
  'Robust',
  'Nova',
  'Jointech',
  'Incra',
  'JessEm',
  'Kreg',
  'Rockler',
  'Bench Dog',
  'Shaper',                // Shaper Origin (CNC); distinct from the CANONICAL_TYPE "Shaper"
  'Axiom',
  'Shapeoko',
  'Inventables',
  'Wood-Mizer',

  // Power-tool pro / prosumer (M5)
  'DeWalt',
  'Milwaukee',
  'Makita',
  'Bosch',
  'Metabo',
  'Metabo HPT',
  'Ridgid',
  'Porter-Cable',
  'Hitachi',
  'Skil',
  'Skilsaw',
  'Craftsman',
  'Ryobi',
  'Kobalt',
  'Hart',
  'Wen',

  // Vintage stationary (M5)
  'Rockwell',
  'Walker-Turner',
  'Yates-American',
  'Oliver',
  'Tannewitz',
  'Crescent',
  'American Woodworking',
  'Parks',                 // Parks planers (vintage American)
  'Northfield',            // industrial stationary
  'Atlas',                 // Atlas lathes / drill presses
  'General',               // General Mfg Co (Canadian stationary)
  'General International', // modern General (Canadian)

  // Specialty / accessories (M5)
  'SuperMax',              // drum sanders
  'Eclipse',               // Eclipse vises (UK)
  'Fein',                  // high-end multi-tools + vacs
  'Triton',                // Australian routers + track saws
  'Baileigh',              // industrial woodworking/metalworking
  'Steel City',            // modern stationary
  'Wilton',                // vises
  'Whitney',               // mortisers + heavy machinery
  'Record Power',          // modern Record (distinct from vintage Record)
  'King Canada',           // Canadian home-center stationary
  'Pegas',                 // scroll saw blades / saws
  'Excalibur',             // scroll saws + fence systems
  'Woodcraft',             // Woodcraft retail store's own Woodcraft-branded items (distinct from WoodRiver house brand — see below)
  'WoodRiver',             // Woodcraft's house brand of hand planes and chisels (one word, camelCase — NOT "Wood River" / "Woodriver" / "Woodcraft")
  'Shopsmith',             // multi-purpose combination machines (Mark V, etc.); canonical capitalization is "Shopsmith" (NOT "ShopSmith")
  'Highland',              // retail-brand / specialty

  'Unknown',
];

/**
 * Closed list of tool types. Flat, covers both vintage hand tools and modern
 * stationary/portable power tools. Sub-types that matter for pricing (e.g.
 * bench vs block plane, table saw vs miter saw) are separated; sub-types that
 * rarely matter are collapsed — users filter further by title text.
 *
 * When adding a type, prefer the term users actually type into search.
 */
const CANONICAL_TYPES = [
  // Planes (hand)
  'Bench Plane',
  'Block Plane',
  'Shoulder Plane',
  'Router Plane',           // Stanley No. 71 / LN No. 71 — hand tool, NOT a power router
  'Plow Plane',
  'Rabbet Plane',
  'Moulding Plane',
  'Infill Plane',
  'Scrub Plane',
  'Combination Plane',
  'Chisel Plane',
  'Hawk Plane',
  'Spokeshave',

  // Cutting / shaping (hand)
  'Chisel',
  'Gouge',
  'Drawknife',
  'Cabinet Scraper',
  'Card Scraper',
  'Knife',

  // Saws (hand)
  'Hand Saw',
  'Back Saw',
  'Japanese Saw',
  'Coping Saw',
  'Frame Saw',

  // Boring / drilling (hand)
  'Brace',
  'Eggbeater Drill',
  'Drill Bit',
  'Auger Bit',

  // Hammering / striking (hand)
  'Hammer',
  'Mallet',
  'Axe',
  'Adze',
  'Hatchet',

  // Measuring / marking (hand/precision)
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

  // Stationary woodworking machines (M5)
  'Table Saw',              // contractor/cabinet/hybrid/jobsite — SawStop PCS, Delta Unisaw, etc.
  'Band Saw',               // Laguna, Rikon, Grizzly, Powermatic
  'Miter Saw',              // chop saw, sliding compound miter saw
  'Jointer',                // power jointer — NOT the hand-plane "jointer" (that's a Bench Plane)
  'Thickness Planer',       // DeWalt 735, Powermatic 15HH, etc. — NOT a hand plane
  'Lathe',                  // wood lathes; metal lathes rare in our scope but accepted
  'Drill Press',
  'Router',                 // handheld + router tables — context-dependent vs Router Plane
  'Shaper',                 // heavy cabinetmaker's shaper (stationary) — also legacy hand-tool use
  'Mortiser',               // hollow-chisel mortising machine
  'Drum Sander',            // SuperMax, Powermatic, Jet drum sanders
  'Scroll Saw',
  'Dust Collector',         // Oneida, Laguna, Jet, Powermatic dust collection
  'Air Compressor',

  // Portable power tools (M5)
  'Circular Saw',
  'Track Saw',              // Festool TS, Makita SP6000
  'Jigsaw',
  'Reciprocating Saw',
  'Sander',                 // random orbit / belt / disc / detail — catch-all for portable sanders
  'Impact Driver',
  'Drill',                  // cordless drill / drill driver (NOT Drill Press, NOT Brace)
  'Angle Grinder',
  'Biscuit Joiner',
  'Domino',                 // Festool DF500 / DF700 — distinct enough to warrant own type
  'Multi-Tool',             // oscillating multi-tools

  // CNC / digital (M5)
  'CNC',                    // Shaper Origin, Shapeoko, Axiom, Inventables, etc.

  // Heavy / legacy (pre-existing — kept)
  'Boring Machine',

  // Shop fixtures (M5)
  'Workbench',
  'Router Table',           // accessory-first tables (Incra, Kreg, Woodpeckers)

  // Catch-all
  'Other',
];

/**
 * Post-LLM brand alias map. The normalizer is intentionally permissive on
 * canonical_brand (free-form so antique long-tail makers don't get
 * "Unknown"-bucketed), but that permissiveness leaks near-duplicates into
 * the brand facet — case-only typos, "& Co." suffix variants, and
 * sub-brands the LLM occasionally prefixes with the parent retailer.
 *
 * Each alias key is lowercased and trimmed before lookup; values are the
 * canonical form to write back. Keep this list small and high-confidence —
 * the cost of a wrong merge is a real maker getting hidden from search.
 *
 * Add an entry here when:
 *   1. Two strings clearly refer to the same maker, AND
 *   2. The canonical form is unambiguous (matches CANONICAL_BRANDS, or is
 *      the form the antique-tool community searches by).
 *
 * Skip cases where short form is ambiguous (e.g. "Buck" alone could mean
 * Buck Brothers or Buck Knives) — leave those for vocabulary expansion.
 */
const BRAND_ALIASES = Object.freeze({
  // Case / typo
  'dewalt': 'DeWalt',
  'woodpecker': 'Woodpeckers',
  'snap-on': 'Snap-On',

  // Punctuation / suffix variants
  'snow and nealley': 'Snow & Nealley',
  'ec atkins': 'E.C. Atkins',
  'e.c. atkins & co.': 'E.C. Atkins',
  'auburn tool co.': 'Auburn',
  'auburn tool co': 'Auburn',
  'sandusky tool co.': 'Sandusky',

  // Sears sub-brand collapses — Craftsman and Dunlap are independently
  // searchable brands that the LLM occasionally prefixes with "Sears".
  // Roebuck is the retailer suffix; it collapses back to Sears.
  'sears craftsman': 'Craftsman',
  'sears dunlap': 'Dunlap',
  'sears roebuck': 'Sears',
});

/**
 * Apply the brand alias map to a normalized brand string. Safe to call with
 * non-string values (returns input unchanged). Trim + lowercase the lookup
 * key but preserve the canonical-form casing in the output.
 */
function canonicalizeBrand(raw) {
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  const aliased = BRAND_ALIASES[trimmed.toLowerCase()];
  return aliased || trimmed;
}

module.exports = {
  CANONICAL_BRANDS,
  CANONICAL_TYPES,
  BRAND_ALIASES,
  canonicalizeBrand,
};
