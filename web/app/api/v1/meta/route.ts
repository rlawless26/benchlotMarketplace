import { withApi } from '@/lib/api/handler';
import { options, CACHE } from '@/lib/api/envelope';
import { meta } from '@/lib/api/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Coverage, freshness, sources, thresholds. Read this before trusting a number. */
export const GET = withApi('/api/v1/meta', {}, async () => ({ data: await meta(), cache: CACHE.catalog }));
export const OPTIONS = options;
