#!/usr/bin/env node
/**
 * Purge all externalListings + externalListingsRaw records for a single source.
 * Use when a dealer asks to be un-indexed, or when switching away from a data
 * source you no longer want to surface.
 *
 * Safety: refuses to run without an explicit --i-understand confirmation,
 * and defaults to --dry-run mode if the flag is missing.
 *
 * Usage:
 *   node functions/ingest/purge-source.js --source jimbode --dry-run
 *   node functions/ingest/purge-source.js --source jimbode --i-understand
 */

const path = require('path');
const admin = require('firebase-admin');

function parseArgs(argv) {
  const args = { source: null, confirm: false, dryRun: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--source') args.source = argv[++i];
    else if (a === '--i-understand') { args.confirm = true; args.dryRun = false; }
    else if (a === '--dry-run') args.dryRun = true;
  }
  return args;
}

function initAdmin() {
  if (admin.apps.length) return;
  const saPath = path.resolve(__dirname, '..', 'service-account.json');
  try {
    admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
  } catch (e) {
    admin.initializeApp();
  }
}

async function deleteCollectionFiltered(db, collection, source, dryRun) {
  const col = db.collection(collection);
  let deleted = 0;
  let lastDoc = null;
  /* eslint-disable no-constant-condition */
  while (true) {
    let q = col.where('source', '==', source).limit(400);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;
    if (dryRun) {
      deleted += snap.size;
    } else {
      const batch = db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deleted += snap.size;
      process.stdout.write(`\r[purge-source] ${collection}: ${deleted} deleted`);
    }
    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < 400) break;
  }
  if (!dryRun) process.stdout.write('\n');
  return deleted;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.source) {
    console.error('[purge-source] --source is required (e.g. --source jimbode)');
    process.exit(2);
  }

  initAdmin();
  const db = admin.firestore();

  console.log(`[purge-source] source="${args.source}"  ${args.dryRun ? 'DRY RUN' : 'LIVE DELETE'}`);

  const mainCount = await deleteCollectionFiltered(db, 'externalListings', args.source, args.dryRun);
  const rawCount = await deleteCollectionFiltered(db, 'externalListingsRaw', args.source, args.dryRun);

  if (args.dryRun) {
    console.log(`[purge-source] DRY RUN — would delete:`);
    console.log(`  externalListings:    ${mainCount}`);
    console.log(`  externalListingsRaw: ${rawCount}`);
    console.log(`[purge-source] to execute: re-run with --i-understand (NOT --dry-run)`);
  } else {
    console.log(`[purge-source] DONE — deleted ${mainCount} listings + ${rawCount} raw records`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n[purge-source] fatal:', err);
    process.exit(1);
  });
