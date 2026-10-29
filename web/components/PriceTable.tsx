import GuideLink, { type GuideLinkKind } from './GuideLink';
import { money, SOLD_MIN_FOR_REFERENCE } from '@/lib/price-guide';

export type PriceRow = {
  key: string;
  label: string;
  href: string;
  sold_count: number;
  sold_p25: string | null;
  sold_p50: string | null;
  sold_p75: string | null;
  asking_count_active: number;
};

/**
 * A ranked price table: one row per maker (on a type page) or per tool type
 * (on a maker page), with the median, the middle half, the sale count and
 * what is for sale now. Rows under the 8-sale line keep their link (the
 * page exists, with listings and the alert form) but say "too few sales"
 * where a number would be. On phones the range and for-sale columns give
 * way; the median is the column a phone reader came for.
 */
export default function PriceTable({ rows, labelHeader, kind, pageKey }: {
  rows: PriceRow[];
  labelHeader: string;
  kind: GuideLinkKind;
  pageKey: string;
}) {
  return (
    <table className="mt-3 w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-bone-dark text-left text-xs uppercase tracking-wide text-spruce-light">
          <th scope="col" className="py-2 pr-3 font-medium">{labelHeader}</th>
          <th scope="col" className="py-2 pr-3 text-right font-medium">Median sold</th>
          <th scope="col" className="hidden py-2 pr-3 text-right font-medium sm:table-cell">Most sell for</th>
          <th scope="col" className="py-2 pr-3 text-right font-medium sm:pr-3">Sales</th>
          <th scope="col" className="hidden py-2 text-right font-medium sm:table-cell">For sale</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const enough = r.sold_count >= SOLD_MIN_FOR_REFERENCE;
          return (
            <tr key={r.key} className="border-b border-bone-dark/60 odd:bg-bone-light/60">
              <td className="py-2 pr-3">
                <GuideLink href={r.href} kind={kind} clusterKey={pageKey} className="font-medium text-spruce hover:text-honey-dark">
                  {r.label}
                </GuideLink>
              </td>
              <td className="tnum whitespace-nowrap py-2 pr-3 text-right">
                {enough ? <span className="font-semibold text-honey-dark">{money(r.sold_p50) ?? '—'}</span> : <span className="text-spruce-light">too few sales</span>}
              </td>
              <td className="tnum hidden whitespace-nowrap py-2 pr-3 text-right text-spruce-light sm:table-cell">
                {enough && r.sold_p25 && r.sold_p75 ? `${money(r.sold_p25)}–${money(r.sold_p75)}` : '—'}
              </td>
              <td className="tnum py-2 pr-3 text-right text-spruce">{r.sold_count.toLocaleString('en-US')}</td>
              <td className="tnum hidden py-2 text-right text-spruce-light sm:table-cell">{r.asking_count_active.toLocaleString('en-US')}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
