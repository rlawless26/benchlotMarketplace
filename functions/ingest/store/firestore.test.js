/**
 * Regression test for the re-normalization treadmill.
 *
 * Scrapers emit canonical_brand/type/model/size and era_estimate as null on
 * every run. The Firestore merge-set used to write those nulls over the
 * normalizer's output; that write re-fired the onDocumentWritten trigger, whose
 * guard was `if (data.canonical_brand) return null` — brand had just been
 * nulled, so it did not skip — and the LLM re-ran to reproduce values it had
 * already produced. Every listing was re-billed on every scrape, forever, and
 * once Anthropic credits ran out on 2026-07-03 the same loop began stripping
 * normalization with nothing left to restore it.
 *
 * The mirror of store/postgres.test.js, which covers the same guarantee on the
 * other backend. Runs against the real project using a scratch document it
 * creates and deletes.
 *
 *   node functions/ingest/store/firestore.test.js
 */
process.env.BENCHLOT_STORE = 'firestore';
const admin = require('/Users/robertlawless/Documents/benchlot/functions/node_modules/firebase-admin');
const sa = require('/Users/robertlawless/Documents/benchlot/functions/service-account.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const store = require('/Users/robertlawless/Documents/benchlot/functions/ingest/store');

let bad = 0;
const check = (l, ok, x = '') => { if (!ok) bad++; console.log(`  ${ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${l}${x ? '  ' + x : ''}`); };

// Exactly what a scraper emits: canonical fields present and null.
const rec = (sid) => ({
  raw_format: 'woodnet_thread',
  raw: { test: true },
  listing: {
    source: 'woodnet', source_id: sid,
    source_url: 'https://example.invalid', title_raw: 'Stanley No 4 Smooth Plane',
    description_raw: 'desc', price_cents: 9900, currency: 'USD', condition_raw: null,
    images: [], posted_at: null, tags: [],
    canonical_brand: null, canonical_type: null, canonical_model: null,
    canonical_size: null, era_estimate: null,
  },
});

(async () => {
  const db = admin.firestore();
  const SID = '__treadmill_test__' + Date.now();
  const ref = db.collection('externalListings').doc(`woodnet__${SID}`);
  const t = () => admin.firestore.Timestamp.now();

  console.log('1. first scrape inserts');
  await store.upsertListings([rec(SID)], t());
  check('doc created', (await ref.get()).exists);

  console.log('\n2. normalizer fills the canonical fields');
  await ref.update({
    canonical_brand: 'Stanley', canonical_type: 'Bench Plane',
    canonical_model: 'No. 4', era_estimate: '1920s', plane_type_number: 11,
    normalized_at: admin.firestore.FieldValue.serverTimestamp(),
    normalizer_model: 'claude-haiku-4-5',
  });
  check('canonical_brand set', (await ref.get()).data().canonical_brand === 'Stanley');

  console.log('\n3. RE-SCRAPE — the write that used to blank everything');
  await store.upsertListings([rec(SID)], t());
  const after = (await ref.get()).data();
  check('canonical_brand survived', after.canonical_brand === 'Stanley', String(after.canonical_brand));
  check('canonical_type survived', after.canonical_type === 'Bench Plane', String(after.canonical_type));
  check('canonical_model survived', after.canonical_model === 'No. 4', String(after.canonical_model));
  check('era_estimate survived', after.era_estimate === '1920s', String(after.era_estimate));
  check('plane_type_number survived', after.plane_type_number === 11, String(after.plane_type_number));
  check('normalized_at survived', !!after.normalized_at);
  check('scraped fields still update', after.title_raw === 'Stanley No 4 Smooth Plane');

  console.log('\n4. the trigger guard would now SKIP this doc');
  check('guard sees normalized_at', !!after.normalized_at, '(old guard keyed on canonical_brand)');

  await ref.delete();
  await db.collection('externalListingsRaw').doc(`woodnet__${SID}`).delete().catch(() => {});
  console.log('\n  scratch docs deleted');
  console.log(bad ? `\n\x1b[31m${bad} failed\x1b[0m` : '\n\x1b[32mTreadmill fix verified against Firestore\x1b[0m');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
