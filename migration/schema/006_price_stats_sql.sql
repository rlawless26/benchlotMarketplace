-- ============================================================================
-- price_stats, computed in SQL.
--
-- A port of functions/pricestats/build.js (2026-05-07), which streamed all of
-- externalListings out of Firestore, partitioned it, and wrote ~61k documents
-- back. The statistics it computes are sound and are reproduced here as-is:
-- percentiles not means as the headline, tail percentiles suppressed below
-- n=20, sold and asking never blended, an unwindowed sold block and a 365-day
-- asking window, and a per-source-kind breakdown.
--
-- TWO DELIBERATE FIXES to bugs in the original:
--
--  1. The junk filter was effectively dead on eBay. build.js tested
--     CONDITION_DROP_RE against condition_raw only, never the title. eBay's
--     condition_raw is "Used" or "New", so "Stanley No 4 Plane - FOR PARTS
--     ONLY" qualified as a comparable. The filter worked for dealers who write
--     prose conditions and did nothing for 78% of the corpus. Now both fields
--     are tested.
--
--  2. Multi-item lots were never excluded. A "lot of 5 planes" at $200 is not
--     one plane's price in either direction.
--
-- NOT changed, on purpose: rows with canonical_brand 'Unknown' are still
-- dropped. Plenty of vintage tools genuinely carry no maker's mark and should
-- form an unbranded cluster rather than vanish, but that changes cluster
-- identity and belongs in its own change with its own validation.
-- ============================================================================

-- Mirror of slug() in functions/pricestats/cluster.js. Keep in sync: cluster
-- keys computed here must byte-match the ones the app builds from URL slugs.
CREATE OR REPLACE FUNCTION bl_slug(s text) RETURNS text AS $$
  SELECT CASE
    WHEN s IS NULL OR btrim(s) = '' THEN '_'
    -- btrim(string, chars) — not trim(both ... from ...); mixing the two forms
    -- is a syntax error.
    ELSE coalesce(nullif(
      btrim(regexp_replace(lower(replace(s, '&', ' and ')), '[^a-z0-9]+', '-', 'g'), '-'),
    ''), '_')
  END
$$ LANGUAGE sql IMMUTABLE;

-- Percentile helper that honours build.js's N_FOR_TAIL_PERCENTILES = 20:
-- p10/p90 are only meaningful with enough samples, and a p90 drawn from 6
-- points invites false confidence.
CREATE OR REPLACE FUNCTION bl_tail(n bigint, v numeric) RETURNS numeric AS $$
  SELECT CASE WHEN n >= 20 THEN v ELSE NULL END
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION rebuild_price_stats() RETURNS TABLE (
  clusters_written bigint,
  clusters_with_sold bigint,
  clusters_with_asking bigint,
  samples_sold bigint,
  samples_asking bigint
) AS $$
BEGIN
  CREATE TEMP TABLE _qualifying ON COMMIT DROP AS
  SELECT
    l.canonical_type, l.canonical_brand, l.canonical_size, l.canonical_model,
    l.plane_type_number,
    -- Realized sale price when the forum sold-check extracted one (008);
    -- otherwise the scraper's ask. For sold rows this makes comps reflect
    -- what was PAID where that is knowable.
    COALESCE(l.sold_price_cents, l.price_cents) AS price_cents,
    s.kind::text AS kind,
    CASE WHEN l.status = 'sold' THEN 'sold' ELSE 'asking' END AS block,
    l.status
  FROM listings l
  JOIN sources s ON s.id = l.source
  WHERE l.price_cents BETWEEN 1 AND 5000000
    AND l.canonical_type IS NOT NULL
    AND l.canonical_brand IS NOT NULL
    AND l.canonical_brand NOT IN ('Unknown', '')
    -- Fix 1: test the title as well as the condition string.
    AND coalesce(l.condition_raw, '') !~* '(parts only|as[- ]?is|for repair|project)'
    AND l.title_raw !~* '(for parts|parts only|as[- ]?is|for repair|restoration project)'
    -- Fix 2: multi-item lots are not one tool's price.
    AND l.title_raw !~* '(lot of [0-9]|job ?lot|mixed lot|bulk lot)'
    AND (
      l.status = 'sold'
      OR (l.status IN ('active', 'expired') AND l.last_seen_at > now() - interval '365 days')
    );

  -- The four grains, finest last. Mirrors clusterKey / clusterKeyModel /
  -- clusterKeyType in cluster.js, including the m-/t- namespace markers that
  -- stop a model slug colliding with a size slug in the same key position.
  CREATE TEMP TABLE _grained ON COMMIT DROP AS
    SELECT 'coarse' AS grain,
           'pt::' || bl_slug(canonical_type) || '::' || bl_slug(canonical_brand) || '::_' AS cluster_key,
           canonical_type, canonical_brand, NULL::text AS canonical_size,
           NULL::text AS canonical_model, NULL::smallint AS plane_type_number,
           price_cents, kind, block, status
    FROM _qualifying
  UNION ALL
    SELECT 'fine',
           'pt::' || bl_slug(canonical_type) || '::' || bl_slug(canonical_brand) || '::' || bl_slug(canonical_size),
           canonical_type, canonical_brand, canonical_size, NULL, NULL,
           price_cents, kind, block, status
    FROM _qualifying WHERE canonical_size IS NOT NULL
  UNION ALL
    SELECT 'model-fine',
           'pt::' || bl_slug(canonical_type) || '::' || bl_slug(canonical_brand) || '::m-' || bl_slug(canonical_model),
           canonical_type, canonical_brand, NULL, canonical_model, NULL,
           price_cents, kind, block, status
    FROM _qualifying WHERE canonical_model IS NOT NULL
  UNION ALL
    SELECT 'type-fine',
           'pt::' || bl_slug(canonical_type) || '::' || bl_slug(canonical_brand) || '::m-' || bl_slug(canonical_model) || '::t-' || plane_type_number,
           canonical_type, canonical_brand, NULL, canonical_model, plane_type_number,
           price_cents, kind, block, status
    FROM _qualifying
    WHERE canonical_model IS NOT NULL AND plane_type_number BETWEEN 1 AND 20;

  CREATE INDEX ON _grained (cluster_key, block);
  ANALYZE _grained;

  -- Per-kind sub-distributions, tracked for the same three kinds build.js
  -- tracked. This is what makes a $169 dealer sold median legible next to a
  -- $50 marketplace asking median instead of looking like a contradiction.
  CREATE TEMP TABLE _bykind ON COMMIT DROP AS
    SELECT cluster_key, block, kind,
           jsonb_build_object(
             'count', count(*),
             'mean',  round(avg(price_cents)::numeric / 100, 2),
             'p10',   bl_tail(count(*), round(percentile_cont(0.10) WITHIN GROUP (ORDER BY price_cents)::numeric / 100, 2)),
             'p25',   round(percentile_cont(0.25) WITHIN GROUP (ORDER BY price_cents)::numeric / 100, 2),
             'p50',   round(percentile_cont(0.50) WITHIN GROUP (ORDER BY price_cents)::numeric / 100, 2),
             'p75',   round(percentile_cont(0.75) WITHIN GROUP (ORDER BY price_cents)::numeric / 100, 2),
             'p90',   bl_tail(count(*), round(percentile_cont(0.90) WITHIN GROUP (ORDER BY price_cents)::numeric / 100, 2))
           ) AS stats
    FROM _grained
    WHERE kind IN ('Dealer', 'Marketplace', 'Forum')
    GROUP BY 1, 2, 3;

  -- Collapse to ONE row per cluster holding both blocks' JSON. The previous
  -- shape ran two correlated subqueries per output row against an unindexed
  -- temp table — roughly 60k clusters x a full scan each, which does not
  -- finish in reasonable time. One pass plus a join is the same result.
  CREATE TEMP TABLE _bykind_agg ON COMMIT DROP AS
    SELECT cluster_key,
           jsonb_object_agg(kind, stats) FILTER (WHERE block = 'asking') AS asking_json,
           jsonb_object_agg(kind, stats) FILTER (WHERE block = 'sold')   AS sold_json
    FROM _bykind GROUP BY cluster_key;
  CREATE UNIQUE INDEX ON _bykind_agg (cluster_key);
  ANALYZE _bykind_agg;

  DELETE FROM price_stats;

  INSERT INTO price_stats (
    cluster_key, canonical_type, canonical_brand, canonical_model, canonical_size,
    plane_type_number, grain,
    asking_count, asking_count_active, asking_count_expired, asking_mean,
    asking_p10, asking_p25, asking_p50, asking_p75, asking_p90,
    asking_window_days, asking_by_kind,
    sold_count, sold_mean, sold_p10, sold_p25, sold_p50, sold_p75, sold_p90,
    sold_window_days, sold_by_kind, last_built_at)
  SELECT
    g.cluster_key,
    max(g.canonical_type), max(g.canonical_brand), max(g.canonical_model), max(g.canonical_size),
    max(g.plane_type_number), max(g.grain),

    count(*) FILTER (WHERE g.block = 'asking'),
    count(*) FILTER (WHERE g.status = 'active'),
    count(*) FILTER (WHERE g.status = 'expired'),
    round(avg(g.price_cents) FILTER (WHERE g.block = 'asking')::numeric / 100, 2),
    bl_tail(count(*) FILTER (WHERE g.block = 'asking'),
      round(percentile_cont(0.10) WITHIN GROUP (ORDER BY g.price_cents) FILTER (WHERE g.block = 'asking')::numeric / 100, 2)),
    round(percentile_cont(0.25) WITHIN GROUP (ORDER BY g.price_cents) FILTER (WHERE g.block = 'asking')::numeric / 100, 2),
    round(percentile_cont(0.50) WITHIN GROUP (ORDER BY g.price_cents) FILTER (WHERE g.block = 'asking')::numeric / 100, 2),
    round(percentile_cont(0.75) WITHIN GROUP (ORDER BY g.price_cents) FILTER (WHERE g.block = 'asking')::numeric / 100, 2),
    bl_tail(count(*) FILTER (WHERE g.block = 'asking'),
      round(percentile_cont(0.90) WITHIN GROUP (ORDER BY g.price_cents) FILTER (WHERE g.block = 'asking')::numeric / 100, 2)),
    365,
    bk.asking_json,

    count(*) FILTER (WHERE g.block = 'sold'),
    round(avg(g.price_cents) FILTER (WHERE g.block = 'sold')::numeric / 100, 2),
    bl_tail(count(*) FILTER (WHERE g.block = 'sold'),
      round(percentile_cont(0.10) WITHIN GROUP (ORDER BY g.price_cents) FILTER (WHERE g.block = 'sold')::numeric / 100, 2)),
    round(percentile_cont(0.25) WITHIN GROUP (ORDER BY g.price_cents) FILTER (WHERE g.block = 'sold')::numeric / 100, 2),
    round(percentile_cont(0.50) WITHIN GROUP (ORDER BY g.price_cents) FILTER (WHERE g.block = 'sold')::numeric / 100, 2),
    round(percentile_cont(0.75) WITHIN GROUP (ORDER BY g.price_cents) FILTER (WHERE g.block = 'sold')::numeric / 100, 2),
    bl_tail(count(*) FILTER (WHERE g.block = 'sold'),
      round(percentile_cont(0.90) WITHIN GROUP (ORDER BY g.price_cents) FILTER (WHERE g.block = 'sold')::numeric / 100, 2)),
    -- The sold block is deliberately unwindowed: a years-old sale on a Stanley
    -- No. 5 still anchors today's value. NULL records "no window".
    NULL,
    bk.sold_json,
    now()
  FROM _grained g
  LEFT JOIN _bykind_agg bk ON bk.cluster_key = g.cluster_key
  GROUP BY g.cluster_key, bk.asking_json, bk.sold_json;

  RETURN QUERY
    SELECT count(*),
           count(*) FILTER (WHERE ps.sold_count > 0),
           count(*) FILTER (WHERE ps.asking_count > 0),
           coalesce(sum(ps.sold_count), 0)::bigint,
           coalesce(sum(ps.asking_count), 0)::bigint
    FROM price_stats ps;
END;
$$ LANGUAGE plpgsql;
