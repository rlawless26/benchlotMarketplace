-- ============================================================================
-- price_snapshots — price/status history per listing.
--
-- Missed by the initial migration: the data lives in Firestore SUBcollections
-- (priceSnapshots/{docId}/snapshots/{id}), and a count on the top-level
-- `priceSnapshots` collection returns 0 because the parent documents are
-- implicit. Only a collectionGroup query sees them. 145,583 rows.
--
-- Powers the price-drop badge and the previous-listings popover, and is the
-- only record of how asking prices move over time -- which a price guide built
-- on point-in-time medians otherwise cannot show.
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_snapshots (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Nullable: snapshots can outlive the listing they describe (purged sources,
  -- deleted rows). The history stays useful even when the listing is gone, so
  -- this is ON DELETE SET NULL rather than CASCADE.
  listing_id    bigint REFERENCES listings(id) ON DELETE SET NULL,

  -- Firestore parent doc id (`${source}__${source_id}`). Retained so a snapshot
  -- is still attributable when listing_id is null, and so the load can resolve
  -- the FK by natural key.
  source        text NOT NULL,
  source_id     text NOT NULL,

  price_cents   integer,
  status        text,
  scraped_at    timestamptz NOT NULL,

  -- One snapshot per listing per scrape. Makes the load idempotent.
  CONSTRAINT price_snapshots_uniq UNIQUE (source, source_id, scraped_at)
);

CREATE INDEX IF NOT EXISTS price_snapshots_listing_idx
  ON price_snapshots (listing_id, scraped_at DESC);

-- Drives "price dropped" detection: find listings whose latest snapshot is
-- cheaper than an earlier one.
CREATE INDEX IF NOT EXISTS price_snapshots_natural_idx
  ON price_snapshots (source, source_id, scraped_at DESC);
