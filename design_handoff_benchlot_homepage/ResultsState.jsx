// ResultsState.jsx — query entered, results grid with filter rail

function ActiveFilterChip({label, onRemove}) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'4px 6px 4px 10px', borderRadius:4,
      background:'var(--bone-light)', border:'1px solid var(--border)',
      font:'500 12px var(--font-body)', color:'var(--dark-teal)', letterSpacing:'0.01em',
    }}>
      {label}
      <button onClick={onRemove} style={{
        width:16, height:16, borderRadius:3, border:0, background:'transparent',
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'var(--fg-secondary)', cursor:'pointer',
      }}><window.LucideX size={10}/></button>
    </span>
  );
}

function BreadcrumbBar({query, activeFilters, onRemoveFilter, resultCount, onSaveAlert, alertSaved}) {
  return (
    <div style={{
      background:'var(--bone)',
      borderBottom:'1px solid var(--border)',
    }}>
      <div style={{maxWidth:1280, margin:'0 auto', padding:'16px 40px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap'}}>
        <div style={{display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap', flex:1, minWidth:0}}>
          <div style={{font:'700 22px var(--font-display)', color:'var(--dark-teal)', letterSpacing:'-0.6px'}}>
            {query || 'All listings'}
          </div>
          <div style={{font:'400 13px var(--font-body)', color:'var(--fg-secondary)'}}>
            <b style={{color:'var(--dark-teal)', fontWeight:600}}>{resultCount}</b> results
          </div>
          {activeFilters.length > 0 && (
            <>
              <span style={{color:'var(--fg-muted)', margin:'0 2px'}}>·</span>
              <div style={{display:'inline-flex', gap:6, flexWrap:'wrap'}}>
                {activeFilters.map(f => (
                  <ActiveFilterChip key={f.key} label={f.label} onRemove={()=>onRemoveFilter(f.group, f.key)}/>
                ))}
              </div>
            </>
          )}
        </div>

        <button onClick={onSaveAlert} style={{
          display:'inline-flex', alignItems:'center', gap:8,
          padding:'10px 18px',
          background: alertSaved ? 'var(--success-bg)' : 'var(--honey)',
          color: alertSaved ? 'var(--success)' : 'var(--dark-teal)',
          border: alertSaved ? '1px solid var(--success)' : '1px solid var(--honey-dark)',
          borderRadius:6,
          font:'600 13px var(--font-body)', letterSpacing:'0.02em',
          cursor:'pointer', flexShrink:0,
          transition:'all .15s',
          boxShadow: alertSaved ? 'none' : '0 1px 2px rgba(12,28,30,0.08)',
        }}>
          {alertSaved ? (
            <><window.LucideCheck size={14}/> Alert saved</>
          ) : (
            <><window.LucideBell size={14}/> Save this search as an alert <window.LucideArrowRight size={14}/></>
          )}
        </button>
      </div>
    </div>
  );
}

function ResultsGrid({listings, onSaveAlert}) {
  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))',
      gap:20,
    }}>
      {listings.map(l => (
        <window.ResultCard key={l.id} listing={l} onSaveAlert={onSaveAlert}/>
      ))}
    </div>
  );
}

function ResultsStats({listings}) {
  // Show source distribution bar — reinforces aggregator
  const counts = {};
  listings.forEach(l => { const k = window.SRC[l.source]?.kind || 'Other'; counts[k] = (counts[k]||0) + 1; });
  const total = listings.length;
  const order = ['Dealer','Forum','Reddit','Marketplace','Auction'];
  const colors = {Dealer:'#d4aa60', Forum:'#2a6a4a', Reddit:'#a83a2a', Marketplace:'#2a5a6a', Auction:'#6a4a2a'};

  return (
    <div style={{
      padding:'14px 18px', marginBottom:20,
      background:'var(--bone-light)', border:'1px solid var(--border)', borderRadius:10,
      display:'flex', alignItems:'center', gap:20, flexWrap:'wrap',
    }}>
      <div style={{font:'700 10px var(--font-body)', color:'var(--fg-muted)', letterSpacing:'0.2em', textTransform:'uppercase'}}>
        Across {order.filter(k=>counts[k]).length} source types
      </div>
      <div style={{flex:1, minWidth:200, display:'flex', height:8, borderRadius:4, overflow:'hidden', background:'var(--bone-dark)'}}>
        {order.filter(k=>counts[k]).map(k => (
          <div key={k} style={{flex: counts[k], background: colors[k]}} title={`${k}: ${counts[k]}`}/>
        ))}
      </div>
      <div style={{display:'flex', gap:14, flexWrap:'wrap', font:'500 11px var(--font-body)', color:'var(--fg-secondary)', letterSpacing:'0.02em'}}>
        {order.filter(k=>counts[k]).map(k => (
          <span key={k} style={{display:'inline-flex', alignItems:'center', gap:5}}>
            <span style={{width:8, height:8, borderRadius:2, background:colors[k]}}/>
            {k} <b style={{color:'var(--dark-teal)', fontWeight:600}}>{counts[k]}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Footer — aggregator version, 3 columns
// ═════════════════════════════════════════════════════════════════════════
function AggregatorFooter() {
  const sourcesByKind = {
    Dealers: ['Jim Bode Tools','Patrick Leach','Hyperkitten','Josh Clark Tools','The Best Things','Tools for Working Wood'],
    'Forums & Community': ['Sawmill Creek Classifieds','Lumberjocks For Sale','r/handtools','r/woodworking','WoodCentral'],
    'Marketplaces & Auctions': ['eBay (curated searches)','Skinner Auctions','Bonhams','Brown Auctions','Martin J. Donnelly'],
  };

  return (
    <footer style={{background:'var(--dark-teal)', color:'var(--bone)', padding:'72px 40px 32px'}}>
      <div style={{maxWidth:1280, margin:'0 auto'}}>

        {/* Top row — wordmark + tagline */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', paddingBottom:48, borderBottom:'1px solid rgba(242,240,235,0.1)', flexWrap:'wrap', gap:24}}>
          <div>
            <div style={{font:'900 40px var(--font-display)', letterSpacing:'-2px', color:'var(--bone)', marginBottom:10}}>Benchlot</div>
            <div style={{font:'500 italic 18px var(--font-display)', fontStyle:'italic', color:'var(--honey)', letterSpacing:'-0.2px'}}>
              The search engine for premium used hand tools.
            </div>
          </div>
          <div style={{font:'400 13px var(--font-body)', color:'rgba(242,240,235,0.65)', textAlign:'right'}}>
            <div>Updated hourly · 4,892 listings live</div>
            <div style={{marginTop:4}}>Made with care in Boston.</div>
          </div>
        </div>

        {/* Three columns */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'1.6fr 1fr 1.4fr',
          gap:56,
          padding:'56px 0 48px',
          borderBottom:'1px solid rgba(242,240,235,0.1)',
        }}>

          {/* Column 1 — Sources */}
          <div>
            <div style={{font:'700 10px var(--font-body)', color:'var(--honey)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:20}}>
              Sources we index
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 24px'}}>
              {Object.entries(sourcesByKind).flatMap(([_,list]) => list).map(name => (
                <a key={name} style={{font:'400 13px var(--font-body)', color:'rgba(242,240,235,0.75)', cursor:'pointer', letterSpacing:'0.01em', textDecoration:'none'}}>
                  {name}
                </a>
              ))}
            </div>
            <div style={{marginTop:18, font:'400 12px var(--font-body)', color:'rgba(242,240,235,0.5)', letterSpacing:'0.01em', fontStyle:'italic', maxWidth:420}}>
              Benchlot does not broker transactions. Every listing links back to its original source.
            </div>
          </div>

          {/* Column 2 — Product links */}
          <div>
            <div style={{font:'700 10px var(--font-body)', color:'var(--honey)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:20}}>
              Benchlot
            </div>
            <ul style={{margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:10}}>
              {['About','ToolScan','FAQ','Important Notes','Contact','Field Notes'].map(l => (
                <li key={l}><a style={{font:'400 13px var(--font-body)', color:'rgba(242,240,235,0.75)', cursor:'pointer', letterSpacing:'0.01em', textDecoration:'none'}}>{l}</a></li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Weekly digest */}
          <div>
            <div style={{font:'700 10px var(--font-body)', color:'var(--honey)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:20}}>
              The Weekly Digest
            </div>
            <div style={{font:'700 20px/1.25 var(--font-display)', color:'var(--bone)', marginBottom:10, letterSpacing:'-0.3px'}}>
              The week&rsquo;s best new listings, in one email.
            </div>
            <div style={{font:'400 13px/1.55 var(--font-body)', color:'rgba(242,240,235,0.65)', marginBottom:18, letterSpacing:'0.01em'}}>
              Hand-picked from every source we index. Sent Sunday mornings. Unsubscribe anytime.
            </div>
            <form onSubmit={e=>e.preventDefault()} style={{display:'flex', gap:0, borderRadius:8, overflow:'hidden', border:'1px solid rgba(242,240,235,0.2)'}}>
              <input placeholder="you@shop.com" style={{
                flex:1, padding:'11px 14px', background:'rgba(242,240,235,0.06)',
                border:0, outline:0, color:'var(--bone)',
                font:'500 13px var(--font-body)', letterSpacing:'0.01em',
              }}/>
              <button type="submit" style={{
                padding:'0 18px', background:'var(--honey)', color:'var(--dark-teal)',
                border:0, cursor:'pointer', font:'600 13px var(--font-body)', letterSpacing:'0.02em',
              }}>
                Subscribe
              </button>
            </form>
            <div style={{marginTop:12, font:'400 11px var(--font-body)', color:'rgba(242,240,235,0.4)', letterSpacing:'0.01em'}}>
              12,400 woodworkers already subscribed.
            </div>
          </div>
        </div>

        {/* Colophon */}
        <div style={{display:'flex', justifyContent:'space-between', paddingTop:24, font:'400 12px var(--font-body)', color:'rgba(242,240,235,0.5)', letterSpacing:'0.02em', flexWrap:'wrap', gap:12}}>
          <div>© 2026 Benchlot, Inc. · An aggregator of public listings.</div>
          <div style={{display:'flex', gap:24}}>
            <a style={{cursor:'pointer', color:'inherit', textDecoration:'none'}}>Privacy</a>
            <a style={{cursor:'pointer', color:'inherit', textDecoration:'none'}}>Terms</a>
            <a style={{cursor:'pointer', color:'inherit', textDecoration:'none'}}>DMCA</a>
            <a style={{cursor:'pointer', color:'inherit', textDecoration:'none'}}>Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, {BreadcrumbBar, ResultsGrid, ResultsStats, AggregatorFooter, ActiveFilterChip});
