import { createMcpHandler } from 'mcp-handler';
import { registerTools, SERVER_INSTRUCTIONS } from '@/lib/mcp/tools';
import { CORS_HEADERS } from '@/lib/api/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// identify_tool runs one Opus call; everything else is sub-second.
export const maxDuration = 120;

/**
 * Benchlot's MCP server, Streamable HTTP, stateless. Auth is per tool call:
 * each tool reads the original request (ctx.http.req) and runs the same
 * optional-key check, rate limit and usage log as /api/v1 (lib/api/request).
 *
 *   claude mcp add --transport http benchlot https://benchlot.com/mcp
 */
const handler = createMcpHandler((server) => registerTools(server), {
  serverInfo: { name: 'benchlot', version: '1.0.0' },
  instructions: SERVER_INSTRUCTIONS,
});

export { handler as GET, handler as POST, handler as DELETE };

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
