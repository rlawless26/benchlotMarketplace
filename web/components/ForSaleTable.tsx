'use client';

import { useState } from 'react';
import OutboundListingLink from './OutboundListingLink';
import { cleanTitle, centsToMoney } from '@/lib/format';
import type { Listing } from '@/lib/price-guide';

export type Band = 'below' | 'typical' | 'above';

const KIND_CLASS: Record<string, string> = {
  Dealer: 'bg-kind-dealer', Forum: 'bg-kind-forum', Reddit: 'bg-kind-reddit',
  Marketplace: 'bg-kind-marketplace', Auction: 'bg-kind-auction',
};

/**
 * Where a listing's asking price sits against the page's recorded sales.
 * Three plain bands on the middle-half range; a percentage, against the
 * median, only outside it. Null when the page has too few sales to say.
 */
export function priceBand(
  priceCents: number | null,
  stats: { p25: number | null; p50: number | null; p75: number | null; soldCount: number; min: number }
): { band: Band; pct: number | null } | null {
  if (priceCents == null || stats.soldCount < stats.min) return null;
  if (stats.p25 == null || stats.p50 == null || stats.p75 == null || stats.p50 <= 0) return null;
  const price = priceCents / 100;
  if (price < stats.p25) return { band: 'below', pct: Math.round(((stats.p50 - price) / stats.p50) * 100) };
  if (price > stats.p75) return { band: 'above', pct: Math.round(((price - stats.p50) / stats.p50) * 100) };
  return { band: 'typical', pct: null };
}

const BAND_LABEL: Record<Band, string> = { below: 'under typical', typical: 'typical', above: 'over typical' };
const BAND_CLASS: Record<Band, string> = {
  below: 'bg-success/10 text-success',
  typical: 'bg-bone-dark text-spruce',
  above: 'bg-warning/10 text-warning',
};

/**
 * The "For sale now" list. A buyer arriving from ChatGPT or Google uses this
 * and leaves (median scroll depth 18%), so the list itself carries the price
 * context instead of asking the visitor to compare each row with the median
 * in their head. Laid out as rows, not a table, so it reads at 380px wide
 * without sideways scrolling; sortable by date (default) or price.
 */
export default function ForSaleTable({
  rows, clusterKey, stats,
}: {
  rows: Listing[];
  clusterKey: string;
  stats: { p25: number | null; p50: number | null; p75: number | null; soldCount: number; min: number };
}) {
  const [sort, setSort] = useState<'date' | 'price_asc' | 'price_desc'>('date');
  // dated_at is a Date on the server (pg) and an ISO string once serialised
  // to the client; compare through Date either way.
  const when = (d: Listing['dated_at']) => (d ? new Date(d).getTime() : 0);
  const sorted = [...rows].sort((a, b) => {
    if (sort === 'price_asc') return (a.price_cents ?? Infinity) - (b.price_cents ?? Infinity);
    if (sort === 'price_desc') return (b.price_cents ?? -1) - (a.price_cents ?? -1);
    return when(b.dated_at) - when(a.dated_at);
  });
  const banded = rows.map((r) => priceBand(r.price_cents, stats));
  const hasBands = banded.some(Boolean);
  const below = banded.filter((b) => b?.band === 'below').length;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-spruce-light">
          {hasBands && below > 0
            ? <><span className="tnum font-medium text-success">{below}</span> of these {rows.length} {below === 1 ? 'is' : 'are'} priced under what this tool usually sells for.</>
            : hasBands
              ? 'None of these is priced under what this tool usually sells for.'
              : 'Currently listed. Benchlot links straight to the seller — no fees, no middleman.'}
        </p>
        <label className="text-xs text-spruce-light">
          Sort{' '}
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="rounded border border-bone-dark bg-bone px-1.5 py-1 text-xs text-dark-teal">
            <option value="date">newest</option>
            <option value="price_asc">price, low to high</option>
            <option value="price_desc">price, high to low</option>
          </select>
        </label>
      </div>
      <ul className="divide-y divide-bone-dark border-y border-bone-dark">
        {sorted.map((l) => {
          const i = rows.indexOf(l);
          const b = banded[i];
          return (
            <li key={l.id} className="py-2.5">
              <OutboundListingLink
                href={l.source_url} className="group flex items-start gap-3"
                listingId={l.id} source={l.source} sourceKind={l.source_kind} priceCents={l.price_cents}
                status="active" position={i} clusterKey={clusterKey} surface="guide_page" priceBand={b?.band ?? null}
              >
                {l.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.images[0]} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
                       className="h-14 w-14 shrink-0 rounded bg-bone-dark object-cover" />
                ) : (
                  <span aria-hidden className="h-14 w-14 shrink-0 rounded bg-bone-dark" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-spruce underline decoration-bone-dark underline-offset-2 group-hover:text-honey-dark">
                    {cleanTitle(l.title_raw)}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-spruce-light">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${KIND_CLASS[l.source_kind] ?? 'bg-spruce-light'}`} />
                      {l.source_name}
                    </span>
                    {l.dated_at && <span>· listed {new Date(l.dated_at).toISOString().slice(0, 10)}</span>}
                    {l.condition_raw && <span>· {l.condition_raw}</span>}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="tnum block font-medium text-honey-dark">{centsToMoney(l.price_cents)}</span>
                  {b && (
                    <span className={`tnum mt-0.5 inline-block rounded px-1.5 py-0.5 text-xs ${BAND_CLASS[b.band]}`}>
                      {b.pct != null ? `${b.pct}% ${BAND_LABEL[b.band]}` : BAND_LABEL[b.band]}
                    </span>
                  )}
                </span>
              </OutboundListingLink>
            </li>
          );
        })}
      </ul>
      {hasBands && (
        <p className="mt-2 text-xs text-spruce-light">
          Compared with {stats.soldCount.toLocaleString()} recorded sales: &ldquo;typical&rdquo; is the middle half of
          sale prices; the percentage is against the median. Condition and completeness vary — check the listing.
        </p>
      )}
    </div>
  );
}
