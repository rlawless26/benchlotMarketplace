-- ============================================================================
-- Benchlot: Firestore -> Postgres, core schema.
--
-- Fitted to the LIVE Firestore data (profiled 2026-08-25), not to
-- functions/ingest/SCHEMA.md, which is stale: the real documents also carry
-- plane_type_number, normalizer_model, normalized_at and excluded_reason.
--
-- Shaped around the three workloads that drove the move off Firestore:
--   1. search      -> tsvector + pg_trgm on listings
--   2. price stats -> aggregation over listings grouped by cluster
--   3. alert match -> one predicate query over listings
--
-- Indexes live in 002_indexes.sql and are applied AFTER the bulk load; building
-- them up front would slow the 167k-row import by an order of magnitude.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- gen_random_bytes(), used for alert unsubscribe tokens. (gen_random_uuid() is
-- core since PG13, but gen_random_bytes() still lives in pgcrypto.)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- sources: the registry currently hard-coded in src/firebase/adapters/sources.js
-- ---------------------------------------------------------------------------
CREATE TYPE source_kind AS ENUM ('Dealer', 'Forum', 'Reddit', 'Marketplace', 'Auction');

CREATE TABLE sources (
  id           text PRIMARY KEY,
  name         text        NOT NULL,
  short_name   text        NOT NULL,
  kind         source_kind NOT NULL,
  descriptor   text,
  home_url     text,
  -- Purely a UI concern: does aggregator search render this source? Sold-archive
  -- sources are indexed=false but still feed price stats. Preserved from sources.js.
  indexed      boolean     NOT NULL DEFAULT true,
  -- Set by the scrapers; powers per-source freshness monitoring and the
  -- dead-man's-switch alert. Firestore had no equivalent, which is why nobody
  -- noticed sources going stale.
  last_scraped_at timestamptz,
  last_scrape_ok  boolean,
  last_scrape_note text
);

-- ---------------------------------------------------------------------------
-- listings: 167,850 rows at migration time.
-- ---------------------------------------------------------------------------
CREATE TYPE listing_status AS ENUM ('active', 'sold', 'expired', 'excluded_non_tool');

CREATE TABLE listings (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Provenance. (source, source_id) reproduces the Firestore doc id
  -- `${source}__${source_id}` and keeps scraper upserts idempotent.
  source            text NOT NULL REFERENCES sources(id),
  source_id         text NOT NULL,
  source_url        text NOT NULL,

  -- Raw listing fields, as scraped.
  title_raw         text NOT NULL,
  description_raw   text,
  price_cents       integer,
  currency          text NOT NULL DEFAULT 'USD',
  condition_raw     text,
  images            text[] NOT NULL DEFAULT '{}',
  posted_at         timestamptz,
  tags              text[] NOT NULL DEFAULT '{}',

  -- Location. US-only in v1; kept as free text rather than char(2) so a
  -- future UK/EU toggle doesn't need a type change.
  location_state    text,
  location_display  text,

  -- Ingest-time keyword heuristics; seed hints for the normalizer.
  heuristic_brand   text,
  heuristic_type    text,

  -- Normalizer output. canonical_brand is free-form by design (577 distinct
  -- values in an 8k sample) so long-tail makers survive; canonical_type is a
  -- closed vocabulary, though the live data has drifted (see 003_seed_sources.sql).
  canonical_brand   text,
  canonical_type    text,
  canonical_model   text,
  canonical_size    text,
  era_estimate      text,
  plane_type_number smallint,
  normalizer_model  text,
  normalized_at     timestamptz,

  -- Lifecycle.
  status            listing_status NOT NULL,
  excluded_reason   text,
  scraped_at        timestamptz NOT NULL,
  first_seen_at     timestamptz NOT NULL,
  last_seen_at      timestamptz NOT NULL,
  -- Populated when a source publishes an authoritative sale date, OR by the
  -- markExpired sweep (disappearance == sold for dealer/forum/FBM sources).
  -- Deliberately NULL for jimbode_valueguide: Shopify updated_at reflects bulk
  -- admin touches, not sales. Do not backfill it with a guess.
  sold_at           timestamptz,
  -- Forum sources only: most recent reply, drives bumped-thread re-scan.
  last_post_at      timestamptz,

  -- Full-text search. Weighted so a title hit outranks a description hit.
  -- Replaces the hand-rolled Firestore token search.
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title_raw, '')), 'A') ||
    setweight(to_tsvector('english',
      coalesce(canonical_brand, '') || ' ' ||
      coalesce(canonical_type,  '') || ' ' ||
      coalesce(canonical_model, '') || ' ' ||
      coalesce(canonical_size,  '')), 'B') ||
    setweight(to_tsvector('english', coalesce(heuristic_brand, '') || ' ' ||
                                     coalesce(heuristic_type, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(description_raw, '')), 'D')
  ) STORED,

  CONSTRAINT listings_source_uniq UNIQUE (source, source_id)
);

-- ---------------------------------------------------------------------------
-- listings_raw: untouched source payload, so a future normalizer version can
-- re-derive canonical fields without re-scraping. Separate table for the same
-- reason it was a separate Firestore collection: search never needs it.
-- NOTE: ~168k JSONB payloads. Sized and loaded last -- see migration/README.md.
-- ---------------------------------------------------------------------------
CREATE TABLE listings_raw (
  listing_id  bigint PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  source      text  NOT NULL,
  source_id   text  NOT NULL,
  raw_format  text  NOT NULL,
  raw         jsonb NOT NULL,
  scraped_at  timestamptz NOT NULL
);

-- ---------------------------------------------------------------------------
-- price_stats: 60,957 pre-aggregated cluster rows carried over as-is to
-- preserve continuity and give the SQL rewrite something to diff against.
-- Intended to become a materialized view over listings once validated.
-- ---------------------------------------------------------------------------
CREATE TABLE price_stats (
  cluster_key          text PRIMARY KEY,
  canonical_type       text,
  canonical_brand      text,
  canonical_model      text,
  canonical_size       text,
  plane_type_number    smallint,
  grain                text,

  asking_count         integer,
  asking_count_active  integer,
  asking_count_expired integer,
  asking_mean          numeric,
  asking_p10           numeric,
  asking_p25           numeric,
  asking_p50           numeric,
  asking_p75           numeric,
  asking_p90           numeric,
  asking_window_days   integer,
  asking_by_kind       jsonb,

  sold_count           integer,
  sold_mean            numeric,
  sold_p10             numeric,
  sold_p25             numeric,
  sold_p50             numeric,
  sold_p75             numeric,
  sold_p90             numeric,
  sold_window_days     integer,
  sold_by_kind         jsonb,

  last_built_at        timestamptz
);

-- ---------------------------------------------------------------------------
-- alerts: saved searches. Per the target architecture there is NO auth system --
-- an alert is an email address plus signed manage/unsubscribe links. The
-- Firebase userId is retained only so the 2 migrated rows stay traceable.
-- ---------------------------------------------------------------------------
CREATE TABLE alerts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email              text NOT NULL,
  query              text NOT NULL DEFAULT '',
  filters            jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort               text NOT NULL DEFAULT 'best',
  -- Stable identity of (query, filters, sort); dedupes repeat saves.
  hash               text NOT NULL,
  email_enabled      boolean NOT NULL DEFAULT true,
  -- Signed-link secret for manage/unsubscribe without an account.
  unsubscribe_token  text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at         timestamptz NOT NULL DEFAULT now(),
  -- Watermark: matcher only considers listings first seen after this.
  last_matched_at    timestamptz,
  legacy_user_id     text
);

-- ---------------------------------------------------------------------------
-- email_sends: the email_log equivalent. Ground truth for what actually sent.
-- ---------------------------------------------------------------------------
CREATE TABLE email_sends (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  template_id       text NOT NULL,
  to_address        text NOT NULL,
  subject           text,
  vars              jsonb,
  status            text NOT NULL,   -- dry-run | queued | sent | error
  attempts          integer NOT NULL DEFAULT 0,
  resend_message_id text,
  error_message     text,
  created_at        timestamptz NOT NULL,
  sent_at           timestamptz
);

-- ---------------------------------------------------------------------------
-- tool_scans + training_examples: the ToolScan corpus. Carried across because
-- the 10,822-pair labeled corpus is IP that would be expensive to rebuild.
-- image_path points at Firebase Storage; objects are NOT moved by this migration.
-- ---------------------------------------------------------------------------
CREATE TABLE tool_scans (
  id               text PRIMARY KEY,
  user_id          text,
  image_count      integer,
  tool_count       integer,
  context          text,
  results          jsonb,
  model            text,
  usage            jsonb,
  image_paths      text[],
  previous_scan_id text,
  created_at       timestamptz NOT NULL
);

CREATE TABLE training_examples (
  id                 text PRIMARY KEY,
  image_path         text NOT NULL,
  image_content_type text,
  image_bytes        integer,
  source             text,
  source_id          text,
  source_url         text,
  listing_source     text,
  canonical_brand    text,
  canonical_type     text,
  canonical_model    text,
  canonical_size     text,
  plane_type_number  smallint,
  era_estimate       text,
  condition          text,
  label_provenance   text,
  label_confidence   text,
  cluster_key        text,
  notable            text,
  why_good_test      text,
  added_at           timestamptz
);
