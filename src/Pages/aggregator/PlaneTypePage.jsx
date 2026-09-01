/**
 * PlaneTypePage — canonical page for a Stanley bench plane variant.
 *
 * Routes:
 *   /planes/:brandSlug/:modelSlug                  — model-level (e.g. /planes/stanley/no-5)
 *   /planes/:brandSlug/:modelSlug/:typeSlug        — type-level   (e.g. /planes/stanley/no-5/type-11)
 *
 * Reads `priceStats` with finest-first fallback (type-fine → model-fine →
 * coarse) and merges Stanley ↔ Stanley-Bailey clusters at lookup time so
 * the URL `/planes/stanley/...` always picks up data from both brand
 * canonicalizations. Brand-alias logic lives in `src/data/stanleyBenchPlanes.js`.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  collection,
  query,
  where,
  orderBy,
  limit as limitQ,
  getDoc,
  getDocs,
  doc,
} from 'firebase/firestore';

import { db } from '../../firebase/config';
import { adaptExternalListing } from '../../firebase/adapters/externalListingAdapter';
import {
  clusterKey,
  clusterKeyModel,
  clusterKeyType,
  pickReference,
  pickReferenceWithFallback,
  perKindBlocks,
  hasDisplayableStats,
} from '../../utils/priceStats';
import {
  parseBrandSlug,
  parseModelSlug,
  parseTypeSlug,
  getStanleyTypeStudy,
  getStanleyModel,
} from '../../data/stanleyBenchPlanes';
import { track } from '../../utils/analytics';
import PriceHistogram from '../../components/aggregator/PriceHistogram';
import SaveAlertButton from '../../components/aggregator/SaveAlertButton';
import ResultCard from '../../components/aggregator/ResultCard';

const STATS_COLLECTION = 'priceStats';
const LISTINGS_COLLECTION = 'externalListings';
// Pull a wider page than we display so the client-side filter (brand
// alias + model + plane_type_number) has enough rows to find matches.
// 200 covers any single Bench-Plane brand/model/type combo at current
// catalog size with headroom.
const FETCH_LIMIT = 200;
const ACTIVE_DISPLAY_LIMIT = 12;
const SOLD_DISPLAY_LIMIT = 20;

// v1 only handles bench planes — the new plane_type_number cluster
// grain only applies to canonical_type === 'Bench Plane' anyway.
const CANONICAL_TYPE = 'Bench Plane';

function formatPrice(d) {
  if (d == null || !Number.isFinite(d)) return '—';
  return `$${Math.round(d)}`;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Build the ordered priority list of cluster keys to try, then fetch all
 * of them in parallel. Returns the array of stats docs that exist (in
 * priority order) so the caller can pick the best displayable one.
 */
async function fetchClusters({ canonical_type, canonical_brand_aliases, canonical_model, plane_type_number }) {
  const tries = [];
  if (Number.isInteger(plane_type_number)) {
    for (const brand of canonical_brand_aliases) {
      tries.push(clusterKeyType({ canonical_type, canonical_brand: brand, canonical_model, plane_type_number }));
    }
  }
  for (const brand of canonical_brand_aliases) {
    tries.push(clusterKeyModel({ canonical_type, canonical_brand: brand, canonical_model }));
  }
  for (const brand of canonical_brand_aliases) {
    tries.push(clusterKey({ canonical_type, canonical_brand: brand, canonical_size: null }));
  }
  // De-dupe in case alias arrays overlap (rare but possible)
  const uniqueKeys = [...new Set(tries)];
  const docs = await Promise.all(uniqueKeys.map((k) => getDoc(doc(db, STATS_COLLECTION, k))));
  return docs
    .map((s) => s.exists() ? { ...s.data(), _key: s.ref.id } : null)
    .filter(Boolean);
}

async function fetchActiveListings({ canonical_type, canonical_brand_aliases, canonical_model, plane_type_number }) {
  const constraints = [
    where('status', '==', 'active'),
    where('canonical_type', '==', canonical_type),
    orderBy('first_seen_at', 'desc'),
    limitQ(FETCH_LIMIT),
  ];
  const snap = await getDocs(query(collection(db, LISTINGS_COLLECTION), ...constraints));
  return snap.docs
    .map((d) => adaptExternalListing(d.id, d.data()))
    .filter((r) => canonical_brand_aliases.includes(r.canonical_brand))
    .filter((r) => r.canonical_model === canonical_model)
    .filter((r) => !Number.isInteger(plane_type_number) || r.plane_type_number === plane_type_number)
    .slice(0, ACTIVE_DISPLAY_LIMIT);
}

async function fetchRecentSold({ canonical_type, canonical_brand_aliases, canonical_model, plane_type_number }) {
  const constraints = [
    where('status', '==', 'sold'),
    where('canonical_type', '==', canonical_type),
    orderBy('first_seen_at', 'desc'),
    limitQ(FETCH_LIMIT),
  ];
  const snap = await getDocs(query(collection(db, LISTINGS_COLLECTION), ...constraints));
  return snap.docs
    .map((d) => ({
      id: d.id,
      title: d.data().title_raw,
      price: typeof d.data().price_cents === 'number' ? d.data().price_cents / 100 : null,
      sold_at: d.data().sold_at || null,
      source: d.data().source,
      source_url: d.data().source_url,
      canonical_brand: d.data().canonical_brand,
      canonical_model: d.data().canonical_model,
      plane_type_number: d.data().plane_type_number,
    }))
    .filter((r) => canonical_brand_aliases.includes(r.canonical_brand))
    .filter((r) => r.canonical_model === canonical_model)
    .filter((r) => !Number.isInteger(plane_type_number) || r.plane_type_number === plane_type_number)
    .slice(0, SOLD_DISPLAY_LIMIT);
}

const StatCard = ({ kind, count, p25, p50, p75, footnote }) => (
  <div
    style={{
      flex: 1,
      minWidth: 240,
      padding: '14px 16px',
      background: kind === 'sold' ? '#1a3030' : '#fffefb',
      color: kind === 'sold' ? '#f2f0eb' : '#1a3030',
      border: kind === 'sold' ? 'none' : '1px solid #e4e2dc',
      borderRadius: 8,
      fontFamily: "'Outfit', sans-serif",
    }}
  >
    <div style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em', opacity: 0.75, marginBottom: 6 }}>
      {kind === 'sold' ? 'Recent sold prices' : 'Currently asking'}
    </div>
    <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.1 }}>
      {formatPrice(p50)}
    </div>
    <div style={{ fontSize: 13, marginTop: 4, opacity: 0.85 }}>
      Range {formatPrice(p25)}–{formatPrice(p75)} · {count} comp{count === 1 ? '' : 's'}
    </div>
    {footnote && (
      <div style={{ fontSize: 11, marginTop: 8, opacity: 0.7 }}>{footnote}</div>
    )}
  </div>
);

const PlaneTypePage = () => {
  const params = useParams();
  const brandSlug = params.brandSlug;
  const modelSlug = params.modelSlug;
  const typeSlug = params.typeSlug || null;

  // Derive canonical fields from URL slugs. useMemo to keep the
  // useEffect-deps stable when params change.
  const brand = useMemo(() => parseBrandSlug(brandSlug), [brandSlug]);
  const canonicalModel = useMemo(() => parseModelSlug(modelSlug), [modelSlug]);
  const planeTypeNumber = useMemo(() => (typeSlug ? parseTypeSlug(typeSlug) : null), [typeSlug]);

  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState(null);
  const [grain, setGrain] = useState(null);
  const [clusterKeyValue, setClusterKeyValue] = useState(null);
  const [activeListings, setActiveListings] = useState([]);
  const [soldRows, setSoldRows] = useState([]);

  // Whether we resolved to the requested type-fine grain or had to
  // fall back. Surfaced in the page so users know when they're seeing
  // a broader cluster than they asked for.
  const wantedTypeFine = Number.isInteger(planeTypeNumber);
  const grainFallback = wantedTypeFine && grain && grain !== 'type-fine';

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setStats(null);
    setGrain(null);
    setClusterKeyValue(null);
    setActiveListings([]);
    setSoldRows([]);

    if (!brand || !canonicalModel) {
      setLoaded(true);
      return undefined;
    }

    const lookupParams = {
      canonical_type: CANONICAL_TYPE,
      canonical_brand_aliases: brand.aliases,
      canonical_model: canonicalModel,
      plane_type_number: planeTypeNumber,
    };

    (async () => {
      const docs = await fetchClusters(lookupParams);
      if (cancelled) return;

      // Prefer the highest-priority doc that meets display thresholds.
      // If none meets thresholds, fall back to the first doc that exists
      // at all so we can still show a header + "not enough data" message
      // alongside the static type-study content.
      const ref = pickReferenceWithFallback(docs);
      let bestStats = null, bestKey = null, bestGrain = null;
      if (ref) {
        bestStats = ref._stats;
        bestKey = ref._stats._key;
        bestGrain = ref._stats.grain;
      } else if (docs.length > 0) {
        bestStats = docs[0];
        bestKey = docs[0]._key;
        bestGrain = docs[0].grain;
      }

      const [active, sold] = await Promise.all([
        fetchActiveListings(lookupParams),
        fetchRecentSold(lookupParams),
      ]);
      if (cancelled) return;

      setStats(bestStats);
      setGrain(bestGrain);
      setClusterKeyValue(bestKey);
      setActiveListings(active);
      setSoldRows(sold);
      setLoaded(true);

      track('plane_type_page_viewed', {
        brand_slug: brandSlug,
        model_slug: modelSlug,
        type_slug: typeSlug,
        canonical_brand_primary: brand.canonical,
        canonical_model: canonicalModel,
        plane_type_number: planeTypeNumber,
        cluster_key: bestKey,
        grain: bestGrain,
        has_stats: !!bestStats,
        has_displayable: !!ref,
        sold_count: bestStats?.sold_count || 0,
        asking_count: bestStats?.asking_count || 0,
        sold_p50: bestStats?.sold_p50 ?? null,
        asking_p50: bestStats?.asking_p50 ?? null,
        active_listings_shown: active.length,
        sold_listings_shown: sold.length,
      });
    })().catch((err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[PlaneTypePage] load failed:', err);
      }
      if (!cancelled) setLoaded(true);
    });

    return () => { cancelled = true; };
  }, [brand, canonicalModel, planeTypeNumber, brandSlug, modelSlug, typeSlug]);

  // Page title
  useEffect(() => {
    if (!brand || !canonicalModel) {
      document.title = 'Plane — Benchlot';
      return;
    }
    const typeLabel = planeTypeNumber ? ` Type ${planeTypeNumber}` : '';
    document.title = `${brand.canonical} ${canonicalModel}${typeLabel} — Value & current listings | Benchlot`;
  }, [brand, canonicalModel, planeTypeNumber]);

  if (!loaded) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#4a5a54', fontFamily: "'Outfit', sans-serif" }}>
        Loading…
      </div>
    );
  }

  // Bad URL → friendly fallback
  if (!brand || !canonicalModel) {
    return (
      <div
        style={{
          maxWidth: 720,
          margin: '40px auto',
          padding: '32px 24px',
          background: '#fffefb',
          border: '1px solid #e4e2dc',
          borderRadius: 12,
          fontFamily: "'Outfit', sans-serif",
          color: '#1a3030',
        }}
      >
        <h1 style={{ fontFamily: "'Petrona', serif", fontSize: 28, marginBottom: 12 }}>
          We couldn't find that plane.
        </h1>
        <p style={{ color: '#4a5a54', marginBottom: 16 }}>
          The brand or model in the URL didn't match anything we know about. Try searching from the home page.
        </p>
        <Link to="/" style={{ color: '#d4aa60', fontWeight: 600, textDecoration: 'none' }}>← Back to search</Link>
      </div>
    );
  }

  const modelInfo = getStanleyModel(canonicalModel);
  const typeStudy = planeTypeNumber ? getStanleyTypeStudy(planeTypeNumber) : null;
  const reference = stats ? pickReference(stats) : null;
  const hasDisplay = stats ? hasDisplayableStats(stats) : false;

  const heading = `${brand.canonical} ${canonicalModel}${planeTypeNumber ? ` Type ${planeTypeNumber}` : ''}`;
  const subheadParts = [];
  if (modelInfo) {
    subheadParts.push(modelInfo.name);
    if (modelInfo.length) subheadParts.push(`${modelInfo.length} sole`);
  }
  if (typeStudy) {
    subheadParts.push(`${typeStudy.label} (${typeStudy.years})`);
  }
  const subhead = subheadParts.join(' · ');

  const histogramSamples = [
    ...activeListings.filter((l) => typeof l.price === 'number').map((l) => ({ price: l.price, kind: 'asking' })),
    ...soldRows.filter((s) => typeof s.price === 'number').map((s) => ({ price: s.price, kind: 'sold' })),
  ];

  // SaveAlertButton expects useAggregatorState shape — pre-fill the
  return (
    <div
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '24px 20px 64px',
        fontFamily: "'Outfit', sans-serif",
        color: '#1a3030',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
        <div>
          <Link to="/" style={{ color: '#4a5a54', fontSize: 12, textDecoration: 'none' }}>← All listings</Link>
          <h1 style={{ fontFamily: "'Petrona', serif", fontSize: 32, fontWeight: 600, margin: '6px 0 4px' }}>
            {heading}
          </h1>
          {subhead && (
            <p style={{ fontSize: 13, color: '#4a5a54', margin: 0 }}>{subhead}</p>
          )}
          {grainFallback && (
            <p style={{ fontSize: 11, color: '#4a5a54', margin: '4px 0 0', fontStyle: 'italic' }}>
              Showing {grain === 'model-fine' ? `${canonicalModel} (all types)` : 'brand-level'} stats — not enough comps for the type-specific view yet.
            </p>
          )}
        </div>
        <SaveAlertButton canonicalType={CANONICAL_TYPE} canonicalBrand={brand.canonical} />
      </div>

      {/* Confidence answer / stat cards */}
      {hasDisplay ? (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
          {(stats.sold_count || 0) > 0 && (
            <StatCard
              kind="sold"
              count={stats.sold_count}
              p25={stats.sold_p25}
              p50={stats.sold_p50}
              p75={stats.sold_p75}
              footnote={stats.sold_count >= 20 ? 'Recent sold comps from indexed sources' : 'Recent sold comps — small sample'}
            />
          )}
          {(stats.asking_count || 0) > 0 && (
            <StatCard
              kind="asking"
              count={stats.asking_count}
              p25={stats.asking_p25}
              p50={stats.asking_p50}
              p75={stats.asking_p75}
              footnote={`${stats.asking_count_active || 0} active · ${stats.asking_count_expired || 0} recent inactive`}
            />
          )}
        </div>
      ) : (
        <div
          style={{
            marginTop: 20,
            padding: '14px 16px',
            background: '#fffefb',
            border: '1px solid #e4e2dc',
            borderRadius: 8,
            color: '#4a5a54',
            fontSize: 13,
          }}
        >
          Not enough data yet for {heading}. Benchlot needs at least 8 sold comps or 10 active/recent listings before publishing a price reference. Check back as more listings get indexed.
        </div>
      )}

      {/* Type-study facts (only on type-level pages) */}
      {typeStudy && (
        <div
          style={{
            marginTop: 16,
            padding: '14px 16px',
            background: '#fffefb',
            border: '1px solid #e4e2dc',
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5a54', marginBottom: 10 }}>
            About {typeStudy.label}
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 140 }}>
              <div style={{ fontSize: 11, color: '#4a5a54', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Production</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4, color: '#1a3030' }}>{typeStudy.years}</div>
            </div>
            <div style={{ minWidth: 140 }}>
              <div style={{ fontSize: 11, color: '#4a5a54', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Era</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4, color: '#1a3030' }}>{typeStudy.era}</div>
            </div>
            <div style={{ flex: 2, minWidth: 280 }}>
              <div style={{ fontSize: 11, color: '#4a5a54', textTransform: 'uppercase', letterSpacing: '0.06em' }}>What to look for</div>
              <div style={{ fontSize: 13, marginTop: 4, color: '#1a3030', lineHeight: 1.45 }}>{typeStudy.features}</div>
            </div>
          </div>
        </div>
      )}

      {/* Per-source-kind asking breakdown (auto-hidden when sparse) */}
      {stats && (() => {
        const byKind = perKindBlocks(stats, 'asking');
        if (byKind.length === 0) return null;
        return (
          <div
            style={{
              marginTop: 16,
              padding: '14px 16px',
              background: '#fffefb',
              border: '1px solid #e4e2dc',
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5a54', marginBottom: 8 }}>
              Asking prices by source kind
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {byKind.map((b) => (
                <div key={b.kind} style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 11, color: '#4a5a54', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{b.kind}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1a3030', marginTop: 2 }}>{formatPrice(b.p50)}</div>
                  <div style={{ fontSize: 12, color: '#4a5a54', marginTop: 2 }}>
                    range {formatPrice(b.p25)}–{formatPrice(b.p75)} · {b.count} comp{b.count === 1 ? '' : 's'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Histogram */}
      {histogramSamples.length > 0 && (
        <div
          style={{
            marginTop: 24,
            padding: '16px 18px',
            background: '#fffefb',
            border: '1px solid #e4e2dc',
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5a54', marginBottom: 8 }}>
            Distribution
          </div>
          <PriceHistogram samples={histogramSamples} width={1040} height={170} />
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#4a5a54' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#1a3030', marginRight: 6, verticalAlign: 'middle' }} />Sold</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#d4aa60', marginRight: 6, verticalAlign: 'middle' }} />Asking</span>
          </div>
        </div>
      )}

      {/* Currently for sale */}
      {activeListings.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontFamily: "'Petrona', serif", fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
            Currently for sale ({activeListings.length})
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            {activeListings.map((listing, i) => (
              <ResultCard
                key={listing.id}
                listing={listing}
                searchContext={{
                  position: i,
                  totalResults: activeListings.length,
                  activeSort: 'plane_type_page',
                  cluster_key: clusterKeyValue,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent sold list */}
      {soldRows.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontFamily: "'Petrona', serif", fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
            Recent sold ({soldRows.length})
          </h2>
          <div style={{ background: '#fffefb', border: '1px solid #e4e2dc', borderRadius: 8, overflow: 'hidden' }}>
            {soldRows.map((row, i) => (
              <a
                key={row.id}
                href={row.source_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('plane_type_sold_listing_clicked', {
                  cluster_key: clusterKeyValue,
                  position: i,
                  sold_price: row.price,
                })}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 100px',
                  gap: 12,
                  padding: '10px 14px',
                  borderBottom: i < soldRows.length - 1 ? '1px solid #eceae4' : 'none',
                  textDecoration: 'none',
                  color: '#1a3030',
                  fontSize: 13,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</span>
                <span style={{ color: '#d4aa60', fontWeight: 600, textAlign: 'right' }}>{formatPrice(row.price)}</span>
                <span style={{ color: '#4a5a54', textAlign: 'right', fontSize: 11 }}>
                  {row.sold_at ? formatDate(row.sold_at) : (row.source === 'jimbode_valueguide' ? 'JB Value Guide' : '—')}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p style={{ marginTop: 32, fontSize: 11, color: '#4a5a54', maxWidth: 720 }}>
        Sold prices sourced from Jim Bode's published Value Guide and aggregated marketplace data. Asking prices from active and recent listings indexed by Benchlot (last 365 days). Reference distribution: <strong>{reference?.source || 'asking'}</strong>. Not an appraisal.
      </p>
    </div>
  );
};

export default PlaneTypePage;
