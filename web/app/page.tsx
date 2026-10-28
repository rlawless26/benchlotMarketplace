import type { Metadata } from 'next';
import Link from 'next/link';
import SearchForm from '@/components/SearchForm';
import OutboundListingLink from '@/components/OutboundListingLink';
import GuideLink from '@/components/GuideLink';
import FamilyGrid from '@/components/FamilyGrid';
import { JsonLd, siteJsonLd } from '@/lib/jsonld';
import { SITE_URL } from '@/lib/site';
import { indexStats } from '@/lib/index-stats';
import { recentListings, recentSales } from '@/lib/home';
import { groupClustersByType } from '@/lib/guide-index';
import { groupByFamily } from '@/lib/guide-families';
import {
  listPublishableClusters, listBrandHubs, brandHubPath, cleanTitle, centsToMoney, slug,
} from '@/lib/price-guide';

export const revalidate = 3600;

/**
 * benchlot.com/ — served here through a rewrite from the CRA project.
 *
 * Static HTML with the value proposition, a search box, the ways in, and a
 * handful of fresh listings. Before this, the homepage was a client-rendered
 * grid that fetched 2,500 rows per source before showing anything, had no
 * H1, and read as "You need to enable JavaScript" to ChatGPT's fetcher and
 * every AI crawler. The grid still exists at /search.
 *
 * 2026-10-27: the front door now opens onto the price guide. The visitor
 * analysis showed guide pages are what people come for and convert on (a
 * quarter of all sessions end at a seller from one), while the homepage sent
 * half its visitors away within seven seconds. So: guide search as the hero,
 * the type index beneath it, the week's recorded sales, then the listings.
 */
export const metadata: Metadata = {
  title: { absolute: 'Benchlot — what used woodworking tools sell for' },
  description:
    'Recorded sale prices and current listings for used woodworking hand tools and machines, gathered from dealers, forum classifieds, auctions and marketplaces. Search, check a price, scan a photo, or get an alert when one is listed.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Benchlot — what used woodworking tools actually sell for',
    description: 'Sold prices and current listings for used hand tools and machines, from dealers, forums, auctions and marketplaces.',
    url: '/',
    type: 'website',
    images: ['/og-image.png'],
  },
};

/** Eight ways into the guide: the biggest types and the makers people search for. */
const CHIPS: { label: string; href: string }[] = [
  { label: 'Bench planes', href: `/guide/${slug('Bench Plane')}` },
  { label: 'Hand saws', href: `/guide/${slug('Hand Saw')}` },
  { label: 'Chisels', href: `/guide/${slug('Chisel')}` },
  { label: 'Stanley', href: brandHubPath('stanley') },
  { label: 'Lie-Nielsen', href: brandHubPath('lie-nielsen') },
  { label: 'Table saws', href: `/guide/${slug('Table Saw')}` },
  { label: 'Band saws', href: `/guide/${slug('Band Saw')}` },
  { label: 'Jointers', href: `/guide/${slug('Jointer')}` },
];

function soldDay(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default async function Home() {
  const [stats, recent, clusters, hubs, soldRaw] = await Promise.all([
    indexStats(),
    recentListings(8),
    listPublishableClusters({ grains: ['coarse'] }),
    listBrandHubs({ indexableOnly: true }),
    recentSales(8, 7),
  ]);
  // A quiet week still gets a strip: widen to a fortnight before giving up.
  const sold = soldRaw.length >= 3 ? soldRaw : await recentSales(8, 14);
  const families = groupByFamily(groupClustersByType(clusters));
  const topHubs = hubs.slice(0, 10);

  return (
    <div>
      <JsonLd data={siteJsonLd(SITE_URL)} />

      <section>
        <h1 className="max-w-3xl font-display text-4xl font-semibold text-spruce sm:text-5xl">
          What a used woodworking tool is worth
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-spruce-light">
          Recorded sale prices for <span className="tnum">{stats.soldCount.toLocaleString('en-US')}</span> tools and{' '}
          <span className="tnum">{stats.activeCount.toLocaleString('en-US')}</span> listings for sale now, from{' '}
          <span className="tnum">{stats.sourceCount}</span> dealers, forums and marketplaces. Sold prices, not asking
          prices, and every listing links straight to the seller.
        </p>
        <div className="mt-6 max-w-2xl">
          <SearchForm
            id="q-home"
            label="Search the price guide"
            placeholder="Stanley No. 4, Disston D-8, Lie-Nielsen chisel…"
          />
          <p className="mt-2 text-sm text-spruce-light">
            or <a href="/search" className="text-honey-dark hover:underline">search every listing for sale</a>
          </p>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <li key={c.label}>
              <GuideLink href={c.href} kind="home_chip"
                         className="inline-block rounded border border-bone-dark bg-bone-light px-3 py-1.5 text-sm text-spruce hover:border-honey">
                {c.label}
              </GuideLink>
            </li>
          ))}
        </ul>
      </section>

      {families.length > 0 && (
        <section className="mt-14">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-semibold text-spruce">Price guide by tool type</h2>
            <Link href="/guide" className="text-sm text-honey-dark hover:underline">Full guide →</Link>
          </div>
          <p className="mt-1 text-sm text-spruce-light">
            Sold prices by maker, from at least eight recorded sales. Machines and hand tools alike.
          </p>
          <div className="mt-4">
            <FamilyGrid families={families} surface="home" />
          </div>
        </section>
      )}

      {sold.length >= 3 && (
        <section className="mt-14">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-semibold text-spruce">Sold this week</h2>
            <Link href="/guide" className="text-sm text-honey-dark hover:underline">See the price guide →</Link>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {sold.map((l, i) => (
              <li key={l.id}>
                <GuideLink href={l.guidePath} kind="home_sold"
                           className="group block overflow-hidden rounded-lg border border-bone-dark bg-bone-light hover:border-honey">
                  {l.images?.[0] ? (
                    <span className="block aspect-square w-full overflow-hidden bg-bone-dark">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.images[0]} alt="" loading={i < 4 ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer"
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

      {recent.length > 0 && (
        <section className="mt-14">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-semibold text-spruce">Just listed</h2>
            <a href="/search" className="text-sm text-honey-dark hover:underline">All listings →</a>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recent.map((l, i) => (
              <li key={l.id}>
                <OutboundListingLink
                  href={l.source_url} listingId={l.id} source={l.source} sourceKind={l.source_kind}
                  priceCents={l.price_cents} status="active" position={i} clusterKey={null} surface="home_recent"
                  className="group block overflow-hidden rounded-lg border border-bone-dark bg-bone-light hover:border-honey"
                >
                  <span className="block aspect-square w-full overflow-hidden bg-bone-dark">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.images[0]} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
                         className="h-full w-full object-cover" />
                  </span>
                  <span className="block p-2.5">
                    <span className="line-clamp-2 text-sm text-dark-teal group-hover:text-honey-dark">{cleanTitle(l.title_raw)}</span>
                    <span className="mt-1 flex items-baseline justify-between gap-2">
                      <span className="tnum font-semibold text-honey-dark">{centsToMoney(l.price_cents)}</span>
                      <span className="truncate text-xs text-spruce-light">{l.source_name}</span>
                    </span>
                  </span>
                </OutboundListingLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-bone-dark bg-bone-light p-6">
          <h2 className="font-display text-xl font-semibold text-spruce">Have a tool? See what it is worth</h2>
          <p className="mt-2 text-spruce-light">
            Photograph it and Benchlot names the maker, model, era and condition, then shows recorded sale prices and
            matching listings. Free, no account.
          </p>
          <Link href="/scan" className="mt-4 inline-block rounded bg-honey px-5 py-2.5 font-medium text-dark-teal hover:bg-honey-light">
            Scan a photo
          </Link>
        </div>
        <div className="rounded-xl border border-bone-dark bg-bone-light p-6">
          <h2 className="font-display text-xl font-semibold text-spruce">Hunting something specific?</h2>
          <p className="mt-2 text-spruce-light">
            Open the tool&rsquo;s page in the price guide and use the alert form under its prices: one email
            when a match is listed anywhere Benchlot indexes. No account, one click to confirm, unsubscribe any time.
          </p>
          <Link href="/guide" className="mt-4 inline-block rounded border border-bone-dark bg-bone px-5 py-2.5 font-medium text-spruce hover:border-honey">
            Find the tool&rsquo;s page
          </Link>
        </div>
      </section>

      {topHubs.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold text-spruce">By maker</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {topHubs.map((h) => (
              <li key={h.brandSlug}>
                <Link href={brandHubPath(h.brandSlug)}
                      className="inline-block rounded border border-bone-dark bg-bone-light px-3 py-1.5 text-sm text-spruce hover:border-honey">
                  {h.canonical_brand}
                  <span className="tnum ml-2 text-xs text-spruce-light">{h.type_count} types</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14 max-w-2xl text-sm text-spruce-light">
        <h2 className="font-display text-lg font-semibold text-spruce">How Benchlot works</h2>
        <p className="mt-2">
          Benchlot reads public listings from tool dealers, forum classifieds, auction houses and marketplaces every night,
          sorts them by maker and tool type, and keeps the ones that sold as a price record. The guide quotes a median only
          when there are at least eight recorded sales; sets, lots and parts are left out of the figures. Benchlot links to
          the seller and takes nothing from the sale: no affiliate links, no brokering.
        </p>
      </section>
    </div>
  );
}
