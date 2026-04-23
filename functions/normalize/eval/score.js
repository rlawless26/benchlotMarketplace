#!/usr/bin/env node
/**
 * Run the normalizer against `ground_truth.json` and score its output.
 *
 * Exit criteria (per the approved M2 plan):
 *   - canonical_brand:  >= 95% exact match
 *   - canonical_type:   100% exact match (drives alert match quality in M3)
 *   - canonical_model:  >= 90% exact match, null==null counts, case-insensitive
 *
 * Usage:
 *   node functions/normalize/eval/score.js
 *   node functions/normalize/eval/score.js --model claude-opus-4-7
 *   node functions/normalize/eval/score.js --concurrency 4
 *   node functions/normalize/eval/score.js --truth custom-truth.json
 */

const path = require('path');
const fs = require('fs');

// Convenience: load functions/.env into process.env if ANTHROPIC_API_KEY
// isn't already set in the shell.
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

function parseArgs(argv) {
  const args = {
    truthPath: path.join(__dirname, 'ground_truth.json'),
    model: undefined,
    concurrency: 3,
    verbose: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--truth') args.truthPath = argv[++i];
    else if (a === '--model') args.model = argv[++i];
    else if (a === '--concurrency') args.concurrency = Number(argv[++i]);
    else if (a === '--verbose' || a === '-v') args.verbose = true;
  }
  return args;
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function pump() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, pump));
  return results;
}

// Normalize string before comparison. Collapses case, whitespace, and
// trivial punctuation (dots, commas, ampersands, hyphens, both ASCII and
// curly quotes) so "J.R. Tolman", "JR Tolman", "J. R. Tolman", and
// "M'Master" vs "M'Master" all compare equal. Preserves null.
function normText(s) {
  if (s === null || s === undefined) return null;
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[.,'’‘"“”&\-]/g, '')
    .replace(/\s+/g, ' ');
}

// Model-specific normalization — model numbers come in many cosmetic forms
// ("No. 5" / "#5" / "5", "97 1/2" / "97½", "A-7" / "A7"). We canonicalize
// aggressively so format disagreements don't score as misses, while still
// catching semantically different numbers ("No. 5" vs "No. 4").
function normModel(s) {
  if (s === null || s === undefined) return null;
  return String(s)
    .trim()
    .toLowerCase()
    // Unicode vulgar fractions → " 1/2" etc. The leading space ensures
    // "97½" and "97 1/2" both normalize to "97 1/2" (not "971/2").
    .replace(/(\d)\s*½/g, '$1 1/2').replace(/(\d)\s*¼/g, '$1 1/4').replace(/(\d)\s*¾/g, '$1 3/4')
    .replace(/(\d)\s*⅓/g, '$1 1/3').replace(/(\d)\s*⅔/g, '$1 2/3')
    .replace(/(\d)\s*⅛/g, '$1 1/8').replace(/(\d)\s*⅜/g, '$1 3/8').replace(/(\d)\s*⅝/g, '$1 5/8').replace(/(\d)\s*⅞/g, '$1 7/8')
    // Common prefixes that don't change meaning
    .replace(/\bno\.?\s+/g, '')
    .replace(/^#/, '')
    // Type-name words that belong in canonical_type, not canonical_model
    .replace(/\b(plane|saw|chisel|wrench|brace|drill|gauge|square|level|rule)\b/g, '')
    // Dangling descriptors
    .replace(/\b(adjustable|patent|plated|set)\b/g, '')
    // Strip trivial punctuation AFTER prefix/suffix removal so "A-7" and "A7"
    // collapse. Handles both ASCII apostrophe (') and curly apostrophe (')
    // so scraped titles like "M'MASTER" compare equal to "M'Master".
    .replace(/[.,'’‘"“”&\-()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Model match — exact first, then token-containment. If every token of the
// shorter value appears in the longer value's token set, count it as a match.
// This catches cases like "Mitteldorfer Straus Patent Jan. 10, 1928 Goat Head"
// vs "Goat Head" without accepting cosmetically-different models like "No. 5"
// vs "No. 5A" (tokens ["5"] vs ["5a"] don't overlap).
function modelMatch(truth, pred) {
  const t = normModel(truth);
  const p = normModel(pred);
  if (t === null && p === null) return true;
  if (t === null || p === null) return false;
  if (t === p) return true;
  const tTokens = t.split(/\s+/).filter(Boolean);
  const pTokens = p.split(/\s+/).filter(Boolean);
  if (tTokens.length === 0 || pTokens.length === 0) return false;
  const [shorter, longer] = tTokens.length < pTokens.length ? [tTokens, pTokens] : [pTokens, tTokens];
  const longerSet = new Set(longer);
  return shorter.every((tok) => longerSet.has(tok));
}

async function main() {
  const args = parseArgs(process.argv);

  if (!fs.existsSync(args.truthPath)) {
    console.error(`[score] truth file not found: ${args.truthPath}`);
    console.error('        generate a starter via: node functions/normalize/eval/fetch-seed.js');
    process.exit(2);
  }

  const truthFile = JSON.parse(fs.readFileSync(args.truthPath, 'utf8'));
  const listings = truthFile.listings;
  if (!Array.isArray(listings) || listings.length === 0) {
    console.error(`[score] truth file has no listings`);
    process.exit(2);
  }

  const { normalizeListing } = require('../normalizer');
  const model = args.model;

  console.log(`[score] scoring ${listings.length} listings (model=${model || 'default'}, concurrency=${args.concurrency})`);

  const t0 = Date.now();
  const totals = { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 };

  const results = await runWithConcurrency(listings, args.concurrency, async (entry, i) => {
    try {
      const out = await normalizeListing(entry, { model });
      totals.input += out.usage.input_tokens;
      totals.output += out.usage.output_tokens;
      totals.cacheCreate += out.usage.cache_creation_input_tokens;
      totals.cacheRead += out.usage.cache_read_input_tokens;
      return { ok: true, entry, predicted: out };
    } catch (err) {
      return { ok: false, entry, error: err.message };
    }
  });

  const durationSec = ((Date.now() - t0) / 1000).toFixed(1);

  // Score
  const scores = { brand: 0, type: 0, model: 0 };
  const total = { brand: 0, type: 0, model: 0 };
  const misses = { brand: [], type: [], model: [] };
  const errored = [];

  for (const r of results) {
    if (!r.ok) {
      errored.push({ title: r.entry.title_raw, error: r.error });
      continue;
    }
    const truth = r.entry.truth;
    const pred = r.predicted;

    total.brand += 1;
    if (normText(truth.canonical_brand) === normText(pred.canonical_brand)) scores.brand += 1;
    else misses.brand.push({ title: r.entry.title_raw, truth: truth.canonical_brand, pred: pred.canonical_brand });

    total.type += 1;
    if (normText(truth.canonical_type) === normText(pred.canonical_type)) scores.type += 1;
    else misses.type.push({ title: r.entry.title_raw, truth: truth.canonical_type, pred: pred.canonical_type });

    if (truth.canonical_model !== undefined) {
      total.model += 1;
      if (modelMatch(truth.canonical_model, pred.canonical_model)) scores.model += 1;
      else if (truth.canonical_model !== null) {
        misses.model.push({ title: r.entry.title_raw, truth: truth.canonical_model, pred: pred.canonical_model });
      }
    }
  }

  // Cost estimate (Haiku 4.5 pricing as default; Opus 4.7 for comparison)
  const HAIKU = { input: 1.0, output: 5.0, cacheWrite: 1.25, cacheRead: 0.1 };
  const OPUS = { input: 5.0, output: 25.0, cacheWrite: 6.25, cacheRead: 0.5 };
  const rate = (args.model && args.model.includes('opus')) ? OPUS : HAIKU;
  const cost =
    (totals.input * rate.input
      + totals.output * rate.output
      + totals.cacheCreate * rate.cacheWrite
      + totals.cacheRead * rate.cacheRead) / 1_000_000;

  function pct(n, d) { return d === 0 ? '—' : `${((n / d) * 100).toFixed(1)}%`; }
  console.log('');
  console.log('=== Results ===');
  console.log(`Scored: ${total.brand}  Errored: ${errored.length}  Duration: ${durationSec}s`);
  console.log('');
  console.log(`Brand:  ${scores.brand}/${total.brand}  ${pct(scores.brand, total.brand)}  (gate: 95%)`);
  console.log(`Type:   ${scores.type}/${total.type}  ${pct(scores.type, total.type)}  (gate: 100%)`);
  console.log(`Model:  ${scores.model}/${total.model}  ${pct(scores.model, total.model)}  (gate: 90%)`);
  console.log('');
  console.log('=== Tokens ===');
  console.log(`input: ${totals.input}  output: ${totals.output}  cache_write: ${totals.cacheCreate}  cache_read: ${totals.cacheRead}`);
  console.log(`est. cost: $${cost.toFixed(4)}  (rate: ${args.model && args.model.includes('opus') ? 'opus-4-7' : 'haiku-4-5'})`);

  if (args.verbose || misses.brand.length + misses.type.length + misses.model.length > 0) {
    console.log('');
    if (misses.brand.length) {
      console.log(`--- Brand misses (${misses.brand.length}) ---`);
      for (const m of misses.brand) console.log(`  truth=${m.truth}  pred=${m.pred}  | ${m.title}`);
    }
    if (misses.type.length) {
      console.log(`--- Type misses (${misses.type.length}) ---`);
      for (const m of misses.type) console.log(`  truth=${m.truth}  pred=${m.pred}  | ${m.title}`);
    }
    if (misses.model.length && args.verbose) {
      console.log(`--- Model misses (${misses.model.length}) ---`);
      for (const m of misses.model.slice(0, 20)) console.log(`  truth=${m.truth}  pred=${m.pred}  | ${m.title}`);
    }
    if (errored.length) {
      console.log(`--- Errored (${errored.length}) ---`);
      for (const e of errored) console.log(`  ${e.error}  | ${e.title}`);
    }
  }

  const pass = scores.brand / total.brand >= 0.95
    && scores.type === total.type
    && scores.model / Math.max(total.model, 1) >= 0.90;
  console.log('');
  console.log(pass ? 'PASS — exit criteria met. Proceed to backfill + M3.' : 'FAIL — iterate the prompt and re-run.');
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error('[score] fatal:', e);
  process.exit(3);
});
