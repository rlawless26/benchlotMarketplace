import { sql } from './db';
import { FRESH, type Listing } from './price-guide';
import { guidePathFor } from './guide-paths';

export type HomeListing = Listing & { canonical_type: string | null; canonical_brand: string | null };

/**
 * A small, fresh "recently listed" strip for the homepage: one listing per
 * source, newest first, with a photo and a price. Eight rows keeps the server
 * HTML small; the CRA grid at /search is where the full index lives.
 */
export async function recentListings(limit = 8): Promise<HomeListing[]> {
  return sql<HomeListing>(
    `SELECT * FROM (
       SELECT DISTINCT ON (l.source)
              l.id::text, l.source, s.name AS source_name, s.kind::text AS source_kind,
              l.source_url, l.title_raw, l.price_cents, l.condition_raw, l.images, l.location_display,
              l.posted_at, l.sold_at, l.first_seen_at, l.last_seen_at,
              l.canonical_type, l.canonical_brand,
              COALESCE(l.posted_at, l.first_seen_at, l.last_seen_at) AS dated_at
       FROM listings l JOIN sources s ON s.id = l.source
       WHERE l.status = 'active' AND ${FRESH} AND s.indexed
         AND l.price_cents IS NOT NULL AND l.price_cents > 0
         AND l.images IS NOT NULL AND array_length(l.images, 1) >= 1
         AND NOT bl_is_junk(l.title_raw, l.condition_raw) AND NOT bl_is_lot(l.title_raw)
       ORDER BY l.source, l.first_seen_at DESC
     ) d
     ORDER BY d.dated_at DESC
     LIMIT $1`,
    [limit]
  );
}

export type RecentSale = Listing & {
  canonical_type: string;
  canonical_brand: string;
  /** The guide page for this maker + type; every row returned has one. */
  guidePath: string;
};

/**
 * "Sold this week" for the homepage: the newest recorded sales site-wide,
 * de-duplicated the way the guide's own comps are (same title and price count
 * once), eligible only, and limited to tools that have a guide page to link
 * to. Keyed on `sold_at`, which the Jim Bode Value Guide archive never sets,
 * so this shows the week's dealer and forum sales rather than archive rows.
 * Realised price where the forum sold-check extracted one.
 */
export async function recentSales(limit = 8, days = 7): Promise<RecentSale[]> {
  // A dealer sweep marks everything that vanished as sold at the same instant,
  // so without a per-source cap one shop's Monday fills the whole strip.
  const rows = await sql<Listing & { canonical_type: string; canonical_brand: string }>(
    `SELECT * FROM (
       SELECT d.*, row_number() OVER (PARTITION BY d.source ORDER BY d.dated_at DESC, d.id DESC) AS rn
       FROM (
         SELECT DISTINCT ON (lower(btrim(l.title_raw)), COALESCE(l.sold_price_cents, l.price_cents))
                l.id::text, l.source, s.name AS source_name, s.kind::text AS source_kind,
                l.source_url, l.title_raw,
                COALESCE(l.sold_price_cents, l.price_cents) AS price_cents,
                l.condition_raw, l.images, l.location_display,
                l.posted_at, l.sold_at, l.first_seen_at, l.last_seen_at,
                l.canonical_type, l.canonical_brand,
                l.sold_at AS dated_at
         FROM listings l JOIN sources s ON s.id = l.source
         WHERE l.status = 'sold' AND l.sold_at > now() - interval '${Math.max(1, Math.round(days))} days'
           AND l.canonical_type IS NOT NULL AND l.canonical_type <> 'Other'
           AND l.canonical_brand IS NOT NULL AND l.canonical_brand <> 'Unknown'
           AND COALESCE(l.sold_price_cents, l.price_cents) > 0
           AND NOT bl_is_junk(l.title_raw, l.condition_raw) AND NOT bl_is_lot(l.title_raw)
         ORDER BY lower(btrim(l.title_raw)), COALESCE(l.sold_price_cents, l.price_cents), l.sold_at DESC
       ) d
     ) r
     WHERE r.rn <= 3
     ORDER BY r.dated_at DESC, r.id DESC
     LIMIT $1`,
    [limit]
  );
  return rows.flatMap((r) => {
    const guidePath = guidePathFor(r.canonical_type, r.canonical_brand);
    return guidePath ? [{ ...r, guidePath }] : [];
  });
}
