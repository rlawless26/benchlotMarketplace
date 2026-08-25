-- ============================================================================
-- Source registry, generated from src/firebase/adapters/sources.js.
-- 14 sources. Regenerate rather than hand-edit.
-- ============================================================================

INSERT INTO sources (id, name, short_name, kind, descriptor, home_url, indexed) VALUES
  ('jimbode', 'Jim Bode Tools', 'Jim Bode', 'Dealer'::source_kind, 'Dealer · Katonah NY', 'https://www.jimbodetools.com', true),
  ('jimbode_valueguide', 'Jim Bode Value Guide', 'JB Value Guide', 'Dealer'::source_kind, 'Sold archive · Katonah NY', 'https://www.jimbodetools.com/collections/jim-bodes-value-guide-to-antique-tools', false),
  ('leach', 'Patrick Leach', 'P. Leach', 'Dealer'::source_kind, 'Monthly list · Since 1998', 'https://supertool.com', false),
  ('hyperkitten', 'Hyperkitten', 'Hyperkitten', 'Dealer'::source_kind, 'Josh Clark · Dealer', 'https://www.hyperkitten.com', true),
  ('sawmillcreek', 'Sawmill Creek', 'Sawmill Creek', 'Forum'::source_kind, 'Forum classifieds', 'https://sawmillcreek.org/forums/sawmill-creek-classifieds.10/', true),
  ('woodnet', 'Woodnet', 'Woodnet', 'Forum'::source_kind, 'Forum classifieds', 'https://forums.woodnet.net/forumdisplay.php?fid=4', true),
  ('lumberjocks', 'LumberJocks', 'LumberJocks', 'Forum'::source_kind, 'Community listings', NULL, false),
  ('reddit', 'Reddit', 'Reddit', 'Reddit'::source_kind, 'r/handtools · r/AntiqueToolBroker', 'https://www.reddit.com/r/handtools/new/', true),
  ('ebay', 'eBay', 'eBay', 'Marketplace'::source_kind, 'Marketplace · Curated woodworking', 'https://www.ebay.com/b/Carpentry-Woodworking/13870', true),
  ('thebestthings', 'The Best Things', 'Best Things', 'Dealer'::source_kind, 'Dealer · Premium vintage', 'https://www.thebestthings.com/vintools.htm', true),
  ('rouillard', 'Michael Rouillard Antique Tools', 'Rouillard', 'Dealer'::source_kind, 'Dealer · Antique · Since 1994', 'https://michaelrouillardtools.com', true),
  ('vintagevials', 'Vintage Vials', 'Vintage Vials', 'Dealer'::source_kind, 'Dealer · Antique · Rules & planes', 'https://shop.vintagevials.com', true),
  ('oldtools', 'OldTools.com', 'OldTools', 'Dealer'::source_kind, 'Dealer · Antique woodworking', 'https://www.oldtools.com/shop', true),
  ('fbmarketplace', 'Facebook Marketplace', 'FB Marketplace', 'Marketplace'::source_kind, 'Marketplace · Local listings', 'https://www.facebook.com/marketplace', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, short_name = EXCLUDED.short_name, kind = EXCLUDED.kind,
  descriptor = EXCLUDED.descriptor, home_url = EXCLUDED.home_url, indexed = EXCLUDED.indexed;
