/**
 * Apply the normalizer to a single externalListings document and write the
 * canonical fields back. Shared helper used by both the onDocumentWritten
 * Firestore trigger and the one-shot backfill CLI — so they stay in sync.
 */

const admin = require('firebase-admin');
const { normalizeListing } = require('./normalizer');
const { canonicalizeBrand } = require('./vocabulary');

/**
 * Normalize a single listing and persist canonical fields to its Firestore doc.
 *
 * Idempotency guard: if `canonical_brand` is already set on the document and
 * `opts.force` is not true, returns `{ skipped: true }` without calling the LLM.
 * This prevents the onDocumentWritten trigger from looping on its own writes.
 *
 * @param {FirebaseFirestore.DocumentReference} ref
 * @param {object} data — current doc data (typically from a snapshot)
 * @param {object} [opts]
 * @param {boolean} [opts.force=false] — re-normalize even if canonical_brand is set
 * @param {string} [opts.model] — override the normalizer model
 */
async function normalizeListingDoc(ref, data, opts = {}) {
  if (!data) return { skipped: true, reason: 'no_data' };
  if (!data.title_raw) return { skipped: true, reason: 'no_title' };
  if (!opts.force && data.canonical_brand) {
    return { skipped: true, reason: 'already_normalized' };
  }

  const result = await normalizeListing(
    {
      title_raw: data.title_raw,
      description_raw: data.description_raw,
      tags: data.tags,
      heuristic_brand: data.heuristic_brand,
      heuristic_type: data.heuristic_type,
    },
    { model: opts.model }
  );

  // Post-LLM alias canonicalization — collapses near-duplicates the model
  // emits (case typos, "& Co." suffixes, Sears sub-brand prefixes). Cheap
  // string lookup; see vocabulary.js BRAND_ALIASES for the full list.
  const canonical_brand = canonicalizeBrand(result.canonical_brand);

  await ref.update({
    canonical_brand,
    canonical_type: result.canonical_type,
    canonical_model: result.canonical_model,
    canonical_size: result.canonical_size,
    era_estimate: result.era_estimate,
    normalized_at: admin.firestore.FieldValue.serverTimestamp(),
    normalizer_model: result.model,
  });

  return {
    normalized: true,
    usage: result.usage,
    canonical: {
      canonical_brand,
      canonical_type: result.canonical_type,
      canonical_model: result.canonical_model,
      canonical_size: result.canonical_size,
      era_estimate: result.era_estimate,
    },
  };
}

module.exports = { normalizeListingDoc };
