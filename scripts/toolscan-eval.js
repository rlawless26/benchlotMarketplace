#!/usr/bin/env node

/**
 * ToolScan Eval Script
 *
 * Runs test photos through the ToolScan system prompt and compares
 * results against ground truth. Outputs a results table and accuracy metrics.
 *
 * Usage:
 *   node scripts/toolscan-eval.js                    # Run all photos
 *   node scripts/toolscan-eval.js --limit 5          # Run first 5 only
 *   node scripts/toolscan-eval.js --filter "stanley"  # Run only matching filenames
 *   node scripts/toolscan-eval.js --resume            # Skip already-evaluated photos
 *
 * Requires ANTHROPIC_API_KEY in functions/.env or as an environment variable.
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
const RESULTS_FILE = path.join(TEST_PHOTOS_DIR, 'eval_results.json');

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const LIMIT = getArg('--limit') ? parseInt(getArg('--limit')) : null;
const FILTER = getArg('--filter');
const RESUME = hasFlag('--resume');

async function main() {
  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY not found. Set it in functions/.env or as an env var.');
    process.exit(1);
  }

  const anthropic = new Anthropic({ apiKey });

  // Load ground truth CSV
  const csvPath = path.join(TEST_PHOTOS_DIR, 'ground_truth.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('ERROR: ground_truth.csv not found in Test Photos directory.');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });

  // Filter to only photos that exist on disk
  let testCases = records.filter((r) => {
    const imgPath = path.join(TEST_PHOTOS_DIR, r.filename);
    return fs.existsSync(imgPath);
  });

  console.log(`Found ${testCases.length} test photos with ground truth on disk.\n`);

  // Apply filters
  if (FILTER) {
    testCases = testCases.filter((r) => r.filename.toLowerCase().includes(FILTER.toLowerCase()));
    console.log(`Filtered to ${testCases.length} photos matching "${FILTER}".\n`);
  }

  // Load existing results for resume
  let existingResults = {};
  if (RESUME && fs.existsSync(RESULTS_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
      for (const r of existing.results) {
        existingResults[r.filename] = r;
      }
      console.log(`Loaded ${Object.keys(existingResults).length} existing results for resume.\n`);
    } catch (e) {
      console.error('Warning: could not parse existing results file, starting fresh.');
    }
  }

  if (RESUME) {
    testCases = testCases.filter((r) => !existingResults[r.filename]);
    console.log(`${testCases.length} photos remaining after resume filter.\n`);
  }

  if (LIMIT) {
    testCases = testCases.slice(0, LIMIT);
    console.log(`Limited to ${testCases.length} photos.\n`);
  }

  if (testCases.length === 0) {
    console.log('No photos to evaluate. Done.');
    process.exit(0);
  }

  // Run evaluations
  const results = [];
  let completed = 0;

  for (const testCase of testCases) {
    completed++;
    const imgPath = path.join(TEST_PHOTOS_DIR, testCase.filename);
    const imgData = fs.readFileSync(imgPath);
    const base64 = imgData.toString('base64');
    const ext = path.extname(testCase.filename).toLowerCase();
    const mediaType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

    process.stdout.write(`[${completed}/${testCases.length}] ${testCase.filename} ... `);

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0,
        system: TOOLSCAN_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 },
              },
              {
                type: 'text',
                text: 'Identify all hand tools visible in the image and generate listing details.',
              },
            ],
          },
        ],
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

      const tool = parsed?.tools?.[0] || null;

      const result = {
        filename: testCase.filename,
        ground_truth: {
          tool_type: testCase.tool_type,
          maker: testCase.maker,
          model: testCase.model,
          era: testCase.era,
        },
        ai_result: tool
          ? {
              tool_name: tool.tool_name,
              maker: tool.maker,
              model: tool.model,
              era: tool.era,
              confidence: tool.confidence,
              suggested_title: tool.suggested_title,
              suggested_price_low: tool.suggested_price_low,
              suggested_price_high: tool.suggested_price_high,
              suggested_category: tool.suggested_category,
              suggested_subcategory: tool.suggested_subcategory,
            }
          : { error: 'No tool identified', raw: responseText.substring(0, 200) },
        usage: {
          input_tokens: message.usage?.input_tokens || 0,
          output_tokens: message.usage?.output_tokens || 0,
        },
      };

      results.push(result);

      // Print summary line
      if (tool) {
        console.log(
          `${tool.tool_name} | ${tool.maker} | ${tool.model || '?'} | ${tool.confidence} | $${tool.suggested_price_low}-$${tool.suggested_price_high}`
        );
      } else {
        console.log('FAILED — no tool identified');
      }
    } catch (error) {
      console.log(`ERROR — ${error.message}`);
      results.push({
        filename: testCase.filename,
        ground_truth: {
          tool_type: testCase.tool_type,
          maker: testCase.maker,
          model: testCase.model,
          era: testCase.era,
        },
        ai_result: { error: error.message },
        usage: { input_tokens: 0, output_tokens: 0 },
      });
    }

    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  // Merge with existing results if resuming
  const allResults = [...Object.values(existingResults), ...results];

  // Save results
  const output = {
    timestamp: new Date().toISOString(),
    prompt_version: 'v3.3', // Bump this when you change the prompt
    model: 'claude-sonnet-4-20250514',
    total_evaluated: allResults.length,
    results: allResults,
  };

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to: ${RESULTS_FILE}`);

  // Print summary table
  console.log('\n' + '='.repeat(120));
  console.log('RESULTS SUMMARY');
  console.log('='.repeat(120));
  console.log(
    padRight('Filename', 40) +
      padRight('Expected', 25) +
      padRight('Got', 25) +
      padRight('Conf', 8) +
      padRight('Price', 15) +
      'Match?'
  );
  console.log('-'.repeat(120));

  let typeCorrect = 0;
  let makerCorrect = 0;
  let total = 0;

  for (const r of allResults) {
    if (r.ai_result.error) {
      console.log(padRight(r.filename, 40) + padRight(r.ground_truth.tool_type, 25) + 'ERROR');
      total++;
      continue;
    }

    const expectedType = r.ground_truth.tool_type.toLowerCase();
    const gotType = (r.ai_result.tool_name || '').toLowerCase();
    const typeMatch = gotType.includes(expectedType) || expectedType.includes(gotType) ||
      fuzzyTypeMatch(expectedType, gotType);

    const expectedMaker = r.ground_truth.maker.toLowerCase();
    const gotMaker = (r.ai_result.maker || '').toLowerCase();
    const makerMatch = gotMaker.includes(expectedMaker) || expectedMaker.includes(gotMaker);

    if (typeMatch) typeCorrect++;
    if (makerMatch) makerCorrect++;
    total++;

    const matchStr =
      (typeMatch ? '✓' : '✗') + 'type ' + (makerMatch ? '✓' : '✗') + 'maker';

    console.log(
      padRight(r.filename, 40) +
        padRight(`${r.ground_truth.tool_type} / ${r.ground_truth.maker}`, 25) +
        padRight(`${r.ai_result.tool_name || '?'} / ${r.ai_result.maker || '?'}`, 25) +
        padRight(r.ai_result.confidence || '?', 8) +
        padRight(
          r.ai_result.suggested_price_low != null
            ? `$${r.ai_result.suggested_price_low}-$${r.ai_result.suggested_price_high}`
            : '?',
          15
        ) +
        matchStr
    );
  }

  console.log('-'.repeat(120));
  console.log(`\nTool type accuracy: ${typeCorrect}/${total} (${((typeCorrect / total) * 100).toFixed(1)}%)`);
  console.log(`Maker accuracy:     ${makerCorrect}/${total} (${((makerCorrect / total) * 100).toFixed(1)}%)`);
  console.log(`\nTarget: 80%+ tool type, 60%+ maker`);

  // Token usage
  const totalInput = allResults.reduce((s, r) => s + (r.usage?.input_tokens || 0), 0);
  const totalOutput = allResults.reduce((s, r) => s + (r.usage?.output_tokens || 0), 0);
  console.log(`\nTokens used: ${totalInput.toLocaleString()} input, ${totalOutput.toLocaleString()} output`);
  console.log(
    `Estimated cost: ~$${((totalInput * 0.003 + totalOutput * 0.015) / 1000).toFixed(2)}`
  );
}

function padRight(str, len) {
  str = String(str || '');
  if (str.length > len - 1) str = str.substring(0, len - 2) + '…';
  return str + ' '.repeat(Math.max(0, len - str.length));
}

function fuzzyTypeMatch(expected, got) {
  // Handle common synonyms
  const synonyms = {
    'smoothing plane': ['smooth plane', 'no. 4', 'no. 3', 'smoother'],
    'jack plane': ['no. 5', 'jack'],
    'bench plane': ['smoothing plane', 'jack plane', 'fore plane', 'jointer plane', 'wooden jack plane', 'block plane'],
    'fore plane': ['no. 6', 'fore', 'jointer plane'],
    'jointer plane': ['no. 7', 'no. 8', 'jointer', 'try plane'],
    'low angle block plane': ['block plane', 'low-angle block', 'low-angle block plane'],
    'block plane': ['low angle block plane', 'low-angle block'],
    'handsaw': ['hand saw', 'panel saw', 'crosscut saw', 'rip saw'],
    'router plane': ['router'],
    'rabbet plane': ['rebate plane', 'rabbet', 'duplex rabbet plane', 'duplex rabbet'],
    'shoulder plane': ['bullnose plane', 'chisel plane', 'shoulder/bullnose plane'],
    'shoulder/bullnose plane': ['shoulder plane', 'bullnose plane'],
    'plow/combination plane': ['plow plane', 'combination plane', 'plough plane', 'stanley no. 45', 'stanley #45'],
    'combination plane': ['plow plane', 'plow/combination plane'],
    'scrub plane': ['scrub'],
    'tongue & groove plane': ['match plane', 'tongue and groove'],
    'bench chisel': ['bevel-edge chisel', 'firmer chisel', 'bevel edge chisel'],
    'bench chisel set': ['chisel set', 'bench chisels', 'bench chisel'],
    'mortise chisel': ['mortise'],
    'paring chisel': ['paring', 'bench chisel'],
    'firmer chisel': ['bench chisel', 'firmer'],
    'japanese chisel': ['oire nomi', 'tataki nomi', 'nomi'],
    'carving gouge': ['carving chisel', 'gouge', 'carving gouge'],
    'carving gouge set': ['carving chisel set', 'carving set', 'gouge set', 'carving chisel/gouge set'],
    'carving chisel/gouge set': ['carving gouge set', 'carving set', 'gouge set', 'carving chisel set'],
    'dovetail saw': ['dovetail', 'brass-back saw'],
    'tenon saw': ['tenon', 'backsaw', 'back saw', 'panel saw'],
    'coping saw': ['coping'],
    'fret saw': ['fret', 'jeweler saw', 'coping saw'],
    'frame/bow saw': ['frame saw', 'bow saw', 'turning saw'],
    'frame saw': ['bow saw', 'frame/bow saw', 'turning saw'],
    'japanese pull saw': ['pull saw', 'ryoba', 'dozuki', 'japanese hand saw', 'japanese ryoba', 'japanese dozuki', 'japanese pull saw (ryoba)', 'japanese pull saw (dozuki)', 'japanese dozuki saw'],
    'spokeshave': ['spoke shave', 'flat spokeshave'],
    'spokeshave (round)': ['spokeshave', 'round spokeshave', 'concave spokeshave'],
    'drawknife': ['draw knife', 'drawing knife'],
    'cabinet scraper': ['no. 80 scraper', 'stanley no. 80'],
    'brace (hand drill)': ['brace', 'hand brace', 'ratchet brace', 'ratchet brace'],
    'ratchet brace': ['brace', 'hand brace', 'brace (hand drill)'],
    'hand drill (eggbeater)': ['eggbeater drill', 'hand drill', 'breast drill'],
    'low angle jack plane': ['low-angle jack plane', 'low angle jack', 'bevel-up jack', 'low-angle jack'],
    'combination square': ['combo square'],
    'combination square set': ['combination square'],
    'marking gauge': ['mortise gauge', 'butt gauge', 'panel gauge', 'wheel gauge'],
    'marking gauge (wheel)': ['marking gauge', 'wheel marking gauge'],
    'marking knife': ['striking knife', 'layout knife'],
    'sliding t-bevel': ['sliding bevel', 't-bevel', 'bevel gauge'],
    'dividers': ['wing dividers', 'divider'],
    'calipers': ['spring calipers', 'caliper'],
    'junior jack plane': ['jack plane', 'smoothing plane'],
    'card scraper': ['scraper', 'cabinet scraper'],
    'card scraper set': ['scraper set', 'card scraper'],
    'wooden molding plane': ['molding plane', 'moulding plane', 'hollow', 'round'],
    'sharpening stone': ['oilstone', 'waterstone', 'arkansas stone', 'whetstone', 'arkansas oilstone'],
    'diamond sharpening plate': ['diamond plate', 'diamond stone', 'dmt', 'sharpening stone', 'sharpening plate'],
    'diamond plate': ['diamond stone', 'dmt', 'sharpening stone', 'diamond sharpening plate'],
    'honing guide': ['sharpening jig', 'honing jig'],
    'strop': ['leather strop', 'paddle strop', 'leather paddle strop'],
    'leather strop': ['strop', 'paddle strop', 'leather paddle strop'],
    'vise': ['vice', 'face vise', 'tail vise', 'leg vise'],
    'vise (moxon)': ['moxon vise', 'twin-screw vise', 'moxon', 'wooden screw clamp', 'hand screw'],
    'moxon vise hardware': ['moxon vise', 'wooden vise screws', 'vise screws', 'wooden screw', 'moxon'],
    'moxon vise': ['vise (moxon)', 'twin-screw vise', 'wooden screw clamp'],
    'bench vise': ['vise', 'face vise', 'record vise'],
    'holdfast': ['hold fast'],
    'clamp (hand screw)': ['handscrew', 'hand screw clamp', 'wooden clamp', 'hand screw'],
    'handscrew clamp': ['hand screw clamp', 'handscrew', 'clamp (hand screw)', 'wooden screw clamp'],
    'clamp (bar/pipe)': ['bar clamp', 'pipe clamp'],
    'bench hook': ['shooting board', 'bench hook'],
    'adze': ['hand adze', 'carpenter adze'],
    'forstner bit set': ['forstner bits', 'forstner'],
    'spade bit set': ['spade bits', 'paddle bits'],
  };

  const expectedSynonyms = synonyms[expected] || [];
  const gotSynonyms = synonyms[got] || [];

  for (const syn of expectedSynonyms) {
    if (got.includes(syn)) return true;
  }
  for (const syn of gotSynonyms) {
    if (expected.includes(syn)) return true;
  }
  return false;
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
