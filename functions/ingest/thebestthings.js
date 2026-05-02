/**
 * The Best Things (Bob Kaune) ingestion adapter.
 *
 * Static HTML catalog at thebestthings.com — old-school table-based markup
 * (HTML 3.0 doctype, Apache, Perl CGI for cart). No Shopify, no JSON, no
 * per-item URLs. The vintage tools section is split across 8 category
 * pages (infill, chisels, measurin, misctool, molding, saws, stanley,
 * woodplan); each page lists every in-stock item in that category as a
 * sequence of `<H4>` thumbnail blocks followed by `<form action="/cgi/cart/additem.pl">`
 * blocks containing hidden inputs we can pull (product_id, price, name).
 *
 * Newtools (their new-tool retail) and knives (cutlery) are skipped at the
 * source list — Benchlot indexes used woodworking tools, not new retail or
 * pocket knives. Books are also off-list.
 *
 * Sold items disappear from the HTML when Bob removes them — the existing
 * markExpired() sweep flips unseen listings to expired, identical to the
 * Hyperkitten model.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');

const { upsertListings, markExpired } = require('./externalListings');
const { extractBrand, extractType } = require('./heuristics');

const SOURCE = 'thebestthings';
const RAW_FORMAT = 'thebestthings_item';
const STORE_ORIGIN = 'https://www.thebestthings.com';
const REQUEST_TIMEOUT_MS = 30000;
const REQUEST_DELAY_MS = 500; // politeness between category-page fetches
const USER_AGENT = 'Mozilla/5.0 (compatible; BenchlotIngestion/1.0; +https://benchlot.com)';

// Vintage / antique woodworking tool categories on TBT. Page slugs map
// directly to their .htm filenames at the site root. Newtools and knives
// are intentionally excluded.
const CATEGORIES = [
  { slug: 'infill',   page: 'infill.htm',   label: 'Infill & British Metal Planes' },
  { slug: 'chisels',  page: 'chisels.htm',  label: 'Chisels' },
  { slug: 'measurin', page: 'measurin.htm', label: 'Measuring Tools' },
  { slug: 'misctool', page: 'misctool.htm', label: 'Misc. Tools' },
  { slug: 'molding',  page: 'molding.htm',  label: 'Molding Planes' },
  { slug: 'saws',     page: 'saws.htm',     label: 'Saws' },
  { slug: 'stanley',  page: 'stanley.htm',  label: 'Stanley Tools' },
  { slug: 'woodplan', page: 'woodplan.htm', label: 'Wooden Planes' },
];

// Cap description text before storing — same convention as the forum
// adapters. Enough context for the normalizer; bounded Firestore doc size.
const MAX_DESCRIPTION_CHARS = 5000;

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

async function fetchCategoryPage(page) {
  const url = `${STORE_ORIGIN}/${page}`;
  const resp = await http.get(url);
  if (typeof resp.data !== 'string' || resp.data.length < 500) {
    throw new Error(`[thebestthings] unexpected response for ${page} (${typeof resp.data}, ${resp.data?.length ?? 0} bytes)`);
  }
  return resp.data;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parsePriceToCents(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/[$,\s]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) return null;
  return Math.round(n * 100);
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function capDescription(text) {
  if (!text) return null;
  if (text.length <= MAX_DESCRIPTION_CHARS) return text;
  return text.slice(0, MAX_DESCRIPTION_CHARS - 15) + ' …[truncated]';
}

/**
 * Walk backwards from a form to find the immediately-preceding `<H4>`
 * gallery block. TBT puts thumbnails in an H4 above each item's form;
 * the gallery thumbnails follow the pattern `<id>.jpg` / `<id>_tn.jpg`
 * where the lowercase product_id is the prefix. Returns image URLs in
 * full-size form (drops the `_tn` suffix).
 */
function extractImagesForForm($, $form, productId) {
  const out = [];
  const seen = new Set();

  // Try the immediately-preceding H4 first (the canonical TBT pattern).
  let $h4 = $form.parent().prev('h4');
  if ($h4.length === 0) {
    // Some items wrap the form in <P>; try walking up one more level.
    $h4 = $form.parent().parent().prev('h4');
  }

  const collect = ($scope) => {
    $scope.find('img').each((_, img) => {
      const src = $(img).attr('src');
      if (!src) return;
      // Drop `_tn` suffix to get full-size URL.
      const fullSrc = src.replace(/_tn(\.[a-z]+)$/i, '$1');
      const abs = fullSrc.startsWith('http')
        ? fullSrc
        : fullSrc.startsWith('/')
          ? `${STORE_ORIGIN}${fullSrc}`
          : `${STORE_ORIGIN}/${fullSrc}`;
      if (!seen.has(abs)) {
        seen.add(abs);
        out.push(abs);
      }
    });
  };

  if ($h4.length > 0) {
    collect($h4);
  } else if (productId) {
    // Fallback: scan the whole document for images whose src contains the
    // product_id (case-insensitive). Catches the rare case where TBT's
    // markup deviates from the H4 + form pattern.
    const idLower = productId.toLowerCase();
    $(`img[src*="${idLower}"]`).each((_, img) => {
      const src = $(img).attr('src');
      if (!src) return;
      const fullSrc = src.replace(/_tn(\.[a-z]+)$/i, '$1');
      const abs = fullSrc.startsWith('http')
        ? fullSrc
        : fullSrc.startsWith('/')
          ? `${STORE_ORIGIN}${fullSrc}`
          : `${STORE_ORIGIN}/${fullSrc}`;
      if (!seen.has(abs)) {
        seen.add(abs);
        out.push(abs);
      }
    });
  }

  return out;
}

/**
 * Extract one item record from a `<form action="/cgi/cart/additem.pl">`
 * block. Returns null when product_id or name are missing.
 *
 * Strategy:
 *   1. Pull product_id / price / name from hidden inputs.
 *   2. Reconstruct the visible description: form text minus the leading
 *      "{product_id}  {name}  " bold prefix that TBT repeats verbatim.
 *   3. Build a title as "{name} — {first ~90 chars of description}" since
 *      the `name` field alone (just a maker, e.g. "J. Buck, London")
 *      doesn't carry enough type/model signal for the normalizer.
 */
function recordFromForm($, $form, category) {
  const productId = $form.find('input[name="product_id"]').attr('value');
  const name = $form.find('input[name="name"]').attr('value');
  const priceStr = $form.find('input[name="price"]').attr('value');
  if (!productId || !name) return null;

  // Description = whole-form text, then strip the duplicated header prefix.
  const $clone = $form.clone();
  $clone.find('input').remove();
  $clone.find('img').remove();
  const rawText = $clone.text().replace(/\s+/g, ' ').trim();

  const prefixRe = new RegExp(`^${escapeRegex(productId)}\\s+${escapeRegex(name)}\\s*`, 'i');
  let description = rawText.replace(prefixRe, '').trim();

  // The visible form often ends with " {Condition}-  ${price}" — keep
  // that intact in description_raw (the normalizer can read condition
  // from it). Just bound the length.
  description = capDescription(description);

  // Title: name + first ~90 chars of description for type signal.
  // Trim trailing punctuation/dash. e.g.
  //   "J. Buck, London — This bullnose plane was made by John Holland for the retailer…"
  let titleSnippet = description ? description.slice(0, 90).trim() : '';
  // Drop the trailing condition+price tail from titleSnippet if it landed there.
  titleSnippet = titleSnippet.replace(/\s+\$[\d,]+(?:\.\d{1,2})?$/, '').trim();
  const title = titleSnippet
    ? `${name} — ${titleSnippet}${description && description.length > 90 ? '…' : ''}`
    : name;

  const images = extractImagesForForm($, $form, productId);

  // source_url: category-page-level link with a fragment of the
  // product_id, so the URL bar shows the item id even though there's
  // no anchor element to scroll to. Mirrors Hyperkitten's pattern.
  const sourceUrl = `${STORE_ORIGIN}/${category.page}#${productId}`;

  const tags = [];
  tags.push(`tbt_category:${category.slug}`);
  // The product_id prefix encodes a finer-grained category (BM=infill,
  // ST=stanley, WP=wooden plane, etc.) which the normalizer can read.
  const idPrefix = (productId.match(/^[A-Za-z]+/) || [''])[0].toLowerCase();
  if (idPrefix) tags.push(`tbt_id_prefix:${idPrefix}`);

  const listing = {
    source: SOURCE,
    source_id: productId,
    source_url: sourceUrl,
    title_raw: title,
    description_raw: description || null,
    price_cents: parsePriceToCents(priceStr),
    currency: 'USD',
    condition_raw: null, // condition is embedded in description_raw; not parsed out
    images,
    posted_at: null, // TBT doesn't expose per-item timestamps
    tags,
    heuristic_brand: extractBrand(`${name} ${description || ''}`),
    heuristic_type: extractType(`${name} ${description || ''}`),
    canonical_brand: null,
    canonical_type: null,
    canonical_model: null,
    canonical_size: null,
    era_estimate: null,
    // TBT operates out of VA (per philosop.htm / order.htm — the homepage
    // and About page never mention it). Card shows state-only — dealers
    // are named, so their hometown isn't worth surfacing.
    location_state: 'VA',
    location_display: null,
  };

  const raw = {
    product_id: productId,
    name,
    price: priceStr || null,
    category_slug: category.slug,
    category_page: category.page,
    description_text: description || null,
    images,
    form_html: $.html($form),
  };

  return { listing, raw, raw_format: RAW_FORMAT };
}

/**
 * Parse all items out of a single category page's HTML.
 */
function parseItems(html, category, opts = {}) {
  const maxItems = opts.maxItems ?? Infinity;
  const $ = cheerio.load(html);
  const records = [];

  $('form[action*="additem.pl"]').each((_i, el) => {
    if (records.length >= maxItems) return false;
    const rec = recordFromForm($, $(el), category);
    if (rec) records.push(rec);
    return undefined;
  });

  return records;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Iterate category pages, parse all items, dedupe by product_id, and return
 * the merged record list.
 *
 * @param {object} [opts]
 * @param {number} [opts.maxItems] — global cap (across all categories)
 * @param {string[]} [opts.categories] — restrict to specific category slugs
 * @returns {Promise<{records: object[], categoryStats: object[]}>}
 */
async function scrapeAll(opts = {}) {
  const { maxItems = Infinity, categories: catFilter } = opts;
  const cats = catFilter
    ? CATEGORIES.filter((c) => catFilter.includes(c.slug))
    : CATEGORIES;

  const records = [];
  const seenIds = new Set();
  const categoryStats = [];

  for (let i = 0; i < cats.length; i += 1) {
    if (records.length >= maxItems) {
      categoryStats.push({ slug: cats[i].slug, skipped: true, reason: 'global cap' });
      continue;
    }
    if (i > 0) await sleep(REQUEST_DELAY_MS);
    const cat = cats[i];
    let html;
    try {
      html = await fetchCategoryPage(cat.page);
    } catch (err) {
      console.error(`[thebestthings] fetch ${cat.page} failed: ${err.message}`);
      categoryStats.push({ slug: cat.slug, error: err.message });
      continue;
    }

    const remaining = maxItems - records.length;
    const items = parseItems(html, cat, { maxItems: remaining });
    let added = 0;
    let dupSkipped = 0;
    for (const rec of items) {
      if (seenIds.has(rec.listing.source_id)) {
        dupSkipped += 1;
        continue;
      }
      seenIds.add(rec.listing.source_id);
      records.push(rec);
      added += 1;
    }
    categoryStats.push({ slug: cat.slug, parsed: items.length, added, dup_skipped: dupSkipped });
  }

  return { records, categoryStats };
}

/**
 * Full ingestion run: scrape all categories → upsert → mark expired.
 */
async function runIngestion(opts = {}) {
  const runStartedAt = admin.firestore.Timestamp.now();
  const t0 = Date.now();

  const { records, categoryStats } = await scrapeAll(opts);
  const upsertSummary = await upsertListings(records, runStartedAt);

  // Skip expiry sweep when we ran a partial scrape (maxItems / category
  // filter) — would falsely expire items we didn't reach this run.
  const shouldSweep = !opts.maxItems && !opts.categories;
  const expireSummary = shouldSweep
    ? await markExpired(SOURCE, runStartedAt)
    : { expired: 0 };

  return {
    source: SOURCE,
    scraped: records.length,
    category_stats: categoryStats,
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
  CATEGORIES,
  STORE_ORIGIN,
  runIngestion,
  scrapeAll,
  parseItems,
  recordFromForm,
  fetchCategoryPage,
  parsePriceToCents,
};
