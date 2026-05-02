/**
 * Michael Rouillard Antique Tools ingestion adapter.
 *
 * Rouillard is a WooCommerce store on WordPress (NOT Shopify, despite a
 * superficially similar shape). We pull from the WooCommerce Store API:
 *
 *   GET /wp-json/wc/store/v1/products?per_page=100&page=N
 *
 * The Store API returns only purchasable inventory by default — sold-out
 * items remain visible but flip `is_in_stock`/`is_purchasable` to false.
 * We filter those out at ingestion and let `markExpired` flip anything
 * that disappears between runs (e.g. a fully removed product).
 *
 * Catalog is small (~130 active products as of 2026-05) and the endpoint
 * is fast, so we do not need the Hyperkitten-style two-phase fetch.
 */

const axios = require('axios');
const admin = require('firebase-admin');

const { upsertListings, markExpired } = require('./externalListings');
const { extractBrand, extractType } = require('./heuristics');

const SOURCE = 'rouillard';
const RAW_FORMAT = 'woocommerce_product';
const STORE_ORIGIN = 'https://michaelrouillardtools.com';
const BASE_URL = `${STORE_ORIGIN}/wp-json/wc/store/v1/products`;
const PAGE_SIZE = 100;
const PAGE_DELAY_MS = 1500;
const REQUEST_TIMEOUT_MS = 20000;
const USER_AGENT = 'Mozilla/5.0 (compatible; BenchlotIngestion/1.0; +https://benchlot.com)';

const http = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  },
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// WC Store API returns titles with HTML entities (e.g. `&#038;` for `&`).
// Decode the common cases so the heuristic brand/type matchers and downstream
// LLM see plain text. Numeric entities cover the long tail (curly quotes,
// em-dashes, etc.) the API emits.
function decodeEntities(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

// Store API quotes minor-unit integers as strings (e.g. `"88999"` for $889.99
// when `currency_minor_unit: 2`). Parse defensively against the field's own
// minor-unit declaration in case Rouillard ever switches currencies.
function parsePriceToCents(prices) {
  if (!prices || typeof prices !== 'object') return null;
  const raw = prices.price;
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  const minorUnit = Number.isInteger(prices.currency_minor_unit) ? prices.currency_minor_unit : 2;
  if (minorUnit === 2) return Math.round(n);
  return Math.round(n * Math.pow(10, 2 - minorUnit));
}

function normalizeImages(imagesField) {
  if (!Array.isArray(imagesField)) return [];
  const seen = new Set();
  const out = [];
  for (const img of imagesField) {
    const src = img && typeof img.src === 'string' ? img.src : null;
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push(src);
  }
  return out;
}

// Tags = WC product tags + product category slugs. Categories are the
// stronger signal here (e.g. `planes`, `wood-planes`, `modern-makers`) since
// Rouillard's `tags` array is usually empty. Both feed the M2 normalizer.
function buildTags(product) {
  const seen = new Set();
  const out = [];

  const push = (val) => {
    if (typeof val !== 'string') return;
    const norm = val.trim().toLowerCase();
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    out.push(norm);
  };

  if (Array.isArray(product.tags)) {
    for (const t of product.tags) {
      push(typeof t === 'string' ? t : t?.slug || t?.name);
    }
  }
  if (Array.isArray(product.categories)) {
    for (const c of product.categories) {
      push(c?.slug);
    }
  }
  return out;
}

/**
 * Skip products that aren't currently buyable. Store API exposes both
 * `is_in_stock` and `is_purchasable` — either being false should drop the
 * row. Defensive title/tag scan covers the rare case where a sold item is
 * left "in stock" with a manual marker.
 */
function isAvailable(product) {
  if (!product) return false;
  if (product.is_purchasable === false) return false;
  if (product.is_in_stock === false) return false;

  const title = decodeEntities(product.name || '');
  if (/\b(sold|reserved)\b/i.test(title)) return false;

  const tags = Array.isArray(product.tags) ? product.tags : [];
  if (tags.some((t) => {
    const s = typeof t === 'string' ? t : t?.slug || t?.name || '';
    return /\b(sold|reserved)\b/i.test(s);
  })) return false;

  return true;
}

function toRecord(product) {
  const slug = product.slug;
  if (!slug) return null;
  if (!isAvailable(product)) return null;

  const title = decodeEntities(product.name || '');
  const price_cents = parsePriceToCents(product.prices);

  const listing = {
    source: SOURCE,
    source_id: slug,
    source_url: typeof product.permalink === 'string' && product.permalink
      ? product.permalink
      : `${STORE_ORIGIN}/product/${slug}/`,
    title_raw: title,
    description_raw: product.description || null,
    price_cents,
    currency: product.prices?.currency_code || 'USD',
    condition_raw: null,
    images: normalizeImages(product.images),
    posted_at: null, // Store API does not expose product creation date
    tags: buildTags(product),
    heuristic_brand: extractBrand(title),
    heuristic_type: extractType(title),
    canonical_brand: null,
    canonical_type: null,
    canonical_model: null,
    canonical_size: null,
    era_estimate: null,
    // TODO(location): Rouillard's site doesn't publish his state. His bio
    // mentions a CT cabinet shop in his early career; current location
    // unverified. Confirm and backfill.
    location_state: null,
    location_display: null,
  };

  return {
    listing,
    raw: product,
    raw_format: RAW_FORMAT,
  };
}

async function fetchPage(page) {
  const url = `${BASE_URL}?per_page=${PAGE_SIZE}&page=${page}&orderby=date&order=desc`;
  const resp = await http.get(url);
  return Array.isArray(resp.data) ? resp.data : [];
}

async function scrapeAll(opts = {}) {
  const maxPages = opts.maxPages ?? Infinity;
  const records = [];
  let page = 1;

  while (page <= maxPages) {
    if (page > 1) await sleep(PAGE_DELAY_MS);
    let products;
    try {
      products = await fetchPage(page);
    } catch (err) {
      // The Store API returns `rest_post_invalid_page_number` (HTTP 400) when
      // you request a page past the end. Treat that as a normal end-of-feed.
      const status = err.response?.status;
      const code = err.response?.data?.code;
      if (status === 400 && code === 'rest_post_invalid_page_number') break;
      console.error(`[rouillard] page ${page} failed: ${err.message}`);
      throw err;
    }
    if (products.length === 0) break;

    for (const product of products) {
      const rec = toRecord(product);
      if (rec) records.push(rec);
    }

    if (products.length < PAGE_SIZE) break;
    page += 1;
  }

  return records;
}

async function runIngestion(opts = {}) {
  const runStartedAt = admin.firestore.Timestamp.now();
  const t0 = Date.now();

  const records = await scrapeAll(opts);
  const upsertSummary = await upsertListings(records, runStartedAt);
  const expireSummary = await markExpired(SOURCE, runStartedAt);

  return {
    source: SOURCE,
    scraped: records.length,
    inserted: upsertSummary.inserted,
    updated: upsertSummary.updated,
    expired: expireSummary.expired,
    durationMs: Date.now() - t0,
    runStartedAt: runStartedAt.toDate(),
  };
}

module.exports = {
  SOURCE,
  RAW_FORMAT,
  runIngestion,
  scrapeAll,
  toRecord,
  isAvailable,
  decodeEntities,
};
