import type { Metadata } from 'next';
import Link from 'next/link';
import SearchForm from '@/components/SearchForm';
import {
  listPublishableClusters, listBrandHubs, machineTypeSummaries, clusterPath, brandHubPath, clusterPhrase,
  typePlural, slug,
} from '@/lib/price-guide';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Price guide — what used woodworking tools sell for',
  description:
    'Median sold prices for used hand and power woodworking tools, built from real recorded sales across dealers, forum classifieds and marketplaces.',
  alternates: { canonical: '/guide' },
};

export default async function GuideIndex() {
  // Brand and size pages only; model pages are reached from their brand page.
  const [clusters, hubs, machines] = await Promise.all([
    listPublishableClusters({ grains: ['coarse', 'fine'] }),
    listBrandHubs(),
    machineTypeSummaries(6),
  ]);

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

      <div className="mt-6 max-w-2xl">
        <SearchForm />
      </div>

      {hubs.length > 0 && (
        <section id="makers" className="mt-10">
          <h2 className="scroll-mt-6 font-display text-xl font-semibold text-spruce">By maker</h2>
          <p className="mt-1 text-sm text-spruce-light">Every tool type a maker has sales for, on one page.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {hubs.map((h) => (
              <li key={h.brandSlug}>
                <Link
                  href={brandHubPath(h.brandSlug)}
                  className="inline-block rounded border border-bone-dark bg-bone-light px-3 py-1.5 text-sm text-spruce hover:border-honey"
                >
                  {h.canonical_brand}
                  <span className="tnum ml-2 text-xs text-spruce-light">{h.type_count} types</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Machines get their own door. They are where ChatGPT sends buyers and
          where Google shows the pages without clicking; one hop from the root
          is what keeps them cited. Each row leads with what is for sale. */}
      {machines.length > 0 && (
        <section id="machines" className="mt-10">
          <h2 className="scroll-mt-6 font-display text-xl font-semibold text-spruce">Machines and power tools</h2>
          <p className="mt-1 text-sm text-spruce-light">
            Table saws, planers, dust collectors and the rest, by maker. Sold prices first, then what is listed now.
          </p>
          <ul className="mt-4 divide-y divide-bone-dark border-y border-bone-dark">
            {machines.map((m) => (
              <li key={m.canonical_type} className="py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <Link href={`#${m.typeSlug}`} className="font-medium text-spruce hover:text-honey-dark">
                    {typePlural(m.canonical_type)}
                  </Link>
                  <span className="tnum shrink-0 text-xs text-spruce-light">
                    {m.sold_total.toLocaleString()} sold · {m.active_total.toLocaleString()} for sale
                  </span>
                </div>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {m.top.map((r) => (
                    <li key={r.cluster_key}>
                      <Link
                        href={clusterPath(r)}
                        className="inline-block rounded border border-bone-dark bg-bone-light px-3 py-1.5 text-sm text-spruce hover:border-honey"
                      >
                        {r.canonical_brand}
                        <span className="tnum ml-2 text-xs text-spruce-light">
                          {r.asking_count_active > 0 ? `${r.asking_count_active} for sale` : `${r.sold_count} sold`}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 space-y-10">
        {types.map(([type, list]) => (
          <section key={type} id={slug(type)}>
            <h2 className="scroll-mt-6 font-display text-xl font-semibold text-spruce">{type}</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <li key={c.cluster_key}>
                  <Link
                    href={clusterPath(c)}
                    className="flex items-baseline justify-between gap-3 rounded border border-bone-dark bg-bone-light px-3 py-2 text-sm text-spruce hover:border-honey"
                  >
                    <span>{clusterPhrase(c)}</span>
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
