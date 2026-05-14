// src/components/ToolScanCard.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Camera,
  Pencil,
  ExternalLink,
  Bell,
} from 'lucide-react';

import usePriceStats from '../firebase/hooks/usePriceStats';
import { pickReference } from '../utils/priceStats';
import { getAggregatedListings } from '../firebase/adapters/externalListingAdapter';
import { track } from '../utils/analytics';
import { PRICE_GUIDE_ENABLED } from '../utils/featureFlags';
import { brandName } from '../utils/environment';

// ── Category gate ────────────────────────────────────────────────────────────
// Rendered when v5 returns canonical_type === 'Other' (or no canonical_type) —
// the model identified something that isn't in the supported category set.
// Converts a "we don't cover this yet" moment into a category-interest signal.
const CategoryGate = ({ tool, scanId, imagePaths, previewImage }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    track('category_gate_shown', {
      scanId: scanId || null,
      canonical_type: tool?.canonical_type || null,
    });
  }, [scanId, tool?.canonical_type]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../firebase/config');
      await addDoc(collection(db, 'category_interest'), {
        email: email.trim().toLowerCase(),
        requested_category: tool?.canonical_type || 'unknown',
        scanId: scanId || null,
        imagePaths: imagePaths || [],
        created_at: serverTimestamp(),
      });
      setSubmitted(true);
      track('category_gate_email_captured', {
        scanId: scanId || null,
        canonical_type: tool?.canonical_type || null,
      });
    } catch (err) {
      console.error('[category_gate] save error:', err);
      setError('Something went wrong. Try again?');
    } finally {
      setSubmitting(false);
    }
  };

  const brand = brandName();
  return (
    <div className="bg-bone-light rounded-xl shadow-sm border border-[#e4e2dc] p-6">
      <div className="flex items-start gap-4 mb-4">
        {previewImage && (
          <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-[#e4e2dc]">
            <img src={previewImage} alt="Uploaded tool" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-xl font-display font-semibold text-spruce">
            Not a plane — yet
          </h3>
          <p className="text-base font-body text-secondary mt-1">
            {brand} is plane-first today. Hand planes are the only category we identify and price reliably right now.
          </p>
        </div>
      </div>

      <div className="bg-bone rounded-lg p-4 mb-4">
        <p className="text-sm font-semibold font-body text-dark-teal mb-2">Coming next</p>
        <ul className="text-sm font-body text-secondary space-y-1">
          <li>· Hand saws — medallion, etch, and tooth-count identification</li>
          <li>· Chisels — maker, style, and era</li>
          <li>· Router planes, shoulder planes, and other specialty bench tools</li>
        </ul>
      </div>

      {submitted ? (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-sm font-body text-green-800">Thanks — we'll let you know when this category goes live.</span>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <label className="block text-sm font-medium font-body text-secondary mb-1">
            Email me when {brand} covers this category
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="you@example.com"
              disabled={submitting}
              className="flex-1 px-3 py-2 bg-bone border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal focus:ring-2 focus:ring-spruce/30 focus:border-spruce transition-colors"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-honey text-dark-teal rounded-lg text-sm font-medium font-body hover:bg-honey-light disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {submitting ? 'Saving…' : 'Notify me'}
            </button>
          </div>
          {error && <p className="text-sm text-error mt-2">{error}</p>}
        </form>
      )}
    </div>
  );
};

const confidenceColors = {
  High: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-red-100 text-red-800',
};

const conditionColors = {
  Excellent: 'bg-green-100 text-green-800',
  Good: 'bg-blue-100 text-blue-800',
  Fair: 'bg-yellow-100 text-yellow-800',
  Project: 'bg-orange-100 text-orange-800',
};

const conditionOptions = ['Excellent', 'Good', 'Fair', 'Project'];

// Closed list of canonical_type values v5 emits. Used by the correction-flow
// select. Mirrors functions/toolscan-prompt.js.
const canonicalTypeOptions = [
  'Bench Plane',
  'Block Plane',
  'Shoulder Plane',
  'Router Plane',
  'Plow Plane',
  'Rabbet Plane',
  'Moulding Plane',
  'Infill Plane',
  'Scrub Plane',
  'Combination Plane',
  'Spokeshave',
  'Other',
];

const slug = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || '_';

const fmtDollars = (d) => `$${Math.round(d)}`;

// Thin dispatcher: route non-plane scans to the category gate, everything
// else to the full identification card.
const ToolScanCard = (props) => {
  const { tool } = props;
  if (tool && (tool.canonical_type === 'Other' || !tool.canonical_type)) {
    return (
      <CategoryGate
        tool={tool}
        scanId={props.scanId}
        imagePaths={props.imagePaths}
        previewImage={props.previewImage}
      />
    );
  }
  return <ToolScanCardFull {...props} />;
};

const ToolScanCardFull = ({
  tool,
  scanId,
  previewImage,
  onUpdate,
  onFeedback,
  onFollowupPhoto,
  followupInProgress,
}) => {
  const [analysisExpanded, setAnalysisExpanded] = useState(true);

  // Feedback state: null → 'correcting' → 'saved_correct' | 'saved_corrected'
  const [feedbackState, setFeedbackState] = useState(null);

  // priceStats lookup keys come straight from v5 canonical fields — no bridge.
  const canonicalType = tool.canonical_type || null;
  const canonicalBrand = useMemo(() => {
    const b = tool.canonical_brand;
    if (!b || b === 'Unknown' || tool.confidence === 'Low') return null;
    return b;
  }, [tool.canonical_brand, tool.confidence]);
  const canonicalSize = tool.canonical_model || null;

  const priceStats = usePriceStats({
    canonical_type: canonicalType,
    canonical_brand: canonicalBrand,
    canonical_size: canonicalSize,
  });

  const [activeListings, setActiveListings] = useState([]);
  const [activeListingsLoaded, setActiveListingsLoaded] = useState(false);

  useEffect(() => {
    if (!canonicalType || canonicalType === 'Other') {
      setActiveListings([]);
      setActiveListingsLoaded(true);
      return undefined;
    }

    let cancelled = false;
    setActiveListingsLoaded(false);
    getAggregatedListings({
      canonicalType,
      canonicalBrand: canonicalBrand || undefined,
      limit: 8,
    })
      .then(({ tools }) => {
        if (cancelled) return;
        const listings = tools.slice(0, 6);
        setActiveListings(listings);
        setActiveListingsLoaded(true);

        track('toolscan_active_listings_shown', {
          scanId: scanId || null,
          canonical_type: canonicalType,
          canonical_brand: canonicalBrand,
          listings_returned: listings.length,
          filter_strategy: canonicalBrand ? 'type_and_brand' : 'type_only',
          cluster_key: priceStats.cluster_key || null,
          data_band_applied: Boolean(priceStats.reference),
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[ToolScanCard] active-listings fetch failed:', err);
        }
        setActiveListings([]);
        setActiveListingsLoaded(true);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonicalType, canonicalBrand, scanId]);

  const ref = pickReference(priceStats.stats);
  const benchlotIndexBand = ref
    ? { low: Math.round(ref.p25), high: Math.round(ref.p75), count: ref.count, source: ref.source }
    : null;

  const guideHref = priceStats.stats
    ? (priceStats.grain === 'fine' && priceStats.stats.canonical_size
        ? `/guide/${slug(priceStats.stats.canonical_type)}/${slug(priceStats.stats.canonical_brand)}/${slug(priceStats.stats.canonical_size)}`
        : `/guide/${slug(priceStats.stats.canonical_type)}/${slug(priceStats.stats.canonical_brand)}`)
    : null;

  // Link to the canonical plane type page when applicable. Mirrors
  // CheckPage.jsx#planeTypePagePath.
  const planeTypeHref = (() => {
    if (canonicalType !== 'Bench Plane') return null;
    if (!canonicalBrand || !canonicalSize) return null;
    let brandSlug = slug(canonicalBrand);
    if (canonicalBrand === 'Stanley-Bailey') brandSlug = 'stanley';
    const modelSlug = slug(canonicalSize);
    if (Number.isInteger(tool.plane_type_number)) {
      return `/planes/${brandSlug}/${modelSlug}/type-${tool.plane_type_number}`;
    }
    return `/planes/${brandSlug}/${modelSlug}`;
  })();

  const searchHref = (() => {
    const params = new URLSearchParams();
    const queryBits = [];
    if (canonicalBrand) queryBits.push(canonicalBrand);
    if (canonicalSize) queryBits.push(canonicalSize);
    if (queryBits.length) params.set('q', queryBits.join(' '));
    if (canonicalType) params.set('cat', canonicalType);
    if (canonicalBrand) params.set('maker', canonicalBrand);
    return params.toString() ? `/?${params.toString()}` : '/';
  })();

  // Display name composed from canonical fields. e.g. "Stanley No. 5 · Type 11".
  const displayName = useMemo(() => {
    const parts = [tool.canonical_brand, tool.canonical_model].filter(Boolean);
    let name = parts.join(' ');
    if (Number.isInteger(tool.plane_type_number)) {
      name = name ? `${name} · Type ${tool.plane_type_number}` : `Type ${tool.plane_type_number}`;
    }
    return name || tool.canonical_type || 'Tool identified';
  }, [tool.canonical_brand, tool.canonical_model, tool.plane_type_number, tool.canonical_type]);

  const [reviewFields, setReviewFields] = useState({
    canonical_brand: tool.canonical_brand || '',
    canonical_model: tool.canonical_model || '',
    canonical_type: tool.canonical_type || '',
    plane_type_number: Number.isInteger(tool.plane_type_number) ? String(tool.plane_type_number) : '',
    condition: tool.condition || 'Good',
  });

  const handleReviewFieldChange = (field, value) => {
    setReviewFields(prev => ({ ...prev, [field]: value }));
  };

  const getEdits = () => {
    const edits = {};
    if (reviewFields.canonical_brand !== (tool.canonical_brand || '')) {
      edits.canonical_brand = { from: tool.canonical_brand, to: reviewFields.canonical_brand };
    }
    if (reviewFields.canonical_model !== (tool.canonical_model || '')) {
      edits.canonical_model = { from: tool.canonical_model, to: reviewFields.canonical_model };
    }
    if (reviewFields.canonical_type !== (tool.canonical_type || '')) {
      edits.canonical_type = { from: tool.canonical_type, to: reviewFields.canonical_type };
    }
    const newType = reviewFields.plane_type_number.trim() === ''
      ? null
      : parseInt(reviewFields.plane_type_number, 10);
    const oldType = Number.isInteger(tool.plane_type_number) ? tool.plane_type_number : null;
    if (newType !== oldType) {
      edits.plane_type_number = { from: oldType, to: newType };
    }
    if (reviewFields.condition !== (tool.condition || 'Good')) {
      edits.condition = { from: tool.condition, to: reviewFields.condition };
    }
    return Object.keys(edits).length > 0 ? edits : null;
  };

  const originalSnapshot = () => ({
    canonical_brand: tool.canonical_brand,
    canonical_model: tool.canonical_model,
    canonical_type: tool.canonical_type,
    plane_type_number: Number.isInteger(tool.plane_type_number) ? tool.plane_type_number : null,
    condition: tool.condition,
    confidence: tool.confidence,
  });

  const correctedSnapshot = () => ({
    canonical_brand: reviewFields.canonical_brand,
    canonical_model: reviewFields.canonical_model,
    canonical_type: reviewFields.canonical_type,
    plane_type_number: reviewFields.plane_type_number.trim() === ''
      ? null
      : parseInt(reviewFields.plane_type_number, 10),
    condition: reviewFields.condition,
  });

  const handleLooksRight = () => {
    setFeedbackState('saved_correct');
    if (onFeedback) {
      onFeedback({
        vote: 'correct',
        scanId,
        originalResult: originalSnapshot(),
        correctedResult: null,
        userEdits: null,
      });
    }
  };

  const handleStartCorrecting = () => {
    setFeedbackState('correcting');
  };

  const handleSaveCorrections = () => {
    setFeedbackState('saved_corrected');
    if (onFeedback) {
      onFeedback({
        vote: 'corrected',
        scanId,
        originalResult: originalSnapshot(),
        correctedResult: correctedSnapshot(),
        userEdits: getEdits(),
      });
    }
    if (onUpdate) {
      onUpdate({ ...tool, ...correctedSnapshot() });
    }
  };

  const isConfirmed = feedbackState === 'saved_correct' || feedbackState === 'saved_corrected';

  return (
    <div className="bg-bone-light rounded-xl shadow-sm border border-[#e4e2dc]">
      {/* Card Header — photo + name + identification */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {previewImage && (
            <div className="flex-shrink-0 w-28 h-28 rounded-lg overflow-hidden border border-[#e4e2dc]">
              <img src={previewImage} alt="Scanned tool" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-display font-semibold text-spruce">
              {displayName}
            </h3>
            {tool.canonical_type && (
              <p className="text-sm font-body text-secondary mt-0.5">
                {tool.canonical_type}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-2 text-base font-body text-secondary">
              {tool.era_estimate && (
                <span><strong className="text-dark-teal">Era:</strong> {tool.era_estimate}</span>
              )}
              {planeTypeHref && (
                <a
                  href={planeTypeHref}
                  onClick={() => track('toolscan_plane_type_link_clicked', {
                    scanId: scanId || null,
                    canonical_brand: canonicalBrand,
                    canonical_model: canonicalSize,
                    plane_type_number: tool.plane_type_number || null,
                  })}
                  className="text-sm font-body font-medium text-honey hover:text-honey-dark underline"
                >
                  See full reference page →
                </a>
              )}
            </div>

            {/* Comp band from Benchlot index — sourced from priceStats. */}
            {PRICE_GUIDE_ENABLED && benchlotIndexBand && (
              <div className="mt-2 text-sm font-body text-secondary">
                Recent comps: <strong className="text-dark-teal">${benchlotIndexBand.low} – ${benchlotIndexBand.high}</strong> across {benchlotIndexBand.count} {benchlotIndexBand.source === 'sold' ? 'sold' : 'asking'} listings
                {guideHref && (
                  <>
                    {' · '}
                    <a
                      href={guideHref}
                      onClick={() => track('toolscan_price_guide_link_clicked', {
                        scanId: scanId || null,
                        cluster_key: priceStats.cluster_key || null,
                      })}
                      className="text-honey hover:text-honey-dark underline"
                    >
                      view price guide →
                    </a>
                  </>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-2">
              {tool.confidence && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-body ${confidenceColors[tool.confidence] || 'bg-gray-100 text-gray-800'}`}>
                  {tool.confidence} confidence
                </span>
              )}
              {tool.condition && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-body ${conditionColors[tool.condition] || 'bg-gray-100 text-gray-800'}`}>
                  {tool.condition}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* "Want a better ID?" hint — surfaces next_photo_hint plus a
            multi-turn upload affordance. Tapping the button opens the file
            picker / camera; the new photo POSTs to /toolscan with
            previous_scan_id, refining the identification in place. */}
        {tool.next_photo_hint && !isConfirmed && tool.confidence !== 'High' && (
          <div className="flex items-start gap-3 p-3 mt-4 bg-blue-50 border border-blue-100 rounded-lg">
            <Camera className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold font-body text-blue-800">Want a better ID?</p>
              <p className="text-sm font-body text-blue-700">{tool.next_photo_hint}</p>
              {onFollowupPhoto && (
                <label
                  className={`inline-flex items-center gap-2 mt-3 px-4 py-2 bg-honey text-dark-teal rounded-lg text-sm font-medium font-body hover:bg-honey-light transition-colors ${followupInProgress ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                >
                  <Camera className="w-4 h-4" />
                  {followupInProgress ? 'Refining…' : 'Upload this view'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={followupInProgress}
                    onChange={(e) => {
                      const f = e.target.files && e.target.files[0];
                      if (f) {
                        onFollowupPhoto(f);
                        // Reset so re-uploading the same file fires onChange again.
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Low confidence warning */}
        {tool.confidence === 'Low' && !isConfirmed && (
          <div className="flex items-start gap-3 p-3 mt-4 bg-amber-50 border border-amber-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold font-body text-amber-800">Low confidence identification</p>
              <p className="text-sm font-body text-amber-700">
                {tool.confidence_reasoning || "We're not very confident about this one. Review carefully."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* How'd we do? — prominent, above review fields */}
      <div className="px-5 pb-4 border-t border-[#e4e2dc] pt-4">
        {feedbackState === null && (
          <div className="bg-bone rounded-lg p-4 mb-4">
            <p className="text-base font-body font-semibold text-dark-teal mb-3">How'd we do?</p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLooksRight}
                className="px-5 py-2.5 bg-honey text-dark-teal rounded-lg text-sm font-medium font-body hover:bg-honey-light transition-colors"
              >
                Looks right
              </button>
              <button
                onClick={handleStartCorrecting}
                className="px-5 py-2.5 bg-spruce text-bone rounded-lg text-sm font-medium font-body hover:bg-spruce-light transition-colors"
              >
                I'll make some corrections
              </button>
            </div>
          </div>
        )}

        {feedbackState === 'saved_correct' && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-sm font-body text-green-800">Confirmed. Thanks for the signal — we use these to make the model better.</span>
          </div>
        )}

        {feedbackState === 'correcting' && (
          <div className="bg-bone rounded-lg p-4 mb-4">
            <p className="text-sm font-body text-dark-teal">
              Edit the fields below to correct our identification. Hit <strong>Save corrections</strong> when you're done.
            </p>
          </div>
        )}

        {feedbackState === 'saved_corrected' && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-sm font-body text-green-800">Corrections saved. Thanks for helping us get better at this.</span>
          </div>
        )}

        {/* Review Identification Section */}
        <div>
          <h4 className="text-base font-display font-semibold text-spruce uppercase tracking-wide mb-1">
            Review Identification
          </h4>
          {!isConfirmed && feedbackState !== 'correcting' && (
            <p className="text-sm font-body text-secondary mt-1 mb-4">
              Verify the details below.
            </p>
          )}
          {feedbackState === 'correcting' && (
            <p className="text-sm font-body text-secondary mt-1 mb-4">
              Make your corrections below.
            </p>
          )}
        </div>

        {isConfirmed ? (
          /* Read-only confirmed view */
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-bone rounded-lg px-3 py-2 border border-[#e4e2dc]">
                <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Maker</label>
                <p className="text-base font-body text-dark-teal mt-0.5">{reviewFields.canonical_brand || '—'}</p>
              </div>
              <div className="bg-bone rounded-lg px-3 py-2 border border-[#e4e2dc]">
                <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Model</label>
                <p className="text-base font-body text-dark-teal mt-0.5">{reviewFields.canonical_model || '—'}</p>
              </div>
              <div className="bg-bone rounded-lg px-3 py-2 border border-[#e4e2dc]">
                <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Type</label>
                <p className="text-base font-body text-dark-teal mt-0.5">{reviewFields.canonical_type || '—'}</p>
              </div>
              <div className="bg-bone rounded-lg px-3 py-2 border border-[#e4e2dc]">
                <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Plane Type Number</label>
                <p className="text-base font-body text-dark-teal mt-0.5">{reviewFields.plane_type_number || '—'}</p>
              </div>
              <div className="bg-bone rounded-lg px-3 py-2 border border-[#e4e2dc] sm:col-span-2">
                <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Condition</label>
                <p className="text-base font-body text-dark-teal mt-0.5">{reviewFields.condition}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setFeedbackState('correcting')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium font-body border border-[#e4e2dc] rounded-lg text-secondary hover:bg-bone hover:text-dark-teal transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
          </div>
        ) : (
          /* Editable review fields */
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">Maker</label>
                <input
                  type="text"
                  value={reviewFields.canonical_brand}
                  onChange={(e) => handleReviewFieldChange('canonical_brand', e.target.value)}
                  className="w-full px-3 py-2 bg-bone-light border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal focus:ring-2 focus:ring-spruce/30 focus:border-spruce transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">Model</label>
                <input
                  type="text"
                  value={reviewFields.canonical_model}
                  onChange={(e) => handleReviewFieldChange('canonical_model', e.target.value)}
                  placeholder="e.g. No. 5"
                  className="w-full px-3 py-2 bg-bone-light border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal focus:ring-2 focus:ring-spruce/30 focus:border-spruce transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">Type</label>
                <select
                  value={reviewFields.canonical_type}
                  onChange={(e) => handleReviewFieldChange('canonical_type', e.target.value)}
                  className="w-full px-3 py-2 bg-bone-light border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal focus:ring-2 focus:ring-spruce/30 focus:border-spruce transition-colors"
                >
                  <option value="">—</option>
                  {canonicalTypeOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">Plane Type Number</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={reviewFields.plane_type_number}
                  onChange={(e) => handleReviewFieldChange('plane_type_number', e.target.value)}
                  placeholder="1–20 (Stanley bench planes only)"
                  className="w-full px-3 py-2 bg-bone-light border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal focus:ring-2 focus:ring-spruce/30 focus:border-spruce transition-colors"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">Condition</label>
                <select
                  value={reviewFields.condition}
                  onChange={(e) => handleReviewFieldChange('condition', e.target.value)}
                  className="w-full px-3 py-2 bg-bone-light border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal focus:ring-2 focus:ring-spruce/30 focus:border-spruce transition-colors"
                >
                  {conditionOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Save corrections button — only in correcting mode */}
            {feedbackState === 'correcting' && (
              <div className="mt-4">
                <button
                  onClick={handleSaveCorrections}
                  className="px-6 py-3 bg-honey text-dark-teal rounded-lg text-base font-medium font-body hover:bg-honey-light transition-colors"
                >
                  Save corrections
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active listings panel — connects identification back to the index. */}
      {canonicalType && canonicalType !== 'Other' && (
        <div className="border-t border-[#e4e2dc] px-5 py-5">
          <div className="flex items-baseline justify-between mb-3">
            <h4 className="text-base font-display font-semibold text-spruce uppercase tracking-wide">
              Active listings
            </h4>
            {PRICE_GUIDE_ENABLED && guideHref && (
              <a
                href={guideHref}
                onClick={() => track('toolscan_price_guide_link_clicked', {
                  scanId: scanId || null,
                  cluster_key: priceStats.cluster_key || null,
                })}
                className="text-sm font-body text-honey hover:text-honey-dark transition-colors"
              >
                View full price guide →
              </a>
            )}
          </div>

          {!activeListingsLoaded && (
            <p className="text-sm text-secondary font-body">Searching…</p>
          )}

          {activeListingsLoaded && activeListings.length === 0 && (
            <div className="flex items-start gap-3 p-4 bg-bone rounded-lg">
              <Bell className="w-5 h-5 text-honey flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-body text-dark-teal mb-2">
                  No matching listings right now.
                </p>
                <a
                  href={searchHref}
                  onClick={() => track('toolscan_save_alert_clicked', {
                    scanId: scanId || null,
                    has_brand: Boolean(canonicalBrand),
                    canonical_type: canonicalType,
                  })}
                  className="text-sm font-body font-medium text-honey hover:text-honey-dark transition-colors"
                >
                  Save an alert → we'll email when one shows up
                </a>
              </div>
            </div>
          )}

          {activeListingsLoaded && activeListings.length > 0 && (
            <>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeListings.map((listing, i) => (
                  <li key={listing.id}>
                    <a
                      href={listing.source_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track('toolscan_active_listing_clicked', {
                        scanId: scanId || null,
                        source: listing.source,
                        position: i,
                        cluster_key: priceStats.cluster_key || null,
                      })}
                      className="block p-3 rounded-lg border border-[#e4e2dc] bg-bone-light hover:border-honey hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-3">
                        {listing.imageUrl && (
                          <div className="flex-shrink-0 w-14 h-14 rounded overflow-hidden bg-bone-dark">
                            <img src={listing.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-body text-dark-teal line-clamp-2">{listing.name}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-honey font-semibold font-body">
                              {typeof listing.price === 'number' ? fmtDollars(listing.price) : '—'}
                            </span>
                            <span className="text-xs text-secondary font-body inline-flex items-center gap-1">
                              {listing.sourceName || listing.source}
                              <ExternalLink className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-right">
                <a
                  href={searchHref}
                  className="text-sm font-body font-medium text-honey hover:text-honey-dark transition-colors"
                >
                  See all matches →
                </a>
              </div>
            </>
          )}
        </div>
      )}

      {/* AI Analysis — condition notes + confidence reasoning. */}
      {(tool.condition_notes || tool.confidence_reasoning) && (
        <div className="border-t border-[#e4e2dc]">
          <button
            onClick={() => setAnalysisExpanded(!analysisExpanded)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-bone transition-colors"
          >
            <span className="text-base font-semibold font-body text-dark-teal">
              AI Analysis
            </span>
            {analysisExpanded ? (
              <ChevronUp className="w-5 h-5 text-secondary" />
            ) : (
              <ChevronDown className="w-5 h-5 text-secondary" />
            )}
          </button>

          {analysisExpanded && (
            <div className="px-5 pb-5 space-y-3">
              {tool.condition_notes && (
                <div>
                  <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Condition Notes</label>
                  <p className="text-base font-body text-secondary mt-0.5">{tool.condition_notes}</p>
                </div>
              )}
              {tool.confidence_reasoning && (
                <div>
                  <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">How we got there</label>
                  <p className="text-base font-body text-secondary mt-0.5">{tool.confidence_reasoning}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolScanCard;
