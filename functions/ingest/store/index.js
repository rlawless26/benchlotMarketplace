/**
 * Backend selector for the ingest write layer.
 *
 * Scrapers import this (via ../externalListings.js) and never learn which
 * database they are writing to. Switch with:
 *
 *   BENCHLOT_STORE=postgres    # Neon — the default
 *   BENCHLOT_STORE=firestore   # legacy, read-only in practice
 *
 * The default flipped to `postgres` when ingest left Cloud Functions
 * (.github/workflows/ingest.yml). No scheduled function calls this layer any
 * more, so the only remaining callers are the worker and the per-source CLI
 * runners in ../run-*.js — and for those, defaulting to Firestore would write
 * a catalogue nothing reads. `firestore` is kept selectable for the regression
 * test that pins the re-normalization guard.
 */

const BACKEND = (process.env.BENCHLOT_STORE || 'postgres').toLowerCase();

if (!['firestore', 'postgres'].includes(BACKEND)) {
  throw new Error(
    `BENCHLOT_STORE must be "firestore" or "postgres", got "${BACKEND}"`
  );
}

// eslint-disable-next-line import/no-dynamic-require
const impl = BACKEND === 'postgres' ? require('./postgres') : require('./firestore');

/**
 * Not every backend implements every hook. Firestore has no per-source scrape
 * bookkeeping (that gap is precisely why a paused source and a broken one were
 * indistinguishable), so calls to it are no-ops there rather than crashes.
 */
const noop = async () => {};

module.exports = {
  BACKEND,
  COLLECTION: impl.COLLECTION,
  RAW_COLLECTION: impl.RAW_COLLECTION,
  buildDocId: impl.buildDocId,
  upsertListings: impl.upsertListings,
  markExpired: impl.markExpired,
  // Postgres-only, safe to call on either backend.
  recordScrapeRun: impl.recordScrapeRun || noop,
  // Two-phase forum scrapes (woodnet, sawmillcreek, reddit) need these.
  getListingMeta: impl.getListingMeta,
  applyListingUpdates: impl.applyListingUpdates,
  close: impl.close || noop,
};
