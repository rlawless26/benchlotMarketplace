import { createMcpHandler, type McpHandlerOptions } from 'mcp-handler';
import { registerTools, SERVER_INSTRUCTIONS } from '@/lib/mcp/tools';
import { CORS_HEADERS } from '@/lib/api/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// identify_tool runs one Opus call with a 90s client timeout and one retry
// (lib/toolscan), so the worst honest case is ~180s; everything else is
// sub-second. 120 was below that worst case.
export const maxDuration = 200;

/**
 * Benchlot's MCP server, Streamable HTTP, stateless. Auth is per tool call:
 * each tool reads the original request (ctx.http.req) and runs the same
 * optional-key check, rate limit and usage log as /api/v1 (lib/api/request).
 *
 *   claude mcp add --transport http benchlot https://benchlot.com/mcp
 */
/**
 * One log line when a request arrives and one when it finishes. The runtime
 * log otherwise shows only "POST /mcp" and a status, which is what made the
 * 2026-11-02 timeouts undiagnosable: a hang leaves the arrival line with no
 * completion, and names the method that hung.
 */
type McpEvent = Parameters<NonNullable<McpHandlerOptions['onEvent']>>[0];

function logEvent(e: McpEvent) {
  if (e.type === 'ERROR') {
    const msg = e.error instanceof Error ? e.error.message : String(e.error);
    console.error(`[mcp] error ${e.source}/${e.severity}${e.context ? ` ${e.context}` : ''}: ${msg}`);
  } else {
    // tools/call alone says nothing; name the tool.
    const params = (e.parameters as { params?: { name?: string } } | undefined)?.params;
    const what = e.method === 'tools/call' && params?.name ? `${e.method} ${params.name}` : e.method;
    if (e.type === 'REQUEST_RECEIVED') console.log(`[mcp] > ${what}`);
    else console.log(`[mcp] < ${what} ${e.status} ${e.duration ?? '?'}ms`);
  }
}

const handler = createMcpHandler((server) => registerTools(server), {
  serverInfo: { name: 'benchlot', version: '1.0.0' },
  instructions: SERVER_INSTRUCTIONS,
  onEvent: logEvent,
});

export { handler as GET, handler as POST, handler as DELETE };

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
