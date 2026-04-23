/**
 * Firestore write helpers for the `externalListings` collection.
 * See ./SCHEMA.md for field definitions and lifecycle rules.
 */

const admin = require('firebase-admin');

const COLLECTION = 'externalListings';
const RAW_COLLECTION = 'externalListingsRaw';
// Firestore batch hard limit is 500 ops. We write 2 ops per record (listing +
// raw), so cap records at 200 per batch.
const UPSERT_CHUNK = 200;
const READ_CHUNK = 300;   // getAll() tolerates larger batches; stay conservative

function buildDocId(source, sourceId) {
  if (!source || !sourceId) throw new Error('buildDocId requires source and sourceId');
  return `${source}__${sourceId}`;
}

/**
 * Upsert a batch of records into Firestore.
 *
 * Each record is `{ listing, raw, raw_format }`:
 *   - `listing` — mapped, searchable shape written to `externalListings`.
 *     See SCHEMA.md for fields.
 *   - `raw` — the untouched source payload (Shopify product object, forum
 *     post JSON, eBay item JSON, etc.). Written to `externalListingsRaw`
 *     under the same doc ID so a future re-normalization can read the
 *     original without re-scraping. See SCHEMA.md §Raw collection.
 *   - `raw_format` — discriminator so consumers know how to parse `raw`
 *     (e.g. `'shopify_product'`). Required on every record.
 *
 * Stamps `status`, `scraped_at`, `last_seen_at`, and `first_seen_at` (first
 * write only — preserved on subsequent scrapes) on the listing. Canonical
 * fields are not touched here; the M2 normalizer populates those.
 *
 * Both writes happen in the same batch so listing and raw can never drift.
 *
 * @param {Array<{listing:object,raw:object,raw_format:string}>} records
 * @param {FirebaseFirestore.Timestamp} runStartedAt — shared across this run
 * @returns {Promise<{written:number, inserted:number, updated:number}>}
 */
async function upsertListings(records, runStartedAt) {
  if (!Array.isArray(records) || records.length === 0) {
    return { written: 0, inserted: 0, updated: 0 };
  }

  const db = admin.firestore();
  const col = db.collection(COLLECTION);
  const rawCol = db.collection(RAW_COLLECTION);
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < records.length; i += UPSERT_CHUNK) {
    const chunk = records.slice(i, i + UPSERT_CHUNK);

    // Read existing doc refs in parallel sub-chunks to learn which are new.
    const existing = new Set();
    for (let j = 0; j < chunk.length; j += READ_CHUNK) {
      const subChunk = chunk.slice(j, j + READ_CHUNK);
      const refs = subChunk.map((rec) => col.doc(buildDocId(rec.listing.source, rec.listing.source_id)));
      const snaps = await db.getAll(...refs);
      snaps.forEach((snap) => {
        if (snap.exists) existing.add(snap.id);
      });
    }

    const batch = db.batch();
    for (const rec of chunk) {
      if (!rec || !rec.listing) {
        throw new Error('upsertListings: each record must have a `listing` field');
      }
      if (!rec.raw_format) {
        throw new Error('upsertListings: each record must have a `raw_format` field');
      }
      const id = buildDocId(rec.listing.source, rec.listing.source_id);
      const listingRef = col.doc(id);
      const rawRef = rawCol.doc(id);

      const common = {
        ...rec.listing,
        status: 'active',
        scraped_at: runStartedAt,
        last_seen_at: runStartedAt,
      };
      if (existing.has(id)) {
        batch.set(listingRef, common, { merge: true });
        updated += 1;
      } else {
        batch.set(listingRef, { ...common, first_seen_at: runStartedAt });
        inserted += 1;
      }

      // Raw payload — overwrite on every scrape. One raw doc per listing.
      batch.set(rawRef, {
        source: rec.listing.source,
        source_id: rec.listing.source_id,
        raw_format: rec.raw_format,
        raw: rec.raw,
        scraped_at: runStartedAt,
      });
    }
    await batch.commit();
  }

  return { written: inserted + updated, inserted, updated };
}

/**
 * Flip any `active` listings for `source` whose `last_seen_at` predates
 * `runStartedAt` to `status = "expired"`. Batched, paginated.
 *
 * @param {string} source
 * @param {FirebaseFirestore.Timestamp} runStartedAt
 * @returns {Promise<{expired:number}>}
 */
async function markExpired(source, runStartedAt) {
  const db = admin.firestore();
  const col = db.collection(COLLECTION);
  let expired = 0;
  let lastDoc = null;

  /* eslint-disable no-constant-condition */
  while (true) {
    let query = col
      .where('source', '==', source)
      .where('status', '==', 'active')
      .where('last_seen_at', '<', runStartedAt)
      .orderBy('last_seen_at', 'asc')
      .limit(UPSERT_CHUNK);

    if (lastDoc) query = query.startAfter(lastDoc);

    const snap = await query.get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((doc) => {
      batch.update(doc.ref, { status: 'expired' });
    });
    await batch.commit();
    expired += snap.size;
    lastDoc = snap.docs[snap.docs.length - 1];

    if (snap.size < UPSERT_CHUNK) break;
  }

  return { expired };
}

module.exports = {
  COLLECTION,
  RAW_COLLECTION,
  buildDocId,
  upsertListings,
  markExpired,
};
