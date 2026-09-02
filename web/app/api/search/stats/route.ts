/**
 * Live-index stats for the CRA chrome (LiveIndexChip, HomeIntroBanner,
 * SiteFooter, the Source filter counts): total active count, freshness, and
 * true per-source active counts. Replaces Firestore count() aggregations.
 */
import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await getPool().query(`
      SELECT source,
             COUNT(*)::int      AS n,
             MAX(last_seen_at)  AS last_seen
      FROM listings
      WHERE status = 'active'
      GROUP BY source`);

    const sourceCounts: Record<string, number> = {};
    let activeCount = 0;
    let lastScrapedAt: Date | null = null;
    for (const r of rows) {
      sourceCounts[r.source] = r.n;
      activeCount += r.n;
      if (!lastScrapedAt || r.last_seen > lastScrapedAt) lastScrapedAt = r.last_seen;
    }

    return NextResponse.json(
      { activeCount, lastScrapedAt, sourceCounts },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' } }
    );
  } catch (err) {
    console.error('[api/search/stats]', (err as Error).message);
    return NextResponse.json({ error: 'stats unavailable' }, { status: 500 });
  }
}
