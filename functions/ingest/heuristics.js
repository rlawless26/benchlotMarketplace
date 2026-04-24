/**
 * Baseline brand + tool-type heuristics.
 *
 * Simple keyword matchers — good enough to seed `heuristic_brand` /
 * `heuristic_type` during ingestion. The LLM normalizer reads them as hints
 * and overwrites with canonical fields. When heuristics and LLM agree, the
 * normalizer's token usage drops (cache hit); when they disagree, the LLM
 * wins.
 *
 * M5: added power-tool / modern-precision brand + type coverage so the
 * heuristic stops bucketing "jointer" (power) into "Bench Planes" and so on.
 */

const BRANDS = [
  // Hand-tool vintage / antique
  'Stanley', 'Lie-Nielsen', 'Veritas', 'Record', 'Norris', 'Spiers',
  'Preston', 'Disston', 'Sargent', 'Millers Falls', 'Keen Kutter',
  'Winchester', 'Chaplin', 'Bailey', 'Bedrock', 'Union', 'Ohio Tool',
  'Greenfield', 'Buck Brothers', 'Marples', 'Ward', 'Mathieson',
  'Sorby', 'Gramercy', 'Clifton', 'Hock', 'Blue Spruce', 'Barton',
  'Moulson', 'Rabone', 'Starrett', 'Brown & Sharpe', 'Lufkin',
  'Yankee', 'Bridge City', 'Irwin', 'North Brothers', 'Goodell-Pratt',
  'Pexto', 'Henry Taylor', 'Ashley Iles', 'Narex',
  // Modern precision / woodworking (M5)
  'Festool', 'Woodpeckers', 'SawStop', 'Laguna', 'Powermatic', 'Delta',
  'Jet', 'Rikon', 'Grizzly', 'Shop Fox', 'Oneida', 'Mafell', 'Felder',
  'Martin', 'Minimax', 'SCM', 'Hammer', 'Oneway', 'Robust', 'Nova',
  'Jointech', 'Incra', 'Kreg', 'Rockler', 'Bench Dog', 'Shaper',
  'Axiom', 'Shapeoko', 'Inventables', 'Wood-Mizer',
  // Power-tool pro / prosumer (M5)
  'DeWalt', 'Milwaukee', 'Makita', 'Bosch', 'Metabo', 'Ridgid',
  'Porter-Cable', 'Hitachi', 'Skil', 'Skilsaw', 'Craftsman', 'Ryobi',
  'Kobalt', 'Hart', 'Wen',
  // Vintage stationary (M5)
  'Rockwell', 'Walker-Turner', 'Yates-American', 'Oliver', 'Tannewitz',
  'Crescent',
];

function extractBrand(title) {
  if (!title) return 'Unknown';
  const lower = title.toLowerCase();
  for (const brand of BRANDS) {
    if (lower.includes(brand.toLowerCase())) return brand;
  }
  // Stanley's catalog numbers often appear without the word "Stanley"
  if (/stanley\s*#?\s*\d/i.test(title)) return 'Stanley';
  return 'Unknown';
}

function containsAny(haystack, needles) {
  return needles.some((n) => haystack.includes(n));
}

/**
 * Power-tool brand names that disambiguate "jointer" / "planer" / "router"
 * from their hand-tool namesakes. When any of these appears in the title,
 * the listing is almost certainly a power tool.
 */
const POWER_TOOL_BRANDS = [
  'festool', 'sawstop', 'laguna', 'powermatic', 'grizzly', 'jet',
  'rikon', 'shop fox', 'dewalt', 'makita', 'milwaukee', 'bosch',
  'metabo', 'ridgid', 'porter-cable', 'hitachi', 'skil', 'skilsaw',
  'ryobi', 'craftsman', 'kobalt', 'hart', 'wen', 'rockwell',
  'walker-turner', 'yates-american', 'oliver', 'tannewitz', 'mafell',
  'felder', 'minimax', 'hammer', 'oneway', 'nova', 'woodpeckers',
  'incra', 'kreg', 'rockler', 'shaper', 'shapeoko', 'axiom',
  'inventables', 'wood-mizer', 'oneida',
];

function looksPowerBranded(lower) {
  return POWER_TOOL_BRANDS.some((b) => lower.includes(b));
}

function extractType(title) {
  if (!title) return 'Other';
  const lower = title.toLowerCase();
  const powerBranded = looksPowerBranded(lower);

  // Power/stationary-first (M5) — check these BEFORE hand-plane keywords so
  // "jointer" and "planer" don't mis-bucket as planes.
  if (containsAny(lower, ['table saw', 'tablesaw', 'cabinet saw', 'contractor saw', 'hybrid saw', 'jobsite saw'])) return 'Table Saw';
  if (containsAny(lower, ['band saw', 'bandsaw'])) return 'Band Saw';
  if (containsAny(lower, ['miter saw', 'mitre saw', 'chop saw', 'sliding compound'])) return 'Miter Saw';
  if (containsAny(lower, ['track saw', 'tracksaw'])) return 'Track Saw';
  if (containsAny(lower, ['circular saw', 'skilsaw', 'worm drive'])) return 'Circular Saw';
  if (containsAny(lower, ['scroll saw'])) return 'Scroll Saw';
  if (containsAny(lower, ['reciprocating saw', 'sawzall'])) return 'Reciprocating Saw';
  if (containsAny(lower, ['jigsaw', 'jig saw'])) return 'Jigsaw';

  if (containsAny(lower, ['drill press'])) return 'Drill Press';
  if (containsAny(lower, ['dust collector', 'dust collection', 'cyclone', 'dust extractor'])) return 'Dust Collector';
  if (containsAny(lower, ['drum sander'])) return 'Drum Sander';
  if (containsAny(lower, ['air compressor'])) return 'Air Compressor';
  if (containsAny(lower, ['mortiser', 'mortising machine'])) return 'Mortiser';
  if (lower.includes('lathe')) return 'Lathe';
  if (lower.includes('cnc') || lower.includes('shaper origin') || lower.includes('shapeoko')) return 'CNC';

  // Festool Domino is distinct enough to warrant its own type.
  if (lower.includes('domino')) return 'Domino';
  if (containsAny(lower, ['biscuit joiner', 'plate joiner'])) return 'Biscuit Joiner';

  // "Jointer" / "planer" / "router" require context — power-branded or
  // explicit power phrasing goes to the stationary types; otherwise fall
  // through to the hand-plane logic below.
  if (lower.includes('jointer') && powerBranded) return 'Jointer';
  if (lower.includes('jointer-planer') || lower.includes('jointer planer')) return 'Jointer';
  if (containsAny(lower, ['thickness planer', 'surface planer'])) return 'Thickness Planer';
  if (lower.includes('planer') && powerBranded && !lower.includes('hand planer')) return 'Thickness Planer';
  if (lower.includes('router table')) return 'Router Table';
  if (lower.includes('router') && powerBranded && !lower.includes('router plane')) return 'Router';

  if (containsAny(lower, ['workbench', 'mft', 'roubo', 'moravian bench'])) return 'Workbench';

  if (containsAny(lower, ['impact driver'])) return 'Impact Driver';
  if (containsAny(lower, ['angle grinder'])) return 'Angle Grinder';
  if (containsAny(lower, ['multi-tool', 'multitool', 'oscillating tool'])) return 'Multi-Tool';

  // Portable drills / cordless drills — "drill" alone is too broad to use
  // here (catches "Drill Bit", "Drill Press" — those matched above). Require
  // an explicit driver/cordless/18V/20V signal.
  if (containsAny(lower, ['cordless drill', 'drill driver', 'hammer drill', '18v drill', '20v drill'])) return 'Drill';

  // Sander — catch power sanders. Hand card scrapers / cabinet scrapers
  // matched earlier by their own names, not "sander".
  if (containsAny(lower, ['orbital sander', 'random orbit sander', 'belt sander', 'disc sander', 'detail sander', 'palm sander', 'sheet sander'])) return 'Sander';

  // Hand-tool keyword matching (preserved from pre-M5 — hand-plane rules
  // still win when neither a power brand nor a stationary keyword matched).
  // Hand-plane keywords. "jointer" is included here as a fallback: a title
  // like "Stanley No. 8 Jointer" is a jointer plane, not a power jointer.
  // Power-branded "jointer" already matched earlier and returned Jointer.
  if (containsAny(lower, ['plane', 'smoother', 'jack plane', 'block plane', 'rabbet', 'router plane', 'plow', 'plough', 'low angle jack', 'low-angle jack', 'low angle smoother', 'jointer'])) {
    if (lower.includes('block')) return 'Block Plane';
    if (lower.includes('router plane')) return 'Router Plane';
    if (containsAny(lower, ['plow', 'plough'])) return 'Plow Plane';
    if (lower.includes('rabbet')) return 'Rabbet Plane';
    if (containsAny(lower, ['infill', 'norris', 'spiers', 'preston'])) return 'Infill Plane';
    return 'Bench Plane';
  }
  // Low-angle jacks / bevel-up smoothers — modern plane family names that
  // don't always include the word "plane" in the title.
  if (containsAny(lower, ['low angle jack', 'low-angle jack', 'low angle smoother', 'bevel-up smoother', 'bevel up smoother'])) return 'Bench Plane';
  if (containsAny(lower, ['chisel', 'gouge'])) return 'Chisel';
  if (containsAny(lower, ['dovetail saw', 'tenon saw', 'back saw', 'carcass saw'])) return 'Back Saw';
  if (containsAny(lower, ['japanese saw', 'ryoba', 'dozuki', 'kataba'])) return 'Japanese Saw';
  if (containsAny(lower, ['coping saw'])) return 'Coping Saw';
  if (containsAny(lower, ['frame saw'])) return 'Frame Saw';
  // "saw" alone is a weak signal — only fall to Hand Saw when no power-tool
  // brand is in the title. A Festool / SawStop / DeWalt listing with the
  // bare word "saw" and no matching power-saw keyword is a multi-tool lot or
  // a miscategorized title; let the LLM decide rather than misclassify as a
  // hand saw here.
  if (lower.includes('saw') && !powerBranded) return 'Hand Saw';
  if (containsAny(lower, ['brace'])) return 'Brace';
  if (containsAny(lower, ['eggbeater', 'egg beater'])) return 'Eggbeater Drill';
  if (containsAny(lower, ['auger bit'])) return 'Auger Bit';
  if (containsAny(lower, ['drill bit', 'drill bit'])) return 'Drill Bit';
  if (containsAny(lower, ['axe', 'adze', 'hatchet'])) return 'Axe';
  if (containsAny(lower, ['spokeshave'])) return 'Spokeshave';
  if (containsAny(lower, ['drawknife', 'draw knife'])) return 'Drawknife';
  if (containsAny(lower, ['cabinet scraper'])) return 'Cabinet Scraper';
  if (containsAny(lower, ['card scraper'])) return 'Card Scraper';
  if (lower.includes('square')) return 'Square';
  if (containsAny(lower, ['marking gauge'])) return 'Marking Gauge';
  if (containsAny(lower, ['mortise gauge'])) return 'Mortise Gauge';
  if (containsAny(lower, ['bevel gauge', 'sliding bevel'])) return 'Bevel Gauge';
  if (lower.includes('caliper')) return 'Caliper';
  if (lower.includes('rule')) return 'Rule';
  if (lower.includes('level')) return 'Level';
  if (containsAny(lower, ['hammer', 'mallet'])) return lower.includes('mallet') ? 'Mallet' : 'Hammer';
  if (lower.includes('vise')) return 'Vise';
  if (lower.includes('clamp')) return 'Clamp';
  if (lower.includes('holdfast')) return 'Holdfast';
  if (lower.includes('pliers')) return 'Pliers';
  if (containsAny(lower, ['knife', 'croze'])) return 'Knife';
  return 'Other';
}

module.exports = { extractBrand, extractType, BRANDS };
