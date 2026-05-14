#!/usr/bin/env node

/**
 * Quick sanity check on the training_examples corpus. Prints counts by
 * label_provenance, canonical_type, canonical_brand; spot-checks a few
 * docs to confirm image_path resolves in Storage.
 *
 *   node scripts/training-data/verify-corpus.js
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

(async () => {
  const snap = await db.collection('training_examples').get();
  const total = snap.size;
  console.log(`Total docs: ${total}\n`);

  const byProvenance = {};
  const byType = {};
  const byBrand = {};
  const byConfidence = {};

  for (const doc of snap.docs) {
    const d = doc.data();
    byProvenance[d.label_provenance] = (byProvenance[d.label_provenance] || 0) + 1;
    byType[d.canonical_type] = (byType[d.canonical_type] || 0) + 1;
    byBrand[d.canonical_brand || 'null'] = (byBrand[d.canonical_brand || 'null'] || 0) + 1;
    byConfidence[d.label_confidence] = (byConfidence[d.label_confidence] || 0) + 1;
  }

  console.log('By label_provenance:');
  for (const [k, v] of Object.entries(byProvenance).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(20)} ${v}`);
  }
  console.log('\nBy canonical_type:');
  for (const [k, v] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(25)} ${v}`);
  }
  console.log('\nBy canonical_brand (top 10):');
  for (const [k, v] of Object.entries(byBrand).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${k.padEnd(25)} ${v}`);
  }
  console.log('\nBy label_confidence:');
  for (const [k, v] of Object.entries(byConfidence).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(20)} ${v}`);
  }

  // Spot-check: pick 3 docs at random and verify image_path resolves
  const samples = snap.docs.slice(0, 3);
  console.log('\nSpot-check image_path resolution:');
  for (const doc of samples) {
    const d = doc.data();
    const [exists] = await bucket.file(d.image_path).exists();
    const metaResult = exists ? await bucket.file(d.image_path).getMetadata() : null;
    const size = metaResult ? metaResult[0].size : '—';
    console.log(`  ${doc.id.padEnd(50)} ${exists ? '✓' : '✗'} ${d.image_path} (${size} bytes)`);
  }

  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
