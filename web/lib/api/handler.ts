/**
 * `withApi` composes the pieces every /api/v1 route needs — auth, rate limit,
 * zod validation, envelope, CORS, logging — so a route file is just the
 * handler. REST and MCP share request.ts; only this wrapper is REST-specific.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';
import { ok, fail, type ApiError } from './envelope';
import { beginRequest, finishRequest, rateLimitHeaders, type ApiContext } from './request';

export type HandlerResult = {
  data: unknown;
  cache?: string;
  meta?: Record<string, unknown>;
  errors?: ApiError[];
  status?: number;
};

export type HandlerArgs<Q, B> = { query: Q; body: B; ctx: ApiContext; req: NextRequest };

export type WithApiOptions<Q, B> = {
  auth?: 'optional' | 'required';
  query?: z.ZodType<Q>;
  body?: z.ZodType<B>;
  /** Bytes. Bodies above this are refused with 413 before parsing. */
  maxBodyBytes?: number;
};

function zodErrors(issues: z.core.$ZodIssue[]): ApiError[] {
  return issues.map((i) => ({
    code: 'invalid_parameter',
    message: i.message,
    field: i.path.map(String).join('.') || undefined,
  }));
}

export function withApi<Q = undefined, B = undefined>(
  route: string,
  opts: WithApiOptions<Q, B>,
  handler: (args: HandlerArgs<Q, B>) => Promise<HandlerResult | NextResponse>
) {
  return async function apiRoute(req: NextRequest): Promise<NextResponse> {
    const begin = await beginRequest(req, 'rest', route, { auth: opts.auth });
    const { ctx } = begin;
    const rl = rateLimitHeaders(ctx);

    if (begin.kind === 'unauthorized') {
      finishRequest(ctx, 401);
      return fail(401, 'unauthorized', begin.message, { headers: rl });
    }
    if (begin.kind === 'limited') {
      finishRequest(ctx, 429);
      return fail(429, 'rate_limited',
        `Rate limit of ${ctx.limit} requests per minute reached. ${ctx.key ? '' : 'A free API key raises it: see /developers.'}`.trim(),
        { headers: { ...rl, 'Retry-After': '60' } });
    }

    let query = undefined as Q;
    if (opts.query) {
      const parsed = opts.query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
      if (!parsed.success) {
        finishRequest(ctx, 400);
        return fail(400, 'invalid_parameter', 'One or more query parameters are invalid.', { errors: zodErrors(parsed.error.issues), headers: rl });
      }
      query = parsed.data;
    }

    let body = undefined as B;
    if (opts.body) {
      const len = Number(req.headers.get('content-length') || 0);
      if (opts.maxBodyBytes && len > opts.maxBodyBytes) {
        finishRequest(ctx, 413);
        return fail(413, 'payload_too_large', `Request body must be under ${Math.round(opts.maxBodyBytes / 1_000_000)} MB.`, { headers: rl });
      }
      let raw: unknown;
      try {
        raw = await req.json();
      } catch {
        finishRequest(ctx, 400);
        return fail(400, 'invalid_json', 'Request body must be JSON.', { headers: rl });
      }
      const parsed = opts.body.safeParse(raw);
      if (!parsed.success) {
        finishRequest(ctx, 400);
        return fail(400, 'invalid_parameter', 'The request body is invalid.', { errors: zodErrors(parsed.error.issues), headers: rl });
      }
      body = parsed.data;
    }

    try {
      const out = await handler({ query, body, ctx, req });
      if (out instanceof NextResponse) {
        for (const [k, v] of Object.entries(rl)) out.headers.set(k, v);
        finishRequest(ctx, out.status);
        return out;
      }
      const res = ok(out.data, { cache: out.cache, meta: out.meta, errors: out.errors, status: out.status, headers: rl });
      finishRequest(ctx, res.status);
      return res;
    } catch (e) {
      console.error(`[api ${route}]`, e instanceof Error ? e.stack || e.message : e);
      finishRequest(ctx, 500);
      return fail(500, 'internal_error', 'Something went wrong. Try again shortly.', { headers: rl });
    }
  };
}
