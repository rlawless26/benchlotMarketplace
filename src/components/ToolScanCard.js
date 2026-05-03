// src/components/ToolScanCard.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Camera,
  DollarSign,
  Pencil,
  ExternalLink,
  Bell,
} from 'lucide-react';

import { bridgeToCanonicalType } from '../utils/toolscanCategoryBridge';
import usePriceStats from '../firebase/hooks/usePriceStats';
import { pickReference } from '../utils/priceStats';
import { getAggregatedListings } from '../firebase/adapters/externalListingAdapter';
import { track } from '../utils/analytics';

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

// Helpers for the active-listings + price-guide panel.

// Slug builder mirrors src/utils/priceStats.js#slug. Used to derive the
// /guide/... URL when stats exist for the cluster.
const slug = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || '_';

const fmtDollars = (d) => `$${Math.round(d)}`;

const ToolScanCard = ({
  tool,
  index,
  scanId,
  previewImage,
  onUpdate,
  onFeedback,
}) => {
  const [analysisExpanded, setAnalysisExpanded] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Feedback state: null → 'correcting' → 'saved_correct' | 'saved_corrected'
  const [feedbackState, setFeedbackState] = useState(null);

  // ── Active-listings + price-guide panel state ──────────────────────────
  const canonicalType = useMemo(
    () => bridgeToCanonicalType({
      suggested_category: tool.suggested_category,
      suggested_subcategory: tool.suggested_subcategory,
      tool_name: tool.tool_name,
    }),
    [tool.suggested_category, tool.suggested_subcategory, tool.tool_name]
  );
  const canonicalBrand = useMemo(() => {
    const m = tool.maker;
    if (!m || m === 'Unknown' || tool.confidence === 'Low') return null;
    return m;
  }, [tool.maker, tool.confidence]);
  const canonicalSize = tool.model || null;

  const priceStats = usePriceStats({
    canonical_type: canonicalType,
    canonical_brand: canonicalBrand,
    canonical_size: canonicalSize,
  });

  const [activeListings, setActiveListings] = useState([]);
  const [activeListingsLoaded, setActiveListingsLoaded] = useState(false);

  useEffect(() => {
    if (!canonicalType) {
      // Telemetry on bridge misses — informs which subcategories need new
      // bridge entries.
      track('toolscan_category_bridge_missed', {
        suggested_category: tool.suggested_category || null,
        suggested_subcategory: tool.suggested_subcategory || null,
        tool_name: tool.tool_name || null,
      });
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
          primary_type: canonicalType,
          primary_brand: canonicalBrand,
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
    // priceStats.cluster_key + .reference are in the telemetry payload
    // but adding them as deps would re-run the listings fetch on every
    // priceStats settle — wasteful. Refire only on identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonicalType, canonicalBrand, scanId]);

  // Resolve the price band: prefer the data-driven reference when the
  // priceStats cluster has enough comps; otherwise fall back to the LLM's
  // suggested_price_low/high (the original behavior).
  const ref = pickReference(priceStats.stats);
  const dataBandApplied = Boolean(ref);
  const displayPriceLow = dataBandApplied ? Math.round(ref.p25) : tool.suggested_price_low;
  const displayPriceHigh = dataBandApplied ? Math.round(ref.p75) : tool.suggested_price_high;

  const guideHref = priceStats.stats
    ? (priceStats.grain === 'fine' && priceStats.stats.canonical_size
        ? `/guide/${slug(priceStats.stats.canonical_type)}/${slug(priceStats.stats.canonical_brand)}/${slug(priceStats.stats.canonical_size)}`
        : `/guide/${slug(priceStats.stats.canonical_type)}/${slug(priceStats.stats.canonical_brand)}`)
    : null;

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

  const [reviewFields, setReviewFields] = useState({
    tool_name: tool.tool_name || '',
    maker: tool.maker || '',
    model: tool.model || '',
    condition: tool.condition || 'Good',
    suggested_price_low: tool.suggested_price_low || '',
    suggested_price_high: tool.suggested_price_high || '',
    suggested_description: tool.suggested_description || '',
  });

  const handleReviewFieldChange = (field, value) => {
    setReviewFields(prev => ({ ...prev, [field]: value }));
  };

  const getEdits = () => {
    const edits = {};
    if (reviewFields.tool_name !== (tool.tool_name || '')) edits.tool_name = { from: tool.tool_name, to: reviewFields.tool_name };
    if (reviewFields.maker !== (tool.maker || '')) edits.maker = { from: tool.maker, to: reviewFields.maker };
    if (reviewFields.model !== (tool.model || '')) edits.model = { from: tool.model, to: reviewFields.model };
    if (reviewFields.condition !== (tool.condition || 'Good')) edits.condition = { from: tool.condition, to: reviewFields.condition };
    if (String(reviewFields.suggested_price_low) !== String(tool.suggested_price_low || '')) edits.price_low = { from: tool.suggested_price_low, to: reviewFields.suggested_price_low };
    if (String(reviewFields.suggested_price_high) !== String(tool.suggested_price_high || '')) edits.price_high = { from: tool.suggested_price_high, to: reviewFields.suggested_price_high };
    return Object.keys(edits).length > 0 ? edits : null;
  };

  const handleLooksRight = () => {
    setFeedbackState('saved_correct');
    if (onFeedback) {
      onFeedback({
        vote: 'correct',
        scanId,
        originalResult: {
          tool_name: tool.tool_name,
          maker: tool.maker,
          model: tool.model,
          condition: tool.condition,
          confidence: tool.confidence,
          suggested_price_low: tool.suggested_price_low,
          suggested_price_high: tool.suggested_price_high,
        },
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
        originalResult: {
          tool_name: tool.tool_name,
          maker: tool.maker,
          model: tool.model,
          condition: tool.condition,
          confidence: tool.confidence,
          suggested_price_low: tool.suggested_price_low,
          suggested_price_high: tool.suggested_price_high,
        },
        correctedResult: {
          tool_name: reviewFields.tool_name,
          maker: reviewFields.maker,
          model: reviewFields.model,
          condition: reviewFields.condition,
          suggested_price_low: reviewFields.suggested_price_low,
          suggested_price_high: reviewFields.suggested_price_high,
        },
        userEdits: getEdits(),
      });
    }
  };

  const isConfirmed = feedbackState === 'saved_correct' || feedbackState === 'saved_corrected';

  // Title inline edit helpers
  const startEdit = (field, value) => {
    setEditing(field);
    setEditValue(value || '');
  };

  const saveEdit = () => {
    if (editing) {
      onUpdate({ ...tool, [editing]: editValue });
      setEditing(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  return (
    <div className="bg-bone-light rounded-xl shadow-sm border border-[#e4e2dc]">
      {/* Card Header — photo + title + info */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {previewImage && (
            <div className="flex-shrink-0 w-28 h-28 rounded-lg overflow-hidden border border-[#e4e2dc]">
              <img src={previewImage} alt="Scanned tool" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {editing === 'suggested_title' ? (
              <div>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3 py-2 bg-bone-light border border-[#e4e2dc] rounded-lg text-xl font-display focus:ring-2 focus:ring-spruce/30 focus:border-spruce"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={saveEdit} className="text-xs px-3 py-1 bg-spruce text-bone rounded hover:bg-spruce-light">Save</button>
                  <button onClick={cancelEdit} className="text-xs px-3 py-1 border border-[#e4e2dc] rounded hover:bg-bone">Cancel</button>
                </div>
              </div>
            ) : (
              <h3
                className="text-xl font-display font-semibold text-spruce cursor-pointer hover:text-honey transition-colors"
                onClick={() => startEdit('suggested_title', tool.suggested_title)}
                title="Click to edit title"
              >
                {tool.suggested_title}
              </h3>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-2 text-base font-body text-secondary">
              {tool.maker && tool.maker !== 'Unknown' && (
                <span><strong className="text-dark-teal">Maker:</strong> {tool.maker}</span>
              )}
              {tool.model && (
                <span><strong className="text-dark-teal">Model:</strong> {tool.model}</span>
              )}
              {tool.era && (
                <span><strong className="text-dark-teal">Era:</strong> {tool.era}</span>
              )}
              <span className="flex items-center gap-1 text-honey font-semibold">
                <DollarSign className="w-4 h-4" />
                ${displayPriceLow} – ${displayPriceHigh}
              </span>
              {dataBandApplied && (
                <span className="inline-flex items-center text-xs font-body text-secondary px-2 py-0.5 rounded-full bg-bone border border-stone-200">
                  Benchlot data · {ref.count} comp{ref.count === 1 ? '' : 's'} ({ref.source === 'sold' ? 'sold' : 'asking'})
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-body ${confidenceColors[tool.confidence] || 'bg-gray-100 text-gray-800'}`}>
                {tool.confidence} confidence
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-body ${conditionColors[tool.condition] || 'bg-gray-100 text-gray-800'}`}>
                {tool.condition}
              </span>
              {tool.collectibility && tool.collectibility !== 'None' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {tool.collectibility} collectibility
                </span>
              )}
            </div>
          </div>
        </div>

        {/* "Want a better ID?" hint */}
        {tool.next_photo_hint && !isConfirmed && (
          <div className="flex items-start gap-3 p-3 mt-4 bg-blue-50 border border-blue-100 rounded-lg">
            <Camera className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold font-body text-blue-800">Want a better ID?</p>
              <p className="text-sm font-body text-blue-700">{tool.next_photo_hint}</p>
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
                {tool.confidence_reasoning || 'We\'re not very confident about this one. Review carefully.'}
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
            <span className="text-sm font-body text-green-800">Confirmed. We've sent a copy of these results to your inbox.</span>
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
            <span className="text-sm font-body text-green-800">Corrections saved and sent to your inbox. Thanks for helping us get better at this.</span>
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
                <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Tool Type</label>
                <p className="text-base font-body text-dark-teal mt-0.5">{reviewFields.tool_name}</p>
              </div>
              <div className="bg-bone rounded-lg px-3 py-2 border border-[#e4e2dc]">
                <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Maker</label>
                <p className="text-base font-body text-dark-teal mt-0.5">{reviewFields.maker || '—'}</p>
              </div>
              <div className="bg-bone rounded-lg px-3 py-2 border border-[#e4e2dc]">
                <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Model</label>
                <p className="text-base font-body text-dark-teal mt-0.5">{reviewFields.model || '—'}</p>
              </div>
              <div className="bg-bone rounded-lg px-3 py-2 border border-[#e4e2dc]">
                <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Condition</label>
                <p className="text-base font-body text-dark-teal mt-0.5">{reviewFields.condition}</p>
              </div>
              <div className="bg-bone rounded-lg px-3 py-2 border border-[#e4e2dc] sm:col-span-2">
                <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Price Range</label>
                <p className="text-base font-body text-honey mt-0.5 font-semibold">
                  ${reviewFields.suggested_price_low} – ${reviewFields.suggested_price_high}
                </p>
              </div>
              <div className="bg-bone rounded-lg px-3 py-2 border border-[#e4e2dc] sm:col-span-2">
                <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Description</label>
                <p className="text-base font-body text-dark-teal mt-0.5 whitespace-pre-line">{reviewFields.suggested_description}</p>
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
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">Tool Type</label>
                <input
                  type="text"
                  value={reviewFields.tool_name}
                  onChange={(e) => handleReviewFieldChange('tool_name', e.target.value)}
                  className="w-full px-3 py-2 bg-bone-light border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal focus:ring-2 focus:ring-spruce/30 focus:border-spruce transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">Maker</label>
                <input
                  type="text"
                  value={reviewFields.maker}
                  onChange={(e) => handleReviewFieldChange('maker', e.target.value)}
                  className="w-full px-3 py-2 bg-bone-light border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal focus:ring-2 focus:ring-spruce/30 focus:border-spruce transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">Model</label>
                <input
                  type="text"
                  value={reviewFields.model}
                  onChange={(e) => handleReviewFieldChange('model', e.target.value)}
                  className="w-full px-3 py-2 bg-bone-light border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal focus:ring-2 focus:ring-spruce/30 focus:border-spruce transition-colors"
                />
              </div>
              <div>
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
              <div>
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">Price Low</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-secondary">$</span>
                  <input
                    type="number"
                    value={reviewFields.suggested_price_low}
                    onChange={(e) => handleReviewFieldChange('suggested_price_low', e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-bone-light border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal focus:ring-2 focus:ring-spruce/30 focus:border-spruce transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">Price High</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-secondary">$</span>
                  <input
                    type="number"
                    value={reviewFields.suggested_price_high}
                    onChange={(e) => handleReviewFieldChange('suggested_price_high', e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-bone-light border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal focus:ring-2 focus:ring-spruce/30 focus:border-spruce transition-colors"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">Description</label>
                <textarea
                  value={reviewFields.suggested_description}
                  onChange={(e) => handleReviewFieldChange('suggested_description', e.target.value)}
                  className="w-full px-3 py-2 bg-bone-light border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal focus:ring-2 focus:ring-spruce/30 focus:border-spruce transition-colors resize-none"
                  rows={5}
                />
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

      {/* Active listings on Benchlot — connects ToolScan back to the
          aggregator. Shown whenever we could resolve a canonical_type;
          empty-state with a save-alert nudge otherwise. */}
      {canonicalType && (
        <div className="border-t border-[#e4e2dc] px-5 py-5">
          <div className="flex items-baseline justify-between mb-3">
            <h4 className="text-base font-display font-semibold text-spruce uppercase tracking-wide">
              Active listings on Benchlot
            </h4>
            {guideHref && (
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
                  No matching listings on Benchlot right now.
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

      {/* AI Analysis — era reasoning, condition notes, collectibility */}
      {(tool.era_reasoning || tool.condition_notes || tool.collectibility_notes) && (
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
              {tool.era_reasoning && (
                <div>
                  <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Era Reasoning</label>
                  <p className="text-base font-body text-secondary mt-0.5">{tool.era_reasoning}</p>
                </div>
              )}
              {tool.condition_notes && (
                <div>
                  <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Condition Notes</label>
                  <p className="text-base font-body text-secondary mt-0.5">{tool.condition_notes}</p>
                </div>
              )}
              {tool.collectibility_notes && (
                <div>
                  <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Collectibility</label>
                  <p className="text-base font-body text-secondary mt-0.5">{tool.collectibility_notes}</p>
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
