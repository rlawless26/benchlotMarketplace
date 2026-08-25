import type { Metadata } from 'next';
import Link from 'next/link';
import { listPublishableClusters, clusterPath, clusterTitle, money } from '@/lib/price-guide';
import { sql } from '@/lib/db';

export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default async function Home() {
  const [clusters, totals] = await Promise.all([
    listPublishableClusters(),
    sql<{ listings: string; sold: string; sources: string }>(
      `SELECT count(*) FILTER (WHERE status = 'active')::text AS listings,
              count(*) FILTER (WHERE status = 'sold')::text   AS sold,
              count(DISTINCT source)::text                    AS sources
       FROM listings`
    ),
  ]);

  const t = totals[0];
  const top = clusters.slice(0, 12);

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-spruce sm:text-5xl">
        What used woodworking tools actually sell for
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-spruce-light">
        Benchlot indexes {Number(t.listings).toLocaleString()} live listings from{' '}
        {t.sources} dealers, forums and marketplaces, and keeps{' '}
        {Number(t.sold).toLocaleString()} recorded sales so you can tell a fair price from a
        hopeful one.
      </p>

      <div className="mt-6">
        <Link
          href="/guide"
          className="inline-block rounded bg-honey px-5 py-2.5 font-medium text-dark-teal hover:bg-honey-light"
        >
          Browse the price guide
        </Link>
      </div>

      <section className="mt-14">
        <h2 className="font-display text-xl font-semibold text-spruce">
          Most-documented tools
        </h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((c) => (
            <li key={c.cluster_key}>
              <Link
                href={clusterPath(c)}
                className="flex items-baseline justify-between gap-3 rounded border border-bone-dark bg-bone-light px-3 py-2 text-sm text-spruce hover:border-honey"
              >
                <span>{clusterTitle(c)}</span>
                <span className="tnum shrink-0 text-xs text-spruce-light">
                  {c.sold_count} sold
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
