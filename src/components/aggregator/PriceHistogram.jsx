/**
 * PriceHistogram — vanilla SVG bucketed histogram for the price-guide page.
 *
 * Inputs: an array of `{ price, kind }` samples where `kind` is 'sold' or
 * 'asking'. Renders 10 evenly-spaced buckets across the IQR ±1.5×IQR
 * (clamped to the data range), with sold and asking stacked-by-color so
 * the eye can compare distributions at a glance.
 *
 * No charting library — the design is simple enough that vanilla SVG is
 * cheaper than a runtime dep, and the price-guide page is the only
 * consumer for now.
 */

import React from 'react';

const SOLD_COLOR = '#1a3030';   // spruce
const ASKING_COLOR = '#d4aa60'; // honey
const AXIS_COLOR = '#4a5a54';   // fg-secondary
const N_BUCKETS = 10;

function quantile(sorted, q) {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const rank = q * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
}

const PriceHistogram = ({ samples, width = 480, height = 160 }) => {
  if (!samples || samples.length === 0) return null;
  const prices = samples.map((s) => s.price).filter((p) => Number.isFinite(p));
  if (prices.length === 0) return null;

  const sorted = [...prices].sort((a, b) => a - b);
  const p25 = quantile(sorted, 0.25);
  const p75 = quantile(sorted, 0.75);
  const iqr = (p75 || 0) - (p25 || 0);
  const lo = Math.max(0, (p25 || 0) - 1.5 * iqr);
  const hi = (p75 || 0) + 1.5 * iqr;
  // Fallback when IQR collapses (e.g. all samples identical)
  const min = Math.max(lo, sorted[0]);
  const max = Math.min(Math.max(hi, sorted[sorted.length - 1]), sorted[sorted.length - 1]);
  const span = Math.max(max - min, 1);

  const bucketSize = span / N_BUCKETS;
  const buckets = Array.from({ length: N_BUCKETS }, () => ({ sold: 0, asking: 0 }));

  for (const s of samples) {
    if (!Number.isFinite(s.price)) continue;
    if (s.price < min || s.price > max) continue;
    const idx = Math.min(Math.floor((s.price - min) / bucketSize), N_BUCKETS - 1);
    if (s.kind === 'sold') buckets[idx].sold += 1;
    else buckets[idx].asking += 1;
  }

  const maxCount = Math.max(...buckets.map((b) => b.sold + b.asking), 1);

  const padX = 28;
  const padY = 24;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const barW = innerW / N_BUCKETS;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Price distribution histogram"
      style={{ display: 'block' }}
    >
      {/* Bars */}
      {buckets.map((b, i) => {
        const total = b.sold + b.asking;
        const totalH = (total / maxCount) * innerH;
        const askingH = (b.asking / maxCount) * innerH;
        const soldH = totalH - askingH;
        const x = padX + i * barW + 2;
        const w = Math.max(barW - 4, 1);
        const yAsking = padY + innerH - askingH;
        const ySold = yAsking - soldH;
        return (
          <g key={i}>
            {b.sold > 0 && (
              <rect x={x} y={ySold} width={w} height={soldH} fill={SOLD_COLOR} rx={1} />
            )}
            {b.asking > 0 && (
              <rect x={x} y={yAsking} width={w} height={askingH} fill={ASKING_COLOR} rx={1} />
            )}
          </g>
        );
      })}

      {/* Baseline */}
      <line
        x1={padX}
        x2={width - padX}
        y1={padY + innerH}
        y2={padY + innerH}
        stroke={AXIS_COLOR}
        strokeOpacity={0.3}
      />

      {/* X-axis ticks: min, p50, max */}
      <text x={padX} y={height - 6} fill={AXIS_COLOR} fontSize={10} fontFamily="'Outfit', sans-serif">
        ${Math.round(min)}
      </text>
      <text x={width / 2} y={height - 6} fill={AXIS_COLOR} fontSize={10} fontFamily="'Outfit', sans-serif" textAnchor="middle">
        ${Math.round(quantile(sorted, 0.5))}
      </text>
      <text x={width - padX} y={height - 6} fill={AXIS_COLOR} fontSize={10} fontFamily="'Outfit', sans-serif" textAnchor="end">
        ${Math.round(max)}
      </text>
    </svg>
  );
};

export default PriceHistogram;
