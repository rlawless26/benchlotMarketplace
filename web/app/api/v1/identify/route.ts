import { withApi } from '@/lib/api/handler';
import { options, fail } from '@/lib/api/envelope';
import { IdentifyBody } from '@/lib/api/schemas';
import { identify, IDENTIFY_MAX_BASE64 } from '@/lib/api/services';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// A scan is one Opus call with up to five images; allow for a slow one.
export const maxDuration = 120;

/**
 * Identify one tool from photos. Same engine as /scan: the model's own
 * confidence comes back with the answer, plus the guide's reference band and
 * live listings for the identified tool. Keyed only: every call costs real
 * inference, and the per-key scan limit (20 per 15 minutes) needs an identity.
 */
export const POST = withApi('/api/v1/identify', { auth: 'required', body: IdentifyBody, maxBodyBytes: IDENTIFY_MAX_BASE64 + 64 * 1024 },
  async ({ body, ctx }) => {
    const r = await identify(body, ctx);
    if (!r.ok) return fail(r.status, r.error.code, r.error.message, { meta: r.meta });
    return { data: r.data, meta: r.meta };
  });
export const OPTIONS = options;
