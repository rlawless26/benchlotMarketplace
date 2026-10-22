-- ============================================================================
-- 014 — API keys and request log for the public data layer (/api/v1, /mcp).
--
-- Keys are optional: an anonymous caller gets a low per-minute limit keyed on
-- a salted hash of its IP; a key raises the limit and makes usage attributable
-- to a named client. Keys are free. There is no payment anywhere in this
-- schema and none is planned — see docs/growth-plan.md and the public promise
-- in BENCHLOT-HANDOFF.md §3.3.
--
-- The key itself is never stored: `key_hash` is sha256 of the full key, and
-- `key_prefix` is the first characters for display ("bl_live_3f9a…").
--
-- api_requests is both the rate limiter's counter and the usage log. One
-- INSERT per call; the status and latency are patched in after the response.
-- Rows older than 90 days can be deleted freely (nothing references them).
--
-- Apply: node migration/apply.js schema/014_api_keys.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_prefix         text NOT NULL,
  key_hash           text NOT NULL UNIQUE,
  name               text NOT NULL,
  email              text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  last_used_at       timestamptz,
  rate_limit_per_min int NOT NULL DEFAULT 120,
  revoked_at         timestamptz,
  created_ip         text,
  note               text
);

CREATE INDEX IF NOT EXISTS api_keys_email_idx ON api_keys (lower(email));

CREATE TABLE IF NOT EXISTS api_requests (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  key_id     uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  ip_hash    text,                              -- sha256(ip + API_IP_SALT); never the IP
  surface    text NOT NULL CHECK (surface IN ('rest', 'mcp')),
  route      text NOT NULL,                     -- '/api/v1/prices' | 'mcp:get_price_guide'
  status     smallint,
  ms         int,
  user_agent text
);

CREATE INDEX IF NOT EXISTS api_requests_key_created_idx
  ON api_requests (key_id, created_at DESC) WHERE key_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS api_requests_ip_created_idx
  ON api_requests (ip_hash, created_at DESC) WHERE ip_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS api_requests_created_idx
  ON api_requests (created_at DESC);
