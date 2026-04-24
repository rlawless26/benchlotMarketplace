/**
 * eBay Browse API ingestion adapter.
 *
 * Targets eBay's public Buy Browse API at app-level (Client Credentials
 * grant). We sweep a single curated category (13870 = "Carpentry,
 * Woodworking" under Collectibles > Antiques > Tools), sorted by newest
 * listing, capped at a politeness ceiling (default 2000). Category 13870
 * gives ~242k active items split across well-curated leaves: Planes,
 * Chisels, Saws, Drills, Hammers, Screwdrivers, Rules/Tapes, Squares,
 * Gauges, Vises/Clamps, Levels. Roughly 99% are woodworking-relevant.
 *
 * Power tools (category 3247) are intentionally out of scope for v1. That
 * tree is dominated by automotive / Milwaukee-impact / grinder listings
 * with very low woodworking signal; targeting it needs brand-specific
 * queries (Festool, Powermatic, etc.) and is a follow-up.
 *
 * PII hygiene — Marketplace Account Deletion exemption commitment:
 *   We do NOT store seller usernames, feedback scores, or any
 *   buyer/seller-identifiable fields in externalListings OR in the raw
 *   collection. Approved listing fields only: id, title, description,
 *   price, image URLs, category, listing URL, posted_at, condition.
 *
 * OAuth — Client Credentials grant, 2h TTL. We mint on demand and cache
 * in memory for the process lifetime. Never persist the token to
 * Firestore or disk (Rob's directive).
 *
 * Expiry — unlike forum/dealer sources we do NOT run markExpired here.
 * We sample the ~2000 most-recent items out of a 242k universe; any item
 * missing from today's sample has simply rotated off the newlyListed
 * window, it hasn't sold. A TTL-based cleanup (expire items unseen for
 * >30 days) is the right long-term answer but is out of scope for v1.
 */

const axios = require('axios');
const admin = require('firebase-admin');

const { upsertListings } = require('./externalListings');
const { extractBrand, extractType } = require('./heuristics');

const SOURCE = 'ebay';
const RAW_FORMAT = 'ebay_item_summary';

const API_ORIGIN = 'https://api.ebay.com';
const OAUTH_URL = `${API_ORIGIN}/identity/v1/oauth2/token`;
const SEARCH_URL = `${API_ORIGIN}/buy/browse/v1/item_summary/search`;
const MARKETPLACE = 'EBAY_US';

// Category 13870 = Collectibles > Antiques > Tools > Carpentry, Woodworking.
// Verified 2026-04-24 via live probe: 242k active items, leaf distribution
// dominated by Planes (26%), Rules/Tapes (17%), Hammers/Axes (16%), Drills
// (7%), Chisels (6%), Saws (6%), Screwdrivers (6%), Vises/Clamps (5%).
const TARGET_CATEGORY_IDS = ['13870'];

const PAGE_SIZE = 200;                // Browse API hard cap per request
const DEFAULT_MAX_ITEMS = 2000;       // Initial politeness ceiling
const REQUEST_DELAY_MS = 500;         // Delay between paginated API calls
const REQUEST_TIMEOUT_MS = 30000;

// Token cache — process-local only. Never persisted.
let tokenCache = null; // { token: string, expiresAt: number }

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// OAuth — app-level Client Credentials grant
// ---------------------------------------------------------------------------

/**
 * Mint or return a cached app-level OAuth token. Refreshes 5 minutes
 * before the cached token's expiry to avoid mid-request expiry.
 */
async function getAppToken({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && tokenCache && tokenCache.expiresAt - 5 * 60 * 1000 > now) {
    return tokenCache.token;
  }
  const id = process.env.EBAY_APP_ID;
  const sec = process.env.EBAY_CERT_ID;
  if (!id || !sec) {
    throw new Error('[ebay] EBAY_APP_ID / EBAY_CERT_ID missing from environment');
  }
  const basic = Buffer.from(`${id}:${sec}`).toString('base64');
  const resp = await axios.post(
    OAUTH_URL,
    'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    {
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: REQUEST_TIMEOUT_MS,
    }
  );
  const { access_token: token, expires_in: expiresIn } = resp.data || {};
  if (!token) {
    throw new Error(`[ebay] OAuth token mint failed: ${JSON.stringify(resp.data)}`);
  }
  tokenCache = { token, expiresAt: now + Number(expiresIn || 7200) * 1000 };
  return token;
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

async function fetchSearchPage({ categoryIds, offset, limit, token }) {
  const params = new URLSearchParams({
    category_ids: categoryIds.join(','),
    sort: 'newlyListed',
    offset: String(offset),
    limit: String(limit),
  });
  const url = `${SEARCH_URL}?${params.toString()}`;
  const resp = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE,
    },
    timeout: REQUEST_TIMEOUT_MS,
  });
  return resp.data;
}

// ---------------------------------------------------------------------------
// Record shaping
// ---------------------------------------------------------------------------

function parsePostedAt(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return admin.firestore.Timestamp.fromDate(d);
}

function priceToCents(priceObj) {
  if (!priceObj || priceObj.value == null) return null;
  const n = Number(priceObj.value);
  if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) return null;
  return Math.round(n * 100);
}

/**
 * Collect unique image URLs. eBay returns three image fields with
 * counter-intuitive sizes:
 *   - `image.imageUrl` → usually s-l225 (225px thumbnail)
 *   - `thumbnailImages[0]` → often s-l1600 (large hero), despite the name
 *   - `additionalImages[]` → 225px thumbs of the remaining photos
 * Hero first, prefer the larger of the two top-of-gallery images.
 */
function extractImages(item) {
  const out = [];
  const seen = new Set();
  const push = (url) => {
    if (!url || typeof url !== 'string') return;
    if (seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };
  if (item.thumbnailImages && item.thumbnailImages[0]?.imageUrl) {
    push(item.thumbnailImages[0].imageUrl);
  }
  if (item.image?.imageUrl) push(item.image.imageUrl);
  for (const extra of item.additionalImages || []) {
    if (extra?.imageUrl) push(extra.imageUrl);
  }
  return out;
}

/**
 * Shape a single Browse-API item_summary into our `{ listing, raw, raw_format }`
 * envelope. Returns null for items we can't usefully ingest (missing id,
 * empty title). Strips seller block from the raw payload as part of the
 * Marketplace Account Deletion exemption commitment.
 */
function toRecord(item) {
  if (!item) return null;
  const legacyId = item.legacyItemId || (item.itemId || '').split('|')[1] || null;
  if (!legacyId) return null;
  const title = (item.title || '').trim();
  if (!title) return null;

  const priceCents = priceToCents(item.price);
  const currency = item.price?.currency || 'USD';
  const postedAt = parsePostedAt(item.itemCreationDate);
  const images = extractImages(item);
  const leafCategoryId = item.leafCategoryIds?.[0] || null;
  const leafCategoryName =
    (item.categories || []).find((c) => c.categoryId === leafCategoryId)?.categoryName || null;

  const tags = [];
  if (leafCategoryId) tags.push(`ebay_leaf:${leafCategoryId}`);
  if (leafCategoryName) tags.push(`ebay_leaf_name:${leafCategoryName.toLowerCase()}`);
  if (item.condition) tags.push(`ebay_condition:${item.condition.toLowerCase()}`);

  const listing = {
    source: SOURCE,
    source_id: String(legacyId),
    source_url: item.itemWebUrl || `https://www.ebay.com/itm/${legacyId}`,
    title_raw: title,
    description_raw: null, // Browse API summaries don't include descriptions
    price_cents: priceCents,
    currency,
    condition_raw: item.condition || null,
    images,
    posted_at: postedAt,
    tags,
    heuristic_brand: extractBrand(title),
    heuristic_type: extractType(title),
    canonical_brand: null,
    canonical_type: null,
    canonical_model: null,
    canonical_size: null,
    era_estimate: null,
  };

  // PII-scrubbed raw payload. `seller` is the only top-level field the
  // Browse API exposes that carries user-identifiable data (username,
  // feedbackScore, feedbackPercentage); strip it by destructuring.
  const { seller: _sellerDrop, ...restItem } = item;
  const raw = {
    item_id: item.itemId,
    legacy_item_id: legacyId,
    leaf_category_id: leafCategoryId,
    leaf_category_name: leafCategoryName,
    summary: restItem,
  };

  return { listing, raw, raw_format: RAW_FORMAT };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Paginate the Browse API for TARGET_CATEGORY_IDS and return up to
 * `maxItems` normalized records. Dedupes by source_id as a safety net
 * (paginated sweeps shouldn't produce duplicates, but items can shift
 * between pages if updated mid-scrape).
 *
 * @param {object} [opts]
 * @param {number} [opts.maxItems] — cap on records returned
 * @returns {Promise<{records: object[], totalAvailable: number, pages: number}>}
 */
async function scrapeAll(opts = {}) {
  const { maxItems = DEFAULT_MAX_ITEMS } = opts;

  const token = await getAppToken();
  const records = [];
  const seenIds = new Set();

  let offset = 0;
  let pages = 0;
  let totalAvailable = null;

  while (records.length < maxItems) {
    if (pages > 0) await sleep(REQUEST_DELAY_MS);
    pages += 1;

    const remaining = maxItems - records.length;
    const limit = Math.min(PAGE_SIZE, remaining);
    let page;
    try {
      page = await fetchSearchPage({
        categoryIds: TARGET_CATEGORY_IDS,
        offset,
        limit,
        token,
      });
    } catch (err) {
      console.error(`[ebay] search page fetch failed at offset=${offset}: ${err.message}`);
      break;
    }

    if (totalAvailable === null) totalAvailable = page.total ?? 0;
    const items = page.itemSummaries || [];
    if (items.length === 0) break;

    for (const item of items) {
      const rec = toRecord(item);
      if (!rec) continue;
      if (seenIds.has(rec.listing.source_id)) continue;
      seenIds.add(rec.listing.source_id);
      records.push(rec);
      if (records.length >= maxItems) break;
    }

    offset += items.length;
    if (items.length < limit) break; // Source exhausted before cap
  }

  return { records, totalAvailable: totalAvailable || 0, pages };
}

/**
 * Full ingestion run: paginate Browse API → upsert into externalListings.
 * No markExpired (see file-header note on expiry).
 */
async function runIngestion(opts = {}) {
  const runStartedAt = admin.firestore.Timestamp.now();
  const t0 = Date.now();

  const { records, totalAvailable, pages } = await scrapeAll(opts);
  const upsertSummary = await upsertListings(records, runStartedAt);

  return {
    source: SOURCE,
    scraped: records.length,
    total_available: totalAvailable,
    pages,
    inserted: upsertSummary.inserted,
    updated: upsertSummary.updated,
    durationMs: Date.now() - t0,
    runStartedAt: runStartedAt.toDate(),
  };
}

module.exports = {
  SOURCE,
  RAW_FORMAT,
  TARGET_CATEGORY_IDS,
  DEFAULT_MAX_ITEMS,
  runIngestion,
  scrapeAll,
  getAppToken,
  fetchSearchPage,
  toRecord,
  priceToCents,
  extractImages,
  // Exposed for tests / runners that want to force a fresh token.
  _resetTokenCache: () => { tokenCache = null; },
};
