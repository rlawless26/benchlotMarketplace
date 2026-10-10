-- 012: Expire stale "active" listings (2026-10-10)
--
-- Only dealer and forum scrapers sweep their own catalogue (markExpired), and
-- only on the day they run. eBay samples a newlyListed window and never
-- sweeps; fbmarketplace is paused, so its sweep never fires. Result on
-- 2026-10-10: 135k of 168k eBay rows and all 814 FB rows were still `active`
-- with last_seen_at 30 days to 5 months old, and the guide pages, search,
-- alerts and the homepage count all showed them as for sale.
--
-- This sweep runs nightly from the ingest workflow regardless of which
-- sources scraped. It sets `expired`, never `sold`: disappearing from a
-- sampled marketplace window is not evidence of a sale. Asking-price stats
-- are unaffected (006 already windows active|expired on last_seen_at).
--
-- TTLs per source kind. eBay auctions run <= 10 days and most fixed-price
-- listings are seen again within the sampling window; a 30-day silence means
-- ended for almost all of them. Dealers and forums self-sweep, so their TTL is
-- a backstop for a source that stops running (e.g. a paused scraper).
--
-- Idempotent. Apply by hand with DATABASE_URL_UNPOOLED, like 004-011.

CREATE OR REPLACE FUNCTION bl_stale_ttl(p_source text, p_kind source_kind) RETURNS interval AS $$
  SELECT CASE
    WHEN p_source = 'ebay'          THEN interval '30 days'
    WHEN p_kind   = 'Marketplace'   THEN interval '14 days'
    WHEN p_kind   = 'Dealer'        THEN interval '45 days'
    WHEN p_kind   = 'Forum'         THEN interval '60 days'
    WHEN p_kind   = 'Reddit'        THEN interval '60 days'
    ELSE interval '60 days'
  END
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION expire_stale_listings() RETURNS TABLE (
  source text,
  ttl interval,
  expired bigint
) AS $$
DECLARE
  s record;
  n bigint;
BEGIN
  FOR s IN
    SELECT so.id, bl_stale_ttl(so.id, so.kind) AS ttl
    FROM sources so
    ORDER BY so.id
  LOOP
    -- One indexed UPDATE per source (listings_source_lastseen_idx, 002).
    UPDATE listings l
       SET status = 'expired'
     WHERE l.source = s.id
       AND l.status = 'active'
       AND l.last_seen_at < now() - s.ttl;
    GET DIAGNOSTICS n = ROW_COUNT;
    source := s.id; ttl := s.ttl; expired := n;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
