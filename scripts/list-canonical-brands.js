#!/usr/bin/env node
/**
 * Dump all distinct `canonical_brand` values across active externalListings,
 * sorted by listing count desc. Used to spot near-duplicates and noise that
 * the LLM normalizer didn't canonicalize on its own — the input to building
 * a brand alias map.
 *
 * Usage:
 *   node scripts/list-canonical-brands.js                   # all
 *   node scripts/list-canonical-brands.js --min 2           # only count >= 2
 *   node scripts/list-canonical-brands.js --top 200         # top N
 *   node scripts/list-canonical-brands.js --grep stanley    # filter by substring
 */

const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));

function parseArgs(argv) {
  const args = { min: 0, top: Infinity, grep: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--min') args.min = Number(argv[++i]);
    else if (argv[i] === '--top') args.top = Number(argv[++i]);
    else if (argv[i] === '--grep') args.grep = argv[++i].toLowerCase();
  }
  return args;
}

(async () => {
  const args = parseArgs(process.argv);

  if (!admin.apps.length) {
    const saPath = path.resolve(__dirname, '..', 'functions', 'service-account.json');
    admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
  }
  const db = admin.firestore();

  console.error('[list-canonical-brands] querying active listings…');
  const snap = await db.collection('externalListings').where('status', '==', 'active').get();
  console.error(`[list-canonical-brands] ${snap.size} active listings`);

  const counts = new Map();
  for (const doc of snap.docs) {
    const b = doc.data().canonical_brand;
    if (b == null) continue;
    counts.set(b, (counts.get(b) || 0) + 1);
  }

  let entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (args.min > 0) entries = entries.filter(([, n]) => n >= args.min);
  if (args.grep) entries = entries.filter(([b]) => b.toLowerCase().includes(args.grep));
  entries = entries.slice(0, args.top);

  const total = entries.reduce((s, [, n]) => s + n, 0);
  console.error(`[list-canonical-brands] ${entries.length} distinct brands (covering ${total} listings)\n`);
  for (const [b, n] of entries) {
    console.log(`${String(n).padStart(6)}  ${b}`);
  }

  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
