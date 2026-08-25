-- ============================================================================
-- Indexes. Applied AFTER the bulk load -- building these during a 167k-row
-- import is dramatically slower than creating them once at the end.
--
-- Each index below is traceable to a real query. Nothing speculative: the
-- Firestore composite-index zoo is exactly what this migration is escaping,
-- and half of those indexes turned out not to be deployed anyway.
-- ============================================================================

-- --- Search -----------------------------------------------------------------
-- Primary relevance search. Replaces the hand-rolled token search.
CREATE INDEX listings_search_vector_idx ON listings USING gin (search_vector);

-- Typo tolerance and substring recall. This is the index that fixes the
-- "Stanley 112" class of miss, where tsvector stemming alone doesn't match
-- a model number embedded in a noisy title.
CREATE INDEX listings_title_trgm_idx ON listings USING gin (title_raw gin_trgm_ops);

-- --- Browse / facet filters -------------------------------------------------
CREATE INDEX listings_status_lastseen_idx  ON listings (status, last_seen_at DESC);
CREATE INDEX listings_status_type_idx      ON listings (status, canonical_type, last_seen_at DESC);
CREATE INDEX listings_status_brand_idx     ON listings (status, canonical_brand, last_seen_at DESC);
CREATE INDEX listings_source_lastseen_idx  ON listings (source, last_seen_at DESC);

CREATE INDEX listings_price_idx    ON listings (status, price_cents) WHERE price_cents IS NOT NULL;
CREATE INDEX listings_state_idx    ON listings (location_state)      WHERE location_state IS NOT NULL;
CREATE INDEX listings_posted_idx   ON listings (posted_at DESC)      WHERE posted_at IS NOT NULL;

-- --- Alert matching ---------------------------------------------------------
-- The matcher scans listings first seen since each alert's watermark. In
-- Firestore this was a scan; here it is an index range.
CREATE INDEX listings_firstseen_idx ON listings (first_seen_at DESC);

-- --- Price stats ------------------------------------------------------------
-- Sold-comp aggregation groups by cluster. Partial: the sold block is 34k of
-- 168k rows, so a partial index is a third the size and strictly faster.
CREATE INDEX listings_sold_cluster_idx
  ON listings (canonical_type, canonical_brand, canonical_size)
  WHERE status = 'sold';

-- Asking block is windowed on last_seen_at over active+expired.
CREATE INDEX listings_asking_cluster_idx
  ON listings (canonical_type, canonical_brand, last_seen_at DESC)
  WHERE status IN ('active', 'expired');

-- --- Supporting tables ------------------------------------------------------
CREATE INDEX listings_raw_source_idx ON listings_raw (source, source_id);
CREATE INDEX price_stats_type_brand_idx ON price_stats (canonical_type, canonical_brand);
CREATE INDEX alerts_email_idx ON alerts (email) WHERE email_enabled;
CREATE INDEX email_sends_created_idx ON email_sends (created_at DESC);
CREATE INDEX email_sends_template_status_idx ON email_sends (template_id, status);
CREATE INDEX training_examples_cluster_idx ON training_examples (cluster_key);
CREATE INDEX training_examples_type_idx ON training_examples (canonical_type);

-- Planner needs fresh stats immediately after a bulk load; autovacuum won't
-- have run yet and the first queries would otherwise get bad plans.
ANALYZE listings;
ANALYZE listings_raw;
ANALYZE price_stats;
ANALYZE training_examples;
