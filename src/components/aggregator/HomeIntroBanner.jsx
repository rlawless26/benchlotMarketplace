/**
 * HomeIntroBanner — the dismissible identity strip that mounts at the top of
 * ResultsState for first-time, signed-out visitors landing on a clean `/`.
 *
 * Carries the spirit of the retired EmptyState hero (live count, "across the
 * web" headline, "we don't sell tools" tagline, 8 quick-pick chips, RAQ link)
 * in roughly 1/4 the vertical space so the listings grid stays the gravity.
 *
 * This is a controlled component — the parent (ResultsState) owns the
 * "should I be visible" decision so the persistent quick-picks chip row can
 * stay in sync with the banner's dismissed/hidden state. See the
 * listings-first handoff doc for the full dismissal contract.
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, ArrowRight, Camera } from 'lucide-react';

import { getAggregatorStats } from '../../firebase/adapters/aggregatorFacets';
import { relativeTime } from './relativeTime';
import { BROWSE_CHIPS } from '../../Pages/aggregator/browseChips';

const DOT_GREEN = '#2a6a4a';

const HomeIntroBanner = ({ visible, onDismiss }) => {
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);
  const [stats, setStats] = useState({ activeCount: null, lastScrapedAt: null });

  useEffect(() => {
    let cancelled = false;
    getAggregatorStats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-arm the open state when the parent toggles us back on (recall flow).
  // Without this, a recall after a previous dismiss would mount the banner
  // in its closing animation state — invisible / zero-height.
  useEffect(() => {
    if (visible) setClosing(false);
  }, [visible]);

  if (!visible) return null;

  const dismiss = () => {
    // Optimistic — animate out, then notify the parent. The parent persists
    // the flag and flips visibility; we just play the 220ms exit.
    setClosing(true);
    setTimeout(() => {
      if (typeof onDismiss === 'function') onDismiss();
    }, 220);
  };

  const onChip = (chip) => {
    navigate(`/?${chip.param}=${encodeURIComponent(chip.value)}`);
  };

  const countLabel =
    stats.activeCount != null ? `${stats.activeCount.toLocaleString()} listings` : 'loading…';
  const freshLabel = stats.lastScrapedAt ? `updated ${relativeTime(stats.lastScrapedAt)}` : null;

  return (
    <div
      style={{
        background: '#f8f6f2',
        borderBottom: '1px solid #e4e2dc',
        opacity: closing ? 0 : 1,
        maxHeight: closing ? 0 : 600,
        overflow: 'hidden',
        transition: 'opacity 220ms ease, max-height 220ms ease',
      }}
    >
      <div
        className="px-4 md:px-10"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          paddingTop: 24,
          paddingBottom: 22,
        }}
      >
        {/* Row 1 — eyebrow on the left, dismiss X on the right. The X
            sits inline here on every viewport; on desktop this lines up
            visually with where it used to sit in a separate right rail,
            on mobile it stays out of the way of the headline below. */}
        <div
          className="flex items-start justify-between"
          style={{ gap: 12, marginBottom: 8 }}
        >
          <div
            className="inline-flex items-center"
            style={{
              gap: 8,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#1a3030',
            }}
          >
            <span className="relative inline-block" style={{ width: 7, height: 7 }}>
              <span
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{ background: DOT_GREEN }}
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bl-pulse"
                style={{ background: DOT_GREEN }}
              />
            </span>
            <span>
              Live Index · {countLabel}
              {freshLabel ? ` · ${freshLabel}` : ''}
            </span>
          </div>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss intro"
            className="cursor-pointer"
            style={{
              flexShrink: 0,
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid #e4e2dc',
              background: '#f2f0eb',
              color: '#4a5a54',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              marginTop: -4,
            }}
          >
            <X size={12} />
          </button>
        </div>

        <h2
          style={{
            margin: 0,
            fontFamily: "'Petrona', Georgia, serif",
            fontWeight: 700,
            fontSize: 28,
            lineHeight: 1.15,
            letterSpacing: '-0.8px',
            color: '#0c1c1e',
            maxWidth: 640,
          }}
        >
          Find used tools{' '}
          <span style={{ fontWeight: 500, fontStyle: 'italic', color: '#1a3030' }}>
            across the web.
          </span>
        </h2>

        <p
          style={{
            margin: '8px 0 14px',
            maxWidth: 580,
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 400,
            fontSize: 13.5,
            lineHeight: 1.5,
            color: '#4a5a54',
          }}
        >
          Dealers, forums, auctions, marketplaces — in one search.{' '}
          <span style={{ fontStyle: 'italic', fontWeight: 500, color: '#0c1c1e' }}>
            We don't sell tools. We point you to them.
          </span>
        </p>

        {/* Footer row — chips on the left (desktop only), RAQ link on the
            right. On mobile the chips hide and RAQ takes the whole row,
            right-aligned, using the freed-up vertical space cleanly. */}
        <div
          className="flex items-center flex-wrap justify-end md:justify-between"
          style={{ gap: 12 }}
        >
          <div
            className="hidden md:flex items-center flex-wrap"
            style={{ gap: 6 }}
          >
            <span
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#8a8a80',
                marginRight: 6,
              }}
            >
              Try
            </span>
            {BROWSE_CHIPS.map((chip) => (
              <button
                key={`${chip.param}:${chip.value}`}
                type="button"
                onClick={() => onChip(chip)}
                className="cursor-pointer"
                style={{
                  padding: '5px 11px',
                  borderRadius: 4,
                  border: '1px solid #d4d2cc',
                  background: '#f2f0eb',
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 500,
                  fontSize: 12,
                  color: '#0c1c1e',
                  letterSpacing: '0.01em',
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center" style={{ gap: 16 }}>
            {/* "Not sure what you have?" — reverse link from the
                aggregator into ToolScan. Matches the RAQ link's visual
                weight so neither dominates. */}
            <Link
              to="/scan"
              className="inline-flex items-center"
              style={{
                gap: 4,
                color: '#a87f3b',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: '0.02em',
                textDecoration: 'none',
                borderBottom: '1px solid currentColor',
                paddingBottom: 1,
              }}
            >
              <Camera size={11} aria-hidden /> Not sure what you have? Scan it
            </Link>

            <Link
              to="/faq"
              className="inline-flex items-center"
              style={{
                gap: 4,
                color: '#a87f3b',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: '0.02em',
                textDecoration: 'none',
                borderBottom: '1px solid currentColor',
                paddingBottom: 1,
              }}
            >
              Read the RAQ <ArrowRight size={11} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeIntroBanner;
