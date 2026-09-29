import { NextRequest, NextResponse } from 'next/server';
import {
  recordLead, leadRateLimited, scanReference, scanToolName, clientIp, type ScanTool,
} from '@/lib/toolscan';
import { isPlausibleEmail } from '@/lib/alerts';
import { sendEmail, scanResultsEmail } from '@/lib/email';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

/**
 * "Email me these results." Saves the lead, then sends one email with the
 * identification and the guide's reference band. The lead is the point; a
 * failed send is logged in email_sends and does not fail the request.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim();
  if (!isPlausibleEmail(email)) {
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }
  const tool = (body.tool && typeof body.tool === 'object' ? body.tool : null) as Partial<ScanTool> | null;
  const scanId = typeof body.scan_id === 'string' ? body.scan_id.slice(0, 64) : null;
  const ip = clientIp(req.headers);

  try {
    if (await leadRateLimited(ip, email)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
    await recordLead({ email, source: 'scan_email_gate', scanId, payload: { tool }, ip });

    if (tool) {
      const reference = await scanReference({
        canonical_type: tool.canonical_type ?? null,
        canonical_brand: tool.canonical_brand ?? null,
        canonical_model: tool.canonical_model ?? null,
      }).catch((e) => { console.warn('[api/toolscan/email] reference lookup failed:', e?.message); return null; });

      const { subject, html } = scanResultsEmail({
        toolName: scanToolName(tool),
        era: tool.era_estimate ?? null,
        condition: tool.condition ?? null,
        confidence: tool.confidence ?? null,
        reference,
        siteUrl: SITE_URL,
      });
      await sendEmail({
        templateId: '01-scan-welcome',
        to: email,
        subject,
        html,
        vars: { scan_id: scanId, tool, reference },
      });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[api/toolscan/email]', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Something went wrong. Try again shortly.' }, { status: 500 });
  }
}
