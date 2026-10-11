/**
 * Live-index stats for the CRA chrome (LiveIndexChip, HomeIntroBanner,
 * SiteFooter, the Source filter counts): total active count, freshness, and
 * true per-source active counts. Same query the Next homepage uses.
 */
import { NextResponse } from 'next/server';
import { indexStats } from '@/lib/index-stats';

export async function GET() {
  try {
    const { activeCount, lastScrapedAt, sourceCounts } = await indexStats();
    return NextResponse.json(
      { activeCount, lastScrapedAt, sourceCounts },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' } }
    );
  } catch (err) {
    console.error('[api/search/stats]', (err as Error).message);
    return NextResponse.json({ error: 'stats unavailable' }, { status: 500 });
  }
}
