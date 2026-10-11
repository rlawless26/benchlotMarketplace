import { sql } from './db';
import { FRESH, type Listing } from './price-guide';

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
