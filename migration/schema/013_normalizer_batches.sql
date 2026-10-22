-- ============================================================================
-- 013 — Normalizer attempt tracking, Batch API bookkeeping, coverage snapshots.
--
-- Why. The normalizer selects on `canonical_type IS NULL`. A title whose call
-- throws (credit exhaustion, 5xx after retries, a dropped Neon connection) or
-- comes back without a type is left exactly as it was found, so the next pass
-- bills it again, forever. functions/normalize/run-postgres.js now records
-- every failed attempt here and skips a title after three.
--
-- The same script gains a Message Batches mode (50% of standard pricing,
-- results within 24h). A submitted batch is not a result, so the tables below
-- remember what was sent and let `--collect` write the answers back later,
-- keyed by the title, not the listing id — rows normalized by another path in
-- between are left alone.
--
-- coverage_snapshots is written nightly by scripts/coverage-report.js and read
-- by the API's /api/v1/meta, which must never scan `listings` live
-- (bl_is_junk/bl_is_lot per row on 170k rows is a multi-second query).
--
-- Apply with the UNPOOLED connection:
--   psql "$DATABASE_URL_UNPOOLED" -f migration/schema/013_normalizer_batches.sql
-- ============================================================================

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS normalize_attempts        smallint    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS normalize_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS normalize_last_error      text;

-- The selection query's filter, so the backlog scan never touches typed rows.
CREATE INDEX IF NOT EXISTS listings_unnormalized_idx
  ON listings (normalize_last_attempt_at)
  WHERE canonical_type IS NULL AND status <> 'excluded_non_tool';

-- `--collect` writes results by title key. Without this the UPDATE ... FROM
-- join is a sequential scan per chunk.
CREATE INDEX IF NOT EXISTS listings_title_key_unnormalized_idx
  ON listings (lower(btrim(title_raw)))
  WHERE canonical_type IS NULL;

CREATE TABLE IF NOT EXISTS normalize_batches (
  id                 text PRIMARY KEY,              -- Anthropic id, msgbatch_...
  model              text NOT NULL,
  submitted_at       timestamptz NOT NULL DEFAULT now(),
  collected_at       timestamptz,
  status             text NOT NULL DEFAULT 'submitted'
                     CHECK (status IN ('submitted', 'ended', 'collected', 'failed')),
  request_count      int NOT NULL,
  estimated_cost_usd numeric(8,4),
  actual_cost_usd    numeric(8,4),
  flags              text                           -- argv that produced it
);

CREATE TABLE IF NOT EXISTS normalize_batch_items (
  batch_id  text NOT NULL REFERENCES normalize_batches(id) ON DELETE CASCADE,
  custom_id text NOT NULL,                          -- sha1(title_key), 40 chars
  title_key text NOT NULL,                          -- lower(btrim(title_raw))
  status    text NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'succeeded', 'errored', 'expired', 'no_type')),
  error     text,
  PRIMARY KEY (batch_id, custom_id)
);

CREATE INDEX IF NOT EXISTS normalize_batch_items_pending_idx
  ON normalize_batch_items (batch_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS coverage_snapshots (
  taken_at             timestamptz PRIMARY KEY DEFAULT now(),
  pct_typed            numeric(5,4) NOT NULL,
  pct_price_guide      numeric(5,4) NOT NULL,
  total                bigint NOT NULL,
  typed                bigint NOT NULL,
  price_guide          bigint NOT NULL,
  unnormalized_titles  bigint NOT NULL,
  attempts_exhausted   bigint NOT NULL,
  pending_batch_items  bigint NOT NULL DEFAULT 0,
  by_source            jsonb NOT NULL DEFAULT '{}'::jsonb,
  by_status            jsonb NOT NULL DEFAULT '{}'::jsonb
);
