/**
 * Baseline brand + tool-type heuristics ported from scrapers/jimbode_scraper.py.
 *
 * These are deliberately simple keyword matchers — good enough to seed
 * `heuristic_brand` / `heuristic_type` during M1 ingestion. M2's LLM
 * normalizer reads them as hints and overwrites with canonical fields.
 */

const BRANDS = [
  'Stanley', 'Lie-Nielsen', 'Veritas', 'Record', 'Norris', 'Spiers',
  'Preston', 'Disston', 'Sargent', 'Millers Falls', 'Keen Kutter',
  'Winchester', 'Chaplin', 'Bailey', 'Bedrock', 'Union', 'Ohio Tool',
  'Greenfield', 'Buck Brothers', 'Marples', 'Ward', 'Mathieson',
  'Sorby', 'Gramercy', 'Clifton', 'Hock', 'Blue Spruce', 'Barton',
  'Moulson', 'Rabone', 'Starrett', 'Brown & Sharpe', 'Lufkin',
  // Common brands that surfaced in Jim Bode data as "Unknown"
  'Yankee', 'Bridge City', 'Irwin', 'North Brothers', 'Goodell-Pratt',
  'Pexto', 'Henry Taylor', 'Ashley Iles', 'Narex',
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

function extractType(title) {
  if (!title) return 'Other';
  const lower = title.toLowerCase();

  if (containsAny(lower, ['plane', 'smoother', 'jointer', 'jack plane', 'block plane', 'rabbet', 'router plane', 'plow', 'plough'])) {
    if (lower.includes('block')) return 'Block Planes';
    if (lower.includes('router')) return 'Router Planes';
    if (containsAny(lower, ['plow', 'plough'])) return 'Plow Planes';
    if (lower.includes('rabbet')) return 'Rabbet Planes';
    if (containsAny(lower, ['infill', 'norris', 'spiers', 'preston'])) return 'Infill Planes';
    return 'Bench Planes';
  }
  if (containsAny(lower, ['chisel', 'gouge'])) return 'Chisels';
  if (containsAny(lower, ['saw', 'dovetail saw', 'tenon saw', 'back saw'])) return 'Saws';
  if (containsAny(lower, ['brace', 'drill', 'bit'])) return 'Braces & Drills';
  if (containsAny(lower, ['axe', 'adze', 'hatchet'])) return 'Axes & Adzes';
  if (containsAny(lower, ['spokeshave', 'drawknife', 'scraper'])) return 'Shaping Tools';
  if (containsAny(lower, ['square', 'level', 'rule', 'gauge', 'caliper', 'bevel'])) return 'Measuring';
  if (containsAny(lower, ['hammer', 'mallet'])) return 'Hammers';
  if (containsAny(lower, ['vise', 'clamp', 'holdfast'])) return 'Workholding';
  if (containsAny(lower, ['knife', 'croze'])) return 'Knives';
  return 'Other';
}

module.exports = { extractBrand, extractType, BRANDS };
