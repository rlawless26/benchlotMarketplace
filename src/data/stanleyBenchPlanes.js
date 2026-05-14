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
  11: {
    label: 'Type 11', years: '1910-1918', era: 'Classic',
    features: '"STANLEY" on lateral lever. Hard rubber adjuster nut. Rosewood tote and knob. Patent dates behind frog ("PAT 3-25-02"+others).',
    lead: 'The Type 11 is what most people mean when they say "vintage Stanley." Rosewood handles, three patent dates cast into the bed, the lateral lever stamped clean. Classic-era proportions, before the company started cutting corners.',
    identify: [
      '**"STANLEY"** stamped clean on the lateral adjustment lever.',
      '**Three patent dates** cast into the bed behind the frog: `MAR-25-02`, `AUG-19-02`, `APR-19-10`.',
      '**Hard rubber depth adjuster nut** (later types switched to painted metal).',
      '**Rosewood tote and knob** (low knob — the high-knob redesign comes later).',
      '**Pre-Sweetheart cutter** — older Stanley markings, no SW cartouche.',
      '**Frog receiver** is a solid casting with a small forward arc — no rib through the middle.',
    ],
    misidentifications: 'Without seeing the frog area, Types 9, 10, 12, and 13 all look similar. The forward-arc receiver is the cleanest tell once you’ve seen it twice — Types 9–15 share it, and the cast rib appears on Type 16 onward. From Type 13 onward, the SW cartouche on the cutter is the easiest single marker; if it’s there, it’s not a Type 11.',
  },
  12: { label: 'Type 12', years: '1919-1924', era: 'Classic',      features: 'Sweetheart-pre. Patent dates removed; "MADE IN USA" added.' },
  13: {
    label: 'Type 13', years: '1925-1928', era: 'Sweetheart',
    features: '"SW" cartouche trademark on cutter. Rosewood handles.',
    lead: 'The Sweetheart years. The "SW" trademark cartouche on the cutter, rosewood handles still holding the line. Type 13 sits in the heart of the era collectors actually want, and prices reflect it.',
    identify: [
      '**SW cartouche** — the heart-shaped trademark around "SW", stamped on the cutter (the iron). This is the era marker.',
      '**Rosewood tote and knob** still — premium handles, before the 1933 switch to stained hardwood.',
      '**Two patent dates** on the bed (down from three in Type 11).',
      '**Frog receiver** looks similar to Type 11 — small forward arc, no center rib.',
      '**Lateral lever** continues with "STANLEY" stamp, single-piece twisted steel.',
    ],
    misidentifications: 'Type 12 (1919–1924) sits immediately before — no SW cartouche, otherwise close. Type 14 (1929–1932) sits immediately after — also has the SW cartouche, but adds an orange-painted frog adjustment screw. The SW + rosewood + no-orange-screw combination uniquely pins Type 13.',
  },
  14: { label: 'Type 14', years: '1929-1932', era: 'Sweetheart',   features: 'Sweetheart cutter; final rosewood-handle generation. Orange frog adjustment screw.' },
  15: {
    label: 'Type 15', years: '1932-1933', era: 'Late classic',
    features: 'Last of the rosewood handles. Slightly redesigned lever cap.',
    lead: 'The last rosewood-handled Stanley. A two-year transition before stained hardwood took over for good. Subtler markers than the surrounding types — most identification leans on the handle wood.',
    identify: [
      '**Rosewood tote and knob** still — the final rosewood-era generation.',
      '**No SW cartouche** on the cutter — the Sweetheart trademark moved off the iron in 1932.',
      '**Slightly redesigned lever cap** — profile is subtly different from Types 11–14.',
      '**Hard rubber depth adjuster nut** continues.',
      'Two-year run, low production volume, so genuinely less common than the surrounding types.',
    ],
    misidentifications: 'Type 14 (still has the SW cartouche + orange frog adjustment screw) sits immediately before. Type 16 (stained hardwood handles) sits immediately after. The Type 15 combination is rosewood + no SW cartouche + no orange screw — but the lever cap profile is the most diagnostic feature for someone who’s seen reference photos. Without comparison reference, calling a Type 15 with confidence is genuinely hard; lean on the rosewood + no-orange + no-SW combination and accept a wider date range.',
  },
  16: { label: 'Type 16', years: '1933-1941', era: 'Stained hardwood', features: 'Stained hardwood handles replace rosewood. Hard rubber depth adjuster wheel.' },
  17: {
    label: 'Type 17', years: '1942-1945', era: 'WWII',
    features: 'Stained hardwood handles. Slightly rougher casting quality (war-era materials).',
    lead: 'War-era Stanley. Stained hardwood handles (rosewood is long gone by now), and a casting quality that subtly tells you when the plane was made. Functional planes that show the era they came from.',
    identify: [
      '**Stained hardwood tote and knob** — not rosewood; this happened at Type 16 (1933) and continues.',
      '**Slightly rougher casting quality** — visible mold lines, marginally rougher finish than pre-war and post-war types. Wartime materials and labor.',
      '**Hard rubber depth adjuster nut** continues.',
      '**Bed marking** typically reads "MADE IN U.S.A." with no patent dates (the dates dropped around Type 12).',
      '**No blue paint** — that’s Type 19 and onward.',
    ],
    misidentifications: 'Type 16 (1933–1941) and Type 18 (1946–1947) sit on either side, both with stained hardwood. The rougher casting quality is the WWII tell, but it’s subtle. If you can read clear date markings or you know the plane came out of a 1940s tool chest, the surrounding context is often more diagnostic than the casting itself. Many sellers list these as "Type 16-17" without committing — that’s honest practice.',
  },
  18: { label: 'Type 18', years: '1946-1947', era: 'Post-WWII',    features: 'Stained hardwood handles; pre-blue-paint.' },
  19: {
    label: 'Type 19', years: '1948-1961', era: 'Blue paint',
    features: 'Blue-painted bed and frog. Ribbed depth adjustment nut.',
    lead: 'When Stanley went blue. Blue-painted bed and frog mark the post-war modern era — Stanley’s biggest visual change since the originals. Long production run; lots of these around, generally the most affordable working Stanley you’ll find.',
    identify: [
      '**Blue-painted bed and frog** — the signature change. Earlier types are black-japanned.',
      '**Ribbed depth adjustment nut** (vs. the smooth knurled nut on Types 1–18).',
      '**Stained hardwood tote and knob** — not yet plastic; that’s Type 20.',
      '**"STANLEY" in cursive script** on the lateral adjustment lever.',
      '**Frog adjustment screw** painted gray or blue to match the bed (vs. raw metal or orange on earlier types).',
    ],
    misidentifications: 'Type 18 (1946–1947) sits immediately before blue paint — still black-japanned, smooth-knurled depth nut. Type 20 (1962–1967+) continues the blue paint but switches the lateral lever stamp to a rectangular cartouche. The ribbed depth nut is the cleanest delta from Type 18; the cursive lateral-lever stamp is the cleanest delta from Type 20.',
  },
  20: {
    label: 'Type 20', years: '1962-1967+', era: 'Modern',
    features: 'Blue paint. "STANLEY" in rectangular cartouche. Later examples have plastic handles.',
    lead: 'Late blue-paint Stanley. Rectangular "STANLEY" cartouche on the lateral lever; later examples have plastic handles. The end of the Stanley story as a serious tool maker. Functional, plentiful, inexpensive.',
    identify: [
      '**Blue paint** continues.',
      '**"STANLEY" in a rectangular cartouche** on the lateral adjustment lever (vs. cursive script on Type 19).',
      '**Stained hardwood handles** on earlier Type 20 examples; **plastic tote and knob** on later examples.',
      '**Ribbed depth adjustment nut** continues from Type 19.',
      '**Frog adjustment screw** painted to match bed.',
    ],
    misidentifications: 'Type 19 also has blue paint. The rectangular cartouche is the cleanest single tell — Type 19 has cursive script. If the handles are plastic, it’s unambiguously a late Type 20. Beyond Type 20 the type-study tradition mostly ends — Stanley’s later production isn’t tracked with the same per-year granularity, and "post-1967 Stanley" is the working label for anything after.',
  },
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
