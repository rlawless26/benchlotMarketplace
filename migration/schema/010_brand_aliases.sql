-- Brand aliases (2026-09-22).
--
-- The normalizer emits canonical_brand as free text, so one maker arrives
-- under several spellings: "Witherby" / "T.H. Witherby" / "T. H. Witherby",
-- "Council" / "Council Tool", "E.A. Berg" / "E. A. Berg" / "E.A. Berg
-- Eskilstuna". Each spelling became its own cluster and its own guide page,
-- splitting the comps (Witherby chisels: 23 sales on one page, 68 on the
-- other). A quieter form of the same bug: "E. A. Berg" and "E.A. Berg" slug
-- to the SAME cluster key, so the stats merged them but the page queries,
-- which match canonical_brand exactly, silently dropped the minority
-- spelling's rows.
--
-- This table is the single source of truth for both fixes:
--   - apply_brand_aliases() rewrites listings (and merges brand_notes) so
--     every row carries the surviving spelling. Idempotent; the ingest
--     workflow runs it before rebuild_price_stats().
--   - the guide app looks a missed brand slug up here and 301s to the
--     canonical page (web/lib/price-guide.ts resolveBrandAlias).
--
-- Choosing the survivor: the spelling with the most rows wins, which is the
-- vocabulary's existing convention ("Auburn Tool Co." -> "Auburn"), except
-- where the short form is a bare surname or a place ("Davis", "Birmingham",
-- "General") or the user chose the full name (T.H. Witherby, L.L. Davis,
-- E.A. Berg, Council Tool, Kelly Works). Pairs where the short form is
-- ambiguous were left alone on purpose: Buck (Brothers / & Hickman / & Ryan),
-- Bailey, Davis Bros. (knives, not levels), Ward (& Payne), Winsted (Plane
-- Co. vs Edge Tool Works), Chapin vs Chapin Stephens, Metabo vs Metabo HPT.
-- functions/normalize/brand-alias-candidates.js regenerates the review list.
--
-- Sizes are normalised in the same pass. "16 oz" / "16oz" / "16 ounce" /
-- "16 Oz." were four size pages for one Craftsman hammer; "9 1/2 inches" and
-- "9 1/2 inch" split a Stanley No. 4 1/2 the same way. Canonical forms are
-- the dominant ones in the data: "<n> inch" and "<n> oz".

CREATE TABLE IF NOT EXISTS brand_aliases (
  alias            text PRIMARY KEY,
  canonical_brand  text NOT NULL,
  note             text,
  CHECK (alias <> canonical_brand)
);

INSERT INTO brand_aliases (alias, canonical_brand, note) VALUES
  ('A&E Baldwin', 'A & E Baldwin', 'punctuation variant, same slug'),
  ('A. Howland', 'A. Howland & Co.', 'corporate suffix variant'),
  ('Howland', 'A. Howland & Co.', 'reviewed 2026-09-22'),
  ('Howland & Co.', 'A. Howland & Co.', 'corporate suffix variant'),
  ('A.A. Wood & Sons', 'A.A. Wood', 'corporate suffix variant'),
  ('A.C. Bartlett & Co.', 'A.C. Bartlett', 'corporate suffix variant'),
  ('A.C. Bartlett''s Ohio Planes', 'A.C. Bartlett', 'reviewed 2026-09-22'),
  ('A. H. Reid', 'A.H. Reid', 'punctuation variant, same slug'),
  ('A.J. Wilkinson & Co.', 'A.J. Wilkinson', 'corporate suffix variant'),
  ('Ace Hardware', 'Ace', 'corporate suffix variant'),
  ('Adams & Nelson Co', 'Adams & Nelson', 'punctuation variant, same slug'),
  ('Adams & Nelson Co.', 'Adams & Nelson', 'corporate suffix variant'),
  ('Adjustable Clamp Co', 'Adjustable Clamp Co.', 'punctuation variant, same slug'),
  ('Amana', 'Amana Tool', 'reviewed 2026-09-22'),
  ('American Axe & Tool', 'American Axe & Tool Co.', 'corporate suffix variant'),
  ('Atkin', 'Atkin & Sons', 'corporate suffix variant'),
  ('Atkin & Son', 'Atkin & Sons', 'reviewed 2026-09-22'),
  ('Auburn Tool', 'Auburn', 'corporate suffix variant'),
  ('Auburn Tool Company', 'Auburn', 'corporate suffix variant'),
  ('Bad Axe', 'Bad Axe Tool Works', 'corporate suffix variant'),
  ('Bad-Axe', 'Bad Axe Tool Works', 'punctuation variant, same slug'),
  ('Baldwin', 'Baldwin Tool Co.', 'corporate suffix variant'),
  ('Barron Tool Company', 'Barron', 'corporate suffix variant'),
  ('Bay State Saw Mfg. Co.', 'Bay State', 'reviewed 2026-09-22'),
  ('Belknap Bluegrass', 'Belknap', 'reviewed 2026-09-22'),
  ('Belknap Hardware', 'Belknap', 'corporate suffix variant'),
  ('Berger Instruments', 'Berger', 'reviewed 2026-09-22'),
  ('Bernzomatic', 'BernzOmatic', 'punctuation variant, same slug'),
  ('Birmingham', 'Birmingham Plane Co.', 'reviewed 2026-09-22'),
  ('Birmingham Plane Mfg. Co.', 'Birmingham Plane Co.', 'reviewed 2026-09-22'),
  ('Black and Decker', 'Black & Decker', 'punctuation variant, same slug'),
  ('Blue-Point', 'Blue Point', 'punctuation variant, same slug'),
  ('Brades Co.', 'Brades', 'corporate suffix variant'),
  ('Bridgeport', 'Bridgeport Hardware', 'reviewed 2026-09-22'),
  ('Bridgeport Hardware Mfg Corp', 'Bridgeport Hardware', 'reviewed 2026-09-22'),
  ('C. Nurse & Co.', 'C. Nurse', 'corporate suffix variant'),
  ('Nurse', 'C. Nurse', 'corporate suffix variant'),
  ('Nurse & Co.', 'C. Nurse', 'reviewed 2026-09-22'),
  ('C. E. Jennings', 'C.E. Jennings', 'punctuation variant, same slug'),
  ('C S Osborne', 'C.S. Osborne', 'punctuation variant, same slug'),
  ('C. S. Osborne', 'C.S. Osborne', 'punctuation variant, same slug'),
  ('Carter Products', 'Carter', 'reviewed 2026-09-22'),
  ('Casey & Co', 'Casey & Co.', 'punctuation variant, same slug'),
  ('Chapin Stephens Co.', 'Chapin Stephens', 'corporate suffix variant'),
  ('Chapin-Stephens', 'Chapin Stephens', 'punctuation variant, same slug'),
  ('Chapin-Stephens Co.', 'Chapin Stephens', 'punctuation variant, same slug'),
  ('Chas Parker', 'Chas. Parker', 'punctuation variant, same slug'),
  ('Chicago Rawhide Mfg. Co.', 'Chicago Rawhide', 'corporate suffix variant'),
  ('Cincinnati', 'Cincinnati Tool Co.', 'corporate suffix variant'),
  ('Cincinnati Tool', 'Cincinnati Tool Co.', 'corporate suffix variant'),
  ('Cincinnati Tool Co', 'Cincinnati Tool Co.', 'punctuation variant, same slug'),
  ('Cincinnati Tool Company', 'Cincinnati Tool Co.', 'corporate suffix variant'),
  ('Cleveland Twist Drill Co', 'Cleveland Twist Drill Co.', 'punctuation variant, same slug'),
  ('CMT Orange Tools', 'CMT', 'reviewed 2026-09-22'),
  ('Collins & Co', 'Collins', 'punctuation variant, same slug'),
  ('Collins & Co.', 'Collins', 'corporate suffix variant'),
  ('Collins Co.', 'Collins', 'corporate suffix variant'),
  ('Collins Hartford', 'Collins', 'reviewed 2026-09-22'),
  ('Council', 'Council Tool', 'corporate suffix variant'),
  ('Creative Tools Inc', 'Creative Tools', 'punctuation variant, same slug'),
  ('Creative Tools Inc.', 'Creative Tools', 'corporate suffix variant'),
  ('Crown', 'Crown Tools', 'corporate suffix variant'),
  ('D. Malloch & Son', 'D. Malloch', 'corporate suffix variant'),
  ('D R Barton', 'D.R. Barton', 'punctuation variant, same slug'),
  ('D. R. Barton', 'D.R. Barton', 'punctuation variant, same slug'),
  ('D.R. Barton & Co.', 'D.R. Barton', 'corporate suffix variant'),
  ('Dasco Pro', 'Dasco', 'reviewed 2026-09-22'),
  ('Disston & Morss', 'Disston', 'reviewed 2026-09-22'),
  ('Douglas Co.', 'Douglas', 'corporate suffix variant'),
  ('Douglass Mfg. Co.', 'Douglass', 'corporate suffix variant'),
  ('E. C. Emmerich', 'E.C. Emmerich', 'punctuation variant, same slug'),
  ('Berg', 'E.A. Berg', 'reviewed 2026-09-22'),
  ('Berg Eskilstuna', 'E.A. Berg', 'reviewed 2026-09-22'),
  ('E A Berg', 'E.A. Berg', 'punctuation variant, same slug'),
  ('E. A. Berg', 'E.A. Berg', 'punctuation variant, same slug'),
  ('E.A. Berg Eskilstuna', 'E.A. Berg', 'reviewed 2026-09-22'),
  ('E.A. Stearns', 'E.A. Stearns & Co.', 'corporate suffix variant'),
  ('Atkins', 'E.C. Atkins', 'reviewed 2026-09-22'),
  ('Atkins & Co', 'E.C. Atkins', 'punctuation variant, same slug'),
  ('Atkins & Co.', 'E.C. Atkins', 'corporate suffix variant'),
  ('Atkins Sheffield Saw Works', 'E.C. Atkins', 'reviewed 2026-09-22'),
  ('E.C. Atkins & Co', 'E.C. Atkins', 'corporate suffix variant'),
  ('E.C. Atkins & Co.', 'E.C. Atkins', 'reviewed 2026-09-22'),
  ('EC Atkins', 'E.C. Atkins', 'reviewed 2026-09-22'),
  ('E. C. Stearns', 'E.C. Stearns', 'punctuation variant, same slug'),
  ('E.C. Stearns & Co.', 'E.C. Stearns', 'corporate suffix variant'),
  ('E.C.E. Primus', 'E.C.E.', 'reviewed 2026-09-22'),
  ('Ece', 'E.C.E.', 'punctuation variant, same slug'),
  ('ECE', 'E.C.E.', 'reviewed 2026-09-22'),
  ('ECE Primus', 'E.C.E.', 'reviewed 2026-09-22'),
  ('Empire Tools', 'Empire', 'corporate suffix variant'),
  ('Evans Rule Co', 'Evans', 'reviewed 2026-09-22'),
  ('Evansville Tool Works', 'Evansville', 'corporate suffix variant'),
  ('Foley', 'Foley Belsaw', 'reviewed 2026-09-22'),
  ('Forrest Tool', 'Forrest', 'corporate suffix variant'),
  ('FOXBC', 'Foxbc', 'punctuation variant, same slug'),
  ('Frost Mora', 'Frost', 'reviewed 2026-09-22'),
  ('Fulton Tool Co', 'Fulton', 'punctuation variant, same slug'),
  ('Fulton Tool Co.', 'Fulton', 'corporate suffix variant'),
  ('G.I. Mix & Co.', 'G.I. Mix', 'corporate suffix variant'),
  ('G.W. Denison & Co.', 'G.W. Denison', 'corporate suffix variant'),
  ('Gage Tool Co.', 'Gage', 'corporate suffix variant'),
  ('Gage Tool Company', 'Gage', 'corporate suffix variant'),
  ('Gam', 'Gam Mfg', 'corporate suffix variant'),
  ('General', 'General Tools', 'reviewed 2026-09-22'),
  ('General Hardware', 'General Tools', 'corporate suffix variant'),
  ('General Hardware Mfg. Co', 'General Tools', 'corporate suffix variant'),
  ('General Hardware Mfg. Co.', 'General Tools', 'punctuation variant, same slug'),
  ('Germantown Tool Works', 'Germantown', 'corporate suffix variant'),
  ('Globe Mfg. Co.', 'Globe', 'corporate suffix variant'),
  ('Goodell', 'Goodell-Pratt', 'reviewed 2026-09-22'),
  ('Great Neck Tools', 'Great Neck', 'corporate suffix variant'),
  ('Greenslade Bristol', 'Greenslade', 'reviewed 2026-09-22'),
  ('Griffiths', 'Griffiths Norwich', 'reviewed 2026-09-22'),
  ('Groves', 'Groves & Sons', 'corporate suffix variant'),
  ('H Chapin', 'H. Chapin', 'punctuation variant, same slug'),
  ('H.D. Smith & Co.', 'H.D. Smith', 'corporate suffix variant'),
  ('H.N.T. Gordon & Co.', 'H.N.T. Gordon', 'corporate suffix variant'),
  ('Hnt Gordon', 'H.N.T. Gordon', 'punctuation variant, same slug'),
  ('HNT Gordon', 'H.N.T. Gordon', 'reviewed 2026-09-22'),
  ('Hale Bros', 'Hale Bros.', 'punctuation variant, same slug'),
  ('Hart Tool Co', 'Hart', 'punctuation variant, same slug'),
  ('Hart Tool Co.', 'Hart', 'corporate suffix variant'),
  ('Harvey W. Peace', 'Harvey Peace', 'reviewed 2026-09-22'),
  ('Hearnshaw Bros', 'Hearnshaw', 'corporate suffix variant'),
  ('Hearnshaw Brothers', 'Hearnshaw', 'corporate suffix variant'),
  ('Heller Bros', 'Heller', 'corporate suffix variant'),
  ('Heller Brothers', 'Heller', 'corporate suffix variant'),
  ('Herring', 'Herring Bros.', 'corporate suffix variant'),
  ('Herring Bros', 'Herring Bros.', 'punctuation variant, same slug'),
  ('Hibbard Spencer & Bartlett', 'Hibbard, Spencer & Bartlett', 'punctuation variant, same slug'),
  ('Hields Nottingham', 'Hields', 'reviewed 2026-09-22'),
  ('Hirsch Werkzeuge', 'Hirsch', 'reviewed 2026-09-22'),
  ('Holland London', 'Holland', 'reviewed 2026-09-22'),
  ('Ikea', 'IKEA', 'punctuation variant, same slug'),
  ('James Swan Co', 'James Swan', 'corporate suffix variant'),
  ('Jo Fuller', 'Jo. Fuller', 'punctuation variant, same slug'),
  ('Jo Wilbur', 'Jo. Wilbur', 'punctuation variant, same slug'),
  ('John Moseley', 'Moseley', 'reviewed 2026-09-22'),
  ('John Moseley & Son', 'Moseley', 'reviewed 2026-09-22'),
  ('Fray', 'John S. Fray', 'reviewed 2026-09-22'),
  ('Fray Spofford', 'John S. Fray', 'reviewed 2026-09-22'),
  ('John S. Fray & Co.', 'John S. Fray', 'corporate suffix variant'),
  ('John S. Fray Spofford', 'John S. Fray', 'reviewed 2026-09-22'),
  ('K & E', 'K&E', 'punctuation variant, same slug'),
  ('Kelly', 'Kelly Works', 'corporate suffix variant'),
  ('Kelly Axe & Tool', 'Kelly Works', 'corporate suffix variant'),
  ('Kelly Axe & Tool Co', 'Kelly Works', 'punctuation variant, same slug'),
  ('Kelly Axe & Tool Co.', 'Kelly Works', 'reviewed 2026-09-22'),
  ('Kelly Axe & Tool Works', 'Kelly Works', 'corporate suffix variant'),
  ('Kelly Axe Mfg Co', 'Kelly Works', 'punctuation variant, same slug'),
  ('Kelly Axe Mfg. Co.', 'Kelly Works', 'reviewed 2026-09-22'),
  ('Kelly Perfect', 'Kelly Works', 'reviewed 2026-09-22'),
  ('Kelly Tool Works', 'Kelly Works', 'corporate suffix variant'),
  ('Kelly True Temper', 'Kelly Works', 'reviewed 2026-09-22'),
  ('True Temper Kelly', 'Kelly Works', 'reviewed 2026-09-22'),
  ('Keson Industries', 'Keson', 'reviewed 2026-09-22'),
  ('Keuffel & Esser Co.', 'Keuffel & Esser', 'corporate suffix variant'),
  ('Klein', 'Klein Tools', 'corporate suffix variant'),
  ('Klein & Sons', 'Klein Tools', 'corporate suffix variant'),
  ('Kretschmer Tredway Co.', 'Kretschmer-Tredway', 'corporate suffix variant'),
  ('L & I J White', 'L. & I.J. White', 'punctuation variant, same slug'),
  ('L. & I. J. White', 'L. & I.J. White', 'punctuation variant, same slug'),
  ('L.&I.J. White', 'L. & I.J. White', 'punctuation variant, same slug'),
  ('L. Bailey & Co.', 'L. Bailey', 'corporate suffix variant'),
  ('Davis', 'L.L. Davis', 'reviewed 2026-09-22'),
  ('Davis Level & Tool Co', 'L.L. Davis', 'punctuation variant, same slug'),
  ('Davis Level & Tool Co.', 'L.L. Davis', 'reviewed 2026-09-22'),
  ('L. L. Davis', 'L.L. Davis', 'punctuation variant, same slug'),
  ('Leon Robbins N.E. Tool Works', 'Leon Robbins', 'reviewed 2026-09-22'),
  ('Liam Hoffman Blacksmithing', 'Liam Hoffman', 'reviewed 2026-09-22'),
  ('Littlestown', 'Littlestown Hardware & Foundry', 'reviewed 2026-09-22'),
  ('Littlestown Hardware & Foundry Co.', 'Littlestown Hardware & Foundry', 'corporate suffix variant'),
  ('Mac', 'Mac Tools', 'punctuation variant, same slug'),
  ('MAC', 'Mac Tools', 'corporate suffix variant'),
  ('Macklanburg Duncan', 'Macklanburg-Duncan', 'punctuation variant, same slug'),
  ('Mann Edge Tool Co', 'Mann', 'corporate suffix variant'),
  ('Marsden', 'Marsden Bros.', 'corporate suffix variant'),
  ('Mayhew Tools', 'Mayhew', 'corporate suffix variant'),
  ('Merit Tools', 'Merit', 'corporate suffix variant'),
  ('Miller Saw Trimmer Co', 'Miller Saw Trimmer Co.', 'punctuation variant, same slug'),
  ('Millers', 'Millers Falls', 'reviewed 2026-09-22'),
  ('Mitchell & Co.', 'Mitchell', 'corporate suffix variant'),
  ('Moseley & Son', 'Moseley', 'corporate suffix variant'),
  ('Moseley & Sons', 'Moseley', 'corporate suffix variant'),
  ('New York Tool Co', 'New York Tool Co.', 'punctuation variant, same slug'),
  ('Olympia Tools', 'Olympia', 'corporate suffix variant'),
  ('P. S. & W.', 'P.S. & W.', 'punctuation variant, same slug'),
  ('P. S. & W. Co.', 'P.S. & W.', 'punctuation variant, same slug'),
  ('P.S. & W. Co.', 'P.S. & W.', 'corporate suffix variant'),
  ('Peck Stow & Wilcox', 'P.S. & W.', 'punctuation variant, same slug'),
  ('Peck, Stow & Wilcox', 'P.S. & W.', 'reviewed 2026-09-22'),
  ('Ps & W', 'P.S. & W.', 'punctuation variant, same slug'),
  ('PS & W Co.', 'P.S. & W.', 'corporate suffix variant'),
  ('PS&W', 'P.S. & W.', 'reviewed 2026-09-22'),
  ('Petersen Dewitt', 'Petersen', 'reviewed 2026-09-22'),
  ('Phoenix Company', 'Phoenix', 'corporate suffix variant'),
  ('Plumb Tools', 'Plumb', 'corporate suffix variant'),
  ('Plumb Tools USA', 'Plumb', 'reviewed 2026-09-22'),
  ('Plumb Victory', 'Plumb', 'reviewed 2026-09-22'),
  ('Powr Kraft', 'Powr-Kraft', 'punctuation variant, same slug'),
  ('Proto Tools', 'Proto', 'corporate suffix variant'),
  ('PSI Woodworking', 'PSI', 'reviewed 2026-09-22'),
  ('Red Devil Tools', 'Red Devil', 'corporate suffix variant'),
  ('Reed Mfg Co', 'Reed', 'corporate suffix variant'),
  ('Reed Utica', 'Reed', 'reviewed 2026-09-22'),
  ('Richardson Bros.', 'Richardson', 'corporate suffix variant'),
  ('Richardson Brothers', 'Richardson', 'corporate suffix variant'),
  ('Riverside', 'Riverside Tool Co.', 'corporate suffix variant'),
  ('S. J. Addis', 'S.J. Addis', 'punctuation variant, same slug'),
  ('Sager', 'Sager Chemical', 'reviewed 2026-09-22'),
  ('Sandusky Tool Co', 'Sandusky', 'corporate suffix variant'),
  ('Shapleigh Hardware', 'Shapleigh', 'corporate suffix variant'),
  ('Shapleigh Hardware Co.', 'Shapleigh', 'corporate suffix variant'),
  ('Snap On', 'Snap-On', 'punctuation variant, same slug'),
  ('Snell Mfg. Co.', 'Snell', 'corporate suffix variant'),
  ('Snow & Nealley Co.', 'Snow & Nealley', 'corporate suffix variant'),
  ('Spear and Jackson', 'Spear & Jackson', 'punctuation variant, same slug'),
  ('St. James Bay Tool Co.', 'St. James Bay', 'corporate suffix variant'),
  ('St. Johnsbury', 'St. Johnsbury Tool Co.', 'corporate suffix variant'),
  ('Standard Rule', 'Standard Rule Co.', 'corporate suffix variant'),
  ('Standard Tool Co', 'Standard Tool Co.', 'punctuation variant, same slug'),
  ('Stanley Rule & Level Co.', 'Stanley', 'reviewed 2026-09-22'),
  ('Star', 'Star Tool Co.', 'corporate suffix variant'),
  ('Stephens', 'Stephens & Co.', 'corporate suffix variant'),
  ('Stephens & Co', 'Stephens & Co.', 'punctuation variant, same slug'),
  ('Stratton', 'Stratton Bros.', 'corporate suffix variant'),
  ('Stratton Bros', 'Stratton Bros.', 'punctuation variant, same slug'),
  ('Stratton Brothers', 'Stratton Bros.', 'reviewed 2026-09-22'),
  ('Swanson Tool Co', 'Swanson', 'corporate suffix variant'),
  ('T H Witherby', 'T.H. Witherby', 'punctuation variant, same slug'),
  ('T. H. Witherby', 'T.H. Witherby', 'punctuation variant, same slug'),
  ('Witherby', 'T.H. Witherby', 'reviewed 2026-09-22'),
  ('T.J. M''Master & Co.', 'T.J. M''Master', 'corporate suffix variant'),
  ('Tru Test', 'Tru-Test', 'punctuation variant, same slug'),
  ('TufBoy', 'Tufboy', 'punctuation variant, same slug'),
  ('Tyzack & Sons & Turner', 'Tyzack', 'reviewed 2026-09-22'),
  ('Tyzack & Turner', 'Tyzack', 'reviewed 2026-09-22'),
  ('Tyzack Sons & Turner', 'Tyzack', 'reviewed 2026-09-22'),
  ('Underhill Edge Tool Co.', 'Underhill', 'corporate suffix variant'),
  ('Upson', 'Upson Nut Co.', 'reviewed 2026-09-22'),
  ('Upson Nut Co', 'Upson Nut Co.', 'punctuation variant, same slug'),
  ('Varvill & Son', 'Varvill', 'corporate suffix variant'),
  ('Varvill & Sons', 'Varvill', 'corporate suffix variant'),
  ('Varvill York', 'Varvill', 'reviewed 2026-09-22'),
  ('V. & B.', 'Vaughan & Bushnell', 'reviewed 2026-09-22'),
  ('V. & B. Vanadium', 'Vaughan & Bushnell', 'reviewed 2026-09-22'),
  ('Vaughan', 'Vaughan & Bushnell', 'reviewed 2026-09-22'),
  ('Vaughn', 'Vaughan & Bushnell', 'reviewed 2026-09-22'),
  ('Vaughn & Bushnell', 'Vaughan & Bushnell', 'reviewed 2026-09-22'),
  ('W Butcher', 'W. Butcher', 'punctuation variant, same slug'),
  ('W.B. Sears & Co.', 'W.B. Sears', 'corporate suffix variant'),
  ('Wenzloff', 'Wenzloff & Sons', 'corporate suffix variant'),
  ('Wheeler Madden & Clemson', 'Wheeler, Madden & Clemson', 'punctuation variant, same slug'),
  ('W. Beatty', 'Wm. Beatty', 'reviewed 2026-09-22'),
  ('W. Beatty & Son', 'Wm. Beatty', 'corporate suffix variant'),
  ('Wm. Beatty & Son', 'Wm. Beatty', 'reviewed 2026-09-22'),
  ('Wm. Beatty & Sons', 'Wm. Beatty', 'corporate suffix variant'),
  ('Wm. Greaves & Sons', 'Wm. Greaves', 'corporate suffix variant'),
  ('Wm Moss', 'Wm. Moss', 'punctuation variant, same slug'),
  ('Woodings', 'Woodings Verona', 'reviewed 2026-09-22'),
  ('Woodings-Verona', 'Woodings Verona', 'punctuation variant, same slug'),
  ('Worrall', 'Worrall & Co.', 'corporate suffix variant'),
  ('Worthington', 'Worthington Hardware', 'corporate suffix variant'),
  ('X-ACTO', 'X-Acto', 'punctuation variant, same slug'),
  ('Zenith Marshall Wells', 'Zenith', 'reviewed 2026-09-22')

ON CONFLICT (alias) DO UPDATE SET canonical_brand = EXCLUDED.canonical_brand, note = EXCLUDED.note;

-- Never let an alias chain: an alias's canonical must not itself be an alias.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM brand_aliases a JOIN brand_aliases b ON b.alias = a.canonical_brand) THEN
    RAISE EXCEPTION 'brand_aliases contains a chain (an alias pointing at another alias)';
  END IF;
END $$;

-- "16oz" / "16 Ounce" / "16 oz." -> "16 oz";  "9 1/2 inches" / '9 1/2"' -> "9 1/2 inch".
CREATE OR REPLACE FUNCTION bl_normalize_size(s text) RETURNS text AS $$
  SELECT CASE
    WHEN s IS NULL THEN NULL
    WHEN s ~* '^\s*\d[\d /]*?\s*(oz\.?|ounces?)\s*$'
      THEN regexp_replace(lower(s), '^\s*(\d[\d /]*?)\s*(oz\.?|ounces?)\s*$', '\1 oz')
    WHEN s ~* '^\s*\d[\d /]*?\s*(in\.?|inch|inches|"|”)\s*$'
      THEN regexp_replace(lower(s), '^\s*(\d[\d /]*?)\s*(in\.?|inch|inches|"|”)\s*$', '\1 inch')
    WHEN s ~* '^\s*\d[\d /]*?\s*mm\s*$'
      THEN regexp_replace(lower(s), '^\s*(\d[\d /]*?)\s*mm\s*$', '\1 mm')
    ELSE s
  END
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION apply_brand_aliases() RETURNS TABLE (
  listings_rebranded bigint,
  sizes_normalized   bigint,
  notes_merged       bigint
) AS $$
DECLARE
  n_brand bigint; n_size bigint; n_notes bigint;
BEGIN
  UPDATE listings l SET canonical_brand = a.canonical_brand
  FROM brand_aliases a WHERE l.canonical_brand = a.alias;
  GET DIAGNOSTICS n_brand = ROW_COUNT;

  UPDATE listings SET canonical_size = bl_normalize_size(canonical_size)
  WHERE canonical_size IS NOT NULL AND canonical_size <> bl_normalize_size(canonical_size);
  GET DIAGNOSTICS n_size = ROW_COUNT;

  -- brand_notes is keyed on the exact brand string. Where the canonical brand
  -- already has a note, the alias's note is dropped; otherwise it is renamed.
  DELETE FROM brand_notes bn USING brand_aliases a
  WHERE bn.canonical_brand = a.alias
    AND EXISTS (SELECT 1 FROM brand_notes c WHERE c.canonical_brand = a.canonical_brand);
  GET DIAGNOSTICS n_notes = ROW_COUNT;
  UPDATE brand_notes bn SET canonical_brand = a.canonical_brand
  FROM brand_aliases a WHERE bn.canonical_brand = a.alias;

  RETURN QUERY SELECT n_brand, n_size, n_notes;
END;
$$ LANGUAGE plpgsql;
