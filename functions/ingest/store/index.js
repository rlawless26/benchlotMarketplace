/**
 * Backend selector for the ingest write layer.
 *
 * Scrapers import this (via ../externalListings.js) and never learn which
 * database they are writing to. Switch with:
 *
 *   BENCHLOT_STORE=postgres    # Neon — the target architecture
 *   BENCHLOT_STORE=firestore   # legacy, still the default
 *
 * The default stays `firestore` on purpose: the deployed Cloud Functions must
 * keep behaving exactly as they do today until a run has been verified against
 * Postgres. Flip via env, not by editing code.
 */

const BACKEND = (process.env.BENCHLOT_STORE || 'firestore').toLowerCase();

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
