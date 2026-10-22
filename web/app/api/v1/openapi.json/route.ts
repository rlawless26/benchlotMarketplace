import { NextResponse } from 'next/server';
import { openapi } from '@/lib/api/openapi';
import { CORS_HEADERS, CACHE } from '@/lib/api/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(openapi(), { headers: { ...CORS_HEADERS, 'Cache-Control': CACHE.catalog } });
}
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
