#!/usr/bin/env node
/**
 * Apply the classifyNonTool heuristic to every active externalListings doc.
 * Flips matches to status='excluded_non_tool' so the aggregator query (which
 * filters status=='active') stops surfacing books, lumber, magazines, etc.
 *
 * Idempotent — also re-actives any doc currently flagged that no longer
 * matches the detector (e.g. after a heuristic relaxation).
 *
 *   node scripts/backfill-non-tool-filter.js              # apply
 *   node scripts/backfill-non-tool-filter.js --dry-run    # report only
 */

const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
const { classifyNonTool } = require(path.join(__dirname, '..', 'functions', 'ingest', 'heuristics'));

if (!admin.apps.length) {
  const saPath = path.resolve(__dirname, '..', 'functions', 'service-account.json');
  admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
}

const dryRun = process.argv.includes('--dry-run');

(async () => {
  const db = admin.firestore();
  const col = db.collection('externalListings');

  // Pull both currently-active AND already-excluded so we can flip both ways
  // and keep the catalog in sync with the latest detector.
  const [activeSnap, excludedSnap] = await Promise.all([
    col.where('status', '==', 'active').get(),
    col.where('status', '==', 'excluded_non_tool').get(),
  ]);

  const all = [...activeSnap.docs, ...excludedSnap.docs];
  console.log(`Scanning ${all.length} listings (${activeSnap.size} active + ${excludedSnap.size} already excluded)...`);

  const toExclude = [];
  const toReactivate = [];
  const reasonCounts = {};
  const sampleByReason = {};

  for (const doc of all) {
    const d = doc.data();
    const result = classifyNonTool(d.title_raw);
    const currentlyActive = d.status === 'active';

    if (result.nonTool && currentlyActive) {
      toExclude.push({ ref: doc.ref, reason: result.reason, title: d.title_raw });
      reasonCounts[result.reason] = (reasonCounts[result.reason] || 0) + 1;
      const samples = (sampleByReason[result.reason] = sampleByReason[result.reason] || []);
      if (samples.length < 5) samples.push(d.title_raw);
    } else if (!result.nonTool && !currentlyActive) {
      toReactivate.push({ ref: doc.ref, title: d.title_raw });
    }
  }

  console.log(`\nTo exclude: ${toExclude.length}`);
  for (const [reason, count] of Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason.padEnd(12)} ${count}`);
    for (const s of (sampleByReason[reason] || [])) {
      console.log(`    - "${(s || '').slice(0, 100)}"`);
    }
  }
  console.log(`\nTo re-activate (no longer matches detector): ${toReactivate.length}`);
  for (const r of toReactivate.slice(0, 5)) {
    console.log(`  - "${(r.title || '').slice(0, 100)}"`);
  }

  if (dryRun) {
    console.log('\n--dry-run — no writes performed.');
    process.exit(0);
  }

  const BATCH_SIZE = 400;
  let written = 0;

  async function commitBatches(updates, makePayload) {
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = db.batch();
      for (const u of updates.slice(i, i + BATCH_SIZE)) {
        batch.update(u.ref, makePayload(u));
      }
      await batch.commit();
      written += Math.min(BATCH_SIZE, updates.length - i);
      process.stdout.write(`\r  written: ${written}`);
    }
  }

  await commitBatches(toExclude, (u) => ({
    status: 'excluded_non_tool',
    excluded_reason: u.reason,
  }));
  await commitBatches(toReactivate, () => ({
    status: 'active',
    excluded_reason: admin.firestore.FieldValue.delete(),
  }));

  console.log(`\n\nDone. Wrote ${written} updates.`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
