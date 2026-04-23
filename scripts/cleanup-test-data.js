#!/usr/bin/env node

/**
 * Cleanup script to remove all test listings and related data before launch.
 *
 * Deletes from these collections/storage:
 *   - tools (all documents)
 *   - offers + offers/{id}/messages (all)
 *   - orders + orders/{id}/items (all)
 *   - carts + carts/{id}/items (all)
 *   - wishlists (clears tools[] arrays)
 *   - Firebase Storage tools/* (listing images)
 *
 * Usage:
 *   node scripts/cleanup-test-data.js              # DRY RUN — counts only
 *   node scripts/cleanup-test-data.js --commit     # actually delete everything
 *
 * Requires functions/service-account.json.
 */

const path = require('path');
const admin = require('firebase-admin');

const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'benchlot-6d64e.firebasestorage.app',
});

const db = admin.firestore();
const bucket = admin.storage().bucket();
const commit = process.argv.includes('--commit');

async function countCollection(name) {
  const snap = await db.collection(name).count().get();
  return snap.data().count;
}

async function deleteSubcollections(collectionName, subcollectionName) {
  const parentSnap = await db.collection(collectionName).listDocuments();
  let total = 0;
  for (const docRef of parentSnap) {
    const subSnap = await docRef.collection(subcollectionName).listDocuments();
    total += subSnap.length;
    if (commit) {
      const batch = db.batch();
      for (const subDoc of subSnap) {
        batch.delete(subDoc);
      }
      if (subSnap.length > 0) await batch.commit();
    }
  }
  return total;
}

async function deleteCollection(name, batchSize = 100) {
  let deleted = 0;
  let snap = await db.collection(name).limit(batchSize).get();
  while (!snap.empty) {
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    if (commit) await batch.commit();
    deleted += snap.size;
    if (snap.size < batchSize) break;
    snap = await db.collection(name).limit(batchSize).get();
  }
  return deleted;
}

async function clearWishlists() {
  const snap = await db.collection('wishlists').get();
  let cleared = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.tools && data.tools.length > 0) {
      cleared++;
      if (commit) {
        await doc.ref.update({ tools: [], updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      }
    }
  }
  return { total: snap.size, cleared };
}

async function deleteStorageImages() {
  const [files] = await bucket.getFiles({ prefix: 'tools/' });
  if (commit) {
    for (const file of files) {
      await file.delete();
    }
  }
  return files.length;
}

async function main() {
  console.log(commit
    ? '\n🔴 LIVE MODE — deletions will be applied\n'
    : '\n🔍 DRY RUN — counting only (use --commit to delete)\n'
  );

  // Count everything first
  const toolCount = await countCollection('tools');
  const offerCount = await countCollection('offers');
  const orderCount = await countCollection('orders');
  const cartCount = await countCollection('carts');

  console.log(`  tools:      ${toolCount} documents`);
  console.log(`  offers:     ${offerCount} documents`);
  console.log(`  orders:     ${orderCount} documents`);
  console.log(`  carts:      ${cartCount} documents`);

  const wishlistResult = await clearWishlists();
  console.log(`  wishlists:  ${wishlistResult.total} documents (${wishlistResult.cleared} with tool entries)`);

  const storageCount = await deleteStorageImages();
  console.log(`  storage:    ${storageCount} files in tools/`);

  if (!commit) {
    console.log('\n  Run with --commit to delete all of the above.\n');
    process.exit(0);
  }

  // Delete subcollections first, then parent collections
  console.log('\nDeleting...');

  const offerMsgs = await deleteSubcollections('offers', 'messages');
  console.log(`  ✓ offers/*/messages: ${offerMsgs} deleted`);

  const deletedOffers = await deleteCollection('offers');
  console.log(`  ✓ offers: ${deletedOffers} deleted`);

  const orderItems = await deleteSubcollections('orders', 'items');
  console.log(`  ✓ orders/*/items: ${orderItems} deleted`);

  const deletedOrders = await deleteCollection('orders');
  console.log(`  ✓ orders: ${deletedOrders} deleted`);

  const cartItems = await deleteSubcollections('carts', 'items');
  console.log(`  ✓ carts/*/items: ${cartItems} deleted`);

  const deletedCarts = await deleteCollection('carts');
  console.log(`  ✓ carts: ${deletedCarts} deleted`);

  console.log(`  ✓ wishlists: ${wishlistResult.cleared} cleared`);

  const deletedTools = await deleteCollection('tools');
  console.log(`  ✓ tools: ${deletedTools} deleted`);

  console.log(`  ✓ storage: ${storageCount} files deleted`);

  console.log('\n✅ Cleanup complete.\n');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
