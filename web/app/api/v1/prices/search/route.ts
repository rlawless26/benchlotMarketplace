import { withApi } from '@/lib/api/handler';
import { options, CACHE } from '@/lib/api/envelope';
import { PriceSearchQuery } from '@/lib/api/schemas';
import { refToApi } from '@/lib/api/prices';
import { searchClusters } from '@/lib/price-guide';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Find price-guide pages by free text. */
export const GET = withApi('/api/v1/prices/search', { query: PriceSearchQuery }, async ({ query }) => {
  const refs = await searchClusters(query.q, query.limit);
  return { data: refs.map(refToApi), meta: { count: refs.length, q: query.q }, cache: CACHE.stats };
});
export const OPTIONS = options;
