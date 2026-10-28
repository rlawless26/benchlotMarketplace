import type { MetadataRoute } from 'next';
import { listPublishableClusters, listBrandHubs, listTypeHubs, clusterPath, brandHubPath } from '@/lib/price-guide';
import { SITE_URL as BASE } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Indexable pages only: thin (ask-only) pages carry noindex and would only
  // spend crawl attention the pages with real comps need.
  const [clusters, hubs, types] = await Promise.all([
    listPublishableClusters({ indexableOnly: true }),
    listBrandHubs({ indexableOnly: true }),
    listTypeHubs({ indexableOnly: true }),
  ]);

  // Pages with more sold evidence are the ones worth crawling first.
  const maxSold = Math.max(1, ...clusters.map((c) => c.sold_count));

  // lastModified is the stats rebuild that last touched the row. It is the
  // same clock for every page (the rebuild is nightly), but it still tells a
  // crawler the guide is alive, which "changeFrequency: daily" alone does not.
  const built = clusters.map((c) => c.last_built_at).filter((d): d is string => !!d).sort();
  const latest = built.length ? new Date(built[built.length - 1]) : undefined;

  // /, /scan and /guide/* are all served on the canonical domain through
  // rewrites from the benchlot-marketplace project, so this file can claim
  // them. The CRA listings grid at /search is deliberately absent: its state
  // lives in the query string and it has no stable content to index.
  return [
    { url: `${BASE}/`, changeFrequency: 'daily', priority: 1, lastModified: latest },
    { url: `${BASE}/scan`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/developers`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/developers/policy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/guide`, changeFrequency: 'daily', priority: 1, lastModified: latest },
    // Type hubs sit above the maker pages: one page per kind of tool, each
    // backed by every sale of it.
    ...types.map((t) => ({
      url: `${BASE}/guide/${t.typeSlug}`,
      changeFrequency: 'daily' as const,
      priority: 0.9,
      lastModified: t.last_built_at ? new Date(t.last_built_at) : latest,
    })),
    ...hubs.map((h) => ({
      url: `${BASE}${brandHubPath(h.brandSlug)}`,
      changeFrequency: 'daily' as const,
      priority: 0.7,
      lastModified: latest,
    })),
    ...clusters.map((c) => ({
      url: `${BASE}${clusterPath(c)}`,
      changeFrequency: 'daily' as const,
      priority: Math.round((0.3 + 0.6 * (c.sold_count / maxSold)) * 100) / 100,
      lastModified: c.last_built_at ? new Date(c.last_built_at) : latest,
    })),
  ];
}
