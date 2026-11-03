import { listPublishableClusters, listBrandHubs, listTypeHubs, clusterPath, brandHubPath } from './price-guide';
import { SITE_URL as BASE } from './site';

/**
 * Builds and renders /sitemap.xml. Lives outside the route file because a
 * Next route module may only export HTTP methods and segment config.
 */

export type Entry = {
  url: string;
  lastModified?: Date;
  changeFrequency: 'daily' | 'monthly' | 'yearly';
  priority: number;
};

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function toDate(v: string | Date | null | undefined): Date | undefined {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function buildEntries(): Promise<Entry[]> {
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
  const built = clusters.map((c) => toDate(c.last_built_at)).filter((d): d is Date => !!d);
  const latest = built.length ? new Date(Math.max(...built.map((d) => d.getTime()))) : undefined;

  return [
    { url: `${BASE}/`, changeFrequency: 'daily', priority: 1, lastModified: latest },
    { url: `${BASE}/scan`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/developers`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/developers/policy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/guide`, changeFrequency: 'daily', priority: 1, lastModified: latest },
    // Type hubs sit above the maker pages: one page per kind of tool, each
    // backed by every sale of it.
    ...types.map((t): Entry => ({
      url: `${BASE}/guide/${t.typeSlug}`,
      changeFrequency: 'daily',
      priority: 0.9,
      lastModified: toDate(t.last_built_at) ?? latest,
    })),
    ...hubs.map((h): Entry => ({
      url: `${BASE}${brandHubPath(h.brandSlug)}`,
      changeFrequency: 'daily',
      priority: 0.7,
      lastModified: latest,
    })),
    ...clusters.map((c): Entry => ({
      url: `${BASE}${clusterPath(c)}`,
      changeFrequency: 'daily',
      priority: Math.round((0.3 + 0.6 * (c.sold_count / maxSold)) * 100) / 100,
      lastModified: toDate(c.last_built_at) ?? latest,
    })),
  ];
}

export function renderSitemap(entries: Entry[], generatedAt: Date): string {
  const items = entries.map((e) => {
    const parts = [`<loc>${escapeXml(e.url)}</loc>`];
    if (e.lastModified) parts.push(`<lastmod>${e.lastModified.toISOString()}</lastmod>`);
    parts.push(`<changefreq>${e.changeFrequency}</changefreq>`);
    parts.push(`<priority>${e.priority}</priority>`);
    return `<url>${parts.join('')}</url>`;
  });
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<!-- generated ${generatedAt.toISOString()} -->\n` +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    items.join('\n') +
    '\n</urlset>\n'
  );
}
