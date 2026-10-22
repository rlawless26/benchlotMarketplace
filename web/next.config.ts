import type { NextConfig } from "next";

/** CORS for the public data layer. The route helpers set the same headers on
 * every response they build; this covers framework-generated ones (404s, the
 * automatic OPTIONS) so a browser-side agent never sees a bare preflight. */
const CORS = [
  { key: 'Access-Control-Allow-Origin', value: '*' },
  { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
  { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type, X-Api-Key, Mcp-Session-Id, Mcp-Protocol-Version' },
  { key: 'Access-Control-Expose-Headers', value: 'X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After, Mcp-Session-Id' },
];

const nextConfig: NextConfig = {
  // The OG card route reads its TTFs from disk at request time; make sure the
  // serverless bundle carries them.
  outputFileTracingIncludes: {
    '/guide/og/[...slug]': ['./assets/fonts/*.ttf'],
  },
  async headers() {
    return [
      { source: '/api/v1/:path*', headers: CORS },
      { source: '/api/v1', headers: CORS },
      { source: '/mcp', headers: CORS },
      { source: '/mcp/:path*', headers: CORS },
    ];
  },
};

export default nextConfig;
