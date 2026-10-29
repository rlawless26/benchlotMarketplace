import { renderOgCard } from '@/lib/og';
import { clusterOgCard, hubOgCard, typeOgCard } from '@/lib/og-cards';
import { brandHubPath, clusterPath } from '@/lib/guide-paths';

/**
 * Open Graph card for a guide page, at the page's own path under /guide/og:
 *
 *   /guide/og/{type}                                  tool-type hubs
 *   /guide/og/{type}/{brand}[/{size|model}[/type-N]]  cluster pages
 *   /guide/og/brand/{brand}                           maker hubs
 *
 * `guideMetadata` and the hub's `generateMetadata` point `og:image` here with
 * a `?v=` stamp from the nightly stats build, so social caches refresh when
 * the numbers do. Unknown pages are a 404 like the page itself; a bad URL
 * must not cache a generic card.
 */
export const revalidate = 3600;

const SEG = /^[a-z0-9][a-z0-9-]*$/;

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await ctx.params;
  if (!slug || slug.length < 1 || slug.length > 4 || !slug.every((s) => SEG.test(s))) {
    return new Response('Not found', { status: 404 });
  }

  if (slug.length === 1) {
    if (slug[0] === 'brand') return new Response('Not found', { status: 404 });
    const hit = await typeOgCard(slug[0], `/guide/${slug[0]}`);
    if (!hit) return new Response('Not found', { status: 404 });
    return renderOgCard(hit.card);
  }

  if (slug[0] === 'brand') {
    if (slug.length !== 2) return new Response('Not found', { status: 404 });
    const hit = await hubOgCard(slug[1], brandHubPath(slug[1]));
    if (!hit) return new Response('Not found', { status: 404 });
    return renderOgCard(hit.card);
  }

  const [typeSlug, brandSlug, third, fourth] = slug;
  if (fourth && !/^type-\d{1,2}$/.test(fourth)) return new Response('Not found', { status: 404 });
  const hit = await clusterOgCard(typeSlug, brandSlug, third, fourth);
  if (!hit) return new Response('Not found', { status: 404 });
  const { cluster } = hit;
  const isModel = cluster.grain === 'model-fine' || cluster.grain === 'type-fine';
  const pagePath = clusterPath({
    typeSlug, brandSlug,
    sizeSlug: isModel ? null : third ?? null,
    modelSlug: isModel ? third ?? null : null,
    planeType: cluster.grain === 'type-fine' ? cluster.plane_type_number : null,
  });
  return renderOgCard({ ...hit.card, pathLabel: `benchlot.com${pagePath}` });
}
