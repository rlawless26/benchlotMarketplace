/**
 * Firestore implementation of the ingest write layer.
 *
 * Moved from ingest/externalListings.js, which is now a thin re-export of
 * ./index.js so the backend can be switched by env. Behaviour is unchanged.
 * See ../SCHEMA.md for field definitions and lifecycle rules.
 */

const admin = require('firebase-admin');

const { classifyNonTool } = require('../heuristics');

const COLLECTION = 'externalListings';
const RAW_COLLECTION = 'externalListingsRaw';
const SNAPSHOTS_COLLECTION = 'priceSnapshots';
// Firestore batch hard limit is 500 ops. We write up to 3 ops per record
// (listing + raw + price-snapshot when price or status changed), so cap
// records at 160 per batch.
const UPSERT_CHUNK = 160;
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
 * Also writes price-history snapshots to
 * `priceSnapshots/{listingId}/snapshots` whenever a doc is first inserted
 * OR when an existing doc's `price_cents` / `status` changes vs. the
 * previously persisted values. Snapshots power the Price-Drop badge and
 * the previous-listings popover (Track B.6).
 *
 * @param {Array<{listing:object,raw:object,raw_format:string}>} records
 * @param {FirebaseFirestore.Timestamp} runStartedAt — shared across this run
 * @returns {Promise<{written:number, inserted:number, updated:number, snapshots_written:number}>}
 */
async function upsertListings(records, runStartedAt) {
  if (!Array.isArray(records) || records.length === 0) {
    return { written: 0, inserted: 0, updated: 0, snapshots_written: 0 };
  }

  const db = admin.firestore();
  const col = db.collection(COLLECTION);
  const rawCol = db.collection(RAW_COLLECTION);
  const snapshotsRoot = db.collection(SNAPSHOTS_COLLECTION);
  let inserted = 0;
  let updated = 0;
  let snapshots_written = 0;

  for (let i = 0; i < records.length; i += UPSERT_CHUNK) {
    const chunk = records.slice(i, i + UPSERT_CHUNK);

    // Read existing docs in parallel sub-chunks. We need both existence
    // (insert vs update branching) AND prior price_cents/status (for the
    // snapshot-write diff), so capture both in one map.
    const existingData = new Map(); // id -> { price_cents, status }
    for (let j = 0; j < chunk.length; j += READ_CHUNK) {
      const subChunk = chunk.slice(j, j + READ_CHUNK);
      const refs = subChunk.map((rec) => col.doc(buildDocId(rec.listing.source, rec.listing.source_id)));
      const snaps = await db.getAll(...refs);
      snaps.forEach((snap) => {
        if (snap.exists) {
          const d = snap.data() || {};
          existingData.set(snap.id, {
            price_cents: typeof d.price_cents === 'number' ? d.price_cents : null,
            status: d.status || null,
          });
        }
      });
    }
    const existing = existingData;

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

      // Classify obvious non-tools (books, raw lumber, magazines, lots) so
      // they don't pollute the aggregator. Re-runs on every ingestion so the
      // detector and the catalog stay in sync — flipping a listing back to
      // `active` if the title was edited or the detector relaxed.
      //
      // The non-tool gate trumps everything: even a record asserting
      // `status: 'sold'` (e.g. Jim Bode Value Guide) is reclassified to
      // `excluded_non_tool` if the title trips the detector. Otherwise we
      // honor the caller-supplied status so terminal states like 'sold' and
      // 'active' both flow through the same write path.
      //
      // FieldValue.delete() is only legal in update() / set({merge:true}) —
      // never in a fresh set(). So we split: existing docs get a merge-set
      // that explicitly clears excluded_reason when the listing is no longer
      // a non-tool; new docs get a clean payload that just omits the field.
      const nonTool = classifyNonTool(rec.listing.title_raw);
      const status = nonTool.nonTool
        ? 'excluded_non_tool'
        : (rec.listing.status || 'active');
      const common = {
        ...rec.listing,
        status,
        scraped_at: runStartedAt,
        last_seen_at: runStartedAt,
      };
      if (nonTool.nonTool) common.excluded_reason = nonTool.reason;

      const isNew = !existing.has(id);
      const prior = existing.get(id);
      // Snapshot-write trigger: new doc, or price/status changed.
      const newPriceCents =
        typeof rec.listing.price_cents === 'number' ? rec.listing.price_cents : null;
      const priceChanged = !isNew && prior.price_cents !== newPriceCents;
      const statusChanged = !isNew && prior.status !== status;
      const writeSnapshot = isNew || priceChanged || statusChanged;

      if (isNew) {
        batch.set(listingRef, { ...common, first_seen_at: runStartedAt });
        inserted += 1;
      } else {
        const mergePayload = nonTool.nonTool
          ? common
          : { ...common, excluded_reason: admin.firestore.FieldValue.delete() };
        batch.set(listingRef, mergePayload, { merge: true });
        updated += 1;
      }

      // Raw payload — overwrite on every scrape. One raw doc per listing.
      batch.set(rawRef, {
        source: rec.listing.source,
        source_id: rec.listing.source_id,
        raw_format: rec.raw_format,
        raw: rec.raw,
        scraped_at: runStartedAt,
      });

      // Price-history snapshot. Append to subcollection — auto-id ensures
      // ordering happens via the `scraped_at` field rather than the doc id.
      if (writeSnapshot) {
        const snapRef = snapshotsRoot.doc(id).collection('snapshots').doc();
        batch.set(snapRef, {
          price_cents: newPriceCents,
          status,
          scraped_at: runStartedAt,
        });
        snapshots_written += 1;
      }
    }
    await batch.commit();
  }

  return { written: inserted + updated, inserted, updated, snapshots_written };
}

/**
 * Flip any `active` listings for `source` whose `last_seen_at` predates
 * `runStartedAt` to `status = "sold"`. Sets `sold_at = runStartedAt` (the
 * moment we noticed the listing disappeared — closest signal we have to
 * "when it sold"). Batched, paginated.
 *
 * Why "sold" instead of "expired" (changed 2026-05-03):
 * In dealer/forum/Reddit/FB classifieds, a listing disappearing almost
 * always means the seller transacted. Treating it as "expired" and
 * lumping it with active asking-prices in the priceStats build was a
 * silent mismatch — those rows ARE the sold comps we want to grow our
 * sold-block beyond just Jim Bode's Value Guide. eBay is the deliberate
 * exception: it doesn't run markExpired (rotation off the newlyListed
 * frontier ≠ sale; that gap is filled by a future eBay completed-
 * listings adapter).
 *
 * Caller contract: only invoke for sources where disappearance reliably
 * implies a sale. All current sources except eBay meet that bar; the
 * eBay scraper deliberately omits this call.
 *
 * @param {string} source
 * @param {FirebaseFirestore.Timestamp} runStartedAt
 * @returns {Promise<{expired:number}>} (key kept as `expired` for
 *   backwards compat with existing scheduled-function logging; the
 *   value reflects the count of rows transitioned out of `active`)
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
      batch.update(doc.ref, {
        status: 'sold',
        sold_at: runStartedAt,
      });
    });
    await batch.commit();
    expired += snap.size;
    lastDoc = snap.docs[snap.docs.length - 1];

    if (snap.size < UPSERT_CHUNK) break;
  }

  return { expired };
}

/**
 * Per-source lookup of the fields two-phase forum scrapes need: which threads
 * we already know, whether they were bumped, and their current status.
 * Returns Map<source_id, {lastPostAtMs:number|null, status:string|null}>.
 */
async function getListingMeta(source) {
  const db = admin.firestore();
  const snap = await db
    .collection(COLLECTION)
    .where('source', '==', source)
    .select('source_id', 'last_post_at', 'status')
    .get();
  const meta = new Map();
  snap.docs.forEach((d) => {
    const data = d.data();
    if (!data.source_id) return;
    const lp = data.last_post_at;
    meta.set(data.source_id, {
      lastPostAtMs: lp && typeof lp.toMillis === 'function' ? lp.toMillis() : null,
      status: data.status || null,
    });
  });
  return meta;
}

/**
 * Narrow partial update for already-ingested rows: only the supplied keys are
 * written, plus scraped_at/last_seen_at. Deliberately does NOT touch
 * description_raw, images, price_cents or the raw payload — those came from
 * the first detail fetch and re-writing them would cost a fetch we skipped.
 *
 * @param {Array<{source,source_id,status?,title_raw?,last_post_at?,sold_at?}>} updates
 */
async function applyListingUpdates(updates, runStartedAt) {
  if (!Array.isArray(updates) || updates.length === 0) return { updated: 0 };
  const db = admin.firestore();
  const col = db.collection(COLLECTION);
  const CHUNK = 200;
  let updated = 0;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK);
    const batch = db.batch();
    for (const u of chunk) {
      const patch = { scraped_at: runStartedAt, last_seen_at: runStartedAt };
      for (const k of ['status', 'title_raw', 'last_post_at', 'sold_at']) {
        if (u[k] !== undefined && u[k] !== null) patch[k] = u[k];
      }
      batch.update(col.doc(buildDocId(u.source, u.source_id)), patch);
    }
    await batch.commit();
    updated += chunk.length;
  }
  return { updated };
}

module.exports = {
  COLLECTION,
  RAW_COLLECTION,
  buildDocId,
  upsertListings,
  markExpired,
  getListingMeta,
  applyListingUpdates,
};
