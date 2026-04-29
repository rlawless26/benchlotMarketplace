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

// ORDER MATTERS: multi-word brands and brands that are proper supersets of
// other brand strings appear FIRST so the substring-based matcher hits the
// specific form before the shorter one. Example: "Record Power" must come
// before "Record" or any "Record Power BS350" title would match "Record"
// (vintage hand-tool brand) and attribute a modern bandsaw to the wrong era.
const BRANDS = [
  // Multi-word / disambiguated brands — must come before their single-word
  // prefixes (Record Power before Record, etc.)
  'Record Power',
  'General International',
  'Shop Fox',
  'Bench Dog',
  'King Canada',
  'Steel City',
  'Walker-Turner',
  'Yates-American',
  'North Brothers',
  'Bridge City',
  'Blue Spruce',
  'Buck Brothers',
  'Millers Falls',
  'Keen Kutter',
  'Ohio Tool',
  'Henry Taylor',
  'Ashley Iles',
  'Wood-Mizer',
  'Brown & Sharpe',
  'Porter-Cable',
  'Metabo HPT',
  'American Woodworking',

  // Hand-tool vintage / antique
  'Stanley', 'Lie-Nielsen', 'Veritas', 'Record', 'Norris', 'Spiers',
  'Preston', 'Disston', 'Sargent', 'Winchester', 'Chaplin', 'Bailey',
  'Bedrock', 'Union', 'Greenfield', 'Marples', 'Ward', 'Mathieson',
  'Sorby', 'Gramercy', 'Clifton', 'Hock', 'Barton', 'Moulson', 'Rabone',
  'Starrett', 'Lufkin', 'Yankee', 'Irwin', 'Goodell-Pratt',
  'Pexto', 'Narex',

  // Modern precision / woodworking (M5)
  'Festool', 'Woodpeckers', 'SawStop', 'Laguna', 'Powermatic', 'Delta',
  'Jet', 'Rikon', 'Grizzly', 'Oneida', 'Mafell', 'Felder',
  'Martin', 'Minimax', 'SCM', 'Hammer', 'Oneway', 'Robust', 'Nova',
  'Jointech', 'Incra', 'Kreg', 'Rockler', 'Shaper',
  'Axiom', 'Shapeoko', 'Inventables',

  // Power-tool pro / prosumer (M5)
  'DeWalt', 'Milwaukee', 'Makita', 'Bosch', 'Metabo', 'Ridgid',
  'Hitachi', 'Skilsaw', 'Skil', 'Craftsman', 'Ryobi',
  'Kobalt', 'Hart', 'Wen',

  // Vintage stationary (M5)
  'Rockwell', 'Oliver', 'Tannewitz', 'Crescent', 'Parks', 'Northfield',
  'Atlas',

  // Specialty / accessories (M5)
  'SuperMax', 'Eclipse', 'Fein', 'Triton', 'Baileigh',
  'Wilton', 'Whitney', 'Pegas', 'Excalibur', 'Woodcraft', 'Highland',
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
  // Core power-tool brands from the M5 first pass
  'festool', 'sawstop', 'laguna', 'powermatic', 'grizzly', 'jet',
  'rikon', 'shop fox', 'dewalt', 'makita', 'milwaukee', 'bosch',
  'metabo', 'metabo hpt', 'ridgid', 'porter-cable', 'hitachi', 'skil',
  'skilsaw', 'ryobi', 'craftsman', 'kobalt', 'hart', 'wen', 'rockwell',
  'walker-turner', 'yates-american', 'oliver', 'tannewitz', 'mafell',
  'felder', 'minimax', 'hammer', 'oneway', 'nova', 'woodpeckers',
  'incra', 'kreg', 'rockler', 'shaper', 'shapeoko', 'axiom',
  'inventables', 'wood-mizer', 'oneida',
  // Additional brands (second wave — SuperMax, Eclipse, Atlas, Fein, etc.)
  'supermax', 'eclipse', 'fein', 'triton', 'baileigh', 'steel city',
  'wilton', 'whitney', 'record power', 'king canada', 'pegas',
  'excalibur', 'parks', 'northfield', 'atlas', 'general international',
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

/**
 * Recognize listings that aren't sellable woodworking tools — books, raw
 * lumber/wood blanks, magazines, plans/DVDs, multi-tool grab-bag posts.
 *
 * Conservative by design: false positives (real tools flagged as non-tools)
 * are worse than false negatives (a few non-tools slipping through). Rule of
 * thumb — if any tool keyword appears in the title, leave it alone. The only
 * signals strong enough to override are DVDs/CDs and explicit auction
 * catalogs, which are media even when the topic is a tool.
 *
 * Returns `{nonTool: true, reason: '...'}` or `{nonTool: false}`.
 */
// Note: aprons/pencils/crayons/markers used to live here, but the marketplace
// is core shop tools only — they're consumables/apparel, not tools. Removed so
// the non-tool patterns below can catch them.
const TOOL_KEYWORD_RE = /\b(planes?|chisels?|saws?|gouges?|knives|knife|gauges?|braces?|drills?|mallets?|hammers?|spokeshaves?|rules?|rulers?|squares?|levels?|calipers?|vises?|clamps?|holdfasts?|pliers|adze|axe|hatchet|drawknife|scrapers?|froes?|jointers?|sanders?|routers?|lathes?|sharpeners?|jigs?|machines?|fixtures?|cutters?|bits?|irons?|blades?|totes?|knobs?|staplers?|planers?|trimmers?|rollers?|holders?|kits?|files?|wrenches?|tools?|screwdrivers?|screw\s+drivers?|hardware|stops?|fences?|tongue|miters?|mortises?|pegs?|hooks?|hones?|stones?|whetstones?|oilstones?|grinders?|sharpening|nails?|centers?|wedges?|punches?|chucks?|tongs|spanners?|forks?|spades?|trowels?|burnishers?|reamers?|taps?|dies?|mills?|chainsaws?|grinder|sander|gun|guns|system|systems|vacuum|vacuums|compressor|compressors|motor|motors|cutterhead|extension|extensions|jointing|sharpening|domino|biscuit|router-table|workbench|benchtop|moulder|hopper|spline|tenon|dovetail|joinery)\b/;

function classifyNonTool(title) {
  if (!title || typeof title !== 'string') return { nonTool: false };
  const t = title.toLowerCase();

  // Strong non-tool signals — DVDs/CDs and named auction catalogs. Media
  // about a tool is still media. Override the tool-keyword check below.
  if (/\b(dvds?|cds?)\b/.test(t)) return { nonTool: true, reason: 'media' };
  if (/\bauction\s+catalogs?\b/.test(t)) return { nonTool: true, reason: 'catalog' };

  // Brand collisions where the brand name incidentally contains a tool
  // keyword (e.g. "Nichols & Stone" → "stone"; "Restoration Hardware" →
  // "hardware"). These run BEFORE the tool gate to override it.
  if (/\bnichols\s*(?:&|and)\s*stone\b/.test(t)) return { nonTool: true, reason: 'brand-collision' };
  if (/\brestoration\s+hardware\b/.test(t)) return { nonTool: true, reason: 'brand-collision' };
  if (/\bdelta\s+children\b/.test(t)) return { nonTool: true, reason: 'brand-collision' };
  if (/\bveritas\s+press\b/.test(t)) return { nonTool: true, reason: 'brand-collision' };

  // If any tool keyword appears, treat the listing as a tool. Books about
  // gauges, dowel jigs, magazine-fed drills, veneer scrapers, etc. all have
  // tool keywords and should not be flagged.
  if (TOOL_KEYWORD_RE.test(t)) return { nonTool: false };

  // No tool keyword — now safe to flag explicit non-tool signals.
  if (/\bbooks?\b/.test(t)) return { nonTool: true, reason: 'book' };
  if (/\bmagazines?\b/.test(t)) return { nonTool: true, reason: 'magazine' };
  if (/\b(catalogs?|catalogues?|pamphlets?|brochures?|manuals?)\b/.test(t)) return { nonTool: true, reason: 'catalog' };
  if (/\bslabs?\b/.test(t)) return { nonTool: true, reason: 'lumber' };
  if (/\b(lumber|board\s*feet|bd\.?\s*ft\.?|bdft)\b/.test(t)) return { nonTool: true, reason: 'lumber' };
  if (/\bdowels?\b/.test(t)) return { nonTool: true, reason: 'lumber' };
  if (/\bveneers?\b/.test(t)) return { nonTool: true, reason: 'lumber' };
  if (/\b(garage\s+cleanup|three\s+generations|3\s+generations)\b/.test(t)) return { nonTool: true, reason: 'lot' };

  // FBM-specific noise patterns. The Bright Data scraper returns broad
  // results from a single keyword search ("Festool" pulls clothing brands,
  // "Veritas" pulls homeschool books from Veritas Press, "Woodpeckers"
  // pulls actual bird-feeder listings, etc.). These categories rarely
  // contain tool keywords so the gate above won't catch them.
  if (/\b\d+\s*(bed|bath)s?\b/.test(t)) return { nonTool: true, reason: 'real-estate' };
  if (/\b(studio|townhouse|condo|apartment|duplex)\s*[-,/]?\s*(\d+\s*bath|home|house|rental|for\s+rent)/.test(t)) return { nonTool: true, reason: 'real-estate' };
  if (/\b(swing\s+set|swing-set|playset|trampoline|treadmill|elliptical|exercise\s+bike|home\s+gym|stationary\s+bike|abs\s+(roller|trainer|workout))\b/.test(t)) return { nonTool: true, reason: 'fitness' };
  if (/\b(dress|gown|trunks|jacket|coat|jeans|shorts|skirt|sneakers?|heels|handbag|purse|backpack|wallet)\b/.test(t)) return { nonTool: true, reason: 'clothing' };
  // Footwear — boots, plus the shoe-width pattern ("Size 13 EE") that catches
  // listings whose title doesn't contain the word "boot" at all (e.g. "Hoss
  // Cross Cut Logger Size 13 EE").
  if (/\bboots?\b|\bsize\s+\d+\s*(ee|d|w|m)\b/.test(t)) return { nonTool: true, reason: 'footwear' };
  // Apparel — aprons, gloves, shop coats, hats. Real woodworking aprons get
  // dropped too; that's intentional (consumable, not core shop tool).
  if (/\b(aprons?|coveralls?|shop\s+coats?|t-?shirts?|sweat\s*shirts?|hoodies?|hats?|workshirts?|gloves?)\b/.test(t)) return { nonTool: true, reason: 'apparel' };
  // PPE / safety consumables.
  if (/\b(dust\s+mask|respirator|n95|kn95|ppe|hearing\s+protection|ear\s*plugs?|ear\s*muffs?|safety\s+glasses)\b/.test(t)) return { nonTool: true, reason: 'ppe' };
  // Marking / writing consumables — carpenter pencils, sharpies. Note that
  // marking/mortise/bevel gauges already match TOOL_KEYWORD_RE via "gauges?".
  if (/\b(carpenter\s+pencils?|pencils?|crayons?|markers?)\b/.test(t)) return { nonTool: true, reason: 'consumable' };
  // Musical instruments — Gretsch guitars, etc.
  if (/\b(guitars?|bass\s+guitar|amplifier|piano|keyboard|drum\s+kit|saxophone|violin|fiddle|banjo|mandolin|ukulele|microphone|pedal\s+board)\b/.test(t)) return { nonTool: true, reason: 'instrument' };
  // Furniture — Harvard Windsor chairs, sofas, dressers. "Workbench" is a
  // real tool keyword and matches above; chairs/sofas/etc. are not. Bare
  // \bchairs?\b is broad on purpose — Harvard "Wood Chairs" doesn't put
  // "Windsor" adjacent to "Chairs" so the multi-word forms miss.
  if (/\b(chairs?|sofa|loveseat|recliner|ottoman|nightstand|dresser|hutch|armoire|bookshelf|bookcase)\b/.test(t)) return { nonTool: true, reason: 'furniture' };
  // Watercraft / personal flotation — Stearns life vests, etc.
  if (/\b(life\s+vest|life\s+jacket|pfd\b|flotation\s+device|kayak\s+paddle|canoe\s+paddle)\b/.test(t)) return { nonTool: true, reason: 'watercraft' };
  // Baby / kids gear — Delta Children Play Yard.
  if (/\b(play\s+yard|playyard|playpen|playard|stroller|car\s+seat|high\s*chair|crib|bassinet|baby\s+gate|diaper|onesie)\b/.test(t)) return { nonTool: true, reason: 'baby' };
  // Paintball / goggles — JT Proflex masks. Drop all goggles; missing real
  // shop goggles is acceptable, paintball masks slipping through is not.
  if (/\b(paintball|airsoft|proflex|jt\s+proflex|goggles?)\b/.test(t)) return { nonTool: true, reason: 'paintball-or-goggles' };
  if (/\b(bird\s+feeder|peanut\s+hut|suet\s+(log|cake|feeder)|squirrel\s+feeder|hummingbird)\b/.test(t)) return { nonTool: true, reason: 'bird-feeder' };
  if (/\b(canister\s+jar|enamel\s+ware|enamelware|cookware|dinnerware|silverware|stemware|glassware|china\s+set|cooking\s+pot|frying\s+pan|baking\s+(dish|sheet|pan))\b/.test(t)) return { nonTool: true, reason: 'kitchenware' };
  if (/\b(storage\s+shed|garden\s+shed|outdoor\s+shed|plastic\s+shed|resin\s+shed)\b/.test(t)) return { nonTool: true, reason: 'shed' };
  if (/\b(toy|toys|stuffed\s+animal|action\s+figure|plush|doll|board\s+game|video\s+game|playset|game\s+(set|board))\b/.test(t)) return { nonTool: true, reason: 'toy' };
  if (/\b(scooter|skateboard|hoverboard|electric\s+bike|e-bike|kayak|surfboard)\b/.test(t)) return { nonTool: true, reason: 'sport-vehicle' };
  if (/\b(wall\s+art|canvas\s+print|throw\s+pillow|blanket|comforter|bedding|drapes?|curtains?|rug|tapestry|sculpture|figurine|vase|planter)\b/.test(t)) return { nonTool: true, reason: 'home-decor' };
  // Foreign-language food posts (FBM seller spam in non-English) — these
  // never have tool keywords in any language we care about. Skip narrow
  // detection and rely on the next-line "no English-tool-keyword" signal.

  return { nonTool: false };
}

module.exports = { extractBrand, extractType, BRANDS, classifyNonTool };
