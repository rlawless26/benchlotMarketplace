// src/components/ToolScanCard.js
import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  ExternalLink,
  Check,
  AlertTriangle,
  Loader2,
  Camera,
  DollarSign,
  MapPin,
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

const ToolScanCard = ({
  tool,
  index,
  publishState,
  onUpdate,
  onDismiss,
  onPublish,
  onNavigateToListing,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(null); // field name being edited
  const [editValue, setEditValue] = useState('');
  const [publishedToolId, setPublishedToolId] = useState(null);
  const [publishError, setPublishError] = useState(null);

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

  const handlePublish = async () => {
    setPublishError(null);
    try {
      const toolId = await onPublish();
      setPublishedToolId(toolId);
    } catch (err) {
      setPublishError(err.message || 'Failed to save listing');
    }
  };

  const EditableField = ({ field, value, label, multiline = false }) => {
    if (editing === field) {
      return (
        <div className="mt-1">
          {multiline ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-accent rounded-lg text-sm focus:ring-2 focus:ring-accent/50 resize-none"
              rows={4}
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-accent rounded-lg text-sm focus:ring-2 focus:ring-accent/50"
              autoFocus
            />
          )}
          <div className="flex gap-2 mt-2">
            <button onClick={saveEdit} className="text-xs px-3 py-1 bg-benchlot-primary text-white rounded hover:bg-benchlot-secondary">
              Save
            </button>
            <button onClick={cancelEdit} className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        onClick={() => startEdit(field, value)}
        className="text-left w-full hover:bg-stone-50 rounded px-1 -mx-1 transition-colors group"
        title="Click to edit"
      >
        <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
          click to edit
        </span>
      </button>
    );
  };

  const isPublished = publishState === 'done' || publishedToolId;

  return (
    <div className={`bg-white rounded-xl shadow-sm border transition-colors ${
      isPublished ? 'border-green-300 bg-green-50/30' : 'border-gray-200'
    }`}>
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-sm font-medium text-gray-600">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                {editing === 'suggested_title' ? (
                  <div>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full px-3 py-2 border border-accent rounded-lg text-lg font-serif focus:ring-2 focus:ring-accent/50"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={saveEdit} className="text-xs px-3 py-1 bg-benchlot-primary text-white rounded hover:bg-benchlot-secondary">Save</button>
                      <button onClick={cancelEdit} className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <h3
                    className="text-lg font-serif font-semibold text-benchlot-primary cursor-pointer hover:text-accent transition-colors"
                    onClick={() => startEdit('suggested_title', tool.suggested_title)}
                    title="Click to edit title"
                  >
                    {tool.suggested_title}
                  </h3>
                )}

                {/* Badges row */}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${confidenceColors[tool.confidence] || 'bg-gray-100 text-gray-800'}`}>
                    {tool.confidence} confidence
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${conditionColors[tool.condition] || 'bg-gray-100 text-gray-800'}`}>
                    {tool.condition}
                  </span>
                  {tool.collectibility && tool.collectibility !== 'None' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {tool.collectibility} collectibility
                    </span>
                  )}
                  {tool.location_in_image && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600">
                      <MapPin className="w-3 h-3" />
                      {tool.location_in_image}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Expand/Collapse */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
        </div>

        {/* Quick info row (always visible) */}
        <div className="flex flex-wrap items-center gap-4 mt-3 ml-10 text-sm text-gray-600">
          {tool.maker && tool.maker !== 'Unknown' && (
            <span><strong>Maker:</strong> {tool.maker}</span>
          )}
          {tool.model && (
            <span><strong>Model:</strong> {tool.model}</span>
          )}
          {tool.era && (
            <span><strong>Era:</strong> {tool.era}</span>
          )}
          <span className="flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            <strong>${tool.suggested_price_low}</strong> – <strong>${tool.suggested_price_high}</strong>
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
          {/* Identification details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tool Name</label>
              <p className="text-sm text-gray-800 mt-0.5">{tool.tool_name}</p>
              <EditableField field="tool_name" value={tool.tool_name} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</label>
              <p className="text-sm text-gray-800 mt-0.5">{tool.suggested_category} {tool.suggested_subcategory ? `› ${tool.suggested_subcategory}` : ''}</p>
            </div>
            {tool.era_reasoning && (
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Era Reasoning</label>
                <p className="text-sm text-gray-600 mt-0.5">{tool.era_reasoning}</p>
              </div>
            )}
            {tool.condition_notes && (
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Condition Notes</label>
                <p className="text-sm text-gray-600 mt-0.5">{tool.condition_notes}</p>
              </div>
            )}
            {tool.collectibility_notes && (
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Collectibility</label>
                <p className="text-sm text-gray-600 mt-0.5">{tool.collectibility_notes}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
            {editing === 'suggested_description' ? (
              <div className="mt-1">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 border border-accent rounded-lg text-sm focus:ring-2 focus:ring-accent/50 resize-none"
                  rows={6}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={saveEdit} className="text-xs px-3 py-1 bg-benchlot-primary text-white rounded hover:bg-benchlot-secondary">Save</button>
                  <button onClick={cancelEdit} className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            ) : (
              <p
                className="text-sm text-gray-700 mt-1 whitespace-pre-line cursor-pointer hover:bg-stone-50 rounded p-2 -m-2 transition-colors"
                onClick={() => startEdit('suggested_description', tool.suggested_description)}
                title="Click to edit"
              >
                {tool.suggested_description}
              </p>
            )}
          </div>

          {/* Price editing */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suggested Price Range</label>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">$</span>
                {editing === 'suggested_price_low' ? (
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-24 px-2 py-1 border border-accent rounded text-sm focus:ring-2 focus:ring-accent/50"
                    autoFocus
                  />
                ) : (
                  <span
                    className="text-sm font-medium cursor-pointer hover:text-accent"
                    onClick={() => startEdit('suggested_price_low', tool.suggested_price_low)}
                  >
                    {tool.suggested_price_low}
                  </span>
                )}
              </div>
              <span className="text-gray-400">—</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">$</span>
                {editing === 'suggested_price_high' ? (
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-24 px-2 py-1 border border-accent rounded text-sm focus:ring-2 focus:ring-accent/50"
                    autoFocus
                  />
                ) : (
                  <span
                    className="text-sm font-medium cursor-pointer hover:text-accent"
                    onClick={() => startEdit('suggested_price_high', tool.suggested_price_high)}
                  >
                    {tool.suggested_price_high}
                  </span>
                )}
              </div>
              {editing === 'suggested_price_low' || editing === 'suggested_price_high' ? (
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="text-xs px-3 py-1 bg-benchlot-primary text-white rounded hover:bg-benchlot-secondary">Save</button>
                  <button onClick={cancelEdit} className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Next photo hint */}
          {tool.next_photo_hint && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <Camera className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Want a better ID?</p>
                <p className="text-sm text-blue-700">{tool.next_photo_hint}</p>
              </div>
            </div>
          )}

          {/* Low confidence warning */}
          {tool.confidence === 'Low' && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Low confidence identification</p>
                <p className="text-sm text-amber-700">
                  {tool.confidence_reasoning || 'The AI is not confident about this identification. Review carefully before publishing.'}
                </p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            {isPublished ? (
              <div className="flex items-center gap-4 w-full">
                <div className="flex items-center gap-2 text-green-700">
                  <Check className="w-5 h-5" />
                  <span className="text-sm font-medium">Saved as draft listing</span>
                </div>
                {publishedToolId && (
                  <button
                    onClick={() => onNavigateToListing(publishedToolId)}
                    className="flex items-center gap-1.5 text-sm text-benchlot-primary hover:text-accent transition-colors ml-auto"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Edit listing
                  </button>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={handlePublish}
                  disabled={publishState === 'publishing'}
                  className="flex-1 py-2.5 px-4 bg-benchlot-primary text-white rounded-lg text-sm font-medium hover:bg-benchlot-secondary disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {publishState === 'publishing' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save as Draft Listing'
                  )}
                </button>
                <button
                  onClick={onDismiss}
                  className="p-2.5 border border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                  title="Dismiss this tool"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {publishError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{publishError}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolScanCard;
