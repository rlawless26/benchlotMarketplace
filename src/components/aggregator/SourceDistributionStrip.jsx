/**
 * SourceDistributionStrip — reinforces aggregator identity with a one-row
 * summary of how the current result set is split across source kinds.
 * Sits above the results grid in the results state.
 */

import React from 'react';
import { KIND_COLORS } from '../../firebase/adapters/sources';

const EYEBROW = {
  fontFamily: "'Outfit', sans-serif",
  fontWeight: 700,
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  color: '#8a8a80',
};

/**
 * @param {object} props
 * @param {Record<string, number>} props.kindCounts
 * @param {boolean} [props.compact=false] — when true, strips the card framing
 *   (used when embedded in the sticky header; parent provides the border).
 */
const SourceDistributionStrip = ({ kindCounts, compact = false }) => {
  const entries = Object.entries(kindCounts || {}).filter(([, n]) => n > 0);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (total === 0) return null;

  const framing = compact
    ? { padding: 0, background: 'transparent', border: 'none', borderRadius: 0, marginBottom: 0 }
    : { padding: '14px 18px', marginBottom: 20, background: '#f8f6f2', border: '1px solid #e4e2dc', borderRadius: 10 };

  return (
    <div
      className="flex items-center flex-wrap"
      style={{
        ...framing,
        gap: 20,
      }}
    >
      <span style={EYEBROW}>ACROSS {entries.length} SOURCE TYPE{entries.length === 1 ? '' : 'S'}</span>

      <div
        className="flex overflow-hidden"
        style={{
          flex: 1,
          minWidth: 200,
          height: 8,
          borderRadius: 4,
          background: '#e8e6e0',
        }}
      >
        {entries.map(([kind, count]) => (
          <div
            key={kind}
            style={{
              flex: count,
              background: KIND_COLORS[kind] || '#888',
            }}
          />
        ))}
      </div>

      <div className="flex items-center flex-wrap" style={{ gap: 14 }}>
        {entries.map(([kind, count]) => (
          <span
            key={kind}
            className="inline-flex items-center gap-1.5"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
              fontSize: 11,
              color: '#4a5a54',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: KIND_COLORS[kind] || '#888',
              }}
            />
            {kind}{' '}
            <span style={{ fontWeight: 700, color: '#0c1c1e' }}>{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default SourceDistributionStrip;
