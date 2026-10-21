import { withApi } from '@/lib/api/handler';
import { options, DOCS_URL } from '@/lib/api/envelope';
import { KeyRequestBody } from '@/lib/api/schemas';
import { issueKey, keyIssueRateLimited } from '@/lib/api/keys';
import { sendEmail, apiKeyEmail } from '@/lib/email';
import { captureServer } from '@/lib/posthog-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SENT = { status: 'sent' as const, message: 'If that address is valid, the key is on its way. Check your email.' };

/**
 * Self-serve keys. The key goes to the address by email, never in the
 * response, so a key is tied to an inbox someone controls. Same answer
 * whether a key was issued or the address is capped for the day.
 */
export const POST = withApi('/api/v1/keys', { body: KeyRequestBody }, async ({ body, ctx }) => {
  const email = body.email.trim().toLowerCase();
  if (await keyIssueRateLimited(ctx.ip, email)) {
    await captureServer(ctx.distinctId, 'api_key_requested', { status: 'capped' });
    return { data: SENT };
  }
  const { key, prefix } = await issueKey({ name: body.name, email, ip: ctx.ip });
  const { subject, html } = apiKeyEmail(body.name, key, DOCS_URL);
  const sent = await sendEmail({ templateId: '20-api-key', to: email, subject, html, vars: { name: body.name, prefix } });
  await captureServer(ctx.distinctId, 'api_key_requested', { status: sent.sent ? 'issued' : sent.dryRun ? 'dry_run' : 'email_failed', prefix });
  return { data: SENT };
});
export const OPTIONS = options;
