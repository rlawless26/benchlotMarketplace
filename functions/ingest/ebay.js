/**
 * eBay Browse API ingestion adapter.
 *
 * Targets eBay's public Buy Browse API at app-level (Client Credentials
 * grant). We sweep a set of curated SEARCH_BUCKETS and merge into a
 * single deduplicated record stream. Two classes of bucket:
 *
 *   1. Category sweep — `category_ids=13870` (Collectibles > Antiques >
 *      Tools > Carpentry, Woodworking) captures ~242k vintage hand-tool
 *      listings with ~99% woodworking-relevant signal.
 *   2. Brand queries — high-end woodworking power-tool and precision
 *      brands (Festool, Woodpeckers, Laguna, Powermatic, SawStop,
 *      Mafell, Bridge City, Shaper Origin, Delta Rockwell, Oneway, Jet,
 *      Felder, Harvey, Grizzly, Incra, JessEm, Shopsmith, MiniMax).
 *      Some brand names are ambiguous (e.g. "woodpeckers" matches 69k
 *      Woody Woodpecker VHS tapes without a category filter) so each
 *      bucket is tuned via probes; see comments on individual buckets.
 *
 * Scope note — v1 covers premium / woodworking-specific brands, not
 * commodity power tools (Milwaukee, DeWalt, Makita). Those dominate
 * category 3247 Power Tools but are overwhelmingly non-woodworking
 * (impact drivers, automotive, grinders).
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
 * We sample the ~N most-recent items per bucket out of much larger
 * universes; any item missing from today's sample has rotated off the
 * newlyListed window, it hasn't sold. A TTL-based cleanup (expire
 * items unseen for >30 days) is the right long-term answer but is out
 * of scope for v1.
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

const PAGE_SIZE = 200;                // Browse API hard cap per request
const DEFAULT_MAX_ITEMS = 6500;       // Global politeness ceiling; sum of per-bucket maxItems ≈ 6065 + headroom
const REQUEST_DELAY_MS = 500;         // Delay between paginated API calls
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Search buckets. Each bucket drives a separate paginated Browse API
 * sweep; records are merged into a single dedup'd stream. Per-bucket
 * `maxItems` caps keep any single bucket from dominating; the global
 * `maxItems` passed to scrapeAll is a hard total ceiling on top.
 *
 * Query tuning rules (from 2026-04-24 live probes):
 *   - Use `q` alone when the brand name is unambiguous (Festool, SawStop,
 *     Mafell, Laguna Tools, Bridge City Tool Works, Delta Rockwell,
 *     Oneway Lathe, Shaper Origin, Incra, JessEm, Shopsmith).
 *   - Add `category_ids: '631'` (Tools & Workshop Equipment) for
 *     brand names that match non-tool noise without a filter
 *     (Woodpeckers → 69k Woody Woodpecker VHS tapes;
 *     Powermatic → Tissot watches; Felder → author's books; Harvey →
 *     books by author Harvey Green; Grizzly → bears).
 *   - Use `category_ids: '3247'` (Power Tools) for Jet (avoids Jet
 *     Airlines books, jet fuel, etc.).
 *   - For MiniMax add a descriptive suffix ("minimax woodworking") since
 *     "MiniMax" matches textbooks and weather thermometers.
 */
const SEARCH_BUCKETS = [
  // Vintage hand tools — category sweep (no q)
  {
    label: 'vintage-carpentry',
    params: { category_ids: '13870' },
    maxItems: 2000,
  },
  // High-end power-tool and precision brands
  { label: 'festool',        params: { q: 'festool' },                               maxItems: 250 },
  { label: 'woodpeckers',    params: { q: 'woodpeckers', category_ids: '631' },      maxItems: 200 },
  { label: 'laguna-tools',   params: { q: 'laguna tools' },                          maxItems: 150 },
  { label: 'sawstop',        params: { q: 'sawstop' },                               maxItems: 150 },
  { label: 'powermatic',     params: { q: 'powermatic', category_ids: '631' },       maxItems: 250 },
  { label: 'mafell',         params: { q: 'mafell' },                                maxItems: 80 },
  { label: 'bridge-city',    params: { q: 'bridge city tool works' },                maxItems: 150 },
  { label: 'shaper-origin',  params: { q: 'shaper origin' },                         maxItems: 20 },
  { label: 'delta-rockwell', params: { q: 'delta rockwell' },                        maxItems: 300 },
  { label: 'oneway-lathe',   params: { q: 'oneway lathe' },                          maxItems: 150 },
  { label: 'jet-power',      params: { q: 'jet', category_ids: '3247' },             maxItems: 250 },
  { label: 'felder',         params: { q: 'felder', category_ids: '631' },           maxItems: 95 },
  { label: 'harvey-tools',   params: { q: 'harvey', category_ids: '631' },           maxItems: 40 },
  { label: 'grizzly-tools',  params: { q: 'grizzly', category_ids: '631' },          maxItems: 250 },
  { label: 'incra',          params: { q: 'incra' },                                 maxItems: 200 },
  { label: 'jessem',         params: { q: 'jessem' },                                maxItems: 150 },
  { label: 'shopsmith',      params: { q: 'shopsmith' },                             maxItems: 250 },
  { label: 'minimax',        params: { q: 'minimax woodworking' },                   maxItems: 100 },
  // Premium hand-tool makers — these boutique brands have low daily
  // volume and get pushed off the newlyListed-2000 window of the big
  // vintage-carpentry bucket. Dedicated buckets guarantee alert-level
  // recall for users tracking specific makers. Skipped during tuning
  // because the brand name has almost zero active listings or is
  // swamped by non-tool noise: Benchcrafted (Frye leather collisions),
  // Gramercy Tools (guitars / clocks / drafting-tool collisions),
  // Sterling Tool Works (tweezers / clocks), Blue Spruce Toolworks
  // (1 active), Bad Axe Tool Works (1 saw), Wenzloff (0). Revisit
  // when inventory patterns change.
  { label: 'lie-nielsen',    params: { q: 'lie nielsen' },                           maxItems: 200 },
  { label: 'veritas',        params: { q: 'veritas' },                               maxItems: 200 },
  { label: 'norris-plane',   params: { q: 'norris plane' },                          maxItems: 80 },
  { label: 'hock-tools',     params: { q: 'hock tools' },                            maxItems: 50 },
  { label: 'two-cherries',   params: { q: 'two cherries chisel' },                   maxItems: 30 },
  { label: 'clifton-plane',  params: { q: 'clifton plane' },                         maxItems: 20 },
  { label: 'narex',          params: { q: 'narex' },                                 maxItems: 150 },
  { label: 'woodriver',      params: { q: 'wood river', category_ids: '631' },       maxItems: 250 },
];

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

/**
 * Issue one Browse API search request. `bucketParams` is a free-form
 * map merged verbatim into the query string — it can include `q`,
 * `category_ids`, `filter`, or any other Browse API search param.
 * We always add `sort=newlyListed` + pagination.
 */
async function fetchSearchPage({ bucketParams, offset, limit, token }) {
  const params = new URLSearchParams({
    ...bucketParams,
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
 * Run a single search bucket — paginate Browse API for this bucket's
 * params, return records that passed `toRecord` plus pagination stats.
 * Caller is responsible for global dedup and global caps.
 *
 * @param {object} bucket — one entry from SEARCH_BUCKETS
 * @param {Set<string>} globalSeen — source_ids already ingested in this run
 * @param {number} globalRemaining — items we can still add before hitting global cap
 * @param {string} token
 * @returns {Promise<{newRecords: object[], pages: number, totalAvailable: number, dupSkipped: number}>}
 */
async function runBucket(bucket, globalSeen, globalRemaining, token) {
  const newRecords = [];
  const perBucketCap = Math.max(0, Math.min(bucket.maxItems ?? DEFAULT_MAX_ITEMS, globalRemaining));
  let offset = 0;
  let pages = 0;
  let totalAvailable = null;
  let dupSkipped = 0;

  while (newRecords.length < perBucketCap) {
    if (pages > 0) await sleep(REQUEST_DELAY_MS);
    pages += 1;

    const remaining = perBucketCap - newRecords.length;
    const limit = Math.min(PAGE_SIZE, remaining);
    let page;
    try {
      page = await fetchSearchPage({
        bucketParams: bucket.params,
        offset,
        limit,
        token,
      });
    } catch (err) {
      console.error(`[ebay] bucket=${bucket.label} page fetch failed at offset=${offset}: ${err.message}`);
      break;
    }

    if (totalAvailable === null) totalAvailable = page.total ?? 0;
    const items = page.itemSummaries || [];
    if (items.length === 0) break;

    for (const item of items) {
      const rec = toRecord(item);
      if (!rec) continue;
      if (globalSeen.has(rec.listing.source_id)) { dupSkipped += 1; continue; }
      globalSeen.add(rec.listing.source_id);
      newRecords.push(rec);
      if (newRecords.length >= perBucketCap) break;
    }

    offset += items.length;
    if (items.length < limit) break; // Source exhausted before cap
  }

  return { newRecords, pages, totalAvailable: totalAvailable || 0, dupSkipped };
}

/**
 * Iterate SEARCH_BUCKETS, merging normalized records into a single
 * deduplicated stream up to `maxItems` global cap.
 *
 * @param {object} [opts]
 * @param {number} [opts.maxItems] — global cap on total records returned
 * @param {string[]} [opts.buckets] — if provided, only run buckets whose label is in this list
 * @returns {Promise<{records: object[], bucketStats: object[], pages: number}>}
 */
async function scrapeAll(opts = {}) {
  const { maxItems = DEFAULT_MAX_ITEMS, buckets } = opts;
  const bucketsToRun = buckets
    ? SEARCH_BUCKETS.filter((b) => buckets.includes(b.label))
    : SEARCH_BUCKETS;

  const token = await getAppToken();
  const records = [];
  const seenIds = new Set();
  const bucketStats = [];
  let totalPages = 0;

  for (const bucket of bucketsToRun) {
    if (records.length >= maxItems) {
      bucketStats.push({ label: bucket.label, skipped: true, reason: 'global cap reached' });
      continue;
    }
    const remaining = maxItems - records.length;
    const { newRecords, pages, totalAvailable, dupSkipped } =
      await runBucket(bucket, seenIds, remaining, token);
    records.push(...newRecords);
    totalPages += pages;
    bucketStats.push({
      label: bucket.label,
      new: newRecords.length,
      pages,
      total_available: totalAvailable,
      dup_skipped: dupSkipped,
    });
  }

  return { records, bucketStats, pages: totalPages };
}

/**
 * Full ingestion run: paginate Browse API → upsert into externalListings.
 * No markExpired (see file-header note on expiry).
 */
async function runIngestion(opts = {}) {
  const runStartedAt = admin.firestore.Timestamp.now();
  const t0 = Date.now();

  const { records, bucketStats, pages } = await scrapeAll(opts);
  const upsertSummary = await upsertListings(records, runStartedAt);

  return {
    source: SOURCE,
    scraped: records.length,
    bucket_stats: bucketStats,
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
  SEARCH_BUCKETS,
  DEFAULT_MAX_ITEMS,
  runIngestion,
  scrapeAll,
  runBucket,
  getAppToken,
  fetchSearchPage,
  toRecord,
  priceToCents,
  extractImages,
  // Exposed for tests / runners that want to force a fresh token.
  _resetTokenCache: () => { tokenCache = null; },
};
