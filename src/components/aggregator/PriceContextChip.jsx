/**
 * PriceContextChip — neutral info chip rendered next to a listing's
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
 * Replaced the original DealRatingBadge (5-tier Sleeper/Good
 * deal/Fair/High/Overpriced) — see plan file for the architectural
 * rationale.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';

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
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);
  const firedShownRef = useRef(false);

  // Render only when we actually have data to show.
  const askingCount = stats?.asking_count || 0;
  const soldCount = stats?.sold_count || 0;
  const showable = askingCount >= 10 || soldCount >= 8;

  // Per-kind asking blocks (Dealer / Marketplace / Forum), each null
  // when below the per-kind threshold. The build job already gates this.
  const askingByKind = stats ? perKindBlocks(stats, 'asking') : [];

  // Fire `price_chip_shown` once per chip per session at first render.
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
          gap: 4,
          padding: '2px 8px',
          borderRadius: 4,
          background: '#f2f0eb', // bone — neutral
          color: '#4a5a54',     // fg-secondary
          border: '1px solid #e4e2dc',
          fontFamily: "'Outfit', sans-serif",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.02em',
          lineHeight: 1.4,
        }}
      >
        <Info size={11} />
        {totalComps} comp{totalComps === 1 ? '' : 's'}
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Price context details"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 20,
            width: 320,
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
          {askingCount >= 10 && (
            <div style={{ marginBottom: soldCount >= 8 ? 12 : 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  color: '#4a5a54',
                  fontSize: 10,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Currently asking on Benchlot
              </div>
              <div style={{ marginTop: 2 }}>
                Median <strong>{fmtPrice(stats.asking_p50)}</strong>
                {' · '}range {fmtPrice(stats.asking_p25)}–{fmtPrice(stats.asking_p75)}
              </div>
              <div style={{ color: '#4a5a54', fontSize: 11 }}>
                {askingCount} listing{askingCount === 1 ? '' : 's'} across all sources
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
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Recent sold prices
              </div>
              <div style={{ marginTop: 2 }}>
                Median <strong>{fmtPrice(stats.sold_p50)}</strong>
                {' · '}range {fmtPrice(stats.sold_p25)}–{fmtPrice(stats.sold_p75)}
              </div>
              <div style={{ color: '#4a5a54', fontSize: 11 }}>
                {soldCount} comp{soldCount === 1 ? '' : 's'} from Jim Bode Value Guide
                <span style={{ color: '#8a8a80' }}> · dealer-grade specimens</span>
              </div>
            </div>
          )}
          {href && (
            <a
              href={href}
              onClick={handleGuideClick}
              style={{
                display: 'inline-block',
                marginTop: 12,
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

export default PriceContextChip;
