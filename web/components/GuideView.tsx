import Link from 'next/link';
import PriceDistribution from './PriceDistribution';
import AlertSignup from './AlertSignup';
import {
  Cluster, ClusterRef, ClusterFacts, Listing, SoldPoint,
  clusterPath, clusterPhrase, clusterPhraseSingular, cleanTitle, typeLower, typePlural,
  money, centsToMoney, slug, SOLD_MIN_FOR_REFERENCE, ASKING_MIN_FOR_REFERENCE,
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

/**
 * Listing photo. A plain <img> on purpose: the images live on fifteen
 * third-party hosts (Shopify, eBay, dealer sites), so next/image would need a
 * wildcard remotePatterns entry and would route every one of ~180k photos
 * through Vercel's optimizer. Empty alt: the title beside it is the label, and
 * an empty-alt broken image renders as nothing rather than as a broken icon.
 */
function Thumb({ src }: { src: string | undefined }) {
  if (!src) return <div aria-hidden className="h-14 w-14 shrink-0 rounded bg-bone-dark" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
         className="h-14 w-14 shrink-0 rounded bg-bone-dark object-cover" />
  );
}

function Row({ l }: { l: Listing }) {
  return (
    <tr className="border-t border-bone-dark align-top">
      <td className="py-2 pr-3">
        <a href={l.source_url} target="_blank" rel="nofollow noopener"
           className="group flex items-start gap-3">
          <Thumb src={l.images?.[0]} />
          <span>
            <span className="text-spruce underline decoration-bone-dark underline-offset-2 group-hover:text-honey-dark">
              {cleanTitle(l.title_raw)}
            </span>
            {l.condition_raw ? (
              <span className="block text-xs text-spruce-light">{l.condition_raw}</span>
            ) : null}
          </span>
        </a>
      </td>
      <td className="whitespace-nowrap py-2 pr-3 text-sm text-spruce-light">
        <span className="inline-flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${KIND_CLASS[l.source_kind] ?? 'bg-spruce-light'}`} />
          {l.source_name}
        </span>
      </td>
      <td className="whitespace-nowrap py-2 pr-3 text-sm text-spruce-light">
        {l.dated_at ? new Date(l.dated_at).toISOString().slice(0, 10) : '—'}
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

const year = (iso: string | null) => (iso ? iso.slice(0, 4) : null);

function joinNames(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * The paragraph that is true of this page and no other: where the evidence
 * came from, how old it is, and what was left out. Written from the data so
 * it can never drift from the numbers beside it.
 */
function evidenceParagraph(phrase: string, f: ClusterFacts): string {
  if (f.total === 0) return '';
  const parts: string[] = [];

  const top = f.sources.slice(0, 3).map((s) => `${s.name} (${s.n})`);
  const rest = f.sources.length - 3;
  const from = rest > 0 ? `${top.join(', ')} and ${rest} other ${rest === 1 ? 'source' : 'sources'}` : joinNames(top);
  parts.push(`The ${f.total} ${f.total === 1 ? 'sale' : 'sales'} behind these figures ${f.total === 1 ? 'comes' : 'come'} from ${from}`);

  const a = year(f.firstAt);
  const b = year(f.lastAt);
  if (a && b) {
    parts[0] += a === b ? `, all in ${a}` : `, and run from ${a} to ${b}`;
    if (f.recent > 0 && a !== b) parts[0] += `; ${f.recent} closed in the last twelve months`;
  }
  parts[0] += '.';

  if (f.lotsExcluded > 0) {
    parts.push(
      `${f.lotsExcluded} ${f.lotsExcluded === 1 ? 'listing' : 'listings'} for sets, pairs or lots of ${phrase} ` +
      `${f.lotsExcluded === 1 ? 'was' : 'were'} left out, because a set's price is not one tool's price.`
    );
  }
  if (f.junkExcluded > 0) {
    parts.push(
      `${f.junkExcluded} sold as parts or for restoration ${f.junkExcluded === 1 ? 'was' : 'were'} left out as well.`
    );
  }
  return parts.join(' ');
}

export default function GuideView({
  cluster, sold, active, related, sizes, points, facts, note,
}: {
  cluster: Cluster;
  sold: Listing[];
  active: Listing[];
  related: ClusterRef[];
  sizes: ClusterRef[];
  points: SoldPoint[];
  facts: ClusterFacts;
  note: string | null;
}) {
  const phrase = clusterPhrase(cluster);                 // "Preston moulding planes"
  const singular = clusterPhraseSingular(cluster);       // "Preston moulding plane"
  const soldCount = cluster.sold_count ?? 0;
  const askingCount = cluster.asking_count ?? 0;
  const activeCount = cluster.asking_count_active ?? active.length;
  const hasSoldReference = soldCount >= SOLD_MIN_FOR_REFERENCE;
  const hasAskingReference = askingCount >= ASKING_MIN_FOR_REFERENCE;
  const typeSlug = cluster.canonical_type ? slug(cluster.canonical_type) : null;
  const brandPage = cluster.canonical_size ? sizes.find((s) => s.sizeSlug === null) : null;
  const sizePages = sizes.filter((s) => s.sizeSlug !== null);

  const alert = (heading?: string, className?: string) =>
    cluster.canonical_type && cluster.canonical_brand ? (
      <AlertSignup
        canonicalType={cluster.canonical_type}
        canonicalBrand={cluster.canonical_brand}
        canonicalSize={cluster.canonical_size}
        phrase={phrase}
        heading={heading}
        className={className}
      />
    ) : null;

  const evidence = evidenceParagraph(phrase, facts);

  return (
    <article>
      <nav className="mb-3 text-sm text-spruce-light">
        <Link href="/guide" className="hover:text-honey-dark">Price guide</Link>
        <span className="px-1.5">/</span>
        {typeSlug ? (
          <Link href={`/guide#${typeSlug}`} className="hover:text-honey-dark">{cluster.canonical_type}</Link>
        ) : (
          <span>{cluster.canonical_type}</span>
        )}
        {brandPage && (
          <>
            <span className="px-1.5">/</span>
            <Link href={clusterPath(brandPage)} className="hover:text-honey-dark">{cluster.canonical_brand}</Link>
          </>
        )}
      </nav>

      <h1 className="font-display text-4xl font-semibold text-spruce">
        {singular} prices
      </h1>
      <p className="mt-3 max-w-2xl text-spruce-light">
        What {phrase} actually sell for, from {soldCount.toLocaleString()} recorded{' '}
        {soldCount === 1 ? 'sale' : 'sales'}
        {activeCount > 0 ? ` and ${activeCount.toLocaleString()} ${activeCount === 1 ? 'listing' : 'listings'} for sale now` : ''}.
      </p>

      {/* Sold block — the honest number. Only stated when there is enough of it. */}
      <section className="mt-8 rounded-lg border border-bone-dark bg-bone-light p-6">
        <h2 className="font-display text-lg font-semibold text-spruce">Sold prices</h2>
        {hasSoldReference ? (
          <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-3">
            <Stat label="Median sold" value={money(cluster.sold_p50)} big />
            <Stat label="Most sell for" value={`${money(cluster.sold_p25)}–${money(cluster.sold_p75)}`} />
            <Stat label="Sales on record" value={soldCount.toLocaleString()} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-spruce-light">
            Only {soldCount} {soldCount === 1 ? 'sale' : 'sales'} on record — too few to
            quote a reliable figure. The individual sales are listed below; judge them yourself.
          </p>
        )}
        <p className="mt-4 border-t border-bone-dark pt-4 text-sm text-spruce-light">
          Have one?{' '}
          <a href="/scan" className="font-medium text-honey-dark hover:underline">
            Scan a photo of your {singular}
          </a>{' '}
          to see what yours is worth against these sales.
        </p>
      </section>

      {/* The most useful thing on the page goes right under the number: what
          can actually be bought today. When nothing is listed, the alert form
          takes the same slot — that is exactly when someone wants it. */}
      {active.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-spruce">
            For sale now ({activeCount.toLocaleString()})
          </h2>
          <p className="mb-3 text-sm text-spruce-light">
            Currently listed. Benchlot links straight to the seller — no fees, no middleman.
          </p>
          <Table rows={active} dateLabel="Listed" />
        </section>
      ) : (
        alert('Nothing for sale right now', 'mt-8')
      )}

      {points.length >= 6 && (
        <PriceDistribution points={points} median={cluster.sold_p50 ? Number(cluster.sold_p50) : null} />
      )}

      <ByKind
        asking={cluster.asking_by_kind as Record<string, KindStats> | null}
        sold={cluster.sold_by_kind as Record<string, KindStats> | null}
      />

      {/* Asking block — only when there is enough of it to say something. An
          empty card that announces there is nothing to summarise is noise. */}
      {hasAskingReference && (
        <section className="mt-6 rounded-lg border border-bone-dark p-6">
          <h2 className="font-display text-lg font-semibold text-spruce">Asking prices</h2>
          <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat label="Median asking" value={money(cluster.asking_p50)} big />
            <Stat label="Most ask" value={`${money(cluster.asking_p25)}–${money(cluster.asking_p75)}`} />
            <Stat label="Listings" value={askingCount.toLocaleString()} />
          </div>
          <p className="mt-4 text-sm text-spruce-light">
            Asking prices run higher than sold prices. Sellers post hopefully, and unsold listings
            linger; treat the sold figures above as the real signal.
          </p>
        </section>
      )}

      {(note || evidence) && (
        <section className="mt-10 max-w-2xl">
          <h2 className="font-display text-xl font-semibold text-spruce">About {phrase}</h2>
          {note && <p className="mt-3 text-spruce">{note}</p>}
          {evidence && <p className="mt-3 text-sm text-spruce-light">{evidence}</p>}
        </section>
      )}

      {sold.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-spruce">Recorded sales</h2>
          <p className="mb-3 text-sm text-spruce-light">
            {sold.length < soldCount
              ? `The ${sold.length} most recent of ${soldCount.toLocaleString()} sales behind the numbers above. Click through to the source.`
              : 'Every sale behind the numbers above, most recent first. Click through to the source.'}
          </p>
          <Table rows={sold} dateLabel="Sold" />
        </section>
      )}

      {active.length > 0 && alert()}

      {sizePages.length > 0 && (
        <section className="mt-12 border-t border-bone-dark pt-6">
          <h2 className="font-display text-lg font-semibold text-spruce">
            {cluster.canonical_brand} {cluster.canonical_type ? typeLower(typePlural(cluster.canonical_type)) : 'tools'} by size
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {brandPage && (
              <li>
                <Link href={clusterPath(brandPage)}
                      className="inline-block rounded border border-bone-dark bg-bone-light px-3 py-1.5 text-sm text-spruce hover:border-honey">
                  All sizes
                  <span className="tnum ml-2 text-xs text-spruce-light">{brandPage.sold_count} sold</span>
                </Link>
              </li>
            )}
            {sizePages.map((r) => (
              <li key={r.cluster_key}>
                <Link href={clusterPath(r)}
                      className="inline-block rounded border border-bone-dark bg-bone-light px-3 py-1.5 text-sm text-spruce hover:border-honey">
                  {r.canonical_size}
                  <span className="tnum ml-2 text-xs text-spruce-light">
                    {r.sold_count > 0 ? `${r.sold_count} sold` : `${r.asking_count} listed`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-12 border-t border-bone-dark pt-6">
          <h2 className="font-display text-lg font-semibold text-spruce">
            Other {cluster.canonical_type ? typeLower(cluster.canonical_type) : 'tool'} brands
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {related.map((r) => (
              <li key={r.cluster_key}>
                <Link href={clusterPath(r)}
                      className="inline-block rounded border border-bone-dark bg-bone-light px-3 py-1.5 text-sm text-spruce hover:border-honey">
                  {clusterPhrase(r)}
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
