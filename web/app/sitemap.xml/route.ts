import { buildEntries, renderSitemap } from '@/lib/sitemap';

export const revalidate = 3600;

/**
 * sitemap.xml as a plain route handler.
 *
 * This was `app/sitemap.ts` (the Next metadata convention) until 2026-11-02.
 * The build table listed it as ISR with a one-hour revalidate, but on Vercel
 * the function was never invoked again after the build: five days after the
 * 2026-10-28 deploy every <lastmod> still read 2026-10-28 while the pages
 * and the database said 2026-11-02, and the runtime log showed no
 * GET /sitemap.xml at all. `app/llms.txt/route.ts` uses the same queries and
 * the same revalidate and does regenerate, so the sitemap now takes that
 * shape. The XML comment at the top carries the generation time so
 * freshness can be checked with curl.
 *
 * Indexable pages only: thin (ask-only) pages carry noindex and would only
 * spend crawl attention the pages with real comps need. /, /scan and
 * /guide/* are all served on the canonical domain through rewrites from the
 * benchlot-marketplace project, so this file can claim them. The CRA
 * listings grid at /search is deliberately absent: its state lives in the
 * query string, it has no stable content to index, and it carries an
 * X-Robots-Tag noindex from the root vercel.json.
 */

export async function GET() {
  const entries = await buildEntries();
  return new Response(renderSitemap(entries, new Date()), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
