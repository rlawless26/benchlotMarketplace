/**
 * Ted Dawson Antique Tools ingestion adapter.
 *
 * Shopify storefront with an open products.json — same mechanism as the Jim
 * Bode adapters, but this catalog is BOTH halves in one endpoint: ~1k
 * available items (active inventory) and ~3k unavailable ones Ted leaves
 * published as a de-facto sold archive. We ingest both:
 *
 *   - variants[0].available === true  -> status 'active'
 *   - otherwise                       -> status 'sold'
 *
 * The sold half is the real prize — dealer sold comps with real prices, like
 * jimbode_valueguide. Per that adapter's convention, `sold_at` is DELIBERATELY
 * null: Shopify's updated_at reflects the last edit, not the sale, and a fake
 * date is worse than none. See jimbode-valueguide.js header for the full
 * rationale.
 *
 * An active item that later flips to available:false is re-seen on the next
 * run and upserted as status 'sold' — a direct observation, better than the
 * markExpired inference. markExpired still runs for items that vanish from
 * the catalog entirely.
 *
 * Location: Toronto, ON (27 Webb Ave). location_state stays null — it takes
 * US state codes — and location_display carries the city. Prices are USD
 * despite the Canadian address: og:price:currency on product pages says USD
 * (verified 2026-09-01), which fits a dealer selling into the US collector
 * market.
 *
 * Catalog was 3,927 products over 16 pages at 250/page on 2026-09-01 — far
 * below Shopify's 25k storefront pagination cap.
 */

const axios = require('axios');
const admin = require('firebase-admin');

const { upsertListings, markExpired } = require('./externalListings');
const { extractBrand, extractType } = require('./heuristics');

const SOURCE = 'teddawson';
const RAW_FORMAT = 'shopify_product';
const BASE_URL = 'https://teddawsonantiquetools.com/products.json';
const STORE_ORIGIN = 'https://teddawsonantiquetools.com';
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
 * Available = Shopify's stock flag on the first variant, with the same
 * belt-and-suspenders markers the Jim Bode adapter uses for items the dealer
 * hasn't flipped in inventory yet.
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
 * Map one Shopify product to an ingestion record. Unlike the Jim Bode live
 * adapter, unavailable products are NOT dropped — they become sold comps.
 */
function toRecord(product) {
  const handle = product.handle;
  if (!handle) return null; // defensive — every Shopify product has one

  const title = product.title || '';
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const price_cents = variants.length ? parsePriceToCents(variants[0].price) : null;
  const active = isAvailable(product);

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
    location_state: null, // Toronto, ON — not a US state
    location_display: 'Toronto, ON',
    // Caller-asserted status: sold items stay in Ted's catalog as
    // available:false, so the scrape observes the transition directly.
    status: active ? 'active' : 'sold',
    // Null on purpose for sold items — see header. The store layer preserves
    // an existing sold_at over our null via COALESCE.
    sold_at: null,
  };

  return {
    listing,
    raw: product,
    raw_format: RAW_FORMAT,
  };
}

/** Fetch one page. Same 25k-cap handling as the Jim Bode adapter. */
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
      console.warn(`[teddawson] hit Shopify 25k storefront cap at page ${page} — stopping pagination`);
      return [];
    }
    throw err;
  }
}

/**
 * Scrape the whole catalog. Stops on an empty page.
 *
 * @param {object} [opts]
 * @param {number} [opts.maxPages] — upper bound for smoke tests
 */
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
      console.error(`[teddawson] page ${page} failed: ${err.message}`);
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

/** Scrape → upsert → expire-sweep. Same contract as every other adapter. */
async function runIngestion(opts = {}) {
  const runStartedAt = admin.firestore.Timestamp.now();
  const t0 = Date.now();

  const records = await scrapeAll(opts);
  const active = records.filter((r) => r.listing.status === 'active').length;
  const upsertSummary = await upsertListings(records, runStartedAt);
  const expireSummary = await markExpired(SOURCE, runStartedAt);

  return {
    source: SOURCE,
    scraped: records.length,
    active,
    sold: records.length - active,
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
