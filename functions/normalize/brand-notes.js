#!/usr/bin/env node
/**
 * Brand notes: one short paragraph of maker context per brand, for the
 * "About <brand> <tools>" section of every price-guide page.
 *
 * Why this exists: a guide page was all template copy and numbers. Nothing on
 * it said who Edward Preston & Sons were or what makes one of their planes
 * worth more than another. Search engines read that as a thin page and a
 * human reads it as a spreadsheet. This is the one paragraph per page that is
 * not derivable from listings.
 *
 * Guardrails, because a fabricated founding date on a public page is worse
 * than no paragraph:
 *   - the model is told to say only what it is confident about and to skip
 *     dates unless certain;
 *   - it grades its own confidence; 'high' is published automatically,
 *     'medium' only with --publish-medium, 'low' only with --publish-all.
 *     Unpublish any note with:  UPDATE brand_notes SET published = false
 *     WHERE canonical_brand = '...';
 *   - the prompt supplies the brand's tool types and a sample of real titles,
 *     so a maker the model has never heard of still gets a note grounded in
 *     what is actually on the site.
 *
 * Usage:
 *   node functions/normalize/brand-notes.js --dry-run --limit 5
 *   node functions/normalize/brand-notes.js --brand "Preston"
 *   node functions/normalize/brand-notes.js --limit 800 --max-cost 8 --publish-medium
 *
 * Reads ANTHROPIC_API_KEY from functions/.env and DATABASE_URL(_UNPOOLED)
 * from the environment (pass --env-file=web/.env.local locally).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

const DB = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!DB) { console.error('DATABASE_URL is not set'); process.exit(1); }

const MODEL = process.env.BENCHLOT_BRAND_NOTES_MODEL || 'claude-opus-5';
// $/MTok, Claude Opus 5 first-party rates.
const PRICE = { input: 5.0, output: 25.0, cacheWrite: 6.25, cacheRead: 0.5 };

const argv = process.argv.slice(2);
const num = (flag, dflt) => { const i = argv.indexOf(flag); return i >= 0 ? Number(argv[i + 1]) : dflt; };
const str = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
const LIMIT = num('--limit', 50);
const MAX_COST = num('--max-cost', 5);
const MIN_SOLD = num('--min-sold', 8);
const DRY_RUN = argv.includes('--dry-run');
const FORCE = argv.includes('--force');
const PUBLISH_ALL = argv.includes('--publish-all');
const PUBLISH_MEDIUM = argv.includes('--publish-medium');
const CONCURRENCY = num('--concurrency', 4);
const ONLY_BRAND = str('--brand');

const SYSTEM = `You write short maker notes for Benchlot, a price guide for used woodworking hand tools and machinery. Readers are buyers deciding whether a price is fair and owners wondering what a tool is worth.

Given a maker's name, the tool types Benchlot has recorded sales for, and a sample of real listing titles, write ONE paragraph of two to four plain sentences (40 to 80 words) covering, in this order:
1. Who the maker was or is: country and rough era, but ONLY if you are certain. Never give a founding year or date range unless you are certain of it. If you know nothing reliable about the maker, say nothing about their history.
2. What they are best known for among the tool types listed, and how the tools in the sample fit that.
3. What tends to make an example worth more or less: particular models or lines, materials, size, completeness, condition, original boxes or labels. Prefer specifics visible in the sample titles.

Rules:
- State facts you would stake a reputation on. If unsure, leave it out.
- No superlatives, no "collectors prize", no "highly sought after", no marketing tone.
- No hedging words such as "may", "might", "possibly", "likely".
- Do not mention prices, dollar figures, Benchlot, this note, or the sample.
- Do not repeat the maker's name more than twice.
- Plain sentences. No bullet points, no headings, no quotation marks around the whole thing.

Then grade your own confidence:
- "high": every claim is something you are certain of (or is taken directly from the sample titles).
- "medium": the note is sound but at least one claim about the maker's history is from memory and could be off.
- "low": you could not say anything reliable beyond what the sample titles show.

Respond with JSON only, no code fences: {"note": "...", "confidence": "high" | "medium" | "low"}`;

function userPrompt(b) {
  const types = b.types.map((t) => `${t.type} (${t.n})`).join(', ');
  const titles = b.titles.map((t) => `- ${t}`).join('\n');
  return `Maker: ${b.brand}\nTool types with recorded sales: ${types}\nSample listing titles:\n${titles}`;
}

function parseJson(text) {
  const s = text.replace(/```(?:json)?/g, '').trim();
  const a = s.indexOf('{'); const z = s.lastIndexOf('}');
  if (a < 0 || z < 0) throw new Error('no JSON object in reply');
  const obj = JSON.parse(s.slice(a, z + 1));
  if (typeof obj.note !== 'string' || !['high', 'medium', 'low'].includes(obj.confidence)) {
    throw new Error('reply missing note/confidence');
  }
  const note = obj.note.replace(/\s+/g, ' ').trim();
  const words = note.split(' ').length;
  // The prompt asks for 40-80 words; the model runs long for makers with a
  // deep history (Stanley, Disston, Record all came back at 110-130). The
  // cap is a sanity check against runaway output, not a style rule.
  if (words < 20 || words > 170) throw new Error(`note is ${words} words`);
  return { note, confidence: obj.confidence };
}

async function main() {
  const pool = new Pool({ connectionString: DB, max: 2 });
  const anthropic = new Anthropic.Anthropic();

  // Brands with at least one publishable cluster, richest first. Mirrors
  // PUBLISHABLE in web/lib/price-guide.ts.
  const params = [MIN_SOLD];
  let brandClause = '';
  if (ONLY_BRAND) { params.push(ONLY_BRAND); brandClause = ` AND canonical_brand = $2`; }
  const { rows: brands } = await pool.query(
    `WITH pub AS (
       SELECT canonical_brand, canonical_type, sold_count
       FROM price_stats
       WHERE grain = 'coarse' AND canonical_type IS NOT NULL AND canonical_type <> 'Other'
         AND canonical_brand IS NOT NULL AND canonical_brand <> 'Unknown'
         AND (sold_count >= $1 OR asking_count >= 10)${brandClause}
     )
     SELECT p.canonical_brand AS brand,
            jsonb_agg(jsonb_build_object('type', p.canonical_type, 'n', coalesce(p.sold_count, 0))
                      ORDER BY p.sold_count DESC NULLS LAST) AS types,
            sum(coalesce(p.sold_count, 0))::int AS total_sold
     FROM pub p
     LEFT JOIN brand_notes bn ON bn.canonical_brand = p.canonical_brand
     WHERE ${FORCE ? 'TRUE' : 'bn.canonical_brand IS NULL'}
     GROUP BY p.canonical_brand
     ORDER BY total_sold DESC
     LIMIT ${LIMIT}`,
    params
  );
  console.log(`${brands.length} brand(s) to write (model ${MODEL}, max $${MAX_COST}${DRY_RUN ? ', dry run' : ''})`);

  let cost = 0, n = 0;
  const tally = { high: 0, medium: 0, low: 0, failed: 0 };

  async function writeOne(b) {

  // Twelve titles spread across the brand's types, cleaned of stock numbers.
  const { rows: titles } = await pool.query(
    `SELECT DISTINCT ON (canonical_type, k) title_raw FROM (
     SELECT canonical_type, title_raw, row_number() OVER (PARTITION BY canonical_type ORDER BY random()) AS k
     FROM listings
     WHERE canonical_brand = $1 AND status = 'sold' AND canonical_type <> 'Other'
       AND NOT bl_is_lot(title_raw)
     ) t WHERE k <= 4 ORDER BY canonical_type, k LIMIT 12`,
    [b.brand]
  );
  b.titles = titles.map((t) =>
    t.title_raw.replace(/\s+/g, ' ').replace(/\s*[-–—=*]+\s*(EXCELSIOR\s+)?#?\d{4,6}[A-Z]{0,2}(\s*[-–—=]+\s*AS OF [A-Z]+\.?\s*\d{1,2})?\s*$/i, '').trim()
  );

  let res;
  try {
    res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    output_config: { effort: 'medium' },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt(b) }],
    });
  } catch (err) {
    tally.failed++;
    console.error(`  ${b.brand}: API error ${err.status ?? ''} ${err.message}`);
    if (err instanceof Anthropic.AuthenticationError) process.exit(1);
    return;
  }

  const u = res.usage;
  cost += (u.input_tokens * PRICE.input + u.output_tokens * PRICE.output
    + (u.cache_creation_input_tokens || 0) * PRICE.cacheWrite
    + (u.cache_read_input_tokens || 0) * PRICE.cacheRead) / 1e6;

  if (res.stop_reason === 'refusal') {
    tally.failed++;
    console.error(`  ${b.brand}: refusal (${res.stop_details?.category ?? '?'})`);
    return;
  }
  const text = res.content.filter((c) => c.type === 'text').map((c) => c.text).join('');
  let parsed;
  try { parsed = parseJson(text); } catch (e) {
    tally.failed++;
    console.error(`  ${b.brand}: bad reply (${e.message}): ${text.slice(0, 160)}`);
    return;
  }

  tally[parsed.confidence]++;
  n++;
  const publish = PUBLISH_ALL || parsed.confidence === 'high' || (PUBLISH_MEDIUM && parsed.confidence === 'medium');
  console.log(`  ${b.brand} [${parsed.confidence}${publish ? ', published' : ''}] ${parsed.note}`);

  if (!DRY_RUN) {
    await pool.query(
    `INSERT INTO brand_notes (canonical_brand, note, confidence, model, generated_at, published)
     VALUES ($1, $2, $3, $4, now(), $5)
     ON CONFLICT (canonical_brand) DO UPDATE
       SET note = EXCLUDED.note, confidence = EXCLUDED.confidence, model = EXCLUDED.model,
         generated_at = now(), published = EXCLUDED.published, reviewed_at = NULL`,
    [b.brand, parsed.note, parsed.confidence, MODEL, publish]
    );
  }
  }

  // Small worker pool: one brand at a time takes ~8s, and there are hundreds.
  let next = 0;
  async function worker() {
    while (next < brands.length) {
      if (cost >= MAX_COST) { console.log(`stopping: cost cap $${MAX_COST} reached`); return; }
      const b = brands[next++];
      await writeOne(b);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\n${n} note(s) written, $${cost.toFixed(3)} spent. high ${tally.high}, medium ${tally.medium}, low ${tally.low}, failed ${tally.failed}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
