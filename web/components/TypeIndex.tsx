import GuideLink from './GuideLink';
import { typePlural, SOLD_MIN_FOR_REFERENCE } from '@/lib/price-guide';
import type { TypeGroup } from '@/lib/guide-index';

/**
 * The guide's table of contents as a chip grid: one chip per tool type,
 * linking to that type's section of /guide. Used on the homepage, where it
 * replaces a hand-picked "best-documented tools" list with the whole index.
 */
export default function TypeIndex({ groups, limit = 24, totalTypes }: {
  groups: TypeGroup[];
  limit?: number;
  /** When the list is cut at `limit`, the trailing chip says how many there are. */
  totalTypes?: number;
}) {
  const shown = groups.slice(0, limit);
  const total = totalTypes ?? groups.length;
  return (
    <ul className="flex flex-wrap gap-2">
      {shown.map((g) => (
        <li key={g.type}>
          <GuideLink
            href={`/guide#${g.slug}`}
            kind="type_index"
            className="inline-block rounded border border-bone-dark bg-bone-light px-3 py-1.5 text-sm text-spruce hover:border-honey"
          >
            {typePlural(g.type)}
            <span className="tnum ml-2 text-xs text-spruce-light">
              {g.sold >= SOLD_MIN_FOR_REFERENCE
                ? `${g.sold.toLocaleString('en-US')} sold`
                : `${g.forSaleNow.toLocaleString('en-US')} for sale`}
            </span>
          </GuideLink>
        </li>
      ))}
      {total > shown.length && (
        <li>
          <GuideLink href="/guide" kind="type_index"
                     className="inline-block rounded border border-honey bg-bone-light px-3 py-1.5 text-sm font-medium text-spruce hover:border-honey-dark">
            All {total} tool types →
          </GuideLink>
        </li>
      )}
    </ul>
  );
}
