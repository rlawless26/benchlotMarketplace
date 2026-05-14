import React from 'react';

/**
 * Benchfind scan-result badges. Lightweight, no state.
 */

export const CategoryBadge = ({ children }) => (
  <span
    className="font-sans text-[11px] font-semibold text-ink-600 uppercase tracking-[0.04em] px-[9px] py-[3px] rounded-sm"
    style={{ boxShadow: 'inset 0 0 0 1px #DDD2B9' }}
  >
    {children}
  </span>
);

export const TypeBadge = ({ children }) => (
  <span
    className="font-mono text-xs font-semibold text-paper-50 px-[9px] py-1 rounded-sm tracking-[0.02em]"
    style={{ background: '#1B1714' }}
  >
    {children}
  </span>
);

const CONFIDENCE = {
  high:   { color: '#2F6B3D', bg: '#E4EFE2', label: 'High confidence' },
  medium: { color: '#9A6B12', bg: '#F5E9C8', label: 'Medium confidence' },
  low:    { color: '#8A4419', bg: '#F5E3D2', label: 'Low confidence' },
};

export const ConfidenceBadge = ({ level }) => {
  const key = String(level || '').toLowerCase();
  const c = CONFIDENCE[key] || CONFIDENCE.medium;
  return (
    <span
      className="inline-flex items-center gap-[6px] font-sans text-xs font-semibold rounded-pill px-[10px] py-[5px]"
      style={{ background: c.bg, color: c.color }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: c.color, display: 'inline-block' }} />
      {c.label}
    </span>
  );
};

const CONDITION = {
  excellent: '#2F6B3D',
  good:      '#4F8A7A',
  fair:      '#9A6B12',
  project:   '#8A4419',
};

export const ConditionBadge = ({ level }) => {
  const key = String(level || '').toLowerCase();
  const color = CONDITION[key] || '#6B7178';
  return (
    <span
      className="inline-flex items-center font-sans text-xs font-semibold rounded-pill px-[10px] py-1 capitalize"
      style={{ color, boxShadow: `inset 0 0 0 1px ${color}` }}
    >
      {level || 'Unknown'}
    </span>
  );
};
