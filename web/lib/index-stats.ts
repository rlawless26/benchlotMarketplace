import { sql } from './db';
import { FRESH_DAYS } from './price-guide';

export type IndexStats = {
  /** Live listings seen within FRESH_DAYS. */
  activeCount: number;
  /** Recorded sales on file. */
  soldCount: number;
  /** Most recent last_seen_at across live rows. */
  lastScrapedAt: string | null;
  /** Live listings per source id. */
  sourceCounts: Record<string, number>;
  /** Sources with at least one live listing. */
  sourceCount: number;
};

/**
 * Headline numbers for the homepage and the CRA chrome (/api/search/stats).
 * One query, same freshness floor as every other read of active rows.
 */
export async function indexStats(): Promise<IndexStats> {
  const rows = await sql<{ source: string; n: number; last_seen: string | null; sold: string }>(
    `SELECT source,
            count(*) FILTER (WHERE status = 'active' AND last_seen_at > now() - interval '${FRESH_DAYS} days')::int AS n,
            max(last_seen_at) FILTER (WHERE status = 'active')::text AS last_seen,
            count(*) FILTER (WHERE status = 'sold')::text AS sold
     FROM listings
     GROUP BY source`
  );
  const sourceCounts: Record<string, number> = {};
  let activeCount = 0;
  let soldCount = 0;
  let lastScrapedAt: string | null = null;
  for (const r of rows) {
    if (r.n > 0) sourceCounts[r.source] = r.n;
    activeCount += r.n;
    soldCount += Number(r.sold);
    if (r.last_seen && (!lastScrapedAt || r.last_seen > lastScrapedAt)) lastScrapedAt = r.last_seen;
  }
  return { activeCount, soldCount, lastScrapedAt, sourceCounts, sourceCount: Object.keys(sourceCounts).length };
}
