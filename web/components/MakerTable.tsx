import GuideLink from './GuideLink';
import { clusterPath, money, SOLD_MIN_FOR_REFERENCE, type TypeMakerRow } from '@/lib/price-guide';

/**
 * The ranked maker table on a /guide/{type} page: the one place the guide
 * puts every maker of a tool side by side with a price. Rows under the
 * 8-sale line keep their link (the page exists, with the for-sale list and
 * the alert form) but say "too few sales" where a number would be.
 */
export default function MakerTable({ rows, pageKey }: { rows: TypeMakerRow[]; pageKey: string }) {
  return (
    <table className="mt-3 w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-bone-dark text-left text-xs uppercase tracking-wide text-spruce-light">
          <th scope="col" className="py-2 pr-3 font-medium">Maker</th>
          <th scope="col" className="py-2 pr-3 text-right font-medium">Median sold</th>
          <th scope="col" className="hidden py-2 pr-3 text-right font-medium sm:table-cell">Most sell for</th>
          <th scope="col" className="py-2 pr-3 text-right font-medium">Sales</th>
          <th scope="col" className="py-2 text-right font-medium">For sale</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const enough = r.sold_count >= SOLD_MIN_FOR_REFERENCE;
          return (
            <tr key={r.cluster_key} className="border-b border-bone-dark/60 odd:bg-bone-light/60">
              <td className="py-2 pr-3">
                <GuideLink href={clusterPath(r)} kind="type_maker" clusterKey={pageKey} className="font-medium text-spruce hover:text-honey-dark">
                  {r.canonical_brand}
                </GuideLink>
              </td>
              <td className="tnum py-2 pr-3 text-right">
                {enough ? <span className="font-semibold text-honey-dark">{money(r.sold_p50) ?? '—'}</span> : <span className="text-spruce-light">too few sales</span>}
              </td>
              <td className="tnum hidden py-2 pr-3 text-right text-spruce-light sm:table-cell">
                {enough && r.sold_p25 && r.sold_p75 ? `${money(r.sold_p25)}–${money(r.sold_p75)}` : '—'}
              </td>
              <td className="tnum py-2 pr-3 text-right text-spruce">{r.sold_count.toLocaleString('en-US')}</td>
              <td className="tnum py-2 text-right text-spruce-light">{r.asking_count_active.toLocaleString('en-US')}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
