/**
 * ResultCard — aggregator listing card.
 *
 * Per `design_handoff_benchlot_homepage/README.md` §Result Card. The card
 * is a single outer anchor that opens `source_url` in a new tab. The
 * "Alert for similar" hover button calls preventDefault + stopPropagation
 * so the outer link doesn't also fire.
 *
 * Expects a listing already reshaped by `externalListingAdapter`.
 */

import React, { useState } from 'react';
import {
  Store,
  MessageSquare,
  Globe,
  Gavel,
  Clock,
  Bell,
  ExternalLink,
  MapPin,
} from 'lucide-react';

import { getSource, KIND_COLORS } from '../../firebase/adapters/sources';
import { relativeTime } from './relativeTime';

const KIND_ICON = {
  Dealer: Store,
  Forum: MessageSquare,
  Reddit: Globe, // Lucide has no Reddit brand mark; Globe placeholder
  Marketplace: Globe,
  Auction: Gavel,
};

function SourceBadge({ sourceId }) {
  const source = getSource(sourceId);
  if (!source) return null;
  const Icon = KIND_ICON[source.kind] || Globe;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-btn-sm text-spruce whitespace-nowrap"
      style={{
        background: 'rgba(26,48,48,0.06)',
        border: '1px solid rgba(26,48,48,0.12)',
        fontFamily: "'Outfit', sans-serif",
        fontWeight: 500,
        fontSize: 11,
        letterSpacing: '0.02em',
      }}
    >
      <Icon size={12} />
      {source.shortName}
    </span>
  );
}

function KindDot({ kind }) {
  const color = KIND_COLORS[kind] || '#888';
  return (
    <span
      aria-hidden
      className="inline-block flex-shrink-0 rounded-full"
      style={{ width: 6, height: 6, background: color }}
    />
  );
}

function formatPrice(price, currency = '$') {
  if (price == null) return null;
  const n = typeof price === 'number' ? price : Number(price);
  if (!Number.isFinite(n)) return null;
  return `${currency}${n >= 100 ? n.toFixed(0) : n.toFixed(0)}`;
}

const PLACEHOLDER_BG = '#e8e6e0'; // var(--bone-dark) — shown when image is missing

const ResultCard = ({ listing, onSaveAlert }) => {
  const [hover, setHover] = useState(false);

  if (!listing) return null;

  const source = getSource(listing.source);
  const imageUrl =
    listing.imageUrl ||
    (Array.isArray(listing.images) && listing.images[0] && (listing.images[0].url || listing.images[0])) ||
    null;
  const priceDisplay = formatPrice(listing.price);
  const postedDisplay = relativeTime(listing.posted_at || listing.scraped_at);
  const maker = listing.brand && listing.brand !== 'Unknown' ? listing.brand : null;
  const title = listing.name || '(untitled listing)';

  const handleAlertClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof onSaveAlert === 'function') onSaveAlert(listing);
  };

  return (
    <a
      href={listing.source_url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="block overflow-hidden rounded-card no-underline text-inherit"
      style={{
        background: '#f8f6f2',
        border: `1px solid ${hover ? '#d4d2cc' : '#e4e2dc'}`,
        boxShadow: hover
          ? '0 4px 16px rgba(12, 28, 30, 0.10)'
          : '0 2px 8px rgba(12, 28, 30, 0.08)',
        transform: hover ? 'translateY(-2px)' : 'none',
        transition:
          'transform 200ms cubic-bezier(0.2, 0.6, 0.2, 1), box-shadow 200ms cubic-bezier(0.2, 0.6, 0.2, 1), border-color 200ms',
      }}
    >
      {/* Image area with overlays */}
      <div
        className="relative"
        style={{
          aspectRatio: '4 / 3',
          background: imageUrl
            ? `url(${imageUrl}) center/cover no-repeat, ${PLACEHOLDER_BG}`
            : PLACEHOLDER_BG,
        }}
      >
        {/* Source badge — top-left */}
        <div className="absolute top-2.5 left-2.5">
          <SourceBadge sourceId={listing.source} />
        </div>

        {/* Posted chip — top-right */}
        {postedDisplay && (
          <div
            className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-bone"
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              background: 'rgba(12,28,30,0.78)',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
              fontSize: 10,
              letterSpacing: '0.02em',
            }}
          >
            <Clock size={10} />
            {postedDisplay}
          </div>
        )}

        {/* Alert-for-similar hover action — bottom-right, fade + translate */}
        <div
          className="absolute bottom-2.5 right-2.5"
          style={{
            opacity: hover ? 1 : 0,
            transform: hover ? 'translateY(0)' : 'translateY(4px)',
            transition: 'opacity 200ms, transform 200ms',
            pointerEvents: hover ? 'auto' : 'none',
          }}
        >
          <button
            type="button"
            onClick={handleAlertClick}
            className="inline-flex items-center gap-1.5 text-spruce cursor-pointer"
            style={{
              padding: '6px 10px',
              background: '#f2f0eb', // bone
              border: '1px solid #e4e2dc',
              borderRadius: 6,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
              fontSize: 11,
              letterSpacing: '0.02em',
            }}
          >
            <Bell size={11} />
            Alert for similar
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px 16px' }}>
        {/* Maker / condition meta row */}
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
          <span
            className="text-muted uppercase"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: '0.14em',
            }}
          >
            {maker || '\u00A0'}
          </span>
          {listing.condition && (
            <span
              className="text-muted"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 500,
                fontSize: 10,
                letterSpacing: '0.02em',
              }}
            >
              {listing.condition}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className="text-dark-teal m-0 line-clamp-2"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 600,
            fontSize: 16,
            lineHeight: 1.3,
            letterSpacing: '-0.005em',
            marginBottom: 10,
          }}
        >
          {title}
        </h3>

        {/* Price + location */}
        <div className="flex items-baseline justify-between gap-2.5 mb-2.5">
          <span
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: '-0.01em',
              color: '#d4aa60', // honey
            }}
          >
            {priceDisplay || '—'}
          </span>
          {listing.location && (
            <span
              className="text-secondary inline-flex items-center gap-1"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 400,
                fontSize: 12,
              }}
            >
              <MapPin size={11} />
              {listing.location}
            </span>
          )}
        </div>

        {/* Footer: kind dot + source name · View source */}
        <div
          className="flex items-center justify-between"
          style={{
            paddingTop: 10,
            borderTop: '1px solid #eceae4', // border-light
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 500,
            fontSize: 11,
            color: '#4a5a54', // fg-secondary
            letterSpacing: '0.02em',
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <KindDot kind={source?.kind} />
            Listed at {source?.name || 'external source'}
          </span>
          <span
            className="inline-flex items-center gap-1"
            style={{
              color: hover ? '#d4aa60' : '#1a3030', // honey on hover, spruce rest
              transition: 'color 200ms',
            }}
          >
            View source
            <ExternalLink size={11} />
          </span>
        </div>
      </div>
    </a>
  );
};

export default ResultCard;
