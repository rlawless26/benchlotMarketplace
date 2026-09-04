/**
 * Price-stats cluster lookup for the CRA app (ToolScanCard's "Benchlot index"
 * band, PriceContextChip). Replaces the frozen Firestore `priceStats`
 * collection — its builder was removed in the Postgres cutover, so reads from
 * it served progressively stale bands and could never see clusters created
 * since (all 4,315 machine clusters, for a start).
 *
 * One cluster per request, keyed exactly as the CRA's clusterKey() builds it
 * (`pt::{type-slug}::{brand-slug}::{size-slug|_}`), so the CDN cache keys per
 * cluster and repeat scans of common tools never reach Neon. Numerics are
 * cast in SQL — pg returns NUMERIC as strings, and the CRA compares and
 * rounds these as numbers.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

const KEY_RE = /^pt::[a-z0-9_-]+::[a-z0-9_-]+::[a-z0-9_-]+$/;

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') || '';
  if (!KEY_RE.test(key)) {
    return NextResponse.json({ error: 'bad key' }, { status: 400 });
  }

  try {
    const { rows } = await getPool().query(
      `SELECT cluster_key, canonical_type, canonical_brand, canonical_size,
              grain,
              asking_count::int, asking_mean::float, asking_p10::float,
              asking_p25::float, asking_p50::float, asking_p75::float,
              asking_p90::float, asking_window_days, asking_by_kind,
              sold_count::int, sold_mean::float, sold_p10::float,
              sold_p25::float, sold_p50::float, sold_p75::float,
              sold_p90::float, sold_window_days, sold_by_kind,
              last_built_at
         FROM price_stats
        WHERE cluster_key = $1`,
      [key]
    );
    return NextResponse.json(
      { stats: rows[0] ?? null },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch (err) {
    console.error('[api/pricestats]', (err as Error).message);
    return NextResponse.json({ error: 'unavailable' }, { status: 500 });
  }
}
