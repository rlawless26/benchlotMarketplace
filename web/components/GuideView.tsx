import Link from 'next/link';
import PriceDistribution from './PriceDistribution';
import AlertSignup from './AlertSignup';
import {
  Cluster, ClusterRef, Listing, SoldPoint, clusterPath, clusterTitle, money, centsToMoney,
  SOLD_MIN_FOR_REFERENCE, ASKING_MIN_FOR_REFERENCE,
} from '@/lib/price-guide';

const KIND_CLASS: Record<string, string> = {
  Dealer: 'bg-kind-dealer', Forum: 'bg-kind-forum', Reddit: 'bg-kind-reddit',
  Marketplace: 'bg-kind-marketplace', Auction: 'bg-kind-auction',
};

function Stat({ label, value, big = false }: { label: string; value: string | null; big?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-spruce-light">{label}</div>
      <div className={`tnum font-display font-semibold text-honey-dark ${big ? 'text-3xl' : 'text-xl'}`}>
        {value ?? '—'}
      </div>
    </div>
  );
}

type KindStats = { count?: number; p50?: number | null } | null;

/**
 * Sold and asking side by side, split by where the listing lives.
 *
 * Without this split the page reads as a contradiction: a $169 sold median next
 * to a $50 asking median. Both are correct — dealers sell restored stock and
 * marketplaces sell everything — but blending them into one "sold vs asking"
 * comparison implies a single market and makes the guide look wrong.
 */
function ByKind({
  asking, sold,
}: { asking: Record<string, KindStats> | null; sold: Record<string, KindStats> | null }) {
  const KINDS = [
    ['Dealer', 'Dealers'],
    ['Marketplace', 'Marketplaces'],
    ['Forum', 'Forum classifieds'],
    ['Reddit', 'Reddit'],
  ] as const;

  const rows = KINDS.map(([key, label]) => ({
    label,
    asking: asking?.[key] ?? null,
    sold: sold?.[key] ?? null,
  })).filter((r) => r.asking?.count || r.sold?.count);

  if (rows.length < 2) return null;

  const cell = (s: KindStats) =>
    s?.count && s.p50 != null ? (
      <>
        <span className="tnum font-medium text-honey-dark">{money(s.p50)}</span>
        <span className="tnum ml-1.5 text-xs text-spruce-light">
          {s.count.toLocaleString()}
        </span>
      </>
    ) : (
      <span className="text-spruce-light">—</span>
    );

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[26rem] text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-spruce-light">
            <th className="pb-2 font-medium">Where</th>
            <th className="pb-2 font-medium">Median sold</th>
            <th className="pb-2 font-medium">Median asking</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-bone-dark">
              <td className="py-2 pr-4 text-spruce">{r.label}</td>
              <td className="py-2 pr-4">{cell(r.sold)}</td>
              <td className="py-2">{cell(r.asking)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-sm text-spruce-light">
        These are different markets, not a contradiction. Dealers list restored,
        checked tools and price accordingly; marketplaces carry everything from
        collector-grade down to parts. Compare within a row, not across the table.
      </p>
    </div>
  );
}

function Row({ l }: { l: Listing }) {
  const when = l.sold_at ?? l.posted_at ?? l.last_seen_at;
  return (
    <tr className="border-t border-bone-dark align-top">
      <td className="py-2 pr-3">
        <a href={l.source_url} target="_blank" rel="nofollow noopener"
           className="text-spruce underline decoration-bone-dark underline-offset-2 hover:text-honey-dark">
          {l.title_raw}
        </a>
        {l.condition_raw ? (
          <div className="text-xs text-spruce-light">{l.condition_raw}</div>
        ) : null}
      </td>
      <td className="whitespace-nowrap py-2 pr-3 text-sm text-spruce-light">
        <span className="inline-flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${KIND_CLASS[l.source_kind] ?? 'bg-spruce-light'}`} />
          {l.source_name}
        </span>
      </td>
      <td className="whitespace-nowrap py-2 pr-3 text-sm text-spruce-light">
        {when ? new Date(when).toISOString().slice(0, 10) : '—'}
      </td>
      <td className="tnum whitespace-nowrap py-2 text-right font-medium text-honey-dark">
        {centsToMoney(l.price_cents)}
      </td>
    </tr>
  );
}

function Table({ rows, dateLabel }: { rows: Listing[]; dateLabel: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-spruce-light">
            <th className="pb-2 font-medium">Listing</th>
            <th className="pb-2 font-medium">Source</th>
            <th className="pb-2 font-medium">{dateLabel}</th>
            <th className="pb-2 text-right font-medium">Price</th>
          </tr>
        </thead>
        <tbody>{rows.map((l) => <Row key={l.id} l={l} />)}</tbody>
      </table>
    </div>
  );
}

export default function GuideView({
  cluster, sold, active, related, points,
}: { cluster: Cluster; sold: Listing[]; active: Listing[]; related: ClusterRef[]; points: SoldPoint[] }) {
  const title = clusterTitle(cluster);
  const soldCount = cluster.sold_count ?? 0;
  const askingCount = cluster.asking_count ?? 0;
  const hasSoldReference = soldCount >= SOLD_MIN_FOR_REFERENCE;
  const hasAskingReference = askingCount >= ASKING_MIN_FOR_REFERENCE;

  return (
    <article>
      <nav className="mb-3 text-sm text-spruce-light">
        <Link href="/guide" className="hover:text-honey-dark">Price guide</Link>
        <span className="px-1.5">/</span>
        <span>{cluster.canonical_type}</span>
      </nav>

      <h1 className="font-display text-4xl font-semibold text-spruce">
        {title} prices
      </h1>
      <p className="mt-3 max-w-2xl text-spruce-light">
        What {title} actually sells for, based on {soldCount.toLocaleString()} sold{' '}
        {soldCount === 1 ? 'listing' : 'listings'} and {askingCount.toLocaleString()} asking{' '}
        {askingCount === 1 ? 'price' : 'prices'} gathered from dealers, forum classifieds and
        marketplaces.
      </p>

      {/* Sold block — the honest number. Only stated when there is enough of it. */}
      <section className="mt-8 rounded-lg border border-bone-dark bg-bone-light p-6">
        <h2 className="font-display text-lg font-semibold text-spruce">Sold prices</h2>
        {hasSoldReference ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
              <Stat label="Median sold" value={money(cluster.sold_p50)} big />
              <Stat label="25th pct" value={money(cluster.sold_p25)} />
              <Stat label="75th pct" value={money(cluster.sold_p75)} />
              <Stat label="Sold comps" value={soldCount.toLocaleString()} />
            </div>
            <p className="mt-4 text-sm text-spruce-light">
              Typical range {money(cluster.sold_p25)}–{money(cluster.sold_p75)}. Half of sales
              land inside it.
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-spruce-light">
            Only {soldCount} sold {soldCount === 1 ? 'comp' : 'comps'} on record — too few to
            quote a reliable figure. The individual sales are listed below; judge them yourself.
          </p>
        )}
      </section>

      {points.length >= 6 && (
        <PriceDistribution points={points} median={cluster.sold_p50 ? Number(cluster.sold_p50) : null} />
      )}

      <ByKind
        asking={cluster.asking_by_kind as Record<string, KindStats> | null}
        sold={cluster.sold_by_kind as Record<string, KindStats> | null}
      />

      {/* Asking block — clearly separated, because asking prices are wishful. */}
      <section className="mt-6 rounded-lg border border-bone-dark p-6">
        <h2 className="font-display text-lg font-semibold text-spruce">Asking prices</h2>
        {hasAskingReference ? (
          <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat label="Median asking" value={money(cluster.asking_p50)} big />
            <Stat label="25th pct" value={money(cluster.asking_p25)} />
            <Stat label="75th pct" value={money(cluster.asking_p75)} />
            <Stat label="Listings" value={askingCount.toLocaleString()} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-spruce-light">
            {askingCount} asking {askingCount === 1 ? 'price' : 'prices'} on record — not enough
            to summarise.
          </p>
        )}
        <p className="mt-4 text-sm text-spruce-light">
          Asking prices run higher than sold prices. Sellers post hopefully, and unsold listings
          linger; treat the sold figures above as the real signal.
        </p>
      </section>

      {sold.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-spruce">Recent sales</h2>
          <p className="mb-3 text-sm text-spruce-light">
            Every sold comp behind the numbers above. Click through to the source.
          </p>
          <Table rows={sold} dateLabel="Sold" />
        </section>
      )}

      {active.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-spruce">
            For sale now ({(cluster.asking_count_active ?? active.length).toLocaleString()})
          </h2>
          <p className="mb-3 text-sm text-spruce-light">
            Currently listed. Benchlot links straight to the seller — no fees, no middleman.
          </p>
          <Table rows={active} dateLabel="Listed" />
        </section>
      )}

      {cluster.canonical_type && cluster.canonical_brand && (
        <AlertSignup
          canonicalType={cluster.canonical_type}
          canonicalBrand={cluster.canonical_brand}
          canonicalSize={cluster.canonical_size}
          summary={title}
        />
      )}

      <section className="mt-8 rounded-lg border border-bone-dark bg-bone-light p-5">
        <h2 className="font-display text-base font-semibold text-spruce">
          Have one of these?
        </h2>
        <p className="mt-1 text-sm text-spruce-light">
          Photograph it and we&rsquo;ll identify the exact model and era, then show
          you what it&rsquo;s worth against these prices.{' '}
          <a href="/scan" className="font-medium text-honey-dark hover:underline">
            Scan your tool &rarr;
          </a>
        </p>
      </section>

      {related.length > 0 && (
        <section className="mt-12 border-t border-bone-dark pt-6">
          <h2 className="font-display text-lg font-semibold text-spruce">
            Other {cluster.canonical_type?.toLowerCase()} brands
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {related.map((r) => (
              <li key={r.cluster_key}>
                <Link href={clusterPath(r)}
                      className="inline-block rounded border border-bone-dark bg-bone-light px-3 py-1.5 text-sm text-spruce hover:border-honey">
                  {clusterTitle(r)}
                  <span className="tnum ml-2 text-xs text-spruce-light">{r.sold_count} sold</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cluster.last_built_at && (
        <p className="mt-10 text-xs text-spruce-light">
          Updated {new Date(cluster.last_built_at).toISOString().slice(0, 10)}.
        </p>
      )}
    </article>
  );
}
