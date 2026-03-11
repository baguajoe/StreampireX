import React, { useState, useEffect, useContext } from 'react';
import { Context } from '../store/appContext';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const ROLES = ['producer', 'vocalist', 'beatmaker', 'mixing engineer', 'guitarist', 'drummer', 'songwriter', 'rapper'];
const GENRES = ['Hip Hop', 'R&B', 'Pop', 'Electronic', 'Rock', 'Jazz', 'Lo-Fi', 'Trap', 'Afrobeats', 'Soul'];

const token = () => localStorage.getItem('token');
const hdrs  = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

export default function CollabFeed() {
  const { store } = useContext(Context);
  const [feed, setFeed]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [applyModal, setApplyModal] = useState(null);
  const [applyMsg, setApplyMsg]   = useState('');
  const [form, setForm] = useState({
    role: 'producer', looking_for: 'vocalist',
    title: '', description: '', genre: '', sample_url: ''
  });

  const fetchFeed = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterRole)  params.set('role', filterRole);
    if (filterGenre) params.set('genre', filterGenre);
    const res = await fetch(`${BACKEND}/api/collab/feed?${params}`);
    const data = await res.json();
    setFeed(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchFeed(); }, [filterRole, filterGenre]);

  const handlePost = async () => {
    if (!form.title) return alert('Title required');
    await fetch(`${BACKEND}/api/collab/post`, {
      method: 'POST', headers: hdrs(), body: JSON.stringify(form)
    });
    setShowForm(false);
    fetchFeed();
  };

  const handleApply = async () => {
    if (!applyModal) return;
    await fetch(`${BACKEND}/api/collab/${applyModal.id}/apply`, {
      method: 'POST', headers: hdrs(),
      body: JSON.stringify({ message: applyMsg })
    });
    setApplyModal(null);
    setApplyMsg('');
    alert('Application sent!');
  };

  const S = {
    page:    { minHeight: '100vh', background: '#0d1117', color: '#e6edf3', padding: '24px', fontFamily: 'system-ui' },
    header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title:   { fontSize: '1.6rem', fontWeight: 800, color: '#00ffc8', margin: 0 },
    btn:     { background: 'linear-gradient(135deg,#00ffc8,#00a896)', border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, padding: '10px 20px', cursor: 'pointer', fontSize: '0.85rem' },
    filters: { display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
    select:  { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', padding: '8px 12px', fontSize: '0.85rem' },
    card:    { background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: 20, marginBottom: 16 },
    tag:     (c) => ({ background: c + '20', color: c, border: `1px solid ${c}40`, borderRadius: 6, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }),
    modal:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    mbox:    { background: '#161b22', border: '1px solid #30363d', borderRadius: 16, padding: 32, width: '90%', maxWidth: 520 },
    input:   { width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', padding: '10px 12px', fontSize: '0.85rem', marginBottom: 12, boxSizing: 'border-box' },
    textarea:{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', padding: '10px 12px', fontSize: '0.85rem', marginBottom: 12, boxSizing: 'border-box', minHeight: 80, resize: 'vertical' },
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>🤝 Collab Board</h1>
        {store.token && <button style={S.btn} onClick={() => setShowForm(true)}>+ Post Collab Request</button>}
      </div>

      {/* Filters */}
      <div style={S.filters}>
        <select style={S.select} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">All Roles Needed</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select style={S.select} value={filterGenre} onChange={e => setFilterGenre(e.target.value)}>
          <option value="">All Genres</option>
          {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#5a7088' }}>Loading...</div>
      ) : feed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#5a7088' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎵</div>
          <p>No collab requests yet. Be the first to post!</p>
        </div>
      ) : feed.map(req => (
        <div key={req.id} style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>{req.title}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={S.tag('#00ffc8')}>I am: {req.role}</span>
                <span style={S.tag('#FF6600')}>Need: {req.looking_for}</span>
                {req.genre && <span style={S.tag('#7b61ff')}>{req.genre}</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#5a7088' }}>
              <div>@{req.user?.username}</div>
              <div>{req.application_count || 0} applicants</div>
            </div>
          </div>
          {req.description && <p style={{ color: '#8b949e', fontSize: '0.85rem', margin: '8px 0' }}>{req.description}</p>}
          {req.sample_url && (
            <audio controls style={{ width: '100%', marginTop: 8, height: 32 }}>
              <source src={req.sample_url} />
            </audio>
          )}
          {store.token && req.user?.id !== store.user?.id && (
            <button style={{ ...S.btn, marginTop: 12, padding: '7px 16px', fontSize: '0.78rem' }}
              onClick={() => setApplyModal(req)}>
              Apply to Collab
            </button>
          )}
        </div>
      ))}

      {/* Post Form Modal */}
      {showForm && (
        <div style={S.modal} onClick={() => setShowForm(false)}>
          <div style={S.mbox} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#00ffc8', marginTop: 0 }}>Post Collab Request</h2>
            <input style={S.input} placeholder="Title (e.g. Looking for a female vocalist for R&B track)"
              value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <select style={{...S.select, flex:1}} value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="">I am a...</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select style={{...S.select, flex:1}} value={form.looking_for} onChange={e => setForm({...form, looking_for: e.target.value})}>
                <option value="">Looking for...</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <select style={{...S.select, width:'100%', marginBottom:12}} value={form.genre} onChange={e => setForm({...form, genre: e.target.value})}>
              <option value="">Genre (optional)</option>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <textarea style={S.textarea} placeholder="Describe what you're working on..."
              value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            <input style={S.input} placeholder="Sample audio URL (optional)"
              value={form.sample_url} onChange={e => setForm({...form, sample_url: e.target.value})} />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button style={{...S.btn, background:'#21262d', color:'#e6edf3'}} onClick={() => setShowForm(false)}>Cancel</button>
              <button style={S.btn} onClick={handlePost}>Post Request</button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {applyModal && (
        <div style={S.modal} onClick={() => setApplyModal(null)}>
          <div style={S.mbox} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#00ffc8', marginTop: 0 }}>Apply to Collab</h2>
            <p style={{ color: '#8b949e' }}>"{applyModal.title}" by @{applyModal.user?.username}</p>
            <textarea style={S.textarea} placeholder="Tell them about yourself and why you'd be a great fit..."
              value={applyMsg} onChange={e => setApplyMsg(e.target.value)} />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button style={{...S.btn, background:'#21262d', color:'#e6edf3'}} onClick={() => setApplyModal(null)}>Cancel</button>
              <button style={S.btn} onClick={handleApply}>Send Application</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
