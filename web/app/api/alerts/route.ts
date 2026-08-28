import { NextRequest, NextResponse } from 'next/server';
import { createAlert, isPlausibleEmail } from '@/lib/alerts';
import { sendEmail, confirmEmail } from '@/lib/email';
import { SITE_URL } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Create an alert. No account, no session — an email address and a tool.
 *
 * Always answers with the same generic success, whatever actually happened.
 * Telling the caller "that address already has this alert" would turn this
 * endpoint into an email-enumeration oracle, and there is no login here to
 * put behind it.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim();
  const canonical_type = String(body.canonical_type ?? '').trim();
  const canonical_brand = String(body.canonical_brand ?? '').trim();
  const canonical_size = body.canonical_size ? String(body.canonical_size).trim() : null;

  if (!isPlausibleEmail(email)) {
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }
  if (!canonical_type || !canonical_brand) {
    return NextResponse.json({ error: 'Missing tool.' }, { status: 400 });
  }

  const ok = { ok: true, message: 'Check your email to confirm the alert.' };

  try {
    const result = await createAlert({ email, canonical_type, canonical_brand, canonical_size });

    if (result.status === 'created' || result.status === 'resent') {
      const summary = [canonical_brand, canonical_type, canonical_size].filter(Boolean).join(' ');
      const url = `${SITE_URL}/alerts/confirm/${result.confirmToken}`;
      const { subject, html } = confirmEmail(summary, url);
      await sendEmail({
        templateId: '12-alert-confirm',
        to: email,
        subject,
        html,
        vars: { summary, canonical_type, canonical_brand, canonical_size },
      });
    }
    // already_confirmed and rate_limited intentionally send nothing and still
    // return the same message.
    return NextResponse.json(ok);
  } catch (e) {
    console.error('[api/alerts]', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Something went wrong. Try again shortly.' }, { status: 500 });
  }
}
