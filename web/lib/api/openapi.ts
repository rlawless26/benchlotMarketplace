/**
 * OpenAPI 3.1 for /api/v1. Paths are written by hand (there are nine);
 * schemas come from the same zod objects that validate requests, so they
 * cannot drift from what the routes accept and return.
 */
import { z } from 'zod';
import { SITE_URL } from '@/lib/site';
import * as S from './schemas';
import { ATTRIBUTION, LICENSE_URL, DOCS_URL } from './envelope';

type JsonSchema = Record<string, unknown>;
const js = (schema: z.ZodType): JsonSchema => z.toJSONSchema(schema, { target: 'draft-2020-12', io: 'output', unrepresentable: 'any' }) as JsonSchema;
// Query schemas use coercion; document them as inputs.
const jsIn = (schema: z.ZodType): JsonSchema => z.toJSONSchema(schema, { target: 'draft-2020-12', io: 'input', unrepresentable: 'any' }) as JsonSchema;

function queryParams(schema: z.ZodObject): unknown[] {
  const j = jsIn(schema) as { properties?: Record<string, JsonSchema>; required?: string[] };
  return Object.entries(j.properties ?? {}).map(([name, s]) => ({
    name, in: 'query', required: (j.required ?? []).includes(name), schema: s, description: s.description,
  }));
}

const Envelope = (data: JsonSchema, extraMeta: Record<string, JsonSchema> = {}): JsonSchema => ({
  type: 'object',
  required: ['data', 'meta', 'errors'],
  properties: {
    data,
    meta: {
      type: 'object',
      properties: {
        generated_at: { type: 'string', format: 'date-time' },
        api_version: { type: 'string', const: 'v1' },
        attribution: { type: 'object', description: 'Repeat `text` and link `guide_url`/`source_url` wherever you show a figure or listing.' },
        license_url: { type: 'string' },
        docs_url: { type: 'string' },
        ...extraMeta,
      },
    },
    errors: { type: 'array', items: { $ref: '#/components/schemas/Error' } },
  },
});

const ErrorSchema: JsonSchema = {
  type: 'object', required: ['code', 'message'],
  properties: { code: { type: 'string' }, message: { type: 'string' }, field: { type: 'string' } },
};

const responses = (data: JsonSchema, extraMeta?: Record<string, JsonSchema>) => ({
  '200': { description: 'OK', content: { 'application/json': { schema: Envelope(data, extraMeta) } } },
  '400': { description: 'Invalid parameter', content: { 'application/json': { schema: Envelope({ type: 'null' }) } } },
  '401': { description: 'Unknown, revoked or missing API key' },
  '429': { description: 'Rate limited; see Retry-After and X-RateLimit-*' },
});

const keyed = [{ ApiKey: [] }, { Bearer: [] }];

export function openapi() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Benchlot API',
      version: '1.0.0',
      description: [
        'Prices, listings and identification for used woodworking hand tools and machines, aggregated from dealers, forums and marketplaces.',
        `Free. Attribution required: show "${ATTRIBUTION.text}" and link the \`guide_url\` or \`source_url\` returned with any figure or listing. Policy: ${LICENSE_URL}.`,
        'Benchlot is not a marketplace: it holds no inventory, brokers nothing and takes no commission. Every listing links to its source, unaltered.',
        'Honesty fields: read `confidence`, `freshness` and `coverage` on every price answer, and `price_status` on every listing. A `confidence` of `low` means fewer than 8 recorded sales; do not state a sold median.',
        `Rate limits: ${process.env.API_ANON_LIMIT_PER_MIN || 30}/min anonymous, higher with a free key (POST /api/v1/keys). MCP server: ${SITE_URL}/mcp.`,
      ].join('\n\n'),
      termsOfService: LICENSE_URL,
      contact: { url: DOCS_URL },
    },
    servers: [{ url: `${SITE_URL}/api/v1` }],
    security: [{}, ...keyed],
    paths: {
      '/prices': {
        get: {
          operationId: 'getPriceGuide', summary: 'What a tool sells for',
          description: 'Resolves type/brand (+model or size) to a price-guide page. 200 with `data: null` and `errors[0].code = insufficient_evidence` when fewer than 8 sales and 10 asks exist; `meta.suggestions` lists nearby pages.',
          parameters: queryParams(S.PricesQuery),
          responses: responses({ oneOf: [{ $ref: '#/components/schemas/PriceGuide' }, { type: 'null' }] }, { resolved: { type: 'object' }, suggestions: { type: 'array', items: { $ref: '#/components/schemas/PriceGuideRef' } } }),
        },
      },
      '/prices/search': {
        get: {
          operationId: 'searchPriceGuide', summary: 'Find price-guide pages by free text',
          parameters: queryParams(S.PriceSearchQuery),
          responses: responses({ type: 'array', items: { $ref: '#/components/schemas/PriceGuideRef' } }),
        },
      },
      '/listings': {
        get: {
          operationId: 'searchListings', summary: 'Listings for sale now, or recorded sales',
          description: 'Full-text search plus canonical filters. Rows carry `source.url`; link it. eBay asking prices are withheld after 24 hours (`price_status: stale`); fetch the source for a live price.',
          parameters: queryParams(S.ListingsQuery),
          responses: responses({ type: 'array', items: { $ref: '#/components/schemas/Listing' } }, { next_cursor: { type: ['string', 'null'] }, count: { type: 'integer' } }),
        },
      },
      '/listings/{id}': {
        get: {
          operationId: 'getListing', summary: 'One listing',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^\\d+$' } }],
          responses: { ...responses({ $ref: '#/components/schemas/Listing' }), '404': { description: 'No such listing' } },
        },
      },
      '/types': {
        get: { operationId: 'listTypes', summary: 'Tool types the guide knows, with evidence counts', responses: responses({ type: 'array', items: { type: 'object' } }) },
      },
      '/brands': {
        get: { operationId: 'listBrands', summary: 'Makers with price-guide pages', parameters: queryParams(S.BrandsQuery), responses: responses({ type: 'array', items: { type: 'object' } }) },
      },
      '/meta': {
        get: { operationId: 'getMeta', summary: 'Coverage, freshness, sources, thresholds, licensing', responses: responses({ type: 'object' }) },
      },
      '/identify': {
        post: {
          operationId: 'identifyTool', summary: 'Identify a tool from photos', security: keyed,
          description: 'One tool, one to five photos. Returns the identification with its own confidence, the price-guide reference band and live listings for the same tool. Rate limited to 20 scans per 15 minutes per key.',
          requestBody: { required: true, content: { 'application/json': { schema: js(S.IdentifyBody) } } },
          responses: { ...responses({ type: 'object' }), '413': { description: 'Body over 3 MB' } },
        },
      },
      '/alerts': {
        post: {
          operationId: 'createAlert', summary: 'Email alert for new listings of a tool', security: keyed,
          description: 'Always answers 200 with the same message, whatever happened (no email enumeration). The address must click a confirmation email before any alert is sent.',
          requestBody: { required: true, content: { 'application/json': { schema: js(S.AlertBody) } } },
          responses: responses({ type: 'object', properties: { status: { type: 'string', const: 'pending_confirmation' }, message: { type: 'string' } } }),
        },
      },
      '/keys': {
        post: {
          operationId: 'requestKey', summary: 'Request a free API key by email',
          requestBody: { required: true, content: { 'application/json': { schema: js(S.KeyRequestBody) } } },
          responses: responses({ type: 'object', properties: { status: { type: 'string' }, message: { type: 'string' } } }),
        },
      },
    },
    components: {
      securitySchemes: {
        Bearer: { type: 'http', scheme: 'bearer', description: 'Authorization: Bearer bl_live_…' },
        ApiKey: { type: 'apiKey', in: 'header', name: 'X-Api-Key' },
      },
      schemas: {
        Error: ErrorSchema,
        PriceGuide: js(S.PriceGuide),
        PriceGuideRef: js(S.PriceGuideRef),
        Listing: js(S.Listing),
        Confidence: js(S.Confidence),
      },
    },
  };
}
