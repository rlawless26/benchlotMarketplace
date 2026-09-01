-- ============================================================================
-- Alerts without accounts.
--
-- Per BENCHLOT-HANDOFF.md §4 there is no auth system: an alert is an email
-- address plus signed links. Today the CRA app requires a Firebase account to
-- save a search — SaveAlertButton stashes the intent in sessionStorage and
-- opens the auth modal — which is exactly the friction the r/handtools thread
-- called out, where "no signup needed" was the selling point.
--
-- Double opt-in. Without an account nothing proves the address belongs to the
-- person typing it, so an unconfirmed alert can be abuse, and complaints from
-- people who never signed up damage deliverability for notifications@ across
-- every recipient. Email IS the retention mechanism here; protecting the
-- sending domain matters more than saving one click.
-- ============================================================================

ALTER TABLE alerts
  -- Null until the confirmation link is clicked. The matcher only ever sends
  -- to confirmed alerts.
  ADD COLUMN IF NOT EXISTS confirmed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS confirm_token  text,
  ADD COLUMN IF NOT EXISTS last_sent_at   timestamptz,

  -- Cluster scoping. The legacy `query`/`filters` shape mirrors the old search
  -- UI; alerts now originate on a price-guide page, so the natural subject is
  -- "this tool" plus an optional ceiling. Explicit columns rather than more
  -- jsonb because the matcher becomes a plain indexed SQL predicate.
  ADD COLUMN IF NOT EXISTS canonical_type  text,
  ADD COLUMN IF NOT EXISTS canonical_brand text,
  ADD COLUMN IF NOT EXISTS canonical_size  text,
  ADD COLUMN IF NOT EXISTS max_price_cents integer,

  -- Abuse control: one confirmed alert per address per cluster, and a cap on
  -- how many unconfirmed rows a single address can create.
  ADD COLUMN IF NOT EXISTS created_ip text;

-- The two migrated rows are the owner's own and predate confirmation; treat
-- them as confirmed so the matcher doesn't silently drop them.
UPDATE alerts SET confirmed_at = created_at WHERE confirmed_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS alerts_confirm_token_idx
  ON alerts (confirm_token) WHERE confirm_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS alerts_unsub_token_idx
  ON alerts (unsubscribe_token);

-- The matcher's working set: confirmed, enabled, scoped to a cluster.
CREATE INDEX IF NOT EXISTS alerts_active_cluster_idx
  ON alerts (canonical_type, canonical_brand)
  WHERE confirmed_at IS NOT NULL AND email_enabled;

-- Stops duplicate signups for the same tool from the same address.
CREATE UNIQUE INDEX IF NOT EXISTS alerts_email_cluster_uniq
  ON alerts (lower(email), coalesce(canonical_type,''), coalesce(canonical_brand,''), coalesce(canonical_size,''))
  WHERE canonical_type IS NOT NULL;
