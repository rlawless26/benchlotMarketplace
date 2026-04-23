// Data.jsx — source list + listings

const SOURCES = [
  {id:'jimbode',   name:'Jim Bode Tools',   kind:'Dealer',   shortName:'Jim Bode',     color:'#6b3d2e'},
  {id:'leach',     name:'Patrick Leach',    kind:'Dealer',   shortName:'P. Leach',     color:'#2f4f4f'},
  {id:'hyperkit',  name:'Hyperkitten',      kind:'Dealer',   shortName:'Hyperkitten',  color:'#8b5a2b'},
  {id:'sawmill',   name:'Sawmill Creek',    kind:'Forum',    shortName:'Sawmill Creek',color:'#3d5a3d'},
  {id:'lumberj',   name:'Lumberjocks',      kind:'Forum',    shortName:'Lumberjocks',  color:'#4a3a2a'},
  {id:'handtools', name:'r/handtools',      kind:'Reddit',   shortName:'r/handtools',  color:'#a83a2a'},
  {id:'ebay',      name:'eBay',             kind:'Marketplace', shortName:'eBay',      color:'#2a5a6a'},
  {id:'skinner',   name:'Skinner Auctions', kind:'Auction',  shortName:'Skinner',      color:'#3a2a3a'},
  {id:'bonhams',   name:'Bonhams',          kind:'Auction',  shortName:'Bonhams',      color:'#2a3a4a'},
  {id:'crfl',      name:'Craigslist',       kind:'Marketplace', shortName:'Craigslist',color:'#4a4a2a'},
];
const SRC = Object.fromEntries(SOURCES.map(s=>[s.id,s]));

// Listings — placeholder content that feels real.
const LISTINGS = [
  {id:1,  title:'Stanley No. 4 Type 11 Smoothing Plane',           maker:'Stanley',      category:'Hand Planes', price:185, currency:'$', condition:'Good+',   posted:'2h ago',  location:'Portland, ME',   source:'jimbode',   image:'assets/images/category-planes.jpg',   note:'Rosewood tote, original iron, sole lapped flat.'},
  {id:2,  title:'Lie-Nielsen No. 62 Low-Angle Jack Plane',         maker:'Lie-Nielsen',  category:'Hand Planes', price:295, currency:'$', condition:'Like New',posted:'5h ago',  location:'Woodstock, VT',  source:'leach',     image:'assets/images/category-planes.jpg',   note:'A-2 iron, hardly used, in original box.'},
  {id:3,  title:'Veritas Small Plow Plane with 5 Blades',          maker:'Veritas',      category:'Hand Planes', price:245, currency:'$', condition:'Excellent',posted:'7h ago', location:'Seattle, WA',    source:'hyperkit',  image:'assets/images/category-planes.jpg',   note:'1/8, 3/16, 1/4, 5/16, 3/8 blades included.'},
  {id:4,  title:'Narex Premium Bench Chisels, Set of 6',           maker:'Narex',        category:'Chisels',     price:89,  currency:'$', condition:'New',     posted:'11h ago', location:'—',              source:'ebay',      image:'assets/images/category-chisels.jpg',  note:'New old stock, 1/4" through 1 1/4", hornbeam.'},
  {id:5,  title:'Disston D-8 Crosscut Handsaw, 26" 8ppi',          maker:'Disston',      category:'Hand Saws',   price:72,  currency:'$', condition:'Good',    posted:'14h ago', location:'Brooklyn, NY',   source:'handtools', image:'assets/images/category-saws.jpg',     note:'1896–1917 medallion. Apple handle, no breaks.'},
  {id:6,  title:'Record No. 043 Small Plough Plane',               maker:'Record',       category:'Hand Planes', price:95,  currency:'£', condition:'Good',    posted:'16h ago', location:'Bristol, UK',    source:'ebay',      image:'assets/images/category-planes.jpg',   note:'Three cutters. Japanning 85%. Rare pre-war.'},
  {id:7,  title:'Blue Spruce Joiner\u2019s Mallet, 22oz',          maker:'Blue Spruce',  category:'Workholding', price:115, currency:'$', condition:'Like New',posted:'19h ago', location:'Asheville, NC',  source:'lumberj',   image:'assets/images/category-workholding.jpg',note:'Infused acrylic head, curly maple handle.'},
  {id:8,  title:'Japanese Kanna — White Oak Dai, 70mm blade',      maker:'Tsunesaburo',  category:'Hand Planes', price:340, currency:'$', condition:'Excellent',posted:'1d ago', location:'Osaka → USA',    source:'hyperkit',  image:'assets/images/category-planes.jpg',   note:'Set up and tuned. Takes 0.02mm shavings.'},
  {id:9,  title:'Stanley No. 5 Jack Plane, Sweetheart',            maker:'Stanley',      category:'Hand Planes', price:92,  currency:'$', condition:'Good',    posted:'1d ago',  location:'Akron, OH',      source:'sawmill',   image:'assets/images/category-planes.jpg',   note:'1920s Sweetheart. Original decal on tote.'},
  {id:10, title:'Veritas Dovetail Saw, Filed Rip',                 maker:'Veritas',      category:'Hand Saws',   price:78,  currency:'$', condition:'Excellent',posted:'1d ago', location:'Ottawa, ON',     source:'lumberj',   image:'assets/images/category-saws.jpg',     note:'PM-V11 plate. Sharp, ready to go.'},
  {id:11, title:'Lie-Nielsen No. 4½ Bronze Smoother',              maker:'Lie-Nielsen',  category:'Hand Planes', price:385, currency:'$', condition:'Like New',posted:'1d ago',  location:'Freeport, ME',   source:'jimbode',   image:'assets/images/category-planes.jpg',   note:'Bronze body. Cherry tote. Barely a mark.'},
  {id:12, title:'Sorby Paring Chisels, Cased Set of 4',            maker:'Sorby',        category:'Chisels',     price:165, currency:'$', condition:'Vintage', posted:'2d ago',  location:'Bath, ME',       source:'leach',     image:'assets/images/category-chisels.jpg',  note:'1/4, 1/2, 3/4, 1". Original box + rolls.'},
  {id:13, title:'Auburn Tool Co. Smoothing Plane, c.1880',         maker:'Auburn',       category:'Hand Planes', price:210, currency:'$', condition:'Good',    posted:'2d ago',  location:'Boston, MA',     source:'skinner',   image:'assets/images/category-planes.jpg',   note:'Beech body, coffin shape. Wedge intact.'},
  {id:14, title:'Millers Falls No. 2 Hand Drill',                  maker:'Millers Falls',category:'Hand Saws',   price:48,  currency:'$', condition:'Good',    posted:'2d ago',  location:'Providence, RI', source:'handtools', image:'assets/images/category-saws.jpg',     note:'All gears smooth. Rosewood handle.'},
];

Object.assign(window, {SOURCES, SRC, LISTINGS});
