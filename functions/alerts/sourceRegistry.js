/**
 * Server-side source registry (mirror of src/firebase/adapters/sources.js).
 *
 * Kept here instead of shared because the client lives in an ES-module React
 * bundle and Cloud Functions run CommonJS — crossing that boundary is more
 * trouble than the ~20 lines of duplication. When we add a new source, edit
 * BOTH files.
 */

const SOURCES = [
  { id: 'jimbode', name: 'Jim Bode Tools', shortName: 'Jim Bode' },
  { id: 'leach', name: 'Patrick Leach', shortName: 'P. Leach' },
  { id: 'hyperkitten', name: 'Hyperkitten', shortName: 'Hyperkitten' },
  { id: 'sawmillcreek', name: 'Sawmill Creek', shortName: 'Sawmill Creek' },
  { id: 'woodnet', name: 'Woodnet', shortName: 'Woodnet' },
  { id: 'lumberjocks', name: 'LumberJocks', shortName: 'LumberJocks' },
  { id: 'reddit', name: 'Reddit', shortName: 'Reddit' },
  { id: 'ebay', name: 'eBay', shortName: 'eBay' },
  { id: 'thebestthings', name: 'The Best Things', shortName: 'Best Things' },
  { id: 'rouillard', name: 'Michael Rouillard Antique Tools', shortName: 'Rouillard' },
  { id: 'vintagevials', name: 'Vintage Vials', shortName: 'Vintage Vials' },
];

const BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

function getSource(id) {
  return BY_ID[id] || null;
}

module.exports = { getSource, SOURCES };
