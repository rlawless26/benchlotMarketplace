import { withApi } from '@/lib/api/handler';
import { options } from '@/lib/api/envelope';
import { AlertBody } from '@/lib/api/schemas';
import { requestAlert } from '@/lib/api/services';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Create an email alert for a tool. See requestAlert() for the invariant:
 * the response is the same whatever happened, and the address has to confirm.
 */
export const POST = withApi('/api/v1/alerts', { auth: 'required', body: AlertBody }, async ({ body, ctx }) => {
  const r = await requestAlert(body, ctx);
  if (!r.ok) return { data: null, status: r.status, errors: [r.error], meta: r.meta };
  return { data: r.data, meta: r.meta };
});
export const OPTIONS = options;
