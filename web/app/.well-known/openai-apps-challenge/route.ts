import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Domain verification for the ChatGPT plugin directory. OpenAI's portal shows
 * a challenge token when the MCP server is connected; it must come back as
 * plain text, exactly, at this path on the MCP hostname. Set
 * OPENAI_APPS_CHALLENGE on benchlot-web to that token. 404 until then, so the
 * path never answers with an empty string a reviewer could mistake for a token.
 */
export async function GET() {
  const token = process.env.OPENAI_APPS_CHALLENGE?.trim();
  if (!token) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(token, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}
