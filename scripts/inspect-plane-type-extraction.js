#!/usr/bin/env node
const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));

if (!admin.apps.length) {
  const saPath = path.resolve(__dirname, '..', 'functions', 'service-account.json');
  admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
}

(async () => {
  const db = admin.firestore();
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 30 * 60 * 1000);
  const snap = await db.collection('externalListings')
    .where('normalized_at', '>=', cutoff)
    .get();
  console.log(`${snap.size} listings normalized in the last 30 minutes\n`);

  let planeCount = 0;
  let withTypeNum = 0;
  let planesNullType = 0;
  let nonPlanes = 0;
  const samples = [];
  const stanleyBenchPlanes = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    const isPlane = (d.canonical_type || '').toLowerCase().includes('plane');
    const isStanleyBench = d.canonical_type === 'Bench Plane' && /stanley/i.test(d.canonical_brand || '');
    if (isPlane) {
      planeCount += 1;
      if (Number.isInteger(d.plane_type_number)) withTypeNum += 1;
      else planesNullType += 1;
      samples.push({ brand: d.canonical_brand, type: d.canonical_type, model: d.canonical_model, ptn: d.plane_type_number, title: (d.title_raw || '').slice(0, 90) });
      if (isStanleyBench) stanleyBenchPlanes.push({ brand: d.canonical_brand, model: d.canonical_model, ptn: d.plane_type_number, title: (d.title_raw || '').slice(0, 90) });
    } else {
      nonPlanes += 1;
    }
  }
  console.log(`Planes: ${planeCount}  (with type_num: ${withTypeNum}, null type_num: ${planesNullType})`);
  console.log(`Non-planes: ${nonPlanes}\n`);

  console.log(`Stanley bench planes (${stanleyBenchPlanes.length}):`);
  for (const s of stanleyBenchPlanes) {
    console.log(`  brand=${(s.brand||'?').padEnd(18)} model=${(s.model||'(null)').padEnd(13)} ptn=${s.ptn===null?'null':s.ptn} | ${s.title}`);
  }

  console.log(`\nAll plane samples (${samples.length}):`);
  for (const s of samples) {
    console.log(`  brand=${(s.brand||'?').padEnd(20)} type=${(s.type||'?').padEnd(18)} model=${(s.model||'(null)').padEnd(15)} ptn=${s.ptn===null?'null':s.ptn} | ${s.title}`);
  }

  // Sanity-check: any non-Stanley brands with plane_type_number set? Any block planes with one?
  const anomalies = samples.filter((s) => Number.isInteger(s.ptn) && (!/stanley/i.test(s.brand || '') || s.type !== 'Bench Plane'));
  if (anomalies.length) {
    console.log(`\n⚠️  Anomalies — non-Stanley-bench-plane with plane_type_number (${anomalies.length}):`);
    for (const a of anomalies) console.log(`  brand=${a.brand} type=${a.type} model=${a.model} ptn=${a.ptn} | ${a.title}`);
  } else {
    console.log(`\nNo anomalies — plane_type_number is correctly null for all non-Stanley-bench-plane rows.`);
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
