/**
 * Live-index chip — the "Live Index · N listings · updated Xm ago" pill at
 * the top of the empty-state hero. Pulse-dot animation via the .bl-pulse
 * keyframe in design-system.css.
 *
 * Data comes from getAggregatorStats() in the aggregator facets adapter.
 */

import React, { useEffect, useState } from 'react';

import { getAggregatorStats } from '../../firebase/adapters/aggregatorFacets';
import { relativeTime } from './relativeTime';

const DOT_GREEN = '#2a6a4a';

const LiveIndexChip = () => {
  const [stats, setStats] = useState({ activeCount: null, lastScrapedAt: null });

  useEffect(() => {
    let cancelled = false;
    getAggregatorStats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {
        // swallow — chip silently hides count + freshness on error
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const countLabel =
    stats.activeCount != null ? `${stats.activeCount.toLocaleString()} listings` : 'loading…';
  const freshLabel = stats.lastScrapedAt ? `updated ${relativeTime(stats.lastScrapedAt)}` : null;

  return (
    <div
      className="inline-flex items-center gap-2 text-spruce uppercase"
      style={{
        padding: '6px 14px',
        borderRadius: 999,
        background: 'rgba(26,48,48,0.05)',
        border: '1px solid rgba(26,48,48,0.1)',
        fontFamily: "'Outfit', sans-serif",
        fontWeight: 500,
        fontSize: 11,
        letterSpacing: '0.08em',
      }}
    >
      {/* Pulse-dot: static inner dot + expanding-fading outer ring */}
      <span className="relative inline-block" style={{ width: 8, height: 8 }}>
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ background: DOT_GREEN }}
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bl-pulse"
          style={{ background: DOT_GREEN }}
        />
      </span>
      <span>
        Live Index · {countLabel}
        {freshLabel ? ` · ${freshLabel}` : ''}
      </span>
    </div>
  );
};

export default LiveIndexChip;
