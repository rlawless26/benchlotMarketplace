import { withApi } from '@/lib/api/handler';
import { options, CACHE } from '@/lib/api/envelope';
import { types } from '@/lib/api/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The 73 tool types the guide knows, with how much evidence each carries. */
export const GET = withApi('/api/v1/types', {}, async () => {
  const items = await types();
  return { data: items, meta: { count: items.length }, cache: CACHE.catalog };
});
export const OPTIONS = options;
