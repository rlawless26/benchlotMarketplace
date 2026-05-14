import React from 'react';

/**
 * Benchfind wordmark.
 *
 * Display treatment: `BENCH` (Petrona regular) + `FIND` (Petrona bold) in
 * uppercase, wrapped by forest-700 photo-frame corner registration marks.
 *
 * - `frame={true}` (default) — four corner marks at small/mid scales, two
 *   diagonal corners (top-left + bottom-right) at hero scale.
 * - `hero={true}` — bumps corner size + stroke for breathing room at
 *   large-headline scale.
 *
 * Corners are absolutely positioned spans with one-sided borders. Sizes
 * scale off the wordmark size so the mark holds up at favicon → hero.
 */
const Wordmark = ({
  size = 24,
  color,
  accent = '#1F4D3A', // forest-700
  frame = true,
  hero = false,
}) => {
  const padY = Math.max(4, Math.round(size * 0.20));
  const padX = Math.max(8, Math.round(size * 0.34));
  const cornerSize = hero
    ? Math.max(14, Math.round(size * 0.22))
    : Math.max(5, Math.round(size * 0.22));
  const cornerStroke = hero ? 2.5 : Math.max(1, size * 0.06);

  const cornerStyle = (which) => {
    const base = { position: 'absolute', width: cornerSize, height: cornerSize };
    if (which === 'tl') return { ...base, top: 0, left: 0,    borderTop: `${cornerStroke}px solid ${accent}`, borderLeft:  `${cornerStroke}px solid ${accent}` };
    if (which === 'tr') return { ...base, top: 0, right: 0,   borderTop: `${cornerStroke}px solid ${accent}`, borderRight: `${cornerStroke}px solid ${accent}` };
    if (which === 'bl') return { ...base, bottom: 0, left: 0, borderBottom:`${cornerStroke}px solid ${accent}`, borderLeft: `${cornerStroke}px solid ${accent}` };
    if (which === 'br') return { ...base, bottom: 0, right: 0,borderBottom:`${cornerStroke}px solid ${accent}`, borderRight:`${cornerStroke}px solid ${accent}` };
    return base;
  };

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        padding: `${padY}px ${padX}px`,
        fontFamily: "'Petrona', 'Newsreader', Georgia, serif",
        fontSize: size,
        color: color || '#1B1714',
        lineHeight: 1,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
      aria-label="Benchfind"
    >
      {frame && hero && (
        <>
          <span aria-hidden style={cornerStyle('tl')} />
          <span aria-hidden style={cornerStyle('br')} />
        </>
      )}
      {frame && !hero && (
        <>
          <span aria-hidden style={cornerStyle('tl')} />
          <span aria-hidden style={cornerStyle('tr')} />
          <span aria-hidden style={cornerStyle('bl')} />
          <span aria-hidden style={cornerStyle('br')} />
        </>
      )}
      <span style={{ fontWeight: 400 }}>Bench</span>
      <span style={{ fontWeight: 700 }}>find</span>
    </span>
  );
};

export default Wordmark;
