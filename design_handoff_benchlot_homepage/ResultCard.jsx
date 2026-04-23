// ResultCard.jsx — aggregator listing card

function SourceBadge({sourceId, size='md'}) {
  const s = window.SRC[sourceId];
  if (!s) return null;
  const small = size === 'sm';
  const iconMap = {
    Dealer: window.LucideStore,
    Forum: window.LucideForum,
    Reddit: window.LucideReddit,
    Marketplace: window.LucideGlobe,
    Auction: window.LucideAuction,
  };
  const Icon = iconMap[s.kind] || window.LucideGlobe;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding: small ? '2px 8px' : '4px 10px',
      borderRadius: 4,
      background: 'rgba(26,48,48,0.06)',
      border: '1px solid rgba(26,48,48,0.12)',
      color: 'var(--spruce)',
      font: `500 ${small?10:11}px var(--font-body)`,
      letterSpacing:'0.02em',
      whiteSpace:'nowrap',
    }}>
      <Icon size={small?10:12}/>
      {s.shortName}
    </span>
  );
}

function KindDot({kind}) {
  const colors = {
    Dealer: '#d4aa60',
    Forum: '#2a6a4a',
    Reddit: '#a83a2a',
    Marketplace: '#2a5a6a',
    Auction: '#6a4a2a',
  };
  return <span style={{display:'inline-block', width:6, height:6, borderRadius:999, background: colors[kind] || '#888', flexShrink:0}}/>;
}

function ResultCard({listing, onSaveAlert}) {
  const [hover, setHover] = React.useState(false);
  const s = window.SRC[listing.source];
  return (
    <a href="#" target="_blank" rel="noopener"
       onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
       onClick={e=>e.preventDefault()}
       style={{
         display:'block',
         background:'var(--bone-light)',
         border:`1px solid ${hover ? 'var(--border-dark)' : 'var(--border)'}`,
         borderRadius:10,
         overflow:'hidden',
         boxShadow: hover ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
         transform: hover ? 'translateY(-2px)' : 'none',
         transition:'transform .2s var(--ease-standard), box-shadow .2s var(--ease-standard), border-color .2s',
         color:'inherit', textDecoration:'none',
         position:'relative',
       }}>
      <div style={{position:'relative', aspectRatio:'4 / 3', backgroundImage:`url(${listing.image})`, backgroundSize:'cover', backgroundPosition:'center', backgroundColor:'var(--bone-dark)'}}>
        {/* source badge overlay — top-left */}
        <div style={{position:'absolute', top:10, left:10, display:'flex', gap:6, alignItems:'center'}}>
          <SourceBadge sourceId={listing.source}/>
        </div>
        {/* posted time — top-right */}
        <div style={{position:'absolute', top:10, right:10, display:'inline-flex', alignItems:'center', gap:4,
          padding:'3px 8px', borderRadius:4, background:'rgba(12,28,30,0.78)', color:'var(--bone)',
          font:'500 10px var(--font-body)', letterSpacing:'0.02em'}}>
          <window.LucideClock size={10}/> {listing.posted}
        </div>
        {/* hover action */}
        <div style={{
          position:'absolute', bottom:10, right:10,
          opacity: hover ? 1 : 0,
          transform: hover ? 'translateY(0)' : 'translateY(4px)',
          transition:'opacity .2s, transform .2s',
          pointerEvents: hover ? 'auto' : 'none',
        }}>
          <button onClick={(e)=>{e.preventDefault(); e.stopPropagation(); onSaveAlert && onSaveAlert(listing);}}
            style={{display:'inline-flex', alignItems:'center', gap:5, padding:'6px 10px',
              background:'var(--bone)', border:'1px solid var(--border)', borderRadius:6,
              font:'500 11px var(--font-body)', color:'var(--spruce)', cursor:'pointer', letterSpacing:'0.02em'}}>
            <window.LucideBell size={11}/> Alert for similar
          </button>
        </div>
      </div>
      <div style={{padding:'14px 16px 16px'}}>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:12, marginBottom:6}}>
          <div style={{font:'700 10px var(--font-body)', color:'var(--fg-muted)', letterSpacing:'0.14em', textTransform:'uppercase'}}>{listing.maker}</div>
          <div style={{font:'500 10px var(--font-body)', color:'var(--fg-muted)', letterSpacing:'0.02em'}}>{listing.condition}</div>
        </div>
        <h3 style={{font:'600 16px/1.3 var(--font-body)', color:'var(--dark-teal)', margin:'0 0 10px', letterSpacing:'-0.005em'}}>
          {listing.title}
        </h3>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:10, marginBottom:10}}>
          <div style={{font:'700 20px var(--font-body)', color:'var(--honey)', letterSpacing:'-0.01em'}}>
            {listing.currency}{listing.price}
          </div>
          <div style={{font:'400 12px var(--font-body)', color:'var(--fg-secondary)', display:'inline-flex', alignItems:'center', gap:4}}>
            <window.LucidePin size={11}/> {listing.location}
          </div>
        </div>
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          paddingTop:10, borderTop:'1px solid var(--border-light)',
          font:'500 11px var(--font-body)', color:'var(--fg-secondary)', letterSpacing:'0.02em',
        }}>
          <span style={{display:'inline-flex', alignItems:'center', gap:5}}>
            <KindDot kind={s?.kind}/> Listed at {s?.name}
          </span>
          <span style={{display:'inline-flex', alignItems:'center', gap:4, color: hover ? 'var(--honey)' : 'var(--spruce)', transition:'color .2s'}}>
            View source <window.LucideExternal size={11}/>
          </span>
        </div>
      </div>
    </a>
  );
}

Object.assign(window, {ResultCard, SourceBadge, KindDot});
