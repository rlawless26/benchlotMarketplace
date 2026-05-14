/**
 * Benchfind — Chrome (Nav + Footer)
 */

function NavBar({ active = 'home', onNav, dense = false }) {
  const links = [
    { id: 'home', label: 'Check a tool' },
    { id: 'planes', label: 'Planes' },
    { id: 'reference', label: 'Reference' },
  ];
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: dense ? '12px 24px' : '18px 32px',
      borderBottom: `1px solid ${BF.paper200}`,
      background: BF.paper50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); onNav && onNav('home'); }} style={{ display: 'inline-flex', textDecoration: 'none' }}>
          <Wordmark size={dense ? 22 : 24} />
        </a>
        <nav style={{ display: 'flex', gap: 24 }}>
          {links.map(l => (
            <a key={l.id} href="#"
              onClick={(e) => { e.preventDefault(); onNav && onNav(l.id); }}
              style={{
                fontFamily: BF.fontSans, fontSize: 13, textDecoration: 'none',
                color: active === l.id ? BF.ink900 : BF.ink600,
                fontWeight: active === l.id ? 600 : 400,
              }}>
              {l.label}
            </a>
          ))}
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <a href="#" style={{ fontFamily: BF.fontSans, fontSize: 13, color: BF.ink600, textDecoration: 'none' }}>Sign in</a>
        <Button size="sm" icon="camera" onClick={() => onNav && onNav('home')}>Scan a tool</Button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer style={{
      borderTop: `1px solid ${BF.paper200}`,
      padding: '36px 32px 48px',
      background: BF.paper50,
      marginTop: 64,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
        <div style={{ maxWidth: 320 }}>
          <Wordmark size={22} />
          <p style={{ fontFamily: BF.fontSans, fontSize: 13, color: BF.ink600, marginTop: 12, lineHeight: 1.55 }}>
            Confidence for used hand tools. Plane-first today. Chisels &amp; saws next.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 48 }}>
          <FooterCol title="Product" links={['How it works', 'Methodology', 'Sources', 'Pricing']} />
          <FooterCol title="Reference" links={['Stanley type studies', 'Bench planes', 'Block planes', 'All planes']} />
          <FooterCol title="About" links={['Voice & values', 'Press', 'Contact', 'Privacy']} />
        </div>
      </div>
      <div style={{
        marginTop: 36, paddingTop: 18, borderTop: `1px solid ${BF.paper200}`,
        display: 'flex', justifyContent: 'space-between',
        fontFamily: BF.fontSans, fontSize: 11, color: BF.ink500, letterSpacing: '0.02em',
      }}>
        <span>© 2026 Benchfind. Independent — not affiliated with Stanley, Lie-Nielsen, or Veritas.</span>
        <span>benchfind.com</span>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontFamily: BF.fontSans, fontSize: 11, fontWeight: 600, color: BF.ink500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
      {links.map(l => (
        <a key={l} href="#" style={{ fontFamily: BF.fontSans, fontSize: 13, color: BF.ink700, textDecoration: 'none' }}>{l}</a>
      ))}
    </div>
  );
}

Object.assign(window, { NavBar, Footer });
