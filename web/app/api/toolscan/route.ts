import { NextRequest, NextResponse } from 'next/server';
import { runScan, clientIp } from '@/lib/toolscan';

export const dynamic = 'force-dynamic';

/**
 * Identify a tool from one to five photos. Anonymous; same request and
 * response shape as the retired Cloud Function route so the scan page did
 * not have to change what it sends or reads.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const out = await runScan({
    images: body.images,
    context: body.context,
    previous_scan_id: body.previous_scan_id,
    distinct_id: body.distinct_id,
    ip: clientIp(req.headers),
  });

  if (out.status !== 200) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ success: true, scanId: out.scanId, imagePaths: out.imagePaths, results: out.results });
}
