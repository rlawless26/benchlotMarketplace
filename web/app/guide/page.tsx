import type { Metadata } from 'next';
import Link from 'next/link';
import { listPublishableClusters, clusterPath, clusterTitle } from '@/lib/price-guide';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Price guide — what used woodworking tools sell for',
  description:
    'Median sold prices for used hand and power woodworking tools, built from real recorded sales across dealers, forum classifieds and marketplaces.',
  alternates: { canonical: '/guide' },
};

export default async function GuideIndex() {
  const clusters = await listPublishableClusters();

  // Group by tool type so the index reads as a table of contents rather than a
  // flat wall of 600 links.
  const byType = new Map<string, typeof clusters>();
  for (const c of clusters) {
    const list = byType.get(c.canonical_type) ?? [];
    list.push(c);
    byType.set(c.canonical_type, list);
  }
  const types = [...byType.entries()].sort((a, b) => {
    const soldA = a[1].reduce((n, c) => n + c.sold_count, 0);
    const soldB = b[1].reduce((n, c) => n + c.sold_count, 0);
    return soldB - soldA || a[0].localeCompare(b[0]);
  });

  const totalSold = clusters.reduce((n, c) => n + c.sold_count, 0);

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-spruce">Price guide</h1>
      <p className="mt-3 max-w-2xl text-spruce-light">
        What used woodworking tools actually sell for — built from{' '}
        <span className="tnum">{totalSold.toLocaleString()}</span> recorded sales across{' '}
        <span className="tnum">{clusters.length.toLocaleString()}</span> tools. Sold prices, not
        asking prices.
      </p>

      <div className="mt-10 space-y-10">
        {types.map(([type, list]) => (
          <section key={type}>
            <h2 className="font-display text-xl font-semibold text-spruce">{type}</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <li key={c.cluster_key}>
                  <Link
                    href={clusterPath(c)}
                    className="flex items-baseline justify-between gap-3 rounded border border-bone-dark bg-bone-light px-3 py-2 text-sm text-spruce hover:border-honey"
                  >
                    <span>{clusterTitle(c)}</span>
                    <span className="tnum shrink-0 text-xs text-spruce-light">
                      {c.sold_count > 0 ? `${c.sold_count} sold` : `${c.asking_count} listed`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
