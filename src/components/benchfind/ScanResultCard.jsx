import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, CircleHelp, TrendingDown, TrendingUp, Share2, Camera } from 'lucide-react';

import { CategoryBadge, TypeBadge, ConfidenceBadge, ConditionBadge } from './badges';
import Button from './Button';
import usePriceStats from '../../firebase/hooks/usePriceStats';
import { pickReference } from '../../utils/priceStats';
import { getAggregatedListings } from '../../firebase/adapters/externalListingAdapter';
import { track } from '../../utils/analytics';

/**
 * Benchfind scan-result card.
 *
 * Renders the v5 single-tool identification with the new chrome:
 *   - Header (photo + identification + confidence)
 *   - Verdict banner (when verdict known; defaults to "unknown" for photo
 *     flow without listing price context)
 *   - Next-photo-hint affordance (Medium/Low confidence only)
 *   - Comp band visualization (when priceStats has coverage)
 *   - Currently-for-sale tiles
 *   - Correction flow ("How'd we do?")
 *
 * Inputs: the v5 tool object as returned by /toolscan. priceStats + active
 * listings are looked up internally from canonical_brand/type/model.
 */

const slug = (s) => String(s || '')
  .trim().toLowerCase().replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || '_';

const ResultSection = ({ title, action, children, dividerTop = true }) => (
  <section className={`px-7 py-5 ${dividerTop ? 'border-t border-paper-200' : ''}`}>
    <div className="flex items-center justify-between mb-[6px]">
      <h3 className="m-0 font-sans text-[13px] font-semibold text-ink-800 uppercase tracking-[0.04em]">
        {title}
      </h3>
      {action}
    </div>
    {/* Signature graduated rule motif under section headings */}
    <div
      aria-hidden
      className="mb-[14px] opacity-60"
      style={{
        height: 12,
        backgroundImage: 'url(/benchfind/motif-rule.svg)',
        backgroundRepeat: 'repeat-x',
        backgroundPosition: 'left center',
      }}
    />
    {children}
  </section>
);

const VERDICT = {
  fair:     { bg: '#E4EFE2', color: '#2F6B3D', label: 'Fair price for what it is', Icon: CheckCircle2 },
  below:    { bg: '#E4EFE2', color: '#2F6B3D', label: 'Below comp band — worth a closer look', Icon: TrendingDown },
  above:    { bg: '#F5E3D2', color: '#8A4419', label: 'Above comp band', Icon: TrendingUp },
  unknown:  { bg: '#F5E9C8', color: '#9A6B12', label: 'Not enough data for a verdict yet', Icon: CircleHelp },
};

const VerdictBanner = ({ verdict = 'unknown' }) => {
  const v = VERDICT[verdict] || VERDICT.unknown;
  const { Icon } = v;
  return (
    <div
      className="flex items-center gap-3 px-5 py-[14px] rounded-md font-sans text-[15px] font-semibold"
      style={{ background: v.bg, color: v.color }}
    >
      <Icon size={20} strokeWidth={1.75} />
      {v.label}
    </div>
  );
};

const CompPriceRange = ({ low, high, listingPrice, count, days = 90 }) => {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  const min = Math.round(low * 0.7);
  const max = Math.round(high * 1.3);
  const pct = (n) => Math.max(0, Math.min(100, ((n - min) / (max - min)) * 100));
  const bandLeft = pct(low);
  const bandRight = 100 - pct(high);
  const markPct = Number.isFinite(listingPrice) ? pct(listingPrice) : null;
  const inBand = Number.isFinite(listingPrice) && listingPrice >= low && listingPrice <= high;

  return (
    <div>
      <div className="flex justify-between items-baseline mb-[18px]">
        <span className="font-sans text-[11px] font-semibold text-ink-500 uppercase tracking-[0.04em]">
          Comp range · {days} days · n={count}
        </span>
        <span className="font-mono text-[17px] font-medium text-ink-800">
          ${low} – <span className="text-brass-700">${high}</span>
        </span>
      </div>
      <div className="relative h-[22px]">
        <div className="absolute top-2 left-0 right-0 h-[6px] bg-paper-200 rounded-pill" />
        <div
          className="absolute top-2 h-[6px] bg-patina-500 rounded-pill"
          style={{ left: `${bandLeft}%`, right: `${bandRight}%` }}
        />
        {markPct !== null && (
          <>
            <div
              className="absolute -top-[2px] w-[3px] h-[22px] bg-ink-900 rounded-[1.5px]"
              style={{ left: `${markPct}%`, transform: 'translateX(-50%)' }}
            />
            <span
              className="absolute -top-[26px] font-mono text-xs font-semibold text-ink-900 whitespace-nowrap"
              style={{ left: `${markPct}%`, transform: 'translateX(-50%)' }}
            >${listingPrice}</span>
          </>
        )}
      </div>
      <div className="flex justify-between mt-2 font-mono text-[11px] text-ink-500">
        <span>${min}</span>
        <span>${Math.round((min + max) / 2)}</span>
        <span>${max}</span>
      </div>
      {Number.isFinite(listingPrice) && (
        <div className="mt-[14px] font-sans text-[13px] text-ink-700">
          Listed at <strong className="text-ink-900">${listingPrice}</strong>{' '}
          {inBand
            ? <span className="text-patina-700 font-semibold">· fair price for what it is.</span>
            : (listingPrice < low
                ? <span className="text-conf-high font-semibold">· below comp band — worth a closer look.</span>
                : <span className="text-rust-700 font-semibold">· above comp band.</span>
            )}
        </div>
      )}
    </div>
  );
};

const ListingTile = ({ listing }) => {
  const href = listing.source_url || '#';
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="grid items-center gap-[14px] px-[14px] py-3 no-underline rounded-md bg-paper-50 hover:bg-paper-100 transition-colors duration-fast"
      style={{ gridTemplateColumns: '60px 1fr auto', boxShadow: 'inset 0 0 0 1px #ECE4D2' }}
    >
      <div
        className="w-[60px] aspect-square rounded-sm bg-ink-900 overflow-hidden"
        style={{
          backgroundImage: listing.imageUrl ? `url(${listing.imageUrl})` : 'url(/benchfind/photo-amateur.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="min-w-0">
        <div className="font-sans text-[13px] font-medium text-ink-900 mb-[2px] truncate">
          {listing.name || 'Listing'}
        </div>
        <div className="font-sans text-[11px] text-ink-500">
          {listing.sourceName || listing.source}
          {listing.condition && ` · ${listing.condition}`}
        </div>
      </div>
      <span className="font-mono text-sm font-semibold text-ink-900">
        {Number.isFinite(listing.price) ? `$${Math.round(listing.price)}` : '—'}
      </span>
    </a>
  );
};

const NextPhotoHint = ({ area = 'better-lit', onUpload, disabled }) => (
  <div
    className="grid items-center gap-[14px] px-4 py-[14px] rounded-md bg-forest-100"
    style={{ gridTemplateColumns: '40px 1fr auto', boxShadow: 'inset 0 0 0 1px #94B3A2' }}
  >
    <div
      className="w-10 h-10 rounded-sm bg-forest-700 text-paper-50 flex items-center justify-center font-mono font-bold text-[18px]"
    >2</div>
    <div>
      <div className="font-sans text-[14px] font-semibold text-ink-900">Take a {area} shot</div>
      <div className="font-sans text-xs text-ink-600 mt-[2px]">
        One more photo of the {area} will lift this from Medium → High confidence.
      </div>
    </div>
    <label className={`inline-flex items-center gap-2 ${disabled ? 'pointer-events-none' : 'cursor-pointer'}`}>
      <Button size="sm" disabled={disabled}>
        <Camera size={14} strokeWidth={1.75} />
        Add photo
      </Button>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          if (f && onUpload) onUpload(f);
          e.target.value = '';
        }}
        className="hidden"
      />
    </label>
  </div>
);

const CorrectionFlow = ({ onConfirm, onCorrect }) => {
  const [state, setState] = useState('idle'); // idle | sent
  if (state === 'sent') {
    return (
      <div className="flex items-center gap-2 font-sans text-[13px] text-patina-700">
        <CheckCircle2 size={16} strokeWidth={1.75} />
        Thanks — we'll review.
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="font-sans text-[13px] text-ink-600">How'd we do?</span>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => { setState('sent'); onConfirm && onConfirm(); }}
      >
        <CheckCircle2 size={14} strokeWidth={1.75} />
        Looks right
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => { setState('sent'); onCorrect && onCorrect(); }}
      >
        Make corrections
      </Button>
    </div>
  );
};

// Plane reference page URL helper. Mirrors src/utils/priceStats.js#slug shape.
function planeReferencePath(tool) {
  if (!tool) return null;
  if (tool.canonical_type !== 'Bench Plane') return null;
  if (!tool.canonical_brand || !tool.canonical_model) return null;
  let brandSlug = slug(tool.canonical_brand);
  if (tool.canonical_brand === 'Stanley-Bailey') brandSlug = 'stanley';
  const modelSlug = slug(tool.canonical_model);
  if (Number.isInteger(tool.plane_type_number)) {
    return `/planes/${brandSlug}/${modelSlug}/type-${tool.plane_type_number}`;
  }
  return `/planes/${brandSlug}/${modelSlug}`;
}

const ScanResultCard = ({
  tool,
  scanId,
  imagePaths,
  previewImage,
  onFollowupPhoto,
  followupInProgress,
  onFeedback,
}) => {
  const canonicalType = tool?.canonical_type || null;
  const canonicalBrand = useMemo(() => {
    const b = tool?.canonical_brand;
    if (!b || b === 'Unknown' || tool?.confidence === 'Low') return null;
    return b;
  }, [tool?.canonical_brand, tool?.confidence]);
  const canonicalSize = tool?.canonical_model || null;

  const priceStats = usePriceStats({
    canonical_type: canonicalType,
    canonical_brand: canonicalBrand,
    canonical_size: canonicalSize,
  });

  const [activeListings, setActiveListings] = useState([]);
  const [activeLoaded, setActiveLoaded] = useState(false);

  useEffect(() => {
    if (!canonicalType || canonicalType === 'Other') {
      setActiveListings([]);
      setActiveLoaded(true);
      return undefined;
    }
    let cancelled = false;
    setActiveLoaded(false);
    getAggregatedListings({
      canonicalType,
      canonicalBrand: canonicalBrand || undefined,
      limit: 6,
    })
      .then(({ tools }) => {
        if (cancelled) return;
        setActiveListings(tools.slice(0, 3));
        setActiveLoaded(true);
      })
      .catch(() => { if (!cancelled) { setActiveListings([]); setActiveLoaded(true); } });
    return () => { cancelled = true; };
  }, [canonicalType, canonicalBrand]);

  if (!tool) return null;

  const refPath = planeReferencePath(tool);
  const ref = pickReference(priceStats.stats);
  const compBand = ref
    ? { low: Math.round(ref.p25), high: Math.round(ref.p75), count: ref.count }
    : null;

  const showNextPhotoHint = !!tool.next_photo_hint && tool.confidence !== 'High';
  // Photo flow has no listing price → unknown verdict by default.
  const verdict = 'unknown';
  const condition = (tool.condition || '').toLowerCase() || null;

  const handleFeedback = (vote) => {
    if (onFeedback) {
      onFeedback({
        vote,
        scanId,
        imagePaths,
        originalResult: {
          canonical_brand: tool.canonical_brand,
          canonical_type: tool.canonical_type,
          canonical_model: tool.canonical_model,
          plane_type_number: Number.isInteger(tool.plane_type_number) ? tool.plane_type_number : null,
          condition: tool.condition,
          confidence: tool.confidence,
        },
      });
    }
    track('benchfind_scan_feedback', { vote, confidence: tool.confidence });
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div
        className="grid gap-6 px-7 py-6"
        style={{ gridTemplateColumns: '140px 1fr auto' }}
      >
        <div
          className="w-[140px] aspect-square rounded-md overflow-hidden bg-ink-900"
          style={{
            backgroundImage: previewImage
              ? `url(${previewImage})`
              : 'url(/benchfind/photo-amateur.svg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div>
          <div className="flex gap-2 items-center mb-2 flex-wrap">
            {canonicalType && <CategoryBadge>{canonicalType}</CategoryBadge>}
            {tool.era_estimate && (
              <span className="font-sans text-xs text-ink-500">· {tool.era_estimate}</span>
            )}
          </div>
          <h2 className="m-0 font-display font-medium text-[36px] text-ink-900 leading-[1.05] tracking-tight">
            {[tool.canonical_brand, tool.canonical_model].filter(Boolean).join(' ') || canonicalType || 'Tool identified'}
          </h2>
          <div className="flex items-center gap-[10px] mt-3 flex-wrap">
            {Number.isInteger(tool.plane_type_number) && (
              <TypeBadge>Type {tool.plane_type_number}</TypeBadge>
            )}
            {condition && <ConditionBadge level={condition} />}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {tool.confidence && <ConfidenceBadge level={tool.confidence} />}
          <button
            type="button"
            onClick={() => {
              try { navigator.clipboard?.writeText(window.location.href); } catch (e) { /* ignore */ }
              track('benchfind_share_clicked', { scanId });
            }}
            className="inline-flex items-center gap-1 bg-transparent border-0 font-sans text-xs text-ink-600 hover:text-ink-900 cursor-pointer"
          >
            <Share2 size={14} strokeWidth={1.75} />
            Share
          </button>
        </div>
      </div>

      {/* Verdict */}
      <ResultSection title="Verdict">
        <VerdictBanner verdict={verdict} />
        {tool.confidence_reasoning && (
          <p className="mt-[14px] font-sans text-[15px] text-ink-700 leading-[1.6]">
            {tool.confidence_reasoning}
          </p>
        )}
      </ResultSection>

      {/* To get to High — next-photo-hint upgrade affordance */}
      {showNextPhotoHint && (
        <ResultSection title="To get to High">
          <NextPhotoHint
            area={tool.next_photo_hint}
            onUpload={onFollowupPhoto}
            disabled={followupInProgress}
          />
        </ResultSection>
      )}

      {/* What it should cost */}
      {compBand && (
        <ResultSection title="What it should cost">
          <CompPriceRange
            low={compBand.low}
            high={compBand.high}
            listingPrice={null}
            count={compBand.count}
            days={90}
          />
        </ResultSection>
      )}

      {/* Currently for sale */}
      {canonicalType && canonicalType !== 'Other' && (
        <ResultSection title="Currently for sale">
          {!activeLoaded && (
            <p className="font-sans text-[13px] text-ink-500">Searching…</p>
          )}
          {activeLoaded && activeListings.length === 0 && (
            <p className="font-sans text-[13px] text-ink-500">No matching listings right now.</p>
          )}
          {activeLoaded && activeListings.length > 0 && (
            <div className="flex flex-col gap-2">
              {activeListings.map((listing) => (
                <ListingTile key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </ResultSection>
      )}

      {/* Reference */}
      {refPath && (
        <ResultSection title="Reference">
          <Link
            to={refPath}
            className="inline-block font-sans text-[13px] text-forest-700 hover:text-forest-900 font-medium"
            onClick={() => track('benchfind_reference_link_clicked', { canonical_brand: canonicalBrand, canonical_model: canonicalSize, plane_type_number: tool.plane_type_number || null })}
          >
            Full type study →
          </Link>
        </ResultSection>
      )}

      {/* Card footer: correction flow */}
      <div className="border-t border-paper-200 px-7 py-4 bg-paper-50">
        <CorrectionFlow
          onConfirm={() => handleFeedback('correct')}
          onCorrect={() => handleFeedback('corrected')}
        />
      </div>
    </div>
  );
};

export default ScanResultCard;
