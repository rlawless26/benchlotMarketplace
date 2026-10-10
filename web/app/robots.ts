import type { MetadataRoute } from 'next';
import { SITE_URL, IS_INDEXABLE } from '@/lib/site';

/**
 * One robots.txt for the whole domain. benchlot.com/robots.txt is rewritten
 * here from the CRA project (root vercel.json), so this file governs the
 * guide, the homepage and the scan page together, and names the one sitemap.
 *
 * No per-bot groups: `*` allow already admits Googlebot, Bingbot (which
 * ChatGPT search reads), OAI-SearchBot, ChatGPT-User, GPTBot, ClaudeBot and
 * PerplexityBot. The disallow list is the CRA marketplace surface, which is
 * feature-flagged off and redirects anonymous visitors.
 */
const MARKETPLACE_PATHS = [
  '/marketplace', '/browse', '/tools/', '/sell', '/seller/', '/cart', '/checkout', '/orders',
  '/order-confirmation/', '/order-complete', '/my-listings', '/messages', '/wishlist', '/settings',
  '/founding-sellers', '/app', '/old-home', '/login',
  // Bearer-token pages.
  '/alerts/confirm/', '/alerts/unsubscribe/',
];

export default function robots(): MetadataRoute.Robots {
  // Preview / vercel.app hosts serve identical content to production. Letting
  // them be crawled would split ranking signals against the real domain.
  if (!IS_INDEXABLE) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: MARKETPLACE_PATHS }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
