-- 011: ToolScan leaves Firebase (2026-09-29)
--
-- The scan endpoint moves from the `api` Cloud Function into the Next.js app
-- (web/app/api/toolscan), photos move from Firebase Storage to a private
-- Vercel Blob store, and the three Firestore lead collections
-- (toolscan_leads, waitlist, category_interest) collapse into one `leads`
-- table. `tool_scans` already exists (001, loaded from Firestore `toolscans`)
-- and keeps its rows; the new columns say where each row's photos live and let
-- the endpoint rate-limit without Redis.
--
-- Idempotent. Apply by hand with DATABASE_URL_UNPOOLED, like 004-010.

-- ---------------------------------------------------------------------------
-- tool_scans: written by /api/toolscan from now on
-- ---------------------------------------------------------------------------
ALTER TABLE tool_scans ADD COLUMN IF NOT EXISTS created_ip          text;
ALTER TABLE tool_scans ADD COLUMN IF NOT EXISTS image_store         text NOT NULL DEFAULT 'firebase';
ALTER TABLE tool_scans ADD COLUMN IF NOT EXISTS posthog_distinct_id text;
ALTER TABLE tool_scans ADD COLUMN IF NOT EXISTS stop_reason         text;
ALTER TABLE tool_scans ALTER COLUMN created_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS tool_scans_created_idx    ON tool_scans (created_at DESC);
-- Per-IP throttle: count of scans in the last 15 minutes.
CREATE INDEX IF NOT EXISTS tool_scans_ip_created_idx ON tool_scans (created_ip, created_at DESC)
  WHERE created_ip IS NOT NULL;
CREATE INDEX IF NOT EXISTS tool_scans_distinct_created_idx ON tool_scans (posthog_distinct_id, created_at DESC)
  WHERE posthog_distinct_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- scan_feedback: "looks right" / "save corrections" from the result card.
-- User corrections are the only clean label source the project has; the
-- image paths are denormalised so (photo, label) is one row.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scan_feedback (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id          text,
  vote             text NOT NULL CHECK (vote IN ('correct', 'corrected')),
  email            text,
  original_result  jsonb,
  corrected_result jsonb,
  user_edits       jsonb,
  has_edits        boolean NOT NULL DEFAULT false,
  image_paths      text[] NOT NULL DEFAULT '{}',
  image_store      text NOT NULL DEFAULT 'blob',
  created_ip       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scan_feedback_scan_idx    ON scan_feedback (scan_id);
CREATE INDEX IF NOT EXISTS scan_feedback_created_idx ON scan_feedback (created_at DESC);

-- ---------------------------------------------------------------------------
-- leads: every email address captured outside the alerts flow.
--   source: scan_email_gate | category_interest | waitlist | digest_footer
--   payload: the identified tool, the requested category, etc.
-- No unique constraint on purpose: the scan gate is per scan and the digest
-- form is re-submittable. Dedupe at query time on lower(email).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  source     text NOT NULL,
  scan_id    text,
  payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leads_email_idx          ON leads (lower(email));
CREATE INDEX IF NOT EXISTS leads_source_created_idx ON leads (source, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_ip_created_idx     ON leads (created_ip, created_at DESC)
  WHERE created_ip IS NOT NULL;
