-- ============================================================================
-- 015 — IndexNow submission log (growth plan B11).
--
-- Bing (and through it ChatGPT search and DuckDuckGo) accept IndexNow pings
-- for changed URLs. The nightly stats rebuild touches every price_stats row,
-- so "last_built_at changed" is not a change signal; a hash of the numbers
-- the page shows is. scripts/indexnow-submit.js submits only URLs whose hash
-- differs from the last successful submission, and everything on first run.
-- ============================================================================
CREATE TABLE IF NOT EXISTS indexnow_submissions (
  url          text PRIMARY KEY,
  content_hash text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  status       smallint
);
