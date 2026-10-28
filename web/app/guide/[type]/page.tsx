import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import SearchForm from '@/components/SearchForm';
import GuideLink from '@/components/GuideLink';
import MakerTable from '@/components/MakerTable';
import EvidenceRow from '@/components/EvidenceRow';
import ShareBar from '@/components/ShareBar';
import { Stat } from '@/components/GuideView';
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from '@/lib/jsonld';
import { SITE_URL } from '@/lib/site';
import { recentSales } from '@/lib/home';
import { familyOf } from '@/lib/guide-families';
import {
  resolveTypeSlug, listTypeHubs, typeMakerRows, typeFacts, typeTopPages,
  clusterPath, clusterPhrase, cleanTitle, centsToMoney, money, typePlural, typeLower,
  SOLD_MIN_FOR_REFERENCE,
} from '@/lib/price-guide';

export const revalidate = 3600;
export const dynamicParams = true;

type Params = { params: Promise<{ type: string }> };

/**
 * /guide/{type}: every maker of one kind of tool, side by side with a price.
 *
 * Until 2026-10-28 this URL was a 404 and every "Bench Plane" link on the
 * site pointed at an anchor on the index. The site audit (docs/site-audit.md
 * §3.3) put a type hub third on its list: "used bench plane prices" and the
 * other generic type queries had no page to land on, and a searcher who
 * knew the tool but not the maker had nowhere to compare. The page is the
 * ranked maker table; the sold card above it states the type-wide figure
 * with the same evidence row the maker pages carry.
 */
export async function generateStaticParams() {
  const hubs = await listTypeHubs({ indexableOnly: true });
  return hubs.map((h) => ({ type: h.typeSlug }));
}

// generateMetadata and the page both need these; React's cache() keeps it
// to one round trip per request.
const load = cache(async (typeSlug: string) => {
  const type = await resolveTypeSlug(typeSlug);
  if (!type) return null;
  const [makers, facts] = await Promise.all([typeMakerRows(type), typeFacts(type)]);
  return { type, makers, facts };
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { type: typeSlug } = await params;
  const data = await load(typeSlug);
  if (!data) return { title: 'Not found', robots: { index: false, follow: false } };
  const { type, makers, facts } = data;
  const plural = typeLower(typePlural(type));
  const singular = typeLower(type);
  const indexable = facts.total >= SOLD_MIN_FOR_REFERENCE;
  const path = `/guide/${typeSlug}`;
  const sales = facts.total.toLocaleString('en-US');
  const title = indexable
    ? `Used ${singular} prices: ${makers.length} makers, ${sales} sales${facts.active > 0 ? ` · ${facts.active.toLocaleString('en-US')} for sale` : ''}`
    : `Used ${singular} prices and listings`;
  const description = indexable
    ? `What used ${plural} sell for: median ${money(facts.p50)}, most between ${money(facts.p25)} and ${money(facts.p75)}, from ${sales} recorded sales across ${makers.length} makers. Sold prices by maker, not asking prices.`
    : `Recorded sales and current listings for used ${plural}, by maker, gathered from dealers, forum classifieds and marketplaces.`;
  return {
    title: { absolute: `${title} · Benchlot` },
    description,
    alternates: { canonical: path },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title: `${title} · Benchlot`, description, url: path, type: 'website' },
  };
}

function soldDay(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default async function TypeHub({ params }: Params) {
  const { type: typeSlug } = await params;
  const data = await load(typeSlug);
  if (!data) notFound();
  const { type, makers, facts } = data;

  const [top, soldRaw] = await Promise.all([typeTopPages(type, 12), recentSales(8, 30, { type })]);
  const sold = soldRaw.length >= 3 ? soldRaw : [];

  const plural = typePlural(type);
  const pluralLower = typeLower(plural);
  const singularLower = typeLower(type);
  const family = familyOf(type);
  const path = `/guide/${typeSlug}`;
  const url = `${SITE_URL}${path}`;
  const enough = facts.total >= SOLD_MIN_FOR_REFERENCE;
  const builtAt = makers.map((m) => m.last_built_at).filter((d): d is string => !!d).sort().pop() ?? null;
  const pageKey = `type::${typeSlug}`;

  const crumbs = [{ name: 'Price guide', path: '/guide' }, { name: plural, path }];
  const stat = enough
    ? `Used ${pluralLower}: median ${money(facts.p50)} from ${facts.total.toLocaleString('en-US')} recorded sales across ${makers.length} makers`
    : `Used ${pluralLower}: ${facts.total} recorded sales across ${makers.length} makers`;

  return (
    <article>
      <JsonLd data={webPageJsonLd({
        url, name: `Used ${singularLower} prices`, siteUrl: SITE_URL,
        description: `What used ${pluralLower} sell for, by maker: recorded sales and current listings.`,
        dateModified: builtAt,
      })} />
      <JsonLd data={breadcrumbJsonLd(crumbs, SITE_URL)} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        '@id': `${url}#makers`,
        name: `${plural} by maker`,
        numberOfItems: makers.length,
        itemListElement: makers.map((m, i) => ({
          '@type': 'ListItem', position: i + 1, name: `${m.canonical_brand} ${pluralLower}`, url: `${SITE_URL}${clusterPath(m)}`,
        })),
      }} />

      <nav className="mb-3 text-sm text-spruce-light">
        <Link href="/guide" className="hover:text-honey-dark">Price guide</Link>
        {family && (
          <>
            <span className="px-1.5">/</span>
            <Link href={`/guide#${family.slug}`} className="hover:text-honey-dark">{family.name}</Link>
          </>
        )}
        <span className="px-1.5">/</span>
        <span className="text-spruce">{plural}</span>
      </nav>

      <h1 className="font-display text-4xl font-semibold text-spruce">
        Used {pluralLower}: what they sell for
      </h1>
      <p className="mt-3 max-w-2xl text-spruce-light">
        <span className="tnum">{facts.total.toLocaleString('en-US')}</span> recorded sales from{' '}
        <span className="tnum">{makers.length}</span> makers, <span className="tnum">{facts.active.toLocaleString('en-US')}</span> for
        sale now. Sold prices, not asking prices; every maker links to its own page.
      </p>

      <div className="mt-5 max-w-2xl">
        <SearchForm
          id="q-type"
          label={`Search ${pluralLower}`}
          placeholder={makers[0] ? `${makers[0].canonical_brand} ${singularLower}, or any maker…` : `Search ${pluralLower}…`}
        />
      </div>

      {/* The type-wide figure, stated the same way the maker pages state theirs. */}
      <section className="mt-8 rounded-lg border border-bone-dark bg-bone-light p-6">
        <h2 className="font-display text-lg font-semibold text-spruce">Sold prices, all makers</h2>
        {enough ? (
          <dl className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat label="Median sold" value={money(facts.p50)} big />
            <Stat label="Most sell for" value={`${money(facts.p25)}–${money(facts.p75)}`} />
            <Stat label="Sales on record" value={facts.total.toLocaleString('en-US')} />
            <Stat label="For sale now" value={facts.active.toLocaleString('en-US')} />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-spruce-light">
            Only {facts.total} {facts.total === 1 ? 'sale' : 'sales'} on record — too few to quote a reliable figure.
            The makers below link to the individual sales; judge them yourself.
          </p>
        )}
        <EvidenceRow soldCount={facts.total} askingCount={facts.active} facts={facts} byKind={facts.byKind} builtAt={builtAt} full={enough} />
        <ShareBar className="mt-4 border-t border-bone-dark pt-4" stat={stat} path={path} title={`Used ${singularLower} prices`} clusterKey={pageKey} pageType="type_hub" />
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-spruce">By maker</h2>
        <p className="mt-1 text-sm text-spruce-light">
          Every maker with recorded sales, most first. A median is quoted from eight or more sales.
        </p>
        <MakerTable rows={makers} pageKey={pageKey} />
      </section>

      {top.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-spruce">Best-documented {pluralLower}</h2>
          <p className="mt-1 text-sm text-spruce-light">The models and sizes with the most recorded sales.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {top.map((c) => (
              <li key={c.cluster_key}>
                <GuideLink href={clusterPath(c)} kind="model" clusterKey={pageKey}
                           className="inline-block rounded border border-bone-dark bg-bone-light px-3 py-1.5 text-sm text-spruce hover:border-honey">
                  {clusterPhrase(c)}
                  <span className="tnum ml-2 text-xs text-spruce-light">{c.sold_count.toLocaleString('en-US')} sold</span>
                </GuideLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sold.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-spruce">Sold recently</h2>
          <p className="mt-1 text-sm text-spruce-light">Recorded in the last thirty days; each card opens the maker&rsquo;s page.</p>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {sold.map((l) => (
              <li key={l.id}>
                <GuideLink href={l.guidePath} kind="home_sold" clusterKey={pageKey}
                           className="group block overflow-hidden rounded-lg border border-bone-dark bg-bone-light hover:border-honey">
                  {l.images?.[0] ? (
                    <span className="block aspect-square w-full overflow-hidden bg-bone-dark">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.images[0]} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
                           className="h-full w-full object-cover" />
                    </span>
                  ) : (
                    <span className="flex aspect-square w-full items-center justify-center bg-bone-dark px-3 text-center font-display text-sm text-spruce-light">
                      {l.canonical_brand} {l.canonical_type}
                    </span>
                  )}
                  <span className="block p-2.5">
                    <span className="line-clamp-2 text-sm text-dark-teal group-hover:text-honey-dark">{cleanTitle(l.title_raw)}</span>
                    <span className="mt-1 flex items-baseline justify-between gap-2">
                      <span className="tnum font-semibold text-honey-dark">{centsToMoney(l.price_cents)}</span>
                      <span className="truncate text-xs text-spruce-light">{l.source_name} · sold {soldDay(l.sold_at)}</span>
                    </span>
                  </span>
                </GuideLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-bone-dark pt-4 text-sm">
        <a href={`/search?q=${encodeURIComponent(singularLower)}`} className="text-honey-dark hover:underline">
          All {pluralLower} for sale →
        </a>
        <Link href="/guide" className="text-honey-dark hover:underline">Back to the price guide</Link>
      </nav>
    </article>
  );
}
