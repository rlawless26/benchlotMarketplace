/**
 * Promote user scan corrections into the training_examples corpus.
 *
 * Runs nightly. Reads `scan_feedback` rows created since the last successful
 * promotion run, joins them to their underlying scan's images, and writes
 * one training_examples doc per row with `label_provenance: 'user_correction'`.
 *
 * Provenance precedence (high-quality first):
 *   - `vote === 'corrected'` AND `hasEdits === true` → label_confidence: 'high'
 *   - `vote === 'correct'`                            → label_confidence: 'medium'
 *
 * Cursor: stored in Firestore at `system/training_corrections_promotion`
 *   { last_promoted_at: Timestamp, last_run_at: Timestamp }
 */

const admin = require('firebase-admin');
const db = admin.firestore();

const CURSOR_DOC_PATH = ['system', 'training_corrections_promotion'];

function slug(s) {
  if (!s) return '_';
  const out = String(s)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return out || '_';
}

function clusterKey({ canonical_type, canonical_brand, canonical_size }) {
  return `pt::${slug(canonical_type)}::${slug(canonical_brand)}::${slug(canonical_size)}`;
}

async function getCursor() {
  const snap = await db.collection(CURSOR_DOC_PATH[0]).doc(CURSOR_DOC_PATH[1]).get();
  if (!snap.exists) return null;
  return snap.data().last_promoted_at || null;
}

async function setCursor(latestPromotedAt) {
  await db.collection(CURSOR_DOC_PATH[0]).doc(CURSOR_DOC_PATH[1]).set({
    last_promoted_at: latestPromotedAt,
    last_run_at: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

/**
 * Run the promotion. Returns a summary object.
 */
async function run() {
  const lastPromotedAt = await getCursor();
  const startedAt = Date.now();

  let q = db.collection('scan_feedback').orderBy('created_at', 'asc');
  if (lastPromotedAt) {
    q = q.where('created_at', '>', lastPromotedAt);
  }

  const snap = await q.get();
  const rows = snap.docs;

  const summary = {
    seen: rows.length,
    promoted_corrected: 0,
    promoted_confirmed: 0,
    skipped_already_exists: 0,
    skipped_no_images: 0,
    skipped_no_label: 0,
    failed: 0,
    last_promoted_at: lastPromotedAt ? lastPromotedAt.toDate().toISOString() : null,
  };

  let latestSeen = lastPromotedAt;

  for (const row of rows) {
    try {
      const d = row.data();
      latestSeen = d.created_at || latestSeen;

      // Source of truth for the label:
      //   - `corrected` rows: prefer correctedResult (the user's edit)
      //   - `correct` rows: originalResult (user confirmed AI's answer)
      const labelSource = (d.vote === 'corrected' && d.correctedResult)
        ? d.correctedResult
        : d.originalResult;

      if (!labelSource || !labelSource.canonical_brand || !labelSource.canonical_type) {
        summary.skipped_no_label++;
        continue;
      }

      if (!Array.isArray(d.imagePaths) || d.imagePaths.length === 0) {
        summary.skipped_no_images++;
        continue;
      }

      // First image only in v1. scanId in the doc ID keeps the corpus
      // joinable back to the source scan + any future multi-turn lineage.
      const scanId = d.scanId || row.id;
      const docId = `scanfeedback__${scanId}__0`;
      const ref = db.collection('training_examples').doc(docId);
      const existing = await ref.get();
      if (existing.exists) {
        summary.skipped_already_exists++;
        continue;
      }

      const isCorrection = d.vote === 'corrected' && d.hasEdits === true;
      const canonical_size = labelSource.canonical_model || null;
      const doc = {
        image_path: d.imagePaths[0],
        image_content_type: null,
        image_bytes: null,
        source: 'scan_feedback',
        source_id: row.id,
        source_url: null,
        scan_id: scanId,
        canonical_brand: labelSource.canonical_brand,
        canonical_type: labelSource.canonical_type,
        canonical_model: labelSource.canonical_model || null,
        canonical_size,
        plane_type_number: Number.isInteger(labelSource.plane_type_number)
          ? labelSource.plane_type_number
          : null,
        era_estimate: labelSource.era_estimate || null,
        condition: labelSource.condition || null,
        label_provenance: 'user_correction',
        label_confidence: isCorrection ? 'high' : 'medium',
        vote: d.vote,
        has_edits: !!d.hasEdits,
        added_at: admin.firestore.FieldValue.serverTimestamp(),
        cluster_key: clusterKey({
          canonical_type: labelSource.canonical_type,
          canonical_brand: labelSource.canonical_brand,
          canonical_size,
        }),
      };

      await ref.set(doc);
      if (isCorrection) summary.promoted_corrected++;
      else summary.promoted_confirmed++;
    } catch (err) {
      console.error(`[promote-scan-corrections] row ${row.id} failed:`, err.message);
      summary.failed++;
    }
  }

  if (latestSeen) {
    await setCursor(latestSeen);
  }

  summary.duration_ms = Date.now() - startedAt;
  summary.new_cursor = latestSeen ? latestSeen.toDate().toISOString() : null;
  return summary;
}

module.exports = { run };
