/**
 * US-only location parsing utilities, shared across ingest adapters.
 *
 * Two parsers:
 *   - `parseLocationTag(text)` — bracket-style tags in forum / Reddit titles
 *     (`[USA-CA]`, `[CA]`, `[California]`). Conservative on purpose: returns
 *     null when the input is ambiguous, so the listing falls into the
 *     "Other" region rather than getting mis-tagged.
 *   - `parseFbmLocation(str)` — `"City, ST"` strings from Facebook
 *     Marketplace. Tolerant of zip suffix and full state name.
 *
 * Both return ISO US state codes (uppercase, two letters) or null. Callers
 * own the state-to-region mapping — that lives in `STATE_TO_REGION` in
 * `functions/alerts/predicates.js` (server) and
 * `src/firebase/adapters/externalListingAdapter.js` (client) so neither
 * import path crosses the ESM/CJS boundary.
 */

const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC',
]);

const STATE_NAME_TO_CODE = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT',
  'delaware': 'DE', 'district of columbia': 'DC', 'florida': 'FL',
  'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL',
  'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS', 'kentucky': 'KY',
  'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN',
  'mississippi': 'MS', 'missouri': 'MO', 'montana': 'MT',
  'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH',
  'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA',
  'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
  'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY',
};

const SEARCH_WINDOW_CHARS = 500;

/**
 * Extract a US state code from a forum / Reddit title (or the first ~500
 * chars of the body). Returns the state code or null.
 *
 * Anchored patterns, in priority order:
 *   1. `[USA-XX]` — unambiguous, highest confidence.
 *   2. `[XX]` — only when XX is a valid state code in uppercase. The
 *      uppercase-only check rejects `[OR]` in `[FS or trade]` (lowercase
 *      "or") while accepting `[OR]` for Oregon.
 *   3. `[Full State Name]` — case-insensitive lookup against
 *      `STATE_NAME_TO_CODE`.
 *
 * Informal locales like `[PNW]`, `[NorCal]`, `[New England]`, `[Bay Area]`,
 * `[CONUS]` are intentionally NOT mapped — they fall through to null and
 * the listing lands in the "Other" region. Easier to add coverage later
 * than to walk back a wrong mapping.
 *
 * Reddit's `[removed]` / `[deleted]` sentinels are also skipped.
 */
function parseLocationTag(text) {
  if (typeof text !== 'string' || !text) return null;
  const haystack = text.slice(0, SEARCH_WINDOW_CHARS);

  // Skip Reddit deletion sentinels.
  if (/^\[(removed|deleted)\]$/i.test(haystack.trim())) return null;

  // 1. [USA-XX] — match case-insensitive USA prefix, require uppercase
  // state code so "USA-or" doesn't accidentally match.
  const usaMatch = haystack.match(/\[usa[\s\-]+([A-Z]{2})\b/i);
  if (usaMatch && US_STATES.has(usaMatch[1].toUpperCase())) {
    return usaMatch[1].toUpperCase();
  }

  // 2. [XX] — uppercase only, must be a real state code. Bracketed.
  const codeMatch = haystack.match(/\[([A-Z]{2})\]/);
  if (codeMatch && US_STATES.has(codeMatch[1])) {
    return codeMatch[1];
  }

  // 3. [State Name] — case-insensitive full name. Allow either a single
  // bracketed token or the leading portion of a multi-token bracket
  // (e.g. `[California - Bay Area]`).
  const nameMatch = haystack.match(/\[([A-Za-z][A-Za-z\s]+?)(?:\s*[-,—].*)?\]/);
  if (nameMatch) {
    const name = nameMatch[1].trim().toLowerCase();
    if (STATE_NAME_TO_CODE[name]) return STATE_NAME_TO_CODE[name];
  }

  return null;
}

/**
 * Extract a US state code from a Facebook-Marketplace-style location
 * string. FBM typically returns `"Boston, MA"` but handle variants:
 *   - `"Boston, MA"`           → MA
 *   - `"Boston, Massachusetts"` → MA
 *   - `"Boston, MA 02101"`     → MA
 *   - `"Toronto, ON"`          → null (not a US state)
 *   - `""` / null              → null
 */
function parseFbmLocation(str) {
  if (typeof str !== 'string' || !str) return null;
  // Drop trailing zip if present (`Boston, MA 02101` → `Boston, MA`).
  const trimmed = str.replace(/\s+\d{5}(?:-\d{4})?\s*$/, '').trim();

  // Try ", XX" suffix first (two-letter state code).
  const codeMatch = trimmed.match(/,\s*([A-Z]{2})\s*$/);
  if (codeMatch && US_STATES.has(codeMatch[1])) return codeMatch[1];

  // Fall back to ", Full State Name" suffix.
  const nameMatch = trimmed.match(/,\s*([A-Za-z][A-Za-z\s]+?)\s*$/);
  if (nameMatch) {
    const code = STATE_NAME_TO_CODE[nameMatch[1].trim().toLowerCase()];
    if (code) return code;
  }

  return null;
}

module.exports = {
  US_STATES,
  STATE_NAME_TO_CODE,
  parseLocationTag,
  parseFbmLocation,
};
