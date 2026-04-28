// FreesoundBrowser.js — Freesound.org Sample Browser
// SPX Beat Lab | StreamPireX
// Search, preview, and load royalty-free samples directly onto pads

import React, { useState, useRef, useCallback, useEffect } from 'react';

const GENRE_PRESETS = [
  { label: '70s Soul',    q: '70s soul' },
  { label: 'Funk',        q: 'funk groove' },
  { label: 'Jazz',        q: 'jazz loop' },
  { label: 'Drum Break',  q: 'drum break vintage' },
  { label: 'Rhodes',      q: 'rhodes piano' },
  { label: 'Bass',        q: 'bass hit soul' },
  { label: 'Brass',       q: 'brass stab horn' },
  { label: 'Vinyl',       q: 'vinyl crackle warm' },
  { label: 'Gospel',      q: 'gospel choir' },
  { label: 'Organ',       q: 'organ soul' },
  { label: 'Hi-Hat',      q: 'hi-hat vintage' },
  { label: 'Kick',        q: 'kick drum warm' },
  { label: 'Snare',       q: 'snare crack' },
  { label: 'Clap',        q: 'clap hand soul' },
];

const SORT_OPTIONS = [
  { value: 'score',        label: 'Relevance' },
  { value: 'downloads',    label: 'Most Downloaded' },
  { value: 'rating',       label: 'Highest Rated' },
  { value: 'created_desc', label: 'Newest' },
  { value: 'duration',     label: 'Duration' },
];

export default function FreesoundBrowser({ onLoadSample }) {
  const [query,       setQuery]       = useState('70s soul');
  const [results,     setResults]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [page,        setPage]        = useState(0);
  const [totalPages,  setTotalPages]  = useState(0);
  const [sort,        setSort]        = useState('score');
  const [maxDuration, setMaxDuration] = useState(30);
  const [playing,     setPlaying]     = useState(null);
  const [loadingPad,  setLoadingPad]  = useState(null);
  const [targetPad,   setTargetPad]   = useState(0);
  const audioRef = useRef(null);

  const search = useCallback(async (q = query, p = 0) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({
        query: q, page: p, page_size: 15,
        sort, max_duration: maxDuration,
        fields: 'id,name,username,duration,previews,license,tags,avg_rating,num_downloads',
      });
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || ""}/api/freesound/search?${params}`);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setTotalPages(Math.ceil((data.count ?? 0) / 15));
      setPage(p);
    } catch(e) {
      setError(e.message);
      setResults([]);
    } finally { setLoading(false); }
  }, [query, sort, maxDuration]);

  useEffect(() => { search('70s soul', 0); }, []); // load on mount

  const previewSound = useCallback((sound) => {
    if (playing === sound.id) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    const url = sound.previews?.['preview-hq-mp3'] || sound.previews?.['preview-lq-mp3'];
    if (!url) return;
    if (audioRef.current) { audioRef.current.pause(); }
    audioRef.current = new Audio(url);
    audioRef.current.onended = () => setPlaying(null);
    audioRef.current.play();
    setPlaying(sound.id);
  }, [playing]);

  const loadToPad = useCallback(async (sound) => {
    setLoadingPad(sound.id);
    try {
      const params = new URLSearchParams({ sound_id: sound.id });
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || ""}/api/freesound/download?${params}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      onLoadSample?.(url, sound.name, blob);
    } catch(e) {
      // Fallback: use preview URL directly
      const url = sound.previews?.['preview-hq-mp3'];
      if (url) onLoadSample?.(url, sound.name);
      else alert('Could not load sample: ' + e.message);
    } finally { setLoadingPad(null); }
  }, [onLoadSample]);

  const s = {
    container: { display:'flex', flexDirection:'column', height:'100%', background:'#06060f', color:'#e0e0e0', fontFamily:'JetBrains Mono, monospace', fontSize:11 },
    header: { padding:'8px 12px', borderBottom:'1px solid #21262d', background:'#0d1117' },
    title: { color:'#00ffc8', fontWeight:700, fontSize:13, marginBottom:6 },
    searchRow: { display:'flex', gap:6, marginBottom:6 },
    input: { flex:1, background:'#1a1a2e', border:'1px solid #21262d', borderRadius:4, color:'#e0e0e0', padding:'4px 8px', fontSize:11, fontFamily:'JetBrains Mono, monospace' },
    btn: (active) => ({ padding:'4px 10px', borderRadius:4, border:`1px solid ${active?'#00ffc8':'#21262d'}`, background:active?'#00ffc822':'#1a1a2e', color:active?'#00ffc8':'#888', cursor:'pointer', fontSize:10, fontFamily:'JetBrains Mono, monospace' }),
    presets: { display:'flex', flexWrap:'wrap', gap:4, marginBottom:4 },
    controls: { display:'flex', gap:8, alignItems:'center' },
    select: { background:'#1a1a2e', border:'1px solid #21262d', borderRadius:4, color:'#e0e0e0', padding:'3px 6px', fontSize:10, fontFamily:'JetBrains Mono, monospace' },
    results: { flex:1, overflowY:'auto', padding:'6px 8px' },
    card: { display:'flex', alignItems:'center', gap:8, padding:'6px 8px', marginBottom:4, background:'#0d1117', borderRadius:4, border:'1px solid #21262d', cursor:'pointer' },
    cardHover: { border:'1px solid #00ffc844' },
    playBtn: (active) => ({ width:28, height:28, borderRadius:'50%', border:`1px solid ${active?'#00ffc8':'#444'}`, background:active?'#00ffc822':'transparent', color:active?'#00ffc8':'#888', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }),
    info: { flex:1, minWidth:0 },
    name: { color:'#e0e0e0', fontSize:11, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
    meta: { color:'#6b7280', fontSize:9, marginTop:1 },
    loadBtn: (loading) => ({ padding:'3px 8px', borderRadius:3, border:'1px solid #FF6600', background:loading?'#FF660033':'transparent', color:'#FF6600', cursor:loading?'not-allowed':'pointer', fontSize:10, flexShrink:0 }),
    pagination: { display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'6px', borderTop:'1px solid #21262d' },
    padRow: { display:'flex', alignItems:'center', gap:6, marginTop:4 },
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}>🔊 Freesound Browser</div>
        <div style={s.searchRow}>
          <input style={s.input} value={query} onChange={e=>setQuery(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&search(query,0)} placeholder="Search samples..." />
          <button style={s.btn(false)} onClick={()=>search(query,0)}>Search</button>
        </div>
        <div style={s.presets}>
          {GENRE_PRESETS.map(p => (
            <button key={p.q} style={s.btn(query===p.q)} onClick={()=>{ setQuery(p.q); search(p.q,0); }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={s.controls}>
          <span style={{color:'#6b7280'}}>Sort:</span>
          <select style={s.select} value={sort} onChange={e=>{setSort(e.target.value);search(query,0);}}>
            {SORT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span style={{color:'#6b7280'}}>Max:</span>
          <select style={s.select} value={maxDuration} onChange={e=>{setMaxDuration(Number(e.target.value));search(query,0);}}>
            {[5,10,15,30,60].map(d=><option key={d} value={d}>{d}s</option>)}
          </select>
          <span style={{color:'#6b7280',marginLeft:'auto'}}>Pad:</span>
          <select style={s.select} value={targetPad} onChange={e=>setTargetPad(Number(e.target.value))}>
            {Array.from({length:16},(_,i)=><option key={i} value={i}>Pad {i+1}</option>)}
          </select>
        </div>
      </div>

      <div style={s.results}>
        {loading && <div style={{color:'#6b7280',textAlign:'center',padding:20}}>⟳ Searching Freesound...</div>}
        {error && <div style={{color:'#ef4444',padding:8}}>⚠ {error} — check FREESOUND_API_KEY in backend .env</div>}
        {!loading && !error && results.length === 0 && (
          <div style={{color:'#6b7280',textAlign:'center',padding:20}}>No results. Try a different search.</div>
        )}
        {results.map(sound => (
          <div key={sound.id} style={s.card}>
            <button style={s.playBtn(playing===sound.id)} onClick={()=>previewSound(sound)} title="Preview">
              {playing===sound.id ? '⏸' : '▶'}
            </button>
            <div style={s.info}>
              <div style={s.name} title={sound.name}>{sound.name}</div>
              <div style={s.meta}>
                by {sound.username} · {sound.duration?.toFixed(1)}s · ⭐{sound.avg_rating?.toFixed(1)} · ↓{sound.num_downloads?.toLocaleString()}
              </div>
              <div style={{...s.meta, color:'#4a5568', marginTop:1}}>
                {(sound.tags||[]).slice(0,4).join(' · ')}
              </div>
            </div>
            <button
              style={s.loadBtn(loadingPad===sound.id)}
              disabled={loadingPad===sound.id}
              onClick={()=>loadToPad(sound)}
              title={`Load onto Pad ${targetPad+1}`}>
              {loadingPad===sound.id ? '⟳' : `→ P${targetPad+1}`}
            </button>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={s.pagination}>
          <button style={s.btn(false)} disabled={page===0} onClick={()=>search(query,page-1)}>◀</button>
          <span style={{color:'#6b7280'}}>Page {page+1} / {totalPages}</span>
          <button style={s.btn(false)} disabled={page>=totalPages-1} onClick={()=>search(query,page+1)}>▶</button>
        </div>
      )}
    </div>
  );
}
