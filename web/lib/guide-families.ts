import { MACHINE_TYPES } from './price-guide';
import type { TypeGroup } from './guide-index';

/**
 * The guide's top level: eight families a woodworker would sort a tool chest
 * into, each with a photo. Sixty-odd tool types are too many to scan as a
 * flat list (the old index was a wall of chips nobody browsed: 26 views in
 * 90 days), and a type on its own says nothing about price; the family card
 * gives the eye somewhere to land and the table beneath it gives the number.
 *
 * Type names are the normalizer's canonical names (functions/normalize/
 * vocabulary.js). A publishable type missing from every list is not dropped:
 * groupByFamily() puts it in a trailing "More tools" family and warns at
 * build time, so adding a type to the vocabulary never hides it, it only
 * files it badly until someone adds it here.
 */
export type Family = {
  slug: string;
  name: string;
  /** One line under the family heading on the index. */
  blurb: string;
  /** Under /guide/families/ in public/; null for the catch-all. */
  photo: string | null;
  types: readonly string[];
};

export const FAMILIES: readonly Family[] = [
  {
    slug: 'planes', name: 'Planes', photo: 'planes.jpg',
    blurb: 'Bench, block and joinery planes, from Stanley Bailey users to Norris infills.',
    types: ['Bench Plane', 'Block Plane', 'Rabbet Plane', 'Combination Plane', 'Infill Plane', 'Moulding Plane',
            'Plow Plane', 'Shoulder Plane', 'Router Plane', 'Scrub Plane', 'Chisel Plane'],
  },
  {
    slug: 'saws', name: 'Saws', photo: 'saws.jpg',
    blurb: 'Hand saws, back saws and the smaller frame and coping saws.',
    types: ['Hand Saw', 'Back Saw', 'Coping Saw', 'Frame Saw', 'Japanese Saw'],
  },
  {
    slug: 'chisels', name: 'Chisels', photo: 'chisels.jpg',
    blurb: 'Bench, mortise and paring chisels by maker, from Buck Brothers to Lie-Nielsen.',
    types: ['Chisel'],
  },
  {
    slug: 'carving', name: 'Carving and shaping', photo: 'carving.jpg',
    blurb: 'Gouges, spokeshaves, drawknives, scrapers and edge tools.',
    types: ['Gouge', 'Spokeshave', 'Drawknife', 'Cabinet Scraper', 'Card Scraper', 'Knife', 'Adze', 'Axe', 'Hatchet'],
  },
  {
    slug: 'marking', name: 'Measuring and marking', photo: 'marking.jpg',
    blurb: 'Squares, rules, levels, gauges and calipers.',
    types: ['Square', 'Rule', 'Level', 'Marking Gauge', 'Mortise Gauge', 'Bevel Gauge', 'Caliper'],
  },
  {
    slug: 'boring', name: 'Braces, drills and hammers', photo: 'boring.jpg',
    blurb: 'Braces, eggbeater drills, bits and the striking tools beside them.',
    types: ['Brace', 'Eggbeater Drill', 'Auger Bit', 'Drill Bit', 'Boring Machine', 'Hammer', 'Mallet'],
  },
  {
    slug: 'workholding', name: 'Workholding', photo: 'workholding.jpg',
    blurb: 'Vises, clamps and benches.',
    types: ['Vise', 'Clamp', 'Workbench'],
  },
  {
    slug: 'machines', name: 'Machines and power tools', photo: 'machines.jpg',
    blurb: 'Table saws, band saws, jointers, planers and portable power tools, by maker.',
    // Router tables are benchtop machines in all but the vocabulary's grouping.
    types: [...MACHINE_TYPES, 'Router Table'],
  },
];

const MORE: Family = {
  slug: 'more', name: 'More tools', photo: null,
  blurb: 'Tool types that do not fit the families above.',
  types: [],
};

export type FamilyGroup = {
  family: Family;
  /** Most recorded sales first. */
  types: TypeGroup[];
  sold: number;
  forSaleNow: number;
  makers: number;
};

/**
 * File type groups into families, keeping the family order above and sorting
 * types within a family by sales. Families with no publishable type are left
 * out; types in no family land in "More tools" at the end.
 */
export function groupByFamily(groups: TypeGroup[]): FamilyGroup[] {
  const byType = new Map(groups.map((g) => [g.type, g]));
  const placed = new Set<string>();
  const out: FamilyGroup[] = [];

  const build = (family: Family, types: TypeGroup[]): FamilyGroup => ({
    family,
    types: [...types].sort((a, b) => b.sold - a.sold || a.type.localeCompare(b.type)),
    sold: types.reduce((n, t) => n + t.sold, 0),
    forSaleNow: types.reduce((n, t) => n + t.forSaleNow, 0),
    makers: types.reduce((n, t) => n + t.makers, 0),
  });

  for (const family of FAMILIES) {
    const types = family.types.flatMap((name) => {
      const g = byType.get(name);
      if (!g) return [];
      placed.add(name);
      return [g];
    });
    if (types.length) out.push(build(family, types));
  }

  const rest = groups.filter((g) => !placed.has(g.type));
  if (rest.length) {
    console.warn(`[guide-families] types in no family: ${rest.map((g) => g.type).join(', ')}`);
    out.push(build(MORE, rest));
  }
  return out;
}

/** The family a type belongs to, for a type page's breadcrumb and back link. */
export function familyOf(type: string): Family | null {
  return FAMILIES.find((f) => f.types.includes(type)) ?? null;
}
