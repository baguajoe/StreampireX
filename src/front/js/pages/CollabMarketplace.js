/**
 * CollabMarketplace.js
 * StreamPireX — Hire-a-Pro Collab Marketplace (closes LANDR gap)
 *
 * Features:
 *  - Producers, engineers, vocalists, and session musicians post services
 *  - Users browse, filter by role/genre/price, and book
 *  - StreamPireX takes 15% platform fee on all bookings
 *  - Creator profile cards with portfolio samples, ratings, turnaround
 *  - Direct message + booking request flow
 *  - My Services: manage your own listings
 *  - My Orders: track bookings as buyer or seller
 *
 * Route: /collab-marketplace
 * Backend routes: GET/POST /api/collab-marketplace/services
 *                 POST /api/collab-marketplace/book/:id
 */

import React, { useState, useMemo } from 'react';

const ROLES = ['All', 'Producer', 'Mix Engineer', 'Mastering Engineer', 'Vocalist', 'Songwriter', 'Session Musician', 'Ghost Producer', 'Beat Maker', 'Sound Designer'];
const GENRES = ['All', 'Hip-Hop', 'Trap', 'R&B', 'Pop', 'House', 'Afrobeats', 'Rock', 'Jazz', 'Country', 'Gospel', 'Lo-Fi'];
const SORT_OPTIONS = ['Top Rated', 'Most Reviews', 'Price: Low', 'Price: High', 'Fastest Turnaround'];
const BUDGETS = ['Any Budget', 'Under $50', '$50–$150', '$150–$500', '$500+'];

const MOCK_SERVICES = [
  {
    id: 's1', creatorId: 'u1', name: 'BeatsByKreate', avatar: '🎛', role: 'Producer',
    title: 'Full Beat Production (Trap/Hip-Hop)', price: 150, turnaround: 3,
    rating: 4.9, reviews: 312, genre: 'Trap', bio: '10+ years making industry beats. Credits include major label placements.',
    portfolio: ['Trap Beat Preview', 'Dark Melodic Loop'], featured: true, online: true,
    includes: ['Tracked-out stems', '2 revisions', 'Exclusive license option']
  },
  {
    id: 's2', creatorId: 'u2', name: 'MixMaestro', avatar: '🎚', role: 'Mix Engineer',
    title: 'Professional Mixing (any genre)', price: 200, turnaround: 5,
    rating: 4.8, reviews: 218, genre: 'Hip-Hop', bio: 'SSL & Pro Tools mix engineer. Worked on 500+ commercial releases.',
    portfolio: ['Mix Sample 1', 'Mix Sample 2'], featured: true, online: false,
    includes: ['Stem prep', 'Full mix', '2 revisions', 'Recall session']
  },
  {
    id: 's3', creatorId: 'u3', name: 'LoudnessLab', avatar: '💿', role: 'Mastering Engineer',
    title: 'Streaming-Ready Mastering', price: 75, turnaround: 2,
    rating: 4.7, reviews: 445, genre: 'Pop', bio: 'Mastered 2000+ tracks. Specialized in Spotify/Apple Music loudness.',
    portfolio: ['Before/After Sample'], featured: false, online: true,
    includes: ['MP3 + WAV delivery', 'LUFS report', 'Unlimited minor tweaks']
  },
  {
    id: 's4', creatorId: 'u4', name: 'VocalQueen', avatar: '🎤', role: 'Vocalist',
    title: 'R&B/Pop Vocal Hook & Topline', price: 300, turnaround: 7,
    rating: 5.0, reviews: 89, genre: 'R&B', bio: 'Session vocalist with major sync credits. Smooth R&B to powerful pop.',
    portfolio: ['Vocal Demo 1', 'Hook Sample'], featured: true, online: true,
    includes: ['Written & recorded hook', 'Harmonies included', 'WAV files']
  },
  {
    id: 's5', creatorId: 'u5', name: 'FreestyleGhost', avatar: '✍️', role: 'Songwriter',
    title: 'Custom Songwriting (Hook + Verse)', price: 250, turnaround: 5,
    rating: 4.6, reviews: 134, genre: 'Hip-Hop', bio: 'Published songwriter. Ghostwriting for artists across all platforms.',
    portfolio: ['Lyric Sample'], featured: false, online: false,
    includes: ['Full lyrics', 'Melody guide', 'Unlimited revisions for 7 days']
  },
  {
    id: 's6', creatorId: 'u6', name: 'AfroKeysman', avatar: '🎹', role: 'Session Musician',
    title: 'Live Keys & Piano Recording', price: 120, turnaround: 4,
    rating: 4.8, reviews: 67, genre: 'Afrobeats', bio: 'Professional pianist. Afrobeats, Afropop, gospel, neo-soul specialist.',
    portfolio: ['Keys Sample 1', 'Piano Loop'], featured: false, online: true,
    includes: ['Recorded WAV', '2 takes', 'Stems']
  },
  {
    id: 's7', creatorId: 'u7', name: 'SubSynthesis', avatar: '🔊', role: 'Sound Designer',
    title: 'Custom Synth Patches & Sound Design', price: 80, turnaround: 3,
    rating: 4.5, reviews: 52, genre: 'House', bio: 'Sound design for electronic producers. Specializing in unique textures.',
    portfolio: ['Sound Pack Preview'], featured: false, online: true,
    includes: ['10 custom patches', 'Full stems', 'Source files']
  },
  {
    id: 's8', creatorId: 'u8', name: 'GhostBeatz', avatar: '👻', role: 'Ghost Producer',
    title: 'Full Ghost Production (Exclusive)', price: 600, turnaround: 10,
    rating: 4.9, reviews: 28, genre: 'Pop', bio: 'Full ghost production with 100% exclusive rights transfer.',
    portfolio: ['Teaser Preview'], featured: true, online: false,
    includes: ['Full production', 'Mixing', 'All rights transferred', 'NDA included']
  },
];

// ---------------------------------------------------------------------------
// Service Card
// ---------------------------------------------------------------------------
function ServiceCard({ service, onOpen }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onOpen(service)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#161b22', border: `1px solid ${hovered ? '#00ffc8' : '#21262d'}`,
        borderRadius: 8, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ padding: '12px 12px 8px', flex: 1 }}>
        {/* Creator row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: '#21262d',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
          }}>{service.avatar}</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#00ffc8', fontFamily: 'JetBrains Mono,monospace' }}>{service.name}</div>
            <div style={{ fontSize: 10, color: '#8b949e' }}>{service.role}</div>
          </div>
          {service.online && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#00ffc8' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ffc8' }} />
              Online
            </div>
          )}
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
          {service.featured && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#FFD70022', border: '1px solid #FFD700', color: '#FFD700', fontFamily: 'JetBrains Mono,monospace' }}>FEATURED</span>}
          <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#00ffc811', border: '1px solid #00ffc844', color: '#00ffc8', fontFamily: 'JetBrains Mono,monospace' }}>{service.genre}</span>
        </div>

        {/* Title */}
        <div style={{ fontSize: 12, fontWeight: 700, color: '#e6edf3', marginBottom: 4, fontFamily: 'JetBrains Mono,monospace', lineHeight: 1.3 }}>{service.title}</div>

        {/* Rating */}
        <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 8 }}>
          ⭐ {service.rating} ({service.reviews} reviews)
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 12px', borderTop: '1px solid #21262d',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#0d1117',
      }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: '#00ffc8', fontFamily: 'JetBrains Mono,monospace' }}>
          ${service.price}
        </span>
        <span style={{ fontSize: 10, color: '#8b949e' }}>
          {service.turnaround}d delivery
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Service Detail Modal
// ---------------------------------------------------------------------------
function ServiceDetail({ service, onClose, onBook }) {
  const [message, setMessage] = useState('');
  if (!service) return null;

  const platformFee = (service.price * 0.15).toFixed(2);
  const creatorGets = (service.price * 0.85).toFixed(2);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: '#00000099',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#1f2937', border: '2px solid #00ffc8', borderRadius: 12,
        width: '100%', maxWidth: 540, maxHeight: '88vh', overflow: 'auto',
        fontFamily: 'JetBrains Mono,monospace',
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #21262d', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#00ffc8' }}>{service.title}</div>
            <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>by {service.name} · {service.role}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 12, color: '#e6edf3', lineHeight: 1.7, marginBottom: 12 }}>{service.bio}</p>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              ['Rating', `⭐ ${service.rating}`],
              ['Reviews', service.reviews],
              ['Delivery', `${service.turnaround} days`],
            ].map(([k, v]) => (
              <div key={k} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#8b949e', letterSpacing: 1 }}>{k}</div>
                <div style={{ fontSize: 12, color: '#e6edf3', fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Includes */}
          <div style={{ fontSize: 10, color: '#8b949e', letterSpacing: 2, marginBottom: 6 }}>INCLUDES</div>
          {service.includes.map((item, i) => (
            <div key={i} style={{ fontSize: 11, color: '#e6edf3', padding: '3px 0' }}>✓ {item}</div>
          ))}

          {/* Message */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10, color: '#8b949e', letterSpacing: 2, marginBottom: 6 }}>ADD A NOTE (OPTIONAL)</div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Describe your project, reference tracks, deadline..."
              style={{
                width: '100%', background: '#21262d', border: '1px solid #30363d', borderRadius: 6,
                color: '#e6edf3', padding: '8px 10px', fontFamily: 'inherit', fontSize: 11,
                resize: 'vertical', minHeight: 60, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Fee breakdown */}
          <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 6, padding: '8px 10px', margin: '10px 0', fontSize: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: '#8b949e' }}>Service price</span>
              <span style={{ color: '#e6edf3' }}>${service.price}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: '#8b949e' }}>Platform fee (15%)</span>
              <span style={{ color: '#FF6600' }}>+${platformFee}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#00ffc8', fontWeight: 700 }}>
              <span>Creator receives</span>
              <span>${creatorGets}</span>
            </div>
          </div>

          <button onClick={() => { onBook(service, message); onClose(); }} style={{
            width: '100%', background: '#00ffc822', border: '1px solid #00ffc8',
            color: '#00ffc8', borderRadius: 6, padding: '10px', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
          }}>
            💳 Book for ${service.price}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List My Service Modal
// ---------------------------------------------------------------------------
function ListServiceModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ title: '', role: 'Producer', genre: 'Hip-Hop', price: '', turnaround: '', bio: '', includes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const s = { input: { width: '100%', background: '#21262d', border: '1px solid #30363d', borderRadius: 4, color: '#e6edf3', padding: '6px 8px', fontFamily: 'JetBrains Mono,monospace', fontSize: 11, outline: 'none', boxSizing: 'border-box' }, label: { fontSize: 9, color: '#8b949e', letterSpacing: 2, marginBottom: 4, display: 'block' }, group: { marginBottom: 10 } };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#00000099', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1f2937', border: '1px solid #00ffc8', borderRadius: 12, width: '100%', maxWidth: 480, maxHeight: '88vh', overflow: 'auto', padding: 20, fontFamily: 'JetBrains Mono,monospace' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#00ffc8', marginBottom: 14 }}>🎤 List Your Service</div>
        <div style={s.group}><span style={s.label}>SERVICE TITLE</span><input style={s.input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Professional Mixing for Hip-Hop" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div><span style={s.label}>YOUR ROLE</span><select style={s.input} value={form.role} onChange={e => set('role', e.target.value)}>{ROLES.slice(1).map(r => <option key={r}>{r}</option>)}</select></div>
          <div><span style={s.label}>GENRE</span><select style={s.input} value={form.genre} onChange={e => set('genre', e.target.value)}>{GENRES.slice(1).map(g => <option key={g}>{g}</option>)}</select></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div><span style={s.label}>PRICE (USD)</span><input style={s.input} type="number" min="5" value={form.price} onChange={e => set('price', e.target.value)} placeholder="150" /></div>
          <div><span style={s.label}>TURNAROUND (DAYS)</span><input style={s.input} type="number" min="1" value={form.turnaround} onChange={e => set('turnaround', e.target.value)} placeholder="5" /></div>
        </div>
        <div style={s.group}><span style={s.label}>BIO / DESCRIPTION</span><textarea style={{ ...s.input, minHeight: 60, resize: 'vertical' }} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Your experience, credits, specialties..." /></div>
        <div style={s.group}><span style={s.label}>WHAT'S INCLUDED (one per line)</span><textarea style={{ ...s.input, minHeight: 50, resize: 'vertical' }} value={form.includes} onChange={e => set('includes', e.target.value)} placeholder={"Tracked stems\n2 revisions\nExclusive license"} /></div>
        <div style={{ fontSize: 10, color: '#8b949e', padding: '6px 8px', background: '#161b22', borderRadius: 4, marginBottom: 12 }}>💰 You keep 85% of every booking · StreamPireX 15% fee</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={!form.title || !form.price} onClick={() => { onSubmit(form); onClose(); }} style={{ flex: 2, background: '#00ffc822', border: '1px solid #00ffc8', color: '#00ffc8', borderRadius: 6, padding: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, opacity: (!form.title || !form.price) ? 0.5 : 1 }}>🚀 List Service</button>
          <button onClick={onClose} style={{ flex: 1, background: '#21262d', border: '1px solid #30363d', color: '#8b949e', borderRadius: 6, padding: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function CollabMarketplace() {
  const [services, setServices] = useState(MOCK_SERVICES);
  const [view, setView] = useState('browse');
  const [filterRole, setFilterRole] = useState('All');
  const [filterGenre, setFilterGenre] = useState('All');
  const [filterBudget, setFilterBudget] = useState('Any Budget');
  const [sortBy, setSortBy] = useState('Top Rated');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showList, setShowList] = useState(false);
  const [orders, setOrders] = useState([]);
  const [myServices, setMyServices] = useState([]);
  const [notification, setNotif] = useState('');

  const notify = msg => { setNotif(msg); setTimeout(() => setNotif(''), 3000); };

  const handleBook = (service, message) => {
    setOrders(prev => [...prev, { ...service, orderId: `ORD-${Date.now()}`, status: 'Pending', bookedAt: new Date().toLocaleDateString(), note: message }]);
    notify(`Booking sent to ${service.name}!`);
  };

  const handleList = (form) => {
    const newService = {
      id: `s-${Date.now()}`, creatorId: 'me', name: 'You', avatar: '⭐',
      role: form.role, title: form.title, price: parseFloat(form.price),
      turnaround: parseInt(form.turnaround), rating: 0, reviews: 0,
      genre: form.genre, bio: form.bio, featured: false, online: true,
      includes: form.includes.split('\n').filter(Boolean),
      portfolio: [],
    };
    setServices(prev => [newService, ...prev]);
    setMyServices(prev => [newService, ...prev]);
    notify('Service listed successfully!');
  };

  const displayed = useMemo(() => {
    let list = services.filter(s => {
      if (filterRole !== 'All' && s.role !== filterRole) return false;
      if (filterGenre !== 'All' && s.genre !== filterGenre) return false;
      if (filterBudget === 'Under $50' && s.price >= 50) return false;
      if (filterBudget === '$50–$150' && (s.price < 50 || s.price > 150)) return false;
      if (filterBudget === '$150–$500' && (s.price < 150 || s.price > 500)) return false;
      if (filterBudget === '$500+' && s.price < 500) return false;
      if (search) { const q = search.toLowerCase(); return s.name.toLowerCase().includes(q) || s.title.toLowerCase().includes(q) || s.bio.toLowerCase().includes(q); }
      return true;
    });
    if (sortBy === 'Top Rated') list.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'Most Reviews') list.sort((a, b) => b.reviews - a.reviews);
    else if (sortBy === 'Price: Low') list.sort((a, b) => a.price - b.price);
    else if (sortBy === 'Price: High') list.sort((a, b) => b.price - a.price);
    else if (sortBy === 'Fastest Turnaround') list.sort((a, b) => a.turnaround - b.turnaround);
    return list;
  }, [services, filterRole, filterGenre, filterBudget, sortBy, search]);

  const navBtn = (v) => ({
    background: view === v ? '#00ffc822' : '#21262d',
    border: `1px solid ${view === v ? '#00ffc8' : '#30363d'}`,
    color: view === v ? '#00ffc8' : '#8b949e',
    borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontFamily: 'JetBrains Mono,monospace', fontSize: 11,
  });
  const sel = { background: '#21262d', border: '1px solid #30363d', borderRadius: 4, color: '#e6edf3', padding: '4px 8px', fontFamily: 'JetBrains Mono,monospace', fontSize: 11 };

  return (
    <div style={{ background: '#0d1117', color: '#e6edf3', minHeight: '100vh', fontFamily: 'JetBrains Mono,monospace', fontSize: 12 }}>
      {notification && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 2000, background: '#00ffc822', border: '1px solid #00ffc8', color: '#00ffc8', borderRadius: 6, padding: '8px 14px', fontSize: 12 }}>{notification}</div>
      )}

      {/* Header */}
      <div style={{ background: '#161b22', borderBottom: '1px solid #21262d', padding: '12px 16px' }}>
        <div style={{ maxWidth: '100%', margin: '0 auto', padding: '14px 16px' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#00ffc8', marginBottom: 10 }}>🤝 COLLAB MARKETPLACE</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <button style={navBtn('browse')} onClick={() => setView('browse')}>🏪 Browse Services</button>
            <button style={navBtn('orders')} onClick={() => setView('orders')}>📦 My Orders ({orders.length})</button>
            <button style={navBtn('my-services')} onClick={() => setView('my-services')}>⭐ My Services ({myServices.length})</button>
            <button onClick={() => setShowList(true)} style={{ marginLeft: 'auto', background: '#FF660022', border: '1px solid #FF6600', color: '#FF6600', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 }}>+ List a Service</button>
          </div>
          {view === 'browse' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <input style={{ ...sel, flex: 1, minWidth: 180, outline: 'none', padding: '4px 8px' }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              <select style={sel} value={filterRole} onChange={e => setFilterRole(e.target.value)}>{ROLES.map(r => <option key={r}>{r}</option>)}</select>
              <select style={sel} value={filterGenre} onChange={e => setFilterGenre(e.target.value)}>{GENRES.map(g => <option key={g}>{g}</option>)}</select>
              <select style={sel} value={filterBudget} onChange={e => setFilterBudget(e.target.value)}>{BUDGETS.map(b => <option key={b}>{b}</option>)}</select>
              <select style={sel} value={sortBy} onChange={e => setSortBy(e.target.value)}>{SORT_OPTIONS.map(s => <option key={s}>{s}</option>)}</select>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 16px' }}>
        {view === 'browse' && (
          <>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 12 }}>{displayed.length} service{displayed.length !== 1 ? 's' : ''} found</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {displayed.map(s => <ServiceCard key={s.id} service={s} onOpen={setSelected} />)}
            </div>
          </>
        )}

        {view === 'orders' && (
          orders.length === 0
            ? <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8b949e' }}>No orders yet. Browse services and book one!</div>
            : orders.map(o => (
              <div key={o.orderId} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: '#e6edf3' }}>{o.title}</span>
                  <span style={{ fontSize: 10, background: '#FFD70022', border: '1px solid #FFD700', color: '#FFD700', borderRadius: 3, padding: '1px 6px' }}>{o.status}</span>
                </div>
                <div style={{ fontSize: 10, color: '#8b949e' }}>by {o.name} · ${o.price} · {o.turnaround}d delivery · Booked {o.bookedAt}</div>
                <div style={{ fontSize: 10, color: '#8b949e', marginTop: 2 }}>Order: {o.orderId}</div>
              </div>
            ))
        )}

        {view === 'my-services' && (
          myServices.length === 0
            ? <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8b949e' }}>You haven't listed any services yet.<br /><button onClick={() => setShowList(true)} style={{ marginTop: 10, background: '#00ffc822', border: '1px solid #00ffc8', color: '#00ffc8', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 }}>+ List a Service</button></div>
            : myServices.map(s => (
              <div key={s.id} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, color: '#e6edf3', marginBottom: 2 }}>{s.title}</div>
                <div style={{ fontSize: 10, color: '#8b949e' }}>{s.role} · ${s.price} · {s.turnaround}d delivery</div>
              </div>
            ))
        )}
      </div>

      {selected && <ServiceDetail service={selected} onClose={() => setSelected(null)} onBook={handleBook} />}
      {showList && <ListServiceModal onClose={() => setShowList(false)} onSubmit={handleList} />}
    </div>
  );
}
