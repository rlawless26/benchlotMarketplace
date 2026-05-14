/**
 * Benchfind — Landing (Hero + DropZone)
 */

function DropZone({ onSubmit, dense = false }) {
  const [url, setUrl] = React.useState('');
  const [dragging, setDragging] = React.useState(false);
  const fileRef = React.useRef(null);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); onSubmit && onSubmit({ type: 'file' }); }}
      style={{
        background: dragging ? BF.spruce50 : '#FFFFFF',
        border: dragging ? `1.5px solid ${BF.spruce700}` : `1.5px dashed ${BF.ruleStrong}`,
        borderRadius: BF.radius.xl,
        padding: dense ? '24px 22px' : '40px 36px',
        boxShadow: dragging ? BF.shadowMd : BF.shadowSm,
        transition: 'all 180ms cubic-bezier(0.2,0,0.2,1)',
      }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: BF.radius.lg,
          background: BF.ink900, color: BF.paper50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: BF.fontDisplay, fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em',
          boxShadow: `inset 0 0 0 2px ${BF.spruce700}`,
        }}>B</div>
        <h2 style={{
          margin: 0, fontFamily: BF.fontDisplay, fontWeight: 500,
          fontSize: dense ? 26 : 34, letterSpacing: '-0.02em', color: BF.ink900,
          textAlign: 'center', lineHeight: 1.15,
        }}>
          Snap a photo or paste a URL.
        </h2>
        <p style={{ margin: 0, fontFamily: BF.fontSans, fontSize: 14, color: BF.ink600, textAlign: 'center', maxWidth: 420 }}>
          Get identification, condition, comps, and a verdict. Usually in 8 seconds.
        </p>

        <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button icon="camera" size="lg" onClick={() => onSubmit && onSubmit({ type: 'camera' })}>Use camera</Button>
          <Button icon="upload" variant="secondary" size="lg" onClick={() => fileRef.current && fileRef.current.click()}>Upload photo</Button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={() => onSubmit && onSubmit({ type: 'file' })} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 460, marginTop: 6 }}>
          <div style={{ flex: 1, height: 1, background: BF.paper200 }} />
          <span style={{ fontFamily: BF.fontSans, fontSize: 11, color: BF.ink500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>or paste a URL</span>
          <div style={{ flex: 1, height: 1, background: BF.paper200 }} />
        </div>

        <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 460 }}>
          <TextInput value={url} onChange={setUrl} icon="link" placeholder="ebay.com/itm/..." style={{ flex: 1 }} />
          <Button onClick={() => onSubmit && onSubmit({ type: 'url', url })}>Check it</Button>
        </div>

        <span style={{ fontFamily: BF.fontSans, fontSize: 11, color: BF.ink500, marginTop: 4 }}>
          Works with eBay, Craigslist, Facebook Marketplace, Etsy
        </span>
      </div>
    </div>
  );
}

function Hero({ onSubmit }) {
  return (
    <section style={{ padding: '72px 32px 32px', background: BF.paper50 }}>
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
        <div>
          <span style={{
            fontFamily: BF.fontSans, fontSize: 11, fontWeight: 600,
            color: BF.spruce700, textTransform: 'uppercase', letterSpacing: '0.08em',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 6, height: 6, background: BF.spruce700, borderRadius: 50 }} />
            Plane-first today
          </span>
          <h1 style={{
            margin: '14px 0 0', fontFamily: BF.fontDisplay, fontWeight: 500,
            fontSize: 64, lineHeight: 1.0, letterSpacing: '-0.025em', color: BF.ink900,
          }}>
            Check it before<br/>you <em style={{ color: BF.spruce700, fontStyle: 'italic' }}>buy</em>.
          </h1>
          <p style={{
            margin: '20px 0 0', fontFamily: BF.fontSans, fontSize: 17,
            lineHeight: 1.6, color: BF.ink600, maxWidth: 440,
          }}>
            Identification, condition, comp prices, and a fair-price verdict for used hand planes. Phone-ready in dim shops and flea markets.
          </p>
          <div style={{ display: 'flex', gap: 18, marginTop: 28, fontFamily: BF.fontSans, fontSize: 12, color: BF.ink500 }}>
            <span><strong style={{ color: BF.ink800, fontFamily: BF.fontMono }}>1,840</strong> Stanley type studies indexed</span>
            <span><strong style={{ color: BF.ink800, fontFamily: BF.fontMono }}>90 days</strong> rolling comp window</span>
          </div>
        </div>
        <DropZone onSubmit={onSubmit} />
      </div>
    </section>
  );
}

Object.assign(window, { DropZone, Hero });
