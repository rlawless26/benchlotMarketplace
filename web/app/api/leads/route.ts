import { NextRequest, NextResponse } from 'next/server';
import { recordLead, leadRateLimited, clientIp, LEAD_SOURCES } from '@/lib/toolscan';
import { isPlausibleEmail } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

/**
 * Email capture outside the alerts flow: the digest footer, the waitlist page
 * and the "we don't cover this category yet" card. One table, a source tag.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim();
  const source = String(body.source ?? '');
  if (!isPlausibleEmail(email)) {
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }
  if (!LEAD_SOURCES.has(source) || source === 'scan_email_gate') {
    return NextResponse.json({ error: 'Unknown source.' }, { status: 400 });
  }
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  const ip = clientIp(req.headers);

  try {
    if (await leadRateLimited(ip, email)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
    await recordLead({
      email, source,
      scanId: typeof body.scan_id === 'string' ? body.scan_id.slice(0, 64) : null,
      payload, ip,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[api/leads]', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Something went wrong. Try again shortly.' }, { status: 500 });
  }
}
