#!/usr/bin/env node
/**
 * One-shot backfill for the 2026-05-03 expired→sold semantic shift.
 *
 * Pre-2026-05-03, `markExpired` flipped non-seen rows to
 * `status: 'expired'`. The build job's asking-block included expired
 * rows alongside actives, treating them as asking-price comps. Wrong:
 * for dealer / forum / Reddit / FB sources, a listing disappearing
 * almost always means it sold.
 *
 * This script flips every existing `status: 'expired'` row to
 * `status: 'sold'` with `sold_at = last_seen_at` (best estimate — the
 * last time we saw it). Idempotent: re-running is a no-op.
 *
 * eBay rows are deliberately untouched (eBay never calls markExpired
 * today; future ebay_sold ingestion will populate sold rows directly).
 *
 * Usage:
 *   node functions/pricestats/backfill-expired-as-sold.js
 *   node functions/pricestats/backfill-expired-as-sold.js --dry-run
 */

const path = require('path');
const admin = require('firebase-admin');

const COLLECTION = 'externalListings';
const BATCH = 400;

function parseArgs(argv) {
  const args = { dryRun: false };
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node functions/pricestats/backfill-expired-as-sold.js [--dry-run]');
      process.exit(0);
    }
  }
  return args;
}

function initAdmin() {
  if (admin.apps.length) return;
  const saPath = path.resolve(__dirname, '..', 'service-account.json');
  try {
    const serviceAccount = require(saPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log(`[backfill-expired-as-sold] using service account at ${saPath}`);
  } catch (e) {
    admin.initializeApp();
    console.log('[backfill-expired-as-sold] using default application credentials');
  }
}

async function main() {
  const args = parseArgs(process.argv);
  initAdmin();
  const db = admin.firestore();
  const col = db.collection(COLLECTION);

  let scanned = 0;
  let bySource = {};
  let lastDoc = null;
  let updated = 0;

  /* eslint-disable no-constant-condition */
  while (true) {
    let q = col.where('status', '==', 'expired').orderBy('last_seen_at', 'asc').limit(BATCH);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;

    snap.docs.forEach((d) => {
      scanned += 1;
      const data = d.data();
      const src = data.source || 'unknown';
      bySource[src] = (bySource[src] || 0) + 1;
    });

    if (!args.dryRun) {
      const batch = db.batch();
      for (const d of snap.docs) {
        const data = d.data();
        // Use existing last_seen_at as the best sold_at estimate for
        // backfill — under the new live semantics, sold_at = the moment
        // the scraper noticed it gone, which IS last_seen_at after the
        // pre-existing markExpired flip.
        batch.update(d.ref, {
          status: 'sold',
          sold_at: data.last_seen_at || data.scraped_at || null,
        });
      }
      await batch.commit();
      updated += snap.size;
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < BATCH) break;
  }

  console.log(`[backfill-expired-as-sold] scanned ${scanned} expired rows`);
  console.log('[backfill-expired-as-sold] by source:');
  Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .forEach(([src, n]) => console.log('  ', n.toString().padStart(6), src));
  console.log(`[backfill-expired-as-sold] ${args.dryRun ? 'DRY RUN — would update' : 'updated'} ${updated} rows`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[backfill-expired-as-sold] failed:', err);
    process.exit(1);
  });
