/**
 * Jim Bode Tools — Value Guide ingestion adapter.
 *
 * Jim Bode publishes a curated archive of his sold inventory at
 * `/collections/jim-bodes-value-guide-to-antique-tools`. Each item has the
 * historical sold price stamped on it. This is the sold-comp data that
 * grounds Benchlot's price-guide indicators in actual transactions rather
 * than asking-price noise.
 *
 * Important differences from the live `jimbode.js` adapter:
 *   - Every item in the Value Guide is sold. We do NOT filter on
 *     `variants[0].available` — we want to ingest all of them.
 *   - Records are stamped `status: 'sold'` (terminal state) at upsert.
 *   - We do NOT call `markExpired` on this source. Sold is terminal; if
 *     Jim ever trims an item from the Guide, the price-comp data stays
 *     valuable.
 *   - `sold_at` is populated from Shopify's `updated_at` (the closest
 *     proxy for "when it moved to the Value Guide"), falling back to
 *     `first_seen_at` at write time when the field is missing.
 *
 * The `externalListings` schema's `status` field is extended to accept
 * 'sold' alongside 'active' and 'expired'. See SCHEMA.md.
 *
 * Pure HTTP + JSON. Safe to run on Firebase Functions v2.
 */

const axios = require('axios');
const admin = require('firebase-admin');

const { upsertListings } = require('./externalListings');
const { extractBrand, extractType } = require('./heuristics');

const SOURCE = 'jimbode_valueguide';
const RAW_FORMAT = 'shopify_product';
const BASE_URL = 'https://www.jimbodetools.com/collections/jim-bodes-value-guide-to-antique-tools/products.json';
const STORE_ORIGIN = 'https://www.jimbodetools.com';
const PAGE_SIZE = 250;
const PAGE_DELAY_MS = 1500; // politeness — same as live jimbode adapter
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

function parseShopifyTimestamp(shopifyDate) {
  if (!shopifyDate) return null;
  const d = new Date(shopifyDate);
  if (Number.isNaN(d.getTime())) return null;
  return admin.firestore.Timestamp.fromDate(d);
}

/**
 * Map one Shopify product from the Value Guide to an ingestion record.
 * Unlike the live catalog adapter, every item here is treated as sold —
 * no availability filter.
 */
function toRecord(product) {
  const handle = product.handle;
  if (!handle) return null;

  const title = product.title || '';
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const price_cents = variants.length ? parsePriceToCents(variants[0].price) : null;

  // sold_at: Shopify's `updated_at` is the moment Jim moved the product to
  // the Value Guide (or last touched it after that). Closest signal we have
  // for "when sold." Falls back to null; the upsert path will leave it null
  // and the build job tolerates that.
  const sold_at = parseShopifyTimestamp(product.updated_at);

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
    posted_at: parseShopifyTimestamp(product.created_at),
    tags: normalizeTags(product.tags),
    heuristic_brand: extractBrand(title),
    heuristic_type: extractType(title),
    canonical_brand: null,
    canonical_type: null,
    canonical_model: null,
    canonical_size: null,
    era_estimate: null,
    location_state: 'NY',
    location_display: null,
    // Caller-asserted terminal status — honored by upsertListings unless the
    // non-tool classifier flips this row to 'excluded_non_tool'.
    status: 'sold',
    sold_at,
  };

  return {
    listing,
    raw: product,
    raw_format: RAW_FORMAT,
  };
}

/**
 * Fetch one page of Value Guide products. Same Shopify-storefront pagination
 * mechanics as the live jimbode adapter — including the 25k pagination
 * ceiling, which we treat as normal end-of-pagination.
 */
async function fetchPage(page) {
  const url = `${BASE_URL}?limit=${PAGE_SIZE}&page=${page}`;
  try {
    const resp = await http.get(url);
    if (!resp.data || !Array.isArray(resp.data.products)) {
      console.warn(`[jimbode-valueguide] page ${page}: unexpected response shape — bailing`);
      return [];
    }
    return resp.data.products;
  } catch (err) {
    const status = err.response?.status;
    const errorPayload = err.response?.data?.errors;
    const hitCap = status === 400
      && typeof errorPayload === 'string'
      && errorPayload.includes('25000 limit');
    if (hitCap) {
      console.warn(`[jimbode-valueguide] hit Shopify 25k storefront cap at page ${page} — stopping pagination`);
      return [];
    }
    throw err;
  }
}

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
      console.error(`[jimbode-valueguide] page ${page} failed: ${err.message}`);
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
 * Orchestrates a full ingestion run. NO markExpired — sold is terminal.
 *
 * @param {object} [opts]
 * @param {number} [opts.maxPages]
 * @returns {Promise<{source:string,scraped:number,inserted:number,updated:number,durationMs:number,runStartedAt:Date}>}
 */
async function runIngestion(opts = {}) {
  const runStartedAt = admin.firestore.Timestamp.now();
  const t0 = Date.now();

  const records = await scrapeAll(opts);
  const upsertSummary = await upsertListings(records, runStartedAt);

  return {
    source: SOURCE,
    scraped: records.length,
    inserted: upsertSummary.inserted,
    updated: upsertSummary.updated,
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
};
