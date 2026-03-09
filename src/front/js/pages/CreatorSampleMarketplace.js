/**
 * CreatorSampleMarketplace.js
 * StreamPireX — Creator Sample Pack Marketplace (closes Splice gap)
 *
 * Features:
 *  - Browse sample packs by genre/mood/instrument/price
 *  - Creator upload flow: pack name, description, genre tags, price (free or paid)
 *  - Pack detail page: tracklist preview, creator info, stats
 *  - Purchase with credits or one-time payment via Stripe
 *  - StreamPireX takes 10% — creator keeps 90%
 *  - My Library: downloaded/purchased packs
 *  - Creator dashboard: revenue, download counts, top packs
 *  - Files stored in R2 (zip upload), streamed for preview
 *
 * Backend routes needed:
 *   GET  /api/marketplace/packs
 *   POST /api/marketplace/packs (multipart: zip + metadata)
 *   GET  /api/marketplace/packs/:id
 *   POST /api/marketplace/packs/:id/purchase
 *   GET  /api/marketplace/my-library
 *   GET  /api/marketplace/my-packs (creator view)
 *
 * Integration:
 *   import CreatorSampleMarketplace from './CreatorSampleMarketplace';
 *   <Route path="/marketplace" element={<CreatorSampleMarketplace />} />
 */

import React, { useState, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_PACKS = [
  {
    id: 'pack-1',
    name: 'Midnight Trap Vol. 1',
    creator: 'BeatsByKreate',
    creatorId: 'u1',
    genre: 'Trap',
    mood: 'Dark',
    price: 0, // free
    downloads: 8420,
    rating: 4.8,
    numReviews: 312,
    samples: 87,
    bpm: '130-145',
    keys: ['Am','Cm','Gm'],
    description: '87 dark trap loops, 808 patterns, hi-hat fills and melodic leads. Industry-ready sounds.',
    tags: ['trap','dark','808','melodic','drill'],
    coverColor: '#7C3AED',
    preview: null,
    featured: true,
    new: false,
  },
  {
    id: 'pack-2',
    name: 'Golden Lo-Fi Crates',
    creator: 'LoopArchitect',
    creatorId: 'u2',
    genre: 'Lo-Fi',
    mood: 'Chill',
    price: 4.99,
    downloads: 5100,
    rating: 4.9,
    numReviews: 218,
    samples: 64,
    bpm: '75-95',
    keys: ['C','F','G','Bb'],
    description: 'Warm, vinyl-textured lo-fi samples. Perfect for study beats and chill sessions.',
    tags: ['lofi','chill','vinyl','jazz','piano'],
    coverColor: '#FFD700',
    preview: null,
    featured: true,
    new: false,
  },
  {
    id: 'pack-3',
    name: 'Afrobeats Heat',
    creator: 'LagosGrooves',
    creatorId: 'u3',
    genre: 'Afrobeats',
    mood: 'Energetic',
    price: 7.99,
    downloads: 3800,
    rating: 4.7,
    numReviews: 145,
    samples: 112,
    bpm: '98-112',
    keys: ['C','D','G','A'],
    description: '112 premium Afrobeats loops. Authentic percussion, guitar riffs, brass stabs.',
    tags: ['afrobeats','afropop','percussion','guitar','africa'],
    coverColor: '#FF6600',
    preview: null,
    featured: false,
    new: true,
  },
  {
    id: 'pack-4',
    name: 'Neo-Soul Keys Collection',
    creator: 'SoulChef',
    creatorId: 'u4',
    genre: 'R&B',
    mood: 'Melancholic',
    price: 5.99,
    downloads: 4200,
    rating: 4.6,
    numReviews: 198,
    samples: 45,
    bpm: '82-100',
    keys: ['Dm','Em','Am','Fm'],
    description: 'Lush neo-soul chord progressions, Rhodes loops, and jazzy piano runs.',
    tags: ['neosoul','rnb','keys','rhodes','jazz'],
    coverColor: '#00c8ff',
    preview: null,
    featured: false,
    new: true,
  },
  {
    id: 'pack-5',
    name: 'House Essentials',
    creator: 'BerlinFactory',
    creatorId: 'u5',
    genre: 'House',
    mood: 'Energetic',
    price: 0,
    downloads: 9100,
    rating: 4.5,
    numReviews: 410,
    samples: 96,
    bpm: '120-130',
    keys: ['C','F','G'],
    description: '96 house samples: deep bass loops, chord stabs, percussion, and risers.',
    tags: ['house','deep house','bass','techno','electronic'],
    coverColor: '#00ffc8',
    preview: null,
    featured: false,
    new: false,
  },
];

const GENRES = ['All','Trap','Hip-Hop','R&B','Lo-Fi','House','Afrobeats','Pop','Jazz','Rock','Drill'];
const SORT_OPTIONS = ['Most Popular','Newest','Top Rated','Price: Low to High','Price: High to Low'];

// ---------------------------------------------------------------------------
// Pack Card
// ---------------------------------------------------------------------------
function PackCard({ pack, onOpen, onDownload, owned }) {
  return (
    <div style={{
      background:'#161b22', border:'1px solid #21262d', borderRadius:8,
      overflow:'hidden', cursor:'pointer', transition:'border-color 0.2s',
    }}
    onClick={() => onOpen(pack)}
    onMouseEnter={e => e.currentTarget.style.borderColor = pack.coverColor}
    onMouseLeave={e => e.currentTarget.style.borderColor = '#21262d'}
    >
      {/* Cover */}
      <div style={{
        height:80, background:`${pack.coverColor}33`,
        display:'flex', alignItems:'center', justifyContent:'center',
        borderBottom:`1px solid ${pack.coverColor}44`,
        position:'relative',
      }}>
        <div style={{fontSize:32}}>🎵</div>
        {pack.featured && (
          <div style={{
            position:'absolute', top:6, left:6,
            background:'#FFD70022', border:'1px solid #FFD700',
            color:'#FFD700', fontSize:9, padding:'1px 5px', borderRadius:3,
            fontFamily:'JetBrains Mono,monospace',
          }}>FEATURED</div>
        )}
        {pack.new && (
          <div style={{
            position:'absolute', top:6, right:6,
            background:'#00ffc822', border:'1px solid #00ffc8',
            color:'#00ffc8', fontSize:9, padding:'1px 5px', borderRadius:3,
            fontFamily:'JetBrains Mono,monospace',
          }}>NEW</div>
        )}
        {owned && (
          <div style={{
            position:'absolute', bottom:6, right:6,
            background:'#00ffc8', color:'#0d1117',
            fontSize:9, padding:'1px 5px', borderRadius:3,
            fontFamily:'JetBrains Mono,monospace', fontWeight:700,
          }}>OWNED</div>
        )}
      </div>

      {/* Info */}
      <div style={{padding:'8px 10px'}}>
        <div style={{
          fontSize:12, fontWeight:700, color:'#e6edf3',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          fontFamily:'JetBrains Mono,monospace',
        }}>{pack.name}</div>
        <div style={{fontSize:10, color:'#8b949e', marginTop:1}}>{pack.creator}</div>
        <div style={{
          display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6,
        }}>
          <span style={{
            fontSize:10, color: pack.coverColor, fontFamily:'JetBrains Mono,monospace',
            fontWeight:700,
          }}>
            {pack.price === 0 ? 'FREE' : `$${pack.price}`}
          </span>
          <span style={{fontSize:10, color:'#8b949e'}}>{pack.samples} samples</span>
        </div>
        <div style={{
          display:'flex', justifyContent:'space-between', marginTop:4, fontSize:9, color:'#8b949e',
        }}>
          <span>⭐ {pack.rating} ({pack.numReviews})</span>
          <span>{pack.downloads.toLocaleString()} DLs</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pack Detail Modal
// ---------------------------------------------------------------------------
function PackDetail({ pack, onClose, onDownload, onPurchase, owned }) {
  if (!pack) return null;
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'#00000088', display:'flex', alignItems:'center', justifyContent:'center',
      padding:20,
    }}
    onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background:'#1f2937', border:`1px solid ${pack.coverColor}`,
        borderRadius:12, width:'100%', maxWidth:540, maxHeight:'85vh',
        overflow:'auto', fontFamily:'JetBrains Mono,monospace',
      }}>
        {/* Header */}
        <div style={{
          background:`${pack.coverColor}22`, padding:'14px 16px',
          borderBottom:`1px solid ${pack.coverColor}44`,
          display:'flex', justifyContent:'space-between', alignItems:'flex-start',
        }}>
          <div>
            <div style={{fontSize:16, fontWeight:900, color: pack.coverColor}}>{pack.name}</div>
            <div style={{fontSize:12, color:'#8b949e', marginTop:2}}>by {pack.creator}</div>
          </div>
          <button onClick={onClose} style={{
            background:'none', border:'none', color:'#8b949e',
            fontSize:20, cursor:'pointer',
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{padding:'14px 16px'}}>
          <p style={{fontSize:12, color:'#e6edf3', lineHeight:1.6, marginBottom:12}}>
            {pack.description}
          </p>

          {/* Stats */}
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12,
          }}>
            {[
              ['Samples', pack.samples],
              ['BPM Range', pack.bpm],
              ['Downloads', pack.downloads.toLocaleString()],
              ['Rating', `⭐ ${pack.rating}`],
              ['Reviews', pack.numReviews],
              ['Keys', pack.keys.join(', ')],
            ].map(([k,v]) => (
              <div key={k} style={{
                background:'#161b22', border:'1px solid #21262d', borderRadius:6, padding:'6px 8px',
              }}>
                <div style={{fontSize:9, color:'#8b949e', letterSpacing:1}}>{k.toUpperCase()}</div>
                <div style={{fontSize:12, color:'#e6edf3', fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div style={{display:'flex', gap:4, flexWrap:'wrap', marginBottom:14}}>
            {pack.tags.map(t => (
              <span key={t} style={{
                background:`${pack.coverColor}22`, border:`1px solid ${pack.coverColor}44`,
                color: pack.coverColor, borderRadius:4, padding:'2px 6px', fontSize:10,
              }}>{t}</span>
            ))}
          </div>

          {/* Platform fee note */}
          <div style={{
            fontSize:10, color:'#8b949e', marginBottom:12, padding:'6px 8px',
            background:'#161b22', borderRadius:6, border:'1px solid #21262d',
          }}>
            💰 Creator receives 90% of revenue · StreamPireX 10% platform fee
          </div>

          {/* Action */}
          {owned ? (
            <button style={{
              width:'100%', background:'#00ffc822', border:'1px solid #00ffc8',
              color:'#00ffc8', borderRadius:6, padding:'10px', cursor:'pointer',
              fontFamily:'inherit', fontSize:13, fontWeight:700,
            }}>
              ⬇ Download Pack
            </button>
          ) : pack.price === 0 ? (
            <button
              onClick={() => { onDownload(pack); onClose(); }}
              style={{
                width:'100%', background:'#00ffc822', border:'1px solid #00ffc8',
                color:'#00ffc8', borderRadius:6, padding:'10px', cursor:'pointer',
                fontFamily:'inherit', fontSize:13, fontWeight:700,
              }}
            >⬇ Download Free</button>
          ) : (
            <button
              onClick={() => { onPurchase(pack); onClose(); }}
              style={{
                width:'100%', background:`${pack.coverColor}22`, border:`1px solid ${pack.coverColor}`,
                color: pack.coverColor, borderRadius:6, padding:'10px', cursor:'pointer',
                fontFamily:'inherit', fontSize:13, fontWeight:700,
              }}
            >💳 Purchase ${pack.price}</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload Modal
// ---------------------------------------------------------------------------
function UploadModal({ onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('Hip-Hop');
  const [price, setPrice] = useState('0');
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  const s = {
    input: {
      width:'100%', background:'#21262d', border:'1px solid #30363d',
      borderRadius:4, color:'#e6edf3', padding:'6px 10px',
      fontFamily:'JetBrains Mono,monospace', fontSize:12, outline:'none',
      boxSizing:'border-box',
    },
    label: { fontSize:10, color:'#8b949e', marginBottom:4, display:'block' },
    group: { marginBottom:10 },
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000, background:'#00000088',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }}
    onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background:'#1f2937', border:'1px solid #00ffc8', borderRadius:12,
        width:'100%', maxWidth:480, padding:20,
        fontFamily:'JetBrains Mono,monospace',
      }}>
        <div style={{fontSize:14, fontWeight:700, color:'#00ffc8', marginBottom:14}}>
          📦 Upload Sample Pack
        </div>

        <div style={s.group}>
          <span style={s.label}>PACK NAME</span>
          <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="My Amazing Pack Vol. 1" />
        </div>

        <div style={s.group}>
          <span style={s.label}>DESCRIPTION</span>
          <textarea style={{...s.input, minHeight:60, resize:'vertical'}}
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Describe what's in your pack..."
          />
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10}}>
          <div>
            <span style={s.label}>GENRE</span>
            <select style={s.input} value={genre} onChange={e => setGenre(e.target.value)}>
              {GENRES.slice(1).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <span style={s.label}>PRICE (USD, 0 = free)</span>
            <input style={s.input} type="number" min="0" step="0.99" value={price}
              onChange={e => setPrice(e.target.value)} />
          </div>
        </div>

        <div style={s.group}>
          <span style={s.label}>PACK FILE (ZIP)</span>
          <input ref={fileRef} type="file" accept=".zip" style={{display:'none'}}
            onChange={e => setFile(e.target.files[0])} />
          <button
            onClick={() => fileRef.current.click()}
            style={{
              background: file ? '#00ffc811' : '#21262d',
              border:`1px solid ${file ? '#00ffc8' : '#30363d'}`,
              color: file ? '#00ffc8' : '#8b949e',
              borderRadius:4, padding:'6px 12px', cursor:'pointer',
              fontFamily:'inherit', fontSize:11, width:'100%', textAlign:'left',
            }}
          >{file ? `✓ ${file.name}` : '📂 Select .zip file...'}</button>
        </div>

        <div style={{
          fontSize:10, color:'#8b949e', padding:'6px 8px',
          background:'#161b22', borderRadius:4, marginBottom:12,
        }}>
          💰 You keep 90% of all sales · StreamPireX 10% platform fee
        </div>

        <div style={{display:'flex', gap:8}}>
          <button
            disabled={!name || !file}
            onClick={() => { onSubmit({name, description, genre, price: parseFloat(price), file}); onClose(); }}
            style={{
              flex:2, background:'#00ffc822', border:'1px solid #00ffc8',
              color:'#00ffc8', borderRadius:6, padding:'8px', cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:700,
              opacity: (!name || !file) ? 0.5 : 1,
            }}
          >🚀 Submit Pack</button>
          <button onClick={onClose} style={{
            flex:1, background:'#21262d', border:'1px solid #30363d',
            color:'#8b949e', borderRadius:6, padding:'8px', cursor:'pointer',
            fontFamily:'inherit', fontSize:11,
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function CreatorSampleMarketplace() {
  const [view, setView] = useState('browse'); // browse | library | my-packs
  const [packs, setPacks] = useState(MOCK_PACKS);
  const [filterGenre, setFilterGenre] = useState('All');
  const [filterPrice, setFilterPrice] = useState('all'); // all | free | paid
  const [sortBy, setSortBy] = useState('Most Popular');
  const [search, setSearch] = useState('');
  const [selectedPack, setSelectedPack] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [library, setLibrary] = useState([]); // owned pack IDs
  const [notification, setNotification] = useState('');

  const showNotif = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleDownload = (pack) => {
    setLibrary(prev => [...new Set([...prev, pack.id])]);
    showNotif(`"${pack.name}" added to your library!`);
  };

  const handlePurchase = (pack) => {
    // In real app: Stripe checkout
    alert(`Stripe checkout would open here for $${pack.price}\nPlatform fee: $${(pack.price * 0.1).toFixed(2)}\nCreator receives: $${(pack.price * 0.9).toFixed(2)}`);
    setLibrary(prev => [...new Set([...prev, pack.id])]);
    showNotif(`"${pack.name}" purchased and added to your library!`);
  };

  const handleUploadSubmit = (data) => {
    const newPack = {
      id: `pack-${Date.now()}`,
      name: data.name,
      creator: 'You',
      creatorId: 'me',
      genre: data.genre,
      mood: 'Custom',
      price: data.price,
      downloads: 0,
      rating: 0,
      numReviews: 0,
      samples: 0,
      bpm: '--',
      keys: [],
      description: data.description,
      tags: [data.genre.toLowerCase()],
      coverColor: '#00ffc8',
      preview: null,
      featured: false,
      new: true,
    };
    setPacks(prev => [newPack, ...prev]);
    showNotif(`"${data.name}" submitted for review!`);
  };

  // Filter + sort
  let displayed = packs.filter(p => {
    if (filterGenre !== 'All' && p.genre !== filterGenre) return false;
    if (filterPrice === 'free' && p.price !== 0) return false;
    if (filterPrice === 'paid' && p.price === 0) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.creator.toLowerCase().includes(search.toLowerCase()) &&
        !p.tags.some(t => t.includes(search.toLowerCase()))) return false;
    return true;
  });
  if (sortBy === 'Most Popular') displayed.sort((a,b) => b.downloads - a.downloads);
  else if (sortBy === 'Newest') displayed.sort((a,b) => (b.new?1:0) - (a.new?1:0));
  else if (sortBy === 'Top Rated') displayed.sort((a,b) => b.rating - a.rating);
  else if (sortBy === 'Price: Low to High') displayed.sort((a,b) => a.price - b.price);
  else if (sortBy === 'Price: High to Low') displayed.sort((a,b) => b.price - a.price);

  if (view === 'library') displayed = packs.filter(p => library.includes(p.id));
  if (view === 'my-packs') displayed = packs.filter(p => p.creatorId === 'me');

  const s = {
    root: {
      background:'#0d1117', color:'#e6edf3', minHeight:'100vh',
      fontFamily:'JetBrains Mono,monospace', fontSize:12,
    },
    header: {
      background:'#161b22', borderBottom:'1px solid #21262d', padding:'12px 16px',
    },
    title: { fontSize:18, fontWeight:900, color:'#00ffc8', marginBottom:10 },
    navRow: { display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' },
    navBtn: (active) => ({
      background: active ? '#00ffc822' : '#21262d',
      border:`1px solid ${active ? '#00ffc8' : '#30363d'}`,
      color: active ? '#00ffc8' : '#8b949e',
      borderRadius:4, padding:'4px 12px', cursor:'pointer',
      fontFamily:'inherit', fontSize:11,
    }),
    input: {
      background:'#21262d', border:'1px solid #30363d', borderRadius:4,
      color:'#e6edf3', padding:'4px 8px', fontFamily:'inherit', fontSize:11,
      outline:'none',
    },
    grid: {
      display:'grid',
      gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',
      gap:12, padding:16,
    },
  };

  return (
    <div style={s.root}>
      {/* Notification */}
      {notification && (
        <div style={{
          position:'fixed', top:20, right:20, zIndex:2000,
          background:'#00ffc822', border:'1px solid #00ffc8', color:'#00ffc8',
          borderRadius:6, padding:'8px 14px', fontSize:12,
          fontFamily:'JetBrains Mono,monospace',
        }}>{notification}</div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div style={s.title}>🎵 SAMPLE MARKETPLACE</div>
        <div style={s.navRow}>
          {['browse','library','my-packs'].map(v => (
            <button key={v} style={s.navBtn(view===v)} onClick={() => setView(v)}>
              {v === 'browse' ? '🏪 Browse' : v === 'library' ? `📚 My Library (${library.length})` : '🎤 My Packs'}
            </button>
          ))}
          <button
            onClick={() => setShowUpload(true)}
            style={{
              marginLeft:'auto',
              background:'#FF660022', border:'1px solid #FF6600', color:'#FF6600',
              borderRadius:4, padding:'4px 12px', cursor:'pointer',
              fontFamily:'inherit', fontSize:11,
            }}
          >+ Upload Pack</button>
        </div>

        {view === 'browse' && (
          <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
            <input style={s.input} placeholder="Search packs..." value={search}
              onChange={e => setSearch(e.target.value)} />
            <select style={s.input} value={filterGenre} onChange={e => setFilterGenre(e.target.value)}>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select style={s.input} value={filterPrice} onChange={e => setFilterPrice(e.target.value)}>
              <option value="all">All Prices</option>
              <option value="free">Free Only</option>
              <option value="paid">Paid Only</option>
            </select>
            <select style={s.input} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Grid */}
      {displayed.length === 0 ? (
        <div style={{textAlign:'center', padding:'40px 20px', color:'#8b949e'}}>
          {view === 'library' ? 'No packs in your library yet. Browse and download some!' :
           view === 'my-packs' ? 'You haven\'t uploaded any packs yet.' :
           'No packs match your filters.'}
        </div>
      ) : (
        <div style={s.grid}>
          {displayed.map(pack => (
            <PackCard
              key={pack.id}
              pack={pack}
              onOpen={setSelectedPack}
              onDownload={handleDownload}
              owned={library.includes(pack.id)}
            />
          ))}
        </div>
      )}

      {/* Pack detail */}
      {selectedPack && (
        <PackDetail
          pack={selectedPack}
          onClose={() => setSelectedPack(null)}
          onDownload={handleDownload}
          onPurchase={handlePurchase}
          owned={library.includes(selectedPack.id)}
        />
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSubmit={handleUploadSubmit}
        />
      )}
    </div>
  );
}
