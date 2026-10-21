import { withApi } from '@/lib/api/handler';
import { options, CACHE } from '@/lib/api/envelope';
import { BrandsQuery } from '@/lib/api/schemas';
import { brands } from '@/lib/api/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Makers with price-guide pages, overall or for one type. */
export const GET = withApi('/api/v1/brands', { query: BrandsQuery }, async ({ query }) => {
  const out = await brands(query.type);
  if (query.type && !out.type) {
    return { data: [], errors: [{ code: 'unknown_type', message: `"${query.type}" is not a tool type Benchlot tracks. See /api/v1/types.`, field: 'type' }], cache: CACHE.catalog };
  }
  return { data: out.items, meta: { count: out.items.length, type: out.type }, cache: CACHE.catalog };
});
export const OPTIONS = options;
