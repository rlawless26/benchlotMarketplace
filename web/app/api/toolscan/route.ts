import { NextRequest, NextResponse } from 'next/server';
import { runScan, clientIp, scanReference, scanActiveListings } from '@/lib/toolscan';

export const dynamic = 'force-dynamic';

/**
 * Identify a tool from one to five photos. Anonymous; same request and
 * response shape as the retired Cloud Function route, plus two additive
 * fields the Next scan page reads so the result card needs no second fetch:
 * `reference` (the guide's p25–p75 band and page) and `activeListings`.
 * The CRA page ignores both.
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

  const tool = out.results.tool;
  const [reference, activeListings] = tool
    ? await Promise.all([
        scanReference(tool).catch((e) => { console.warn('[api/toolscan] reference failed:', e?.message); return null; }),
        scanActiveListings(tool).catch((e) => { console.warn('[api/toolscan] listings failed:', e?.message); return []; }),
      ])
    : [null, []];

  return NextResponse.json({
    success: true, scanId: out.scanId, imagePaths: out.imagePaths, results: out.results,
    reference, activeListings,
  });
}
