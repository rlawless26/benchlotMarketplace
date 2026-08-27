-- ============================================================================
-- Normalization provenance + heuristic backfill.
--
-- Only 26% of the corpus reaches the price guide, because
-- pricestats/build.js:isQualifyingSample() requires BOTH canonical_type and a
-- canonical_brand that isn't 'Unknown'. The blocker is normalization coverage:
-- 167,931 listings, 93,418 ever normalized, and 31,087 of those runs returned
-- a NULL type on titles like "CLIFTON No. 3 Plane" that the free keyword
-- heuristic classifies correctly.
--
-- The heuristic already holds a usable type for 77,370 listings with none.
-- Every one of those labels is already in CANONICAL_TYPES, so the backfill
-- needs no mapping table and invents no vocabulary.
--
-- canonical_* stays a single populated column (the SQL stats port reads it
-- directly, no COALESCE at every call site) and the *_source columns record
-- where each value came from, so:
--   - provenance is never lost
--   - the LLM normalizer can later target exactly source='heuristic' rows
--   - the whole backfill reverts with one UPDATE
-- ============================================================================

CREATE TYPE normalization_source AS ENUM ('llm', 'heuristic');

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS canonical_type_source  normalization_source,
  ADD COLUMN IF NOT EXISTS canonical_brand_source normalization_source;

-- NOTE: DDL only. Adding nullable columns without a default is instant in
-- PG11+ (catalog-only, no table rewrite), but the provenance marking and the
-- heuristic backfill each rewrite tens of thousands of rows, and every rewrite
-- leaves a dead tuple behind. On the 512 MB Neon free tier a single UPDATE of
-- that size exhausts the quota mid-statement and rolls back. Both run from
-- migration/backfill-normalization.js instead, batched with a VACUUM between
-- batches so dead space is reused rather than accumulated.

CREATE INDEX IF NOT EXISTS listings_type_source_idx
  ON listings (canonical_type_source) WHERE canonical_type_source = 'heuristic';
