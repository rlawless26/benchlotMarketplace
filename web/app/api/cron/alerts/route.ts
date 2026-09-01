import { NextRequest, NextResponse } from 'next/server';
import { runMatcher } from '@/lib/matcher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Alert digest cron. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 *
 * Refuses to run unauthenticated when CRON_SECRET is set. If it is NOT set the
 * endpoint is left open, which is fine before any alert exists but must not
 * persist — an open endpoint here lets anyone trigger real email sends.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const started = Date.now();
  const result = await runMatcher();
  return NextResponse.json({ ...result, ms: Date.now() - started });
}
