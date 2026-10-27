#!/usr/bin/env node
/**
 * Submit changed guide URLs to IndexNow (Bing, DuckDuckGo, Yandex; ChatGPT
 * search reads Bing's index). Growth plan B11.
 *
 * URL list: the live sitemap, which is the one place that already knows which
 * pages are indexable (8+ sales, published hubs, the static pages). Change
 * detection: a hash of the figures each cluster page shows, from price_stats,
 * compared with indexnow_submissions (schema/015). The nightly rebuild rewrites
 * last_built_at on every row, so lastmod alone would resubmit everything daily,
 * which IndexNow asks you not to do.
 *
 *   node scripts/indexnow-submit.js            # changed + new URLs
 *   node scripts/indexnow-submit.js --all      # everything in the sitemap (title changes, relaunches)
 *   node scripts/indexnow-submit.js --dry-run  # print what would be sent
 *
 * Needs INDEXNOW_KEY, whose value is also the contents of
 * https://benchlot.com/<key>.txt (served from the CRA project's public/).
 */
const path = require('path');
const { createHash } = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', 'web', '.env.local') });
const { Pool } = require(path.join(__dirname, '..', 'web', 'node_modules', 'pg'));

const SITE = process.env.INDEXNOW_SITE || 'https://benchlot.com';
const HOST = new URL(SITE).host;
const KEY = process.env.INDEXNOW_KEY;
const DB = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const ALL = process.argv.includes('--all');
const DRY = process.argv.includes('--dry-run');
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const BATCH = 10_000; // API maximum per POST

if (!KEY) { console.error('INDEXNOW_KEY is not set'); process.exit(1); }
if (!DB) { console.error('DATABASE_URL is not set'); process.exit(1); }

/** URL path for a price_stats cluster key; mirrors web/lib/guide-paths.ts clusterPath(). */
function pathForKey(key) {
  const p = key.split('::');
  const third = p[3] ?? '_';
  const isModel = third.startsWith('m-');
  const t = /^t-(\d{1,2})$/.exec(p[4] ?? '');
  let out = `/guide/${p[1]}/${p[2]}`;
  if (isModel) out += `/${third.slice(2)}`;
  else if (third !== '_') out += `/${third}`;
  if (t) out += `/type-${Number(t[1])}`;
  return out;
}

(async () => {
  const res = await fetch(`${SITE}/sitemap.xml`, { headers: { 'user-agent': 'benchlot-indexnow/1.0' } });
  if (!res.ok) { console.error(`sitemap fetch failed: ${res.status}`); process.exit(1); }
  const xml = await res.text();
  const sitemapUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (sitemapUrls.length === 0) { console.error('sitemap has no URLs'); process.exit(1); }

  const pool = new Pool({ connectionString: DB, max: 2 });
  try {
    // Hash of what the page shows. Hub and static pages hash the latest build
    // time instead, so they resubmit once a day only when something rebuilt.
    const { rows } = await pool.query(
      `SELECT cluster_key, sold_count, asking_count, asking_count_active, sold_p25, sold_p50, sold_p75, asking_p25, asking_p50, asking_p75
         FROM price_stats WHERE canonical_type <> 'Other' AND canonical_brand <> 'Unknown'`
    );
    const hashByUrl = new Map();
    for (const r of rows) {
      const h = createHash('sha1').update([r.sold_count, r.asking_count, r.asking_count_active, r.sold_p25, r.sold_p50, r.sold_p75, r.asking_p25, r.asking_p50, r.asking_p75].join('|')).digest('hex').slice(0, 16);
      hashByUrl.set(`${SITE}${pathForKey(r.cluster_key)}`, h);
    }
    const { rows: [{ built }] } = await pool.query(`SELECT max(last_built_at)::date::text AS built FROM price_stats`);
    const { rows: prev } = await pool.query(`SELECT url, content_hash FROM indexnow_submissions WHERE status BETWEEN 200 AND 299`);
    const prevHash = new Map(prev.map((p) => [p.url, p.content_hash]));

    const candidates = sitemapUrls.map((url) => ({ url, hash: hashByUrl.get(url) ?? `built:${built}` }));
    const changed = ALL ? candidates : candidates.filter((c) => prevHash.get(c.url) !== c.hash);
    const matched = candidates.filter((c) => hashByUrl.has(c.url)).length;
    console.log(`sitemap ${sitemapUrls.length} urls · ${matched} matched to price_stats rows · ${changed.length} to submit${ALL ? ' (--all)' : ''}`);
    // If the key-to-path mirror drifts from guide-paths.ts, cluster URLs stop
    // matching and fall back to the daily "built" hash. Loud, not silent.
    if (matched < sitemapUrls.length * 0.8) console.warn('warning: fewer than 80% of sitemap URLs matched a price_stats row; check pathForKey()');
    if (changed.length === 0 || DRY) {
      if (DRY) console.log(changed.slice(0, 20).map((c) => c.url).join('\n') + (changed.length > 20 ? `\n… ${changed.length - 20} more` : ''));
      return;
    }

    for (let i = 0; i < changed.length; i += BATCH) {
      const slice = changed.slice(i, i + BATCH);
      const body = { host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: slice.map((c) => c.url) };
      const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
      const text = await r.text();
      console.log(`indexnow ${r.status} for ${slice.length} urls ${text ? '— ' + text.slice(0, 120) : ''}`);
      // 200 OK, 202 Accepted (key validation pending). Anything else is not a
      // submission; leave the hash alone so tomorrow retries.
      if (r.status >= 200 && r.status < 300) {
        const values = [], params = [];
        slice.forEach((c, k) => { params.push(c.url, c.hash, r.status); values.push(`($${k * 3 + 1}, $${k * 3 + 2}, $${k * 3 + 3})`); });
        await pool.query(
          `INSERT INTO indexnow_submissions (url, content_hash, status) VALUES ${values.join(',')}
           ON CONFLICT (url) DO UPDATE SET content_hash = EXCLUDED.content_hash, status = EXCLUDED.status, submitted_at = now()`,
          params
        );
      }
    }
  } finally {
    await pool.end();
  }
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
