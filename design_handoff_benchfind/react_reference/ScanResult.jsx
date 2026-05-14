/**
 * Benchfind — Scan Result components
 */

function CompPriceRange({ low = 85, high = 140, listingPrice, count = 18, days = 90 }) {
  // Map domain [low * 0.7, high * 1.3] → 0..100%
  const min = Math.round(low * 0.7);
  const max = Math.round(high * 1.3);
  const pct = (n) => Math.max(0, Math.min(100, ((n - min) / (max - min)) * 100));
  const bandLeft = pct(low);
  const bandRight = 100 - pct(high);
  const markPct = listingPrice ? pct(listingPrice) : null;
  const inBand = listingPrice && listingPrice >= low && listingPrice <= high;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
        <span style={{ fontFamily: BF.fontSans, fontSize: 11, fontWeight: 600, color: BF.ink500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Comp range · {days} days · n={count}
        </span>
        <span style={{ fontFamily: BF.fontMono, fontSize: 17, fontWeight: 500, color: BF.ink800 }}>
          ${low} – <span style={{ color: BF.brass700 }}>${high}</span>
        </span>
      </div>
      <div style={{ position: 'relative', height: 22 }}>
        <div style={{ position: 'absolute', top: 8, left: 0, right: 0, height: 6, background: BF.paper200, borderRadius: BF.radius.pill }} />
        <div style={{ position: 'absolute', top: 8, left: `${bandLeft}%`, right: `${bandRight}%`, height: 6, background: BF.patina500, borderRadius: BF.radius.pill }} />
        {markPct !== null && (
          <>
            <div style={{
              position: 'absolute', top: -2, left: `${markPct}%`,
              transform: 'translateX(-50%)',
              width: 3, height: 22, background: BF.ink900, borderRadius: 1.5,
            }} />
            <span style={{
              position: 'absolute', top: -26, left: `${markPct}%`, transform: 'translateX(-50%)',
              fontFamily: BF.fontMono, fontSize: 12, fontWeight: 600, color: BF.ink900, whiteSpace: 'nowrap',
            }}>${listingPrice}</span>
          </>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: BF.fontMono, fontSize: 11, color: BF.ink500 }}>
        <span>${min}</span>
        <span>${Math.round((min + max) / 2)}</span>
        <span>${max}</span>
      </div>
      {listingPrice && (
        <div style={{ marginTop: 14, fontFamily: BF.fontSans, fontSize: 13, color: BF.ink700 }}>
          Listed at <strong style={{ color: BF.ink900 }}>${listingPrice}</strong>{' '}
          {inBand
            ? <span style={{ color: BF.patina700, fontWeight: 600 }}>· fair price for what it is.</span>
            : (listingPrice < low
                ? <span style={{ color: BF.confHigh, fontWeight: 600 }}>· below comp band — worth a closer look.</span>
                : <span style={{ color: BF.rust700, fontWeight: 600 }}>· above comp band.</span>
            )}
        </div>
      )}
    </div>
  );
}

function ScanResultHeader({ photoLabel = 'IMG_4821', photoVariant = 'studio', maker, model, type, era, category, condition, confidence }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 24,
      padding: '24px 28px', borderBottom: `1px solid ${BF.paper200}`,
    }}>
      <ToolPhoto ratio="1 / 1" label={photoLabel} variant={photoVariant} style={{ width: 140 }} />
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <CategoryBadge>{category}</CategoryBadge>
          <span style={{ fontFamily: BF.fontSans, fontSize: 12, color: BF.ink500 }}>· {era}</span>
        </div>
        <h2 style={{
          margin: 0, fontFamily: BF.fontDisplay, fontWeight: 500, fontSize: 36,
          letterSpacing: '-0.015em', color: BF.ink900, lineHeight: 1.05,
        }}>
          {maker} {model}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <TypeBadge>{type}</TypeBadge>
          <ConditionBadge level={condition} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <ConfidenceBadge level={confidence} />
        <button style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: BF.fontSans, fontSize: 12, color: BF.ink600, display: 'inline-flex', gap: 4, alignItems: 'center',
        }}>
          <I name="share-2" size={14} />Share
        </button>
      </div>
    </div>
  );
}

function ResultSection({ title, children, action }) {
  return (
    <section style={{ padding: '20px 28px', borderBottom: `1px solid ${BF.paper200}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h3 style={{ margin: 0, fontFamily: BF.fontSans, fontSize: 13, fontWeight: 600, color: BF.ink800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</h3>
        {action}
      </div>
      {/* Signature rule-tick motif under section heads */}
      <div style={{
        height: 12, marginBottom: 14,
        backgroundImage: `url(../../assets/motif-rule.svg)`,
        backgroundRepeat: 'repeat-x', backgroundPosition: 'left center',
        opacity: 0.6,
      }} />
      {children}
    </section>
  );
}

function ListingTile({ source, title, price, condition, location, days }) {
  return (
    <a href="#" style={{
      display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 14, alignItems: 'center',
      padding: '12px 14px', textDecoration: 'none',
      borderRadius: BF.radius.md, background: BF.paper50,
      boxShadow: `inset 0 0 0 1px ${BF.paper200}`,
    }}>
      <ToolPhoto ratio="1 / 1" style={{ width: 60 }} />
      <div>
        <div style={{ fontFamily: BF.fontSans, fontSize: 13, fontWeight: 500, color: BF.ink900, marginBottom: 2 }}>{title}</div>
        <div style={{ fontFamily: BF.fontSans, fontSize: 11, color: BF.ink500 }}>
          {source} · {condition} · {location} · {days}d ago
        </div>
      </div>
      <span style={{ fontFamily: BF.fontMono, fontSize: 14, fontWeight: 600, color: BF.ink900 }}>${price}</span>
    </a>
  );
}

function NextPhotoHint({ area = 'frog area', onUpload }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 14, alignItems: 'center',
      padding: '14px 16px',
      background: BF.spruce100, borderRadius: BF.radius.md,
      boxShadow: `inset 0 0 0 1px ${BF.spruce300}`,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: BF.radius.sm,
        background: BF.spruce700, color: BF.paper50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: BF.fontMono, fontWeight: 700, fontSize: 18,
      }}>2</div>
      <div>
        <div style={{ fontFamily: BF.fontSans, fontSize: 14, fontWeight: 600, color: BF.ink900 }}>Take a {area} shot</div>
        <div style={{ fontFamily: BF.fontSans, fontSize: 12, color: BF.ink600, marginTop: 2 }}>
          One more photo of the {area} will lift this from Medium → High confidence.
        </div>
      </div>
      <Button size="sm" icon="camera" onClick={onUpload}>Add photo</Button>
    </div>
  );
}

function VerdictBanner({ verdict = 'fair' }) {
  const map = {
    fair:  { bg: BF.confHighBg,  color: BF.confHigh, label: 'Fair price for what it is', icon: 'check-circle-2' },
    below: { bg: BF.confHighBg,  color: BF.confHigh, label: 'Below comp band — worth a closer look', icon: 'trending-down' },
    above: { bg: BF.rust100,     color: BF.rust700,  label: 'Above comp band', icon: 'trending-up' },
    unknown:{ bg: BF.confMedBg,  color: BF.confMed,  label: 'Not enough data for a verdict yet', icon: 'circle-help' },
  };
  const v = map[verdict];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 20px',
      background: v.bg, color: v.color,
      borderRadius: BF.radius.md,
      fontFamily: BF.fontSans, fontSize: 15, fontWeight: 600,
    }}>
      <I name={v.icon} size={20} />
      {v.label}
    </div>
  );
}

function CorrectionFlow() {
  const [state, setState] = React.useState('idle'); // idle | correcting | sent
  if (state === 'sent') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: BF.fontSans, fontSize: 13, color: BF.patina700 }}>
        <I name="check-circle-2" size={16} /> Thanks — we'll review.
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: BF.fontSans, fontSize: 13, color: BF.ink600 }}>How'd we do?</span>
      <Button size="sm" variant="secondary" icon="check-circle-2" onClick={() => setState('sent')}>Looks right</Button>
      <Button size="sm" variant="ghost" onClick={() => setState('sent')}>Make corrections</Button>
    </div>
  );
}

Object.assign(window, {
  CompPriceRange, ScanResultHeader, ResultSection, ListingTile,
  NextPhotoHint, VerdictBanner, CorrectionFlow,
});
