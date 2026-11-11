-- 013: Instagram content pipeline state (2026-10-20)
--
-- The social/ package generates a batch of posts from the price guide and
-- the listings, renders them, and (once a batch is approved) publishes
-- whatever is due. The batch and its posts live here so that:
--
--   * the publisher on GitHub Actions and the person approving at a laptop
--     see the same state;
--   * "never feature the same tool within 60 days" is a query over every
--     batch ever generated, not a file that only exists on one machine;
--   * a failed publish is a row with an error, not a lost log line.
--
-- Approval is one row: social_batches.status = 'approved'. Posts are never
-- approved individually.
--
-- Idempotent. Apply by hand (`node social/cli.js migrate`, or psql) with the
-- unpooled URL like 004-012.

CREATE TABLE IF NOT EXISTS social_batches (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          text NOT NULL UNIQUE,          -- '2026-11-01' (window start) by default
  window_start  date NOT NULL,
  window_days   integer NOT NULL,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'archived')),
  generated_at  timestamptz NOT NULL DEFAULT now(),
  approved_at   timestamptz,
  notes         text
);

CREATE TABLE IF NOT EXISTS social_posts (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_id       bigint NOT NULL REFERENCES social_batches(id) ON DELETE CASCADE,
  post_type      text NOT NULL,                -- price-guide | just-listed | recently-sold | worth | top-5 | evergreen
  scheduled_for  timestamptz NOT NULL,
  -- What the post is about, for the repeat guard. subject_key is unique per
  -- subject ('cluster:pt::bench-plane::stanley::_', 'listing:12345',
  -- 'evergreen:sharpening-01'); subject_type/brand are the canonical tool
  -- type and maker so two post types about the same tool collide.
  subject_key    text NOT NULL,
  subject_type   text,
  subject_brand  text,
  caption        text NOT NULL,
  first_comment  text NOT NULL DEFAULT '',
  -- Rendered PNGs: local paths after `render`, public URLs after upload.
  images         text[] NOT NULL DEFAULT '{}',
  image_urls     text[] NOT NULL DEFAULT '{}',
  -- Everything needed to re-render: cards (template + data), guide path,
  -- source URL, preview notes.
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'published', 'failed', 'skipped')),
  published_at   timestamptz,
  ig_media_id    text,
  error          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_posts_batch_idx     ON social_posts (batch_id, scheduled_for);
CREATE INDEX IF NOT EXISTS social_posts_due_idx       ON social_posts (status, scheduled_for);
CREATE INDEX IF NOT EXISTS social_posts_subject_idx   ON social_posts (lower(subject_type), lower(subject_brand), scheduled_for);
