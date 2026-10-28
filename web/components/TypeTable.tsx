import GuideLink from './GuideLink';
import { typePlural, money } from '@/lib/price-guide';
import type { TypeGroup } from '@/lib/guide-index';

/**
 * One family's tool types as a priced table on the guide index: what the
 * old chip wall could not say. "Maker medians" is the spread of per-maker
 * medians (eight or more sales each), so a reader sees at a glance that a
 * bench plane runs from $40 (Craftsman) to $600 (Norris) before clicking.
 */
export default function TypeTable({ types }: { types: TypeGroup[] }) {
  return (
    <table className="mt-3 w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-bone-dark text-left text-xs uppercase tracking-wide text-spruce-light">
          <th scope="col" className="py-2 pr-3 font-medium">Tool type</th>
          <th scope="col" className="hidden py-2 pr-3 text-right font-medium sm:table-cell">Makers</th>
          <th scope="col" className="py-2 pr-3 text-right font-medium">Sales</th>
          <th scope="col" className="py-2 pr-3 text-right font-medium">For sale</th>
          <th scope="col" className="hidden py-2 text-right font-medium sm:table-cell">Maker medians</th>
        </tr>
      </thead>
      <tbody>
        {types.map((t) => (
          <tr key={t.type} className="border-b border-bone-dark/60 odd:bg-bone-light/60">
            <td className="py-2 pr-3">
              <GuideLink href={`/guide/${t.slug}`} kind="type_hub" className="font-medium text-spruce hover:text-honey-dark">
                {typePlural(t.type)}
              </GuideLink>
            </td>
            <td className="tnum hidden py-2 pr-3 text-right text-spruce-light sm:table-cell">{t.makers}</td>
            <td className="tnum py-2 pr-3 text-right text-spruce">{t.sold.toLocaleString('en-US')}</td>
            <td className="tnum py-2 pr-3 text-right text-spruce-light">{t.forSaleNow.toLocaleString('en-US')}</td>
            <td className="tnum hidden py-2 text-right sm:table-cell">
              {t.p50Min !== null && t.p50Max !== null ? (
                <span className="font-semibold text-honey-dark">
                  {t.p50Min === t.p50Max ? money(t.p50Min) : `${money(t.p50Min)}–${money(t.p50Max)}`}
                </span>
              ) : (
                <span className="text-spruce-light">too few sales</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
