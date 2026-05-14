#!/usr/bin/env node

/**
 * Export a filtered slice of `training_examples` to JSONL on stdout, ready to
 * feed into a vision-training pipeline (HuggingFace Datasets, Vertex AI,
 * etc.). One row per line, schema:
 *
 *   { image_gcs_uri, image_path, source, canonical_brand, canonical_type,
 *     canonical_model, canonical_size, plane_type_number, era_estimate,
 *     condition, label_provenance, label_confidence, cluster_key }
 *
 * Filters (all optional):
 *   --provenance <comma-separated>     curated|normalizer|user_correction
 *   --canonical-type <comma-separated> e.g. "Bench Plane,Block Plane"
 *   --min-confidence <level>           high|medium  (default: medium)
 *   --max-per-cluster <N>              cap pairs per cluster_key
 *   --include-uri                      emit gs://<bucket>/<path> URIs (default on)
 *   --signed-urls                      emit https signed URLs (24h expiry)
 *
 * Examples:
 *   node scripts/training-data/export-jsonl.js > all.jsonl
 *   node scripts/training-data/export-jsonl.js --canonical-type "Bench Plane" --min-confidence high > benchplanes-high.jsonl
 *   node scripts/training-data/export-jsonl.js --provenance curated,user_correction > expert.jsonl
 */

const path = require('path');
const admin = require(path.join(__dirname, '..', '..', 'functions', 'node_modules', 'firebase-admin'));

const serviceAccount = require(path.join(__dirname, '..', '..', 'functions', 'service-account.json'));
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const BUCKET_NAME = bucket.name;

const CONFIDENCE_RANK = { high: 2, medium: 1, low: 0 };

function getArg(flag, fallback = null) {
  const args = process.argv.slice(2);
  const idx = args.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
  if (idx === -1) return fallback;
  const a = args[idx];
  if (a.includes('=')) return a.split('=')[1];
  return args[idx + 1] || fallback;
}

function hasFlag(flag) {
  return process.argv.slice(2).includes(flag);
}

async function main() {
  const provFilter = getArg('--provenance');
  const typeFilter = getArg('--canonical-type');
  const minConfidence = getArg('--min-confidence', 'medium');
  const maxPerCluster = getArg('--max-per-cluster');
  const signedUrls = hasFlag('--signed-urls');

  const provSet = provFilter ? new Set(provFilter.split(',').map(s => s.trim())) : null;
  const typeSet = typeFilter ? new Set(typeFilter.split(',').map(s => s.trim())) : null;
  const minRank = CONFIDENCE_RANK[minConfidence] ?? 1;
  const capPerCluster = maxPerCluster ? parseInt(maxPerCluster, 10) : null;

  // Stream the collection. For large corpora we'd page; at corpus size
  // <100k a single get() is fine and a lot simpler.
  const snap = await db.collection('training_examples').get();
  const clusterCounts = new Map();

  let emitted = 0;
  let skipped = 0;
  for (const doc of snap.docs) {
    const d = doc.data();

    if (provSet && !provSet.has(d.label_provenance)) { skipped++; continue; }
    if (typeSet && !typeSet.has(d.canonical_type)) { skipped++; continue; }
    const rank = CONFIDENCE_RANK[d.label_confidence] ?? 0;
    if (rank < minRank) { skipped++; continue; }
    if (capPerCluster) {
      const n = clusterCounts.get(d.cluster_key) || 0;
      if (n >= capPerCluster) { skipped++; continue; }
      clusterCounts.set(d.cluster_key, n + 1);
    }

    let image_uri = `gs://${BUCKET_NAME}/${d.image_path}`;
    if (signedUrls) {
      try {
        const [url] = await bucket.file(d.image_path).getSignedUrl({
          action: 'read',
          expires: Date.now() + 24 * 60 * 60 * 1000,
        });
        image_uri = url;
      } catch (err) {
        process.stderr.write(`[warn] signed url failed for ${d.image_path}: ${err.message}\n`);
      }
    }

    const out = {
      image_uri,
      image_path: d.image_path,
      source: d.source,
      canonical_brand: d.canonical_brand,
      canonical_type: d.canonical_type,
      canonical_model: d.canonical_model,
      canonical_size: d.canonical_size,
      plane_type_number: d.plane_type_number,
      era_estimate: d.era_estimate,
      condition: d.condition,
      label_provenance: d.label_provenance,
      label_confidence: d.label_confidence,
      cluster_key: d.cluster_key,
    };
    process.stdout.write(JSON.stringify(out) + '\n');
    emitted++;
  }

  process.stderr.write(`\nemitted=${emitted} skipped=${skipped} (filters: provenance=${provFilter || 'all'} type=${typeFilter || 'all'} min-confidence=${minConfidence} cap=${capPerCluster || 'none'})\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
