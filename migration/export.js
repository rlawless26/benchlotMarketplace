#!/usr/bin/env node
/**
 * Phase 1 of the migration: Firestore -> local JSONL.
 *
 * Deliberately separate from the load step. Reading 168k listings + 168k raw
 * payloads is ~350k Firestore reads; dumping once to disk means the Postgres
 * side can be re-run, debugged, and re-run again for free.
 *
 * Resumable: each collection keeps a .cursor file holding the last document id
 * written, so an interrupted run picks up where it stopped instead of starting
 * over. Paginates by document id (__name__), which is the only ordering
 * guaranteed to be stable under concurrent scraper writes and needs no index.
 *
 *   node migration/export.js               # all collections
 *   node migration/export.js listings      # one collection by key
 */
const fs = require('fs');
const path = require('path');
const admin = require('../functions/node_modules/firebase-admin');
const sa = require('../functions/service-account.json');

admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const OUT_DIR = path.join(__dirname, 'data');
const PAGE = 1000;

const COLLECTIONS = {
  listings:          'externalListings',
  listings_raw:      'externalListingsRaw',
  price_stats:       'priceStats',
  alerts:            'saved_searches',
  email_sends:       'email_log',
  tool_scans:        'toolscans',
  training_examples: 'training_examples',
  // Subcollection data: priceSnapshots/{docId}/snapshots/{id}. Reachable only
  // via a collectionGroup query -- a count on the top-level `priceSnapshots`
  // collection returns 0 because the parent docs are implicit.
  price_snapshots: { collectionGroup: 'snapshots' },
  // Legacy marketplace collections are NOT exported here. Per the plan they get
  // archived to cold storage separately and must not enter the new schema.
};

/**
 * Per-collection enrichment applied to each document before it is written.
 *
 * The target schema has no auth system: an alert is an email address plus a
 * signed link. Firestore's saved_searches only carry a Firebase uid, so the
 * address is resolved here, at export time, from the legacy users collection --
 * the one thing we need out of it before it gets archived. Only 2 rows.
 */
const ENRICH = {
  alerts: async (data) => {
    if (!data.userId) return { _email: null };
    try {
      const u = await db.collection('users').doc(data.userId).get();
      if (!u.exists) return { _email: null, _email_note: 'user doc missing' };
      const d = u.data() || {};
      return { _email: d.email || null, _displayName: d.displayName || d.firstName || null };
    } catch (e) {
      return { _email: null, _email_note: 'lookup failed: ' + e.message };
    }
  },
};

/** Firestore Timestamps -> ISO strings; everything else passes through. */
function plain(v) {
  if (v === null || v === undefined) return null;
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(plain);
  if (typeof v === 'object') {
    // Firestore sentinel types we don't use, but guard anyway.
    if (typeof v.latitude === 'number' && typeof v.longitude === 'number') {
      return { _lat: v.latitude, _lng: v.longitude };
    }
    if (v._path && typeof v.path === 'string') return v.path;
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = plain(val);
    return o;
  }
  return v;
}

async function exportCollection(key, collName) {
  const outPath = path.join(OUT_DIR, `${key}.jsonl`);
  const curPath = path.join(OUT_DIR, `${key}.cursor`);

  let cursor = null;
  let written = 0;
  if (fs.existsSync(curPath) && fs.existsSync(outPath)) {
    cursor = fs.readFileSync(curPath, 'utf8').trim() || null;
    written = fs.readFileSync(outPath, 'utf8').split('\n').filter(Boolean).length;
    console.log(`[${key}] resuming after ${cursor} (${written} rows already written)`);
  } else {
    fs.writeFileSync(outPath, '');
  }

  const out = fs.createWriteStream(outPath, { flags: 'a' });
  const started = Date.now();

  const isGroup = collName && typeof collName === 'object' && collName.collectionGroup;
  const base = () =>
    isGroup ? db.collectionGroup(collName.collectionGroup) : db.collection(collName);

  for (;;) {
    let q = base().orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE);
    if (cursor) {
      // A collectionGroup query ordered by __name__ sorts by FULL PATH, so the
      // cursor must be a DocumentReference, not a bare leaf id. Plain
      // collections are happy with the id.
      q = q.startAfter(isGroup ? db.doc(cursor) : cursor);
    }
    const snap = await q.get();
    if (snap.empty) break;

    const enrich = ENRICH[key];
    const lines = [];
    for (const doc of snap.docs) {
      const row = { _id: doc.id, ...plain(doc.data()) };
      if (isGroup) {
        // priceSnapshots/{source__source_id}/snapshots/{id} -> recover the parent.
        const parts = doc.ref.path.split('/');
        row._parent_id = parts.length >= 2 ? parts[parts.length - 3] : null;
      }
      if (enrich) Object.assign(row, await enrich(row));
      lines.push(JSON.stringify(row));
    }
    // Backpressure: wait for the flush before fetching the next page, so a slow
    // disk can't let the buffer grow unbounded across 168k rows.
    await new Promise((res, rej) =>
      out.write(lines.join('\n') + '\n', (e) => (e ? rej(e) : res()))
    );

    const lastDoc = snap.docs[snap.docs.length - 1];
    cursor = isGroup ? lastDoc.ref.path : lastDoc.id;
    written += snap.size;
    fs.writeFileSync(curPath, cursor);

    const rate = Math.round(written / ((Date.now() - started) / 1000));
    process.stdout.write(`\r[${key}] ${written} rows  (${rate}/s)   `);
    if (snap.size < PAGE) break;
  }

  await new Promise((res) => out.end(res));
  console.log(`\n[${key}] done: ${written} rows -> ${path.relative(process.cwd(), outPath)}`);
  return written;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const only = process.argv[2];
  const keys = only ? [only] : Object.keys(COLLECTIONS);
  if (only && !COLLECTIONS[only]) {
    console.error(`Unknown collection key "${only}". Known: ${Object.keys(COLLECTIONS).join(', ')}`);
    process.exit(1);
  }

  const totals = {};
  for (const k of keys) totals[k] = await exportCollection(k, COLLECTIONS[k]);

  // Merge rather than overwrite: a single-collection run must not erase the
  // counts recorded by earlier runs.
  const manifestPath = path.join(OUT_DIR, 'export-manifest.json');
  let prior = {};
  try { prior = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).counts || {}; } catch { /* first run */ }
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ exportedAt: new Date().toISOString(), counts: { ...prior, ...totals } }, null, 2)
  );
  console.log('\nmanifest:', JSON.stringify(totals));
  process.exit(0);
})().catch((e) => {
  console.error('\nFATAL', e);
  process.exit(1);
});
