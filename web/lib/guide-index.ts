import { slug, type ClusterRef } from './price-guide';

/** One tool type's share of the guide, for an index or table of contents. */
export type TypeGroup = {
  type: string;
  slug: string;
  /** Makers with a publishable page for this type (coarse clusters). */
  makers: number;
  sold: number;
  forSaleNow: number;
  /** The clusters themselves, in the order they arrived (most sold first). */
  clusters: ClusterRef[];
};

/**
 * Group coarse clusters by tool type, most recorded sales first. Shared by the
 * guide index and the homepage so both show the same list in the same order.
 */
export function groupClustersByType(clusters: ClusterRef[]): TypeGroup[] {
  const byType = new Map<string, ClusterRef[]>();
  for (const c of clusters) {
    const list = byType.get(c.canonical_type) ?? [];
    list.push(c);
    byType.set(c.canonical_type, list);
  }
  return [...byType.entries()]
    .map(([type, list]) => ({
      type,
      slug: slug(type),
      makers: list.length,
      sold: list.reduce((n, c) => n + c.sold_count, 0),
      forSaleNow: list.reduce((n, c) => n + c.asking_count_active, 0),
      clusters: list,
    }))
    .sort((a, b) => b.sold - a.sold || a.type.localeCompare(b.type));
}
