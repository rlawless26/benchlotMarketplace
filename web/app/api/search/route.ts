/**
 * Aggregator search pool — Postgres replacement for the CRA app's direct
 * Firestore reads.
 *
 * The CRA search UI does ALL text matching, facet filtering, interleaving and
 * sorting client-side; what it needs from the server is exactly what the old
 * Firestore adapter fetched: the N most-recently-first-seen ACTIVE listings
 * per indexed source (optionally narrowed to one source / canonical type /
 * canonical brand). One window-function query replaces the old
 * one-query-per-source fan-out.
 *
 * Ordered by (source, rn) so the client can regroup rows into per-source
 * arrays — each already first_seen_at DESC — and run its existing
 * round-robin interleave unchanged.
 *
 * Served from benchlot.com via the /api/search rewrite in the root
 * vercel.json (same mechanism as /api/alerts).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// Sources whose ACTIVE listings belong in search. jimbode_valueguide and
// teddawson's sold half are excluded by status='active', not by this list,
// but keeping the list explicit means an accidentally-active row in an
// archive source cannot leak into search.
const INDEXED_SOURCES = [
  'jimbode', 'hyperkitten', 'oldtools', 'thebestthings', 'rouillard',
  'vintagevials', 'ebay', 'fbmarketplace', 'woodnet', 'sawmillcreek',
  'reddit', 'teddawson',
];

const MAX_PER_SOURCE = 3000; // matches the old adapter's price-sort pool cap

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const perSource = Math.min(
    Math.max(parseInt(q.get('limit') || '60', 10) || 60, 1),
    MAX_PER_SOURCE
  );
  const source = q.get('source');
  const canonicalType = q.get('type');
  const canonicalBrand = q.get('brand');

  if (source && !INDEXED_SOURCES.includes(source)) {
    return NextResponse.json({ listings: [] }, { status: 200 });
  }

  const params: unknown[] = [source ? [source] : INDEXED_SOURCES, perSource];
  const conds = [`source = ANY($1)`, `status = 'active'`];
  if (canonicalType) {
    params.push(canonicalType);
    conds.push(`canonical_type = $${params.length}`);
  }
  if (canonicalBrand) {
    params.push(canonicalBrand);
    conds.push(`canonical_brand = $${params.length}`);
  }

  const sql = `
    SELECT source, source_id, source_url, title_raw, price_cents, currency,
           condition_raw, images, canonical_brand, canonical_type,
           canonical_model, canonical_size, era_estimate,
           heuristic_brand, heuristic_type,
           location_state, location_display,
           posted_at, scraped_at, first_seen_at
    FROM (
      SELECT l.*,
             ROW_NUMBER() OVER (PARTITION BY source ORDER BY first_seen_at DESC) AS rn
      FROM listings l
      WHERE ${conds.join(' AND ')}
    ) ranked
    WHERE rn <= $2
    ORDER BY source, rn`;

  try {
    const { rows } = await getPool().query(sql, params);
    return NextResponse.json(
      { listings: rows },
      {
        headers: {
          // CDN-cache pools briefly: search freshness is daily (cron-driven),
          // so 5 minutes of staleness is invisible while collapsing the many
          // per-visitor hits into one Neon query.
          'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
        },
      }
    );
  } catch (err) {
    console.error('[api/search]', (err as Error).message);
    return NextResponse.json({ error: 'search unavailable' }, { status: 500 });
  }
}
