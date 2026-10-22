/**
 * LLM-based normalizer for externalListings.
 *
 * Takes a raw listing (title, description, tags, heuristics) and returns
 * canonical fields via Claude tool use. Structured output is enforced with
 * `tool_choice: {type: "tool", name: "classify_listing"}` — the model must
 * call the tool with an input matching the canonical schema.
 *
 * Prompt caching: system prompt is large (~3k tokens) and stable across all
 * calls. Cache_control on the system block means the first call writes the
 * cache at 1.25x; subsequent calls read it at 0.1x. At 1k+ rows this is the
 * difference between $1 and $30.
 */

const { randomUUID } = require('crypto');
const { createAnthropic, telemetry } = require('../lib/anthropic-client');

const { SYSTEM_PROMPT } = require('./prompt');
const { CANONICAL_BRANDS, CANONICAL_TYPES } = require('./vocabulary');

// Haiku 5.5 since 2026-10-21: 96% type / 88% brand agreement with 4.5 on a 50-title
// check (scripts/normalizer-model-compare.js) at a tenth of the price.
const DEFAULT_MODEL = process.env.BENCHLOT_NORMALIZER_MODEL || 'claude-haiku-5-5';
const MAX_TOKENS = 1024;

/** Tool schema — canonical_brand is free-form (antique tools have a long
 * tail of small makers); canonical_type stays enum-constrained for faceted
 * search. See prompt.js for preferred-forms guidance on brand. */
const CLASSIFY_TOOL = {
  name: 'classify_listing',
  description: 'Emit the canonical classification for a woodworking-tool listing (hand tool or power tool).',
  input_schema: {
    type: 'object',
    properties: {
      canonical_brand: {
        type: 'string',
        description: 'The maker as named on the listing, normalized to title case. Use "Unknown" (exact string) when no maker is identifiable. See preferred-forms guidance in the system prompt.',
      },
      canonical_type: {
        type: 'string',
        enum: CANONICAL_TYPES,
        description: 'The tool type, picked from the closed canonical type list.',
      },
      canonical_model: {
        type: ['string', 'null'],
        description: 'Model designation (e.g. "No. 5", "D-8", "A5"). Null if not indicated.',
      },
      canonical_size: {
        type: ['string', 'null'],
        description: 'Primary size dimension (e.g. "14 inch sole", "1/2 inch"). Null if not stated.',
      },
      era_estimate: {
        type: ['string', 'null'],
        description: 'Era shorthand (e.g. "1920s", "c. 1900-1915", "Type 11, c. 1910-1918"). Null if unknown.',
      },
      plane_type_number: {
        type: ['integer', 'null'],
        description: 'Stanley bench plane Type Study number (1-20). Populated only when the listing is a Stanley bench plane (#1-#8) AND the type can be identified with reasonable confidence. Null otherwise (non-Stanley brands, block planes, Bedrocks, specialty planes, or unidentifiable types).',
        minimum: 1,
        maximum: 20,
      },
    },
    required: ['canonical_brand', 'canonical_type', 'canonical_model', 'canonical_size', 'era_estimate', 'plane_type_number'],
  },
};

/**
 * Scraped text occasionally carries a lone UTF-16 surrogate (a truncated
 * emoji). JSON.stringify emits it as an unpaired \\udXXX escape, which the API
 * rejects as invalid JSON — and in a batch that one title sinks all 2,500
 * requests (seen 2026-10-21). Node 20+ repairs it in place.
 */
function wellFormed(v) {
  const s = String(v ?? '');
  return typeof s.toWellFormed === 'function'
    ? s.toWellFormed()
    : s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');
}

function buildUserMessage(listing) {
  const parts = [];
  parts.push(`Title: ${wellFormed(listing.title_raw) || '(missing)'}`);
  if (listing.description_raw) {
    // Trim aggressively — descriptions can be huge and rarely useful beyond a paragraph.
    const desc = wellFormed(listing.description_raw).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (desc) parts.push(`Description: ${desc.slice(0, 1200)}`);
  }
  if (Array.isArray(listing.tags) && listing.tags.length > 0) {
    parts.push(`Tags: ${listing.tags.slice(0, 20).map(wellFormed).join(', ')}`);
  }
  if (listing.heuristic_brand && listing.heuristic_brand !== 'Unknown') {
    parts.push(`Heuristic brand guess: ${listing.heuristic_brand}`);
  }
  if (listing.heuristic_type) {
    parts.push(`Heuristic type guess: ${listing.heuristic_type}`);
  }
  // Once more over the whole message: the heuristic hints are substrings of
  // the title and carry the same damage.
  return wellFormed(parts.join('\n'));
}

let cached = null;
function getClient() {
  if (cached) return cached.client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  cached = createAnthropic({ apiKey });
  return cached.client;
}

/** Flush LLM-analytics events; the batch runner calls this before exiting. */
async function shutdownClient() {
  if (cached) await cached.shutdown();
}

/**
 * Normalize one listing. Returns canonical fields plus usage telemetry.
 *
 * @param {object} listing — must have at minimum `title_raw`.
 * @param {object} [opts]
 * @param {string} [opts.model]
 * @returns {Promise<{canonical_brand, canonical_type, canonical_model, canonical_size, era_estimate, usage}>}
 */
/**
 * Model-specific request extras. The Haiku 5.x line turns adaptive thinking on
 * by default, which is wasted money on a 70-token classification and is not
 * combinable with a forced tool call; `disabled` is accepted at effort `high`
 * or below. Haiku 4.5 rejects both fields, so they are only added where needed.
 */
function modelExtras(model) {
  if (/^claude-haiku-5/.test(model)) {
    return { thinking: { type: 'disabled' }, output_config: { effort: 'low' } };
  }
  return {};
}

/**
 * The exact Messages API params for one listing — shared by the synchronous
 * path (normalizeListing) and the Batch API path (run-postgres.js
 * --batch-submit), so a batch request is byte-for-byte the request the sync
 * path would have made. Telemetry params are NOT included: they are
 * PostHog-wrapper extras the Batches endpoint would reject.
 */
function buildRequestParams(listing, model = DEFAULT_MODEL) {
  return {
    model,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [CLASSIFY_TOOL],
    tool_choice: { type: 'tool', name: 'classify_listing' },
    messages: [
      { role: 'user', content: buildUserMessage(listing) },
    ],
    ...modelExtras(model),
  };
}

/**
 * Pull the classification out of a Message (sync response or a batch result's
 * `.result.message`). Throws when the model did not call the tool.
 */
function parseClassification(message, model) {
  const toolUse = message.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.name !== 'classify_listing') {
    throw new Error(`Expected classify_listing tool call, got stop_reason=${message.stop_reason}`);
  }
  return {
    ...toolUse.input,
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      cache_creation_input_tokens: message.usage.cache_creation_input_tokens || 0,
      cache_read_input_tokens: message.usage.cache_read_input_tokens || 0,
    },
    model,
  };
}

async function normalizeListing(listing, opts = {}) {
  const model = opts.model || DEFAULT_MODEL;
  const client = getClient();

  const response = await client.messages.create({
    ...buildRequestParams(listing, model),
    ...telemetry('normalizer', randomUUID(), {
      title: String(listing.title_raw || '').slice(0, 200),
      source: listing.source || null,
    }),
  });

  return parseClassification(response, model);
}

module.exports = {
  normalizeListing,
  buildRequestParams,
  parseClassification,
  shutdownClient,
  CLASSIFY_TOOL,
  DEFAULT_MODEL,
  MAX_TOKENS,
};
