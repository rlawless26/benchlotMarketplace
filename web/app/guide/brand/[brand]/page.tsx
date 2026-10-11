import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import SearchForm from '@/components/SearchForm';
import OutboundListingLink from '@/components/OutboundListingLink';
import { Stat } from '@/components/GuideView';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { SITE_URL } from '@/lib/site';
import {
  getBrandHub, listBrandHubs, resolveBrandAlias, brandHubPath, clusterPath,
  brandActiveListings, brandActiveCount, cleanTitle, centsToMoney,
  typePlural, typeLower, money, isIndexable, HUB_MIN_TYPES,
} from '@/lib/price-guide';

export const revalidate = 3600;
export const dynamicParams = true;

type Params = { params: Promise<{ brand: string }> };

export async function generateStaticParams() {
  const hubs = await listBrandHubs({ indexableOnly: true });
  return hubs.map((h) => ({ brand: h.brandSlug }));
}

const listTypes = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { brand } = await params;
  const hub = await getBrandHub(brand);
  if (!hub || hub.types.length < HUB_MIN_TYPES) {
    return { title: 'Not found', robots: { index: false, follow: false } };
  }
  const b = hub.canonical_brand;
  const n = hub.types.length;
  const forSale = await brandActiveCount(b);
  const top = listTypes(hub.types.slice(0, 3).map((t) => typeLower(typePlural(t.canonical_type))));
  const sales = hub.sold_total.toLocaleString('en-US');
  const title = hub.indexable
    ? `Used ${b} tool prices: ${n} tools, ${sales} sales${forSale > 0 ? ` · ${forSale} for sale` : ''}`
    : `Used ${b} tool prices and listings`;
  const supply = forSale > 0 ? ` ${forSale} ${b} ${forSale === 1 ? 'tool' : 'tools'} for sale now across ${n} tool types.` : '';
  const description = hub.indexable
    ? `What used ${b} tools sell for: median sold prices for ${n} tool types from ${sales} recorded sales, led by ${top}.${supply} Free alert when one is listed.`
    : `Recorded sales and current listings for used ${b} tools (${top}), gathered from dealers, forum classifieds and marketplaces.${supply} Free alert when one is listed.`;
  const path = brandHubPath(hub.brandSlug);
  return {
    title: { absolute: `${title} · Benchlot` },
    description,
    alternates: { canonical: path },
    ...(hub.indexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title: `${title} · Benchlot`, description, url: path, type: 'website' },
  };
}

export default async function BrandHubPage({ params }: Params) {
  const { brand } = await params;
  const hub = await getBrandHub(brand);

  if (!hub) {
    // A merged brand spelling keeps its URL alive with a 301.
    const canonical = await resolveBrandAlias(brand);
    if (canonical && canonical !== brand) {
      const target = await getBrandHub(canonical);
      if (target) {
        permanentRedirect(
          target.types.length >= HUB_MIN_TYPES ? brandHubPath(canonical) : clusterPath(target.types[0])
        );
      }
    }
    notFound();
  }

  // One publishable type is not a hub; the type page is the right answer.
  if (hub.types.length < HUB_MIN_TYPES) permanentRedirect(clusterPath(hub.types[0]));

  const b = hub.canonical_brand;
  const lead = hub.types[0];
  const soldTypes = hub.types.filter(isIndexable);
  const [forSale, forSaleCount] = await Promise.all([brandActiveListings(b, 12), brandActiveCount(b)]);
  const path = brandHubPath(hub.brandSlug);
  const typeFor = (t: string) => hub.types.find((x) => x.canonical_type === t) ?? null;

  return (
    <article>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Price guide', path: '/guide' }, { name: `${b} tools`, path }], SITE_URL)} />
      <nav className="mb-3 text-sm text-spruce-light">
        <Link href="/guide" className="hover:text-honey-dark">Price guide</Link>
        <span className="px-1.5">/</span>
        <span>{b}</span>
      </nav>

      <h1 className="font-display text-4xl font-semibold text-spruce">{b} tools</h1>
      <p className="mt-3 max-w-2xl text-spruce-light">
        What used {b} tools actually sell for, across{' '}
        <span className="tnum">{hub.types.length}</span> tool types and{' '}
        <span className="tnum">{hub.sold_total.toLocaleString('en-US')}</span> recorded sales
        {forSaleCount > 0 ? <>, with <span className="tnum">{forSaleCount.toLocaleString('en-US')}</span> for sale now</> : null}.
        Sold prices, not asking prices.
      </p>

      <section className="mt-8 rounded-lg border border-bone-dark bg-bone-light p-5">
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Sales on record" value={hub.sold_total.toLocaleString('en-US')} big />
          <Stat label="Tool types" value={String(hub.types.length)} />
          <Stat
            label="Most sold"
            value={`${typePlural(lead.canonical_type)}${lead.sold_count >= 8 && money(lead.sold_p50) ? ` · ${money(lead.sold_p50)}` : ''}`}
          />
          <Stat label="For sale now" value={forSaleCount.toLocaleString('en-US')} />
        </dl>
      </section>

      {/* What can be bought today, across every type. Before this the hub had
          no listings at all and sat at position 16 with zero clicks while the
          type pages under it converted. */}
      {forSale.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-spruce">
            {b} tools for sale now{forSaleCount > forSale.length ? ` (${forSaleCount.toLocaleString('en-US')})` : ''}
          </h2>
          <p className="mb-3 text-sm text-spruce-light">
            Newest first. Benchlot links straight to the seller — no fees, no middleman.
            {forSaleCount > forSale.length ? ' Each tool type below lists all of its listings.' : ''}
          </p>
          <ul className="divide-y divide-bone-dark border-y border-bone-dark">
            {forSale.map((l, i) => {
              const t = typeFor(l.canonical_type);
              return (
                <li key={l.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <OutboundListingLink
                      href={l.source_url}
                      className="text-spruce underline decoration-bone-dark underline-offset-2 hover:text-honey-dark"
                      listingId={l.id} source={l.source} sourceKind={l.source_kind}
                      priceCents={l.price_cents} status="active" position={i}
                      clusterKey={t?.cluster_key ?? null} surface="brand_hub"
                    >
                      {cleanTitle(l.title_raw)}
                    </OutboundListingLink>
                    <span className="ml-2 text-xs text-spruce-light">
                      {t ? <Link href={clusterPath(t)} className="hover:text-honey-dark">{typePlural(l.canonical_type)}</Link> : typePlural(l.canonical_type)}
                      {' · '}{l.source_name}
                    </span>
                  </span>
                  <span className="tnum shrink-0 font-medium text-honey-dark">{centsToMoney(l.price_cents)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {hub.note && (
        <section className="mt-8 max-w-2xl">
          <h2 className="font-display text-lg font-semibold text-spruce">About {b}</h2>
          <p className="mt-3 text-spruce">{hub.note}</p>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-spruce">Every {b} tool in the guide</h2>
        <p className="mt-1 text-sm text-spruce-light">
          Median is the middle recorded sale. Types with fewer than 8 sales show listings only.
        </p>
        <ul className="mt-4 divide-y divide-bone-dark border-y border-bone-dark">
          {hub.types.map((t) => {
            const median = isIndexable(t) ? money(t.sold_p50) : null;
            return (
              <li key={t.cluster_key}>
                <Link
                  href={clusterPath(t)}
                  className="flex items-baseline justify-between gap-4 py-3 hover:text-honey-dark"
                >
                  <span className="text-spruce">
                    {typePlural(t.canonical_type)}
                    <span className="tnum ml-2 text-xs text-spruce-light">
                      {t.sold_count > 0 ? `${t.sold_count} sold` : `${t.asking_count} listed`}
                      {t.asking_count_active > 0 ? ` · ${t.asking_count_active} for sale` : ''}
                    </span>
                  </span>
                  <span className="tnum shrink-0 font-display font-semibold text-honey-dark">
                    {median ?? <span className="text-sm font-normal text-spruce-light">too few sales</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {soldTypes.length < hub.types.length && (
          <p className="mt-3 text-xs text-spruce-light">
            {hub.types.length - soldTypes.length} of these types have too few recorded sales to quote a median yet.
          </p>
        )}
      </section>

      <section className="mt-12 border-t border-bone-dark pt-6">
        <h2 className="font-display text-lg font-semibold text-spruce">Looking for another maker?</h2>
        <div className="mt-3 max-w-2xl">
          <SearchForm />
        </div>
      </section>
    </article>
  );
}
