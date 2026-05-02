/**
 * Jim Bode Tools ingestion adapter.
 *
 * Jim Bode intentionally publishes the "Value Guide" collection as a public
 * reference via Shopify's products.json endpoint. We paginate through it,
 * map each product to the `externalListings` schema shape (see SCHEMA.md),
 * upsert, and flip unseen listings to `expired`.
 *
 * Pure HTTP + JSON — no HTML parsing, no headless browser. Safe to run on
 * Firebase Functions v2.
 */

const axios = require('axios');
const admin = require('firebase-admin');

const { upsertListings, markExpired } = require('./externalListings');
const { extractBrand, extractType } = require('./heuristics');

const SOURCE = 'jimbode';
const RAW_FORMAT = 'shopify_product';
// Jim Bode's live "What's New" catalog — currently-for-sale inventory. Mixes
// available + sold items; `variants[0].available` reliably discriminates.
// The separate `/collections/jim-bodes-value-guide-to-antique-tools` collection
// is his historical sold-price archive — useful for ToolScan's value-estimate
// repose in M4, NOT for the aggregator's active-search surface. When we wire
// that up, it goes under a distinct `jimbode_valueguide` source slug.
const BASE_URL = 'https://www.jimbodetools.com/collections/whats-new/products.json';
const STORE_ORIGIN = 'https://www.jimbodetools.com';
const PAGE_SIZE = 250;
const PAGE_DELAY_MS = 1500; // politeness
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

function parsePriceToCents(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function normalizeImages(imagesField) {
  if (!Array.isArray(imagesField)) return [];
  return imagesField
    .map((img) => (img && typeof img.src === 'string' ? img.src : null))
    .filter(Boolean);
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const out = [];
  for (const t of tags) {
    if (typeof t !== 'string') continue;
    const norm = t.trim().toLowerCase();
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
}

function parsePostedAt(shopifyDate) {
  if (!shopifyDate) return null;
  const d = new Date(shopifyDate);
  if (Number.isNaN(d.getTime())) return null;
  return admin.firestore.Timestamp.fromDate(d);
}

/**
 * Detect sold / unavailable products from the Shopify payload so we skip them
 * at ingestion time. The `/collections/whats-new` endpoint returns both
 * for-sale and already-sold items; without this filter, the aggregator would
 * surface listings users can't actually buy.
 *
 * Signals (any one is sufficient):
 *   - First variant's `available` is explicitly false. This is Shopify's
 *     canonical stock flag. Verified against Jim Bode's product pages:
 *     sold items render schema.org OutOfStock + a "Sold" disabled button;
 *     unsold items render InStock + "BUY NOW!".
 *   - Any tag matches /sold|reserved/i — covers manual sellers-added sold
 *     markers that Jim Bode hasn't flipped in Shopify inventory yet.
 *   - Title contains a SOLD / RESERVED marker — same belt-and-suspenders.
 *
 * A listing that becomes sold between scrapes is not re-seen during the
 * next scrape; the expire-sweep then flips its status from `active` to
 * `expired` and it drops out of search automatically.
 */
function isAvailable(product) {
  if (!product) return false;

  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length > 0 && variants[0].available === false) return false;

  const tags = Array.isArray(product.tags) ? product.tags : [];
  if (tags.some((t) => typeof t === 'string' && /\b(sold|reserved)\b/i.test(t))) {
    return false;
  }

  const title = product.title || '';
  if (/\b(sold|reserved)\b/i.test(title)) return false;

  return true;
}

/**
 * Map one Shopify product to an ingestion record: a mapped/searchable
 * `listing` plus the unmodified `raw` payload for future re-normalization.
 *
 * Returns `null` for products we can't identify (missing handle) OR for
 * products that are sold/unavailable — those are filtered at ingest.
 */
function toRecord(product) {
  const handle = product.handle;
  if (!handle) return null; // defensive — every Shopify product has one
  if (!isAvailable(product)) return null; // sold / unavailable — don't ingest

  const title = product.title || '';
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const price_cents = variants.length ? parsePriceToCents(variants[0].price) : null;

  const listing = {
    source: SOURCE,
    source_id: handle,
    source_url: `${STORE_ORIGIN}/products/${handle}`,
    title_raw: title,
    description_raw: product.body_html || null,
    price_cents,
    currency: 'USD',
    condition_raw: null,
    images: normalizeImages(product.images),
    posted_at: parsePostedAt(product.created_at),
    tags: normalizeTags(product.tags),
    heuristic_brand: extractBrand(title),
    heuristic_type: extractType(title),
    canonical_brand: null,
    canonical_type: null,
    canonical_model: null,
    canonical_size: null,
    era_estimate: null,
    location_state: 'NY',
    location_display: null, // state-only on cards — dealers are named, no city
  };

  // Preserve the full, untouched Shopify product object. A future v2
  // normalizer can read from externalListingsRaw and re-derive listing
  // fields without re-scraping. Storage cost at 25k × ~8KB = ~200MB total,
  // well inside Firestore's free tier.
  return {
    listing,
    raw: product,
    raw_format: RAW_FORMAT,
  };
}

/**
 * Fetch one page of products. Returns the array (possibly empty).
 *
 * Shopify's unauthenticated storefront products.json endpoint caps pagination
 * at `page * limit <= 25000`. Past that, it returns HTTP 400 with the body
 * `{ errors: "Page * Limit exceeds the 25000 limit." }`. We treat that
 * specific error as normal end-of-pagination rather than a fatal failure.
 * At the current PAGE_SIZE of 250 that ceiling is 25,000 products — large
 * enough for the Value Guide today. If Jim Bode's catalog grows past that,
 * we'll need a secondary walk strategy (filter-by-tag or shard by type).
 */
async function fetchPage(page) {
  const url = `${BASE_URL}?limit=${PAGE_SIZE}&page=${page}`;
  try {
    const resp = await http.get(url);
    const products = Array.isArray(resp.data?.products) ? resp.data.products : [];
    return products;
  } catch (err) {
    const status = err.response?.status;
    const errorPayload = err.response?.data?.errors;
    const hitCap = status === 400
      && typeof errorPayload === 'string'
      && errorPayload.includes('25000 limit');
    if (hitCap) {
      console.warn(`[jimbode] hit Shopify 25k storefront cap at page ${page} — stopping pagination`);
      return [];
    }
    throw err;
  }
}

/**
 * Scrape the full Value Guide collection into an in-memory array. Stops when
 * a page returns zero products.
 *
 * @param {object} [opts]
 * @param {number} [opts.maxPages] — upper bound for smoke tests
 * @returns {Promise<Array<{listing:object,raw:object,raw_format:string}>>}
 */
async function scrapeAll(opts = {}) {
  const maxPages = opts.maxPages ?? Infinity;
  const records = [];
  let page = 1;

  /* eslint-disable no-constant-condition */
  while (page <= maxPages) {
    if (page > 1) await sleep(PAGE_DELAY_MS);
    let products;
    try {
      products = await fetchPage(page);
    } catch (err) {
      console.error(`[jimbode] page ${page} failed: ${err.message}`);
      // Abort rather than continue — a partial run might mislabel still-live
      // listings as expired. Better to fail loud.
      throw err;
    }
    if (products.length === 0) break;

    for (const product of products) {
      const rec = toRecord(product);
      if (rec) records.push(rec);
    }
    page += 1;
  }

  return records;
}

/**
 * Orchestrates a full ingestion run: scrape → upsert → mark expired.
 * Returns a summary suitable for logging or metrics.
 *
 * @param {object} [opts]
 * @param {number} [opts.maxPages]
 * @returns {Promise<{source:string,scraped:number,inserted:number,updated:number,expired:number,durationMs:number,runStartedAt:Date}>}
 */
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
};
