/**
 * Benchfind — UI Kit components
 * Reusable JSX building blocks. Inline styles, no Tailwind runtime —
 * but values map 1:1 to tailwind.config.js for production handoff.
 */

// ===== Tokens (mirror of colors_and_type.css + tailwind.config.js) =====
const BF = {
  paper50: '#FBF8F2', paper100: '#F6F1E7', paper200: '#ECE4D2', paper300: '#DDD2B9', paper400: '#C2B393',
  ink900: '#1B1714', ink800: '#2A2420', ink700: '#3D3631', ink600: '#5A514A', ink500: '#7A6F66', ink400: '#9B9189',
  // Spruce — primary accent (B v2). Replaces rust as the primary brand color.
  spruce50:  '#EEF4F0', spruce100: '#E0EBE4', spruce300: '#94B3A2', spruce500: '#2F6B52', spruce700: '#1F4D3A', spruce900: '#143527',
  // Brass — warm highlight for earned moments. Used sparingly.
  brass100: '#F0E3C3', brass500: '#B08938', brass700: '#8C6B22',
  // Rust — kept as a semantic color (low-confidence, project condition). No longer primary.
  rust50: '#FBF0E4', rust100: '#F5E3D2', rust300: '#E2B895', rust500: '#B86631', rust600: '#A85427', rust700: '#8A4419',
  patina100: '#DDEAE5', patina500: '#4F8A7A', patina700: '#2F5D52',
  iron700: '#3C4348', iron500: '#6B7178', iron300: '#B4B8BB',
  confHigh: '#2F6B3D', confHighBg: '#E4EFE2',
  confMed:  '#8C6B22', confMedBg: '#F0E3C3',
  confLow:  '#8A4419', confLowBg: '#F5E3D2',
  danger: '#B0321F', dangerBg: '#F7DDD6',
  rule: '#DDD2B9', ruleStrong: '#C9BC9E',
  fontDisplay: "'Petrona', 'Newsreader', Georgia, serif",
  fontSans:    "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  fontMono:    "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
  shadowSm:  '0 1px 2px rgba(40,30,20,0.06), 0 1px 1px rgba(40,30,20,0.04)',
  shadowMd:  '0 2px 6px rgba(40,30,20,0.08), 0 1px 2px rgba(40,30,20,0.04)',
  shadowLg:  '0 8px 24px rgba(40,30,20,0.10), 0 2px 6px rgba(40,30,20,0.06)',
  shadowFocus: '0 0 0 3px rgba(184,102,49,0.30)',
  radius: { xs: 2, sm: 4, md: 6, lg: 10, xl: 14, pill: 999 },
};

// ===== Icon (Lucide via global) =====
function I({ name, size = 18, color, stroke = 1.75 }) {
  // Use Lucide via global script; falls back to a circle if not loaded.
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); }, []);
  return <i data-lucide={name} style={{ width: size, height: size, color: color || 'currentColor', strokeWidth: stroke, display: 'inline-flex' }} />;
}

// ===== Wordmark — B v2 final: BENCH + FIND (bold), Petrona caps, photo-frame corners =====
function Wordmark({ size = 24, color = BF.ink900, accent = BF.spruce700, frame = true, hero = false }) {
  // hero=true uses two diagonal corners (top-left + bottom-right) for breathing room.
  // hero=false uses all four corners at smaller sizes.
  const padY = Math.max(4, Math.round(size * 0.20));
  const padX = Math.max(8, Math.round(size * 0.34));
  const cornerSize = hero ? Math.max(14, Math.round(size * 0.22)) : Math.max(5, Math.round(size * 0.22));
  const cornerStroke = hero ? 2.5 : Math.max(1, size * 0.06);

  const cornerStyle = (which) => {
    const base = { position: 'absolute', width: cornerSize, height: cornerSize };
    if (which === 'tl') return { ...base, top: 0, left: 0,    borderTop: `${cornerStroke}px solid ${accent}`, borderLeft:  `${cornerStroke}px solid ${accent}` };
    if (which === 'tr') return { ...base, top: 0, right: 0,   borderTop: `${cornerStroke}px solid ${accent}`, borderRight: `${cornerStroke}px solid ${accent}` };
    if (which === 'bl') return { ...base, bottom: 0, left: 0, borderBottom:`${cornerStroke}px solid ${accent}`, borderLeft: `${cornerStroke}px solid ${accent}` };
    if (which === 'br') return { ...base, bottom: 0, right: 0,borderBottom:`${cornerStroke}px solid ${accent}`, borderRight:`${cornerStroke}px solid ${accent}` };
  };

  return (
    <span style={{
      position: 'relative', display: 'inline-flex',
      padding: `${padY}px ${padX}px`,
      fontFamily: "'Petrona', 'Newsreader', Georgia, serif",
      fontSize: size, color, lineHeight: 1,
      textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
      {frame && hero && (
        <>
          <span style={cornerStyle('tl')} />
          <span style={cornerStyle('br')} />
        </>
      )}
      {frame && !hero && (
        <>
          <span style={cornerStyle('tl')} />
          <span style={cornerStyle('tr')} />
          <span style={cornerStyle('bl')} />
          <span style={cornerStyle('br')} />
        </>
      )}
      <span style={{ fontWeight: 400 }}>Bench</span><span style={{ fontWeight: 700 }}>find</span>
    </span>
  );
}

function Mark({ size = 28 }) {
  return <img src="../../assets/logo-mark.svg" width={size} height={size} alt="" />;
}

// ===== Buttons =====
function Button({ variant = 'primary', size = 'md', icon, children, onClick, disabled, type = 'button', style = {} }) {
  const sizes = {
    sm: { padY: 7,  padX: 12, font: 13, minH: 36 },
    md: { padY: 10, padX: 16, font: 14, minH: 44 },
    lg: { padY: 13, padX: 20, font: 15, minH: 52 },
  }[size];
  const variants = {
    primary:   { bg: BF.spruce700, color: BF.paper50, border: 'transparent', hoverBg: BF.spruce900 },
    secondary: { bg: 'transparent', color: BF.ink900, border: BF.ruleStrong, hoverBg: BF.paper100 },
    ghost:     { bg: 'transparent', color: BF.ink700, border: 'transparent', hoverBg: BF.paper100 },
    danger:    { bg: 'transparent', color: BF.danger, border: BF.danger, hoverBg: BF.dangerBg },
  };
  const v = variants[variant];
  const [hover, setHover] = React.useState(false);
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: BF.fontSans, fontSize: sizes.font, fontWeight: 600, letterSpacing: '-0.005em',
        background: disabled ? BF.paper200 : (hover ? v.hoverBg : v.bg),
        color: disabled ? BF.paper400 : v.color,
        border: `1px solid ${v.border === 'transparent' ? 'transparent' : v.border}`,
        borderRadius: BF.radius.md,
        padding: `${sizes.padY}px ${sizes.padX}px`,
        minHeight: sizes.minH,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 120ms cubic-bezier(0.2,0,0.2,1)',
        ...style,
      }}>
      {icon && <I name={icon} size={sizes.font + 2} />}
      {children}
    </button>
  );
}

// ===== Badges =====
function ConfidenceBadge({ level }) {
  const map = {
    high:   { color: BF.confHigh, bg: BF.confHighBg, label: 'High confidence' },
    medium: { color: BF.confMed,  bg: BF.confMedBg,  label: 'Medium confidence' },
    low:    { color: BF.confLow,  bg: BF.confLowBg,  label: 'Low confidence' },
  };
  const m = map[level] || map.medium;
  return (
    <span style={{
      fontFamily: BF.fontSans, fontSize: 12, fontWeight: 600,
      background: m.bg, color: m.color,
      padding: '5px 10px', borderRadius: BF.radius.pill,
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 50, background: m.color }} />
      {m.label}
    </span>
  );
}

function ConditionBadge({ level }) {
  const colors = { excellent: BF.confHigh, good: BF.patina500, fair: BF.confMed, project: BF.confLow };
  const c = colors[level] || BF.iron500;
  return (
    <span style={{
      fontFamily: BF.fontSans, fontSize: 12, fontWeight: 600,
      color: c, boxShadow: `inset 0 0 0 1px ${c}`,
      padding: '4px 10px', borderRadius: BF.radius.pill, textTransform: 'capitalize',
    }}>{level}</span>
  );
}

function TypeBadge({ children }) {
  return (
    <span style={{
      fontFamily: BF.fontMono, fontSize: 12, fontWeight: 600,
      background: BF.ink900, color: BF.paper50,
      padding: '4px 9px', borderRadius: BF.radius.sm,
      letterSpacing: '0.02em',
    }}>{children}</span>
  );
}

function CategoryBadge({ children }) {
  return (
    <span style={{
      fontFamily: BF.fontSans, fontSize: 11, fontWeight: 600,
      color: BF.ink600, boxShadow: `inset 0 0 0 1px ${BF.rule}`,
      padding: '3px 9px', borderRadius: BF.radius.sm,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>{children}</span>
  );
}

// ===== Inputs =====
function TextInput({ value, onChange, placeholder, type = 'text', icon, label, hint, error, style = {} }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && <span style={{ fontFamily: BF.fontSans, fontSize: 12, fontWeight: 600, color: BF.ink800 }}>{label}</span>}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#FFFFFF',
        border: `1px solid ${error ? BF.danger : (focus ? BF.spruce700 : BF.ruleStrong)}`,
        borderRadius: BF.radius.md,
        padding: '0 12px', minHeight: 44,
        boxShadow: focus ? '0 0 0 3px rgba(31, 77, 58, 0.20)' : 'none',
        transition: 'border-color 120ms, box-shadow 120ms',
      }}>
        {icon && <I name={icon} size={18} color={BF.ink500} />}
        <input
          type={type} value={value} placeholder={placeholder}
          onChange={(e) => onChange && onChange(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: BF.fontSans, fontSize: 15, color: BF.ink900, padding: '12px 0',
          }}
        />
      </div>
      {hint && !error && <span style={{ fontFamily: BF.fontSans, fontSize: 11, color: BF.ink500 }}>{hint}</span>}
      {error && <span style={{ fontFamily: BF.fontSans, fontSize: 11, color: BF.danger }}>{error}</span>}
    </div>
  );
}

// ===== Card =====
function Card({ children, elev = 'sm', style = {}, padding = 18 }) {
  const shadow = elev === 'lg' ? BF.shadowLg : elev === 'md' ? BF.shadowMd : elev === 'hairline' ? `inset 0 0 0 1px ${BF.rule}` : BF.shadowSm;
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: BF.radius.lg,
      boxShadow: shadow, padding,
      ...style,
    }}>{children}</div>
  );
}

// ===== Photo placeholder (warm workbench surface gradient) — supports quality variants =====
function ToolPhoto({ ratio = '1 / 1', label, variant = 'studio', style = {} }) {
  const sources = {
    studio:  '../../assets/photo-studio.svg',
    amateur: '../../assets/photo-amateur.svg',
    dim:     '../../assets/photo-dim-phone.svg',
  };
  return (
    <div style={{
      aspectRatio: ratio,
      borderRadius: BF.radius.md,
      overflow: 'hidden',
      position: 'relative',
      background: BF.ink900,
      ...style,
    }}>
      <img src={sources[variant] || sources.studio} alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      {label && (
        <span style={{
          position: 'absolute', bottom: 8, left: 10,
          fontFamily: BF.fontMono, fontSize: 10, color: BF.paper50, opacity: 0.85,
          letterSpacing: '0.04em', textTransform: 'uppercase',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}>{label}</span>
      )}
    </div>
  );
}

window.BF = BF;
Object.assign(window, {
  I, Wordmark, Mark, Button, ConfidenceBadge, ConditionBadge, TypeBadge, CategoryBadge,
  TextInput, Card, ToolPhoto,
});
