-- Forum sold verification (2026-09-02).
--
-- markExpired flips any paged-off active row to status='sold' with a stamped
-- sold_at. For dealers that inference is sound (gone from the catalog = sold).
-- Forum threads roll off the classifieds list by INACTIVITY, so withdrawn and
-- never-sold threads were entering the sold-comp pool with fabricated sale
-- dates. functions/ingest/forum-sold-check.js re-reads each terminal forum
-- thread and records a verdict here.
--
--   sold_verdict:
--     'sold'      — thread affirms a sale (seller statement, SPF, sold marker)
--     'withdrawn' — seller pulled it ("no longer available", "keeping it")
--     'no_sale'   — thread explicitly ended unsold (relisted elsewhere, expired)
--     'unclear'   — no public resolution; forum deals often close by PM, so
--                   these KEEP status='sold' (today's behaviour, now labeled)
--     'gone'      — thread deleted/404; left as-is
--
-- Verdicts 'withdrawn' and 'no_sale' flip status to 'expired' and null
-- sold_at, which removes the row from sold comps via the existing
-- status='sold' filter in rebuild_price_stats(). No stats change needed.
--
-- sold_price_cents is the REALIZED price when the thread states one (price
-- drops, "took $80"), as opposed to price_cents, the scraper-owned ask.
-- rebuild_price_stats() prefers it via COALESCE (see 006, updated the same
-- day).

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS sold_verdict text
    CHECK (sold_verdict IN ('sold','withdrawn','no_sale','unclear','gone')),
  ADD COLUMN IF NOT EXISTS sold_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS sold_price_cents integer
    CHECK (sold_price_cents IS NULL OR sold_price_cents > 0);
