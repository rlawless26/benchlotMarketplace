/**
 * DealRatingBadge — small chip rendered next to a listing's price showing
 * how it compares to the priceStats reference distribution for its
 * (canonical_type, canonical_brand, canonical_size?) cluster.
 *
 * Tier rules live in src/utils/priceStats.js. Two schemes:
 *
 *   5-tier (n >= 20, p10/p90 populated):
 *     Sleeper / Good deal / Fair / High / Overpriced
 *
 *   3-tier fallback (10 <= n < 20):
 *     Below market / Around market / Above market
 *
 *   No badge below 10 comps.
 *
 * Click toggles a popover showing both sold and asking blocks (when
 * either populated), the chosen reference, and a link to the per-tool
 * `/guide/...` detail page.
 *
 * Naming note: "Sleeper" is collector vocabulary for an under-priced
 * find. v1 sleepers are pure price-vs-comp; Track C strengthens the
 * signal by blending in vision-detected type identification.
 */

import React, { useState, useRef, useEffect } from 'react';

import { classifyDealTier, pickReference, TIER_LABELS } from '../../utils/priceStats';
import { track } from '../../utils/analytics';

// Tier styling. Honey/spruce for the prominent Sleeper tier; positive,
// neutral, and warning treatments otherwise.
const TIER_STYLES = {
  sleeper: {
    background: '#1a3030', // spruce
    color: '#d4aa60',      // honey
    border: 'transparent',
    fontWeight: 700,
  },
  good_deal: {
    background: '#e6f1ea',
    color: '#205c40',
    border: '#cfe2d6',
    fontWeight: 600,
  },
  fair: {
    background: '#f2f0eb',
    color: '#4a5a54',
    border: '#e4e2dc',
    fontWeight: 500,
  },
  high: {
    background: '#fbf2e6',
    color: '#7a5a2a',
    border: '#ecdcc0',
    fontWeight: 500,
  },
  overpriced: {
    background: '#f7e6e1',
    color: '#7a3a2a',
    border: '#eccfc4',
    fontWeight: 500,
  },
  below_market: {
    background: '#e6f1ea',
    color: '#205c40',
    border: '#cfe2d6',
    fontWeight: 600,
  },
  around_market: {
    background: '#f2f0eb',
    color: '#4a5a54',
    border: '#e4e2dc',
    fontWeight: 500,
  },
  above_market: {
    background: '#fbf2e6',
    color: '#7a5a2a',
    border: '#ecdcc0',
    fontWeight: 500,
  },
};

function fmtPrice(d) {
  if (d == null || !Number.isFinite(d)) return '—';
  return `$${Math.round(d)}`;
}

function guideHref(stats) {
  if (!stats) return null;
  const { canonical_type, canonical_brand, canonical_size, grain } = stats;
  // Slug builder mirrors src/utils/priceStats.js#slug — duplicated here
  // because we only need the URL form, not the round-trippable cluster
  // key. Keep the regex in sync if slug() ever changes.
  const slug = (s) =>
    String(s)
      .trim()
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || '_';
  if (grain === 'fine' && canonical_size) {
    return `/guide/${slug(canonical_type)}/${slug(canonical_brand)}/${slug(canonical_size)}`;
  }
  return `/guide/${slug(canonical_type)}/${slug(canonical_brand)}`;
}

const DealRatingBadge = ({ listingPrice, stats, grain, clusterKey }) => {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);

  const hasFiredShownRef = useRef(false);

  const reference = pickReference(stats);
  const tier = classifyDealTier(listingPrice, reference);

  // Fire `price_badge_shown` once per badge per session (or once per
  // null result so we can quantify coverage gaps).
  useEffect(() => {
    if (hasFiredShownRef.current) return;
    hasFiredShownRef.current = true;
    track('price_badge_shown', {
      tier: tier || 'no_data',
      reference: reference?.source || null,
      sold_count: stats?.sold_count || 0,
      asking_count: stats?.asking_count || 0,
      grain: grain || null,
      cluster_key: clusterKey || null,
      canonical_type: stats?.canonical_type || null,
      canonical_brand: stats?.canonical_brand || null,
    });
    // We intentionally don't depend on tier/reference — this fires once
    // per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dismiss popover when clicking outside it.
  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      if (buttonRef.current && buttonRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  if (!tier) return null;

  const style = TIER_STYLES[tier] || TIER_STYLES.fair;
  const label = TIER_LABELS[tier] || 'Fair';

  const handleToggle = (e) => {
    // Outer ResultCard is an <a>; never let clicks here navigate.
    e.preventDefault();
    e.stopPropagation();
    const next = !open;
    setOpen(next);
    if (next) {
      track('price_badge_popover_opened', {
        tier,
        reference: reference?.source || null,
        cluster_key: clusterKey || null,
      });
    }
  };

  const handleGuideClick = (e) => {
    // Allow the link to navigate; just emit a click event.
    e.stopPropagation();
    track('price_guide_link_clicked', {
      cluster_key: clusterKey || null,
      from: 'card_popover',
      tier,
    });
  };

  const href = guideHref({
    canonical_type: stats?.canonical_type,
    canonical_brand: stats?.canonical_brand,
    canonical_size: stats?.canonical_size,
    grain,
  });

  const sold = stats?.sold_count > 0
    ? { count: stats.sold_count, p25: stats.sold_p25, p50: stats.sold_p50, p75: stats.sold_p75 }
    : null;
  const asking = stats?.asking_count > 0
    ? { count: stats.asking_count, p25: stats.asking_p25, p50: stats.asking_p50, p75: stats.asking_p75 }
    : null;

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center cursor-pointer"
        style={{
          padding: '2px 8px',
          borderRadius: 4,
          fontFamily: "'Outfit', sans-serif",
          fontSize: 11,
          letterSpacing: '0.02em',
          lineHeight: 1.4,
          ...style,
          border: `1px solid ${style.border}`,
        }}
      >
        {label}
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Price comparison details"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 20,
            width: 280,
            padding: '12px 14px',
            background: '#fffefb',
            border: '1px solid #e4e2dc',
            borderRadius: 8,
            boxShadow: '0 6px 20px rgba(12,28,30,0.18)',
            fontFamily: "'Outfit', sans-serif",
            fontSize: 12,
            color: '#1a3030',
          }}
        >
          {sold && (
            <div style={{ marginBottom: asking ? 10 : 0 }}>
              <div style={{ fontWeight: 600, color: '#4a5a54', fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Recent sold
              </div>
              <div style={{ marginTop: 2 }}>
                Median <strong>{fmtPrice(sold.p50)}</strong>
                {' · '}range {fmtPrice(sold.p25)}–{fmtPrice(sold.p75)}
              </div>
              <div style={{ color: '#4a5a54', fontSize: 11 }}>
                {sold.count} comp{sold.count === 1 ? '' : 's'} from Jim Bode Value Guide
              </div>
            </div>
          )}
          {asking && (
            <div>
              <div style={{ fontWeight: 600, color: '#4a5a54', fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Currently asking
              </div>
              <div style={{ marginTop: 2 }}>
                Median <strong>{fmtPrice(asking.p50)}</strong>
                {' · '}range {fmtPrice(asking.p25)}–{fmtPrice(asking.p75)}
              </div>
              <div style={{ color: '#4a5a54', fontSize: 11 }}>
                {asking.count} listing{asking.count === 1 ? '' : 's'} on Benchlot
              </div>
            </div>
          )}
          {href && (
            <a
              href={href}
              onClick={handleGuideClick}
              style={{
                display: 'inline-block',
                marginTop: 10,
                color: '#d4aa60',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              View full price guide →
            </a>
          )}
        </div>
      )}
    </span>
  );
};

export default DealRatingBadge;
