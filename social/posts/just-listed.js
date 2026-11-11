/**
 * Just listed.
 *
 * A fresh dealer listing with a photo, priced against the guide's median for
 * its (maker, tool type). Dealer sources only: their photos are credited on
 * the card and in the caption, and their stock turns in about a week, so
 * the generator only schedules these into the first days of a batch and the
 * publisher re-checks that the listing is still active before posting.
 */
const config = require('../config');
const { sql } = require('../lib/db');
const { hashtagsFor } = require('../lib/hashtags');
const { fetchImageDataUri } = require('../lib/images');
const { slug, moneyRound, centsToMoney, humanizeTitle, clusterPhrase, clusterPhraseSingular, clusterPath } = require('../lib/text');

const type = 'just-listed';
const label = 'Just listed';

async function candidates() {
  const jl = config.justListed;
  return sql(
    `SELECT l.id::text, l.source, s.name AS source_name, l.source_url, l.title_raw, l.price_cents, l.condition_raw,
            l.images, l.location_display, l.first_seen_at, l.posted_at,
            l.canonical_type, l.canonical_brand, l.canonical_model, l.canonical_size, l.plane_type_number,
            ps.sold_count, ps.sold_p25, ps.sold_p50, ps.sold_p75, ps.asking_count_active
     FROM listings l
     JOIN sources s ON s.id = l.source
     LEFT JOIN price_stats ps ON ps.grain = 'coarse' AND ps.canonical_type = l.canonical_type AND ps.canonical_brand = l.canonical_brand
     WHERE l.status = 'active' AND l.source = ANY($1)
       AND l.first_seen_at > now() - ($2::int * interval '1 day')
       AND l.last_seen_at > now() - interval '45 days'
       AND cardinality(l.images) > 0
       AND l.price_cents BETWEEN $3 AND 5000000
       AND l.canonical_type IS NOT NULL AND l.canonical_type <> 'Other'
       AND l.canonical_brand IS NOT NULL AND l.canonical_brand NOT IN ('Unknown', '')
       AND NOT bl_is_junk(l.title_raw, l.condition_raw) AND NOT bl_is_lot(l.title_raw)
     ORDER BY (coalesce(ps.sold_count, 0) >= $4) DESC, l.first_seen_at DESC, l.price_cents DESC`,
    [jl.sources, jl.maxListingAgeDays, jl.minPriceCents, jl.minGuideSales]
  );
}

/** A candidate is usable only if its first photo can actually be fetched. */
async function prepare(c) {
  const photo = await fetchImageDataUri(c.images[0]);
  return photo ? { ...c, photoUrl: c.images[0] } : null;
}

function position(price, p25, p50, p75) {
  if (price < p25) return 'under the usual range';
  if (price < p50) return 'a little below the middle of the market';
  if (price <= p75) return 'right in the middle of the market';
  return 'toward the top of the range';
}

function build(c) {
  const jl = config.justListed;
  const path = clusterPath({ typeSlug: slug(c.canonical_type), brandSlug: slug(c.canonical_brand) });
  const title = humanizeTitle(c.title_raw);
  const price = c.price_cents / 100;
  const phrase = clusterPhrase(c);
  const coarse = { canonical_type: c.canonical_type, canonical_brand: c.canonical_brand };
  const plural = clusterPhrase(coarse);
  const singular = clusterPhraseSingular(coarse);
  const sales = Number(c.sold_count ?? 0);
  const quotable = sales >= jl.minGuideSales && c.sold_p50 !== null;
  const p25 = Number(c.sold_p25), p50 = Number(c.sold_p50), p75 = Number(c.sold_p75);

  const guideSentence = quotable
    ? `The guide's median for ${plural} is ${moneyRound(p50)}, from ${sales.toLocaleString('en-US')} recorded sales, so this ask sits ${position(price, p25, p50, p75)}.`
    : `The guide does not have enough recorded sales of ${plural} to quote a median yet.`;

  const caption = [
    `Just listed at ${c.source_name}: ${title}, ${centsToMoney(c.price_cents)}.`,
    '',
    guideSentence,
    '',
    `The listing, and every ${singular} for sale: benchlot.com${path}`,
    `Photo: ${c.source_name}.`,
  ].join('\n');

  return {
    post_type: type,
    label,
    subject_key: `listing:${c.id}`,
    subject_type: c.canonical_type,
    subject_brand: c.canonical_brand,
    caption,
    first_comment: hashtagsFor(c.canonical_type, c.canonical_brand),
    guide_path: path,
    source_url: c.source_url,
    notes: [
      `First seen ${new Date(c.first_seen_at).toISOString().slice(0, 10)} at ${c.source_name}; the publisher re-checks it is still active before posting.`,
    ],
    cards: [{
      template: 'just-listed',
      data: {
        photo: c.photoUrl,
        badge: 'JUST LISTED',
        source: c.source_name,
        eyebrow: `${c.source_name}${c.location_display ? ` · ${c.location_display}` : ''}`,
        title,
        titleClass: title.length > 48 ? 'long' : title.length > 32 ? 'mid' : '',
        price: centsToMoney(c.price_cents),
        priceLabel: 'asking price',
        guideLine: quotable
          ? `Guide median ${moneyRound(p50)} from ${sales.toLocaleString('en-US')} sales`
          : 'Not enough recorded sales for a guide median yet',
        guideSub: quotable ? `half of sales between ${moneyRound(p25)} and ${moneyRound(p75)}` : phrase,
        path: `benchlot.com${path}`,
        credit: `Photo: ${c.source_name}`,
      },
    }],
  };
}

module.exports = { type, label, candidates, prepare, build };
