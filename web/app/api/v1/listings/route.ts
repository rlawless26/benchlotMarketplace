import { withApi } from '@/lib/api/handler';
import { options, CACHE } from '@/lib/api/envelope';
import { ListingsQuery } from '@/lib/api/schemas';
import { searchListings } from '@/lib/api/listings';
import { typeSuggestions } from '@/lib/api/resolve';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Listings for sale now, or recorded sales. Every row links to its source. */
export const GET = withApi('/api/v1/listings', { query: ListingsQuery }, async ({ query }) => {
  const page = await searchListings(query);
  if (page.unknown_type) {
    return {
      data: [],
      errors: [{ code: 'unknown_type', message: `"${page.unknown_type}" is not a tool type Benchlot tracks. See /api/v1/types.`, field: 'type' }],
      meta: { suggestions: typeSuggestions(page.unknown_type) },
      cache: CACHE.listings,
    };
  }
  return {
    data: page.items,
    meta: { count: page.items.length, next_cursor: page.next_cursor, resolved: page.resolved, status: query.status },
    cache: CACHE.listings,
  };
});
export const OPTIONS = options;
