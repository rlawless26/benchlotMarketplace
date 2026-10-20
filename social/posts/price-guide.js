/**
 * Price guide of the week.
 *
 * One (maker, tool type) cluster from price_stats with a dense enough sold
 * history to draw a quarterly-median sparkline. The numbers are the guide
 * page's numbers: the median, the middle half, the sales count, all from the
 * same rebuild_price_stats() row the page renders. The sparkline is recomputed
 * here from eligible sold rows (bl_is_lot / bl_is_junk, de-duplicated like
 * the rebuild) because price_stats holds no history.
 */
const config = require('../config');
const { sql } = require('../lib/db');
const { hashtagsFor } = require('../lib/hashtags');
const {
  slug, money, moneyRound, typePlural, clusterPhrase, clusterPhraseSingular, clusterPath, quarterLabel,
} = require('../lib/text');

const type = 'price-guide';
const label = 'Price guide of the week';

async function candidates() {
  const pg = config.priceGuide;
  const rows = await sql(
    `WITH sold AS (
       SELECT DISTINCT ON (l.canonical_type, l.canonical_brand, lower(btrim(l.title_raw)), COALESCE(l.sold_price_cents, l.price_cents))
              l.canonical_type, l.canonical_brand,
              COALESCE(l.sold_price_cents, l.price_cents) AS price_cents,
              COALESCE(l.sold_at, l.posted_at) AS dated_at
       FROM listings l
       WHERE l.status = 'sold' AND l.price_cents BETWEEN 1 AND 5000000
         AND l.canonical_type IS NOT NULL AND l.canonical_type <> 'Other'
         AND l.canonical_brand IS NOT NULL AND l.canonical_brand NOT IN ('Unknown', '')
         AND NOT bl_is_junk(l.title_raw, l.condition_raw) AND NOT bl_is_lot(l.title_raw)
         -- Complete quarters only: the current one is a few weeks of thin data
         -- that would plot as a cliff and swing the trend sentence.
         AND COALESCE(l.sold_at, l.posted_at) >= date_trunc('quarter', now()) - ($1::int * interval '3 months')
         AND COALESCE(l.sold_at, l.posted_at) <  date_trunc('quarter', now())
       ORDER BY l.canonical_type, l.canonical_brand, lower(btrim(l.title_raw)), COALESCE(l.sold_price_cents, l.price_cents),
                l.sold_at DESC NULLS LAST
     ),
     pts AS (
       SELECT canonical_type, canonical_brand, to_char(date_trunc('quarter', dated_at), 'YYYY-MM') AS q,
              count(*)::int AS n,
              (percentile_cont(0.5) WITHIN GROUP (ORDER BY price_cents) / 100.0)::numeric(12,2) AS med
       FROM sold GROUP BY 1, 2, 3
     ),
     hist AS (
       SELECT canonical_type, canonical_brand,
              count(*) FILTER (WHERE n >= $2) AS points,
              max(q) FILTER (WHERE n >= $2) AS last_q,
              jsonb_agg(jsonb_build_object('q', q, 'n', n, 'med', med) ORDER BY q) AS series
       FROM pts GROUP BY 1, 2
       HAVING count(*) FILTER (WHERE n >= $2) >= $3
     )
     SELECT ps.cluster_key, ps.canonical_type, ps.canonical_brand, ps.sold_count, ps.asking_count_active,
            ps.sold_p10, ps.sold_p25, ps.sold_p50, ps.sold_p75, ps.sold_p90, h.series, h.last_q
     FROM price_stats ps JOIN hist h USING (canonical_type, canonical_brand)
     WHERE ps.grain = 'coarse' AND ps.sold_count >= $4
       AND ps.sold_p10 IS NOT NULL AND ps.sold_p90 IS NOT NULL
     ORDER BY ps.sold_count DESC`,
    [pg.historyQuarters, pg.minPerQuarter, pg.minQuarters, pg.minSold]
  );
  // Drop clusters whose history has gone quiet: the sparkline should end
  // near today, or the card is a history lesson, not a price guide.
  const cutoff = quarterKeyAgo(pg.staleQuarters);
  return rows.filter((r) => r.last_q >= cutoff);
}

/** Key of the quarter `n` complete quarters before the current one (n=1 is the last complete quarter). */
function quarterKeyAgo(n) {
  const d = new Date();
  const q = Math.floor(d.getUTCMonth() / 3);
  const m = q * 3 - 3 * n;
  const dt = new Date(Date.UTC(d.getUTCFullYear(), m, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Quarterly medians as an SVG path, honey on spruce. Pure. */
function sparklineSvg(points, w = 936, h = 300) {
  const padX = 18, padTop = 54, padBottom = 30;
  const vals = points.map((p) => p.med);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < Math.max(1, hi * 0.08)) { const mid = (hi + lo) / 2; lo = mid * 0.9; hi = mid * 1.1; }
  const x = (i) => padX + (i * (w - 2 * padX)) / Math.max(1, points.length - 1);
  const y = (v) => padTop + (1 - (v - lo) / (hi - lo)) * (h - padTop - padBottom);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.med).toFixed(1)}`).join(' ');
  const area = `${d} L${x(points.length - 1).toFixed(1)},${h - padBottom} L${x(0).toFixed(1)},${h - padBottom} Z`;
  const dots = points.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.med).toFixed(1)}" r="7" fill="#f2f0eb" stroke="#1a3030" stroke-width="3"/>`).join('');
  const last = points[points.length - 1];
  const first = points[0];
  const grid = [0.25, 0.5, 0.75].map((f) => `<line x1="${padX}" x2="${w - padX}" y1="${(padTop + f * (h - padTop - padBottom)).toFixed(1)}" y2="${(padTop + f * (h - padTop - padBottom)).toFixed(1)}" stroke="rgba(242,240,235,0.10)" stroke-width="2"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    ${grid}
    <path d="${area}" fill="rgba(212,170,96,0.14)"/>
    <path d="${d}" fill="none" stroke="#d4aa60" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
    <text x="${x(0).toFixed(1)}" y="${Math.max(26, y(first.med) - 20).toFixed(1)}" fill="#f2f0eb" font-size="24" text-anchor="${points.length > 1 ? 'start' : 'middle'}">${moneyRound(first.med)}</text>
    <text x="${x(points.length - 1).toFixed(1)}" y="${Math.max(26, y(last.med) - 20).toFixed(1)}" fill="#d4aa60" font-weight="500" font-size="26" text-anchor="end">${moneyRound(last.med)}</text>
  </svg>`;
}

/**
 * What the sparkline shows, stated without a causal claim. A quarter here is
 * often 3–7 sales, and which dealer sold what that quarter moves the median
 * more than the market does, so "down 59% since 2023" would be noise dressed
 * as news. Flat series get "held near"; anything else gets the range and the
 * last full quarter, which is exactly what the line draws.
 */
function trendSentence(points) {
  const vals = points.map((p) => p.med);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const last = points[points.length - 1];
  const since = quarterLabel(points[0].q).split(' ')[1];
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = sorted[Math.floor(sorted.length / 2)];
  if ((hi - lo) / mid < 0.2) {
    return { text: `Quarterly medians have held near ${moneyRound(mid)} since ${since}.`, word: 'Holding steady' };
  }
  return {
    text: `Quarterly medians have ranged from ${moneyRound(lo)} to ${moneyRound(hi)} since ${since}; the last full quarter came in at ${moneyRound(last.med)}.`,
    word: `Last quarter ${moneyRound(last.med)}`,
  };
}

function build(c) {
  const pg = config.priceGuide;
  const points = c.series.filter((p) => p.n >= pg.minPerQuarter).map((p) => ({ ...p, med: Number(p.med) }));
  const path = clusterPath({ typeSlug: slug(c.canonical_type), brandSlug: slug(c.canonical_brand) });
  const phrase = clusterPhrase(c);
  const single = clusterPhraseSingular(c);
  const p10 = Number(c.sold_p10), p25 = Number(c.sold_p25), p50 = Number(c.sold_p50), p75 = Number(c.sold_p75), p90 = Number(c.sold_p90);
  const span = Math.max(1, p90 - p10);
  const pct = (v) => Math.min(100, Math.max(0, ((v - p10) / span) * 100));
  const trend = trendSentence(points);
  const sales = Number(c.sold_count);
  const active = Number(c.asking_count_active ?? 0);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const caption = [
    `${cap(single)}: what it sells for.`,
    '',
    `Median sold price ${moneyRound(p50)} across ${sales.toLocaleString('en-US')} recorded sales. Half of them landed between ${moneyRound(p25)} and ${moneyRound(p75)}. ${trend.text}${active > 0 ? ` ${active} for sale right now.` : ''}`,
    '',
    `Every sale behind the number, and what is listed now: benchlot.com${path}`,
  ].join('\n');

  return {
    post_type: type,
    label,
    subject_key: `cluster:${c.cluster_key}`,
    subject_type: c.canonical_type,
    subject_brand: c.canonical_brand,
    caption,
    first_comment: hashtagsFor(c.canonical_type, c.canonical_brand),
    guide_path: path,
    notes: [`${points.length} plotted quarters, ${quarterLabel(points[0].q)} to ${quarterLabel(points[points.length - 1].q)}`],
    cards: [{
      template: 'price-guide',
      data: {
        eyebrow: `Used ${typePlural(c.canonical_type)}`.toUpperCase(),
        title: `${cap(single)}`,
        titleClass: single.length > 30 ? 'long' : single.length > 20 ? 'mid' : '',
        figure: moneyRound(p50),
        figureLabel: 'median sold price',
        salesLine: `${sales.toLocaleString('en-US')} recorded sales`,
        supplyLine: active > 0 ? `${active} for sale now` : '',
        sparkTitle: `Quarterly median, ${quarterLabel(points[0].q)} to ${quarterLabel(points[points.length - 1].q)}`,
        sparkTrend: trend.word,
        sparkSvg: sparklineSvg(points),
        bandLow: money(p10),
        bandHigh: money(p90),
        bandLeft: pct(p25).toFixed(1),
        bandWidth: Math.max(1, pct(p75) - pct(p25)).toFixed(1),
        bandMedian: pct(p50).toFixed(1),
        bandLabel: `Half of sales between ${moneyRound(p25)} and ${moneyRound(p75)}`,
        path: `benchlot.com${path}`,
      },
    }],
  };
}

module.exports = { type, label, candidates, build, sparklineSvg, trendSentence };
