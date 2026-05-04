/**
 * PreviousListingsPopover — Watch Recon-style price-history timeline for a
 * single listing. Renders a small "n times since X" link that opens the
 * full snapshot timeline in a dropdown.
 *
 * Hidden when the listing has fewer than 2 snapshots — there's nothing
 * to compare against. The Price-Drop badge stays visible separately.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

import { track } from '../../utils/analytics';

const fmtDollars = (cents) => `$${Math.round(cents / 100)}`;

function fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function spanDays(snapshots) {
  if (!snapshots || snapshots.length < 2) return 0;
  const first = snapshots[0].scraped_at;
  const last = snapshots[snapshots.length - 1].scraped_at;
  const a = first?.toMillis ? first.toMillis() : first?.seconds * 1000;
  const b = last?.toMillis ? last.toMillis() : last?.seconds * 1000;
  if (!a || !b) return 0;
  return Math.max(1, Math.round((b - a) / (24 * 60 * 60 * 1000)));
}

const PreviousListingsPopover = ({ listingId, snapshots }) => {
  const [open, setOpen] = useState(false);
  const popRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (popRef.current && popRef.current.contains(e.target)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!snapshots || snapshots.length < 2) return null;

  const span = spanDays(snapshots);
  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !open;
    setOpen(next);
    if (next) {
      track('previous_listings_popover_opened', {
        listing_id: listingId || null,
        snapshot_count: snapshots.length,
        span_days: span,
      });
    }
  };

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="inline-flex items-center gap-1 cursor-pointer"
        style={{
          padding: '2px 6px',
          borderRadius: 4,
          background: 'transparent',
          color: '#4a5a54',
          border: '1px solid transparent',
          fontFamily: "'Outfit', sans-serif",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.02em',
          textDecoration: 'underline dotted',
        }}
      >
        <Clock size={11} />
        Price history
      </button>

      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Price history"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 20,
            width: 240,
            padding: '10px 12px',
            background: '#fffefb',
            border: '1px solid #e4e2dc',
            borderRadius: 8,
            boxShadow: '0 6px 20px rgba(12,28,30,0.18)',
            fontFamily: "'Outfit', sans-serif",
            fontSize: 12,
            color: '#1a3030',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 11, color: '#4a5a54', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {snapshots.length} record{snapshots.length === 1 ? '' : 's'} over {span} day{span === 1 ? '' : 's'}
          </div>
          {snapshots.map((s, i) => (
            <div
              key={s.id || i}
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 1fr auto',
                gap: 8,
                padding: '4px 0',
                borderTop: i === 0 ? 'none' : '1px solid #eceae4',
              }}
            >
              <span style={{ color: '#4a5a54' }}>{fmtDate(s.scraped_at)}</span>
              <span style={{ color: '#4a5a54' }}>{s.status || ''}</span>
              <span style={{ color: '#1a3030', fontWeight: 600 }}>
                {typeof s.price_cents === 'number' ? fmtDollars(s.price_cents) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </span>
  );
};

export default PreviousListingsPopover;
