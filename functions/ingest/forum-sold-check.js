#!/usr/bin/env node
/**
 * Forum sold verification — did a paged-off classifieds thread actually sell?
 *
 * markExpired flips any paged-off active row to status='sold' with a stamped
 * sold_at. Sound for dealers; wrong often enough for forums, where threads
 * roll off by INACTIVITY: withdrawn and never-sold threads were entering the
 * sold-comp pool with fabricated sale dates.
 *
 * This job re-fetches each terminal forum thread (first + last page), hands
 * the post transcript to the model, and records a verdict (see
 * migration/schema/008_forum_sold_verdicts.sql):
 *
 *   sold       keep status='sold'; refine sold_at to the resolving post's
 *              date; record sold_price_cents when the thread states a
 *              realized price (a price-drop or "took $80")
 *   withdrawn  status='expired', sold_at NULL — out of the comp pool
 *   no_sale    same as withdrawn
 *   unclear    KEEP status='sold'. Forum deals close by PM all the time, so a
 *              thread going quiet is weak evidence AGAINST a sale. This
 *              preserves today's stats behaviour while making the share of
 *              unverified comps measurable for the first time.
 *   gone       thread 404s; left as-is
 *
 * Deliberately a batch CLI with a hard cost ceiling, like
 * normalize/run-postgres.js — never a per-write trigger. The cron runs it
 * after the scrapes (see .github/workflows/ingest.yml).
 *
 *   node functions/ingest/forum-sold-check.js --dry-run --limit 5
 *   node functions/ingest/forum-sold-check.js --limit 200 --max-cost 2
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const axios = require('axios');
const cheerio = require('cheerio');
const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

const DB = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!DB) { console.error('DATABASE_URL is not set'); process.exit(1); }

const MODEL = process.env.BENCHLOT_NORMALIZER_MODEL || 'claude-haiku-4-5';
// Haiku 4.5, USD per million tokens — mirrors normalize/run-postgres.js.
const PRICE = { input: 1.0, output: 5.0, cacheWrite: 1.25, cacheRead: 0.1 };

const USER_AGENT = 'Mozilla/5.0 (compatible; BenchlotIngestion/1.0; +https://benchlot.com)';
const FETCH_DELAY_MS = 2000; // politeness between thread fetches
const REQUEST_TIMEOUT_MS = 20000;

const argv = process.argv.slice(2);
const num = (flag, dflt) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? Number(argv[i + 1]) : dflt;
};
const LIMIT = num('--limit', 200);
const MAX_COST = num('--max-cost', 2);
const DRY_RUN = argv.includes('--dry-run');

const http = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'User-Agent': USER_AGENT },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------- posts -- */

/**
 * Per-source post extraction, using the same selectors as the scrapers
 * (woodnet.js is MyBB: div.post/.post_body; sawmillcreek.js is XenForo:
 * article.message/.bbWrapper). Blockquotes are stripped so quoted text never
 * reads as the quoter's statement — same rule the scrapers' SOLD scan uses.
 */
function extractPosts(html, source) {
  const $ = cheerio.load(html);
  const posts = [];
  const push = ($body, author, at) => {
    const $clone = $body.clone();
    $clone.find('blockquote').remove();
    const text = ($clone.text() || '').replace(/\s+/g, ' ').trim();
    if (text) posts.push({ author: author || null, at: at || null, text: text.slice(0, 1500) });
  };

  if (source === 'sawmillcreek') {
    $('article.message').each((_, el) => {
      const $m = $(el);
      const $body = $m.find('.bbWrapper').first();
      if (!$body.length) return;
      push(
        $body,
        $m.find('.message-name').first().text().trim(),
        $m.find('.message-attribution time').first().attr('datetime')
      );
    });
  } else {
    // woodnet (MyBB)
    $('div.post').each((_, el) => {
      const $p = $(el);
      const $body = $p.find('div.post_body').first();
      if (!$body.length) return;
      const author = $p.find('.author_information strong span.largetext a').first().text().trim()
        || $p.find('.author_information a').first().text().trim();
      const at = $p.find('span.post_date span[title]').first().attr('title')
        || $p.find('span.post_date').first().text().trim();
      push($body, author, at);
    });
  }
  return posts;
}

/** Find a last-page URL when the thread paginates; null for single-page. */
function lastPageUrl(html, source, threadUrl) {
  const $ = cheerio.load(html);
  if (source === 'sawmillcreek') {
    const href = $('.pageNav-main .pageNav-page').last().find('a').attr('href');
    if (!href) return null;
    const abs = href.startsWith('http') ? href : `https://sawmillcreek.org${href}`;
    return abs === threadUrl ? null : abs;
  }
  // MyBB supports &page=last; only worth it when pagination is present.
  if ($('.pagination a.pagination_page').length > 0) {
    return `${threadUrl}${threadUrl.includes('?') ? '&' : '?'}page=last`;
  }
  return null;
}

/** Fetch first (+ last, when paginated) page and return the post transcript. */
async function fetchThreadPosts(listing) {
  const resp = await http.get(listing.source_url, {
    validateStatus: (s) => s === 200 || s === 404 || s === 403,
  });
  if (resp.status !== 200) return { gone: true, posts: [] };

  const posts = extractPosts(resp.data, listing.source);
  if (posts.length === 0) return { gone: true, posts: [] };

  const lastUrl = lastPageUrl(resp.data, listing.source, listing.source_url);
  if (lastUrl) {
    await sleep(FETCH_DELAY_MS);
    try {
      const lastResp = await http.get(lastUrl);
      const lastPosts = extractPosts(lastResp.data, listing.source);
      // Dedupe against page 1 by (author, at, first 60 chars).
      const seen = new Set(posts.map((p) => `${p.author}|${p.at}|${p.text.slice(0, 60)}`));
      for (const p of lastPosts) {
        const k = `${p.author}|${p.at}|${p.text.slice(0, 60)}`;
        if (!seen.has(k)) posts.push(p);
      }
    } catch (e) {
      console.warn(`  last-page fetch failed (${e.message}) — classifying page 1 only`);
    }
  }
  return { gone: false, posts };
}

/* ------------------------------------------------------------ classifier -- */

const SYSTEM = `You judge whether a woodworking-forum classifieds thread's item actually sold, from the post transcript.

Reply with ONLY a JSON object:
{"verdict":"sold"|"withdrawn"|"no_sale"|"unclear","sold_price_dollars":number|null,"sold_post_at":string|null}

Rules, in order:
- The SELLER (the first post's author) is authoritative. Buyer "I'll take it" followed by seller confirmation, or any seller statement that the item sold ("SOLD", "SPF", "sold pending funds/payment", "gone to <name>", "on its way") => "sold".
- A buyer "I'll take it"/"PM sent, I'll take it" with NO contradiction later => "sold" (sellers often don't post again).
- Seller pulls the item ("no longer available", "decided to keep it", "withdrawn", "off the market") => "withdrawn".
- Thread explicitly ends unsold ("no takers, off to eBay", "relisted", "expired") => "no_sale".
- Anything else — including a thread that simply goes quiet — => "unclear". Forum deals often conclude by private message; silence is NOT evidence against a sale.
- Lots with multiple items: if ANY item clearly sold => "sold"; set sold_price_dollars only if a single total realized price is clear, else null.
- sold_price_dollars: the REALIZED price — the final asking price at the moment of sale if prices dropped during the thread, or an explicitly stated sale figure. null when not stated. Never invent one.
- sold_post_at: the timestamp string of the post that resolves the thread (copied verbatim from the transcript), else null.`;

function costOf(u) {
  return (
    ((u.input_tokens || 0) * PRICE.input +
      (u.output_tokens || 0) * PRICE.output +
      (u.cache_creation_input_tokens || 0) * PRICE.cacheWrite +
      (u.cache_read_input_tokens || 0) * PRICE.cacheRead) / 1e6
  );
}

async function classify(anthropic, listing, posts) {
  const transcript = posts
    .map((p, i) => `[post ${i}] ${p.author || '?'} @ ${p.at || '?'}\n${p.text}`)
    .join('\n\n')
    .slice(0, 24000);

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: `Title: ${listing.title_raw}\nAsking price: ${listing.price_cents != null ? `$${(listing.price_cents / 100).toFixed(2)}` : 'not stated'}\n\n${transcript}`,
    }],
  });

  const text = msg.content?.[0]?.text || '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`no JSON in response: ${text.slice(0, 120)}`);
  const out = JSON.parse(m[0]);
  if (!['sold', 'withdrawn', 'no_sale', 'unclear'].includes(out.verdict)) {
    throw new Error(`bad verdict: ${out.verdict}`);
  }
  return { ...out, cost: costOf(msg.usage || {}) };
}

/* ----------------------------------------------------------------- apply -- */

async function apply(pool, listing, result) {
  const verdict = result.verdict;
  const soldPriceCents =
    typeof result.sold_price_dollars === 'number' && result.sold_price_dollars > 0
      ? Math.round(result.sold_price_dollars * 100)
      : null;
  const soldAt = result.sold_post_at ? new Date(result.sold_post_at) : null;
  const soldAtValid = soldAt && !Number.isNaN(soldAt.getTime());

  if (verdict === 'withdrawn' || verdict === 'no_sale') {
    await pool.query(
      `UPDATE listings SET status='expired', sold_at=NULL,
              sold_verdict=$2, sold_verified_at=now()
        WHERE source=$3 AND source_id=$1`,
      [listing.source_id, verdict, listing.source]
    );
    return;
  }

  await pool.query(
    `UPDATE listings SET
        sold_verdict=$2, sold_verified_at=now(),
        sold_price_cents=COALESCE($4, sold_price_cents),
        -- A resolving-post date beats markExpired's run-time stamp.
        sold_at=COALESCE($5::timestamptz, sold_at)
      WHERE source=$3 AND source_id=$1`,
    [listing.source_id, verdict, listing.source, soldPriceCents, soldAtValid ? soldAt.toISOString() : null]
  );
}

/* ------------------------------------------------------------------ main -- */

async function main() {
  const pool = new Pool({ connectionString: DB, max: 2 });
  const anthropic = new Anthropic.Anthropic();

  const { rows: candidates } = await pool.query(
    `SELECT source, source_id, source_url, title_raw, price_cents
       FROM listings
      WHERE source IN ('woodnet','sawmillcreek')
        AND status = 'sold'
        AND sold_verdict IS NULL
        AND source_url IS NOT NULL
      ORDER BY sold_at DESC NULLS LAST
      LIMIT $1`,
    [LIMIT]
  );
  console.log(`${candidates.length} unverified sold forum threads${DRY_RUN ? ' (dry run)' : ''}`);

  let cost = 0;
  const tally = { sold: 0, withdrawn: 0, no_sale: 0, unclear: 0, gone: 0, failed: 0 };

  for (const [i, listing] of candidates.entries()) {
    if (cost >= MAX_COST) {
      console.log(`cost ceiling $${MAX_COST} reached — stopping at ${i}/${candidates.length}`);
      break;
    }
    if (i > 0) await sleep(FETCH_DELAY_MS);
    try {
      const { gone, posts } = await fetchThreadPosts(listing);
      if (gone) {
        tally.gone += 1;
        console.log(`  gone       ${listing.source}/${listing.source_id}  ${listing.title_raw.slice(0, 60)}`);
        if (!DRY_RUN) {
          await pool.query(
            `UPDATE listings SET sold_verdict='gone', sold_verified_at=now()
              WHERE source=$2 AND source_id=$1`,
            [listing.source_id, listing.source]
          );
        }
        continue;
      }
      const result = await classify(anthropic, listing, posts);
      cost += result.cost;
      tally[result.verdict] += 1;
      console.log(
        `  ${result.verdict.padEnd(10)} ${listing.source}/${listing.source_id}  ` +
        `${listing.title_raw.slice(0, 50).padEnd(50)}` +
        (result.sold_price_dollars ? `  realized $${result.sold_price_dollars}` : '')
      );
      if (!DRY_RUN) await apply(pool, listing, result);
    } catch (err) {
      tally.failed += 1;
      console.error(`  FAILED     ${listing.source}/${listing.source_id}: ${err.message}`);
    }
  }

  console.log(`\nverdicts: ${JSON.stringify(tally)}  cost: $${cost.toFixed(4)}`);
  await pool.end();
  process.exit(tally.failed > 0 && tally.failed === candidates.length ? 1 : 0);
}

main().catch((e) => { console.error('fatal:', e); process.exit(1); });
