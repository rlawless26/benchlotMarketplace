// Homepage.jsx — Benchlot aggregator homepage

// ═════════════════════════════════════════════════════════════════════════
// Header — minimal, aggregator-first
// ═════════════════════════════════════════════════════════════════════════
function TopNav({compact, query, onQueryChange, onClearQuery, onOpenFilters, filterCount, sort, onSortChange}) {
  if (!compact) {
    // Editorial header for empty state
    return (
      <header style={{
        padding:'22px 0',
        borderBottom:'1px solid var(--border-light)',
        background:'var(--bone)',
      }}>
        <div style={{maxWidth:1280, margin:'0 auto', padding:'0 40px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <a style={{
            fontFamily:'var(--font-display)', fontWeight:900, fontSize:24,
            color:'var(--spruce)', letterSpacing:'-1.2px', cursor:'pointer', textDecoration:'none',
          }}>Benchlot</a>
          <nav style={{display:'flex', alignItems:'center', gap:28, font:'500 13px var(--font-body)', letterSpacing:'0.02em'}}>
            <a style={navLink}>ToolScan</a>
            <a style={navLink}>About</a>
            <a style={navLink}>FAQ</a>
            <span style={{width:1, height:16, background:'var(--border)'}}/>
            <a style={{...navLink, color:'var(--spruce)'}}>Sign in</a>
          </nav>
        </div>
      </header>
    );
  }

  // Sticky compact bar for results state
  return (
    <header style={{
      position:'sticky', top:0, zIndex:50,
      background:'rgba(242,240,235,0.92)',
      backdropFilter:'blur(10px)',
      WebkitBackdropFilter:'blur(10px)',
      borderBottom:'1px solid var(--border)',
    }}>
      <div style={{maxWidth:1280, margin:'0 auto', padding:'12px 40px', display:'flex', alignItems:'center', gap:20}}>
        <a style={{
          fontFamily:'var(--font-display)', fontWeight:900, fontSize:20,
          color:'var(--spruce)', letterSpacing:'-1px', cursor:'pointer', flexShrink:0,
        }}>Benchlot</a>

        <form onSubmit={e=>e.preventDefault()} style={{flex:1, position:'relative', maxWidth:640}}>
          <window.LucideSearch size={16} style={{position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--fg-secondary)'}}/>
          <input
            value={query} onChange={e=>onQueryChange(e.target.value)}
            placeholder="Search 4,892 listings across every source…"
            style={{
              width:'100%', padding:'10px 40px 10px 40px',
              background:'var(--bone-light)',
              border:'1px solid var(--border)', borderRadius:8,
              font:'500 14px var(--font-body)', color:'var(--dark-teal)',
              outline:'none', letterSpacing:'0.01em',
            }}/>
          {query && (
            <button onClick={onClearQuery} style={{
              position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
              width:26, height:26, borderRadius:6, border:0, background:'transparent',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--fg-secondary)', cursor:'pointer',
            }}><window.LucideX size={14}/></button>
          )}
        </form>

        <div style={{display:'flex', alignItems:'center', gap:10, flexShrink:0}}>
          <button onClick={onOpenFilters} style={compactBtn}>
            <window.LucideSliders size={14}/> Filters
            {filterCount > 0 && <span style={{
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              minWidth:18, height:18, padding:'0 5px', borderRadius:999,
              background:'var(--honey)', color:'var(--dark-teal)', font:'700 10px var(--font-body)',
            }}>{filterCount}</span>}
          </button>
          <div style={{position:'relative'}}>
            <select value={sort} onChange={e=>onSortChange(e.target.value)} style={{
              appearance:'none', WebkitAppearance:'none',
              padding:'7px 32px 7px 12px',
              background:'var(--bone-light)', border:'1px solid var(--border)', borderRadius:6,
              font:'500 12px var(--font-body)', color:'var(--dark-teal)', letterSpacing:'0.02em',
              cursor:'pointer', outline:'none',
            }}>
              <option>Newest first</option>
              <option>Price: low to high</option>
              <option>Price: high to low</option>
              <option>Relevance</option>
            </select>
            <window.LucideChevronDown size={12} style={{position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:'var(--fg-secondary)'}}/>
          </div>
          <span style={{width:1, height:22, background:'var(--border)'}}/>
          <a style={{...navLink, color:'var(--spruce)'}}>Sign in</a>
        </div>
      </div>
    </header>
  );
}

const navLink = {color:'var(--fg-secondary)', cursor:'pointer', textDecoration:'none', transition:'color .15s'};
const compactBtn = {
  display:'inline-flex', alignItems:'center', gap:6,
  padding:'7px 12px', background:'var(--bone-light)', border:'1px solid var(--border)',
  borderRadius:6, font:'500 12px var(--font-body)', color:'var(--dark-teal)',
  cursor:'pointer', letterSpacing:'0.02em',
};

// ═════════════════════════════════════════════════════════════════════════
// Empty state — editorial hero
// ═════════════════════════════════════════════════════════════════════════
function EmptyState({onQueryChange}) {
  const [q, setQ] = React.useState('');
  const submit = (e) => {
    e.preventDefault();
    onQueryChange(q || 'Stanley No. 4');
  };

  const suggestions = [
    'Stanley No. 4','Lie-Nielsen 62','Veritas plow','Narex chisels','Disston D-8','Japanese kanna'
  ];

  return (
    <section style={{
      position:'relative',
      padding:'88px 40px 120px',
      background:`linear-gradient(180deg, var(--bone) 0%, var(--bone) 60%, #ece9e1 100%)`,
      overflow:'hidden',
    }}>
      {/* subtle grain — tiny dots */}
      <div style={{
        position:'absolute', inset:0, opacity:0.4, pointerEvents:'none',
        backgroundImage:'radial-gradient(circle at 1px 1px, rgba(26,48,48,0.08) 1px, transparent 0)',
        backgroundSize:'22px 22px',
      }}/>

      <div style={{position:'relative', maxWidth:820, margin:'0 auto', textAlign:'center'}}>
        {/* Live index indicator */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:10,
          padding:'6px 14px', borderRadius:999,
          background:'rgba(26,48,48,0.05)', border:'1px solid rgba(26,48,48,0.1)',
          marginBottom:36,
          font:'500 11px var(--font-body)', color:'var(--spruce)', letterSpacing:'0.08em', textTransform:'uppercase',
        }}>
          <span style={{position:'relative', width:8, height:8}}>
            <span style={{position:'absolute', inset:0, borderRadius:999, background:'#2a6a4a'}}/>
            <span style={{position:'absolute', inset:-3, borderRadius:999, background:'#2a6a4a', opacity:0.25, animation:'bl-pulse 2s infinite'}}/>
          </span>
          Live Index · 4,892 listings · updated 14 min ago
        </div>

        <h1 style={{
          font:'800 68px/1.04 var(--font-display)',
          letterSpacing:'-2px', color:'var(--dark-teal)',
          margin:'0 0 22px',
        }}>
          Every hand tool listing,<br/>
          <span style={{fontStyle:'italic', fontWeight:500, color:'var(--spruce)'}}>in one place.</span>
        </h1>

        <p style={{
          font:'400 19px/1.55 var(--font-body)',
          color:'var(--fg-secondary)', letterSpacing:'0.005em',
          margin:'0 auto 44px', maxWidth:620,
        }}>
          The search engine for premium used hand tools. Updated hourly from dealers,
          forums, auction houses, and marketplaces. We don&rsquo;t sell tools — we help you find them.
        </p>

        {/* Big search */}
        <form onSubmit={submit} style={{position:'relative', maxWidth:640, margin:'0 auto 16px'}}>
          <window.LucideSearch size={20} style={{position:'absolute', left:22, top:'50%', transform:'translateY(-50%)', color:'var(--fg-secondary)'}}/>
          <input
            autoFocus
            value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Try &ldquo;Stanley No. 4 Type 11&rdquo;"
            style={{
              width:'100%', padding:'22px 150px 22px 58px',
              background:'var(--bone-light)',
              border:'1.5px solid var(--spruce)',
              borderRadius:10,
              font:'500 17px var(--font-body)', color:'var(--dark-teal)',
              outline:'none', letterSpacing:'0.005em',
              boxShadow:'0 4px 20px rgba(12,28,30,0.08)',
            }}/>
          <button type="submit" style={{
            position:'absolute', right:8, top:8, bottom:8,
            padding:'0 22px', background:'var(--honey)', color:'var(--dark-teal)',
            border:0, borderRadius:6, cursor:'pointer',
            font:'600 14px var(--font-body)', letterSpacing:'0.02em',
            display:'inline-flex', alignItems:'center', gap:6,
          }}>
            Search <window.LucideArrowRight size={14}/>
          </button>
        </form>

        {/* Quick suggestions */}
        <div style={{display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', marginTop:18}}>
          <span style={{font:'500 11px var(--font-body)', color:'var(--fg-muted)', letterSpacing:'0.12em', textTransform:'uppercase', alignSelf:'center', marginRight:4}}>Popular:</span>
          {suggestions.map(s => (
            <button key={s} onClick={()=>onQueryChange(s)} style={{
              padding:'5px 12px', borderRadius:4,
              background:'transparent', border:'1px solid var(--border)',
              font:'400 12px var(--font-body)', color:'var(--fg-primary)', letterSpacing:'0.01em',
              cursor:'pointer',
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Sources strip — the conversion */}
      <div style={{position:'relative', maxWidth:1100, margin:'88px auto 0'}}>
        <div style={{
          display:'flex', alignItems:'center', gap:12, justifyContent:'center',
          font:'700 10px var(--font-body)', color:'var(--fg-muted)', letterSpacing:'0.22em', textTransform:'uppercase',
          marginBottom:24,
        }}>
          <span style={{flex:1, height:1, background:'var(--border)', maxWidth:140}}/>
          Indexed from 24 sources, including
          <span style={{flex:1, height:1, background:'var(--border)', maxWidth:140}}/>
        </div>
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(7, 1fr)',
          borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)',
        }}>
          {[
            {name:'Jim Bode Tools', sub:'Dealer · Katonah NY'},
            {name:'Patrick Leach', sub:'Monthly list · Since 1998'},
            {name:'Hyperkitten', sub:'Josh Clark · Dealer'},
            {name:'Sawmill Creek', sub:'Forum classifieds'},
            {name:'Lumberjocks', sub:'Community listings'},
            {name:'r/handtools', sub:'Reddit · 148k members'},
            {name:'eBay', sub:'Curated searches'},
          ].map((s,i) => (
            <div key={s.name} style={{
              padding:'22px 16px', textAlign:'center',
              borderLeft: i===0 ? 0 : '1px solid var(--border)',
              transition:'background .2s',
            }}>
              <div style={{font:'700 14px var(--font-display)', color:'var(--dark-teal)', letterSpacing:'-0.3px', marginBottom:4}}>
                {s.name}
              </div>
              <div style={{font:'400 11px var(--font-body)', color:'var(--fg-muted)', letterSpacing:'0.02em'}}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Empty-state preview grid — "Latest listings"
// ═════════════════════════════════════════════════════════════════════════
function LatestListings({listings, onSaveAlert}) {
  return (
    <section style={{padding:'72px 40px 100px', maxWidth:1280, margin:'0 auto'}}>
      <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:32, paddingBottom:20, borderBottom:'1px solid var(--border)'}}>
        <div>
          <div style={{font:'700 10px var(--font-body)', color:'var(--fg-muted)', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:8}}>
            Fresh from the index
          </div>
          <h2 style={{font:'700 36px var(--font-display)', letterSpacing:'-1.2px', color:'var(--dark-teal)', margin:0}}>
            Latest listings
          </h2>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:16, font:'500 12px var(--font-body)', color:'var(--fg-secondary)'}}>
          <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
            <window.LucideRss size={13} style={{color:'var(--honey)'}}/>
            Live — 18 new in the last hour
          </span>
        </div>
      </div>

      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',
        gap:20,
      }}>
        {listings.slice(0,6).map(l => (
          <window.ResultCard key={l.id} listing={l} onSaveAlert={onSaveAlert}/>
        ))}
      </div>
    </section>
  );
}

Object.assign(window, {TopNav, EmptyState, LatestListings});
