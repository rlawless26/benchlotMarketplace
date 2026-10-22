#!/usr/bin/env node
/**
 * Precision check for a candidate normalizer model.
 *
 * Takes N listings the current model already normalized, asks the candidate
 * model the same question with the SAME request params (buildRequestParams),
 * and reports where the two disagree on canonical_type and canonical_brand.
 * Writes nothing. Costs N calls on the candidate model.
 *
 *   node scripts/normalizer-model-compare.js --model claude-haiku-5-5 --n 50
 *
 * Read the disagreements by hand: the candidate is sometimes the one that is
 * right. What matters is the rate, and which way the errors run (a model that
 * downgrades specific types to "Other" is worse than one that argues about
 * brands' preferred spellings).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'functions', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'web', '.env.local') });
const fnode = (m) => require(path.join(__dirname, '..', 'functions', 'node_modules', m));
const { Pool } = fnode('pg');
const Anthropic = fnode('@anthropic-ai/sdk');
const { buildRequestParams, parseClassification } = require('../functions/normalize/normalizer');
const { canonicalizeBrand } = require('../functions/normalize/vocabulary');

const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const MODEL = arg('--model', 'claude-haiku-5-5');
const N = Number(arg('--n', 50));
const DB = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

(async () => {
  const pool = new Pool({ connectionString: DB, max: 2 });
  const client = new Anthropic.Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { rows } = await pool.query(
    `SELECT id, source, title_raw, description_raw, tags, heuristic_brand, heuristic_type,
            canonical_type, canonical_brand, canonical_model, normalizer_model
       FROM listings
      WHERE canonical_type IS NOT NULL AND canonical_type_source = 'llm'
        AND normalizer_model LIKE 'claude-haiku-4-5%'
        AND status <> 'excluded_non_tool'
      ORDER BY random() LIMIT $1`, [N]
  );
  await pool.end();

  let typeAgree = 0, brandAgree = 0, otherDowngrades = 0, errors = 0;
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  const diffs = [];
  for (const r of rows) {
    let c;
    try {
      const msg = await client.messages.create(buildRequestParams(r, MODEL));
      c = parseClassification(msg, MODEL);
    } catch (e) {
      errors++;
      console.error(`  ${r.title_raw.slice(0, 60)} — ${e.status || ''} ${e.message}`);
      if (e.status && e.status >= 400 && e.status < 500) { console.error('request shape rejected; fix modelExtras() in normalizer.js'); process.exit(1); }
      continue;
    }
    for (const k of Object.keys(usage)) usage[k] += c.usage[k] || 0;
    const sameType = c.canonical_type === r.canonical_type;
    const sameBrand = canonicalizeBrand(c.canonical_brand) === r.canonical_brand;
    if (sameType) typeAgree++;
    if (sameBrand) brandAgree++;
    if (!sameType && c.canonical_type === 'Other') otherDowngrades++;
    if (!sameType || !sameBrand) {
      diffs.push({ title: r.title_raw.slice(0, 70), current: `${r.canonical_brand} / ${r.canonical_type}`, candidate: `${canonicalizeBrand(c.canonical_brand)} / ${c.canonical_type}` });
    }
  }
  const n = rows.length - errors;
  console.log(`\n${MODEL} vs ${rows[0]?.normalizer_model} on ${n} titles`);
  console.log(`  type agreement  ${typeAgree}/${n} (${(100 * typeAgree / n).toFixed(0)}%)   downgraded to Other: ${otherDowngrades}`);
  console.log(`  brand agreement ${brandAgree}/${n} (${(100 * brandAgree / n).toFixed(0)}%)`);
  console.log(`  tokens ${JSON.stringify(usage)}`);
  if (diffs.length) { console.log('\n  disagreements'); console.table(diffs); }
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
