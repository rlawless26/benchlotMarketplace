import { NextRequest } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { options, fail, CACHE } from '@/lib/api/envelope';
import { ListingIdParam } from '@/lib/api/schemas';
import { getListing } from '@/lib/api/listings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = withApi('/api/v1/listings/{id}', {}, async ({ req }) => {
  const id = req.nextUrl.pathname.split('/').pop() ?? '';
  if (!ListingIdParam.safeParse(id).success) return fail(400, 'invalid_parameter', 'Listing ids are numeric.');
  const listing = await getListing(id);
  if (!listing) return fail(404, 'not_found', `No listing ${id}.`);
  return { data: listing, cache: CACHE.listings };
});

export async function GET(req: NextRequest) {
  return handler(req);
}
export const OPTIONS = options;
