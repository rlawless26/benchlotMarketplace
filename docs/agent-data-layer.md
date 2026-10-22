# Agent data layer: `/api/v1` and `/mcp`

Shipped on branch `agent-data-layer`, 2026-10-21. The machine-readable door to
the same data the guide pages render, for AI agents and the people who build
them. Not a marketplace; no sell-side; no monetization (the r/handtools
promise in BENCHLOT-HANDOFF.md §3.3 stands).

## Where things are

| Piece | Path |
|---|---|
| Envelope, CORS, cache presets | `web/lib/api/envelope.ts` |
| Keys (sha256 at rest), issuance | `web/lib/api/keys.ts`, `scripts/api-key-issue.js`, schema/014 |
| Auth + Postgres rate limit + usage log + PostHog `api_request` | `web/lib/api/request.ts` |
| `withApi()` route wrapper (zod, envelope, logging) | `web/lib/api/handler.ts` |
| zod schemas (validation, OpenAPI, MCP inputs) | `web/lib/api/schemas.ts` |
| Names → canonical spellings and cluster keys | `web/lib/api/resolve.ts` |
| Price answer with confidence/freshness/coverage | `web/lib/api/prices.ts` |
| Per-source licence rules (eBay 24h, Reddit attribution) | `web/lib/api/license.ts` |
| Listing search on `search_vector` | `web/lib/api/listings.ts` |
| /types, /brands, /meta (coverage snapshot) | `web/lib/api/catalog.ts` |
| identify + alert services shared by REST and MCP | `web/lib/api/services.ts` |
| OpenAPI 3.1 from the zod schemas | `web/lib/api/openapi.ts` |
| REST routes | `web/app/api/v1/**/route.ts` |
| MCP tools and server | `web/lib/mcp/tools.ts`, `web/app/mcp/route.ts` (mcp-handler 2.x) |
| Developers page, policy | `web/app/developers/` |
| Rewrites from benchlot.com | root `vercel.json` (`/api/v1`, `/mcp`, `/developers`) |
| CORS on framework responses | `web/next.config.ts` |

## Rules baked in

- Every response carries `meta.attribution` and `meta.license_url`. Every
  listing carries `source.url` and `attribution.text`. Links are never
  wrapped, shortened or tagged.
- `confidence`: high ≥ 20 sales, medium ≥ 8, low < 8 (no sold median
  published), none. Percentiles are null below the guide's own thresholds
  (`SOLD_MIN_FOR_REFERENCE`, `ASKING_MIN_FOR_REFERENCE` in price-guide.ts).
- eBay rows that are not sold carry `price_valid_until` (last seen + 24h) and
  lose their price past it (`price_status: stale`).
- Anonymous: 30/min per salted IP hash (`API_ANON_LIMIT_PER_MIN`,
  `API_IP_SALT`). Keyed: `api_keys.rate_limit_per_min` (default 120).
  `identify` and `alerts` need a key. The limiter is a Postgres count over
  `api_requests`, same pattern as `scanRateLimited`.
- Alerts keep the identical-response invariant from `/api/alerts`.
- `/meta` coverage comes from `coverage_snapshots` (nightly,
  `scripts/coverage-report.js --write`), never a live scan of `listings`.

## Operating it

```sh
node scripts/api-key-issue.js --name "Client" --email a@b.c     # issue
node scripts/api-key-issue.js --list                            # see keys
node scripts/api-key-issue.js --revoke bl_live_3f9a             # by prefix
```

Env on benchlot-web: `API_IP_SALT` (any long random string; without it the
hash uses a fixed salt and logs a warning), optional `API_ANON_LIMIT_PER_MIN`.

PostHog: `api_request` (surface, route, key_id, status, ms), `api_key_requested`,
`alert_requested` with `surface` in (`api`, `mcp`), `$ai_generation` with
distinct_id `agent:<key-id>` for identify calls.

Smoke test after deploy:

```sh
curl -s 'https://benchlot.com/api/v1/prices?type=bench%20plane&brand=stanley&model=no.%204' | jq '.data.confidence, .meta'
curl -s https://benchlot.com/api/v1/meta | jq .data.coverage
npx @modelcontextprotocol/inspector --transport http --server-url https://benchlot.com/mcp
```

The normalizer backfill that feeds coverage is documented in
`docs/normalizer-backfill-runbook.md`.
