/**
 * Reddit ingestion adapter.
 *
 * Aggregates sale posts from public woodworking subreddits via Reddit's
 * App-Only OAuth (Application-Only Client Credentials grant). Same shape
 * as the Sawmill Creek / Woodnet forum scrapers — two-phase scrape with
 * a list-sweep phase and a per-thread detail-fetch phase — plus an
 * eBay-style App-Only OAuth helper for auth.
 *
 * Subreddits in scope (v1):
 *   - r/handtools (~186k subscribers): per-thread sales pattern (rules
 *     require one consolidated post per seller). No link-flair system,
 *     so sale detection is title-keyword-based: WTS / FS / For Sale /
 *     Selling / FT prefixes (or inline [WTS] tags). Sale density ~8% of
 *     /new on a typical week.
 *   - r/AntiqueToolBroker (~820 subscribers): explicit
 *     `link_flair_text === "For Sale"` flair. Tiny but pure-signal
 *     volume; the r/handtools rules redirect pro/dealer sellers here.
 *
 * PII hygiene — defensive posture, mirrors eBay's exemption commitment.
 *   We do NOT persist Reddit usernames or any user-identifiable field
 *   (`author`, `author_fullname`, `author_flair_text`, `author_premium`,
 *   `subreddit_subscribers`, `subreddit_id`). Reddit accounts are
 *   user-deletable; we have no way to clean up their listings if a user
 *   deletes. Stripping those fields before Firestore write is the right
 *   call regardless of whether Reddit has an eBay-style compliance
 *   framework around it. Source attribution on the UI surfaces "via
 *   r/handtools", never an author handle.
 *
 * Expiry — standard markExpired() sweep. Reddit's /new caps around 1000
 *   posts (~150 days of activity on r/handtools), well past our 30-day
 *   age cutoff. Anything not seen in this run within the cutoff is
 *   genuinely gone (deleted, removed, or rolled past pagination).
 *
 * Rate limit — Reddit's OAuth tier allows 60 requests/minute. We add a
 *   1-second delay between paginated calls; a typical full nightly run
 *   is ~30 calls and stays comfortably under quota.
 */

const axios = require('axios');
const admin = require('firebase-admin');

// The whole store, so the two-phase paths can reach getListingMeta /
// applyListingUpdates without caring which backend is active.
const store = require('./externalListings');
const { upsertListings, markExpired } = store;
const { extractBrand, extractType } = require('./heuristics');
const { parseLocationTag } = require('./location');

const SOURCE = 'reddit';
const RAW_FORMAT = 'reddit_post';

const OAUTH_URL = 'https://www.reddit.com/api/v1/access_token';
const OAUTH_API = 'https://oauth.reddit.com';
const PUBLIC_BASE = 'https://www.reddit.com';
const REQUEST_TIMEOUT_MS = 30000;

// Polite spacing between paginated calls. OAuth (60 req/min) tolerates 1s
// spacing easily; the unauth public endpoint is closer to 10 req/min so we
// space at 6s. The active client object carries `delayMs` so callers
// don't have to know which mode they're in.
const OAUTH_DELAY_MS = 1000;
const PUBLIC_DELAY_MS = 6000;

// Cap selftext at 5000 chars before storing — same convention as
// Sawmill Creek / Woodnet. Enough for the normalizer; bounded doc size.
const MAX_DESCRIPTION_CHARS = 5000;

/**
 * Subreddit buckets. Each bucket has its own pagination depth + sale
 * detection mode. Order is irrelevant (results merge globally on
 * source_id). When adding a new sub, pick `mode` based on whether the
 * sub uses link flairs to mark sale posts.
 */
const SUBREDDIT_BUCKETS = [
  {
    subreddit: 'handtools',
    mode: 'title',
    maxPages: 12,
    ageCutoffDays: 30,
  },
  {
    subreddit: 'AntiqueToolBroker',
    mode: 'flair',
    maxPages: 5,
    ageCutoffDays: 60,
  },
];

// ---------------------------------------------------------------------------
// Sale detection
// ---------------------------------------------------------------------------

// SKIP first (precedence over INCLUDE) — buying / sold / closed posts.
const SKIP_PATTERNS = [
  /^\s*\[?\s*(WTB|ISO|WTT)\b/i,
  /\b(want\s+to\s+buy|looking\s+for|in\s+search\s+of)\b/i,
  /\[\s*(SOLD|CLOSED|FOUND|EXPIRED|TRADED|PENDING)\s*\]/i,
  // Bare "SOLD" in title — but allow "sold out" (discussion of supply).
  /\bSOLD\s*\b(?!OUT)/i,
];

// INCLUDE patterns for r/handtools (mode: 'title'). Tolerates both
// "WTS Stanley #5" and "[WTS] Stanley #5"; inline [WTS] catches sellers
// who lead with the tool name.
const SALE_PREFIX = /^\s*\[?\s*(WTS|FS|For Sale|Selling|FT)\s*\]?\b/i;
const SALE_INLINE = /\[\s*(WTS|FS|FT|For Sale|Selling)\s*\]/i;

// Flair vocabulary on r/AntiqueToolBroker.
const FLAIR_INCLUDE = new Set(['For Sale']);
const FLAIR_SKIP = new Set(['Sold', 'WTB', 'Discussion', 'Informational/Discussion', 'Wanted to Buy']);

/**
 * Decide if a post is a candidate sale listing for the given bucket.
 * Skip is checked first so "[WTB] FS Stanley" stays out (buying post).
 *
 * Returns { include: boolean, reason: string } so callers can tally
 * skip reasons during dry-runs.
 */
function classifyPost(post, bucket) {
  if (post.stickied) return { include: false, reason: 'stickied' };
  if (post.over_18) return { include: false, reason: 'over_18' };
  if (post.removed_by_category) return { include: false, reason: `removed:${post.removed_by_category}` };
  if (post.author === '[deleted]') return { include: false, reason: 'author-deleted' };
  if (post.selftext === '[removed]' || post.selftext === '[deleted]') {
    // Title still readable even if body is gone, but with no body
    // there's nothing to canonicalize against. Skip.
    return { include: false, reason: 'body-deleted' };
  }

  const title = String(post.title || '');
  for (const re of SKIP_PATTERNS) {
    if (re.test(title)) return { include: false, reason: 'title-skip' };
  }

  if (bucket.mode === 'flair') {
    const flair = (post.link_flair_text || '').trim();
    if (FLAIR_SKIP.has(flair)) return { include: false, reason: `flair-skip:${flair}` };
    if (FLAIR_INCLUDE.has(flair)) return { include: true, reason: `flair:${flair}` };
    // No matching flair — fall back to title regex (some posts go up
    // before flair gets applied).
  }

  // mode === 'title' OR fall-through from 'flair'
  if (SALE_PREFIX.test(title)) return { include: true, reason: 'title-prefix' };
  if (SALE_INLINE.test(title)) return { include: true, reason: 'title-inline' };

  return { include: false, reason: 'no-match' };
}

// ---------------------------------------------------------------------------
// OAuth — App-Only Client Credentials grant
// ---------------------------------------------------------------------------

let tokenCache = null; // { token, expiresAt }

/**
 * Mint or return a cached App-Only OAuth token. Refresh 5 minutes
 * before the cached token's 24h expiry to avoid mid-request expiry.
 * Token is held in module memory only — never persisted.
 */
async function getAppToken({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && tokenCache && tokenCache.expiresAt - 5 * 60 * 1000 > now) {
    return tokenCache.token;
  }
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  if (!id || !secret) {
    throw new Error('[reddit] REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET missing from environment');
  }
  if (!username) {
    throw new Error('[reddit] REDDIT_USERNAME missing — required for User-Agent string per Reddit API rules');
  }
  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  const resp = await axios.post(
    OAUTH_URL,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': `Benchlot/1.0 by /u/${username}`,
      },
      timeout: REQUEST_TIMEOUT_MS,
    }
  );
  const { access_token: token, expires_in: expiresIn } = resp.data || {};
  if (!token) {
    throw new Error(`[reddit] OAuth token mint failed: ${JSON.stringify(resp.data)}`);
  }
  tokenCache = { token, expiresAt: now + Number(expiresIn || 86400) * 1000 };
  return token;
}

/**
 * Build the User-Agent string. Per Reddit API rules, the UA must be
 * descriptive. OAuth mode appends the developer's username (required for
 * App-Only); public mode uses an aggregator-style identifier with a
 * contact URL since unauth callers don't need the username.
 * https://github.com/reddit-archive/reddit/wiki/API
 */
function userAgent(mode) {
  if (mode === 'public') {
    return 'Benchlot/1.0 aggregator (+https://benchlot.com)';
  }
  const username = process.env.REDDIT_USERNAME || 'unknown';
  return `Benchlot/1.0 by /u/${username}`;
}

/**
 * Resolve the active client mode from env. Default is `oauth` for
 * backwards compatibility — the public path is opt-in.
 */
function resolveMode() {
  const raw = (process.env.REDDIT_AUTH_MODE || 'oauth').toLowerCase().trim();
  if (raw !== 'oauth' && raw !== 'public') {
    throw new Error(`[reddit] REDDIT_AUTH_MODE must be 'oauth' or 'public', got: ${raw}`);
  }
  return raw;
}

/**
 * Build the http client config for this run. OAuth mode mints (or reuses)
 * a token and points at oauth.reddit.com. Public mode hits www.reddit.com
 * with no Authorization header. Both share the user-agent + request-spacing
 * contract; downstream callers just receive `{ baseUrl, headers, delayMs, mode }`.
 */
async function getClient() {
  const mode = resolveMode();
  if (mode === 'oauth') {
    const token = await getAppToken();
    return {
      mode,
      baseUrl: OAUTH_API,
      delayMs: OAUTH_DELAY_MS,
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': userAgent(mode),
      },
    };
  }
  return {
    mode,
    baseUrl: PUBLIC_BASE,
    delayMs: PUBLIC_DELAY_MS,
    headers: {
      'User-Agent': userAgent(mode),
    },
  };
}

/**
 * Wrap an http GET with one round of exponential backoff on 429
 * (rate-limit) responses. Reddit's unauth budget is bursty and one
 * over-quota burst shouldn't tank a whole run. Two retries: 10s, 30s.
 * Other errors propagate immediately — only 429 is retry-worthy here.
 */
async function with429Retry(fn) {
  const backoffs = [10000, 30000];
  let lastErr;
  for (let attempt = 0; attempt <= backoffs.length; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      const status = err.response?.status;
      if (status !== 429 || attempt === backoffs.length) {
        throw err;
      }
      lastErr = err;
      console.warn(`[reddit] 429 received, backing off ${backoffs[attempt]}ms (attempt ${attempt + 1}/${backoffs.length})`);
      await sleep(backoffs[attempt]);
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

const http = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch one page of /r/<sub>/new.json. `after` is the previous page's
 * last-post `name` (a t3_xxxxxx fullname) or null for the first page.
 *
 * `client` is the result of `getClient()` and carries the base URL,
 * headers, and rate-limit delay. Same shape regardless of OAuth vs public.
 */
async function fetchListing(subreddit, after, client) {
  const params = new URLSearchParams({ limit: '100' });
  if (after) params.set('after', after);
  const url = `${client.baseUrl}/r/${encodeURIComponent(subreddit)}/new.json?${params.toString()}`;
  const resp = await with429Retry(() => http.get(url, { headers: client.headers }));
  return resp.data;
}

/**
 * Fetch a full thread JSON. Reddit's thread endpoint returns
 * [post_listing, comment_listing] — we only need the first element's
 * first child (the OP's full data, including possibly-truncated-on-/new
 * `selftext`, full `media_metadata`, etc.).
 */
async function fetchThreadJson(permalink, client) {
  // permalink looks like '/r/handtools/comments/abc123/some_title/'
  const url = `${client.baseUrl}${permalink}.json`;
  const resp = await with429Retry(() => http.get(url, { headers: client.headers }));
  const data = Array.isArray(resp.data) ? resp.data[0] : null;
  const child = data?.data?.children?.[0];
  return child?.data || null;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Tiered price extraction. Same pattern as Sawmill Creek / Woodnet —
 * first $-figure in title, falling back to first $-figure in selftext.
 * Returns null when no plausible price is present.
 */
function extractPriceCents(title, body) {
  const pattern = /\$\s*([\d,]+(?:\.\d{1,2})?)/;
  const candidates = [title, body];
  for (const source of candidates) {
    if (!source) continue;
    const m = source.match(pattern);
    if (!m) continue;
    const n = Number(m[1].replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0 && n < 1_000_000) return Math.round(n * 100);
  }
  return null;
}

/**
 * Extract image URLs from a Reddit post. Four-case fallback (gallery,
 * single-image, preview, none) covering the shapes we see in the wild.
 *
 * Critical: Reddit's `media_metadata.s.u` and `preview.images[0].source.url`
 * fields contain HTML-encoded URLs (`&amp;` instead of `&`). The literal
 * `&amp;` breaks the URL signature and 403s — must unescape.
 */
function extractImagesFromPost(post) {
  const out = [];
  const seen = new Set();
  const push = (u) => {
    if (!u || typeof u !== 'string' || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };
  const unescape = (u) => u.replace(/&amp;/g, '&');

  // Resolve crossposts: prefer the parent's media when present (the
  // crosspost shell often has empty body and metadata).
  const source = (Array.isArray(post.crosspost_parent_list) && post.crosspost_parent_list[0]) || post;

  // Case 1: gallery — preferred when present, preserves user-set order.
  if (source.is_gallery && source.media_metadata) {
    const order = source.gallery_data?.items?.map((i) => i.media_id) || Object.keys(source.media_metadata);
    for (const id of order) {
      const meta = source.media_metadata[id];
      if (meta?.s?.u) push(unescape(meta.s.u));
      else if (meta?.s?.gif) push(unescape(meta.s.gif));
    }
  }

  // Case 2: single image post.
  if (out.length === 0 && source.url_overridden_by_dest) {
    const u = source.url_overridden_by_dest;
    if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(u) || /^https:\/\/i\.redd\.it\//.test(u)) push(u);
  }

  // Case 3: preview image (text post with embedded link preview).
  if (out.length === 0 && source.preview?.images?.length) {
    const src = source.preview.images[0]?.source?.url;
    if (src) push(unescape(src));
  }

  // Case 4: text-only — return [] (UI handles the zero-image case).
  return out;
}

function capDescription(text) {
  if (!text) return null;
  if (text.length <= MAX_DESCRIPTION_CHARS) return text;
  return text.slice(0, MAX_DESCRIPTION_CHARS - 15) + ' …[truncated]';
}

function parsePostedAt(createdUtc) {
  if (!createdUtc) return null;
  const d = new Date(Number(createdUtc) * 1000);
  if (Number.isNaN(d.getTime())) return null;
  return admin.firestore.Timestamp.fromDate(d);
}

/**
 * Strip user-identifiable fields from a Reddit post object before we
 * persist anything to externalListingsRaw. Mirrors eBay's seller-block
 * scrub. We pluck only the listing-relevant fields rather than
 * blacklist, so a future Reddit API change adding new user fields
 * doesn't quietly leak through.
 */
function scrubForRaw(post) {
  const scrubbed = {
    id: post.id,
    name: post.name, // t3_xxxxxx — Reddit fullname (NOT a user name)
    subreddit: post.subreddit,
    permalink: post.permalink,
    title: post.title,
    selftext: post.selftext,
    selftext_html: post.selftext_html,
    link_flair_text: post.link_flair_text,
    is_gallery: post.is_gallery,
    is_self: post.is_self,
    is_video: post.is_video,
    over_18: post.over_18,
    stickied: post.stickied,
    spoiler: post.spoiler,
    locked: post.locked,
    archived: post.archived,
    pinned: post.pinned,
    media_metadata: post.media_metadata,
    gallery_data: post.gallery_data,
    url_overridden_by_dest: post.url_overridden_by_dest,
    preview: post.preview,
    created_utc: post.created_utc,
    edited: post.edited,
    domain: post.domain,
    crosspost_parent: post.crosspost_parent,
    // Score is fine to keep — public engagement metric, not user-identifying.
    score: post.score,
    upvote_ratio: post.upvote_ratio,
    num_comments: post.num_comments,
    // NOT persisted:
    //   author, author_fullname, author_flair_text, author_premium,
    //   subreddit_subscribers, subreddit_id, distinguished, mod_reports,
    //   user_reports, etc.
  };
  // Firestore rejects undefined values. Reddit posts legitimately omit
  // optional fields (no preview on text-only, no gallery_data on single-image,
  // etc.) — strip them before write.
  for (const key of Object.keys(scrubbed)) {
    if (scrubbed[key] === undefined) delete scrubbed[key];
  }
  return scrubbed;
}

/**
 * Map a Reddit post + its enriched detail JSON into our ingestion
 * record envelope. `detail` may be null if we skipped the per-thread
 * fetch (the post was already known) — in that case we use whatever
 * fields the listing-page response gave us.
 */
function toRecord(post, bucket, detail = null) {
  // Prefer detail (full thread JSON) over listing-page data — it has
  // the canonical untruncated selftext + media_metadata.
  const merged = detail || post;

  const id = merged.id || post.id;
  if (!id) return null;
  const title = String(merged.title || post.title || '').trim();
  if (!title) return null;

  const selftext = merged.selftext || post.selftext || '';
  const description = capDescription(selftext);
  const priceCents = extractPriceCents(title, selftext);
  const images = extractImagesFromPost(merged);
  const postedAt = parsePostedAt(merged.created_utc || post.created_utc);
  const permalink = merged.permalink || post.permalink || `/r/${bucket.subreddit}/comments/${id}/`;
  const sourceUrl = `https://www.reddit.com${permalink}`;

  const tags = [`r_subreddit:${bucket.subreddit}`];
  const flair = (merged.link_flair_text || post.link_flair_text || '').trim();
  if (flair) tags.push(`r_flair:${flair.toLowerCase().replace(/\s+/g, '_')}`);
  // Bracket-tag location parse: title first, then selftext window. Hit rate
  // is lower on Reddit (~30-50%) since location-tagging isn't enforced —
  // misses fall to "Other".
  const locationState = parseLocationTag(title) || parseLocationTag(selftext);

  const listing = {
    source: SOURCE,
    source_id: id,
    source_url: sourceUrl,
    title_raw: title,
    description_raw: description,
    price_cents: priceCents,
    currency: 'USD',
    condition_raw: null, // sellers describe condition in selftext; not parsed out
    images,
    posted_at: postedAt,
    tags,
    heuristic_brand: extractBrand(`${title} ${selftext}`),
    heuristic_type: extractType(`${title} ${selftext}`),
    canonical_brand: null,
    canonical_type: null,
    canonical_model: null,
    canonical_size: null,
    era_estimate: null,
    location_state: locationState,
    location_display: locationState,
  };

  const raw = scrubForRaw(merged);

  return { listing, raw, raw_format: RAW_FORMAT };
}

// ---------------------------------------------------------------------------
// Touch / known-id helpers
// ---------------------------------------------------------------------------

/**
 * Load source_ids of every currently-ingested Reddit doc. Used to
 * decide which posts in a list-sweep need a per-thread detail fetch
 * vs. just a last_seen_at touch.
 */
async function getKnownSourceIds() {
  // Backend-agnostic. getListingMeta returns more than this needs (bump
  // metadata and status), but reusing it keeps one lookup to maintain per
  // backend rather than two that could drift.
  const meta = await store.getListingMeta(SOURCE);
  return new Set(meta.keys());
}

/**
 * Refresh `last_seen_at` + `scraped_at` + `title_raw` on previously
 * ingested posts. Same narrow-update pattern as Sawmill Creek; we
 * don't re-fetch the body or media on re-saw.
 */
async function touchKnownListings(posts, runStartedAt) {
  if (!Array.isArray(posts) || posts.length === 0) return { touched: 0 };
  const updates = posts.map((p) => ({
    source: SOURCE,
    source_id: String(p.id),
    status: 'active',
    title_raw: p.title || '',
  }));
  // Only the supplied keys are written, plus scraped_at / last_seen_at, so the
  // body and media captured by the original detail fetch are left intact.
  const { updated } = await store.applyListingUpdates(updates, runStartedAt);
  return { touched: updated };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Walk /r/<sub>/new for one bucket, paginating until we hit any of:
 *   - the bucket's maxPages cap
 *   - a page with zero children (empty subreddit or end of /new)
 *   - the first post older than ageCutoffDays
 *   - `after === null` (Reddit signaling end-of-listing)
 *
 * Returns the FILTERED list (skip patterns + bucket-mode classifier
 * applied) so the caller already has only candidate sale posts.
 */
async function listSweep(bucket, client) {
  const cutoffMs = Date.now() - bucket.ageCutoffDays * 24 * 60 * 60 * 1000;
  const all = [];
  let after = null;
  let pages = 0;
  let scanned = 0;
  let reachedCutoff = false;

  for (let page = 0; page < bucket.maxPages; page += 1) {
    if (page > 0) await sleep(client.delayMs);
    pages += 1;
    const resp = await fetchListing(bucket.subreddit, after, client);
    const children = resp?.data?.children || [];
    if (children.length === 0) break;
    for (const c of children) {
      const post = c.data;
      scanned += 1;
      if (post.created_utc * 1000 < cutoffMs) {
        reachedCutoff = true;
        break;
      }
      const { include } = classifyPost(post, bucket);
      if (include) all.push(post);
    }
    if (reachedCutoff) break;
    after = resp?.data?.after || null;
    if (!after) break;
  }

  return { posts: all, pages, scanned, reachedCutoff };
}

/**
 * Scrape all subreddit buckets. Returns:
 *   { records, knownPosts, bucketStats }
 * where `records` are NEW posts (full detail fetched) and
 * `knownPosts` are previously-ingested posts that just need a touch.
 */
async function scrapeAll(opts = {}) {
  const {
    maxNew,
    maxPages,
    bucket: bucketFilter,
    skipFirestoreLookup = false,
  } = opts;

  const buckets = bucketFilter
    ? SUBREDDIT_BUCKETS.filter((b) => b.subreddit.toLowerCase() === bucketFilter.toLowerCase())
    : SUBREDDIT_BUCKETS;

  const client = await getClient();
  console.log(`[reddit] client mode=${client.mode}, baseUrl=${client.baseUrl}, delayMs=${client.delayMs}`);
  const knownIds = skipFirestoreLookup ? new Set() : await getKnownSourceIds();

  const allNew = []; // candidate posts that are new to us
  const allKnown = []; // candidate posts we've seen before
  const bucketStats = [];

  for (const bucketBase of buckets) {
    const bucket = maxPages != null
      ? { ...bucketBase, maxPages: Math.min(bucketBase.maxPages, maxPages) }
      : bucketBase;

    const { posts, pages, scanned, reachedCutoff } = await listSweep(bucket, client);
    let newCount = 0;
    let knownCount = 0;
    for (const p of posts) {
      if (knownIds.has(p.id)) {
        allKnown.push(p);
        knownCount += 1;
      } else {
        allNew.push({ post: p, bucket });
        newCount += 1;
      }
    }
    bucketStats.push({
      subreddit: bucket.subreddit,
      mode: bucket.mode,
      pages,
      scanned,
      candidates: posts.length,
      new: newCount,
      known: knownCount,
      reached_cutoff: reachedCutoff,
    });
  }

  const toFetch = maxNew != null ? allNew.slice(0, maxNew) : allNew;
  const skippedDueToCap = allNew.length - toFetch.length;

  // Phase 2: per-thread detail fetch for new posts only.
  const records = [];
  for (let i = 0; i < toFetch.length; i += 1) {
    const { post, bucket } = toFetch[i];
    if (i > 0) await sleep(client.delayMs);
    let detail = null;
    try {
      detail = await fetchThreadJson(post.permalink, client);
    } catch (err) {
      console.error(`[reddit] detail fetch failed for ${post.id}: ${err.message}`);
    }
    const rec = toRecord(post, bucket, detail);
    if (rec) records.push(rec);
  }

  return {
    records,
    knownPosts: allKnown,
    bucketStats,
    skippedDueToCap,
  };
}

/**
 * Full ingestion run: list-sweep → detail-fetch new → upsert →
 * touch known → markExpired.
 *
 * @param {object} [opts]
 * @param {number} [opts.maxNew] — cap on per-thread detail fetches
 * @param {number} [opts.maxPages] — cap on list-sweep pages per bucket
 * @param {string} [opts.bucket] — restrict to a single subreddit
 * @returns {Promise<object>}
 */
async function runIngestion(opts = {}) {
  const runStartedAt = admin.firestore.Timestamp.now();
  const t0 = Date.now();

  const { records, knownPosts, bucketStats, skippedDueToCap } = await scrapeAll(opts);

  const upsertSummary = await upsertListings(records, runStartedAt);
  const touchSummary = await touchKnownListings(knownPosts, runStartedAt);

  // Skip the expiry sweep when running with caps — would falsely expire
  // posts we didn't reach. Same guard as Sawmill Creek.
  const shouldSweep = opts.maxNew == null && opts.maxPages == null && opts.bucket == null;
  const expireSummary = shouldSweep
    ? await markExpired(SOURCE, runStartedAt)
    : { expired: 0 };

  return {
    source: SOURCE,
    inserted: upsertSummary.inserted,
    updated: upsertSummary.updated,
    touched: touchSummary.touched,
    expired: expireSummary.expired,
    skipped_due_to_cap: skippedDueToCap,
    sweep_skipped: !shouldSweep,
    bucket_stats: bucketStats,
    durationMs: Date.now() - t0,
    runStartedAt: runStartedAt.toDate(),
  };
}

module.exports = {
  SOURCE,
  RAW_FORMAT,
  SUBREDDIT_BUCKETS,
  runIngestion,
  scrapeAll,
  listSweep,
  classifyPost,
  toRecord,
  extractImagesFromPost,
  extractPriceCents,
  scrubForRaw,
  getAppToken,
  fetchListing,
  fetchThreadJson,
  // Exposed for tests / runners that want to force a fresh token.
  _resetTokenCache: () => { tokenCache = null; },
};
