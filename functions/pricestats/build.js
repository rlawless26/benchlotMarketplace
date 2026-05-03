/**
 * priceStats build job.
 *
 * Aggregates `externalListings` into per-cluster price-distribution
 * summaries written to the `priceStats` Firestore collection. Each
 * priceStats doc holds two stat blocks:
 *
 *   - sold block   — rows with `status === 'sold'` (no time window;
 *                    sold prices are reference anchors, not freshness
 *                    signals, and some sold sources can't expose
 *                    per-item sale dates)
 *   - asking block — rows with `status IN ['active','expired']`,
 *                    365d window on `last_seen_at`
 *
 * Two clustering grains are written as separate docs:
 *
 *   - coarse: (canonical_type, canonical_brand)
 *   - fine:   (canonical_type, canonical_brand, canonical_size)
 *
 * Read-side consumers prefer the fine grain when it meets display
 * thresholds, falling back to coarse otherwise — see lookup.js.
 *
 * Idempotent: re-running on the same data overwrites priceStats with
 * the same values. Safe to retry.
 */

const admin = require('firebase-admin');

const {
  clusterKey,
  ASKING_WINDOW_DAYS,
} = require('./cluster');

// We still persist `p10` and `p90` percentiles when the sample is
// large enough (n >= 20). v1 doesn't read them — the trust-first
// design uses only p25/p50/p75 — but writing them keeps the
// priceStats doc shape stable for v2 when tier classification
// returns with kind+condition stratification.
const N_FOR_TAIL_PERCENTILES = 20;

const COLLECTION = 'externalListings';
const STATS_COLLECTION = 'priceStats';

const SCAN_BATCH = 500;
const WRITE_BATCH = 400; // priceStats writes are 1 op each — well under 500

// Source-kind mapping. Mirrors src/firebase/adapters/sources.js — kept
// here as a small flat object (not a require/import) because the React-
// side sources.js uses ES module exports incompatible with the
// CommonJS Cloud Functions runtime. Update both files when adding a new
// source. The build only cares about `kind`; full source metadata stays
// in the React module.
const SOURCE_KINDS = Object.freeze({
  jimbode:            'Dealer',
  jimbode_valueguide: 'Dealer',
  hyperkitten:        'Dealer',
  thebestthings:      'Dealer',
  rouillard:          'Dealer',
  vintagevials:       'Dealer',
  oldtools:           'Dealer',
  leach:              'Dealer',
  sawmillcreek:       'Forum',
  woodnet:            'Forum',
  lumberjocks:        'Forum',
  reddit:             'Reddit',
  ebay:               'Marketplace',
  fbmarketplace:      'Marketplace',
});

// The set of kinds the build job ever computes per-kind sub-blocks for.
// Any kind not in this list is dropped from per-kind aggregation — the
// row still contributes to the overall block. Reddit excluded for now;
// volume is too low to make per-kind percentiles meaningful.
const PER_KIND_TRACKED = ['Dealer', 'Marketplace', 'Forum'];

function kindForSource(source) {
  return SOURCE_KINDS[source] || null;
}

// Sample-selection guardrails (mirrors the plan's B.1 rules).
const PRICE_CENTS_MIN = 1;
const PRICE_CENTS_MAX = 5_000_000; // $50,000 — drops obvious typos
const CONDITION_DROP_RE = /\b(parts only|as[- ]?is|for repair|project)\b/i;
const BRAND_DROP_VALUES = new Set(['Unknown', '', null]);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Linear-interpolation percentile (NumPy default, "type 7"). Works on a
 * pre-sorted ascending array of numbers.
 */
function percentile(sorted, p) {
  if (!sorted || sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const frac = rank - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

function mean(arr) {
  if (!arr || arr.length === 0) return null;
  let sum = 0;
  for (const v of arr) sum += v;
  return sum / arr.length;
}

/**
 * Decide whether a sample qualifies for the build. Returns true/false.
 * `row` is the externalListings doc data.
 */
function isQualifyingSample(row) {
  if (!row) return false;
  if (typeof row.price_cents !== 'number') return false;
  if (row.price_cents < PRICE_CENTS_MIN || row.price_cents > PRICE_CENTS_MAX) return false;
  if (BRAND_DROP_VALUES.has(row.canonical_brand)) return false;
  if (!row.canonical_type) return false;
  if (row.condition_raw && CONDITION_DROP_RE.test(row.condition_raw)) return false;
  return true;
}

/**
 * One streaming scan with pagination. Yields documents one at a time via
 * the supplied `onRow` callback. Returns the number of rows scanned.
 */
async function streamScan(query, onRow) {
  let cursor = null;
  let scanned = 0;
  /* eslint-disable no-constant-condition */
  while (true) {
    let q = query.limit(SCAN_BATCH);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      onRow(doc.data());
      scanned += 1;
    }
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < SCAN_BATCH) break;
  }
  return scanned;
}

/**
 * Add a sample to a cluster bucket inside `acc`. Mutates acc.
 * `block` is 'sold' or 'asking'. `kind` is the source-kind
 * (Dealer / Marketplace / Forum / Reddit / null).
 */
function pushSample(acc, key, fields, priceCents, block, kind) {
  let bucket = acc.get(key);
  if (!bucket) {
    bucket = {
      cluster_key: key,
      canonical_type: fields.canonical_type,
      canonical_brand: fields.canonical_brand,
      canonical_size: fields.canonical_size,
      sold: [],
      asking: [],
      asking_count_active: 0,
      asking_count_expired: 0,
      // Per-kind sub-arrays. Initialized lazily.
      sold_by_kind: {},
      asking_by_kind: {},
    };
    acc.set(key, bucket);
  }
  if (block === 'sold') {
    bucket.sold.push(priceCents);
    if (kind && PER_KIND_TRACKED.includes(kind)) {
      if (!bucket.sold_by_kind[kind]) bucket.sold_by_kind[kind] = [];
      bucket.sold_by_kind[kind].push(priceCents);
    }
  } else {
    bucket.asking.push(priceCents);
    if (kind && PER_KIND_TRACKED.includes(kind)) {
      if (!bucket.asking_by_kind[kind]) bucket.asking_by_kind[kind] = [];
      bucket.asking_by_kind[kind].push(priceCents);
    }
  }
}

/**
 * Compute one block's stats from an array of price_cents values.
 * Returns the field set used by lookup / pickReference. Prices are
 * persisted in DOLLARS (not cents) so consumers don't have to convert
 * on every render.
 */
function computeBlock(prices) {
  if (!prices || prices.length === 0) {
    return { count: 0, p10: null, p25: null, p50: null, p75: null, p90: null, mean: null };
  }
  const sorted = [...prices].sort((a, b) => a - b);
  const dollars = (cents) => Math.round(cents) / 100;
  const enoughForTails = sorted.length >= N_FOR_TAIL_PERCENTILES;
  return {
    count: sorted.length,
    p10: enoughForTails ? dollars(percentile(sorted, 10)) : null,
    p25: dollars(percentile(sorted, 25)),
    p50: dollars(percentile(sorted, 50)),
    p75: dollars(percentile(sorted, 75)),
    p90: enoughForTails ? dollars(percentile(sorted, 90)) : null,
    mean: dollars(mean(sorted)),
  };
}

/**
 * Run the full build. Reads externalListings, partitions, aggregates,
 * and writes priceStats docs.
 *
 * @returns {Promise<{
 *   clusters_written: number,
 *   clusters_with_sold: number,
 *   clusters_with_asking: number,
 *   samples_seen_sold: number,
 *   samples_seen_asking: number,
 *   samples_qualified_sold: number,
 *   samples_qualified_asking: number,
 *   duration_ms: number,
 * }>}
 */
async function runBuild() {
  const t0 = Date.now();
  const db = admin.firestore();
  const col = db.collection(COLLECTION);

  const now = Date.now();
  const askingCutoff = admin.firestore.Timestamp.fromMillis(now - ASKING_WINDOW_DAYS * ONE_DAY_MS);
  // Sold samples are reference anchors, not freshness signals — woodworking-
  // tool prices don't move fast and a years-old sold comp on a Stanley No. 5
  // still anchors today's market. We deliberately do NOT window the sold
  // scan. This also sidesteps sources that can't expose per-item sale dates
  // (Jim Bode Value Guide today). When future sources DO have authoritative
  // dates we'll still write `sold_at` and surface them in the UI.

  // acc maps cluster_key (fine OR coarse) → bucket. Fine and coarse keys
  // never collide because the size segment differs ('no-5' vs '_').
  const acc = new Map();

  let samples_seen_sold = 0;
  let samples_seen_asking = 0;
  let samples_qualified_sold = 0;
  let samples_qualified_asking = 0;

  function ingest(row, block) {
    if (block === 'sold') samples_seen_sold += 1;
    else samples_seen_asking += 1;

    if (!isQualifyingSample(row)) return;

    if (block === 'sold') samples_qualified_sold += 1;
    else samples_qualified_asking += 1;

    const kind = kindForSource(row.source);

    // Coarse grain
    const coarseFields = {
      canonical_type: row.canonical_type,
      canonical_brand: row.canonical_brand,
      canonical_size: null,
    };
    pushSample(acc, clusterKey(coarseFields), coarseFields, row.price_cents, block, kind);

    // Fine grain — only when size is non-null
    if (row.canonical_size) {
      const fineFields = {
        canonical_type: row.canonical_type,
        canonical_brand: row.canonical_brand,
        canonical_size: row.canonical_size,
      };
      pushSample(acc, clusterKey(fineFields), fineFields, row.price_cents, block, kind);
    }

    if (block === 'asking') {
      // Bookkeep active/expired split for both grains.
      const incrementOn = (key) => {
        const b = acc.get(key);
        if (!b) return;
        if (row.status === 'active') b.asking_count_active += 1;
        else if (row.status === 'expired') b.asking_count_expired += 1;
      };
      incrementOn(clusterKey(coarseFields));
      if (row.canonical_size) {
        incrementOn(clusterKey({
          canonical_type: row.canonical_type,
          canonical_brand: row.canonical_brand,
          canonical_size: row.canonical_size,
        }));
      }
    }
  }

  // Sold scan: every row with status == 'sold' qualifies. Order by
  // `first_seen_at asc` (always populated) so pagination cursors are
  // stable regardless of whether the source populates `sold_at`.
  await streamScan(
    col.where('status', '==', 'sold').orderBy('first_seen_at', 'asc'),
    (row) => ingest(row, 'sold')
  );

  // Asking scans: active + expired (Firestore can't do `in` + range, so
  // two scans — one per status).
  await streamScan(
    col.where('status', '==', 'active').where('last_seen_at', '>=', askingCutoff).orderBy('last_seen_at', 'asc'),
    (row) => ingest(row, 'asking')
  );
  await streamScan(
    col.where('status', '==', 'expired').where('last_seen_at', '>=', askingCutoff).orderBy('last_seen_at', 'asc'),
    (row) => ingest(row, 'asking')
  );

  // Compute stats and write priceStats docs in batches.
  const last_built_at = admin.firestore.Timestamp.now();
  const statsCol = db.collection(STATS_COLLECTION);

  let clusters_written = 0;
  let clusters_with_sold = 0;
  let clusters_with_asking = 0;
  let batch = db.batch();
  let inBatch = 0;

  for (const bucket of acc.values()) {
    const sold = computeBlock(bucket.sold);
    const asking = computeBlock(bucket.asking);

    // Skip clusters with literally no samples. Shouldn't happen because
    // pushSample is only called on a qualified row, but defensive.
    if (sold.count === 0 && asking.count === 0) continue;

    if (sold.count > 0) clusters_with_sold += 1;
    if (asking.count > 0) clusters_with_asking += 1;

    // Per-kind sub-blocks. We persist each kind's stats only when it has
    // at least 10 comps — below that the percentile estimates are too
    // noisy to render. Sparse fields are stored as `null` rather than
    // omitted so consumers can read uniformly without existence checks.
    const perKindBlock = (samples) => {
      const block = computeBlock(samples);
      return block.count >= 10 ? block : null;
    };
    const sold_by_kind = {};
    const asking_by_kind = {};
    for (const k of PER_KIND_TRACKED) {
      sold_by_kind[k] = perKindBlock(bucket.sold_by_kind[k] || []);
      asking_by_kind[k] = perKindBlock(bucket.asking_by_kind[k] || []);
    }

    const doc = {
      cluster_key: bucket.cluster_key,
      canonical_type: bucket.canonical_type,
      canonical_brand: bucket.canonical_brand,
      canonical_size: bucket.canonical_size,
      grain: bucket.canonical_size ? 'fine' : 'coarse',

      // Sold block — overall (Jim Bode Value Guide today; future ebay_sold etc.)
      sold_count: sold.count,
      sold_p10: sold.p10,
      sold_p25: sold.p25,
      sold_p50: sold.p50,
      sold_p75: sold.p75,
      sold_p90: sold.p90,
      sold_mean: sold.mean,

      // Asking block — overall (active + expired)
      asking_count: asking.count,
      asking_count_active: bucket.asking_count_active,
      asking_count_expired: bucket.asking_count_expired,
      asking_p10: asking.p10,
      asking_p25: asking.p25,
      asking_p50: asking.p50,
      asking_p75: asking.p75,
      asking_p90: asking.p90,
      asking_mean: asking.mean,

      // Per-source-kind sub-blocks. Each is the same shape as the
      // overall block ({count, p10..p90, mean}) or null when the kind
      // has fewer than 10 comps in this cluster. Surfaces the
      // dealer-vs-marketplace pricing gap on the popover and /guide
      // pages without making auto-tier judgments.
      sold_by_kind,
      asking_by_kind,

      // Metadata
      asking_window_days: ASKING_WINDOW_DAYS,
      sold_window_days: null, // sold block is unwindowed by design
      last_built_at,
    };

    batch.set(statsCol.doc(bucket.cluster_key), doc);
    clusters_written += 1;
    inBatch += 1;
    if (inBatch >= WRITE_BATCH) {
      await batch.commit();
      batch = db.batch();
      inBatch = 0;
    }
  }
  if (inBatch > 0) await batch.commit();

  return {
    clusters_written,
    clusters_with_sold,
    clusters_with_asking,
    samples_seen_sold,
    samples_seen_asking,
    samples_qualified_sold,
    samples_qualified_asking,
    duration_ms: Date.now() - t0,
  };
}

module.exports = {
  runBuild,
  // exported for tests
  isQualifyingSample,
  computeBlock,
  percentile,
};
