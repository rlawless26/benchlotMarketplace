/**
 * Hyperkitten Tool Company ingestion adapter.
 *
 * Hyperkitten publishes their entire live inventory as a single server-rendered
 * HTML page at /store/index.php. No pagination, no per-item detail pages, no
 * API. We fetch the page once per run, parse `.store-item` blocks with cheerio,
 * map to the `externalListings` schema (see SCHEMA.md), upsert, and flip unseen
 * listings to `expired`.
 *
 * Sold items are removed from the HTML entirely by the dealer — which means
 * the existing markExpired() sweep handles availability transparently. Any
 * `.store-item` present in the HTML is for-sale by definition.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');

const { upsertListings, markExpired } = require('./externalListings');
const { extractBrand, extractType } = require('./heuristics');

const SOURCE = 'hyperkitten';
const RAW_FORMAT = 'hyperkitten_item';
const STORE_ORIGIN = 'https://www.hyperkitten.com';
const STORE_URL = `${STORE_ORIGIN}/store/index.php`;
const REQUEST_TIMEOUT_MS = 30000;
const USER_AGENT = 'Mozilla/5.0 (compatible; BenchlotIngestion/1.0; +https://benchlot.com)';

// Hyperkitten's books category (data-tool_type="B") is reference literature,
// not tools. Benchlot surfaces tools; skip books at parse time.
const SKIPPED_TOOL_TYPES = new Set(['B']);

const http = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml',
  },
});

/**
 * Fetch the full store HTML. Single GET — no pagination.
 * Returns the raw HTML string.
 */
async function fetchStorePage() {
  const resp = await http.get(STORE_URL);
  if (typeof resp.data !== 'string' || resp.data.length < 1000) {
    throw new Error(`[hyperkitten] unexpected response (${typeof resp.data}, ${resp.data?.length ?? 0} bytes)`);
  }
  return resp.data;
}

/**
 * Parse `$35` / `$1,250` / `$1,250.00` style price strings to integer cents.
 * Returns null on anything that doesn't look like a number (e.g. "Call for price").
 */
function parsePriceToCents(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[$,\s]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function absoluteImageUrl(src) {
  if (!src || typeof src !== 'string') return null;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('/')) return `${STORE_ORIGIN}${src}`;
  return `${STORE_ORIGIN}/${src}`;
}

/**
 * Map one cheerio-wrapped `.store-item` element to an ingestion record.
 *
 * Returns `null` for items we can't identify (missing item number) OR for
 * categories we skip at ingestion (books).
 */
function toRecord($, el) {
  const $item = $(el);

  const toolType = ($item.attr('data-tool_type') || '').trim();
  if (SKIPPED_TOOL_TYPES.has(toolType)) return null;

  // Item number lives inside `<p class="item-number"><strong>Item Number:</strong> C8270 <span class="price">$35</span></p>`.
  // Extract by cloning, removing the price span, and matching the leftover text.
  const $itemNumberEl = $item.find('.item-number').first();
  if ($itemNumberEl.length === 0) return null;
  const priceText = $itemNumberEl.find('.price').first().text().trim();

  const itemNumberClone = $itemNumberEl.clone();
  itemNumberClone.find('.price').remove();
  itemNumberClone.find('strong').remove();
  const itemNumber = itemNumberClone.text().trim();
  if (!itemNumber) return null;

  const title = $item.find('.item-title').first().text().trim();
  if (!title) return null;

  // Description is the inner HTML of the hidden <p> inside .item-desc.
  // Item number is NOT prepended — the normalizer would conflate it with a
  // model string (e.g. "M7307" → canonical_model). The item number lives in
  // source_id + source_url (visible to users in the URL bar on clickthrough).
  const descriptionHtml = $item.find('.item-desc p').first().html();

  // Full-size gallery images (not _thumb variants). data-src is Hyperkitten's
  // lazy-load attribute; fall back to src if a non-placeholder value is there.
  const images = [];
  $item.find('.photo-gallery .gallery-image').each((_, img) => {
    const $img = $(img);
    const candidate = $img.attr('data-src') || $img.attr('src');
    const abs = absoluteImageUrl(candidate);
    if (abs && !abs.startsWith('data:')) images.push(abs);
  });

  // Tags: encode the dealer's pre-classification as a tag so the normalizer
  // can read it as a hint (kept alongside heuristic_type/brand).
  const tags = [];
  if (toolType) tags.push(`hk_type:${toolType}`);
  if ($item.find('.new-badge').length > 0) tags.push('hk_new');

  // source_url: pre-filter by category (Hyperkitten's JS reads `?category=X`)
  // AND include the item number as a fragment. Users land on a small,
  // category-filtered list (~50-200 items) with the item number visible in
  // their URL bar for Ctrl-F. If Hyperkitten ever adds id attributes to
  // items, the fragment starts scrolling automatically.
  const sourceUrl = toolType
    ? `${STORE_ORIGIN}/store/index.php?category=${encodeURIComponent(toolType)}#${itemNumber}`
    : `${STORE_ORIGIN}/store/index.php#${itemNumber}`;

  const listing = {
    source: SOURCE,
    source_id: itemNumber,
    source_url: sourceUrl,
    title_raw: title,
    description_raw: descriptionHtml || null,
    price_cents: parsePriceToCents(priceText),
    currency: 'USD',
    condition_raw: null,
    images,
    posted_at: null, // Hyperkitten doesn't expose per-item timestamps
    tags,
    heuristic_brand: extractBrand(title),
    heuristic_type: extractType(title),
    canonical_brand: null,
    canonical_type: null,
    canonical_model: null,
    canonical_size: null,
    era_estimate: null,
    location_state: 'CT',
    location_display: null, // state-only on cards — dealers are named, no city
  };

  // Raw: preserve the original HTML of the .store-item block so a future
  // normalizer can re-parse without re-scraping. Also stash the parsed
  // attributes for debuggability.
  const raw = {
    item_number: itemNumber,
    tool_type: toolType,
    title_attr: $item.attr('data-title') || null,
    description_attr: $item.attr('data-description') || null,
    title: title,
    description_html: descriptionHtml || null,
    price_text: priceText || null,
    images,
    is_new: $item.find('.new-badge').length > 0,
    outer_html: $.html($item),
  };

  return { listing, raw, raw_format: RAW_FORMAT };
}

/**
 * Parse all `.store-item` blocks out of the given HTML.
 *
 * @param {string} html
 * @param {object} [opts]
 * @param {number} [opts.maxItems] — upper bound for smoke tests
 */
function parseItems(html, opts = {}) {
  const maxItems = opts.maxItems ?? Infinity;
  const $ = cheerio.load(html);
  const records = [];

  $('.store-item').each((_i, el) => {
    if (records.length >= maxItems) return false;
    const rec = toRecord($, el);
    if (rec) records.push(rec);
    return undefined;
  });

  return records;
}

/**
 * Fetch + parse. Returns records; no Firestore writes.
 *
 * @param {object} [opts]
 * @param {number} [opts.maxItems]
 */
async function scrapeAll(opts = {}) {
  const html = await fetchStorePage();
  return parseItems(html, opts);
}

/**
 * Orchestrates a full ingestion run: scrape → upsert → mark expired.
 *
 * @param {object} [opts]
 * @param {number} [opts.maxItems]
 * @returns {Promise<{source:string,scraped:number,inserted:number,updated:number,expired:number,durationMs:number,runStartedAt:Date}>}
 */
async function runIngestion(opts = {}) {
  const runStartedAt = admin.firestore.Timestamp.now();
  const t0 = Date.now();

  const records = await scrapeAll(opts);
  const upsertSummary = await upsertListings(records, runStartedAt);
  // Only run expiry sweep on full runs — capping via maxItems would falsely
  // expire everything past the cap.
  const shouldSweep = !opts.maxItems;
  const expireSummary = shouldSweep
    ? await markExpired(SOURCE, runStartedAt)
    : { expired: 0 };

  return {
    source: SOURCE,
    scraped: records.length,
    inserted: upsertSummary.inserted,
    updated: upsertSummary.updated,
    expired: expireSummary.expired,
    sweep_skipped: !shouldSweep,
    durationMs: Date.now() - t0,
    runStartedAt: runStartedAt.toDate(),
  };
}

module.exports = {
  SOURCE,
  RAW_FORMAT,
  runIngestion,
  scrapeAll,
  parseItems,
  toRecord,
  fetchStorePage,
};
