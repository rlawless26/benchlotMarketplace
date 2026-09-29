import { NextRequest, NextResponse } from 'next/server';
import { recordFeedback, clientIp } from '@/lib/toolscan';
import { isPlausibleEmail } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

/** "Looks right" / "Save corrections" from the result card. */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const vote = body.vote;
  if (vote !== 'correct' && vote !== 'corrected') {
    return NextResponse.json({ error: 'Invalid vote.' }, { status: 400 });
  }
  const email = typeof body.email === 'string' && isPlausibleEmail(body.email.trim()) ? body.email.trim() : null;
  const imagePaths = Array.isArray(body.image_paths)
    ? body.image_paths.filter((p): p is string => typeof p === 'string').slice(0, 5)
    : [];

  try {
    await recordFeedback({
      scanId: typeof body.scan_id === 'string' ? body.scan_id.slice(0, 64) : null,
      vote,
      email,
      originalResult: body.original_result ?? null,
      correctedResult: body.corrected_result ?? null,
      userEdits: body.user_edits ?? null,
      hasEdits: Boolean(body.has_edits),
      imagePaths,
      ip: clientIp(req.headers),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[api/toolscan/feedback]', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
