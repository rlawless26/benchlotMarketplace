#!/usr/bin/env node
const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));

if (!admin.apps.length) {
  const saPath = path.resolve(__dirname, '..', 'functions', 'service-account.json');
  admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
}

(async () => {
  const db = admin.firestore();
  const snap = await db.collection('externalListings').where('status', '==', 'active').get();

  const total = snap.size;
  let canonical = 0;
  let heuristicOnly = 0;
  let neither = 0;
  const bySourceTotal = {};
  const bySourceNeither = {};

  for (const doc of snap.docs) {
    const d = doc.data();
    const src = d.source || 'unknown';
    bySourceTotal[src] = (bySourceTotal[src] || 0) + 1;

    const cb = d.canonical_brand;
    const hb = d.heuristic_brand;
    const hasCanonical = cb && cb !== 'Unknown';
    const hasHeuristic = hb && hb !== 'Unknown';

    if (hasCanonical) canonical += 1;
    else if (hasHeuristic) heuristicOnly += 1;
    else {
      neither += 1;
      bySourceNeither[src] = (bySourceNeither[src] || 0) + 1;
    }
  }

  const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;

  console.log(`\nTotal active listings: ${total}`);
  console.log(`  with canonical_brand:        ${canonical}  (${pct(canonical)})`);
  console.log(`  heuristic_brand only:        ${heuristicOnly}  (${pct(heuristicOnly)})`);
  console.log(`  NO BRAND (null/Unknown):     ${neither}  (${pct(neither)})`);

  console.log(`\nBy source — share with no brand:`);
  const sources = Object.keys(bySourceTotal).sort();
  for (const s of sources) {
    const t = bySourceTotal[s];
    const n = bySourceNeither[s] || 0;
    console.log(`  ${s.padEnd(20)} ${n}/${t} (${((n / t) * 100).toFixed(1)}%)`);
  }

  // Sample 60 random no-brand listings, stratified by source.
  const noBrandBySource = {};
  for (const doc of snap.docs) {
    const d = doc.data();
    const cb = d.canonical_brand;
    const hb = d.heuristic_brand;
    if ((cb && cb !== 'Unknown') || (hb && hb !== 'Unknown')) continue;
    const src = d.source || 'unknown';
    (noBrandBySource[src] = noBrandBySource[src] || []).push({
      title: d.title_raw,
      type: d.canonical_type || d.heuristic_type,
      cb: cb || 'null',
      hb: hb || 'null',
    });
  }

  console.log(`\nSample of no-brand titles (10 per source):`);
  for (const s of sources) {
    const arr = noBrandBySource[s] || [];
    if (!arr.length) continue;
    const shuffled = arr.sort(() => Math.random() - 0.5).slice(0, 10);
    console.log(`\n--- ${s} (${arr.length} no-brand) ---`);
    for (const r of shuffled) {
      console.log(`  [${r.type || '?'}] cb=${r.cb} hb=${r.hb}`);
      console.log(`    "${(r.title || '').slice(0, 140)}"`);
    }
  }

  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
