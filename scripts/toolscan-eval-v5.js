#!/usr/bin/env node

/**
 * ToolScan Eval Script — v5 (planes-first schema)
 *
 * Runs the curated Test Photos against the deployed v5 prompt and scores
 * predictions against ground_truth.csv. v5 emits a single `tool` object
 * with canonical_brand / canonical_type / canonical_model /
 * plane_type_number / era_estimate / confidence / condition (no
 * suggested_* / tools[] / tool_name fields — those are v4.1).
 *
 * Scoring:
 *   - canonical_type accuracy (via TYPE_BRIDGE: ground-truth tool_type
 *     collapses to v5's closed list, e.g. "Smoothing Plane" → "Bench Plane")
 *   - canonical_brand accuracy (substring match, case-insensitive)
 *   - canonical_model accuracy (normalized — "No. 5" / "no 5" / "#5" all match)
 *   - plane_type_number accuracy (exact match; ground truth extracted from
 *     era string like "Type 11" via regex)
 *
 * Reports overall + plane-subset numbers separately, plus per-type breakdown.
 *
 * Usage:
 *   node scripts/toolscan-eval-v5.js                    # Run all photos
 *   node scripts/toolscan-eval-v5.js --planes-only      # Just plane photos (matches v5 scope)
 *   node scripts/toolscan-eval-v5.js --limit 5
 *   node scripts/toolscan-eval-v5.js --filter stanley
 *   node scripts/toolscan-eval-v5.js --resume           # Skip already-evaluated
 *
 * Requires ANTHROPIC_API_KEY in functions/.env.
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Load env from functions/.env
const envPath = path.join(__dirname, '..', 'functions', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const Anthropic = require('@anthropic-ai/sdk');
const { TOOLSCAN_SYSTEM_PROMPT } = require('../functions/toolscan-prompt');

const TEST_PHOTOS_DIR = path.join(__dirname, '..', 'Test Photos');
const RESULTS_FILE = path.join(TEST_PHOTOS_DIR, 'eval_results_v5.json');

// ─── CLI args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const LIMIT = getArg('--limit') ? parseInt(getArg('--limit'), 10) : null;
const FILTER = getArg('--filter');
const RESUME = hasFlag('--resume');
const PLANES_ONLY = hasFlag('--planes-only');

// ─── Bridges (mirror scripts/training-data/import-curated-photos.js) ────────

// CSV tool_type → v5 closed list canonical_type. Unknown → 'Other'.
const TYPE_BRIDGE = {
  // Bench planes — v5 collapses
  'smoothing plane': 'Bench Plane',
  'jack plane': 'Bench Plane',
  'jointer plane': 'Bench Plane',
  'fore plane': 'Bench Plane',
  'bench plane': 'Bench Plane',
  'low angle jack plane': 'Bench Plane',
  'low-angle jack plane': 'Bench Plane',
  'junior jack plane': 'Bench Plane',
  // Block planes
  'block plane': 'Block Plane',
  'low angle block plane': 'Block Plane',
  // Specialty planes
  'shoulder plane': 'Shoulder Plane',
  'shoulder/bullnose plane': 'Shoulder Plane',
  'router plane': 'Router Plane',
  'plow plane': 'Plow Plane',
  'rabbet plane': 'Rabbet Plane',
  'wooden molding plane': 'Moulding Plane',
  'moulding plane': 'Moulding Plane',
  'molding plane': 'Moulding Plane',
  'combination plane': 'Combination Plane',
  'tongue and groove plane': 'Combination Plane',
  'tongue & groove plane': 'Combination Plane',
  'scrub plane': 'Scrub Plane',
  'spokeshave': 'Spokeshave',
  // Non-plane categories (v5 returns "Other" on these — expected behaviour)
  'bench chisel': 'Chisel',
  'bench chisel set': 'Chisel',
  'chisel set': 'Chisel',
  'chisel lot': 'Chisel',
  'japanese chisel': 'Chisel',
  'mortise chisel': 'Chisel',
  'paring chisel': 'Chisel',
  'firmer chisel': 'Chisel',
  'carving gouge': 'Gouge',
  'carving gouge set': 'Gouge',
  'drawknife': 'Drawknife',
  'card scraper': 'Card Scraper',
  'card scraper set': 'Card Scraper',
  'cabinet scraper': 'Cabinet Scraper',
  'marking knife': 'Knife',
  'handsaw': 'Hand Saw',
  'japanese pull saw': 'Japanese Saw',
  'tenon saw': 'Back Saw',
  'dovetail saw': 'Back Saw',
  'coping saw': 'Coping Saw',
  'fret saw': 'Coping Saw',
  'frame saw': 'Frame Saw',
  'brace': 'Brace',
  'brace (hand drill)': 'Brace',
  'ratchet brace': 'Brace',
  'hand drill': 'Eggbeater Drill',
  'adze': 'Adze',
  'hand adze': 'Adze',
  'marking gauge': 'Marking Gauge',
  'wheel marking gauge': 'Marking Gauge',
  'combination square': 'Square',
  'combination square set': 'Square',
  'sliding t-bevel': 'Bevel Gauge',
  'dividers': 'Caliper',
  'wing dividers': 'Caliper',
  'spring calipers': 'Caliper',
  'holdfast': 'Holdfast',
  'bench hook': 'Vise',
  'bench vise': 'Vise',
  'woodworking vise': 'Vise',
  'moxon vise': 'Vise',
  'handscrew clamp': 'Clamp',
  'pipe clamp': 'Clamp',
  'bar clamp': 'Clamp',
  'bandsaw': 'Band Saw',
  'table saw': 'Table Saw',
  'thickness planer': 'Thickness Planer',
  'track saw': 'Track Saw',
  'router': 'Router',
  'drill press': 'Drill Press',
};

const PLANE_TYPES = new Set([
  'Bench Plane', 'Block Plane', 'Shoulder Plane', 'Router Plane',
  'Plow Plane', 'Rabbet Plane', 'Moulding Plane', 'Infill Plane',
  'Scrub Plane', 'Combination Plane', 'Chisel Plane', 'Hawk Plane',
  'Spokeshave',
]);

function normalizeType(rawToolType) {
  if (!rawToolType) return 'Other';
  const key = String(rawToolType).trim().toLowerCase();
  return TYPE_BRIDGE[key] || 'Other';
}

function normalizeModel(raw) {
  if (!raw) return '';
  return String(raw)
    .toLowerCase()
    .replace(/^no\.?\s*/i, '')
    .replace(/^#/, '')
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '');
}

function extractGtPlaneTypeNumber(era, model, brand) {
  if (!brand || !/^stanley/i.test(brand)) return null;
  const candidates = [era, model].filter(Boolean).map(String);
  for (const s of candidates) {
    const m = s.match(/type[\s-]*(\d{1,2})/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 20) return n;
    }
  }
  return null;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY not found in functions/.env or environment.');
    process.exit(1);
  }
  const anthropic = new Anthropic({ apiKey });

  const csvPath = path.join(TEST_PHOTOS_DIR, 'ground_truth.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('ERROR: ground_truth.csv not found.');
    process.exit(1);
  }
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });

  let testCases = records.filter((r) => fs.existsSync(path.join(TEST_PHOTOS_DIR, r.filename)));
  console.log(`Found ${testCases.length} test photos with ground truth on disk.\n`);

  if (PLANES_ONLY) {
    testCases = testCases.filter((r) => PLANE_TYPES.has(normalizeType(r.tool_type)));
    console.log(`Filtered to ${testCases.length} plane photos (v5 in-scope).\n`);
  }

  if (FILTER) {
    testCases = testCases.filter((r) => r.filename.toLowerCase().includes(FILTER.toLowerCase()));
    console.log(`Filtered to ${testCases.length} matching "${FILTER}".\n`);
  }

  let existingResults = {};
  if (RESUME && fs.existsSync(RESULTS_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
      for (const r of existing.results) existingResults[r.filename] = r;
      console.log(`Loaded ${Object.keys(existingResults).length} existing results for resume.\n`);
    } catch (e) {
      console.warn('Warning: could not parse existing v5 results file — starting fresh.');
    }
  }
  if (RESUME) {
    testCases = testCases.filter((r) => !existingResults[r.filename]);
    console.log(`${testCases.length} remaining after resume filter.\n`);
  }
  if (LIMIT) {
    testCases = testCases.slice(0, LIMIT);
    console.log(`Limited to ${testCases.length} photos.\n`);
  }
  if (testCases.length === 0) {
    console.log('No photos to evaluate.');
    process.exit(0);
  }

  const results = [];
  let completed = 0;

  for (const tc of testCases) {
    completed++;
    const imgPath = path.join(TEST_PHOTOS_DIR, tc.filename);
    const imgData = fs.readFileSync(imgPath);
    const base64 = imgData.toString('base64');
    const ext = path.extname(tc.filename).toLowerCase();
    const mediaType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

    process.stdout.write(`[${completed}/${testCases.length}] ${tc.filename.padEnd(50)} ... `);

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0,
        system: TOOLSCAN_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: 'Identify the tool in this image.' },
          ],
        }],
      });

      const responseText = message.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');

      let parsed;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch (e) {
        parsed = null;
      }

      const tool = parsed?.tool || null;

      const gtTypeCanonical = normalizeType(tc.tool_type);
      const gtPlaneTypeNumber = extractGtPlaneTypeNumber(tc.era, tc.model, tc.maker);

      const result = {
        filename: tc.filename,
        ground_truth: {
          tool_type_raw: tc.tool_type,
          canonical_type: gtTypeCanonical,
          maker: tc.maker,
          model: tc.model,
          era: tc.era,
          plane_type_number: gtPlaneTypeNumber,
        },
        ai_result: tool ? {
          canonical_brand: tool.canonical_brand,
          canonical_type: tool.canonical_type,
          canonical_model: tool.canonical_model,
          plane_type_number: Number.isInteger(tool.plane_type_number) ? tool.plane_type_number : null,
          era_estimate: tool.era_estimate,
          condition: tool.condition,
          confidence: tool.confidence,
          confidence_reasoning: tool.confidence_reasoning,
          next_photo_hint: tool.next_photo_hint,
        } : { error: 'No tool object in response', raw: responseText.substring(0, 200) },
        usage: {
          input_tokens: message.usage?.input_tokens || 0,
          output_tokens: message.usage?.output_tokens || 0,
        },
      };
      results.push(result);

      if (tool) {
        const parts = [tool.canonical_brand, tool.canonical_model].filter(Boolean).join(' ');
        const tn = Number.isInteger(tool.plane_type_number) ? ` · T${tool.plane_type_number}` : '';
        console.log(`${(parts + tn).padEnd(35)} | ${(tool.canonical_type || '?').padEnd(18)} | ${tool.confidence || '?'}`);
      } else {
        console.log('NO TOOL OBJECT');
      }
    } catch (error) {
      console.log(`ERROR — ${error.message}`);
      results.push({
        filename: tc.filename,
        ground_truth: {
          tool_type_raw: tc.tool_type,
          canonical_type: normalizeType(tc.tool_type),
          maker: tc.maker,
          model: tc.model,
          era: tc.era,
          plane_type_number: extractGtPlaneTypeNumber(tc.era, tc.model, tc.maker),
        },
        ai_result: { error: error.message },
        usage: { input_tokens: 0, output_tokens: 0 },
      });
    }

    // small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  const allResults = [...Object.values(existingResults), ...results];

  const output = {
    timestamp: new Date().toISOString(),
    prompt_version: 'v5',
    model: 'claude-sonnet-4-20250514',
    total_evaluated: allResults.length,
    planes_only_filter: PLANES_ONLY,
    results: allResults,
  };
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to: ${RESULTS_FILE}\n`);

  // ─── Scoring ────────────────────────────────────────────────────────────
  const scored = allResults.filter((r) => !r.ai_result.error);
  const errorCount = allResults.length - scored.length;

  let typeCorrect = 0, brandCorrect = 0, modelCorrect = 0, planeTypeCorrect = 0;
  let planeTypeApplicable = 0;
  const byTypeStats = {};
  const planeOnly = scored.filter((r) => PLANE_TYPES.has(r.ground_truth.canonical_type));

  function scoreOne(r) {
    const gt = r.ground_truth;
    const ai = r.ai_result;

    const typeMatch = (ai.canonical_type || '').toLowerCase() === (gt.canonical_type || '').toLowerCase();

    const gtBrand = (gt.maker || '').trim().toLowerCase();
    const aiBrand = (ai.canonical_brand || '').trim().toLowerCase();
    const brandMatch = gtBrand && aiBrand && (
      aiBrand === gtBrand ||
      aiBrand.includes(gtBrand) ||
      gtBrand.includes(aiBrand) ||
      // "Stanley-Bailey" / "Stanley Bedrock" collapse onto "Stanley"
      (gtBrand === 'stanley' && aiBrand.startsWith('stanley'))
    );

    const gtModel = normalizeModel(gt.model);
    const aiModel = normalizeModel(ai.canonical_model);
    const modelMatch = gtModel && aiModel && (gtModel === aiModel);

    return { typeMatch, brandMatch, modelMatch };
  }

  for (const r of scored) {
    const { typeMatch, brandMatch, modelMatch } = scoreOne(r);
    if (typeMatch) typeCorrect++;
    if (brandMatch) brandCorrect++;
    if (modelMatch) modelCorrect++;

    if (Number.isInteger(r.ground_truth.plane_type_number)) {
      planeTypeApplicable++;
      if (r.ai_result.plane_type_number === r.ground_truth.plane_type_number) planeTypeCorrect++;
    }

    const t = r.ground_truth.canonical_type;
    if (!byTypeStats[t]) byTypeStats[t] = { n: 0, type: 0, brand: 0, model: 0 };
    byTypeStats[t].n++;
    if (typeMatch) byTypeStats[t].type++;
    if (brandMatch) byTypeStats[t].brand++;
    if (modelMatch) byTypeStats[t].model++;
  }

  let planeTypeCorrectPO = 0, brandCorrectPO = 0, modelCorrectPO = 0, typeCorrectPO = 0;
  for (const r of planeOnly) {
    const { typeMatch, brandMatch, modelMatch } = scoreOne(r);
    if (typeMatch) typeCorrectPO++;
    if (brandMatch) brandCorrectPO++;
    if (modelMatch) modelCorrectPO++;
  }

  const pct = (n, d) => d === 0 ? '—' : `${((n / d) * 100).toFixed(1)}%`;

  console.log('='.repeat(80));
  console.log(`PROMPT: v5  |  MODEL: claude-sonnet-4-20250514  |  N total: ${allResults.length}`);
  console.log(`Errors / failed parse: ${errorCount}`);
  console.log('='.repeat(80));

  console.log('\nOverall (all categories, including non-plane → "Other"):');
  console.log(`  canonical_type:       ${typeCorrect}/${scored.length} (${pct(typeCorrect, scored.length)})`);
  console.log(`  canonical_brand:      ${brandCorrect}/${scored.length} (${pct(brandCorrect, scored.length)})`);
  console.log(`  canonical_model:      ${modelCorrect}/${scored.length} (${pct(modelCorrect, scored.length)})`);
  console.log(`  plane_type_number:    ${planeTypeCorrect}/${planeTypeApplicable} applicable (${pct(planeTypeCorrect, planeTypeApplicable)})`);

  console.log(`\nPlane-only subset (v5 in-scope; N=${planeOnly.length}):`);
  console.log(`  canonical_type:       ${typeCorrectPO}/${planeOnly.length} (${pct(typeCorrectPO, planeOnly.length)})`);
  console.log(`  canonical_brand:      ${brandCorrectPO}/${planeOnly.length} (${pct(brandCorrectPO, planeOnly.length)})`);
  console.log(`  canonical_model:      ${modelCorrectPO}/${planeOnly.length} (${pct(modelCorrectPO, planeOnly.length)})`);

  console.log('\nBy canonical_type (sorted by N):');
  const sortedTypes = Object.entries(byTypeStats).sort((a, b) => b[1].n - a[1].n);
  for (const [type, s] of sortedTypes) {
    console.log(`  ${type.padEnd(22)} N=${String(s.n).padStart(3)}  type=${pct(s.type, s.n).padStart(6)}  brand=${pct(s.brand, s.n).padStart(6)}  model=${pct(s.model, s.n).padStart(6)}`);
  }

  const totalInput = allResults.reduce((s, r) => s + (r.usage?.input_tokens || 0), 0);
  const totalOutput = allResults.reduce((s, r) => s + (r.usage?.output_tokens || 0), 0);
  console.log(`\nTokens: ${totalInput.toLocaleString()} input, ${totalOutput.toLocaleString()} output`);
  console.log(`Estimated cost: ~$${((totalInput * 0.003 + totalOutput * 0.015) / 1000).toFixed(2)}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
