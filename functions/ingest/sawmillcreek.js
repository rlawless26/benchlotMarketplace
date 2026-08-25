/**
 * Sawmill Creek classifieds ingestion adapter.
 *
 * Sawmill Creek is a public XenForo woodworking community with a single
 * classifieds forum at /forums/sawmill-creek-classifieds.10/. Thread lists
 * and individual threads are fully public (login only required to reply),
 * so we can walk listings anonymously.
 *
 * Two-phase scrape (important for efficiency + politeness):
 *   1. List sweep — walk forum listing pages (~5 pages × 23 threads each)
 *      and collect metadata for every non-skippable thread.
 *   2. Selective detail fetch — for threads we've NEVER seen before, fetch
 *      the individual thread page to extract OP body + price + images.
 *      Threads we've already ingested get a light "touch" (refresh
 *      last_seen_at + title) with no body re-fetch.
 *
 * SOLD detection is title-based: any thread whose title contains "SOLD"
 * (word-boundary match) is filtered at list-sweep. The expiry sweep
 * (markExpired) then flips previously-active docs to `expired` via the
 * standard unseen-since-run pattern.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');

const { upsertListings, markExpired } = require('./externalListings');
const { extractBrand, extractType } = require('./heuristics');
const { parseLocationTag } = require('./location');

const SOURCE = 'sawmillcreek';
const RAW_FORMAT = 'sawmillcreek_thread';
const STORE_ORIGIN = 'https://sawmillcreek.org';
const FORUM_URL = `${STORE_ORIGIN}/forums/sawmill-creek-classifieds.10/`;
const REQUEST_TIMEOUT_MS = 30000;
const USER_AGENT = 'Mozilla/5.0 (compatible; BenchlotIngestion/1.0; +https://benchlot.com)';

// Politeness delays — Sawmill Creek is a community forum, not a commercial
// API. Err on the side of gentle.
const LIST_PAGE_DELAY_MS = 500;
const THREAD_FETCH_DELAY_MS = 2000;

// Soft safety cap — refuse to walk past this many pages in one run even if
// more exist. Forum is ~3-5 pages typically; 20 pages is already 460 threads.
const MAX_LIST_PAGES_DEFAULT = 20;

// Cap OP body at 5000 chars before storing in description_raw. Enough
// context for the normalizer; keeps Firestore doc size reasonable.
const MAX_DESCRIPTION_CHARS = 5000;

// Per-run cap on bumped-thread re-fetches. See woodnet.js for the rationale —
// caps a cold-deploy backlog so we don't blow the 540s function timeout.
const MAX_BUMP_RECHECKS_PER_RUN = 50;

// A line is treated as a SOLD marker only if it contains nothing but the
// word SOLD plus optional decorations (`---SOLD--`, `**SOLD**`, `[SOLD]`,
// `SOLD!`). Conservative on purpose — false positives lose us live inventory,
// false negatives are recoverable on the next bump or via markExpired.
const SOLD_LINE_RE = /^[\s\-*=_~!.<>[\]]*SOLD[\s\-*=_~!.<>[\]]*$/i;

// Pinned meta threads that should never be ingested even if they somehow
// survive the sticky/prefix filters.
const BLOCKED_THREAD_IDS = new Set([
  '187677', // "Classified Advertisement Rules"
  '206235', // "How do you bring up items for sale?"
  '216446', // "Consider placing your city/state in your title..."
]);

const http = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml',
  },
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

async function fetchForumPage(pageNum) {
  const url = pageNum === 1 ? FORUM_URL : `${FORUM_URL}page-${pageNum}`;
  const resp = await http.get(url);
  if (typeof resp.data !== 'string') {
    throw new Error(`[sawmillcreek] unexpected list-page response (${typeof resp.data})`);
  }
  return resp.data;
}

async function fetchThreadPage(href) {
  const url = href.startsWith('http') ? href : `${STORE_ORIGIN}${href}`;
  const resp = await http.get(url);
  if (typeof resp.data !== 'string') {
    throw new Error(`[sawmillcreek] unexpected thread response for ${href}`);
  }
  return resp.data;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse thread metadata from a forum listing page.
 * Returns array of { threadId, slug, title, href, postedAt, sticky, sold, author }.
 */
function parseThreadList(html) {
  const $ = cheerio.load(html);
  const threads = [];

  $('.structItem--thread').each((_, el) => {
    const $el = $(el);

    const $titleLink = $el.find('.structItem-title a').first();
    const title = $titleLink.text().trim();
    const href = $titleLink.attr('href') || '';
    const m = href.match(/\/threads\/([^/]+)\.(\d+)\//);
    if (!m) return;
    const slug = m[1];
    const threadId = m[2];

    const sticky = $el.find('.structItem-status--sticky').length > 0;
    const sold = /\bSOLD\b/i.test(title);
    const author = $el.attr('data-author') || $el.find('.username').first().text().trim();

    const postedAtAttr = $el.find('.structItem-startDate time').first().attr('datetime');
    const lastPostAttr = $el.find('.structItem-cell--latest time').first().attr('datetime') || null;

    threads.push({
      threadId,
      slug,
      title,
      href,
      postedAt: postedAtAttr || null,
      lastPostAt: lastPostAttr,
      sticky,
      sold,
      author,
    });
  });

  return threads;
}

/**
 * Parse OP (first post) from an individual thread page, plus a sold check
 * across every post in the thread.
 *
 * Returns { bodyHtml, bodyText, images, username, postedAt, sold, soldAt }.
 *
 * Sold detection walks every `article.message`, strips quoted blockquote
 * content (so a reply that quotes "SOLD" doesn't trigger), and matches each
 * line against SOLD_LINE_RE — only lines that are nothing-but-SOLD-plus-
 * decorations count. `soldAt` is the post date of the first matching post.
 */
function parseThreadOP(html) {
  const $ = cheerio.load(html);
  const $messages = $('article.message');
  const empty = { bodyHtml: null, bodyText: null, images: [], username: null, postedAt: null, sold: false, soldAt: null };
  if ($messages.length === 0) return empty;

  const $op = $messages.first();
  const $body = $op.find('.bbWrapper').first();

  const bodyHtml = $body.html() || null;
  const bodyText = ($body.text() || '').replace(/\s+/g, ' ').trim();

  const images = [];
  $body.find('img').each((_, img) => {
    const $img = $(img);
    const src = $img.attr('data-src') || $img.attr('src');
    if (!src) return;
    if (src.startsWith('data:')) return;
    const abs = src.startsWith('http')
      ? src
      : src.startsWith('/')
        ? `${STORE_ORIGIN}${src}`
        : `${STORE_ORIGIN}/${src}`;
    images.push(abs);
  });

  const username = $op.find('.message-name').first().text().trim() || null;
  const postedAt = $op.find('.message-attribution time').first().attr('datetime') || null;

  let sold = false;
  let soldAt = null;
  $messages.each((_, el) => {
    if (sold) return;
    const $msg = $(el);
    const $msgBody = $msg.find('.bbWrapper').first();
    if ($msgBody.length === 0) return;
    const $clone = $msgBody.clone();
    $clone.find('blockquote').remove();
    const text = $clone.text() || '';
    const hit = text.split(/[\r\n]+/).some((line) => SOLD_LINE_RE.test(line.trim()));
    if (hit) {
      sold = true;
      soldAt = $msg.find('.message-attribution time').first().attr('datetime') || null;
    }
  });

  return { bodyHtml, bodyText, images, username, postedAt, sold, soldAt };
}

/**
 * Tiered price extraction. Prefers the first $-denominated figure in the
 * title; falls back to the first $-figure in the body text. Null if neither.
 */
function extractPriceCents(title, bodyText) {
  const pattern = /\$\s*([\d,]+(?:\.\d{1,2})?)/;
  const candidates = [title, bodyText];
  for (const source of candidates) {
    if (!source) continue;
    const m = source.match(pattern);
    if (!m) continue;
    const n = Number(m[1].replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0 && n < 1_000_000) return Math.round(n * 100);
  }
  return null;
}

function isSkippable(thread) {
  if (!thread) return true;
  if (thread.sticky) return true;
  if (thread.sold) return true;
  if (BLOCKED_THREAD_IDS.has(thread.threadId)) return true;
  // Acronym prefixes — the overwhelming convention for want-to-buy posts.
  if (/^\s*(WTB|WTT|ISO)\b/i.test(thread.title)) return true;
  // Spelled-out variants users sometimes reach for instead of the acronyms.
  if (/\b(want\s+to\s+buy|looking\s+for|in\s+search\s+of)\b/i.test(thread.title)) return true;
  // Explicit "FOUND"/"CLOSED" edits sometimes used as SOLD markers.
  if (/\b(FOUND|CLOSED)\b/i.test(thread.title)) return true;
  return false;
}

function parsePostedAt(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return null;
  return admin.firestore.Timestamp.fromDate(d);
}

function capDescription(text) {
  if (!text) return null;
  if (text.length <= MAX_DESCRIPTION_CHARS) return text;
  return text.slice(0, MAX_DESCRIPTION_CHARS - 15) + ' …[truncated]';
}

// ---------------------------------------------------------------------------
// Record shaping
// ---------------------------------------------------------------------------

/**
 * Full record for a newly-discovered thread. Includes parsed OP body,
 * images, price, and heuristic classifications — enough to feed the
 * normalizer on first ingest.
 */
function toFullRecord({ thread, opData }) {
  const title = thread.title;
  const bodyText = opData.bodyText || '';
  const description = capDescription(bodyText);
  const priceCents = extractPriceCents(title, bodyText);
  const postedAt = parsePostedAt(thread.postedAt || opData.postedAt);
  const lastPostAt = parsePostedAt(thread.lastPostAt);
  const soldAt = parsePostedAt(opData.soldAt);
  // Bracket-tag location parse: title first (most likely), then leading body
  // window. Hit rate ~40-60% — most posts don't tag location, and that's fine
  // (those land in "Other"). See `functions/ingest/location.js`.
  const locationState = parseLocationTag(title) || parseLocationTag(bodyText);

  const listing = {
    source: SOURCE,
    source_id: thread.threadId,
    source_url: `${STORE_ORIGIN}${thread.href}`,
    title_raw: title,
    description_raw: description,
    price_cents: priceCents,
    currency: 'USD',
    condition_raw: null,
    images: opData.images || [],
    posted_at: postedAt,
    last_post_at: lastPostAt,
    tags: [`smc_author:${thread.author || 'unknown'}`],
    heuristic_brand: extractBrand(`${title} ${bodyText}`),
    heuristic_type: extractType(`${title} ${bodyText}`),
    canonical_brand: null,
    canonical_type: null,
    canonical_model: null,
    canonical_size: null,
    era_estimate: null,
    location_state: locationState,
    location_display: locationState,
  };
  if (opData.sold) {
    listing.status = 'sold';
    listing.sold_at = soldAt || admin.firestore.Timestamp.now();
  }

  const raw = {
    thread_id: thread.threadId,
    slug: thread.slug,
    title: title,
    href: thread.href,
    author: thread.author,
    op_username: opData.username,
    body_html: opData.bodyHtml,
    body_text: bodyText,
    images: opData.images,
    posted_at_list: thread.postedAt,
    posted_at_op: opData.postedAt,
    last_post_at: thread.lastPostAt,
    sold: opData.sold,
    sold_at: opData.soldAt,
  };

  return { listing, raw, raw_format: RAW_FORMAT };
}

// ---------------------------------------------------------------------------
// Touching already-ingested threads
// ---------------------------------------------------------------------------

/**
 * Load source_id + last_post_at + status for every currently-ingested
 * Sawmill Creek doc. Used to decide which threads need a detail fetch vs. a
 * last_seen_at touch, AND which already-known threads have been bumped
 * (last_post_at advanced) and need a re-fetch + sold scan.
 *
 * Returns Map<source_id, {lastPostAtMs:number|null, status:string|null}>.
 */
async function getKnownThreadsMeta() {
  const db = admin.firestore();
  const snap = await db
    .collection('externalListings')
    .where('source', '==', SOURCE)
    .select('source_id', 'last_post_at', 'status')
    .get();
  const meta = new Map();
  snap.docs.forEach((d) => {
    const data = d.data();
    if (!data.source_id) return;
    const lp = data.last_post_at;
    const lastPostAtMs = lp && typeof lp.toMillis === 'function' ? lp.toMillis() : null;
    meta.set(data.source_id, { lastPostAtMs, status: data.status || null });
  });
  return meta;
}

/**
 * Refresh `last_seen_at` + `scraped_at` + `title_raw` + `last_post_at` on
 * already-ingested threads that we re-saw in this run. Intentionally
 * narrower than upsertListings: we don't touch description_raw, images,
 * price_cents, or the raw payload — those came from the first detail fetch.
 *
 * Bumped threads (with sold-scan re-fetch) take a separate write path —
 * see processBumpedThreads.
 */
async function touchKnownListings(threads, runStartedAt) {
  if (!Array.isArray(threads) || threads.length === 0) return { touched: 0 };
  const db = admin.firestore();
  const col = db.collection('externalListings');
  const CHUNK = 200;
  let touched = 0;
  for (let i = 0; i < threads.length; i += CHUNK) {
    const chunk = threads.slice(i, i + CHUNK);
    const batch = db.batch();
    for (const t of chunk) {
      const docId = `${SOURCE}__${t.threadId}`;
      const update = {
        status: 'active',
        scraped_at: runStartedAt,
        last_seen_at: runStartedAt,
        title_raw: t.title,
      };
      const lp = parsePostedAt(t.lastPostAt);
      if (lp) update.last_post_at = lp;
      batch.update(col.doc(docId), update);
    }
    await batch.commit();
    touched += chunk.length;
  }
  return { touched };
}

/**
 * Re-fetch threads whose list-view last_post_at advanced past what we have
 * stored, run sold detection across every post, and write the result.
 *
 * On first run after this code ships, threads have no stored last_post_at;
 * those are also treated as bumped so we eventually scan every existing
 * thread for SOLD markers we missed pre-fix. The MAX_BUMP_RECHECKS_PER_RUN
 * cap prevents the cold-deploy backlog from blowing the function timeout.
 */
async function processBumpedThreads(threads, runStartedAt) {
  if (!Array.isArray(threads) || threads.length === 0) {
    return { rechecked: 0, flipped_sold: 0 };
  }
  const db = admin.firestore();
  const col = db.collection('externalListings');
  let rechecked = 0;
  let flipped_sold = 0;

  for (let i = 0; i < threads.length; i += 1) {
    const t = threads[i];
    if (i > 0) await sleep(THREAD_FETCH_DELAY_MS);
    let opData = null;
    try {
      const html = await fetchThreadPage(t.href);
      opData = parseThreadOP(html);
    } catch (err) {
      console.error(`[sawmillcreek] bump re-fetch failed ${t.threadId}: ${err.message}`);
      continue;
    }
    const docId = `${SOURCE}__${t.threadId}`;
    const update = {
      scraped_at: runStartedAt,
      last_seen_at: runStartedAt,
      title_raw: t.title,
    };
    const lp = parsePostedAt(t.lastPostAt);
    if (lp) update.last_post_at = lp;
    if (opData.sold) {
      update.status = 'sold';
      update.sold_at = parsePostedAt(opData.soldAt) || runStartedAt;
      flipped_sold += 1;
    } else {
      update.status = 'active';
    }
    try {
      await col.doc(docId).update(update);
      rechecked += 1;
    } catch (err) {
      console.error(`[sawmillcreek] bump update failed ${t.threadId}: ${err.message}`);
    }
  }

  return { rechecked, flipped_sold };
}

// ---------------------------------------------------------------------------
// Scrape orchestration
// ---------------------------------------------------------------------------

/**
 * Walk forum listing pages, collect unique candidate threads (non-skippable).
 *
 * Stops at the first page that returns zero non-sticky threads OR at the
 * first page where EVERY thread ID was already seen on an earlier page.
 * The second condition is critical: XenForo silently re-serves the last
 * valid page for any page number beyond the true max (no 404, no redirect),
 * so naive walking runs forever collecting the same tail over and over.
 */
async function listSweep({ maxPages = MAX_LIST_PAGES_DEFAULT } = {}) {
  const all = [];
  const seenIds = new Set();

  for (let page = 1; page <= maxPages; page += 1) {
    if (page > 1) await sleep(LIST_PAGE_DELAY_MS);
    const html = await fetchForumPage(page);
    const threads = parseThreadList(html);
    const nonSticky = threads.filter((t) => !t.sticky);
    if (nonSticky.length === 0) break;

    // Page-end detector: if every thread on this page was already seen on
    // an earlier page, XenForo is echoing the last real page. Stop.
    const anyNew = nonSticky.some((t) => !seenIds.has(t.threadId));
    if (!anyNew) break;

    for (const t of threads) {
      if (isSkippable(t)) continue;
      if (seenIds.has(t.threadId)) continue;
      seenIds.add(t.threadId);
      all.push(t);
    }
  }
  return all;
}

/**
 * Full scrape: list sweep → split into (new, known) → fetch detail for new
 * threads only → touch known → return records + metadata for the
 * orchestrator to hand to upsertListings / markExpired.
 *
 * @param {object} [opts]
 * @param {number} [opts.maxPages]
 * @param {number} [opts.maxNewThreads] — cap on detail fetches per run
 * @param {boolean} [opts.skipFirestoreLookup] — dry-run: treat all threads as new
 */
async function scrapeAll(opts = {}) {
  const { maxPages, maxNewThreads, skipFirestoreLookup = false, maxBumpRechecks = MAX_BUMP_RECHECKS_PER_RUN } = opts;

  const allThreads = await listSweep({ maxPages });

  const knownMeta = skipFirestoreLookup ? new Map() : await getKnownThreadsMeta();
  const newThreads = allThreads.filter((t) => !knownMeta.has(t.threadId));
  const knownThreads = allThreads.filter((t) => knownMeta.has(t.threadId));

  // Partition known into "bumped" (last_post_at advanced or never recorded)
  // and "unbumped" (just touch). Skip docs already terminal — re-checking
  // sold/excluded threads burns budget for no win.
  const bumpedAll = [];
  const unbumped = [];
  for (const t of knownThreads) {
    const meta = knownMeta.get(t.threadId);
    if (meta && (meta.status === 'sold' || meta.status === 'excluded_non_tool')) {
      unbumped.push(t);
      continue;
    }
    const listMs = t.lastPostAt ? Date.parse(t.lastPostAt) : null;
    const storedMs = meta ? meta.lastPostAtMs : null;
    const bumped = listMs != null && (storedMs == null || listMs > storedMs);
    if (bumped) bumpedAll.push(t);
    else unbumped.push(t);
  }
  bumpedAll.sort((a, b) => Date.parse(b.lastPostAt || 0) - Date.parse(a.lastPostAt || 0));
  const toRecheck = bumpedAll.slice(0, maxBumpRechecks);
  const deferredFromBumpCap = bumpedAll.length - toRecheck.length;
  const unbumpedWithDeferred = unbumped.concat(bumpedAll.slice(maxBumpRechecks));

  const toFetch = maxNewThreads != null ? newThreads.slice(0, maxNewThreads) : newThreads;

  const newRecords = [];
  for (let i = 0; i < toFetch.length; i += 1) {
    const thread = toFetch[i];
    if (i > 0) await sleep(THREAD_FETCH_DELAY_MS);
    try {
      const html = await fetchThreadPage(thread.href);
      const opData = parseThreadOP(html);
      const record = toFullRecord({ thread, opData });
      newRecords.push(record);
    } catch (err) {
      // Per-thread failures shouldn't poison the whole run; log and continue.
      console.error(`[sawmillcreek] thread fetch failed ${thread.threadId}: ${err.message}`);
    }
  }

  return {
    scraped: allThreads.length,
    newRecords,
    knownThreads: unbumpedWithDeferred,
    bumpedThreads: toRecheck,
    skippedDueToCap: newThreads.length - toFetch.length,
    deferredFromBumpCap,
  };
}

/**
 * Orchestrates a full ingestion run: list sweep → detail fetch for new →
 * upsert new → touch known → mark expired.
 *
 * @param {object} [opts]
 * @param {number} [opts.maxPages]
 * @param {number} [opts.maxNewThreads]
 */
async function runIngestion(opts = {}) {
  const runStartedAt = admin.firestore.Timestamp.now();
  const t0 = Date.now();

  const { scraped, newRecords, knownThreads, bumpedThreads, skippedDueToCap, deferredFromBumpCap } = await scrapeAll(opts);

  const upsertSummary = await upsertListings(newRecords, runStartedAt);
  const bumpSummary = await processBumpedThreads(bumpedThreads, runStartedAt);
  const touchSummary = await touchKnownListings(knownThreads, runStartedAt);

  // Only sweep for expiries when we believe we saw the full forum (no
  // maxPages or maxNewThreads caps). Otherwise we'd falsely expire active
  // threads we didn't reach.
  const shouldSweep = !opts.maxPages && opts.maxNewThreads == null;
  const expireSummary = shouldSweep
    ? await markExpired(SOURCE, runStartedAt)
    : { expired: 0 };

  return {
    source: SOURCE,
    scraped,
    inserted: upsertSummary.inserted,
    updated: upsertSummary.updated,
    touched: touchSummary.touched,
    rechecked: bumpSummary.rechecked,
    flipped_sold: bumpSummary.flipped_sold,
    expired: expireSummary.expired,
    skipped_due_to_cap: skippedDueToCap,
    deferred_from_bump_cap: deferredFromBumpCap,
    sweep_skipped: !shouldSweep,
    durationMs: Date.now() - t0,
    runStartedAt: runStartedAt.toDate(),
  };
}

module.exports = {
  SOURCE,
  RAW_FORMAT,
  SOLD_LINE_RE,
  runIngestion,
  scrapeAll,
  listSweep,
  parseThreadList,
  parseThreadOP,
  toFullRecord,
  extractPriceCents,
  isSkippable,
  fetchForumPage,
  fetchThreadPage,
  processBumpedThreads,
};
