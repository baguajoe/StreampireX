// =============================================================================
// StemsStore.js — Sell Individual Stems & Loops
// =============================================================================
// Location: src/front/js/pages/StemsStore.js
// Routes:
//   /stems                  → Browse stems marketplace
//   /stems/sell             → Creator: list stems for sale
//
// Features:
//  - Upload stems: kick, snare, bass, melody, chord, vocal, fx, full mix
//  - Tag with key, BPM, genre, mood
//  - Price per stem or bundle pricing (all stems from a pack)
//  - Instant R2 delivery on purchase
//  - Preview player (30s watermarked preview)
//  - Filter by BPM, key, genre, stem type
//  - Reuses BeatStore infrastructure (BeatPurchase model, Stripe checkout)
//  - "Load into DAW" button → sends stem directly to open RecordingStudio track
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const STEM_TYPES = [
  { id: 'all',    label: '🎵 All Stems' },
  { id: 'kick',   label: '🥁 Kick' },
  { id: 'snare',  label: '🎯 Snare' },
  { id: 'hi_hat', label: '🎶 Hi-Hat' },
  { id: 'percussion', label: '🪘 Percussion' },
  { id: 'bass',   label: '🎸 Bass' },
  { id: 'melody', label: '🎹 Melody' },
  { id: 'chord',  label: '🎼 Chords' },
  { id: 'pad',    label: '🌊 Pad' },
  { id: 'vocal',  label: '🎤 Vocal Chop' },
  { id: 'fx',     label: '⚡ FX / Riser' },
  { id: 'loop',   label: '🔄 Full Loop' },
  { id: 'drum_kit', label: '🎺 Drum Kit' },
];

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const GENRES = ['Trap', 'Hip-Hop', 'R&B', 'Drill', 'Afrobeats', 'Pop', 'Electronic', 'House', 'Lo-Fi', 'Boom Bap', 'Dancehall', 'Reggaeton', 'Gospel', 'Jazz', 'Other'];

// =============================================================================
// SELL STEMS — Creator upload/listing page
// =============================================================================
export const SellStemsPage = () => {
  const [packs, setPacks]       = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [status, setStatus]     = useState('');
  const [uploading, setUploading] = useState({});

  const [form, setForm] = useState({
    title: '', description: '', genre: 'Trap', bpm: 140, key: 'C',
    price_per_stem: 1.99, price_bundle: 9.99, stems: [],
  });

  const fileInputRef = useRef(null);

  const loadPacks = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/stems/my`, { headers: getHeaders() });
      if (res.ok) setPacks(await res.json());
    } catch (e) {}
  }, []);

  useEffect(() => { loadPacks(); }, [loadPacks]);

  const uploadStemFile = async (file, stemType) => {
    setUploading(u => ({ ...u, [stemType]: true }));
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'audio');
    try {
      const res = await fetch(`${BACKEND_URL}/api/media/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (data.url) {
        setForm(f => ({
          ...f,
          stems: f.stems.find(s => s.type === stemType)
            ? f.stems.map(s => s.type === stemType ? { ...s, url: data.url, filename: file.name } : s)
            : [...f.stems, { type: stemType, url: data.url, filename: file.name, duration: 0 }],
        }));
        setStatus(`✅ ${file.name} uploaded`);
      }
    } catch (e) { setStatus(`⚠ Upload failed: ${e.message}`); }
    finally { setUploading(u => ({ ...u, [stemType]: false })); }
  };

  const submitPack = async () => {
    if (!form.title.trim()) { setStatus('⚠ Title required'); return; }
    if (form.stems.length === 0) { setStatus('⚠ Upload at least one stem'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/stems/packs`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus('✅ Pack listed!');
      setShowForm(false);
      setForm({ title:'', description:'', genre:'Trap', bpm:140, key:'C', price_per_stem:1.99, price_bundle:9.99, stems:[] });
      loadPacks();
    } catch (e) { setStatus(`⚠ ${e.message}`); }
    finally { setSaving(false); }
  };

  const S = {
    page:    { minHeight:'100vh', background:'#0d1117', color:'#c9d1d9', fontFamily:'JetBrains Mono, Inter, monospace', padding:'24px 32px', maxWidth:900, margin:'0 auto' },
    card:    { background:'#161b22', border:'1px solid #30363d', borderRadius:8, padding:20, marginBottom:14 },
    label:   { display:'block', fontSize:'0.72rem', color:'#8b949e', marginBottom:4, fontWeight:600 },
    input:   { width:'100%', background:'#21262d', border:'1px solid #30363d', borderRadius:6, color:'#c9d1d9', padding:'8px 12px', fontSize:'0.85rem', fontFamily:'inherit', outline:'none', boxSizing:'border-box' },
    select:  { background:'#21262d', border:'1px solid #30363d', borderRadius:6, color:'#c9d1d9', padding:'8px 12px', fontSize:'0.85rem', fontFamily:'inherit', outline:'none', width:'100%' },
    btnTeal: { background:'#00ffc8', color:'#000', border:'none', borderRadius:6, padding:'8px 18px', fontWeight:700, cursor:'pointer', fontSize:'0.85rem' },
    btnGray: { background:'#21262d', color:'#c9d1d9', border:'1px solid #30363d', borderRadius:6, padding:'8px 16px', fontWeight:600, cursor:'pointer', fontSize:'0.82rem' },
    grid2:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 },
    grid4:   { display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 },
  };

  return (
    <div style={S.page}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:'1.3rem', fontWeight:700, color:'#e6edf3' }}>🎵 Sell Stems</div>
          <div style={{ fontSize:'0.75rem', color:'#5a7088', marginTop:2 }}>{packs.length} stem packs listed</div>
        </div>
        <button style={S.btnTeal} onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Close' : '+ New Stem Pack'}
        </button>
      </div>

      {status && <div style={{ color: status.startsWith('⚠') ? '#ff9500' : '#00ffc8', marginBottom:12, fontSize:'0.82rem' }}>{status}</div>}

      {/* Upload form */}
      {showForm && (
        <div style={{ ...S.card, border:'1px solid #00ffc8' }}>
          <div style={{ fontWeight:700, color:'#00ffc8', marginBottom:14 }}>New Stem Pack</div>
          <div style={{ marginBottom:12 }}>
            <label style={S.label}>Pack Title</label>
            <input style={S.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Dark Trap Kit Vol.1" />
          </div>
          <div style={{ ...S.grid4, marginBottom:12 }}>
            <div>
              <label style={S.label}>Genre</label>
              <select style={S.select} value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}>
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>BPM</label>
              <input type="number" style={S.input} value={form.bpm} onChange={e => setForm(f => ({ ...f, bpm: parseInt(e.target.value) || 140 }))} />
            </div>
            <div>
              <label style={S.label}>Key</label>
              <select style={S.select} value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))}>
                {KEYS.map(k => <option key={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Bundle Price</label>
              <input type="number" style={S.input} value={form.price_bundle} step={0.01}
                onChange={e => setForm(f => ({ ...f, price_bundle: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>

          {/* Stem upload grid */}
          <label style={S.label}>Upload Stems (WAV/MP3)</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginBottom:14 }}>
            {STEM_TYPES.filter(t => t.id !== 'all').map(stemType => {
              const existing = form.stems.find(s => s.type === stemType.id);
              return (
                <div key={stemType.id}
                  style={{ background:'#21262d', borderRadius:6, padding:'10px 12px', border:`1px solid ${existing ? '#00ffc8' : '#30363d'}`, cursor:'pointer', textAlign:'center' }}
                  onClick={() => {
                    const inp = document.createElement('input'); inp.type='file'; inp.accept='audio/*';
                    inp.onchange = e => e.target.files[0] && uploadStemFile(e.target.files[0], stemType.id);
                    inp.click();
                  }}
                >
                  <div style={{ fontSize:'1.1rem', marginBottom:3 }}>{stemType.label.split(' ')[0]}</div>
                  <div style={{ fontSize:'0.65rem', color: existing ? '#00ffc8' : '#5a7088', fontWeight:600 }}>
                    {uploading[stemType.id] ? '⏳' : existing ? '✅ ' + existing.filename?.slice(0,16) : stemType.label.slice(stemType.label.indexOf(' ')+1)}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button style={S.btnTeal} onClick={submitPack} disabled={saving}>{saving ? '...' : '🚀 List Stem Pack'}</button>
            <button style={S.btnGray} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Listed packs */}
      {packs.map(pack => (
        <div key={pack.id} style={S.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontWeight:700, color:'#e6edf3', fontSize:'1rem' }}>{pack.title}</div>
              <div style={{ fontSize:'0.72rem', color:'#5a7088', marginTop:3 }}>
                {pack.genre} · {pack.bpm} BPM · Key of {pack.key} · {pack.stems?.length || 0} stems
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ color:'#00ffc8', fontWeight:700 }}>${pack.price_bundle} bundle</div>
              <div style={{ fontSize:'0.68rem', color:'#5a7088' }}>${pack.price_per_stem}/stem</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
            {(pack.stems || []).map(s => (
              <span key={s.type} style={{ background:'rgba(0,255,200,0.1)', color:'#00ffc8', borderRadius:4, padding:'2px 8px', fontSize:'0.68rem' }}>
                {STEM_TYPES.find(t => t.id === s.type)?.label || s.type}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// BROWSE STEMS — Marketplace page
// =============================================================================
export const BrowseStemsPage = ({ onLoadToDAW }) => {
  const [packs, setPacks]         = useState([]);
  const [filters, setFilters]     = useState({ type:'all', genre:'', bpm_min:'', bpm_max:'', key:'' });
  const [loading, setLoading]     = useState(true);
  const [playing, setPlaying]     = useState(null);
  const [purchasing, setPurchasing] = useState(null);
  const audioRef                  = useRef(null);

  const loadPacks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.type && filters.type !== 'all') params.set('type', filters.type);
    if (filters.genre) params.set('genre', filters.genre);
    if (filters.bpm_min) params.set('bpm_min', filters.bpm_min);
    if (filters.bpm_max) params.set('bpm_max', filters.bpm_max);
    if (filters.key) params.set('key', filters.key);
    try {
      const res = await fetch(`${BACKEND_URL}/api/stems/browse?${params}`);
      if (res.ok) setPacks(await res.json());
    } catch (e) {}
    setLoading(false);
  }, [filters]);

  useEffect(() => { loadPacks(); }, [loadPacks]);

  const playPreview = (url, stemId) => {
    if (playing === stemId) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = url; audioRef.current.play(); }
    setPlaying(stemId);
  };

  const purchasePack = async (packId, type = 'bundle') => {
    if (!getToken()) { window.location.href = '/login'; return; }
    setPurchasing(packId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/stems/purchase`, {
        method:'POST', headers: getHeaders(),
        body: JSON.stringify({ pack_id: packId, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch (e) { alert(`⚠ ${e.message}`); }
    finally { setPurchasing(null); }
  };

  const S = {
    page:   { minHeight:'100vh', background:'#0d1117', color:'#c9d1d9', fontFamily:'JetBrains Mono, Inter, monospace', padding:'24px 32px' },
    card:   { background:'#161b22', border:'1px solid #30363d', borderRadius:8, padding:16, marginBottom:12 },
    input:  { background:'#21262d', border:'1px solid #30363d', borderRadius:6, color:'#c9d1d9', padding:'6px 10px', fontSize:'0.78rem', fontFamily:'inherit', outline:'none' },
    select: { background:'#21262d', border:'1px solid #30363d', borderRadius:6, color:'#c9d1d9', padding:'6px 10px', fontSize:'0.78rem', fontFamily:'inherit', outline:'none' },
    btnTeal:{ background:'#00ffc8', color:'#000', border:'none', borderRadius:6, padding:'6px 14px', fontWeight:700, cursor:'pointer', fontSize:'0.78rem' },
    btnGray:{ background:'#21262d', color:'#c9d1d9', border:'1px solid #30363d', borderRadius:5, padding:'5px 12px', cursor:'pointer', fontSize:'0.75rem' },
    playBtn:{ background:'#30363d', color:'#c9d1d9', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:'0.9rem', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  };

  return (
    <div style={S.page}>
      <audio ref={audioRef} onEnded={() => setPlaying(null)} style={{ display:'none' }} />

      <div style={{ fontSize:'1.3rem', fontWeight:700, color:'#e6edf3', marginBottom:16 }}>🎵 Stems Marketplace</div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:20 }}>
        <select style={S.select} value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
          {STEM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select style={S.select} value={filters.genre} onChange={e => setFilters(f => ({ ...f, genre: e.target.value }))}>
          <option value=''>All Genres</option>
          {GENRES.map(g => <option key={g}>{g}</option>)}
        </select>
        <input style={{ ...S.input, width:70 }} placeholder="Min BPM" value={filters.bpm_min} onChange={e => setFilters(f => ({ ...f, bpm_min: e.target.value }))} />
        <input style={{ ...S.input, width:70 }} placeholder="Max BPM" value={filters.bpm_max} onChange={e => setFilters(f => ({ ...f, bpm_max: e.target.value }))} />
        <select style={S.select} value={filters.key} onChange={e => setFilters(f => ({ ...f, key: e.target.value }))}>
          <option value=''>Any Key</option>
          {KEYS.map(k => <option key={k}>{k}</option>)}
        </select>
      </div>

      {loading && <div style={{ color:'#5a7088', textAlign:'center', padding:40 }}>Loading stems...</div>}

      {!loading && packs.length === 0 && (
        <div style={{ color:'#5a7088', textAlign:'center', padding:40 }}>No stems match your filters.</div>
      )}

      {packs.map(pack => (
        <div key={pack.id} style={S.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
            <div>
              <div style={{ fontWeight:700, color:'#e6edf3' }}>{pack.title}</div>
              <div style={{ fontSize:'0.7rem', color:'#5a7088', marginTop:2 }}>
                by {pack.producer_name} · {pack.genre} · {pack.bpm} BPM · {pack.key}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <button style={S.btnTeal} onClick={() => purchasePack(pack.id, 'bundle')} disabled={purchasing === pack.id}>
                {purchasing === pack.id ? '...' : `$${pack.price_bundle} Bundle`}
              </button>
              <div style={{ fontSize:'0.65rem', color:'#5a7088', marginTop:3 }}>${pack.price_per_stem}/stem</div>
            </div>
          </div>

          {/* Individual stems */}
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {(pack.stems || []).map(stem => (
              <div key={stem.type} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', background:'#21262d', borderRadius:5 }}>
                <button style={S.playBtn} onClick={() => playPreview(stem.url, `${pack.id}_${stem.type}`)}>
                  {playing === `${pack.id}_${stem.type}` ? '⏹' : '▶'}
                </button>
                <span style={{ fontSize:'0.78rem', flex:1, color:'#c9d1d9' }}>
                  {STEM_TYPES.find(t => t.id === stem.type)?.label || stem.type}
                </span>
                <span style={{ fontSize:'0.68rem', color:'#5a7088' }}>WAV</span>
                {onLoadToDAW && (
                  <button style={S.btnGray} onClick={() => onLoadToDAW(stem)}>→ DAW</button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BrowseStemsPage;