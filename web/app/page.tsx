import type { Metadata } from 'next';
import Link from 'next/link';
import SearchForm from '@/components/SearchForm';
import OutboundListingLink from '@/components/OutboundListingLink';
import { JsonLd, siteJsonLd } from '@/lib/jsonld';
import { SITE_URL } from '@/lib/site';
import { indexStats } from '@/lib/index-stats';
import { recentListings } from '@/lib/home';
import {
  listPublishableClusters, listBrandHubs, machineTypeSummaries,
  clusterPath, clusterTitle, brandHubPath, cleanTitle, centsToMoney, money, typePlural,
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
 */
export const metadata: Metadata = {
  title: { absolute: 'Benchlot — used woodworking tools: what they sell for, and where to buy' },
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

/** The eight chips the CRA grid also offers; they set its cat= / maker= filters. */
const CHIPS = [
  { label: 'Bench planes', param: 'cat', value: 'Bench Plane' },
  { label: 'Chisels', param: 'cat', value: 'Chisel' },
  { label: 'Hand saws', param: 'cat', value: 'Hand Saw' },
  { label: 'Moulding planes', param: 'cat', value: 'Moulding Plane' },
  { label: 'Stanley', param: 'maker', value: 'Stanley' },
  { label: 'Lie-Nielsen', param: 'maker', value: 'Lie-Nielsen' },
  { label: 'Veritas', param: 'maker', value: 'Veritas' },
  { label: 'Disston', param: 'maker', value: 'Disston' },
];

export default async function Home() {
  const [stats, recent, clusters, hubs, machines] = await Promise.all([
    indexStats(),
    recentListings(8),
    listPublishableClusters({ indexableOnly: true, grains: ['coarse'] }),
    listBrandHubs({ indexableOnly: true }),
    machineTypeSummaries(3),
  ]);
  const topPages = clusters.slice(0, 12);
  const topHubs = hubs.slice(0, 10);
  const topMachines = machines.slice(0, 6);

  return (
    <div>
      <JsonLd data={siteJsonLd(SITE_URL)} />

      <section>
        <h1 className="max-w-3xl font-display text-4xl font-semibold text-spruce sm:text-5xl">
          Search used woodworking tools across dealers, forums and auctions — and see what they actually sell for
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-spruce-light">
          Benchlot indexes <span className="tnum">{stats.activeCount.toLocaleString('en-US')}</span> live listings from{' '}
          <span className="tnum">{stats.sourceCount}</span> sources and keeps{' '}
          <span className="tnum">{stats.soldCount.toLocaleString('en-US')}</span> recorded sales, so you can tell a fair
          price from a hopeful one. Every listing links straight to the seller.
        </p>
        <div className="mt-6 max-w-2xl">
          <SearchForm
            action="/search"
            id="q-home"
            label="Search every listing"
            placeholder="Search listings, e.g. Stanley No. 5, Festool Domino, Delta Unisaw"
          />
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <li key={c.label}>
              <a href={`/search?${c.param}=${encodeURIComponent(c.value)}`}
                 className="inline-block rounded border border-bone-dark bg-bone-light px-3 py-1.5 text-sm text-spruce hover:border-honey">
                {c.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

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
                    <img src={l.images[0]} alt="" loading={i < 4 ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer"
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

      {topMachines.length > 0 && (
        <section className="mt-14">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-semibold text-spruce">Machines and power tools</h2>
            <Link href="/guide#machines" className="text-sm text-honey-dark hover:underline">Every machine →</Link>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topMachines.map((m) => (
              <li key={m.canonical_type} className="rounded-lg border border-bone-dark bg-bone-light px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-spruce">{typePlural(m.canonical_type)}</span>
                  <span className="tnum text-xs text-spruce-light">{m.active_total.toLocaleString('en-US')} for sale</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {m.top.map((r) => (
                    <Link key={r.cluster_key} href={clusterPath(r)} className="text-honey-dark hover:underline">{r.canonical_brand}</Link>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-xl font-semibold text-spruce">Price guide: the best-documented tools</h2>
          <Link href="/guide" className="text-sm text-honey-dark hover:underline">Full guide →</Link>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {topPages.map((c) => (
            <li key={c.cluster_key}>
              <Link href={clusterPath(c)}
                    className="flex items-baseline justify-between gap-3 rounded border border-bone-dark bg-bone-light px-3 py-2 text-sm text-spruce hover:border-honey">
                <span>{clusterTitle(c)}</span>
                <span className="tnum shrink-0 text-xs text-spruce-light">
                  {money(c.sold_p50) ? `median ${money(c.sold_p50)}` : `${c.sold_count} sold`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
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
