/**
 * OldTools.com ingestion adapter.
 *
 * Custom WordPress storefront (not Shopify, not WooCommerce) that publishes
 * a sitemap index of every active item. The catalog is small and slow-moving
 * (~200 items as of 2026-05; sitemap lastmods range back to 2018), so the
 * scrape strategy is straightforward:
 *
 *   1. Fetch `/shop/sitemap/sitemap-items-1.xml`, pull `<loc>` URLs.
 *   2. For each item URL, fetch the HTML and parse Schema.org Product
 *      microdata (`itemprop="name"`, `itemprop="price"`, etc.).
 *   3. Skip items with no real price (a 0.00 placeholder is hard-coded on
 *      every page; the canonical Offer price appears as a second
 *      `itemprop="price"` later in the document).
 *   4. Standard `markExpired` flips items whose URLs drop from the sitemap.
 *
 * `itemprop="brand"` is the seller's storefront brand ("Falcon-Wood"),
 * NOT the tool brand — we ignore it and let `extractBrand` work the title.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');

const { upsertListings, markExpired } = require('./externalListings');
const { extractBrand, extractType } = require('./heuristics');

const SOURCE = 'oldtools';
const RAW_FORMAT = 'oldtools_item';
const STORE_ORIGIN = 'https://www.oldtools.com';
const SITEMAP_URL = `${STORE_ORIGIN}/shop/sitemap/sitemap-items-1.xml`;
const ITEM_DELAY_MS = 500;
const REQUEST_TIMEOUT_MS = 20000;
const MAX_DESCRIPTION_CHARS = 5000;
const USER_AGENT = 'Mozilla/5.0 (compatible; BenchlotIngestion/1.0; +https://benchlot.com)';

const http = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml',
  },
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Sitemap URLs end in `/item/<slug-with-trailing-id>`. The trailing id is
// stable across renames, but using the full slug keeps the docId
// human-readable and matches the Rouillard convention.
function extractSlug(url) {
  const m = String(url || '').match(/\/item\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function fetchSitemapUrls() {
  const resp = await http.get(SITEMAP_URL);
  const xml = typeof resp.data === 'string' ? resp.data : '';
  if (!xml) throw new Error('[oldtools] empty sitemap response');
  const $ = cheerio.load(xml, { xmlMode: true });
  const urls = [];
  $('url > loc').each((_, el) => {
    const u = $(el).text().trim();
    if (u && /\/item\//.test(u)) urls.push(u);
  });
  return urls;
}

// `itemprop="price" content="0.00"` is rendered on every page as a
// placeholder, followed later by the real Offer price. Take the maximum of
// all parsed prices — handles both the placeholder case and any future
// page that drops the placeholder.
function parsePriceCents($) {
  const candidates = [];
  $('[itemprop="price"]').each((_, el) => {
    const raw = $(el).attr('content') ?? $(el).text();
    const n = Number(String(raw || '').trim());
    if (Number.isFinite(n) && n > 0) candidates.push(n);
  });
  if (candidates.length === 0) return null;
  return Math.round(Math.max(...candidates) * 100);
}

function parseImages($) {
  const seen = new Set();
  const out = [];
  const push = (src) => {
    if (typeof src !== 'string') return;
    const trimmed = src.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push(trimmed);
  };

  // Prefer the og:image (full-size) over the itemprop="image" thumbnail
  // (`_th` suffix on oldtools.com — significantly worse for the card hero).
  const og = $('meta[property="og:image"]').attr('content');
  if (og) push(og);
  $('[itemprop="image"]').each((_, el) => {
    push($(el).attr('content') || $(el).attr('src'));
  });
  return out;
}

function parseDescription($) {
  const raw = $('[itemprop="description"]').attr('content')
    || $('[itemprop="description"]').first().text();
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_DESCRIPTION_CHARS);
}

function parseTitle($) {
  // Two reasonable sources — the visible h1 and the microdata `name`. The
  // h1 is usually cleaner; fall through if it's missing for any reason.
  const h1 = $('h1.itemName').first().text().trim();
  if (h1) return h1;
  const meta = $('[itemprop="name"]').attr('content') || $('[itemprop="name"]').first().text();
  return (meta || '').trim();
}

function parseCurrency($) {
  const cur = $('[itemprop="priceCurrency"]').first().attr('content');
  return (cur || '').trim() || 'USD';
}

function buildRecord(url, html) {
  const slug = extractSlug(url);
  if (!slug) return null;

  const $ = cheerio.load(html);
  const title = parseTitle($);
  if (!title) return null;

  const price_cents = parsePriceCents($);
  if (price_cents === null) return null; // sold / unpriced — skip

  const listing = {
    source: SOURCE,
    source_id: slug,
    source_url: url,
    title_raw: title,
    description_raw: parseDescription($),
    price_cents,
    currency: parseCurrency($),
    condition_raw: null,
    images: parseImages($),
    posted_at: null, // oldtools doesn't expose a per-item posted-at
    tags: [],
    heuristic_brand: extractBrand(title),
    heuristic_type: extractType(title),
    canonical_brand: null,
    canonical_type: null,
    canonical_model: null,
    canonical_size: null,
    era_estimate: null,
  };

  // Preserve a compact raw payload for re-normalization. Storing the full
  // 150KB HTML page would balloon Firestore — pull just the structured
  // bits that the normalizer needs.
  const raw = {
    url,
    title,
    description_raw: listing.description_raw,
    price_cents,
    currency: listing.currency,
    images: listing.images,
    sku: $('[itemprop="sku"]').first().attr('content') || null,
    mpn: $('[itemprop="mpn"]').first().attr('content') || null,
    productID: $('[itemprop="productID"]').first().attr('content') || null,
  };

  return { listing, raw, raw_format: RAW_FORMAT };
}

async function fetchItem(url) {
  const resp = await http.get(url);
  const html = typeof resp.data === 'string' ? resp.data : '';
  if (!html) throw new Error(`[oldtools] empty item response for ${url}`);
  return html;
}

async function scrapeAll(opts = {}) {
  const maxItems = opts.maxItems ?? Infinity;
  const urls = await fetchSitemapUrls();
  if (urls.length === 0) {
    console.warn('[oldtools] sitemap returned 0 item URLs — nothing to scrape');
    return [];
  }
  const records = [];
  const limit = Math.min(urls.length, maxItems);
  for (let i = 0; i < limit; i++) {
    if (i > 0) await sleep(ITEM_DELAY_MS);
    const url = urls[i];
    try {
      const html = await fetchItem(url);
      const rec = buildRecord(url, html);
      if (rec) records.push(rec);
    } catch (err) {
      console.warn(`[oldtools] item ${url} failed: ${err.message}`);
    }
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
  buildRecord,
  fetchSitemapUrls,
};
