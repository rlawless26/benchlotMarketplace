import Image from 'next/image';
import GuideLink from './GuideLink';
import { typePlural } from '@/lib/price-guide';
import type { FamilyGroup } from '@/lib/guide-families';

/**
 * The eight family cards: a photo, the family name, how much evidence sits
 * behind it, and its three biggest tool types as links to their pages. The
 * card itself opens the family's section of the index (the full priced
 * table); the type links skip straight to /guide/{type}. Shared by the
 * homepage and the guide index so both show the same front door.
 */
export default function FamilyGrid({ families, surface, perFamily = 3, eager = 4 }: {
  families: FamilyGroup[];
  surface: 'home' | 'guide_index';
  /** Type links shown under each card. */
  perFamily?: number;
  /** Cards whose photo loads eagerly (the first row). */
  eager?: number;
}) {
  const sectionHref = (slug: string) => (surface === 'guide_index' ? `#${slug}` : `/guide#${slug}`);
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {families.map((f, i) => (
        <li key={f.family.slug} className="group flex flex-col overflow-hidden rounded-lg border border-bone-dark bg-bone-light hover:border-honey">
          <GuideLink href={sectionHref(f.family.slug)} kind="family_card" className="block">
            <span className="relative block aspect-[4/3] w-full overflow-hidden bg-bone-dark">
              {f.family.photo ? (
                <Image
                  src={`/guide/families/${f.family.photo}`}
                  alt={f.family.name}
                  fill
                  sizes="(min-width: 1024px) 240px, 50vw"
                  priority={i < eager}
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-display text-lg text-spruce-light">
                  {f.family.name}
                </span>
              )}
            </span>
            <span className="block px-3 pt-2.5">
              <span className="block font-display text-lg font-semibold leading-tight text-spruce group-hover:text-honey-dark">
                {f.family.name}
              </span>
              <span className="tnum mt-0.5 block text-xs text-spruce-light">
                {f.sold.toLocaleString('en-US')} sales · {f.types.length} {f.types.length === 1 ? 'type' : 'types'}
              </span>
            </span>
          </GuideLink>
          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 px-3 pb-3 text-sm">
            {f.types.slice(0, perFamily).map((t) => (
              <li key={t.type}>
                <GuideLink href={`/guide/${t.slug}`} kind="family_type" className="text-spruce hover:text-honey-dark hover:underline">
                  {typePlural(t.type)}
                </GuideLink>
              </li>
            ))}
            {f.types.length > perFamily && (
              <li>
                <GuideLink href={sectionHref(f.family.slug)} kind="family_card" className="text-spruce-light hover:text-honey-dark">
                  +{f.types.length - perFamily} more
                </GuideLink>
              </li>
            )}
          </ul>
        </li>
      ))}
    </ul>
  );
}
