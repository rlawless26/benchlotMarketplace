/**
 * Bridge from ToolScan's free-text taxonomy to the normalizer's closed
 * canonical_type vocabulary.
 *
 * ToolScan's prompt (functions/toolscan-prompt.js §TOOL TAXONOMY) emits
 * `suggested_category` (e.g. "Hand Planes") and `suggested_subcategory`
 * (e.g. "Bench Planes (smoothing #1–#4½, jack #5–#5½)"), with the LLM
 * occasionally paraphrasing. The aggregator's normalized listings use
 * functions/normalize/vocabulary.js#CANONICAL_TYPES (closed list — e.g.
 * "Bench Plane"). To find matching listings for a scanned tool, we
 * translate ToolScan's free text → canonical_type.
 *
 * Approach: keyword matching. We tolerate paraphrase by looking for
 * substrings against a priority-ordered list of (pattern, canonical_type)
 * pairs. First match wins — order matters.
 */

// Order matters: more specific patterns first. e.g. "router plane" must be
// checked before "router" (the power tool), "shoulder plane" before plain
// "plane", "block plane" before "plane". Each entry is matched against the
// full lowercased subcategory string.
const PATTERNS = [
  // Hand planes — closed-list canonical_types
  { re: /shoulder plane/i, type: 'Shoulder Plane' },
  { re: /router plane/i, type: 'Router Plane' },
  { re: /plow|combination plane/i, type: 'Plow Plane' },
  { re: /scrub plane/i, type: 'Scrub Plane' },
  { re: /chisel plane/i, type: 'Chisel Plane' },
  { re: /infill plane/i, type: 'Infill Plane' },
  { re: /rabbet|dado|tongue.*groove|joinery plane/i, type: 'Rabbet Plane' },
  { re: /moulding|molding plane/i, type: 'Moulding Plane' },
  { re: /block plane/i, type: 'Block Plane' },
  { re: /spokeshave/i, type: 'Spokeshave' },
  { re: /bench plane|smoothing|jack plane|jointer plane|fore plane/i, type: 'Bench Plane' },

  // Cutting / shaping
  { re: /draw[- ]?knife/i, type: 'Drawknife' },
  { re: /carving gouge|gouge/i, type: 'Gouge' },
  { re: /cabinet scraper/i, type: 'Cabinet Scraper' },
  { re: /card scraper/i, type: 'Card Scraper' },
  { re: /chisel/i, type: 'Chisel' },

  // Saws
  { re: /japanese saw|ryoba|dozuki|kataba/i, type: 'Japanese Saw' },
  { re: /coping|fret saw/i, type: 'Coping Saw' },
  { re: /frame|bow saw/i, type: 'Frame Saw' },
  { re: /dovetail saw|tenon saw|carcass|back saw/i, type: 'Back Saw' },
  { re: /panel saw|hand saw|crosscut saw|rip saw/i, type: 'Hand Saw' },

  // Boring / drilling
  { re: /\bbrace\b/i, type: 'Brace' },
  { re: /eggbeater/i, type: 'Eggbeater Drill' },
  { re: /auger bit/i, type: 'Auger Bit' },
  { re: /drill bit/i, type: 'Drill Bit' },
  { re: /boring machine/i, type: 'Boring Machine' },

  // Striking
  { re: /\bhammer/i, type: 'Hammer' },
  { re: /\bmallet/i, type: 'Mallet' },
  { re: /hatchet/i, type: 'Hatchet' },
  { re: /\badze\b/i, type: 'Adze' },
  { re: /\baxe\b/i, type: 'Axe' },

  // Marking & measuring
  { re: /mortise gauge/i, type: 'Mortise Gauge' },
  { re: /marking gauge/i, type: 'Marking Gauge' },
  { re: /sliding t-bevel|bevel gauge/i, type: 'Bevel Gauge' },
  { re: /(combination|try) square|^square|squares/i, type: 'Square' },
  { re: /caliper|dividers/i, type: 'Caliper' },
  { re: /ruler|rule/i, type: 'Rule' },
  { re: /level/i, type: 'Level' },

  // Workholding
  { re: /\bvise\b/i, type: 'Vise' },
  { re: /holdfast/i, type: 'Holdfast' },
  { re: /\bclamp/i, type: 'Clamp' },
  { re: /pliers/i, type: 'Pliers' },

  // Sharpening — no canonical_type for these in the normalizer, so they
  // fall through to no match (correct: aggregator search shouldn't pretend
  // it has Stanley sharpening stones to recommend).

  // Power / stationary
  { re: /track saw/i, type: 'Track Saw' },
  { re: /miter saw/i, type: 'Miter Saw' },
  { re: /table saw/i, type: 'Table Saw' },
  { re: /band[- ]?saw/i, type: 'Band Saw' },
  { re: /scroll saw/i, type: 'Scroll Saw' },
  { re: /circular saw/i, type: 'Circular Saw' },
  { re: /reciprocating saw/i, type: 'Reciprocating Saw' },
  { re: /jigsaw/i, type: 'Jigsaw' },
  { re: /jointer/i, type: 'Jointer' },
  { re: /thickness planer|planer|thicknesser/i, type: 'Thickness Planer' },
  { re: /\blathe/i, type: 'Lathe' },
  { re: /drill press/i, type: 'Drill Press' },
  { re: /mortiser/i, type: 'Mortiser' },
  { re: /drum sander/i, type: 'Drum Sander' },
  { re: /sander/i, type: 'Sander' },
  { re: /shaper/i, type: 'Shaper' },
  { re: /domino/i, type: 'Domino' },
  { re: /biscuit joiner/i, type: 'Biscuit Joiner' },
  { re: /multi[- ]?tool/i, type: 'Multi-Tool' },
  { re: /angle grinder/i, type: 'Angle Grinder' },
  { re: /impact driver/i, type: 'Impact Driver' },
  { re: /\bdrill\b/i, type: 'Drill' },
  { re: /router(?! plane)/i, type: 'Router' }, // power router (not Router Plane)

  // Workshop / fixtures
  { re: /workbench/i, type: 'Workbench' },
  { re: /router table/i, type: 'Router Table' },
  { re: /dust collect/i, type: 'Dust Collector' },
  { re: /air compressor/i, type: 'Air Compressor' },
  { re: /cnc/i, type: 'CNC' },
];

/**
 * Translate ToolScan's category/subcategory free text to a canonical_type
 * usable by the aggregator's getAggregatedListings query and priceStats
 * cluster lookup.
 *
 * Returns null when no pattern matches — caller should fall back to
 * brand-only or skip the active-listings panel.
 */
export function bridgeToCanonicalType({ suggested_category, suggested_subcategory, tool_name } = {}) {
  // Try most-specific text first (subcategory) → less specific (category)
  // → tool_name as last resort.
  const candidates = [suggested_subcategory, suggested_category, tool_name].filter(Boolean);
  for (const text of candidates) {
    for (const { re, type } of PATTERNS) {
      if (re.test(text)) return type;
    }
  }
  return null;
}

export const TOOLSCAN_BRIDGE_PATTERNS = PATTERNS;
