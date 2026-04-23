#!/usr/bin/env node
/**
 * Bootstrap the eval ground truth using Opus 4.7.
 *
 * Reads `ground_truth.seed.json` from this directory, runs each listing
 * through Opus 4.7 with adaptive thinking and high effort (a deliberately
 * different model tier from the production normalizer, which uses Haiku
 * 4.5), and writes `ground_truth.json` ready for scoring.
 *
 * Every entry in the output carries a `_bootstrap_review` array listing
 * reasons Rob should spot-check that entry — e.g. Opus's canonical_brand
 * disagrees with the heuristic, or the heuristic said "Unknown" but Opus
 * surfaced a brand. This replaces 25-30 minutes of manual labeling with
 * a 5-minute spot-check pass.
 *
 * Usage:
 *   export ANTHROPIC_API_KEY=...
 *   node functions/normalize/eval/bootstrap-truth.js
 *   node functions/normalize/eval/bootstrap-truth.js --concurrency 3
 */

const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');

// Convenience: load functions/.env into process.env if ANTHROPIC_API_KEY
// isn't already set in the shell. This avoids making Rob source an env
// file before every invocation.
(function loadLocalEnv() {
  if (process.env.ANTHROPIC_API_KEY) return;
  const envPath = path.resolve(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
})();

const { SYSTEM_PROMPT } = require('../prompt');
const { CLASSIFY_TOOL } = require('../normalizer');

const EVAL_DIR = __dirname;
const SEED_PATH = path.join(EVAL_DIR, 'ground_truth.seed.json');
const OUT_PATH = path.join(EVAL_DIR, 'ground_truth.json');

const MODEL = 'claude-opus-4-7';
const MAX_TOKENS = 2048;

function parseArgs(argv) {
  const args = { concurrency: 3 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--concurrency') args.concurrency = Number(argv[++i]);
  }
  return args;
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  async function pump() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
      done++;
      process.stdout.write(`\r[bootstrap-truth] ${done}/${items.length} labeled`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, pump));
  process.stdout.write('\n');
  return results;
}

function buildUserMessage(entry) {
  const parts = [];
  parts.push(
    'You are generating ground-truth labels for a canonical-normalization eval.',
    'Be more careful than a production normalizer would be — this is the answer key.',
    'Prefer null over a guess when genuinely uncertain. When the model or era is',
    'clearly stated in the title or description, fill it in precisely.',
    '',
    `Title: ${entry.title_raw || '(missing)'}`
  );
  if (entry._tags && entry._tags.length) parts.push(`Tags: ${entry._tags.slice(0, 10).join(', ')}`);
  if (entry._heuristic_brand) parts.push(`(Heuristic brand guess — ignore if unreliable: ${entry._heuristic_brand})`);
  if (entry._heuristic_type) parts.push(`(Heuristic type guess — ignore if unreliable: ${entry._heuristic_type})`);
  return parts.join('\n');
}

function computeReviewFlags(entry, predicted) {
  const flags = [];

  const seedBrand = entry.truth?.canonical_brand || null;
  if (seedBrand && seedBrand !== predicted.canonical_brand) {
    flags.push(`brand: heuristic=${seedBrand} vs opus=${predicted.canonical_brand}`);
  }
  if (seedBrand === 'Unknown' && predicted.canonical_brand !== 'Unknown') {
    flags.push(`brand: heuristic=Unknown but opus found ${predicted.canonical_brand}`);
  }

  const seedType = entry.truth?.canonical_type || null;
  if (seedType && seedType !== predicted.canonical_type) {
    flags.push(`type: heuristic=${seedType} vs opus=${predicted.canonical_type}`);
  }

  if (predicted.canonical_model) {
    flags.push(`model inferred: "${predicted.canonical_model}" — verify against title`);
  }
  if (predicted.era_estimate) {
    flags.push(`era inferred: "${predicted.era_estimate}" — verify against title/description`);
  }

  return flags;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!fs.existsSync(SEED_PATH)) {
    console.error(`[bootstrap-truth] seed file not found: ${SEED_PATH}`);
    console.error('        generate it first via: node functions/normalize/eval/fetch-seed.js');
    process.exit(2);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[bootstrap-truth] ANTHROPIC_API_KEY not set');
    process.exit(2);
  }

  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  const listings = seed.listings || [];
  if (!listings.length) {
    console.error('[bootstrap-truth] seed file has no listings');
    process.exit(2);
  }

  console.log(`[bootstrap-truth] labeling ${listings.length} listings with ${MODEL} (concurrency=${args.concurrency})`);
  console.log('[bootstrap-truth] this uses adaptive thinking + high effort; expect 1-2 min.');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const totals = { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 };

  const results = await runWithConcurrency(listings, args.concurrency, async (entry) => {
    try {
      // Adaptive thinking is incompatible with forced tool_choice on
      // Opus 4.7 (the API rejects the combo with invalid_request_error).
      // `effort: "high"` still gives us careful reasoning without thinking
      // blocks, which is the right fit for structured-output tasks.
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        output_config: { effort: 'high' },
        system: [
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        ],
        tools: [CLASSIFY_TOOL],
        tool_choice: { type: 'tool', name: 'classify_listing' },
        messages: [{ role: 'user', content: buildUserMessage(entry) }],
      });

      totals.input += response.usage.input_tokens;
      totals.output += response.usage.output_tokens;
      totals.cacheCreate += response.usage.cache_creation_input_tokens || 0;
      totals.cacheRead += response.usage.cache_read_input_tokens || 0;

      const toolUse = response.content.find((b) => b.type === 'tool_use');
      if (!toolUse) {
        return { ok: false, entry, error: `no tool_use block (stop_reason=${response.stop_reason})` };
      }
      return { ok: true, entry, predicted: toolUse.input };
    } catch (err) {
      return { ok: false, entry, error: err.message };
    }
  });

  const labeled = [];
  const errored = [];
  for (const r of results) {
    if (!r.ok) {
      errored.push(r);
      // Preserve the seed entry unchanged so the file stays valid.
      labeled.push({ ...r.entry, _bootstrap_error: r.error });
      continue;
    }
    const reviewFlags = computeReviewFlags(r.entry, r.predicted);
    labeled.push({
      ...r.entry,
      truth: {
        canonical_brand: r.predicted.canonical_brand,
        canonical_type: r.predicted.canonical_type,
        canonical_model: r.predicted.canonical_model,
        canonical_size: r.predicted.canonical_size,
        era_estimate: r.predicted.era_estimate,
      },
      _bootstrap_review: reviewFlags,
    });
  }

  // Cost estimate at Opus 4.7 pricing.
  const OPUS = { input: 5.0, output: 25.0, cacheWrite: 6.25, cacheRead: 0.5 };
  const cost =
    (totals.input * OPUS.input
      + totals.output * OPUS.output
      + totals.cacheCreate * OPUS.cacheWrite
      + totals.cacheRead * OPUS.cacheRead) / 1_000_000;

  const out = {
    README: [
      'Ground-truth labels for the normalizer eval. Generated by bootstrap-truth.js',
      `using ${MODEL} with adaptive thinking + high effort.`,
      '',
      'REVIEW PROCESS:',
      '1. Scan entries with a non-empty `_bootstrap_review` array — these are the',
      '   cases where Opus disagreed with the heuristic or inferred non-obvious',
      '   fields. Open each, verify the `truth` values, correct anything wrong.',
      '2. Entries with an empty `_bootstrap_review` (heuristic and Opus agreed,',
      '   no inferences) are probably fine as-is.',
      '3. When satisfied: `node functions/normalize/eval/score.js`.',
      '',
      `Opus cost to generate this file: $${cost.toFixed(4)}.`,
    ].join('\n'),
    generated_at: new Date().toISOString(),
    generator_model: MODEL,
    count: labeled.length,
    errored_count: errored.length,
    listings: labeled,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf8');

  const reviewCount = labeled.filter((l) => l._bootstrap_review && l._bootstrap_review.length > 0).length;
  console.log(`[bootstrap-truth] wrote ${labeled.length} labels to ${OUT_PATH}`);
  console.log(`[bootstrap-truth] ${reviewCount} entries flagged for spot-check (non-empty _bootstrap_review)`);
  console.log(`[bootstrap-truth] ${errored.length} errored (preserved with _bootstrap_error)`);
  console.log(`[bootstrap-truth] tokens: input=${totals.input} output=${totals.output} cache_write=${totals.cacheCreate} cache_read=${totals.cacheRead}`);
  console.log(`[bootstrap-truth] cost: $${cost.toFixed(4)}`);
}

main().catch((e) => {
  console.error('\n[bootstrap-truth] fatal:', e);
  process.exit(1);
});
