/**
 * Benchfind — Screens (compositions of components)
 */

function LandingScreen({ onScan }) {
  return (
    <>
      <NavBar active="home" onNav={() => {}} />
      <Hero onSubmit={onScan} />

      {/* "How it reads" — three explanatory tiles */}
      <section style={{ padding: '40px 32px', background: BF.paper50 }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <span style={{ fontFamily: BF.fontSans, fontSize: 11, fontWeight: 600, color: BF.ink500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            What you get back
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 18 }}>
            {[
              { n: '01', t: 'What is this?', d: 'Maker, model, era, type-study notes. With sources.' },
              { n: '02', t: 'What\u2019s it worth?', d: 'A 90-day comp band from indexed listings. With the n.' },
              { n: '03', t: 'Is this fair?', d: 'A single-line verdict. Not a vibe — a number against a band.' },
            ].map(x => (
              <div key={x.n} style={{
                background: '#FFFFFF', borderRadius: BF.radius.lg, padding: '20px 22px',
                boxShadow: `inset 0 0 0 1px ${BF.rule}`,
              }}>
                <span style={{ fontFamily: BF.fontMono, fontSize: 12, color: BF.spruce700 }}>{x.n}</span>
                <h3 style={{ margin: '8px 0 6px', fontFamily: BF.fontDisplay, fontSize: 22, fontWeight: 500, color: BF.ink900, letterSpacing: '-0.01em' }}>{x.t}</h3>
                <p style={{ margin: 0, fontFamily: BF.fontSans, fontSize: 14, color: BF.ink600, lineHeight: 1.5 }}>{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent identifications strip */}
      <section style={{ padding: '24px 32px 40px', background: BF.paper50 }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <span style={{ fontFamily: BF.fontSans, fontSize: 11, fontWeight: 600, color: BF.ink500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Lately on Benchfind
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 14 }}>
            {[
              { m: 'Stanley', n: 'No. 4', t: 'Type 11', c: 'high', cond: 'good' },
              { m: 'Stanley', n: 'No. 5', t: 'Type 13', c: 'high', cond: 'excellent' },
              { m: 'Lie-Nielsen', n: 'No. 60½', t: '', c: 'high', cond: 'excellent' },
              { m: 'Stanley', n: 'No. 7', t: 'Type 9', c: 'medium', cond: 'fair' },
            ].map((x, i) => (
              <div key={i} style={{ background: '#FFFFFF', borderRadius: BF.radius.md, padding: 12, boxShadow: `inset 0 0 0 1px ${BF.paper200}` }}>
                <ToolPhoto ratio="4 / 3" style={{ width: '100%' }} />
                <div style={{ marginTop: 10, fontFamily: BF.fontSans, fontSize: 13, fontWeight: 600, color: BF.ink900 }}>{x.m} {x.n}</div>
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {x.t && <TypeBadge>{x.t}</TypeBadge>}
                  <ConditionBadge level={x.cond} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

function ScanResultScreen({ confidence = 'high', onBack }) {
  const isHigh = confidence === 'high';
  return (
    <>
      <NavBar active="home" onNav={onBack} />
      <main style={{ padding: '24px 32px 0', background: BF.paper50, minHeight: 600 }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          {/* breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: BF.fontSans, fontSize: 12, color: BF.ink500, marginBottom: 14 }}>
            <a href="#" onClick={(e) => { e.preventDefault(); onBack && onBack(); }} style={{ color: BF.ink600, textDecoration: 'none' }}>← Back</a>
            <span>·</span>
            <span style={{ fontFamily: BF.fontMono }}>Scanned just now</span>
          </div>

          <div style={{
            background: '#FFFFFF', borderRadius: BF.radius.xl,
            boxShadow: BF.shadowMd, overflow: 'hidden',
          }}>
            <ScanResultHeader
              maker="Stanley"
              model={isHigh ? 'No. 5' : 'No. 5'}
              type={isHigh ? 'Type 11' : 'Type 11?'}
              era={isHigh ? '1910–1918' : '1907–1918'}
              category="Bench Plane"
              condition={isHigh ? 'good' : 'fair'}
              confidence={confidence}
              photoLabel={isHigh ? 'IMG_4821' : 'IMG_3017'}
              photoVariant={isHigh ? 'amateur' : 'dim'}
            />

            <ResultSection title="Verdict">
              <VerdictBanner verdict={isHigh ? 'fair' : 'unknown'} />
              <p style={{ margin: '14px 0 0', fontFamily: BF.fontSans, fontSize: 15, color: BF.ink700, lineHeight: 1.6 }}>
                {isHigh
                  ? "Looks like a Type 11 No. 5 in good shape. Lateral lever is correct for the era; tote and knob look original. Frog appears stock. Comps over the last 90 days sit in a fair band for what this is."
                  : "Body type checks out as a No. 5, but we can't pin the type without seeing the frog. The lateral lever could be Type 9–13. A second photo will sort it."}
              </p>
            </ResultSection>

            {!isHigh && (
              <ResultSection title="To get to High">
                <NextPhotoHint area="frog area" onUpload={() => {}} />
              </ResultSection>
            )}

            <ResultSection title="What it should cost"
              action={<a href="#" style={{ fontFamily: BF.fontSans, fontSize: 12, color: BF.spruce700, textDecoration: 'none' }}>View 18 comps →</a>}>
              <CompPriceRange low={85} high={140} listingPrice={isHigh ? 110 : null} count={18} days={90} />
            </ResultSection>

            <ResultSection title="Currently for sale"
              action={<a href="#" style={{ fontFamily: BF.fontSans, fontSize: 12, color: BF.spruce700, textDecoration: 'none' }}>See all →</a>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ListingTile source="eBay" title="Stanley No. 5 jack plane, Type 11" price={108} condition="Good" location="OH" days={2} />
                <ListingTile source="eBay" title="Vintage Stanley Bailey No. 5" price={125} condition="Very Good" location="PA" days={5} />
                <ListingTile source="Facebook" title="Stanley #5 plane, sweetheart era" price={95} condition="Good" location="MI" days={1} />
              </div>
            </ResultSection>

            <ResultSection title="Reference"
              action={<a href="#" style={{ fontFamily: BF.fontSans, fontSize: 12, color: BF.spruce700, textDecoration: 'none' }}>Full type study →</a>}>
              <a href="#" style={{
                display: 'grid', gridTemplateColumns: '64px 1fr', gap: 14, alignItems: 'center',
                textDecoration: 'none', padding: '10px 0',
              }}>
                <ToolPhoto ratio="1 / 1" style={{ width: 64 }} />
                <div>
                  <div style={{ fontFamily: BF.fontDisplay, fontSize: 18, fontWeight: 500, color: BF.ink900, letterSpacing: '-0.01em' }}>
                    Stanley No. 5 · Type 11
                  </div>
                  <div style={{ fontFamily: BF.fontSans, fontSize: 12, color: BF.ink500, marginTop: 2 }}>
                    /planes/stanley/no-5/type-11 — full type-study features &amp; era detail
                  </div>
                </div>
              </a>
            </ResultSection>

            <div style={{ padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: BF.paper50 }}>
              <CorrectionFlow />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" variant="secondary" icon="bookmark">Save</Button>
                <Button size="sm" icon="camera" onClick={onBack}>Scan another</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function ReferenceScreen({ onBack }) {
  return (
    <>
      <NavBar active="reference" onNav={onBack} />
      <main style={{ padding: '32px 32px 0', background: BF.paper50 }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <div style={{ fontFamily: BF.fontSans, fontSize: 12, color: BF.ink500, marginBottom: 12 }}>
            <a href="#" onClick={(e) => { e.preventDefault(); onBack && onBack(); }} style={{ color: BF.ink600, textDecoration: 'none' }}>Planes</a>
            <span style={{ margin: '0 8px' }}>›</span>
            <a href="#" style={{ color: BF.ink600, textDecoration: 'none' }}>Stanley</a>
            <span style={{ margin: '0 8px' }}>›</span>
            <span style={{ color: BF.ink800 }}>No. 5 · Type 11</span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <CategoryBadge>Bench Plane · Jack</CategoryBadge>
            <span style={{ fontFamily: BF.fontMono, fontSize: 12, color: BF.ink500 }}>1910–1918</span>
          </div>
          <h1 style={{ margin: 0, fontFamily: BF.fontDisplay, fontWeight: 500, fontSize: 48, letterSpacing: '-0.02em', color: BF.ink900, lineHeight: 1.05 }}>
            Stanley No. 5 · Type 11
          </h1>
          <p style={{ margin: '16px 0 0', fontFamily: BF.fontDisplay, fontSize: 21, fontStyle: 'italic', color: BF.ink600, lineHeight: 1.45, maxWidth: 620 }}>
            The Type 11 is the one most people are reaching for when they say "vintage Stanley." Frog receiver casting changed, three patent dates on the bed.
          </p>

          {/* Annotated plane diagram — signature reference asset */}
          <figure style={{ margin: '32px 0 0', background: '#FFFFFF', borderRadius: BF.radius.lg, padding: '20px 24px', boxShadow: `inset 0 0 0 1px ${BF.rule}` }}>
            <figcaption style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontFamily: BF.fontSans, fontSize: 11, fontWeight: 600, color: BF.ink500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fig. 1 · Type-defining features</span>
              <span style={{ fontFamily: BF.fontMono, fontSize: 11, color: BF.ink500 }}>side profile · 14"</span>
            </figcaption>
            <img src="../../assets/diagram-plane-annotated.svg" alt="Stanley No. 5 Type 11 annotated diagram" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </figure>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 32, marginTop: 32 }}>
            <article style={{ fontFamily: BF.fontSans, fontSize: 16, lineHeight: 1.7, color: BF.ink700 }}>
              <h2 style={{ fontFamily: BF.fontDisplay, fontSize: 26, fontWeight: 500, color: BF.ink900, letterSpacing: '-0.01em', margin: '24px 0 12px' }}>How to identify</h2>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                <li><strong style={{ color: BF.ink900 }}>Patent dates</strong> — three lines cast into the bed: <span style={{ fontFamily: BF.fontMono }}>"MAR-25-02"</span>, <span style={{ fontFamily: BF.fontMono }}>"AUG-19-02"</span>, <span style={{ fontFamily: BF.fontMono }}>"APR-19-10"</span>.</li>
                <li><strong style={{ color: BF.ink900 }}>Frog receiver</strong> — solid casting with a small forward arc, no rib through the middle.</li>
                <li><strong style={{ color: BF.ink900 }}>Lateral adjustment lever</strong> — single-piece, twisted, "STANLEY" stamped on the disc.</li>
                <li><strong style={{ color: BF.ink900 }}>Tote &amp; knob</strong> — low knob, rosewood (sometimes painted).</li>
              </ul>

              <h2 style={{ fontFamily: BF.fontDisplay, fontSize: 26, fontWeight: 500, color: BF.ink900, letterSpacing: '-0.01em', margin: '28px 0 12px' }}>Common misidentifications</h2>
              <p style={{ margin: '0 0 12px' }}>The Type 11 is easily confused with Types 9–13 if you can't see the frog. The forward-arc receiver is the cleanest tell once you've seen it twice.</p>
            </article>

            <aside style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ background: '#FFFFFF', borderRadius: BF.radius.lg, padding: 18, boxShadow: `inset 0 0 0 1px ${BF.rule}` }}>
                <span style={{ fontFamily: BF.fontSans, fontSize: 11, fontWeight: 600, color: BF.ink500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>At a glance</span>
                <dl style={{ margin: '12px 0 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px', fontFamily: BF.fontSans, fontSize: 12 }}>
                  <dt style={{ color: BF.ink500 }}>Era</dt><dd style={{ margin: 0, fontFamily: BF.fontMono, color: BF.ink900 }}>1910–1918</dd>
                  <dt style={{ color: BF.ink500 }}>Length</dt><dd style={{ margin: 0, fontFamily: BF.fontMono, color: BF.ink900 }}>14"</dd>
                  <dt style={{ color: BF.ink500 }}>Iron</dt><dd style={{ margin: 0, fontFamily: BF.fontMono, color: BF.ink900 }}>2"</dd>
                  <dt style={{ color: BF.ink500 }}>Comp band</dt><dd style={{ margin: 0, fontFamily: BF.fontMono, color: BF.ink900 }}>$85–$140</dd>
                </dl>
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: BF.radius.lg, padding: 18, boxShadow: `inset 0 0 0 1px ${BF.rule}` }}>
                <span style={{ fontFamily: BF.fontSans, fontSize: 11, fontWeight: 600, color: BF.ink500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>For sale now · 14</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  <ListingTile source="eBay" title="Type 11 No. 5" price={108} condition="Good" location="OH" days={2} />
                  <ListingTile source="eBay" title="Stanley jack #5" price={125} condition="VG" location="PA" days={5} />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function CategoryGateScreen() {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const cats = [
    { id: 'plane', label: 'Bench planes', active: true },
    { id: 'block', label: 'Block planes', active: true },
    { id: 'chisel', label: 'Chisels', soon: true },
    { id: 'saw', label: 'Saws', soon: true },
    { id: 'spoke', label: 'Spokeshaves', queued: true },
    { id: 'router', label: 'Routers, scrapers, etc.', queued: true },
  ];
  return (
    <>
      <NavBar onNav={() => {}} />
      <main style={{ padding: '64px 32px', background: BF.paper50 }}>
        <div style={{ maxWidth: 580, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontFamily: BF.fontSans, fontSize: 11, fontWeight: 600, color: BF.spruce700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Not yet — but soon</span>
          <h1 style={{ margin: '14px 0 0', fontFamily: BF.fontDisplay, fontWeight: 500, fontSize: 44, letterSpacing: '-0.02em', color: BF.ink900, lineHeight: 1.1 }}>
            Benchfind is plane-first today.
          </h1>
          <p style={{ margin: '18px 0 0', fontFamily: BF.fontSans, fontSize: 16, color: BF.ink600, lineHeight: 1.6 }}>
            We're working through type studies category by category. Drop your email and we'll write once when chisels or saws are ready.
          </p>
          <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, textAlign: 'left' }}>
            {cats.map(c => (
              <div key={c.id} style={{
                padding: '12px 14px', borderRadius: BF.radius.md,
                boxShadow: `inset 0 0 0 1px ${BF.paper200}`,
                background: c.active ? BF.confHighBg : (c.soon ? BF.spruce100 : '#FFFFFF'),
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontFamily: BF.fontSans, fontSize: 14, color: BF.ink900 }}>{c.label}</span>
                <span style={{ fontFamily: BF.fontMono, fontSize: 11,
                  color: c.active ? BF.confHigh : (c.soon ? BF.spruce700 : BF.ink500),
                }}>
                  {c.active ? 'live' : c.soon ? 'next' : 'queued'}
                </span>
              </div>
            ))}
          </div>
          {sent ? (
            <div style={{ marginTop: 28, fontFamily: BF.fontSans, fontSize: 14, color: BF.patina700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <I name="check-circle-2" size={18} /> We'll write you. One email, no marketing.
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} style={{ marginTop: 28, display: 'flex', gap: 8, maxWidth: 380, margin: '28px auto 0' }}>
              <TextInput value={email} onChange={setEmail} placeholder="you@email.com" icon="info" style={{ flex: 1 }} />
              <Button type="submit">Notify me</Button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

Object.assign(window, { LandingScreen, ScanResultScreen, ReferenceScreen, CategoryGateScreen });
