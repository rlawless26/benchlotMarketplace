/**
 * Woodnet Classifieds ingestion adapter.
 *
 * Woodnet runs MyBB. The "Tool Swap N' Sell" classifieds forum at
 * /forumdisplay.php?fid=4 is fully public — no login wall for reading thread
 * lists or individual threads. Inventory skews power-tool heavy (Festool,
 * Delta, Powermatic, etc.) — complementary to Sawmill Creek's hand-tool focus.
 *
 * Same two-phase scrape pattern as Sawmill Creek:
 *   1. List sweep — walk forum listing pages (~3-5 pages × 23 threads each)
 *      and collect metadata for every non-skippable thread.
 *   2. Selective detail fetch — for threads we've NEVER seen before, fetch
 *      the individual thread page to extract OP body + price + images.
 *      Threads we've already ingested get a light "touch" (refresh
 *      last_seen_at + title) with no body re-fetch.
 *
 * MyBB quirks relative to XenForo (Sawmill Creek):
 *   - Post order on showthread.php is ALWAYS chronological, OP first. The
 *     first `.post.classic` div on a thread page IS the OP, regardless of
 *     the "#N" label shown next to it (Woodnet's counter is offset — often
 *     shows #2 for the OP).
 *   - Thread list uses `tr.inline_row` with `td.forumdisplay_regular` (regular
 *     threads) vs `td.forumdisplay_sticky` (pinned meta threads to skip).
 *   - Start date lives in `span.thread_start_datetime span[title]` — the
 *     `title` attribute has the full timestamp ("04-23-2026, 09:21 PM");
 *     the visible text may be relative ("50 minutes ago").
 *   - Attachments use relative paths like `attachment.php?aid=XXX`; resolve
 *     against STORE_ORIGIN.
 *   - Prices often HTML-entity-encoded (`&#36;1000`) — cheerio `.text()`
 *     decodes before our regex runs, so no special handling needed.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');

const { upsertListings, markExpired } = require('./externalListings');
const { extractBrand, extractType } = require('./heuristics');
const { parseLocationTag } = require('./location');

const SOURCE = 'woodnet';
const RAW_FORMAT = 'woodnet_thread';
const STORE_ORIGIN = 'https://forums.woodnet.net';
const CLASSIFIEDS_FID = 4;
const FORUM_URL = `${STORE_ORIGIN}/forumdisplay.php?fid=${CLASSIFIEDS_FID}`;
const REQUEST_TIMEOUT_MS = 30000;
const USER_AGENT = 'Mozilla/5.0 (compatible; BenchlotIngestion/1.0; +https://benchlot.com)';

// Politeness delays — community forum, not a commercial API.
const LIST_PAGE_DELAY_MS = 500;
const THREAD_FETCH_DELAY_MS = 2000;

// Soft safety cap — refuse to walk past this many listing pages in one run
// even if more exist. Woodnet classifieds has ~282 total pages of history,
// but most old threads are SOLD and we only want recent active inventory.
const MAX_LIST_PAGES_DEFAULT = 20;

// Cap OP body at 5000 chars before storing in description_raw. Enough
// context for the normalizer; keeps Firestore doc size reasonable.
const MAX_DESCRIPTION_CHARS = 5000;

// Per-run cap on bumped-thread re-fetches. Bumped = list-view last_post_at
// has advanced past what we previously stored (or we never recorded one — the
// case for every doc on the first run after this code ships). With ~226
// threads tracked and the backlog draining at this rate, a cold deploy clears
// in ~5 daily runs; steady-state bumps are well under the cap.
const MAX_BUMP_RECHECKS_PER_RUN = 50;

// A line is treated as a SOLD marker only if it contains nothing but the
// word SOLD plus optional decorations (`---SOLD--`, `**SOLD**`, `[SOLD]`,
// `SOLD!`). Conservative on purpose — false positives lose us live inventory,
// false negatives are recoverable on the next bump or via markExpired.
const SOLD_LINE_RE = /^[\s\-*=_~!.<>[\]]*SOLD[\s\-*=_~!.<>[\]]*$/i;

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
  const url = pageNum === 1 ? FORUM_URL : `${FORUM_URL}&page=${pageNum}`;
  const resp = await http.get(url);
  if (typeof resp.data !== 'string') {
    throw new Error(`[woodnet] unexpected list-page response (${typeof resp.data})`);
  }
  return resp.data;
}

async function fetchThreadPage(href) {
  const url = href.startsWith('http') ? href : `${STORE_ORIGIN}/${href.replace(/^\//, '')}`;
  const resp = await http.get(url);
  if (typeof resp.data !== 'string') {
    throw new Error(`[woodnet] unexpected thread response for ${href}`);
  }
  return resp.data;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse a "MM-DD-YYYY, HH:MM AM/PM" string (Woodnet's thread_start_datetime
 * format) into a Date. Returns null on any parse failure.
 */
function parseWoodnetDate(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.match(/^(\d{2})-(\d{2})-(\d{4}),\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
  if (!m) return null;
  const [, mm, dd, yyyy, hhStr, mins, ampm] = m;
  let hh = Number(hhStr);
  if (ampm.toUpperCase() === 'PM' && hh !== 12) hh += 12;
  if (ampm.toUpperCase() === 'AM' && hh === 12) hh = 0;
  // Woodnet displays times in US Eastern (server TZ). Treating as UTC is
  // slightly off, but date-of-posting granularity is what the product cares
  // about — a 4-5 hour skew won't affect any downstream filter.
  const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), hh, Number(mins)));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Parse thread metadata from a classifieds forum listing page.
 * Returns array of { threadId, title, href, postedAt, sticky, sold, author }.
 */
function parseThreadList(html) {
  const $ = cheerio.load(html);
  const threads = [];

  $('tr.inline_row').each((_, el) => {
    const $row = $(el);

    // Sticky rows carry `forumdisplay_sticky` on every td; regular rows have
    // `forumdisplay_regular`. The skip flag matters because stickies are
    // rules/FAQ threads, not listings.
    const sticky = $row.find('td.forumdisplay_sticky').length > 0;

    // The thread title span uses `subject_new` for unread, `subject_old` for
    // read. Both wrap an <a> pointing at showthread.php with the tid.
    const $titleLink = $row.find('span[id^="tid_"] a').first();
    if ($titleLink.length === 0) return;

    const title = $titleLink.text().trim();
    const href = $titleLink.attr('href') || '';
    // Prefer the id attribute on the wrapper span (tid_NNN) over regex'ing
    // the href — the span id is the stable shape, href may carry extra
    // params like `&page=2` for multi-page threads.
    const $tidWrapper = $row.find('span[id^="tid_"]').first();
    const tidId = $tidWrapper.attr('id') || '';
    const threadId = tidId.replace(/^tid_/, '');
    if (!threadId || !/^\d+$/.test(threadId)) return;

    const author = $row.find('span.author.smalltext a').first().text().trim() || null;

    // The "title" attribute on the inner span is always the full absolute
    // timestamp; the visible text is often a relative string ("50 minutes
    // ago"). Use the title attr.
    const dateTitle = $row.find('span.thread_start_datetime.smalltext span[title]').first().attr('title')
      || $row.find('span.thread_start_datetime.smalltext').first().text().trim();
    const postedAt = parseWoodnetDate(dateTitle);

    const sold = /\bSOLD\b/i.test(title);

    // Last-post date lives in `span.lastpost`; the `.text()` of that span
    // also slurps up "Last Post: <username>", so regex-extract the
    // MM-DD-YYYY, HH:MM AM/PM substring rather than trusting first-text-node.
    const lastpostText = $row.find('span.lastpost').first().text() || '';
    const lpMatch = lastpostText.match(/(\d{2}-\d{2}-\d{4},\s+\d{1,2}:\d{2}\s+(?:AM|PM))/i);
    const lastPostAt = lpMatch ? parseWoodnetDate(lpMatch[1]) : null;

    threads.push({
      threadId,
      title,
      href: `/showthread.php?tid=${threadId}`,
      postedAt: postedAt ? postedAt.toISOString() : null,
      lastPostAt: lastPostAt ? lastPostAt.toISOString() : null,
      sticky,
      sold,
      author,
    });
  });

  return threads;
}

/**
 * Parse OP (first post) from a showthread.php page, plus a sold check across
 * every post in the thread.
 *
 * Returns { bodyHtml, bodyText, images, username, postedAt, sold, soldAt }.
 *
 * Regardless of what number the first post's display label says, the FIRST
 * `.post.classic` div on the page IS the OP — verified on tid=7380609
 * (11 posts, dates chronological with OP on top) and tid=7380765 (zero
 * replies, OP visible as "#2" due to Woodnet's counter offset).
 *
 * Sold detection walks every post, strips quoted blockquote content (so a
 * reply that quotes "SOLD" doesn't trigger), and matches each line against
 * SOLD_LINE_RE — only lines that are nothing-but-SOLD-plus-decorations count.
 * `soldAt` is the post date of the first matching post.
 */
function parseThreadOP(html) {
  const $ = cheerio.load(html);
  const $posts = $('div.post.classic');
  const empty = { bodyHtml: null, bodyText: null, images: [], username: null, postedAt: null, sold: false, soldAt: null };
  if ($posts.length === 0) return empty;

  const $op = $posts.first();
  const $body = $op.find('div.post_body').first();

  const bodyHtml = $body.html() || null;
  const bodyText = ($body.text() || '').replace(/\s+/g, ' ').trim();

  const images = [];

  // Inline images inside the post body (external or embedded attachments).
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

  // Attached files fieldset — these are the most common image location on
  // Woodnet listings. Each attachment is an <img src="attachment.php?aid=N">.
  $op.find('fieldset .post-image-box img.attachment').each((_, img) => {
    const src = $(img).attr('src');
    if (!src) return;
    const abs = src.startsWith('http')
      ? src
      : src.startsWith('/')
        ? `${STORE_ORIGIN}${src}`
        : `${STORE_ORIGIN}/${src}`;
    if (!images.includes(abs)) images.push(abs);
  });

  const username = $op.find('.author_information strong span.largetext a').first().text().trim()
    || $op.find('.author_information a').first().text().trim()
    || null;

  const dateTitle = $op.find('span.post_date span[title]').first().attr('title')
    || $op.find('span.post_date').first().text().trim();
  const postedAtDate = parseWoodnetDate(dateTitle);
  const postedAt = postedAtDate ? postedAtDate.toISOString() : null;

  let sold = false;
  let soldAt = null;
  $posts.each((_, el) => {
    if (sold) return;
    const $post = $(el);
    const $postBody = $post.find('div.post_body').first();
    if ($postBody.length === 0) return;
    const $clone = $postBody.clone();
    $clone.find('blockquote').remove();
    const text = $clone.text() || '';
    const hit = text.split(/[\r\n]+/).some((line) => SOLD_LINE_RE.test(line.trim()));
    if (hit) {
      sold = true;
      const dt = $post.find('span.post_date span[title]').first().attr('title')
        || $post.find('span.post_date').first().text().trim();
      const d = parseWoodnetDate(dt);
      soldAt = d ? d.toISOString() : null;
    }
  });

  return { bodyHtml, bodyText, images, username, postedAt, sold, soldAt };
}

/**
 * Tiered price extraction. Prefers the first $-denominated figure in the
 * title; falls back to the first $-figure in the body text. Null if neither.
 * Cheerio `.text()` already decodes `&#36;` → `$`, so a plain dollar-sign
 * regex is sufficient.
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
  // "FREE" giveaways — Woodnet convention, no price, not a listing we can
  // show in the honey-price column. Also carry zero commercial intent.
  if (/^\s*FREE\b/i.test(thread.title)) return true;
  // Acronym prefixes — WTB/WTT/ISO cover the common want-to-buy conventions.
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
  const locationState = parseLocationTag(title) || parseLocationTag(bodyText);

  const listing = {
    source: SOURCE,
    source_id: thread.threadId,
    source_url: `${STORE_ORIGIN}/showthread.php?tid=${thread.threadId}`,
    title_raw: title,
    description_raw: description,
    price_cents: priceCents,
    currency: 'USD',
    condition_raw: null,
    images: opData.images || [],
    posted_at: postedAt,
    last_post_at: lastPostAt,
    tags: [`wn_author:${thread.author || 'unknown'}`],
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
 * Woodnet doc. Used to decide which threads need a detail fetch vs. just a
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
 * already-ingested threads that we re-saw in this run. Narrower than
 * upsertListings: we don't touch description_raw, images, price_cents, or
 * the raw payload; those came from the first detail fetch.
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
 * cap prevents the cold-deploy backlog from blowing the function timeout
 * (cleared in ~5 daily runs at the cap).
 *
 * Output writes always update last_post_at; sold-detected threads also flip
 * status='sold' and stamp sold_at (post date if parseable, else now). All
 * bumped threads get the standard touch fields here too (last_seen_at,
 * scraped_at, title_raw) so the caller's touch path can skip them.
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
      console.error(`[woodnet] bump re-fetch failed ${t.threadId}: ${err.message}`);
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
      console.error(`[woodnet] bump update failed ${t.threadId}: ${err.message}`);
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
 * first page where every thread ID was already seen on an earlier page (MyBB
 * may echo the last page for out-of-range page numbers — the Sawmill Creek
 * equivalent check caught an identical XenForo quirk, so carry the defense
 * here too).
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

  // Partition known threads into "bumped" (last_post_at advanced past stored,
  // OR no stored value yet) and "unbumped" (we can just touch). Skip docs
  // already terminal — re-checking sold/excluded threads burns budget for no
  // win, and we don't want to flip a non-tool back to active.
  const bumpedAll = [];
  const unbumped = [];
  for (const t of knownThreads) {
    const meta = knownMeta.get(t.threadId);
    if (meta && (meta.status === 'sold' || meta.status === 'excluded_non_tool')) {
      // Still touch it so it stays "seen" (markExpired ignores non-active rows
      // anyway, but the touch keeps last_seen_at honest for audit).
      unbumped.push(t);
      continue;
    }
    const listMs = t.lastPostAt ? Date.parse(t.lastPostAt) : null;
    const storedMs = meta ? meta.lastPostAtMs : null;
    const bumped = listMs != null && (storedMs == null || listMs > storedMs);
    if (bumped) bumpedAll.push(t);
    else unbumped.push(t);
  }
  // Prioritize most-recently-bumped first so a backlog drains usefully.
  bumpedAll.sort((a, b) => Date.parse(b.lastPostAt || 0) - Date.parse(a.lastPostAt || 0));
  const toRecheck = bumpedAll.slice(0, maxBumpRechecks);
  const deferredFromBumpCap = bumpedAll.length - toRecheck.length;
  // Threads we won't re-fetch this run still need their last_seen_at refreshed.
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
      console.error(`[woodnet] thread fetch failed ${thread.threadId}: ${err.message}`);
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
 */
async function runIngestion(opts = {}) {
  const runStartedAt = admin.firestore.Timestamp.now();
  const t0 = Date.now();

  const { scraped, newRecords, knownThreads, bumpedThreads, skippedDueToCap, deferredFromBumpCap } = await scrapeAll(opts);

  const upsertSummary = await upsertListings(newRecords, runStartedAt);
  const bumpSummary = await processBumpedThreads(bumpedThreads, runStartedAt);
  const touchSummary = await touchKnownListings(knownThreads, runStartedAt);

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
  parseWoodnetDate,
  toFullRecord,
  extractPriceCents,
  isSkippable,
  fetchForumPage,
  fetchThreadPage,
  processBumpedThreads,
};
