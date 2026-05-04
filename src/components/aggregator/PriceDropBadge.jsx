/**
 * PriceDropBadge — renders when a listing's most recent priceSnapshots
 * delta meets the drop threshold (>= 10% AND >= $20) within the last 14
 * days. Driven entirely by usePriceHistory's `latestDrop`.
 *
 * Compact variant for the result-card footer: just "↓ $X" with the prior
 * price as a struck-through hover-tooltip. No popover — the deeper
 * timeline lives in PreviousListingsPopover.
 */

import React, { useEffect, useRef } from 'react';
import { TrendingDown } from 'lucide-react';

import { track } from '../../utils/analytics';

const fmtDollars = (cents) => `$${Math.round(cents / 100)}`;

const PriceDropBadge = ({ listingId, drop }) => {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !drop) return;
    fired.current = true;
    track('price_drop_badge_shown', {
      listing_id: listingId || null,
      drop_pct: Math.round(drop.drop_pct * 100) / 100,
      drop_dollars: Math.round(drop.drop_cents / 100),
      days_since_drop: drop.days_since,
    });
  }, [drop, listingId]);

  if (!drop) return null;

  const dropDollars = fmtDollars(drop.drop_cents);
  const fromDollars = fmtDollars(drop.from_cents);

  return (
    <span
      title={`Was ${fromDollars} ${drop.days_since === 0 ? 'today' : `${drop.days_since} day${drop.days_since === 1 ? '' : 's'} ago`}`}
      className="inline-flex items-center gap-1"
      style={{
        padding: '2px 8px',
        borderRadius: 4,
        background: '#e6f1ea',
        color: '#205c40',
        border: '1px solid #cfe2d6',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}
    >
      <TrendingDown size={11} />
      {dropDollars} drop
    </span>
  );
};

export default PriceDropBadge;
