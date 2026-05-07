/**
 * Stanley bench plane reference data + URL slug helpers for /planes/... pages.
 *
 * Static knowledge tables for:
 *   - Type Study (Type 1-20): production years, era label, distinguishing
 *     features. Source: Patrick Leach's Blood & Gore consensus, distilled
 *     from the existing prose in functions/normalize/prompt.js and
 *     functions/toolscan-prompt.js.
 *   - Bench plane models (#1-#8) and Bedrock models (#602-#608): length,
 *     iron width, common usage, rarity tier. Used for page hero subheads.
 *
 * URL slug helpers:
 *   - parseBrandSlug / parseModelSlug / parseTypeSlug — slug → canonical
 *   - expandBrandSlugForLookup — handles Stanley ↔ Stanley-Bailey collapse
 *
 * Inverse (canonical → slug) is covered by `slug()` in src/utils/priceStats.js.
 */

export const STANLEY_BENCH_PLANE_TYPES = {
  1:  { label: 'Type 1',  years: '1867-1869', era: 'Pre-lateral',  features: 'No lateral adjustment lever. Solid bottom; "BAILEY" cast on iron.' },
  2:  { label: 'Type 2',  years: '1869-1872', era: 'Pre-lateral',  features: 'No lateral lever. Liberty-bell-shaped lever cap.' },
  3:  { label: 'Type 3',  years: '1872-1873', era: 'Pre-lateral',  features: 'No lateral lever. Slightly recessed bed behind frog.' },
  4:  { label: 'Type 4',  years: '1874-1884', era: 'Pre-lateral',  features: 'No lateral lever. Solid brass adjuster nut.' },
  5:  { label: 'Type 5',  years: '1885-1888', era: 'Pre-lateral',  features: 'No lateral lever. Larger adjuster nut, additional patent dates.' },
  6:  { label: 'Type 6',  years: '1888-1890', era: 'Pre-lateral',  features: 'No lateral lever. Last pre-lateral type before the 1890 transition.' },
  7:  { label: 'Type 7',  years: '1890-1892', era: 'Early lateral', features: 'First lateral adjustment lever. Twisted/crinkled steel lateral.' },
  8:  { label: 'Type 8',  years: '1892-1898', era: 'Early lateral', features: 'Lateral lever with disc end; B-casting mark behind frog.' },
  9:  { label: 'Type 9',  years: '1902-1907', era: 'Early lateral', features: '"S" casting behind frog. Lever cap kidney-shaped hole.' },
  10: { label: 'Type 10', years: '1907-1909', era: 'Early lateral', features: 'Frog adjustment screw added. Patent dates rearranged.' },
  11: { label: 'Type 11', years: '1910-1918', era: 'Classic',      features: '"STANLEY" on lateral lever. Hard rubber adjuster nut. Rosewood tote and knob. Patent dates behind frog ("PAT 3-25-02"+others).' },
  12: { label: 'Type 12', years: '1919-1924', era: 'Classic',      features: 'Sweetheart-pre. Patent dates removed; "MADE IN USA" added.' },
  13: { label: 'Type 13', years: '1925-1928', era: 'Sweetheart',   features: '"SW" cartouche trademark on cutter. Rosewood handles.' },
  14: { label: 'Type 14', years: '1929-1932', era: 'Sweetheart',   features: 'Sweetheart cutter; final rosewood-handle generation. Orange frog adjustment screw.' },
  15: { label: 'Type 15', years: '1932-1933', era: 'Late classic', features: 'Last of the rosewood handles. Slightly redesigned lever cap.' },
  16: { label: 'Type 16', years: '1933-1941', era: 'Stained hardwood', features: 'Stained hardwood handles replace rosewood. Hard rubber depth adjuster wheel.' },
  17: { label: 'Type 17', years: '1942-1945', era: 'WWII',         features: 'Stained hardwood handles. Slightly rougher casting quality (war-era materials).' },
  18: { label: 'Type 18', years: '1946-1947', era: 'Post-WWII',    features: 'Stained hardwood handles; pre-blue-paint.' },
  19: { label: 'Type 19', years: '1948-1961', era: 'Blue paint',   features: 'Blue-painted bed and frog. Ribbed depth adjustment nut.' },
  20: { label: 'Type 20', years: '1962-1967+', era: 'Modern',       features: 'Blue paint. "STANLEY" in rectangular cartouche. Later examples have plastic handles.' },
};

export const STANLEY_BENCH_PLANE_MODELS = {
  // Bench planes (Bailey pattern + Bedrock pattern)
  'No. 1':       { length: '5.5"',  iron_width: '1 1/4"', name: 'Miniature smoother',     commonality: 'Rare collector' },
  'No. 2':       { length: '7"',    iron_width: '1 5/8"', name: 'Small smoother',         commonality: 'Less common' },
  'No. 3':       { length: '8"',    iron_width: '1 3/4"', name: 'Small smoothing plane',  commonality: 'Common' },
  'No. 4':       { length: '9.5"',  iron_width: '2"',     name: 'Standard smoothing plane', commonality: 'Very common' },
  'No. 4 1/2':   { length: '10"',   iron_width: '2 3/8"', name: 'Wide smoothing plane',   commonality: 'Less common' },
  'No. 5':       { length: '14"',   iron_width: '2"',     name: 'Standard jack plane',    commonality: 'Very common' },
  'No. 5 1/2':   { length: '15"',   iron_width: '2 3/8"', name: 'Wide jack plane',        commonality: 'Less common' },
  'No. 6':       { length: '18"',   iron_width: '2 3/8"', name: 'Fore plane',             commonality: 'Common' },
  'No. 7':       { length: '22"',   iron_width: '2 3/8"', name: 'Jointer plane',          commonality: 'Common' },
  'No. 8':       { length: '24"',   iron_width: '2 5/8"', name: 'Largest jointer',        commonality: 'Less common' },
  // Bedrock models — same nominal sizes, different frog design (the 600-series)
  'No. 602':     { length: '7"',    iron_width: '1 5/8"', name: 'Bedrock smoother (small)', commonality: 'Rare collector' },
  'No. 603':     { length: '8"',    iron_width: '1 3/4"', name: 'Bedrock smoother',       commonality: 'Less common' },
  'No. 604':     { length: '9.5"',  iron_width: '2"',     name: 'Bedrock smoother',       commonality: 'Common' },
  'No. 604 1/2': { length: '10"',   iron_width: '2 3/8"', name: 'Wide Bedrock smoother',  commonality: 'Less common' },
  'No. 605':     { length: '14"',   iron_width: '2"',     name: 'Bedrock jack',           commonality: 'Common' },
  'No. 605 1/2': { length: '15"',   iron_width: '2 3/8"', name: 'Wide Bedrock jack',      commonality: 'Less common' },
  'No. 606':     { length: '18"',   iron_width: '2 3/8"', name: 'Bedrock fore plane',     commonality: 'Less common' },
  'No. 607':     { length: '22"',   iron_width: '2 3/8"', name: 'Bedrock jointer',        commonality: 'Less common' },
  'No. 608':     { length: '24"',   iron_width: '2 5/8"', name: 'Bedrock largest jointer', commonality: 'Less common' },
};

/**
 * Brand-slug registry. Each entry maps a URL slug to:
 *   - canonical: the primary canonical_brand string for the page header
 *   - aliases:   ALL canonical_brand values that should be merged at lookup
 *                time (covers the Stanley ↔ Stanley-Bailey split where many
 *                listings explicitly name "Bailey" so the normalizer
 *                canonicalizes them differently from plain "Stanley").
 *
 * Bedrock keeps its own slug because Bedrock pricing is genuinely distinct
 * from Bailey-pattern Stanley.
 */
const BRAND_SLUG_REGISTRY = {
  'stanley':         { canonical: 'Stanley',         aliases: ['Stanley', 'Stanley-Bailey'] },
  'stanley-bailey':  { canonical: 'Stanley-Bailey',  aliases: ['Stanley', 'Stanley-Bailey'] }, // collapsed for completeness; canonical naming preserved on the page header
  'stanley-bedrock': { canonical: 'Stanley Bedrock', aliases: ['Stanley Bedrock'] },
  'lie-nielsen':     { canonical: 'Lie-Nielsen',     aliases: ['Lie-Nielsen'] },
  'veritas':         { canonical: 'Veritas',         aliases: ['Veritas'] },
  'record':          { canonical: 'Record',          aliases: ['Record'] },
  'sargent':         { canonical: 'Sargent',         aliases: ['Sargent'] },
  'millers-falls':   { canonical: 'Millers Falls',   aliases: ['Millers Falls'] },
  'norris':          { canonical: 'Norris',          aliases: ['Norris'] },
  'woodriver':       { canonical: 'WoodRiver',       aliases: ['WoodRiver'] },
};

/**
 * Resolve a URL brand slug to its canonical brand + lookup aliases.
 * Unknown slugs fall back to a best-effort title-case canonical and
 * single-element alias list (no merge).
 */
export function parseBrandSlug(slug) {
  if (!slug) return null;
  const key = String(slug).toLowerCase();
  const known = BRAND_SLUG_REGISTRY[key];
  if (known) return known;
  // Fallback for unknown brands: title-case the slug, no alias merge.
  const titled = key.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return { canonical: titled, aliases: [titled] };
}

/**
 * Resolve a URL brand slug to the array of canonical_brand values to look
 * up in priceStats / externalListings. Wraps parseBrandSlug for callers
 * that only need the alias list.
 */
export function expandBrandSlugForLookup(slug) {
  const parsed = parseBrandSlug(slug);
  return parsed ? parsed.aliases : [];
}

/**
 * Resolve a URL model slug to a canonical model string.
 * Examples: "no-5" → "No. 5", "no-4-1-2" → "No. 4 1/2", "no-605" → "No. 605".
 *
 * Uses the static MODEL table for known forms; falls back to a heuristic
 * "no-N" → "No. N" expansion for unknown numerics.
 */
const MODEL_SLUG_LOOKUP = (() => {
  const out = {};
  for (const canonical of Object.keys(STANLEY_BENCH_PLANE_MODELS)) {
    const slug = canonical
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    out[slug] = canonical;
  }
  return out;
})();

export function parseModelSlug(slug) {
  if (!slug) return null;
  const key = String(slug).toLowerCase();
  if (MODEL_SLUG_LOOKUP[key]) return MODEL_SLUG_LOOKUP[key];
  // Fallback: "no-N" → "No. N" (handles models we haven't enumerated yet)
  const m = key.match(/^no-(\d+(?:-\d+-\d+)?)$/);
  if (m) {
    const n = m[1].replace(/-(\d+)-(\d+)/, ' $1/$2');
    return `No. ${n}`;
  }
  return null;
}

/**
 * Resolve a URL type slug to an integer 1-20, or null if unparseable.
 */
export function parseTypeSlug(slug) {
  if (!slug) return null;
  const m = String(slug).toLowerCase().match(/^type-(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isInteger(n) || n < 1 || n > 20) return null;
  return n;
}

/**
 * Lookup the type-study record for a plane_type_number. Returns null if
 * the number isn't in the 1-20 range.
 */
export function getStanleyTypeStudy(planeTypeNumber) {
  if (!Number.isInteger(planeTypeNumber)) return null;
  return STANLEY_BENCH_PLANE_TYPES[planeTypeNumber] || null;
}

/**
 * Lookup the model record for a canonical model string. Returns null when
 * the model isn't in our enumerated set.
 */
export function getStanleyModel(canonicalModel) {
  if (!canonicalModel) return null;
  return STANLEY_BENCH_PLANE_MODELS[canonicalModel] || null;
}
