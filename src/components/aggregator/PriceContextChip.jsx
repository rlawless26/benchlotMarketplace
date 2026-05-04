/**
 * PriceContextChip — honey-tinted info chip rendered next to a listing's
 * price when priceStats exist for its cluster. Click reveals a popover
 * showing the full asking + sold distributions plus per-source-kind
 * breakdowns.
 *
 * Trust-first v1 (2026-05-03): no auto-tier classification. Both Jim
 * Bode-only sold-comp data and asking-block data are too biased on
 * their own to support confident tier judgments. The chip surfaces the
 * data and lets the user reason. Auto-tier badges return in v2 once
 * stratified data + a condition signal exist.
 *
 * Layout note: the popover is rendered into document.body via
 * createPortal because the parent card uses `overflow-hidden` to clip
 * the rounded image edges, which would otherwise hide popover content
 * extending beyond the card's footprint. Position is computed from the
 * chip's bounding rect at open time.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, ArrowRight } from 'lucide-react';

import { perKindBlocks } from '../../utils/priceStats';
import { track } from '../../utils/analytics';

const fmtPrice = (d) => {
  if (d == null || !Number.isFinite(d)) return '—';
  return `$${Math.round(d)}`;
};

function guideHref(stats) {
  if (!stats) return null;
  const { canonical_type, canonical_brand, canonical_size, grain } = stats;
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

const PriceContextChip = ({ stats, grain, clusterKey, listingKind }) => {
  const [open, setOpen] = useState(false);
  const [popPos, setPopPos] = useState({ top: 0, left: 0, width: 320 });
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);
  const firedShownRef = useRef(false);

  const askingCount = stats?.asking_count || 0;
  const soldCount = stats?.sold_count || 0;
  const showable = askingCount >= 10 || soldCount >= 8;

  const askingByKind = stats ? perKindBlocks(stats, 'asking') : [];
  const soldByKind = stats ? perKindBlocks(stats, 'sold') : [];

  useEffect(() => {
    if (firedShownRef.current || !showable) return;
    firedShownRef.current = true;
    track('price_chip_shown', {
      listing_kind: listingKind || null,
      sold_count: soldCount,
      asking_count: askingCount,
      asking_count_dealer: askingByKind.find((b) => b.kind === 'Dealer')?.count || 0,
      asking_count_marketplace: askingByKind.find((b) => b.kind === 'Marketplace')?.count || 0,
      asking_count_forum: askingByKind.find((b) => b.kind === 'Forum')?.count || 0,
      grain: grain || null,
      cluster_key: clusterKey || null,
      canonical_type: stats?.canonical_type || null,
      canonical_brand: stats?.canonical_brand || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute popover position from chip's bounding rect when it opens.
  // Re-runs on resize / scroll so the popover follows the chip if the
  // viewport moves.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return undefined;
    const recompute = () => {
      const rect = buttonRef.current.getBoundingClientRect();
      const POP_WIDTH = 320;
      const margin = 12;
      let left = rect.left + window.scrollX;
      // Keep it on-screen on the right edge.
      const overhang = left + POP_WIDTH - (window.innerWidth - margin);
      if (overhang > 0) left = Math.max(margin + window.scrollX, left - overhang);
      setPopPos({ top: rect.bottom + window.scrollY + 6, left, width: POP_WIDTH });
    };
    recompute();
    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    return () => {
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
    };
  }, [open]);

  // Dismiss popover on outside click.
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

  if (!showable) return null;

  const handleToggle = (e) => {
    // Outer ResultCard is an <a>; never let chip clicks navigate.
    e.preventDefault();
    e.stopPropagation();
    const next = !open;
    setOpen(next);
    if (next) {
      track('price_chip_popover_opened', {
        cluster_key: clusterKey || null,
        listing_kind: listingKind || null,
      });
    }
  };

  const handleGuideClick = (e) => {
    e.stopPropagation();
    track('price_guide_link_clicked', {
      cluster_key: clusterKey || null,
      from: 'card_chip',
    });
  };

  const href = guideHref({
    canonical_type: stats?.canonical_type,
    canonical_brand: stats?.canonical_brand,
    canonical_size: stats?.canonical_size,
    grain,
  });

  const totalComps = askingCount + soldCount;

  const popoverContent = open ? (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Price context details"
      style={{
        position: 'absolute',
        top: popPos.top,
        left: popPos.left,
        zIndex: 1000,
        width: popPos.width,
        padding: '14px 16px 12px',
        background: '#fffefb',
        border: '1px solid #e4e2dc',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(12,28,30,0.20)',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 12,
        color: '#1a3030',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {askingCount >= 10 && (
        <div style={{ marginBottom: soldCount >= 8 ? 14 : 0 }}>
          <div
            style={{
              fontWeight: 600,
              color: '#4a5a54',
              fontSize: 10,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Currently asking on Benchlot
          </div>
          <div>
            Median <strong>{fmtPrice(stats.asking_p50)}</strong>
            {' · '}range {fmtPrice(stats.asking_p25)}–{fmtPrice(stats.asking_p75)}
            <span style={{ color: '#4a5a54' }}> · {askingCount} listings</span>
          </div>
          {askingByKind.length > 0 && (
            <div style={{ color: '#4a5a54', fontSize: 11, marginTop: 4 }}>
              {askingByKind
                .map((b) => `${b.kind} ${fmtPrice(b.p50)} (${b.count})`)
                .join(' · ')}
            </div>
          )}
        </div>
      )}
      {soldCount >= 8 && (
        <div>
          <div
            style={{
              fontWeight: 600,
              color: '#4a5a54',
              fontSize: 10,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Recent sold prices
          </div>
          <div>
            Median <strong>{fmtPrice(stats.sold_p50)}</strong>
            {' · '}range {fmtPrice(stats.sold_p25)}–{fmtPrice(stats.sold_p75)}
            <span style={{ color: '#4a5a54' }}> · {soldCount} comps</span>
          </div>
          {soldByKind.length > 0 && (
            <div style={{ color: '#4a5a54', fontSize: 11, marginTop: 4 }}>
              {soldByKind
                .map((b) => `${b.kind} ${fmtPrice(b.p50)} (${b.count})`)
                .join(' · ')}
            </div>
          )}
          <div style={{ color: '#8a8a80', fontSize: 11, marginTop: 4 }}>
            Includes Jim Bode Value Guide + listings that disappeared from dealer / forum / FB sources.
          </div>
        </div>
      )}
      {href && (
        <a
          href={href}
          onClick={handleGuideClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 14,
            padding: '8px 14px',
            background: '#d4aa60', // honey
            color: '#0c1c1e',     // dark teal
            fontWeight: 600,
            fontSize: 12,
            borderRadius: 6,
            textDecoration: 'none',
            border: '1px solid #b08a40',
          }}
        >
          View full price guide
          <ArrowRight size={12} />
        </a>
      )}
    </div>
  ) : null;

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Show price context for this cluster"
        className="inline-flex items-center cursor-pointer"
        style={{
          gap: 5,
          padding: '3px 9px',
          borderRadius: 4,
          background: '#f6e9cd',          // honey-tinted bone
          color: '#5a4720',                // dark honey
          border: '1px solid #d4aa60',     // honey
          fontFamily: "'Outfit', sans-serif",
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: '0.02em',
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
        }}
      >
        <Info size={12} />
        {totalComps} comps
      </button>

      {popoverContent && createPortal(popoverContent, document.body)}
    </span>
  );
};

export default PriceContextChip;
