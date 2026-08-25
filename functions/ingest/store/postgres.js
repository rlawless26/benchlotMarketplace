/**
 * Postgres implementation of the ingest write layer.
 *
 * Behaviour-compatible with the Firestore implementation in
 * ../externalListings.js -- same function signatures, same return shapes, same
 * lifecycle semantics -- so scraper parse logic needs no changes. See
 * ../SCHEMA.md for field definitions.
 *
 * THREE deliberate differences from the Firestore version, each load-bearing:
 *
 * 1. CANONICAL FIELDS ARE NEVER OVERWRITTEN WITH NULL.
 *    Scrapers emit `canonical_brand: null, canonical_type: null, ...` on every
 *    run. Under Firestore that was harmless: the write fired an on-document
 *    trigger that immediately re-normalized the row. Postgres has no such
 *    trigger, so copying that behaviour would wipe normalization off every
 *    listing it touched. Here a scraper's NULL never clobbers a normalized
 *    value -- normalization is a separate batch job that owns those columns.
 *    This is also what removes the per-write LLM call that made the Firestore
 *    normalizer expensive: re-scraping an unchanged listing no longer dirties
 *    the canonical fields, so nothing needs re-normalizing.
 *
 * 2. FIELDS A SCRAPER OMITS ARE PRESERVED, NOT NULLED.
 *    Firestore's `merge: true` only touches supplied keys. SQL's EXCLUDED
 *    supplies NULL for anything absent, which would erase `sold_at` on every
 *    re-scrape of a sold listing and `last_post_at` on every forum thread.
 *    Those columns use COALESCE(EXCLUDED, existing).
 *
 * 3. RAW PAYLOADS ARE OPTIONAL.
 *    `listings_raw` is not loaded on the current Neon plan (see
 *    migration/README.md). Raw writes are skipped when the table is absent
 *    rather than failing the run, and `rawSkipped` is reported so a silently
 *    degraded run is visible instead of invisible.
 */

const { Pool } = require('pg');
const { classifyNonTool } = require('../heuristics');

let pool = null;
let rawTablePresent = null; // null = not yet probed

function getPool() {
  if (pool) return pool;
  // Bulk writes and any session state want the DIRECT connection; PgBouncer's
  // transaction mode is fine for single statements but not worth the risk here.
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  pool = new Pool({ connectionString, max: 4, idleTimeoutMillis: 10_000 });
  return pool;
}

async function hasRawTable() {
  if (rawTablePresent !== null) return rawTablePresent;
  const { rows } = await getPool().query(`SELECT to_regclass('public.listings_raw') AS t`);
  rawTablePresent = rows[0].t !== null;
  return rawTablePresent;
}

/** Unchanged from the Firestore layer: scrapers still build ids this way. */
function buildDocId(source, sourceId) {
  if (!source || !sourceId) throw new Error('buildDocId requires source and sourceId');
  return `${source}__${sourceId}`;
}

/** Firestore Timestamp | Date | ISO string -> ISO string for pg. */
function toIso(v) {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/**
 * Columns a scrape is authoritative for. Everything else on the row -- the
 * canonical_* family, normalizer bookkeeping, sold_at, last_post_at -- is owned
 * by something other than the scraper and must survive an upsert.
 */
const SCRAPED_COLUMNS = [
  'source_url', 'title_raw', 'description_raw', 'price_cents', 'currency',
  'condition_raw', 'images', 'posted_at', 'tags', 'location_state',
  'location_display', 'heuristic_brand', 'heuristic_type', 'status',
  'excluded_reason', 'scraped_at', 'last_seen_at',
];

const UPSERT_SQL = `
WITH input AS (
  SELECT
    r->>'source'            AS source,
    r->>'source_id'         AS source_id,
    r->>'source_url'        AS source_url,
    r->>'title_raw'         AS title_raw,
    r->>'description_raw'   AS description_raw,
    (r->>'price_cents')::numeric::integer AS price_cents,
    coalesce(r->>'currency', 'USD')       AS currency,
    r->>'condition_raw'     AS condition_raw,
    ARRAY(SELECT jsonb_array_elements_text(coalesce(r->'images', '[]'::jsonb))) AS images,
    (r->>'posted_at')::timestamptz        AS posted_at,
    ARRAY(SELECT jsonb_array_elements_text(coalesce(r->'tags', '[]'::jsonb)))   AS tags,
    r->>'location_state'    AS location_state,
    r->>'location_display'  AS location_display,
    r->>'heuristic_brand'   AS heuristic_brand,
    r->>'heuristic_type'    AS heuristic_type,
    (r->>'status')::listing_status        AS status,
    r->>'excluded_reason'   AS excluded_reason,
    (r->>'sold_at')::timestamptz          AS sold_at,
    (r->>'last_post_at')::timestamptz     AS last_post_at,
    r->>'raw_format'        AS raw_format,
    r->'raw'                AS raw
  FROM jsonb_array_elements($1::jsonb) AS r
),
prior AS (
  SELECT l.source, l.source_id, l.price_cents, l.status
  FROM listings l
  JOIN input i ON i.source = l.source AND i.source_id = l.source_id
),
ups AS (
  INSERT INTO listings (
    source, source_id, source_url, title_raw, description_raw, price_cents,
    currency, condition_raw, images, posted_at, tags, location_state,
    location_display, heuristic_brand, heuristic_type, status, excluded_reason,
    scraped_at, first_seen_at, last_seen_at, sold_at, last_post_at)
  SELECT
    source, source_id, source_url, title_raw, description_raw, price_cents,
    currency, condition_raw, images, posted_at, tags, location_state,
    location_display, heuristic_brand, heuristic_type, status, excluded_reason,
    $2::timestamptz, $2::timestamptz, $2::timestamptz, sold_at, last_post_at
  FROM input
  ON CONFLICT (source, source_id) DO UPDATE SET
    source_url       = EXCLUDED.source_url,
    title_raw        = EXCLUDED.title_raw,
    description_raw  = EXCLUDED.description_raw,
    price_cents      = EXCLUDED.price_cents,
    currency         = EXCLUDED.currency,
    condition_raw    = EXCLUDED.condition_raw,
    images           = EXCLUDED.images,
    posted_at        = EXCLUDED.posted_at,
    tags             = EXCLUDED.tags,
    location_state   = EXCLUDED.location_state,
    location_display = EXCLUDED.location_display,
    heuristic_brand  = EXCLUDED.heuristic_brand,
    heuristic_type   = EXCLUDED.heuristic_type,
    status           = EXCLUDED.status,
    excluded_reason  = EXCLUDED.excluded_reason,
    scraped_at       = EXCLUDED.scraped_at,
    last_seen_at     = EXCLUDED.last_seen_at,
    -- Owned by the scrape only when it actually supplies a value.
    sold_at          = COALESCE(EXCLUDED.sold_at, listings.sold_at),
    last_post_at     = COALESCE(EXCLUDED.last_post_at, listings.last_post_at)
    -- first_seen_at is deliberately absent: set once, never updated.
    -- canonical_*, era_estimate, plane_type_number, normalizer_model and
    -- normalized_at are deliberately absent: owned by the normalizer.
  RETURNING id, source, source_id, price_cents, status, (xmax = 0) AS was_insert
),
snaps AS (
  INSERT INTO price_snapshots (listing_id, source, source_id, price_cents, status, scraped_at)
  SELECT u.id, u.source, u.source_id, u.price_cents, u.status::text, $2::timestamptz
  FROM ups u
  LEFT JOIN prior p ON p.source = u.source AND p.source_id = u.source_id
  -- New listing, or price/status actually moved. IS DISTINCT FROM so a
  -- NULL <-> value transition counts as a change.
  WHERE p.source IS NULL
     OR p.price_cents IS DISTINCT FROM u.price_cents
     OR p.status     IS DISTINCT FROM u.status
  ON CONFLICT (source, source_id, scraped_at) DO NOTHING
  RETURNING 1
)
SELECT
  (SELECT count(*) FROM ups)::int                        AS written,
  (SELECT count(*) FROM ups WHERE was_insert)::int       AS inserted,
  (SELECT count(*) FROM ups WHERE NOT was_insert)::int   AS updated,
  (SELECT count(*) FROM snaps)::int                      AS snapshots_written`;

const RAW_SQL = `
INSERT INTO listings_raw (listing_id, source, source_id, raw_format, raw, scraped_at)
SELECT l.id, i.source, i.source_id, i.raw_format, i.raw, $2::timestamptz
FROM jsonb_array_elements($1::jsonb) AS r
CROSS JOIN LATERAL (SELECT r->>'source' AS source, r->>'source_id' AS source_id,
                           r->>'raw_format' AS raw_format, r->'raw' AS raw) i
JOIN listings l ON l.source = i.source AND l.source_id = i.source_id
WHERE i.raw IS NOT NULL
ON CONFLICT (listing_id) DO UPDATE SET
  raw_format = EXCLUDED.raw_format,
  raw        = EXCLUDED.raw,
  scraped_at = EXCLUDED.scraped_at`;

/** Matches the Firestore layer's chunking so memory profile stays comparable. */
const UPSERT_CHUNK = 500;

async function upsertListings(records, runStartedAt) {
  if (!Array.isArray(records) || records.length === 0) {
    return { written: 0, inserted: 0, updated: 0, snapshots_written: 0, rawSkipped: 0 };
  }

  const at = toIso(runStartedAt) || new Date().toISOString();
  const client = getPool();
  const writeRaw = await hasRawTable();

  const totals = { written: 0, inserted: 0, updated: 0, snapshots_written: 0, rawSkipped: 0 };

  for (let i = 0; i < records.length; i += UPSERT_CHUNK) {
    const chunk = records.slice(i, i + UPSERT_CHUNK);

    const payload = chunk.map((rec) => {
      if (!rec || !rec.listing) {
        throw new Error('upsertListings: each record must have a `listing` field');
      }
      if (!rec.raw_format) {
        throw new Error('upsertListings: each record must have a `raw_format` field');
      }
      // Same gate as the Firestore layer: the non-tool classifier trumps any
      // caller-supplied status, including a terminal 'sold'.
      const nonTool = classifyNonTool(rec.listing.title_raw);
      const status = nonTool.nonTool ? 'excluded_non_tool' : rec.listing.status || 'active';

      return {
        ...rec.listing,
        status,
        excluded_reason: nonTool.nonTool ? nonTool.reason : null,
        posted_at: toIso(rec.listing.posted_at),
        sold_at: toIso(rec.listing.sold_at),
        last_post_at: toIso(rec.listing.last_post_at),
        raw_format: rec.raw_format,
        raw: writeRaw ? rec.raw ?? null : null,
      };
    });

    const json = JSON.stringify(payload);
    const { rows } = await client.query(UPSERT_SQL, [json, at]);
    const r = rows[0];
    totals.written += r.written;
    totals.inserted += r.inserted;
    totals.updated += r.updated;
    totals.snapshots_written += r.snapshots_written;

    if (writeRaw) {
      await client.query(RAW_SQL, [json, at]);
    } else {
      totals.rawSkipped += chunk.length;
    }
  }

  return totals;
}

/**
 * Flip `active` listings for `source` last seen before this run to `sold`.
 * Same contract as the Firestore version, including the `expired` key name.
 * In Firestore this was a paginated read-then-batch-write loop; here it is one
 * statement.
 */
async function markExpired(source, runStartedAt) {
  const at = toIso(runStartedAt) || new Date().toISOString();
  const { rowCount } = await getPool().query(
    `UPDATE listings
        SET status = 'sold', sold_at = $2::timestamptz
      WHERE source = $1 AND status = 'active' AND last_seen_at < $2::timestamptz`,
    [source, at]
  );
  return { expired: rowCount };
}

/**
 * Per-source scrape bookkeeping. Firestore had no equivalent, which is why a
 * deliberately-paused source and a silently-broken one were indistinguishable.
 */
async function recordScrapeRun(source, { ok, note } = {}) {
  await getPool().query(
    `UPDATE sources
        SET last_scraped_at = now(), last_scrape_ok = $2, last_scrape_note = $3
      WHERE id = $1`,
    [source, ok !== false, note ?? null]
  );
}

/**
 * Per-source lookup for two-phase forum scrapes: which threads we already
 * know, whether they were bumped, and their current status. Same shape as the
 * Firestore implementation — Map<source_id, {lastPostAtMs, status}>.
 */
async function getListingMeta(source) {
  const { rows } = await getPool().query(
    `SELECT source_id, last_post_at, status::text AS status
       FROM listings WHERE source = $1`,
    [source]
  );
  const meta = new Map();
  for (const r of rows) {
    meta.set(r.source_id, {
      lastPostAtMs: r.last_post_at ? new Date(r.last_post_at).getTime() : null,
      status: r.status || null,
    });
  }
  return meta;
}

/**
 * Narrow partial update for already-ingested rows. COALESCE gives the same
 * "only write the keys supplied" semantics as the Firestore version, so a
 * touch-only pass can't blank a column it wasn't asked to change.
 *
 * Deliberately does NOT touch description_raw, images, price_cents or the raw
 * payload: those came from the first detail fetch, which this pass skipped.
 *
 * @param {Array<{source,source_id,status?,title_raw?,last_post_at?,sold_at?}>} updates
 */
async function applyListingUpdates(updates, runStartedAt) {
  if (!Array.isArray(updates) || updates.length === 0) return { updated: 0 };
  const at = toIso(runStartedAt) || new Date().toISOString();

  const payload = updates.map((u) => ({
    source: u.source,
    source_id: u.source_id,
    status: u.status ?? null,
    title_raw: u.title_raw ?? null,
    last_post_at: toIso(u.last_post_at),
    sold_at: toIso(u.sold_at),
  }));

  const { rowCount } = await getPool().query(
    `UPDATE listings l SET
        status       = COALESCE((u->>'status')::listing_status, l.status),
        title_raw    = COALESCE(u->>'title_raw', l.title_raw),
        last_post_at = COALESCE((u->>'last_post_at')::timestamptz, l.last_post_at),
        sold_at      = COALESCE((u->>'sold_at')::timestamptz, l.sold_at),
        scraped_at   = $2::timestamptz,
        last_seen_at = $2::timestamptz
      FROM jsonb_array_elements($1::jsonb) AS u
      WHERE l.source = u->>'source' AND l.source_id = u->>'source_id'`,
    [JSON.stringify(payload), at]
  );
  return { updated: rowCount };
}

async function close() {
  if (pool) { await pool.end(); pool = null; }
}

module.exports = {
  COLLECTION: 'listings',
  RAW_COLLECTION: 'listings_raw',
  buildDocId,
  upsertListings,
  markExpired,
  getListingMeta,
  applyListingUpdates,
  recordScrapeRun,
  close,
  SCRAPED_COLUMNS,
};
