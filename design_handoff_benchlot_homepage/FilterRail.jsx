// FilterRail.jsx — persistent left-side filters
function FilterRailGroup({title, children, defaultOpen=true}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div style={{paddingBottom:16, marginBottom:16, borderBottom:'1px solid var(--border-light)'}}>
      <button onClick={()=>setOpen(!open)} style={{
        width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center',
        background:'transparent', border:0, padding:0, cursor:'pointer', marginBottom: open ? 10 : 0,
        font:'700 10px var(--font-body)', color:'var(--fg-secondary)', letterSpacing:'0.18em', textTransform:'uppercase',
      }}>
        <span>{title}</span>
        <window.LucideChevronDown size={12} style={{transform: open ? 'none' : 'rotate(-90deg)', transition:'transform .2s', color:'var(--fg-muted)'}}/>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function FilterCheck({label, count, checked, onToggle}) {
  return (
    <label style={{display:'flex', alignItems:'center', gap:8, padding:'4px 0', cursor:'pointer',
      font:'400 13px var(--font-body)', color:'var(--fg-primary)', letterSpacing:'0.01em'}}>
      <input type="checkbox" checked={!!checked} onChange={onToggle} style={{accentColor:'var(--spruce)', margin:0}}/>
      <span style={{flex:1}}>{label}</span>
      {count != null && <span style={{font:'400 11px var(--font-body)', color:'var(--fg-muted)'}}>{count}</span>}
    </label>
  );
}

function FilterRail({active, onToggle}) {
  const isOn = (group, key) => !!(active[group] && active[group][key]);
  const t = (group, key) => onToggle(group, key);

  return (
    <aside style={{width:240, flexShrink:0}}>
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        paddingBottom:16, marginBottom:16, borderBottom:'1px solid var(--border)',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:8, font:'700 14px var(--font-display)', color:'var(--dark-teal)'}}>
          <window.LucideSliders size={14}/> Filters
        </div>
        <button style={{background:'transparent', border:0, cursor:'pointer', font:'500 11px var(--font-body)', color:'var(--fg-secondary)', textDecoration:'underline', textUnderlineOffset:2}}>Clear all</button>
      </div>

      <FilterRailGroup title="Category">
        {[
          ['Hand Planes', 2847], ['Chisels', 1423], ['Hand Saws', 982],
          ['Workholding', 611], ['Sharpening', 448], ['Marking & Measuring', 392],
        ].map(([l,c]) => <FilterCheck key={l} label={l} count={c} checked={isOn('cat',l)} onToggle={()=>t('cat',l)}/>)}
        <button style={{background:'transparent', border:0, padding:'4px 0', cursor:'pointer',
          font:'500 12px var(--font-body)', color:'var(--spruce)', textDecoration:'underline', textUnderlineOffset:2, marginTop:2}}>
          + 8 more
        </button>
      </FilterRailGroup>

      <FilterRailGroup title="Maker">
        {[
          ['Stanley', 1284], ['Lie-Nielsen', 612], ['Veritas', 488],
          ['Record', 347], ['Disston', 298], ['Narex', 212], ['Sorby', 148],
        ].map(([l,c]) => <FilterCheck key={l} label={l} count={c} checked={isOn('maker',l)} onToggle={()=>t('maker',l)}/>)}
      </FilterRailGroup>

      <FilterRailGroup title="Condition">
        {['New / NOS','Like New','Excellent','Good','Project / Parts'].map(l =>
          <FilterCheck key={l} label={l} checked={isOn('cond',l)} onToggle={()=>t('cond',l)}/>
        )}
      </FilterRailGroup>

      <FilterRailGroup title="Price">
        <div style={{display:'flex', gap:8, marginTop:4, marginBottom:8}}>
          <input placeholder="$ min" style={filterInputStyle}/>
          <input placeholder="$ max" style={filterInputStyle}/>
        </div>
        <div style={{font:'400 11px var(--font-body)', color:'var(--fg-muted)'}}>Range in current results: $48 – $385</div>
      </FilterRailGroup>

      <FilterRailGroup title="Source">
        {[
          ['Jim Bode Tools','jimbode'], ['Patrick Leach','leach'], ['Hyperkitten','hyperkit'],
          ['Sawmill Creek','sawmill'], ['Lumberjocks','lumberj'], ['r/handtools','handtools'],
          ['eBay','ebay'], ['Auctions','auctions'],
        ].map(([l,id]) => <FilterCheck key={id} label={l} checked={isOn('src',id)} onToggle={()=>t('src',id)}/>)}
      </FilterRailGroup>

      <FilterRailGroup title="Listing age" defaultOpen={false}>
        {['Last 24 hours','Last 3 days','Last 7 days','Last 30 days'].map(l =>
          <FilterCheck key={l} label={l} checked={isOn('age',l)} onToggle={()=>t('age',l)}/>
        )}
      </FilterRailGroup>
    </aside>
  );
}

const filterInputStyle = {
  padding:'7px 10px', borderRadius:6, border:'1px solid var(--border)',
  font:'400 12px var(--font-body)', width:'100%', background:'var(--bone)',
  color:'var(--dark-teal)', outline:'none',
};

Object.assign(window, {FilterRail});
