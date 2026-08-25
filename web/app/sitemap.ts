import type { MetadataRoute } from 'next';
import { listPublishableClusters, clusterPath } from '@/lib/price-guide';
import { SITE_URL as BASE } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const clusters = await listPublishableClusters();

  // Pages with more sold evidence are the ones worth crawling first.
  const maxSold = Math.max(1, ...clusters.map((c) => c.sold_count));

  return [
    { url: `${BASE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/guide`, changeFrequency: 'daily', priority: 0.9 },
    ...clusters.map((c) => ({
      url: `${BASE}${clusterPath(c)}`,
      changeFrequency: 'daily' as const,
      priority: Math.round((0.3 + 0.6 * (c.sold_count / maxSold)) * 100) / 100,
    })),
  ];
}
