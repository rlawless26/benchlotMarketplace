import type { Metadata } from 'next';
import Link from 'next/link';
import SearchForm from '@/components/SearchForm';
import FamilyGrid from '@/components/FamilyGrid';
import TypeTable from '@/components/TypeTable';
import { JsonLd, guideDatasetJsonLd } from '@/lib/jsonld';
import { SITE_URL } from '@/lib/site';
import { groupClustersByType } from '@/lib/guide-index';
import { groupByFamily } from '@/lib/guide-families';
import { listPublishableClusters, listBrandHubs, brandHubPath, typePlural, firstSoldYear } from '@/lib/price-guide';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Price guide — what used woodworking tools sell for',
  description:
    'Median sold prices for used hand and power woodworking tools, built from real recorded sales across dealers, forum classifieds and marketplaces.',
  alternates: { canonical: '/guide' },
};

/**
 * The guide's front door. Until 2026-10-28 this page listed every maker as
 * a chip, then every maker+type page under 62 headings: ~790 links with no
 * hierarchy, no picture and no price, and 26 views in 90 days. Now it reads
 * top-down: eight tool families with photos, a priced table of types under
 * each, and the makers as an alphabetical index at the end. Every type
 * links to its own /guide/{type} page; the maker+type pages are one click
 * below that.
 */
export default async function GuideIndex() {
  const [clusters, hubs, firstYear] = await Promise.all([
    listPublishableClusters({ grains: ['coarse'] }),
    listBrandHubs(),
    firstSoldYear(),
  ]);

  const types = groupClustersByType(clusters);
  const families = groupByFamily(types);
  const makers = [...hubs].sort((a, b) => a.canonical_brand.localeCompare(b.canonical_brand));

  const totalSold = clusters.reduce((n, c) => n + c.sold_count, 0);
  const built = clusters.map((c) => c.last_built_at).filter((d): d is string => !!d).sort();
  const lastBuilt = built.length ? built[built.length - 1] : null;

  return (
    <div>
      <JsonLd data={guideDatasetJsonLd({
        siteUrl: SITE_URL, soldTotal: totalSold, clusterCount: clusters.length, dateModified: lastBuilt, firstYear,
        types: types.map((t) => ({ name: typePlural(t.type), path: `/guide/${t.slug}`, sold: t.sold })),
      })} />
      <h1 className="font-display text-4xl font-semibold text-spruce">Price guide</h1>
      <p className="mt-3 max-w-2xl text-spruce-light">
        What used woodworking tools actually sell for, by tool type and maker — built from{' '}
        <span className="tnum">{totalSold.toLocaleString('en-US')}</span> recorded sales across{' '}
        <span className="tnum">{types.length}</span> tool types and <span className="tnum">{makers.length}</span> makers.
        Sold prices, not asking prices.
      </p>

      <div className="mt-6 max-w-2xl">
        <SearchForm />
      </div>

      <section className="mt-10" aria-label="Tool families">
        <FamilyGrid families={families} surface="guide_index" />
      </section>

      <div className="mt-12 space-y-12">
        {families.map((f) => (
          <section key={f.family.slug} id={f.family.slug}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="scroll-mt-6 font-display text-2xl font-semibold text-spruce">{f.family.name}</h2>
              <span className="tnum text-sm text-spruce-light">
                {f.sold.toLocaleString('en-US')} sales · {f.makers.toLocaleString('en-US')} maker pages · {f.forSaleNow.toLocaleString('en-US')} for sale
              </span>
            </div>
            <p className="mt-1 text-sm text-spruce-light">{f.family.blurb}</p>
            <TypeTable types={f.types} />
          </section>
        ))}
      </div>

      {makers.length > 0 && (
        <section id="makers" className="mt-14">
          <h2 className="scroll-mt-6 font-display text-2xl font-semibold text-spruce">Makers A–Z</h2>
          <p className="mt-1 text-sm text-spruce-light">Every tool type a maker has sales for, on one page.</p>
          <ul className="mt-4 columns-2 gap-x-6 text-sm sm:columns-3 lg:columns-4">
            {makers.map((h) => (
              <li key={h.brandSlug} className="break-inside-avoid py-1">
                <Link href={brandHubPath(h.brandSlug)} className="text-spruce hover:text-honey-dark hover:underline">
                  {h.canonical_brand}
                </Link>
                <span className="tnum ml-2 text-xs text-spruce-light">{h.sold_total.toLocaleString('en-US')} sales</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
