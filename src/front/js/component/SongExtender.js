/**
 * SongExtender.js
 * StreamPireX — AI Song Extender (closes Suno "Extend" gap)
 *
 * Flow:
 *   1. Upload a clip (your own, from DAW, or a generated song)
 *   2. Set target duration (up to 8 minutes)
 *   3. Optional: describe how you want the extension to evolve
 *   4. Credits deducted (15 credits per extension)
 *   5. POST /api/ai/extend-song → backend:
 *        a. Analyzes clip structure, BPM, key
 *        b. Replicate musicgen with continuation mode + original clip as conditioning
 *        c. ffmpeg crossfade + stitch
 *        d. Returns extended track URL
 *   6. Iterative: can extend the extension again (chain)
 *
 * Route:  /ai-extend-song
 * Credits: 15 per extension pass
 * Backend: POST /api/ai/extend-song
 */

import React, { useState, useRef, useCallback } from 'react';

const TARGET_DURATIONS = [
  { label:'30s more',  value:30,  icon:'▸'  },
  { label:'1 min more',value:60,  icon:'▶'  },
  { label:'2 min more',value:120, icon:'▶▶' },
  { label:'4 min more',value:240, icon:'▶▶▶'},
];

const EXTENSION_STYLES = [
  { id:'seamless',    label:'Seamless Continue',   desc:'AI matches your track exactly and continues naturally' },
  { id:'build',       label:'Build Up',            desc:'Adds energy, layers, and excitement as it extends' },
  { id:'breakdown',   label:'Breakdown',           desc:'Strip back to minimal, then rebuild' },
  { id:'bridge',      label:'Add a Bridge',        desc:'New melodic section before returning to the original feel' },
  { id:'outro',       label:'Fade Out Outro',      desc:'Smoothly winds down the track to a natural end' },
  { id:'variation',   label:'Variation',           desc:'Slight change in feel or instrumentation while keeping the core' },
];

const CREDIT_COST = 15;

// ── Drop Zone ─────────────────────────────────────────────────────────────────
function DropZone({ onFile, file }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);
  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border:`2px dashed ${drag ? '#7C3AED' : file ? '#7C3AED44' : '#30363d'}`,
        borderRadius:12, padding:'28px 20px', textAlign:'center', cursor:'pointer',
        background: drag ? '#7C3AED08' : file ? '#7C3AED04' : '#161b22',
        transition:'all 0.2s',
      }}
    >
      <input ref={inputRef} type="file" accept="audio/*" style={{ display:'none' }}
        onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
      {file ? (
        <>
          <div style={{ fontSize:28, marginBottom:6 }}>🎵</div>
          <div style={{ fontSize:12, fontWeight:700, color:'#a78bfa', fontFamily:'JetBrains Mono,monospace' }}>{file.name}</div>
          <div style={{ fontSize:10, color:'#8b949e', marginTop:3 }}>
            {(file.size/1024/1024).toFixed(1)} MB · Click to change
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize:36, marginBottom:8 }}>🔮</div>
          <div style={{ fontSize:13, fontWeight:700, color:'#e6edf3', fontFamily:'JetBrains Mono,monospace', marginBottom:3 }}>
            Drop your clip here
          </div>
          <div style={{ fontSize:11, color:'#8b949e' }}>Any audio clip — your beat, a generated song, a loop, anything</div>
          <div style={{ marginTop:10, display:'inline-block', background:'#21262d', border:'1px solid #30363d', borderRadius:5, padding:'4px 12px', color:'#8b949e', fontSize:11 }}>Browse files</div>
        </>
      )}
    </div>
  );
}

// ── Audio Player ──────────────────────────────────────────────────────────────
function MiniPlayer({ url, label, color = '#00ffc8' }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);
  const toggle = () => {
    if (!ref.current) return;
    if (ref.current.paused) { ref.current.play(); setPlaying(true); }
    else { ref.current.pause(); setPlaying(false); }
  };
  function fmt(s) { return `${Math.floor((s||0)/60)}:${String(Math.floor((s||0)%60)).padStart(2,'0')}`; }
  return (
    <div style={{ background:'#0d1117', borderRadius:8, padding:'8px 10px' }}>
      <audio ref={ref} src={url}
        onTimeUpdate={e => setProg((e.target.currentTime/e.target.duration)*100||0)}
        onEnded={() => { setPlaying(false); setProg(0); }} />
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
        <button onClick={toggle} style={{
          background:`${color}22`, border:`1px solid ${color}44`, color,
          borderRadius:'50%', width:28, height:28, fontSize:12, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>{playing ? '⏸' : '▶'}</button>
        <span style={{ fontSize:10, color:'#e6edf3', flex:1, fontFamily:'JetBrains Mono,monospace' }}>{label}</span>
        <span style={{ fontSize:9, color:'#8b949e', fontFamily:'JetBrains Mono,monospace' }}>
          {fmt(ref.current?.currentTime)} / {fmt(ref.current?.duration)}
        </span>
        <a href={url} download style={{
          background:'#21262d', border:'1px solid #30363d', color:'#8b949e',
          borderRadius:3, padding:'2px 6px', textDecoration:'none', fontSize:9,
        }}>⬇</a>
      </div>
      <div style={{ height:2, background:'#21262d', borderRadius:1 }}>
        <div style={{ height:'100%', width:`${prog}%`, background:color, borderRadius:1, transition:'width 0.1s' }} />
      </div>
    </div>
  );
}

// ── Extension Chain ────────────────────────────────────────────────────────────
function ExtensionChain({ chain, onExtendAgain }) {
  return (
    <div style={{ marginTop:16 }}>
      <div style={{ fontSize:9, color:'#8b949e', letterSpacing:2, marginBottom:8, fontFamily:'JetBrains Mono,monospace' }}>EXTENSION CHAIN</div>
      <div style={{ position:'relative' }}>
        {chain.map((item, i) => (
          <div key={item.id} style={{ display:'flex', alignItems:'stretch', marginBottom:6 }}>
            {/* Timeline dot + line */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginRight:10, flexShrink:0, width:16 }}>
              <div style={{
                width:12, height:12, borderRadius:'50%', flexShrink:0,
                background: i === chain.length-1 ? '#7C3AED' : '#21262d',
                border:`2px solid ${i === chain.length-1 ? '#7C3AED' : '#30363d'}`,
                marginTop:4,
              }} />
              {i < chain.length - 1 && <div style={{ flex:1, width:2, background:'#21262d', minHeight:8 }} />}
            </div>

            {/* Card */}
            <div style={{
              flex:1, background:'#161b22', border:`1px solid ${i===chain.length-1 ? '#7C3AED44' : '#21262d'}`,
              borderRadius:8, padding:'8px 10px', marginBottom:2,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <span style={{ fontSize:10, fontWeight:700, color: i===chain.length-1 ? '#a78bfa' : '#8b949e', fontFamily:'JetBrains Mono,monospace' }}>
                  {i === 0 ? '📁 Original' : `🔮 Extension ${i}`}
                </span>
                <span style={{ fontSize:9, color:'#8b949e' }}>{item.duration}s · {item.style}</span>
              </div>
              <MiniPlayer url={item.url} label={item.label} color={i===chain.length-1 ? '#a78bfa' : '#8b949e'} />
            </div>
          </div>
        ))}
      </div>

      {/* Extend again */}
      <button onClick={() => onExtendAgain(chain[chain.length-1])} style={{
        width:'100%', marginTop:4, background:'#7C3AED22', border:'1px dashed #7C3AED',
        color:'#a78bfa', borderRadius:8, padding:'8px', cursor:'pointer',
        fontFamily:'JetBrains Mono,monospace', fontSize:11,
      }}>🔮 Extend this further</button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SongExtender() {
  const [clipFile, setClipFile]       = useState(null);
  const [clipInfo, setClipInfo]       = useState(null);
  const [analyzing, setAnalyzing]     = useState(false);
  const [targetDuration, setTargetDuration] = useState(60);
  const [extStyle, setExtStyle]       = useState('seamless');
  const [promptGuide, setPromptGuide] = useState('');
  const [generating, setGenerating]   = useState(false);
  const [genProg, setGenProg]         = useState(0);
  const [genMsg, setGenMsg]           = useState('');
  const [chain, setChain]             = useState([]);
  const [error, setError]             = useState('');
  const [credits, setCredits]         = useState(null);

  const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

  const handleClipFile = async (file) => {
    setClipFile(file);
    setClipInfo(null);
    setChain([{ id:'original', url: URL.createObjectURL(file), label:file.name, duration:'?', style:'source' }]);
    setAnalyzing(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch(`${BACKEND}/api/ai/analyze-audio`, {
        method:'POST', headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` }, body:fd,
      });
      if (res.ok) {
        const d = await res.json();
        setClipInfo(d);
        setChain(prev => [{...prev[0], duration: Math.floor(d.duration||0)+'s', bpm:d.bpm, key:d.key}]);
      }
    } catch {}
    setAnalyzing(false);
  };

  const doExtend = async (sourceItem) => {
    setGenerating(true); setError('');
    setGenProg(5); setGenMsg('Deducting credits...');

    try {
      const cRes = await fetch(`${BACKEND}/api/credits/deduct`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ amount: CREDIT_COST, feature: 'song_extender' }),
      });
      if (!cRes.ok) throw new Error('Credit deduction failed');

      setGenProg(20); setGenMsg('Analyzing structure...');
      const poll = setInterval(() => setGenProg(p => Math.min(p+2, 85)), 1500);

      let body;
      if (sourceItem.url.startsWith('blob:')) {
        // Local file upload
        const fd = new FormData();
        fd.append('clip', clipFile);
        fd.append('target_duration', targetDuration);
        fd.append('style', extStyle);
        fd.append('prompt_guide', promptGuide);
        body = fd;
      } else {
        // URL-based (from previous extension)
        body = new FormData();
        body.append('clip_url', sourceItem.url);
        body.append('target_duration', targetDuration);
        body.append('style', extStyle);
        body.append('prompt_guide', promptGuide);
      }

      const res = await fetch(`${BACKEND}/api/ai/extend-song`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` },
        body,
      });
      clearInterval(poll);
      if (!res.ok) { const e = await res.json(); throw new Error(e.error||'Extension failed'); }
      const data = await res.json();
      setGenProg(100); setGenMsg('Done!');

      const newItem = {
        id:       Date.now(),
        url:      data.url,
        label:    `+${targetDuration}s — ${EXTENSION_STYLES.find(s=>s.id===extStyle)?.label}`,
        duration: `+${targetDuration}s`,
        style:    EXTENSION_STYLES.find(s=>s.id===extStyle)?.label,
      };
      setChain(prev => [...prev, newItem]);
    } catch(e) {
      setError(e.message);
    } finally {
      setGenerating(false);
      setTimeout(()=>{ setGenProg(0); setGenMsg(''); }, 1000);
    }
  };

  const s = {
    label:   { fontSize:9, color:'#8b949e', letterSpacing:2, marginBottom:6, display:'block', fontFamily:'JetBrains Mono,monospace' },
    input:   { width:'100%', background:'#21262d', border:'1px solid #30363d', borderRadius:5, color:'#e6edf3', padding:'6px 10px', fontFamily:'JetBrains Mono,monospace', fontSize:11, outline:'none', boxSizing:'border-box' },
    section: { background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'14px', marginBottom:12 },
  };

  return (
    <div style={{ background:'#0d1117', color:'#e6edf3', minHeight:'100vh', fontFamily:'JetBrains Mono,monospace' }}>
      <div style={{ background:'linear-gradient(135deg, #161b22, #0d1117)', borderBottom:'1px solid #21262d', padding:'16px 20px' }}>
        <div style={{ maxWidth:820, margin:'0 auto', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ fontSize:32 }}>🔮</div>
          <div>
            <div style={{ fontSize:20, fontWeight:900, color:'#a78bfa', letterSpacing:1 }}>AI SONG EXTENDER</div>
            <div style={{ fontSize:11, color:'#8b949e' }}>Extend any clip into a full track — up to 8 min · {CREDIT_COST} credits per pass</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:820, margin:'0 auto', padding:'16px 20px', display:'grid', gridTemplateColumns:'1fr 360px', gap:20 }}>
        {/* Left: Controls */}
        <div>
          {/* Step 1 */}
          <div style={s.section}>
            <span style={{ ...s.label, color:'#a78bfa' }}>STEP 1 — UPLOAD YOUR CLIP</span>
            <DropZone onFile={handleClipFile} file={clipFile} />
            {analyzing && <div style={{ fontSize:11, color:'#8b949e', marginTop:8, textAlign:'center' }}>🔍 Analyzing structure...</div>}
            {clipInfo && (
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                {[['BPM',clipInfo.bpm],['KEY',clipInfo.key],['LENGTH',`${Math.floor(clipInfo.duration||0)}s`]].map(([l,v]) => (
                  <div key={l} style={{ flex:1, background:'#0d1117', border:'1px solid #21262d', borderRadius:5, padding:'5px', textAlign:'center' }}>
                    <div style={{ fontSize:8, color:'#8b949e', letterSpacing:2 }}>{l}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#a78bfa' }}>{v||'—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 2 — Extension style */}
          <div style={s.section}>
            <span style={{ ...s.label, color:'#a78bfa' }}>STEP 2 — HOW TO EXTEND</span>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {EXTENSION_STYLES.map(es => (
                <div key={es.id} onClick={() => setExtStyle(es.id)} style={{
                  background: extStyle===es.id ? '#7C3AED11' : 'transparent',
                  border:`1px solid ${extStyle===es.id ? '#7C3AED' : '#21262d'}`,
                  borderRadius:6, padding:'7px 10px', cursor:'pointer', transition:'all 0.15s',
                }}>
                  <div style={{ fontSize:11, fontWeight:700, color: extStyle===es.id ? '#a78bfa' : '#e6edf3', fontFamily:'JetBrains Mono,monospace' }}>{es.label}</div>
                  <div style={{ fontSize:9, color:'#8b949e', marginTop:1 }}>{es.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3 — Target duration */}
          <div style={s.section}>
            <span style={{ ...s.label, color:'#a78bfa' }}>STEP 3 — HOW MUCH TO ADD</span>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {TARGET_DURATIONS.map(d => (
                <button key={d.value} onClick={() => setTargetDuration(d.value)} style={{
                  flex:1, minWidth:80, background: targetDuration===d.value ? '#7C3AED22' : '#21262d',
                  border:`1px solid ${targetDuration===d.value ? '#7C3AED' : '#30363d'}`,
                  color: targetDuration===d.value ? '#a78bfa' : '#8b949e',
                  borderRadius:6, padding:'8px', cursor:'pointer', fontFamily:'inherit', fontSize:11,
                }}>{d.icon} {d.label}</button>
              ))}
            </div>
          </div>

          {/* Step 4 — Optional prompt */}
          <div style={s.section}>
            <span style={{ ...s.label, color:'#a78bfa' }}>STEP 4 — GUIDE THE EXTENSION (OPTIONAL)</span>
            <textarea value={promptGuide} onChange={e => setPromptGuide(e.target.value)}
              placeholder="e.g. add a piano solo, bring in strings, drop into a half-time feel..."
              style={{ ...s.input, minHeight:60, resize:'vertical' }} />
          </div>

          {error && (
            <div style={{ background:'#ff444422', border:'1px solid #ff4444', borderRadius:6, padding:'8px 10px', color:'#ff8888', fontSize:11, marginBottom:10 }}>{error}</div>
          )}

          <button onClick={() => doExtend(chain[chain.length-1] || { url:'', label:'' })}
            disabled={generating || !clipFile} style={{
            width:'100%', padding:'12px', borderRadius:8,
            background: generating ? '#21262d' : 'linear-gradient(135deg, #7C3AED, #a78bfa)',
            border:'none', color: generating ? '#8b949e' : '#fff',
            fontFamily:'inherit', fontSize:14, fontWeight:900, letterSpacing:1,
            cursor:(!clipFile||generating) ? 'not-allowed' : 'pointer',
            opacity:(!clipFile&&!generating) ? 0.4 : 1, transition:'all 0.2s',
          }}>
            {generating ? genMsg||'Extending...' : `🔮 Extend Song — ${CREDIT_COST} Credits`}
          </button>

          {generating && genProg > 0 && (
            <div style={{ marginTop:8, height:3, background:'#21262d', borderRadius:2 }}>
              <div style={{ height:'100%', borderRadius:2, width:`${genProg}%`,
                background:'linear-gradient(90deg, #7C3AED, #a78bfa)', transition:'width 0.5s' }} />
            </div>
          )}
        </div>

        {/* Right: Extension chain */}
        <div>
          {chain.length > 0 ? (
            <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'14px', position:'sticky', top:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#a78bfa', marginBottom:4, fontFamily:'JetBrains Mono,monospace' }}>🔮 Extension Chain</div>
              <div style={{ fontSize:10, color:'#8b949e', marginBottom:12 }}>
                Keep extending any version in the chain. Each pass costs {CREDIT_COST} credits.
              </div>
              <ExtensionChain chain={chain} onExtendAgain={(item) => doExtend(item)} />

              {chain.length > 1 && (
                <a href={chain[chain.length-1].url} download="extended_song.mp3" style={{
                  display:'block', marginTop:12, background:'#7C3AED22', border:'1px solid #7C3AED',
                  color:'#a78bfa', borderRadius:6, padding:'8px', textAlign:'center',
                  textDecoration:'none', fontFamily:'JetBrains Mono,monospace', fontSize:11, fontWeight:700,
                }}>⬇ Download Final Extended Track</a>
              )}
            </div>
          ) : (
            <div style={{ background:'#161b22', border:'1px dashed #30363d', borderRadius:10, padding:'24px', textAlign:'center', color:'#8b949e', fontSize:11 }}>
              Upload a clip to start your extension chain.<br/><br/>
              <span style={{ fontSize:24 }}>🔮</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
