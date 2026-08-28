/**
 * PriceGuidePage — per-cluster price-history detail.
 *
 * Route: `/guide/:typeSlug/:brandSlug/:sizeSlug?`
 *
 * Shows two stat blocks (Sold / Asking) for the cluster, an overlaid
 * histogram, the recent active listings list, and (when sold-comp data
 * exists) a recent-sold list. SaveAlertButton at top-right.
 *
 * The page reads `priceStats/{cluster_key}` directly. Cluster-key
 * derivation mirrors `src/utils/priceStats.js#clusterKeyFromSlugs`. If
 * a fine-grain key 404s, we fall back to the coarse grain so a stale
 * link to a no-longer-populated size still renders something useful.
 */

import React, { useEffect, useState } from 'react';
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
  clusterKeyFromSlugs,
  hasDisplayableStats,
  perKindBlocks,
  pickReference,
} from '../../utils/priceStats';
import { track } from '../../utils/analytics';
import PriceHistogram from '../../components/aggregator/PriceHistogram';
import SaveAlertButton from '../../components/aggregator/SaveAlertButton';
import ResultCard from '../../components/aggregator/ResultCard';

const STATS_COLLECTION = 'priceStats';
const LISTINGS_COLLECTION = 'externalListings';
const ACTIVE_LIMIT = 60;
const SOLD_LIMIT = 20;

function formatPrice(d) {
  if (d == null || !Number.isFinite(d)) return '—';
  return `$${Math.round(d)}`;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

async function fetchStats(typeSlug, brandSlug, sizeSlug) {
  const tries = [];
  if (sizeSlug) tries.push({ key: clusterKeyFromSlugs(typeSlug, brandSlug, sizeSlug), grain: 'fine' });
  tries.push({ key: clusterKeyFromSlugs(typeSlug, brandSlug, null), grain: 'coarse' });

  for (const t of tries) {
    const snap = await getDoc(doc(db, STATS_COLLECTION, t.key));
    if (snap.exists()) {
      const stats = snap.data();
      if (hasDisplayableStats(stats)) {
        return { stats, grain: t.grain, cluster_key: t.key };
      }
    }
  }
  return null;
}

async function fetchActiveListings({ canonical_type, canonical_brand, canonical_size }) {
  const constraints = [
    where('status', '==', 'active'),
    where('canonical_type', '==', canonical_type),
    where('canonical_brand', '==', canonical_brand),
    orderBy('first_seen_at', 'desc'),
    limitQ(ACTIVE_LIMIT),
  ];
  const snap = await getDocs(query(collection(db, LISTINGS_COLLECTION), ...constraints));
  let rows = snap.docs.map((d) => adaptExternalListing(d.id, d.data()));
  // Client-side size filter when the URL specifies a size — Firestore can't
  // efficiently combine the existing composite index with another equality
  // on canonical_size without a new index.
  if (canonical_size) {
    rows = rows.filter((r) => r.canonical_size === canonical_size);
  }
  return rows;
}

async function fetchRecentSold({ canonical_type, canonical_brand, canonical_size }) {
  // Order by `first_seen_at desc` (always populated) rather than
  // `sold_at desc` because not all sold sources expose per-item sale
  // dates — Jim Bode Value Guide doesn't. orderBy on a nullable field
  // silently drops null-valued rows. We display sold_at when known and
  // omit the date column when it isn't.
  const constraints = [
    where('status', '==', 'sold'),
    where('canonical_type', '==', canonical_type),
    where('canonical_brand', '==', canonical_brand),
    orderBy('first_seen_at', 'desc'),
    limitQ(SOLD_LIMIT),
  ];
  const snap = await getDocs(query(collection(db, LISTINGS_COLLECTION), ...constraints));
  let rows = snap.docs.map((d) => ({
    id: d.id,
    title: d.data().title_raw,
    price: typeof d.data().price_cents === 'number' ? d.data().price_cents / 100 : null,
    sold_at: d.data().sold_at || null,
    source: d.data().source,
    source_url: d.data().source_url,
    canonical_size: d.data().canonical_size || null,
  }));
  if (canonical_size) {
    rows = rows.filter((r) => r.canonical_size === canonical_size);
  }
  return rows;
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
    <div
      style={{
        textTransform: 'uppercase',
        fontSize: 10,
        letterSpacing: '0.08em',
        opacity: 0.75,
        marginBottom: 6,
      }}
    >
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

const PriceGuidePage = () => {
  const params = useParams();
  const typeSlug = params.typeSlug || '_';
  const brandSlug = params.brandSlug || '_';
  const sizeSlug = params.sizeSlug || null;

  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState(null);
  const [grain, setGrain] = useState(null);
  const [clusterKey, setClusterKey] = useState(null);
  const [activeListings, setActiveListings] = useState([]);
  const [soldRows, setSoldRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      const found = await fetchStats(typeSlug, brandSlug, sizeSlug);
      if (cancelled) return;
      if (!found) {
        track('price_guide_no_data', {
          attempted_cluster_key: clusterKeyFromSlugs(typeSlug, brandSlug, sizeSlug),
        });
        setStats(null);
        setLoaded(true);
        return;
      }
      setStats(found.stats);
      setGrain(found.grain);
      setClusterKey(found.cluster_key);

      const ct = found.stats.canonical_type;
      const cb = found.stats.canonical_brand;
      const cs = found.stats.canonical_size; // null on coarse-grain docs

      const [active, sold] = await Promise.all([
        fetchActiveListings({ canonical_type: ct, canonical_brand: cb, canonical_size: cs }),
        (found.stats.sold_count || 0) > 0
          ? fetchRecentSold({ canonical_type: ct, canonical_brand: cb, canonical_size: cs })
          : Promise.resolve([]),
      ]);
      if (cancelled) return;
      setActiveListings(active);
      setSoldRows(sold);
      setLoaded(true);

      track('price_guide_page_viewed', {
        cluster_key: found.cluster_key,
        grain: found.grain,
        has_sold: (found.stats.sold_count || 0) > 0,
        has_asking: (found.stats.asking_count || 0) > 0,
        sold_count: found.stats.sold_count || 0,
        asking_count: found.stats.asking_count || 0,
        sold_p50: found.stats.sold_p50 ?? null,
        asking_p50: found.stats.asking_p50 ?? null,
      });
    })().catch((err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[PriceGuidePage] load failed:', err);
      }
      setStats(null);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [typeSlug, brandSlug, sizeSlug]);

  useEffect(() => {
    if (stats) {
      const sizeBit = stats.canonical_size ? ` ${stats.canonical_size}` : '';
      document.title = `${stats.canonical_brand}${sizeBit} ${stats.canonical_type} — Benchlot price guide`;
    } else if (loaded) {
      document.title = 'Price guide — Benchlot';
    }
  }, [stats, loaded]);

  if (!loaded) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#4a5a54', fontFamily: "'Outfit', sans-serif" }}>
        Loading price guide…
      </div>
    );
  }

  if (!stats) {
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
          No price-guide data for this combination yet.
        </h1>
        <p style={{ color: '#4a5a54', marginBottom: 16 }}>
          Benchlot needs at least 8 sold comps or 10 active/recent listings to publish a guide.
          We'll start one as soon as the data threshold is met.
        </p>
        <Link to="/" style={{ color: '#d4aa60', fontWeight: 600, textDecoration: 'none' }}>
          ← Back to search
        </Link>
      </div>
    );
  }

  const reference = pickReference(stats);
  const titleSize = stats.canonical_size ? ` ${stats.canonical_size}` : '';
  const heading = `${stats.canonical_brand}${titleSize} ${stats.canonical_type}`;
  const queryString = `${stats.canonical_brand}${stats.canonical_size ? ' ' + stats.canonical_size : ''}`;

  // Build histogram samples from the cluster docs we just fetched. We
  // re-derive prices from the listings pages rather than persisting a
  // sample list on priceStats — keeps priceStats docs small.
  const histogramSamples = [
    ...activeListings
      .filter((l) => typeof l.price === 'number')
      .map((l) => ({ price: l.price, kind: 'asking' })),
    ...soldRows
      .filter((s) => typeof s.price === 'number')
      .map((s) => ({ price: s.price, kind: 'sold' })),
  ];

  // SaveAlertButton expects useAggregatorState shape — pre-fill the
  // search state so the saved alert acts like the user filtered for this
  // cluster on `/`.
  const alertState = {
    query: queryString,
    filters: {
      cat: { [stats.canonical_type]: true },
      maker: { [stats.canonical_brand]: true },
    },
    sort: 'best',
  };

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
          <Link
            to="/"
            style={{ color: '#4a5a54', fontSize: 12, textDecoration: 'none' }}
          >
            ← All listings
          </Link>
          <h1 style={{ fontFamily: "'Petrona', serif", fontSize: 32, fontWeight: 600, margin: '6px 0 4px' }}>
            {heading} — what it sells for.
          </h1>
          {grain === 'coarse' && stats.canonical_size && (
            <p style={{ fontSize: 12, color: '#4a5a54', margin: 0 }}>
              Showing brand-level guide; not enough comps yet for the size-specific view.
            </p>
          )}
        </div>
        {/* This route is shadowed by the /guide/* rewrite to the Next app, which
            has its own cluster-scoped alert form. Link variant only. */}
        <SaveAlertButton />
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
        {(stats.sold_count || 0) > 0 && (
          <StatCard
            kind="sold"
            count={stats.sold_count}
            p25={stats.sold_p25}
            p50={stats.sold_p50}
            p75={stats.sold_p75}
            footnote="Source: Jim Bode Value Guide · dealer-grade specimens"
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

      {/* Per-source-kind asking breakdown — surfaces the dealer-vs-
          marketplace-vs-forum gap that's otherwise hidden in the overall
          asking-block median. The build job only writes per-kind blocks
          when each kind has ≥10 comps in the cluster, so this section
          is automatically hidden when coverage is too thin. */}
      {(() => {
        const askingByKind = perKindBlocks(stats, 'asking');
        if (askingByKind.length === 0) return null;
        return (
          <div
            style={{
              marginTop: 16,
              padding: '14px 16px',
              background: '#fffefb',
              border: '1px solid #e4e2dc',
              borderRadius: 8,
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5a54', marginBottom: 8 }}>
              Asking prices by source kind
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {askingByKind.map((b) => (
                <div key={b.kind} style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 11, color: '#4a5a54', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {b.kind}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1a3030', marginTop: 2 }}>
                    {formatPrice(b.p50)}
                  </div>
                  <div style={{ fontSize: 12, color: '#4a5a54', marginTop: 2 }}>
                    range {formatPrice(b.p25)}–{formatPrice(b.p75)} · {b.count} comp{b.count === 1 ? '' : 's'}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#4a5a54', marginTop: 10 }}>
              Dealer kind covers Jim Bode, Hyperkitten, The Best Things, Rouillard, etc. Marketplace covers eBay and Facebook Marketplace. Forum covers Sawmill Creek and Woodnet classifieds. Listings without enough coverage in a kind are omitted from this breakdown.
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

      {/* Active listings */}
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
                  activeSort: 'guide_page',
                  cluster_key: clusterKey,
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
          <div
            style={{
              background: '#fffefb',
              border: '1px solid #e4e2dc',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {soldRows.map((row, i) => (
              <a
                key={row.id}
                href={row.source_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('price_guide_sold_listing_clicked', {
                  cluster_key: clusterKey,
                  position: i,
                  sold_price: row.price,
                })}
                style={{
                  display: 'grid',
                  // Three-column when we have a sold_at; two-column when
                  // it's null (Jim Bode VG today). Mixed lists collapse
                  // to two-column so date alignment stays consistent.
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
        Sold prices sourced from Jim Bode's published Value Guide; per-item sale dates aren't published for that source. Asking prices from active and recent listings indexed by Benchlot (last 365 days). Reference distribution: <strong>{reference?.source || 'asking'}</strong>. Not an appraisal.
      </p>
    </div>
  );
};

export default PriceGuidePage;
