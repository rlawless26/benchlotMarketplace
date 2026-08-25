import type { MetadataRoute } from 'next';
import { SITE_URL, IS_CANONICAL_HOST } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  // Preview / vercel.app hosts serve identical content to production. Letting
  // them be crawled would split ranking signals against the real domain.
  if (!IS_CANONICAL_HOST) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
