/**
 * Wording helpers, ported from web/lib/format.ts, guide-paths.ts and
 * price-guide.ts so captions and cards say exactly what the guide pages say.
 * Keep in sync by hand; the originals are TypeScript inside the Next app.
 */

/** Mirror of slug() in functions/pricestats/cluster.js and web/lib/guide-paths.ts. */
function slug(s) {
  if (!s) return '_';
  const out = String(s).trim().toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return out || '_';
}

function money(v) {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (Number.isNaN(n)) return null;
  return n >= 1000 ? `$${Math.round(n).toLocaleString('en-US')}` : `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}

const centsToMoney = (c) => (c === null || c === undefined ? null : money(c / 100));

/** Round dollars for a headline: $127.50 -> $128. Keeps cents under $20. */
function moneyRound(v) {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (Number.isNaN(n)) return null;
  return n >= 20 ? money(Math.round(n)) : money(n);
}

const PLURAL_EXCEPTIONS = { Knife: 'Knives', Drawknife: 'Drawknives', Pliers: 'Pliers', Domino: 'Domino joiners', CNC: 'CNC machines', Workbench: 'Workbenches' };

function typePlural(type) {
  if (PLURAL_EXCEPTIONS[type]) return PLURAL_EXCEPTIONS[type];
  const i = type.lastIndexOf(' ');
  const head = i >= 0 ? type.slice(0, i + 1) : '';
  const last = i >= 0 ? type.slice(i + 1) : type;
  if (PLURAL_EXCEPTIONS[last]) return head + PLURAL_EXCEPTIONS[last];
  if (/(s|x|z|ch|sh)$/i.test(last)) return head + last + 'es';
  if (/[^aeiou]y$/i.test(last)) return head + last.slice(0, -1) + 'ies';
  return head + last + 's';
}

function typeLower(type) {
  return type.split(' ').map((w) => (w.length <= 4 && w === w.toUpperCase() ? w : w.toLowerCase())).join(' ');
}

/** "Stanley No. 4 bench plane" */
function clusterPhraseSingular(c) {
  const type = c.canonical_type ? typeLower(c.canonical_type) : 'tool';
  const t = c.plane_type_number ?? null;
  return [c.canonical_brand, c.canonical_model, t ? `Type ${t}` : null, c.canonical_size, type].filter(Boolean).join(' ');
}

/** "Stanley No. 4 bench planes" */
function clusterPhrase(c) {
  const type = c.canonical_type ? typeLower(typePlural(c.canonical_type)) : 'tools';
  const t = c.plane_type_number ?? null;
  return [c.canonical_brand, c.canonical_model, t ? `Type ${t}` : null, c.canonical_size, type].filter(Boolean).join(' ');
}

function clusterPath(c) {
  const third = c.modelSlug ?? c.sizeSlug ?? null;
  if (!third) return `/guide/${c.typeSlug}/${c.brandSlug}`;
  const base = `/guide/${c.typeSlug}/${c.brandSlug}/${third}`;
  return c.modelSlug && c.planeType ? `${base}/type-${c.planeType}` : base;
}

function guidePathFor(type, brand) {
  if (!type || !brand || brand === 'Unknown' || type === 'Other') return null;
  return clusterPath({ typeSlug: slug(type), brandSlug: slug(brand) });
}

/** Strips dealer stock numbers and "AS OF <date>" suffixes (web/lib/format.ts). */
function cleanTitle(title) {
  let s = title.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i++) {
    const before = s;
    s = s
      .replace(/\s*[-–—=*]+\s*AS OF [A-Z]{3,9}\.?\s*\d{1,2}\s*$/i, '')
      .replace(/\s*[-–—=*]+\s*(EXCELSIOR\s+)?#?\d{4,6}[A-Z]{0,2}\s*$/, '')
      .replace(/\s*[-–—=*]+\s*$/, '')
      .trim();
    if (s === before) break;
  }
  return s || title;
}

const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
const KEEP_UPPER = /^(no\.?|#?\d+[a-z]*|[ivx]+|usa|uk|nos|vr|sw|[a-z]&[a-z])$/i;

/**
 * Dealer titles arrive in every casing ("LIKE NEW VERITAS 'ROUND' SPOKESHAVE").
 * An all-caps title is re-cased for the card; mixed-case titles are trusted.
 */
function humanizeTitle(raw) {
  const t = cleanTitle(raw);
  const letters = t.replace(/[^A-Za-z]/g, '');
  if (!letters || letters !== letters.toUpperCase()) return t;
  const words = t.split(' ');
  return words
    .map((w, i) => {
      const bare = w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
      if (!bare) return w;
      // "NO 199" / "NO. 4" -> "No. 199" / "No. 4"
      if (/^no\.?$/i.test(bare) && /^\d/.test(words[i + 1] ?? '')) return 'No.';
      if (/^[A-Z]{1,2}$/.test(bare) && bare.length <= 2 && i > 0) return w; // "SW", "B"
      if (KEEP_UPPER.test(bare) && /\d/.test(bare)) return w;
      const lower = w.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(bare.toLowerCase())) return lower;
      return lower.replace(/(^|['"(\-/])([a-z])/g, (m, p, ch) => p + ch.toUpperCase());
    })
    .join(' ');
}

/** "2023-10" -> "Q4 2023" */
function quarterLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `Q${Math.floor((m - 1) / 3) + 1} ${y}`;
}

function plural(n, one, many) {
  return n === 1 ? one : many ?? `${one}s`;
}

function formatET(date, timezone = 'America/New_York') {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date);
}

module.exports = {
  slug, money, centsToMoney, moneyRound, typePlural, typeLower, clusterPhrase, clusterPhraseSingular,
  clusterPath, guidePathFor, cleanTitle, humanizeTitle, quarterLabel, plural, formatET,
};
