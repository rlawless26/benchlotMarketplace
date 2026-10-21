/**
 * Response envelope for the public data layer (/api/v1 and the MCP tools).
 *
 * Every success is `{ data, meta, errors: [] }`; every failure is
 * `{ data: null, meta, errors: [{ code, message }] }`. `meta` always carries
 * the attribution an agent is asked to repeat and the policy it agreed to by
 * calling — see /developers/policy. Keep the shape boring: agents learn it
 * from one example and generalise.
 */
import { NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/site';

export const API_VERSION = 'v1';
export const DOCS_URL = `${SITE_URL}/developers`;
export const LICENSE_URL = `${SITE_URL}/developers/policy`;
export const OPENAPI_URL = `${SITE_URL}/api/v1/openapi.json`;

export const ATTRIBUTION = {
  name: 'Benchlot',
  url: SITE_URL,
  /** What to print next to any figure or listing taken from a response. */
  text: 'via Benchlot',
  /** Link the `guide_url` (prices) or `source_url` (listings) you show. */
  link_required: true,
} as const;

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Api-Key, Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Expose-Headers': 'X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After, Mcp-Session-Id',
  'Access-Control-Max-Age': '86400',
};

export type ApiError = { code: string; message: string; field?: string };

export type Meta = {
  generated_at: string;
  api_version: typeof API_VERSION;
  attribution: typeof ATTRIBUTION;
  license_url: string;
  docs_url: string;
  [k: string]: unknown;
};

export function meta(extra: Record<string, unknown> = {}): Meta {
  return {
    generated_at: new Date().toISOString(),
    api_version: API_VERSION,
    attribution: ATTRIBUTION,
    license_url: LICENSE_URL,
    docs_url: DOCS_URL,
    ...extra,
  };
}

export type Envelope<T> = { data: T; meta: Meta; errors: ApiError[] };

export function envelope<T>(data: T, extra: Record<string, unknown> = {}, errors: ApiError[] = []): Envelope<T> {
  return { data, meta: meta(extra), errors };
}

export type OkOptions = {
  /** Cache-Control for the CDN. Omit for no caching. */
  cache?: string;
  meta?: Record<string, unknown>;
  headers?: Record<string, string>;
  status?: number;
  /** Non-fatal notes, e.g. insufficient_evidence with suggestions. */
  errors?: ApiError[];
};

export function ok<T>(data: T, opts: OkOptions = {}): NextResponse {
  const headers: Record<string, string> = { ...CORS_HEADERS, ...(opts.headers ?? {}) };
  if (opts.cache) headers['Cache-Control'] = opts.cache;
  else headers['Cache-Control'] = 'no-store';
  return NextResponse.json(envelope(data, opts.meta, opts.errors), { status: opts.status ?? 200, headers });
}

export function fail(
  status: number,
  code: string,
  message: string,
  opts: { errors?: ApiError[]; headers?: Record<string, string>; meta?: Record<string, unknown> } = {}
): NextResponse {
  const errors = opts.errors && opts.errors.length ? opts.errors : [{ code, message }];
  return NextResponse.json(envelope(null, opts.meta, errors), {
    status,
    headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store', ...(opts.headers ?? {}) },
  });
}

/** Preflight. Next answers OPTIONS itself when a route exports it. */
export function options(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Cache presets. Stats rebuild nightly; listings move within the hour. */
export const CACHE = {
  stats: 'public, s-maxage=3600, stale-while-revalidate=86400',
  listings: 'public, s-maxage=300, stale-while-revalidate=3600',
  catalog: 'public, s-maxage=3600, stale-while-revalidate=86400',
} as const;
