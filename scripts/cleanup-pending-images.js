#!/usr/bin/env node

/**
 * Cleanup script for tools stuck in `pending_images` status.
 *
 * After the "require photos at publish" change, no new tools should land in
 * pending_images. But some may already exist from earlier publishes that
 * never had photos uploaded. This script finds them and lets you clean up.
 *
 * For each pending_images tool, it inspects Firebase Storage at tools/{toolId}/:
 *   - If images exist there but the tool doc has empty `images` array → flip to 'active'
 *   - If no storage images exist → archive (status='deleted') so the seller dashboard
 *     no longer shows it as needing photos. Use 'deleted' (existing soft-delete status)
 *     rather than introducing a new 'archived' value.
 *
 * Usage:
 *   node scripts/cleanup-pending-images.js                    # DRY RUN — reports only
 *   node scripts/cleanup-pending-images.js --commit           # actually apply changes
 *   node scripts/cleanup-pending-images.js --commit --limit 5 # cap how many tools to touch
 *
 * Requires functions/service-account.json (same credential the Cloud Functions use).
 */

const path = require('path');
const admin = require('firebase-admin');

const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account.json');
let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (err) {
  console.error(`Could not load service account at ${serviceAccountPath}`);
  console.error('Make sure functions/service-account.json exists.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.appspot.com`,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// CLI args
const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : Infinity;

async function listStorageImages(toolId) {
  const [files] = await bucket.getFiles({ prefix: `tools/${toolId}/` });
  return files;
}

async function main() {
  console.log(`\nMode: ${COMMIT ? 'COMMIT (will modify Firestore)' : 'DRY RUN (read-only)'}`);
  console.log(`Limit: ${LIMIT === Infinity ? 'no limit' : LIMIT}\n`);

  const snapshot = await db
    .collection('tools')
    .where('status', '==', 'pending_images')
    .get();

  console.log(`Found ${snapshot.size} tool(s) with status='pending_images'\n`);

  if (snapshot.empty) {
    console.log('Nothing to clean up. ✓');
    process.exit(0);
  }

  let activated = 0;
  let archived = 0;
  let processed = 0;

  for (const doc of snapshot.docs) {
    if (processed >= LIMIT) {
      console.log(`Hit --limit ${LIMIT}, stopping.`);
      break;
    }
    processed++;

    const tool = doc.data();
    const docImages = Array.isArray(tool.images) ? tool.images : [];

    let storageImages = [];
    try {
      storageImages = await listStorageImages(doc.id);
    } catch (err) {
      console.error(`  [${doc.id}] error listing storage: ${err.message}`);
      continue;
    }

    const tag = `[${doc.id}] "${tool.name || '(no name)'}" by ${tool.user_id || '(no user)'}`;

    if (storageImages.length > 0) {
      console.log(`${tag} — has ${storageImages.length} storage image(s), doc.images=${docImages.length} → ACTIVATE`);
      if (COMMIT) {
        // Rebuild the doc.images array from storage so the tool has proper image refs
        const rebuiltImages = await Promise.all(
          storageImages.map(async (file) => {
            const [url] = await file.getSignedUrl({ action: 'read', expires: '03-01-2491' });
            return {
              url,
              path: file.name,
              filename: path.basename(file.name),
              added_at: new Date().toISOString(),
            };
          })
        );
        await doc.ref.update({
          status: 'active',
          images: rebuiltImages,
          statusDetails: {
            missingImages: false,
            lastUpdated: new Date().toISOString(),
            note: 'Activated by cleanup-pending-images script',
          },
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        activated++;
      } else {
        activated++;
      }
    } else {
      console.log(`${tag} — no storage images → ARCHIVE (status=deleted)`);
      if (COMMIT) {
        await doc.ref.update({
          status: 'deleted',
          statusDetails: {
            missingImages: true,
            lastUpdated: new Date().toISOString(),
            note: 'Archived by cleanup-pending-images script (no photos ever uploaded)',
          },
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        archived++;
      } else {
        archived++;
      }
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Would activate: ${activated}`);
  console.log(`  Would archive:  ${archived}`);
  if (!COMMIT) {
    console.log(`\nDRY RUN — no changes were made. Re-run with --commit to apply.`);
  } else {
    console.log(`\nDone.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
