import { withApi } from '@/lib/api/handler';
import { options, CACHE } from '@/lib/api/envelope';
import { PricesQuery } from '@/lib/api/schemas';
import { resolveCluster, typeSuggestions } from '@/lib/api/resolve';
import { priceGuide, refToApi } from '@/lib/api/prices';
import { searchClusters } from '@/lib/price-guide';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * What a tool sells for. Resolves names to the guide's cluster, returns the
 * stats with confidence/freshness/coverage. When nothing publishable exists
 * the answer is still 200: the lookup worked and the honest result is "not
 * enough evidence", with suggestions the agent can retry.
 */
export const GET = withApi('/api/v1/prices', { query: PricesQuery }, async ({ query }) => {
  const r = await resolveCluster(query);
  if (!r.type) {
    return {
      data: null,
      errors: [{ code: 'unknown_type', message: `"${query.type}" is not a tool type Benchlot tracks. See /api/v1/types.`, field: 'type' }],
      meta: { suggestions: typeSuggestions(query.type) },
      cache: CACHE.stats,
    };
  }
  if (!r.cluster) {
    const near = await searchClusters(`${r.brand.name} ${r.type}`, 8);
    return {
      data: null,
      errors: [{ code: 'insufficient_evidence', message: `Fewer than 8 recorded sales and fewer than 10 asking prices for ${r.brand.name} ${r.type}. No figure is published.` }],
      meta: { resolved: { type: r.type, brand: r.brand.name }, suggestions: near.map(refToApi) },
      cache: CACHE.stats,
    };
  }
  const guide = await priceGuide(r.cluster, { includeComps: query.include_comps });
  const narrowed = r.third !== null && r.cluster.grain === 'coarse';
  return {
    data: guide,
    meta: {
      resolved: { type: r.type, brand: r.brand.name, model: query.model ?? null, size: query.size ?? null },
      ...(narrowed ? { note: 'No page exists for that model or size; these are the maker-wide figures.' } : {}),
    },
    cache: CACHE.stats,
  };
});
export const OPTIONS = options;
