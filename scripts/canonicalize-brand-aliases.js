#!/usr/bin/env node
/**
 * Apply the BRAND_ALIASES map from functions/normalize/vocabulary.js to
 * existing externalListings. Pure string rewrite — no LLM calls — so this
 * is cheap and fast even at full-catalog scale.
 *
 * Reads each active listing's canonical_brand, runs canonicalizeBrand,
 * writes back only when the value changes. Idempotent.
 *
 * Usage:
 *   node scripts/canonicalize-brand-aliases.js                 # all active
 *   node scripts/canonicalize-brand-aliases.js --dry-run       # report only
 *   node scripts/canonicalize-brand-aliases.js --concurrency 8 # default 5
 */

const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
const { canonicalizeBrand, BRAND_ALIASES } = require('../functions/normalize/vocabulary');

function parseArgs(argv) {
  const args = { dryRun: false, concurrency: 5 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--concurrency') args.concurrency = Number(argv[++i]);
  }
  return args;
}

async function runWithConcurrency(items, concurrency, worker) {
  let next = 0;
  async function pump() {
    while (next < items.length) {
      const i = next++;
      await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, pump));
}

(async () => {
  const args = parseArgs(process.argv);

  if (!admin.apps.length) {
    const saPath = path.resolve(__dirname, '..', 'functions', 'service-account.json');
    admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
  }
  const db = admin.firestore();

  console.log(`[canonicalize-brand-aliases] ${Object.keys(BRAND_ALIASES).length} alias entries loaded`);
  console.log('[canonicalize-brand-aliases] querying active listings…');
  const snap = await db.collection('externalListings').where('status', '==', 'active').get();
  console.log(`[canonicalize-brand-aliases] ${snap.size} active listings`);

  // Plan first — pure-local pass to find docs that need updating.
  const todo = [];
  const counts = {}; // canonical -> { from -> count }
  for (const doc of snap.docs) {
    const before = doc.data().canonical_brand;
    if (typeof before !== 'string') continue;
    const after = canonicalizeBrand(before);
    if (after !== before) {
      todo.push({ ref: doc.ref, before, after });
      counts[after] = counts[after] || {};
      counts[after][before] = (counts[after][before] || 0) + 1;
    }
  }

  console.log(`\n[canonicalize-brand-aliases] ${todo.length} listings would change brand:\n`);
  for (const [after, fromMap] of Object.entries(counts).sort((a, b) =>
    Object.values(b[1]).reduce((s, n) => s + n, 0) - Object.values(a[1]).reduce((s, n) => s + n, 0)
  )) {
    const total = Object.values(fromMap).reduce((s, n) => s + n, 0);
    console.log(`  → ${after}  (+${total})`);
    for (const [from, n] of Object.entries(fromMap).sort((a, b) => b[1] - a[1])) {
      console.log(`      ${String(n).padStart(5)}  ${from}`);
    }
  }

  if (args.dryRun) {
    console.log('\n[canonicalize-brand-aliases] dry run — no writes performed.');
    process.exit(0);
  }
  if (todo.length === 0) {
    console.log('\n[canonicalize-brand-aliases] nothing to do.');
    process.exit(0);
  }

  console.log(`\n[canonicalize-brand-aliases] writing ${todo.length} updates with concurrency=${args.concurrency}…`);
  let done = 0;
  let errored = 0;
  await runWithConcurrency(todo, args.concurrency, async (item) => {
    try {
      await item.ref.update({ canonical_brand: item.after });
    } catch (err) {
      errored++;
      console.error(`  err ${item.ref.id}: ${err.message}`);
    }
    done++;
    if (done % 100 === 0 || done === todo.length) {
      process.stdout.write(`\r[canonicalize-brand-aliases] ${done}/${todo.length}`);
    }
  });
  process.stdout.write('\n');
  console.log(`[canonicalize-brand-aliases] done. updated=${done - errored} errored=${errored}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
