-- Comp eligibility, shared between the stats rebuild and the guide pages
-- (2026-09-22).
--
-- Two problems surfaced on the Preston Moulding Plane page:
--
--  1. The lot filter in rebuild_price_stats() only caught "lot of N", "job
--     lot", "mixed lot" and "bulk lot". Dealers do not write "lot": they write
--     "Set of 6", "Pair of", "5 Fine Wooden Moulding Planes", "Complete Set of
--     18 Hollow & Round Planes". A $1,000 set of eighteen was one of 25 comps
--     behind a $69 median and dragged the 75th percentile to $179. Across the
--     corpus ~10% of sold titles (2,899 of 28,841 non-Other rows) are lots.
--
--  2. The guide page's comps table applied no eligibility filter at all, so
--     it showed rows the stats above it had excluded.
--
-- Both now call the same two functions. Any change to what counts as a comp
-- belongs here and nowhere else.
--
-- The regex was tuned against the live corpus. Plural tool nouns are the
-- backbone: "12 inch rule", "No. 55 plane" and "1 1/2 x 12 inch chisel" are
-- singular and must not match, while "3 STANLEY No. 2 Smooth Planes" must.
-- Measured false positives on single-tool types (Bench Plane, Hand Saw, Vise,
-- Level) were all genuine pairs and lots. Deliberate misses: bare plurals
-- ("Vintage Wood Planes", "LONDON Bench Chisels") — too many maker names and
-- product lines end in a plural noun (PHILLY PLANES, OHIO PLANES, BRIDGE CITY
-- Rules, Simonds Saws) to flag those without a count.

CREATE OR REPLACE FUNCTION bl_is_lot(title text) RETURNS boolean AS $$
  SELECT title IS NOT NULL
    AND title !~* '\mcombination\s+square\s+set\M'
    AND title ~* (
      -- "set of", "pair of", "lot of", "collection of", "roll of" ...
      '\m(lot|set|sets|pair|pairs|group|collection|bundle|assortment|selection|box|tray|bag|roll|run|trio|quartet)\s+of\M'
      -- "job lot", "tool lot", "estate lot"
      || '|\m(job|mixed|bulk|wholesale|dealer|estate|tool|shop|garage|auction)\s+lots?\M'
      -- bare "lot" (auction-style titles); "lots of patina" is excluded by the lookahead
      || '|\mlot\M(?!s of)'
      -- bare "pair": in this corpus it always means two tools
      || '|\mpairs?\M'
      -- "<count> <up to 8 words> <plural tool noun>": "5 Fine Wooden Moulding Planes".
      -- The count may not follow a digit, "/", ".", "-", "+" or "&" (fractions,
      -- model numbers, "+ 8 bits"), and the words in between may not be
      -- accessory or dimension words ("with all 3 cutters", "2 x 16 inch").
      || '|(^|[^\w./+&-])([2-9]|[1-9][0-9]|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen)'
      || '(\s+(?!x\M|tpi\M|point\M|pt\M|cutters?\M|frogs?\M|stops?\M|blades?\M|irons?\M|bits?\M|piece\M|pc\M|tier|volt\M|v\M|amp\M|hp\M)\w[\w.''’&,/-]*){0,8}'
      || '\s+(planes|chisels|saws|gouges|tools|clamps|files|rules|squares|vises|hammers|axes|levels|braces|augers|drills|knives|shaves|spokeshaves|scrapers|screwdrivers|wrenches|hollows|rounds|beads|pieces|pcs|items|hatchets|adzes|gauges|mallets|punches|awls|drawknives|handsaws|backsaws|moulders|molders|bevels|auger bits|drill bits|brace bits)\M'
      -- "5 piece", "6-piece", "3 sizes"
      || '|\m([2-9]|[1-9][0-9]|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen)[- ]piece\M'
      || '|\m\d+\s+sizes\M'
      -- "Set: Festool ... planes", "Lot 3 Marples chisels"
      || '|\m(set|lot)\s*:?\s+\w[\w.''’&,/-]*(\s+\w[\w.''’&,/-]*){0,5}\s+(planes|chisels|saws|gouges|tools|clamps|files|rules|squares|vises|hammers|axes|levels|braces|augers|drills|knives|shaves|spokeshaves|scrapers|screwdrivers|wrenches|hollows|rounds|beads|pieces|pcs|items|hatchets|adzes|gauges|mallets|punches|awls|drawknives|handsaws|backsaws|moulders|molders|bevels)\M'
      -- "chisel set", "auger bit set", "carving tool set"
      || '|\m(chisel|gouge|auger bit|auger|bit|rule|file|clamp|scraper|carving|screwdriver|wrench|punch|awl|hollow|plane|saw|spokeshave|spoke shave|knife|caliper|hammer|level|marking gauge|turning tool|carving tool)s?\s+(set|lot)\M'
      -- moulding-plane pairs sold as one item
      || '|\mhollows?\s+(and|&)\s+rounds?\M'
      || '|\m(tongue\s*(&|and)\s*groove|match(ed)?|coming\s*(&|and)\s*going|snipe\s*bills?)\s+(moulding\s+|molding\s+)?planes\M'
      || '|\m(left|right)\s*(&|and|\+|/)\s*(right|left)\M.{0,30}\m(planes|chisels|saws|gouges|tools|clamps|files|rules|squares|vises|hammers|axes|levels|braces|augers|drills|knives|shaves|spokeshaves|scrapers|screwdrivers|wrenches|hollows|rounds|beads)\M'
      -- size lists: "1/2, 3/8 & 1/4 Mortise Chisels", "Chisels 1 1/4" & 1 1/2""
      || '|(\d+\s+\d+/\d+|\d+/\d+|\d+)(\s*(inch|inches|in\.?|"|”|''''))?\s*(,|&|and|\+)\s*(\d+\s+\d+/\d+|\d+/\d+|\d+)((\s*(inch|inches|in\.?|"|”|''''))?\s*(,|&|and|\+)\s*(\d+\s+\d+/\d+|\d+/\d+|\d+))*(\s*(inch|inches|in\.?|"|”|''''))?(\s+\w[\w.''’&,/-]*){0,6}\s+(planes|chisels|saws|gouges|tools|clamps|files|rules|squares|vises|hammers|axes|levels|braces|augers|drills|knives|shaves|spokeshaves|scrapers|screwdrivers|wrenches|hollows|rounds|beads|hatchets|adzes|gauges|mallets|punches|awls|drawknives)\M'
      || '|\m(planes|chisels|saws|gouges|tools|clamps|files|rules|squares|vises|hammers|axes|levels|braces|augers|drills|knives|shaves|spokeshaves|scrapers|screwdrivers|wrenches|hollows|rounds|beads|hatchets|adzes|gauges|mallets|punches|awls|drawknives)\M.{0,25}\m(\d+\s+\d+/\d+|\d+/\d+|\d+)(\s*(inch|inches|in\.?|"|”|''''))?\s*(,|&|and|\+)\s*(\d+\s+\d+/\d+|\d+/\d+|\d+)(\s*(inch|inches|in\.?|"|”|''''))?(\s|$)'
      -- "assorted chisels", "various makers ... planes"
      || '|\m(assorted|various|misc|miscellaneous|mixed)\M(\s+\w[\w.''’&,/-]*){0,5}\s+(planes|chisels|saws|gouges|tools|clamps|files|rules|squares|vises|hammers|axes|levels|braces|augers|drills|knives|shaves|spokeshaves|scrapers|screwdrivers|wrenches|hollows|rounds|beads|hatchets|adzes|gauges|mallets|punches|awls|drawknives)\M'
      -- "(6)", "(12 pcs)", "qty 4"
      || '|\(\s*\d{1,2}\s*(pcs?|pieces?)?\s*\)'
      || '|\mqty\s?\d{1,2}\M'
    )
$$ LANGUAGE sql IMMUTABLE;

-- Parts / project / as-is rows. Tests the title as well as the condition
-- string because eBay's condition_raw is just "Used" (see 006, fix 1).
CREATE OR REPLACE FUNCTION bl_is_junk(title text, condition text) RETURNS boolean AS $$
  SELECT coalesce(condition, '') ~* '(parts only|as[- ]?is|for repair|project)'
      OR coalesce(title, '')     ~* '(for parts|parts only|as[- ]?is|for repair|restoration project)'
$$ LANGUAGE sql IMMUTABLE;

-- One paragraph of maker context per brand, rendered above the comps on every
-- page for that brand. Written by a model (functions/normalize/brand-notes.js)
-- from the brand name and a sample of its listing titles, and only rendered
-- when published. Nothing here is derivable from listings, which is the point:
-- it is the only prose on a guide page that is not template copy.
CREATE TABLE IF NOT EXISTS brand_notes (
  canonical_brand text PRIMARY KEY,
  note            text NOT NULL,
  confidence      text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  model           text NOT NULL,
  generated_at    timestamptz NOT NULL DEFAULT now(),
  published       boolean NOT NULL DEFAULT false,
  reviewed_at     timestamptz
);
