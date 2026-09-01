import type { MetadataRoute } from 'next';
import { SITE_URL, IS_INDEXABLE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  // Preview / vercel.app hosts serve identical content to production. Letting
  // them be crawled would split ranking signals against the real domain.
  if (!IS_INDEXABLE) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    // Exposed at /guide/sitemap.xml on the canonical domain: the rewrite maps
    // that path to this project's /sitemap.xml.
    sitemap: `${SITE_URL}/guide/sitemap.xml`,
  };
}
