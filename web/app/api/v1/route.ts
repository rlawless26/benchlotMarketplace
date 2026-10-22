import { withApi } from '@/lib/api/handler';
import { options, CACHE, DOCS_URL, LICENSE_URL, OPENAPI_URL } from '@/lib/api/envelope';
import { SITE_URL } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The front door: where everything is. */
export const GET = withApi('/api/v1', {}, async () => ({
  cache: CACHE.catalog,
  data: {
    name: 'Benchlot API',
    description: 'Prices, listings and identification for used woodworking tools. Free, attribution required.',
    docs: DOCS_URL,
    openapi: OPENAPI_URL,
    policy: LICENSE_URL,
    mcp: `${SITE_URL}/mcp`,
    endpoints: {
      prices: `${SITE_URL}/api/v1/prices?type=bench%20plane&brand=stanley&model=no.%204`,
      price_search: `${SITE_URL}/api/v1/prices/search?q=millers%20falls%20brace`,
      listings: `${SITE_URL}/api/v1/listings?q=stanley%20no%205&status=active`,
      listing: `${SITE_URL}/api/v1/listings/{id}`,
      types: `${SITE_URL}/api/v1/types`,
      brands: `${SITE_URL}/api/v1/brands?type=bench%20plane`,
      meta: `${SITE_URL}/api/v1/meta`,
      identify: `POST ${SITE_URL}/api/v1/identify`,
      alerts: `POST ${SITE_URL}/api/v1/alerts`,
      keys: `POST ${SITE_URL}/api/v1/keys`,
    },
  },
}));
export const OPTIONS = options;
