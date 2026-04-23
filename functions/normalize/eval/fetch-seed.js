#!/usr/bin/env node
/**
 * Pulls ~50 diverse listings from `externalListings` and writes a starter
 * `ground_truth.seed.json` to this directory. Rob reviews the file, corrects
 * any heuristic mislabels, and renames/commits it as `ground_truth.json`.
 *
 * Diversity strategy: stratified sample across heuristic_type buckets so the
 * eval has coverage — 4 listings per type until we hit ~50, skewed toward
 * populated buckets.
 *
 * Usage:
 *   node functions/normalize/eval/fetch-seed.js
 *   node functions/normalize/eval/fetch-seed.js --size 50
 *   node functions/normalize/eval/fetch-seed.js --per-bucket 5
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

const EVAL_DIR = __dirname;
const OUTPUT_PATH = path.join(EVAL_DIR, 'ground_truth.seed.json');

function parseArgs(argv) {
  const args = { size: 50, perBucket: 4 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--size') args.size = Number(argv[++i]);
    else if (a.startsWith('--size=')) args.size = Number(a.slice('--size='.length));
    else if (a === '--per-bucket') args.perBucket = Number(argv[++i]);
    else if (a.startsWith('--per-bucket=')) args.perBucket = Number(a.slice('--per-bucket='.length));
  }
  return args;
}

function initAdmin() {
  if (admin.apps.length) return;
  const saPath = path.resolve(__dirname, '..', '..', 'service-account.json');
  try {
    admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
  } catch (e) {
    admin.initializeApp();
  }
}

async function sampleDiverse(db, perBucket, size) {
  const col = db.collection('externalListings');

  const allSnap = await col.where('source', '==', 'jimbode').get();
  const byBucket = new Map();
  for (const doc of allSnap.docs) {
    const data = doc.data();
    const bucket = data.heuristic_type || 'Other';
    if (!byBucket.has(bucket)) byBucket.set(bucket, []);
    byBucket.get(bucket).push({ id: doc.id, ...data });
  }

  // Shuffle each bucket (Fisher-Yates) for randomness across runs.
  for (const arr of byBucket.values()) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  const buckets = [...byBucket.entries()].sort((a, b) => b[1].length - a[1].length);
  const picked = [];

  // First pass: `perBucket` from each non-empty bucket.
  for (const [bucket, arr] of buckets) {
    const take = Math.min(perBucket, arr.length);
    picked.push(...arr.slice(0, take).map((d) => ({ ...d, _bucket: bucket })));
  }

  // Second pass: top up from largest buckets until we hit `size`.
  if (picked.length < size) {
    const pickedIds = new Set(picked.map((p) => p.id));
    for (const [bucket, arr] of buckets) {
      if (picked.length >= size) break;
      for (const item of arr) {
        if (picked.length >= size) break;
        if (!pickedIds.has(item.id)) {
          picked.push({ ...item, _bucket: bucket });
          pickedIds.add(item.id);
        }
      }
    }
  }

  return picked.slice(0, size);
}

function toSeed(doc) {
  return {
    doc_id: doc.id,
    source: doc.source,
    source_id: doc.source_id,
    title_raw: doc.title_raw,
    // ground-truth fields Rob fills in / corrects
    truth: {
      canonical_brand: doc.heuristic_brand || 'Unknown',
      canonical_type: mapHeuristicTypeToCanonical(doc.heuristic_type),
      canonical_model: null,
      canonical_size: null,
      era_estimate: null,
    },
    // kept for reference in the file — not scored
    _heuristic_brand: doc.heuristic_brand,
    _heuristic_type: doc.heuristic_type,
    _tags: doc.tags,
  };
}

/**
 * Best-effort bridge from the M1 heuristic_type buckets (from Python port) to
 * the M2 canonical_type closed list. Lets the seed file populate with a close-
 * enough first guess; Rob confirms/corrects.
 */
function mapHeuristicTypeToCanonical(h) {
  if (!h) return 'Other';
  const map = {
    'Bench Planes': 'Bench Plane',
    'Block Planes': 'Block Plane',
    'Router Planes': 'Router Plane',
    'Plow Planes': 'Plow Plane',
    'Rabbet Planes': 'Rabbet Plane',
    'Infill Planes': 'Infill Plane',
    'Chisels': 'Chisel',
    'Saws': 'Hand Saw',
    'Braces & Drills': 'Brace',
    'Axes & Adzes': 'Axe',
    'Shaping Tools': 'Spokeshave',
    'Measuring': 'Rule',
    'Hammers': 'Hammer',
    'Workholding': 'Clamp',
    'Knives': 'Knife',
    'Other': 'Other',
  };
  return map[h] || 'Other';
}

async function main() {
  const args = parseArgs(process.argv);
  initAdmin();
  const db = admin.firestore();

  console.log(`[fetch-seed] sampling up to ${args.size} listings, ${args.perBucket} per bucket...`);
  const docs = await sampleDiverse(db, args.perBucket, args.size);

  const seeded = docs.map(toSeed);
  const header = {
    README: [
      'This file seeds the normalizer eval. Each entry shows title_raw and a',
      'best-guess `truth` object (brand+type pre-filled from M1 heuristics,',
      'model/size/era null). Review each entry: correct truth.canonical_brand,',
      'truth.canonical_type to match the canonical vocabulary; fill in model,',
      'size, era where you know them (leave null when uncertain).',
      '',
      'When done: rename this file to `ground_truth.json` and commit it.',
      '',
      'Scoring gates: brand @ 95%, model @ 90% on this set. canonical_type is',
      'tracked and must be right on every entry (hard gate — drives alert',
      'match quality in M3).',
    ].join('\n'),
    generated_at: new Date().toISOString(),
    count: seeded.length,
    listings: seeded,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(header, null, 2), 'utf8');
  console.log(`[fetch-seed] wrote ${seeded.length} listings to ${OUTPUT_PATH}`);

  // Summary by bucket for quick visibility.
  const byBucket = seeded.reduce((acc, s) => {
    acc[s._heuristic_type || 'null'] = (acc[s._heuristic_type || 'null'] || 0) + 1;
    return acc;
  }, {});
  console.log('[fetch-seed] bucket distribution:');
  for (const [k, v] of Object.entries(byBucket).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(24)} ${v}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[fetch-seed] failed:', e);
    process.exit(1);
  });
