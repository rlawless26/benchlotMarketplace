/**
 * Facebook Marketplace ingestion adapter (via Bright Data Scraper API).
 *
 * Bright Data hosts a "Facebook Marketplace - discover by keyword" scraper
 * that handles auth, anti-bot, and HTML parsing on their side. We call
 * their async API: trigger a snapshot per (keyword, city), poll until
 * complete, then ingest the structured records into externalListings.
 *
 * Why not direct scraping: FBM is login-walled, fingerprint-checked,
 * Cloudflare-fronted, and selectors change weekly. Building and
 * maintaining a direct scraper is a ~1-2 week initial effort plus 4-8
 * hours/month forever. Bright Data charges ~$0.001/record and absorbs
 * the maintenance — much better leverage at our stage.
 *
 * Dataset shape:
 *   POST .../trigger?dataset_id=gd_lvt9iwuh6fbcwmx1a
 *        &type=discover_new&discover_by=url
 *   Body: [ { url }, ... ]
 *   Returns: { snapshot_id }
 *   Then GET .../snapshot/{id}?format=json — 202 while running, 200 done.
 *
 * Why URL mode (not keyword mode): the keyword variant returns whatever
 * region Bright Data's proxy session lands in — for our account that's
 * persistently South Africa regardless of `city` or `country=us` params.
 * URL mode honors the geography embedded in the URL itself, so
 * /marketplace/boston/search/?query=festool returns Boston-area Festool
 * listings as expected. Validated 2026-04-29: URL mode → 1,808 US
 * listings; keyword mode + identical inputs → 285 ZA listings.
 *
 * Why brand-specific search URLs (not the Tools category URL): the user's
 * audience cares about specific premium brands (Festool, Lie-Nielsen,
 * SawStop, etc.). Searching by brand gives sharper relevance per scrape
 * even though it costs more snapshots. The Tools category alternative
 * would need heavy post-filtering for woodworking-relevance, and FBM's
 * "Tools" includes plumbing/automotive/lawn tools we don't want.
 *
 * Per-listing output (from BD docs):
 *   url, title, initial_price, final_price, currency, product_id,
 *   condition, description, location, country_code, images[],
 *   seller_description, color, brand, videos, profile_id, listing_date
 *
 * PII hygiene — defensive posture mirroring eBay/Reddit. We do NOT
 * persist seller-identifying fields: profile_id, seller_description.
 * FBM listings tie a personal Facebook profile to each post; storing
 * that profile_id without a user-deletion path is the wrong call. Source
 * attribution surfaces "via Facebook Marketplace", never a profile.
 *
 * Cost — at v1's keyword × city matrix the bill lands around $5–15/run
 * depending on result density. Run weekly (not daily) to keep monthly
 * spend in the $20–60 range.
 *
 * Expiry — we run markExpired() the same way Sawmill Creek / Woodnet do.
 * FBM listings expire when sellers delete or sell; missing from this
 * run's snapshot ⇒ flip to status='expired'.
 */

const axios = require('axios');
const admin = require('firebase-admin');

const { upsertListings, markExpired } = require('./externalListings');
const { extractBrand, extractType } = require('./heuristics');

const SOURCE = 'fbmarketplace';
const RAW_FORMAT = 'fbmarketplace_listing';

const BRIGHT_DATA_API = 'https://api.brightdata.com/datasets/v3';
const DATASET_ID = 'gd_lvt9iwuh6fbcwmx1a';

const TRIGGER_TIMEOUT_MS = 30_000;
const SNAPSHOT_POLL_INTERVAL_MS = 30_000;     // polite spacing on Bright Data side
const SNAPSHOT_POLL_TIMEOUT_MS = 30 * 60_000; // 30 minutes max per snapshot

const MAX_DESCRIPTION_CHARS = 5000;

/**
 * Search matrix. Cross-product of CITIES × BRANDS yields one FBM search
 * URL per brand-in-city. Each URL is one Bright Data snapshot.
 *
 * Cities chosen to cover US woodworking metros (Northeast, West Coast,
 * Midwest, South). FBM's URL geo-targeting clusters results to the
 * named city's market area — so Boston pulls in NH/MA/RI/VT, SF pulls
 * in Bay Area + Sacramento, etc. With 4 cities we cover most of the US
 * without over-paying on overlap.
 *
 * Brands chosen for the user's target audience — premium woodworking
 * makers, hand-tool and power-tool. Skip commodity brands (DeWalt,
 * Milwaukee, Makita) that drown out woodworking signal with automotive
 * and construction noise. Add or remove brands here to tune the matrix.
 */
// City slugs map to FBM's location URLs (/marketplace/<slug>/). Picked
// for woodworking density per Rob's audience research:
//   - Boston: New England hub, captures Lie-Nielsen / Maine spillover
//   - Philadelphia: mid-Atlantic furniture-making tradition
//   - Minneapolis: Midwest woodturning + Amana Colonies spillover
//   - Portland (OR): PNW maker community, Guild of Oregon Woodworkers
//   - Seattle: PNW power-tool community, Festool / SawStop concentration
// Asheville (NC craft hub) skipped for v1 — small metro, low FBM density.
// Re-evaluate if signal looks thin on the first weekly run.
const CITIES = [
  'boston',
  'philadelphia',
  'minneapolis',
  'portland',
  'seattle',
];

const BRANDS = [
  // Premium hand tools
  'lie-nielsen',
  'veritas',
  'bridge city',
  'stanley plane',         // disambiguates Stanley from appliances / thermos
  // Premium woodworking power tools
  'festool',
  'sawstop',
  'laguna',
  'powermatic',
  'woodpeckers',
  'delta unisaw',          // disambiguates Delta from airline / faucet listings
  'leigh dovetail',        // disambiguates Leigh from people named Leigh
  'bosch router',          // disambiguates Bosch from appliances / car parts
];

const FBM_BASE = 'https://www.facebook.com/marketplace';

function buildSearchUrl(city, brand) {
  return `${FBM_BASE}/${encodeURIComponent(city)}/search/?query=${encodeURIComponent(brand)}`;
}

const SEARCH_BUCKETS = [];
for (const city of CITIES) {
  for (const brand of BRANDS) {
    SEARCH_BUCKETS.push({ city, brand, url: buildSearchUrl(city, brand) });
  }
}

// ---------------------------------------------------------------------------
// Bright Data API client
// ---------------------------------------------------------------------------

function apiKey() {
  const k = process.env.BRIGHT_DATA_API_KEY;
  if (!k) throw new Error('[fbmarketplace] BRIGHT_DATA_API_KEY missing from environment');
  return k;
}

const http = axios.create({ timeout: TRIGGER_TIMEOUT_MS });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Trigger a Bright Data snapshot for one FBM search URL. Returns the
 * snapshot_id we'll poll for completion. URL discovery mode is required
 * for the geo to land in the US — keyword mode hits a ZA-locked proxy
 * pool on this account.
 */
async function triggerSnapshot({ url: searchUrl }) {
  const triggerUrl = `${BRIGHT_DATA_API}/trigger?dataset_id=${DATASET_ID}&type=discover_new&discover_by=url&include_errors=true`;
  const body = [{ url: searchUrl }];
  const resp = await http.post(triggerUrl, body, {
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
    },
  });
  const id = resp.data?.snapshot_id;
  if (!id) throw new Error(`[fbmarketplace] trigger returned no snapshot_id: ${JSON.stringify(resp.data)}`);
  return id;
}

/**
 * Poll a snapshot until it's ready, then fetch the JSON results.
 * Returns the array of raw listing records (Bright Data's output shape).
 * Throws on timeout or unexpected response.
 */
async function awaitSnapshot(snapshotId, { onProgress } = {}) {
  const url = `${BRIGHT_DATA_API}/snapshot/${snapshotId}?format=json`;
  const startedAt = Date.now();
  while (true) {
    const resp = await http.get(url, {
      headers: { Authorization: `Bearer ${apiKey()}` },
      validateStatus: (s) => s === 200 || s === 202,
    });
    if (resp.status === 200) {
      return Array.isArray(resp.data) ? resp.data : [];
    }
    if (Date.now() - startedAt > SNAPSHOT_POLL_TIMEOUT_MS) {
      throw new Error(`[fbmarketplace] snapshot ${snapshotId} timed out after ${SNAPSHOT_POLL_TIMEOUT_MS}ms`);
    }
    if (onProgress) onProgress({ elapsedMs: Date.now() - startedAt });
    await sleep(SNAPSHOT_POLL_INTERVAL_MS);
  }
}

// ---------------------------------------------------------------------------
// Record shaping
// ---------------------------------------------------------------------------

function capDescription(text) {
  if (!text) return null;
  if (text.length <= MAX_DESCRIPTION_CHARS) return text;
  return text.slice(0, MAX_DESCRIPTION_CHARS - 15) + ' …[truncated]';
}

function parsePriceCents(raw) {
  if (raw == null) return null;
  const s = String(raw).replace(/[^0-9.]/g, '');
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0 || n >= 1_000_000) return null;
  return Math.round(n * 100);
}

function parsePostedAt(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return admin.firestore.Timestamp.fromDate(d);
}

/**
 * Map a Bright Data FBM record to our externalListings envelope.
 * Returns null if the record is malformed (missing id/url) or non-US
 * (we explicitly want US-only inventory; the URL-mode geo targeting is
 * usually right but the occasional cross-border result slips through).
 */
function toRecord(item) {
  const productId = item.product_id || item.id;
  const url = item.url || item.listing_url || item.link;
  if (!productId || !url) return null;

  // US-only filter. URL-mode geo targeting works ~99% but defensive
  // double-check at write time so non-US listings never land in the catalog.
  const country = (item.country_code || '').toUpperCase();
  if (country && country !== 'US') return null;

  const title = String(item.title || '').trim();
  if (!title) return null;

  const description = capDescription(item.description || '');
  const priceCents = parsePriceCents(item.final_price ?? item.initial_price ?? item.price);
  const images = Array.isArray(item.images)
    ? item.images.filter((u) => typeof u === 'string' && u.startsWith('http'))
    : [];

  const tags = [];
  if (item.location) tags.push(`fbm_location:${String(item.location).slice(0, 80)}`);
  if (item.country_code) tags.push(`fbm_country:${item.country_code}`);

  const heuristicBrand = item.brand && String(item.brand).trim()
    ? String(item.brand).trim()
    : extractBrand(`${title} ${item.description || ''}`);
  const heuristicType = extractType(`${title} ${item.description || ''}`);

  const listing = {
    source: SOURCE,
    source_id: String(productId),
    source_url: url,
    title_raw: title,
    description_raw: description,
    price_cents: priceCents,
    currency: item.currency || 'USD',
    condition_raw: item.condition || null,
    images,
    posted_at: parsePostedAt(item.listing_date),
    tags,
    heuristic_brand: heuristicBrand,
    heuristic_type: heuristicType,
    canonical_brand: null,
    canonical_type: null,
    canonical_model: null,
    canonical_size: null,
    era_estimate: null,
  };

  // Scrub seller-identifying fields before persisting raw. profile_id and
  // seller_description tie a Facebook profile to the listing; the raw
  // payload should be reusable for re-normalization but not retain PII.
  const raw = { ...item };
  delete raw.profile_id;
  delete raw.seller_description;

  return { listing, raw, raw_format: RAW_FORMAT };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Run all (keyword, city) snapshots in parallel, await each, then merge
 * the results. De-dupes by source_id since the same listing can surface
 * across multiple keyword queries (a listing for "vintage Veritas
 * shoulder plane" matches "hand plane", "veritas", and "woodworking
 * tools").
 *
 * @param {object} [opts]
 * @param {Array<{keyword:string, city:string}>} [opts.buckets]
 * @returns {Promise<{records, perBucket}>}
 */
async function scrapeAll(opts = {}) {
  const buckets = opts.buckets || SEARCH_BUCKETS;

  // Trigger every bucket up-front so they run concurrently on Bright
  // Data's side. They charge per record, not per minute, so parallelism
  // is purely a wall-clock win.
  const triggered = [];
  for (const bucket of buckets) {
    try {
      const snapshotId = await triggerSnapshot(bucket);
      console.log(`[fbmarketplace] triggered ${bucket.city}/"${bucket.brand}" → ${snapshotId}`);
      triggered.push({ bucket, snapshotId });
    } catch (err) {
      console.error(`[fbmarketplace] trigger failed for ${bucket.city}/"${bucket.brand}": ${err.message}`);
      triggered.push({ bucket, error: err.message });
    }
  }

  // Now poll each in parallel. Each snapshot returns when ready; the
  // overall await time is bounded by the slowest, not the sum.
  const settled = await Promise.allSettled(
    triggered.map(async ({ bucket, snapshotId, error }) => {
      if (error) return { bucket, items: [], error };
      try {
        const items = await awaitSnapshot(snapshotId);
        return { bucket, items };
      } catch (err) {
        return { bucket, items: [], error: err.message };
      }
    })
  );

  const seen = new Set();
  const records = [];
  const perBucket = [];
  for (const s of settled) {
    if (s.status !== 'fulfilled') {
      perBucket.push({ status: 'rejected', reason: String(s.reason) });
      continue;
    }
    const { bucket, items, error } = s.value;
    let included = 0;
    let dupes = 0;
    for (const item of items) {
      const rec = toRecord(item);
      if (!rec) continue;
      if (seen.has(rec.listing.source_id)) {
        dupes += 1;
        continue;
      }
      seen.add(rec.listing.source_id);
      records.push(rec);
      included += 1;
    }
    perBucket.push({
      city: bucket.city,
      brand: bucket.brand,
      raw_count: items.length,
      included,
      dupes,
      error: error || null,
    });
  }

  return { records, perBucket };
}

/**
 * Full ingestion run: scrape → upsert → markExpired.
 */
async function runIngestion(opts = {}) {
  const runStartedAt = admin.firestore.Timestamp.now();
  const t0 = Date.now();

  const { records, perBucket } = await scrapeAll(opts);
  const upsertSummary = await upsertListings(records, runStartedAt);

  // Skip the expiry sweep when a custom bucket subset is passed — partial
  // runs would falsely expire listings the subset didn't reach.
  const shouldSweep = !opts.buckets;
  const expireSummary = shouldSweep
    ? await markExpired(SOURCE, runStartedAt)
    : { expired: 0 };

  return {
    source: SOURCE,
    inserted: upsertSummary.inserted,
    updated: upsertSummary.updated,
    expired: expireSummary.expired,
    sweep_skipped: !shouldSweep,
    per_bucket: perBucket,
    durationMs: Date.now() - t0,
    runStartedAt: runStartedAt.toDate(),
  };
}

module.exports = {
  SOURCE,
  RAW_FORMAT,
  DATASET_ID,
  SEARCH_BUCKETS,
  CITIES,
  BRANDS,
  buildSearchUrl,
  runIngestion,
  scrapeAll,
  triggerSnapshot,
  awaitSnapshot,
  toRecord,
};
