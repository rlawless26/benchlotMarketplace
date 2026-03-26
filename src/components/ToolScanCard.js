// src/components/ToolScanCard.js
import React, { useState } from 'react';
// Link import removed — not needed for pre-launch card
import {
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Camera,
  DollarSign,
  Pencil,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

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

const ToolScanCard = ({
  tool,
  index,
  scanId,
  previewImage,
  publishState,
  onUpdate,
  onDismiss,
  onPublish,
  onSaveToChest,
  onListForSale,
  onNavigateToListing,
  onCorrection,
  onFeedback,
  user,
  isSeller,
}) => {
  const [analysisExpanded, setAnalysisExpanded] = useState(true);
  const [feedbackGiven, setFeedbackGiven] = useState(null); // 'up' | 'down' | null
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [publishedToolId] = useState(null);

  // Confirm/correct state
  const [confirmed, setConfirmed] = useState(false);
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

  const handleFeedback = (vote) => {
    setFeedbackGiven(vote);
    if (onFeedback) {
      onFeedback({
        vote,
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
        userEdits: getEdits(),
      });
    }
  };

  const handleEditAfterConfirm = () => {
    setConfirmed(false);
  };

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

  const isPublished = publishState === 'done' || publishedToolId;

  return (
    <div className={`bg-bone-light rounded-xl shadow-sm border transition-colors ${
      isPublished ? 'border-green-300 bg-green-50/30' : 'border-[#e4e2dc]'
    }`}>
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
                ${tool.suggested_price_low} – ${tool.suggested_price_high}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-body ${confidenceColors[tool.confidence] || 'bg-gray-100 text-gray-800'}`}>
                {tool.confidence} confidence
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-body ${conditionColors[tool.condition] || 'bg-gray-100 text-gray-800'}`}>
                {tool.condition}
              </span>
              {confirmed && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <Check className="w-3 h-3" />
                  Confirmed
                </span>
              )}
              {tool.collectibility && tool.collectibility !== 'None' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {tool.collectibility} collectibility
                </span>
              )}
            </div>
          </div>
        </div>

        {/* "Want a better ID?" hint — above the fold */}
        {tool.next_photo_hint && !confirmed && (
          <div className="flex items-start gap-3 p-3 mt-4 bg-blue-50 border border-blue-100 rounded-lg">
            <Camera className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold font-body text-blue-800">Want a better ID?</p>
              <p className="text-sm font-body text-blue-700">{tool.next_photo_hint}</p>
            </div>
          </div>
        )}

        {/* Low confidence warning — above the fold */}
        {tool.confidence === 'Low' && !confirmed && (
          <div className="flex items-start gap-3 p-3 mt-4 bg-amber-50 border border-amber-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold font-body text-amber-800">Low confidence identification</p>
              <p className="text-sm font-body text-amber-700">
                {tool.confidence_reasoning || 'The AI is not confident about this identification. Review carefully before publishing.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Review Identification Section */}
      <div className="px-5 pb-5 border-t border-[#e4e2dc] pt-4">
        <div className="mb-4">
          <h4 className="text-base font-display font-semibold text-spruce uppercase tracking-wide">
            Review Identification
          </h4>
          {!confirmed && (
            <p className="text-sm font-body text-secondary mt-1">
              Verify the details below. Edit any field that doesn't look right, then confirm.
            </p>
          )}
        </div>

        {confirmed ? (
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
                onClick={handleEditAfterConfirm}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium font-body border border-[#e4e2dc] rounded-lg text-secondary hover:bg-bone hover:text-dark-teal transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">
                  Tool Type
                </label>
                <input
                  type="text"
                  value={reviewFields.tool_name}
                  onChange={(e) => handleReviewFieldChange('tool_name', e.target.value)}
                  className="w-full px-3 py-2 bg-bone-light border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal focus:ring-2 focus:ring-spruce/30 focus:border-spruce transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">
                  Maker
                </label>
                <input
                  type="text"
                  value={reviewFields.maker}
                  onChange={(e) => handleReviewFieldChange('maker', e.target.value)}
                  className="w-full px-3 py-2 bg-bone-light border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal focus:ring-2 focus:ring-spruce/30 focus:border-spruce transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">
                  Model
                </label>
                <input
                  type="text"
                  value={reviewFields.model}
                  onChange={(e) => handleReviewFieldChange('model', e.target.value)}
                  className="w-full px-3 py-2 bg-bone-light border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal focus:ring-2 focus:ring-spruce/30 focus:border-spruce transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">
                  Condition
                </label>
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
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">
                  Price Low
                </label>
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
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">
                  Price High
                </label>
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
                <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">
                  Description
                </label>
                <textarea
                  value={reviewFields.suggested_description}
                  onChange={(e) => handleReviewFieldChange('suggested_description', e.target.value)}
                  className="w-full px-3 py-2 bg-bone-light border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal focus:ring-2 focus:ring-spruce/30 focus:border-spruce transition-colors resize-none"
                  rows={5}
                />
              </div>
            </div>

          </div>
        )}

        {/* Feedback */}
        <div className="pt-4 mt-4 border-t border-[#e4e2dc]">
          {feedbackGiven ? (
            <div className="flex items-center gap-2 text-sm font-body text-secondary">
              <Check className="w-4 h-4 text-spruce" />
              <span>{feedbackGiven === 'up' ? 'Thanks — glad we got it right.' : 'Thanks — we\'ll work on it.'}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-body text-secondary">Did we get this right?</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFeedback('up')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-body text-secondary border border-[#e4e2dc] hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Yes
                </button>
                <button
                  onClick={() => handleFeedback('down')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-body text-secondary border border-[#e4e2dc] hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                >
                  <ThumbsDown className="w-4 h-4" />
                  Not quite
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
