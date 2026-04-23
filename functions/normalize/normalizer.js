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

const Anthropic = require('@anthropic-ai/sdk');

const { SYSTEM_PROMPT } = require('./prompt');
const { CANONICAL_BRANDS, CANONICAL_TYPES } = require('./vocabulary');

const DEFAULT_MODEL = process.env.BENCHLOT_NORMALIZER_MODEL || 'claude-haiku-4-5';
const MAX_TOKENS = 1024;

/** Tool schema — canonical_brand is free-form (antique tools have a long
 * tail of small makers); canonical_type stays enum-constrained for faceted
 * search. See prompt.js for preferred-forms guidance on brand. */
const CLASSIFY_TOOL = {
  name: 'classify_listing',
  description: 'Emit the canonical classification for a hand-tool listing.',
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
    },
    required: ['canonical_brand', 'canonical_type', 'canonical_model', 'canonical_size', 'era_estimate'],
  },
};

function buildUserMessage(listing) {
  const parts = [];
  parts.push(`Title: ${listing.title_raw || '(missing)'}`);
  if (listing.description_raw) {
    // Trim aggressively — descriptions can be huge and rarely useful beyond a paragraph.
    const desc = String(listing.description_raw).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (desc) parts.push(`Description: ${desc.slice(0, 1200)}`);
  }
  if (Array.isArray(listing.tags) && listing.tags.length > 0) {
    parts.push(`Tags: ${listing.tags.slice(0, 20).join(', ')}`);
  }
  if (listing.heuristic_brand && listing.heuristic_brand !== 'Unknown') {
    parts.push(`Heuristic brand guess: ${listing.heuristic_brand}`);
  }
  if (listing.heuristic_type) {
    parts.push(`Heuristic type guess: ${listing.heuristic_type}`);
  }
  return parts.join('\n');
}

let cachedClient = null;
function getClient() {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

/**
 * Normalize one listing. Returns canonical fields plus usage telemetry.
 *
 * @param {object} listing — must have at minimum `title_raw`.
 * @param {object} [opts]
 * @param {string} [opts.model]
 * @returns {Promise<{canonical_brand, canonical_type, canonical_model, canonical_size, era_estimate, usage}>}
 */
async function normalizeListing(listing, opts = {}) {
  const model = opts.model || DEFAULT_MODEL;
  const client = getClient();

  const response = await client.messages.create({
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
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.name !== 'classify_listing') {
    throw new Error(`Expected classify_listing tool call, got stop_reason=${response.stop_reason}`);
  }

  return {
    ...toolUse.input,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens || 0,
      cache_read_input_tokens: response.usage.cache_read_input_tokens || 0,
    },
    model,
  };
}

module.exports = {
  normalizeListing,
  CLASSIFY_TOOL,
  DEFAULT_MODEL,
};
