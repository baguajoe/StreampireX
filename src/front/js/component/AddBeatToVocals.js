/**
 * AddBeatToVocals.js
 * StreamPireX — Add AI Backing Track to Your Vocals (closes Suno v4.5 gap)
 *
 * Flow:
 *   1. Upload vocal recording (or hum/acappella)
 *   2. System detects pitch/key + rough tempo
 *   3. Choose genre, feel, instrumentation style
 *   4. Credits deducted (20 credits)
 *   5. POST /api/ai/add-beat → backend calls:
 *        a. librosa pitch/tempo analysis
 *        b. Replicate musicgen-melody (uses vocal as melodic conditioning)
 *        c. ffmpeg mix: backing track under vocals
 *        d. Return mixed URL + isolated beat URL
 *   6. Play, download, send to DAW
 *
 * Route:  /ai-add-beat
 * Credits: 20 per generation
 * Backend: POST /api/ai/add-beat  (multipart)
 */

import React, { useState, useRef, useCallback } from 'react';

const GENRES = [
  { id:'hip_hop',    label:'Hip-Hop',       icon:'🎤', bpmRange:'80–100' },
  { id:'trap',       label:'Trap',          icon:'🔥', bpmRange:'130–150' },
  { id:'rnb',        label:'R&B',           icon:'💜', bpmRange:'70–95'  },
  { id:'pop',        label:'Pop',           icon:'✨', bpmRange:'100–130' },
  { id:'afrobeats',  label:'Afrobeats',     icon:'🌍', bpmRange:'95–110' },
  { id:'gospel',     label:'Gospel',        icon:'🙌', bpmRange:'70–90'  },
  { id:'drill',      label:'Drill',         icon:'💀', bpmRange:'140–150' },
  { id:'lofi',       label:'Lo-Fi',         icon:'☕', bpmRange:'70–90'  },
  { id:'dancehall',  label:'Dancehall',     icon:'🌴', bpmRange:'80–100' },
  { id:'soul',       label:'Soul',          icon:'🎷', bpmRange:'65–90'  },
  { id:'country',    label:'Country',       icon:'🤠', bpmRange:'90–120' },
  { id:'house',      label:'House',         icon:'🏠', bpmRange:'120–132' },
];

const FEELS = [
  { id:'dark',      label:'Dark & Moody',   icon:'🌑' },
  { id:'uplifting', label:'Uplifting',      icon:'☀️' },
  { id:'aggressive',label:'Aggressive',     icon:'💢' },
  { id:'chill',     label:'Chill',          icon:'😌' },
  { id:'romantic',  label:'Romantic',       icon:'💕' },
  { id:'epic',      label:'Epic / Cinematic',icon:'🎬' },
];

const INSTRUMENT_SETS = [
  { id:'minimal',   label:'Minimal',     desc:'Drums + 808 only'              },
  { id:'standard',  label:'Standard',    desc:'Drums, bass, chords, melody'   },
  { id:'full',      label:'Full Band',   desc:'Everything + strings/horns'    },
  { id:'acoustic',  label:'Acoustic',    desc:'Guitar, piano, light percussion'},
  { id:'electronic',label:'Electronic',  desc:'Synths, pads, programmed drums' },
];

const CREDIT_COST = 20;

// ── Drop Zone ─────────────────────────────────────────────────────────────────
function DropZone({ onFile, file, label }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border:`2px dashed ${dragging ? '#FF6600' : file ? '#FF660044' : '#30363d'}`,
        borderRadius:12, padding:'28px 20px', textAlign:'center', cursor:'pointer',
        background: dragging ? '#FF660808' : file ? '#FF660404' : '#161b22',
        transition:'all 0.2s',
      }}
    >
      <input ref={inputRef} type="file" accept="audio/*" style={{ display:'none' }}
        onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
      {file ? (
        <>
          <div style={{ fontSize:28, marginBottom:6 }}>🎙</div>
          <div style={{ fontSize:12, fontWeight:700, color:'#FF6600', fontFamily:'JetBrains Mono,monospace' }}>{file.name}</div>
          <div style={{ fontSize:10, color:'#8b949e', marginTop:3 }}>{(file.size/1024/1024).toFixed(1)} MB · Click to change</div>
        </>
      ) : (
        <>
          <div style={{ fontSize:36, marginBottom:8 }}>🎙</div>
          <div style={{ fontSize:13, fontWeight:700, color:'#e6edf3', fontFamily:'JetBrains Mono,monospace', marginBottom:3 }}>{label}</div>
          <div style={{ fontSize:11, color:'#8b949e' }}>MP3, WAV, AIFF · Acappella, hum, or any vocal recording</div>
          <div style={{ marginTop:10, display:'inline-block', background:'#21262d', border:'1px solid #30363d', borderRadius:5, padding:'4px 12px', color:'#8b949e', fontSize:11 }}>Browse files</div>
        </>
      )}
    </div>
  );
}

// ── Detected Vocal Info ────────────────────────────────────────────────────────
function VocalInfo({ info }) {
  if (!info) return null;
  return (
    <div style={{ display:'flex', gap:8, marginTop:10 }}>
      {[['KEY', info.key],['TEMPO EST.', info.bpm ? `~${info.bpm} BPM` : 'Detected'],['DURATION', `${Math.floor(info.duration || 0)}s`]].map(([l,v]) => (
        <div key={l} style={{ flex:1, background:'#161b22', border:'1px solid #21262d', borderRadius:6, padding:'6px', textAlign:'center' }}>
          <div style={{ fontSize:8, color:'#8b949e', letterSpacing:2, fontFamily:'JetBrains Mono,monospace' }}>{l}</div>
          <div style={{ fontSize:13, fontWeight:700, color:'#FF6600', fontFamily:'JetBrains Mono,monospace' }}>{v || '—'}</div>
        </div>
      ))}
    </div>
  );
}

// ── Result Player ─────────────────────────────────────────────────────────────
function ResultPlayer({ result, onSaveToDaw }) {
  const [playing, setPlaying] = useState(false);
  const [prog, setProg]       = useState(0);
  const [showBeat, setShowBeat] = useState(false);
  const mainRef = useRef(null);
  const beatRef = useRef(null);

  const toggle = (ref, setter, other) => {
    if (other?.current && !other.current.paused) other.current.pause();
    if (!ref.current) return;
    if (ref.current.paused) { ref.current.play(); setter(true); }
    else { ref.current.pause(); setter(false); }
  };

  const PlayerBar = ({ label, url, color, playing, onToggle }) => (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderBottom:'1px solid #21262d' }}>
      <button onClick={onToggle} style={{
        background:`${color}22`, border:`1px solid ${color}44`, color,
        borderRadius:'50%', width:30, height:30, cursor:'pointer', fontSize:12,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>{playing ? '⏸' : '▶'}</button>
      <span style={{ fontSize:11, color:'#e6edf3', flex:1, fontFamily:'JetBrains Mono,monospace' }}>{label}</span>
      <a href={url} download style={{
        background:'#21262d', border:'1px solid #30363d', color:'#8b949e',
        borderRadius:4, padding:'3px 8px', textDecoration:'none', fontSize:9, fontFamily:'JetBrains Mono,monospace',
      }}>⬇</a>
    </div>
  );

  return (
    <div style={{ background:'#161b22', border:'2px solid #FF6600', borderRadius:12, overflow:'hidden', marginTop:16 }}>
      <div style={{ height:3, background:'linear-gradient(90deg, #FF6600, #FFD700, #00ffc8)' }} />
      <div style={{ padding:'14px 16px' }}>
        <div style={{ fontSize:13, fontWeight:900, color:'#FF6600', fontFamily:'JetBrains Mono,monospace', marginBottom:2 }}>
          ✅ Beat Generated — {result.title}
        </div>
        <div style={{ fontSize:10, color:'#8b949e', marginBottom:12 }}>
          {result.genre} · {result.feel} · {result.bpm} BPM · {result.instruments}
        </div>

        <audio ref={mainRef} src={result.mixed_url}
          onTimeUpdate={e => setProg((e.target.currentTime / e.target.duration)*100||0)}
          onEnded={() => { setPlaying(false); setProg(0); }} />
        <audio ref={beatRef} src={result.beat_url} />

        {/* Progress */}
        <div style={{ height:2, background:'#21262d', borderRadius:1, marginBottom:10 }}>
          <div style={{ height:'100%', width:`${prog}%`, background:'#FF6600', borderRadius:1, transition:'width 0.1s' }} />
        </div>

        <PlayerBar label="🎵 Full Mix (Vocals + Beat)" url={result.mixed_url} color="#FF6600"
          playing={playing}
          onToggle={() => { toggle(mainRef, setPlaying); }} />
        <PlayerBar label="🥁 Beat Only" url={result.beat_url} color="#7C3AED"
          playing={showBeat}
          onToggle={() => toggle(beatRef, setShowBeat)} />

        <button onClick={() => onSaveToDaw(result)} style={{
          marginTop:10, width:'100%', background:'#FF660022', border:'1px solid #FF6600',
          color:'#FF6600', borderRadius:6, padding:'8px', cursor:'pointer',
          fontFamily:'JetBrains Mono,monospace', fontSize:12, fontWeight:700,
        }}>→ Open in DAW</button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AddBeatToVocals() {
  const [vocalFile, setVocalFile]   = useState(null);
  const [vocalInfo, setVocalInfo]   = useState(null);
  const [analyzing, setAnalyzing]   = useState(false);
  const [genre, setGenre]           = useState('hip_hop');
  const [feel, setFeel]             = useState('dark');
  const [instruments, setInstruments] = useState('standard');
  const [customBpm, setCustomBpm]   = useState('');
  const [autoTempo, setAutoTempo]   = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genProg, setGenProg]       = useState(0);
  const [genMsg, setGenMsg]         = useState('');
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState('');

  const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

  const handleVocalFile = async (file) => {
    setVocalFile(file);
    setVocalInfo(null);
    setResult(null);
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${BACKEND}/api/ai/analyze-audio`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` },
        body: fd,
      });
      if (res.ok) setVocalInfo(await res.json());
    } catch { }
    setAnalyzing(false);
  };

  const generate = async () => {
    if (!vocalFile) { setError('Please upload your vocal recording first.'); return; }
    setGenerating(true); setError('');
    setGenProg(5); setGenMsg('Deducting credits...');

    try {
      const cRes = await fetch(`${BACKEND}/api/credits/deduct`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ amount: CREDIT_COST, feature: 'add_beat_to_vocals' }),
      });
      if (!cRes.ok) throw new Error('Credit deduction failed');

      setGenProg(20); setGenMsg('Analyzing your vocals...');
      const poll = setInterval(() => setGenProg(p => Math.min(p+2, 85)), 1500);

      const fd = new FormData();
      fd.append('vocal', vocalFile);
      fd.append('genre', genre);
      fd.append('feel', feel);
      fd.append('instruments', instruments);
      fd.append('auto_tempo', autoTempo);
      if (!autoTempo && customBpm) fd.append('bpm', customBpm);

      const res = await fetch(`${BACKEND}/api/ai/add-beat`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` },
        body: fd,
      });
      clearInterval(poll);
      if (!res.ok) { const e = await res.json(); throw new Error(e.error||'Generation failed'); }

      const data = await res.json();
      setGenProg(100); setGenMsg('Done!');
      setResult({
        title:      data.title || `${GENRES.find(g=>g.id===genre)?.label} Beat + ${vocalFile.name}`,
        mixed_url:  data.mixed_url,
        beat_url:   data.beat_url,
        genre:      GENRES.find(g=>g.id===genre)?.label,
        feel:       FEELS.find(f=>f.id===feel)?.label,
        bpm:        data.bpm || customBpm || (vocalInfo?.bpm || '?'),
        instruments:INSTRUMENT_SETS.find(i=>i.id===instruments)?.label,
      });
    } catch(e) {
      setError(e.message);
    } finally {
      setGenerating(false);
      setTimeout(()=>{ setGenProg(0); setGenMsg(''); }, 1000);
    }
  };

  const s = {
    label:  { fontSize:9, color:'#8b949e', letterSpacing:2, marginBottom:6, display:'block', fontFamily:'JetBrains Mono,monospace' },
    input:  { width:'100%', background:'#21262d', border:'1px solid #30363d', borderRadius:5, color:'#e6edf3', padding:'6px 10px', fontFamily:'JetBrains Mono,monospace', fontSize:11, outline:'none', boxSizing:'border-box' },
    section:{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'14px', marginBottom:12 },
  };

  return (
    <div style={{ background:'#0d1117', color:'#e6edf3', minHeight:'100vh', fontFamily:'JetBrains Mono,monospace' }}>
      <div style={{ background:'linear-gradient(135deg, #161b22, #0d1117)', borderBottom:'1px solid #21262d', padding:'16px 20px' }}>
        <div style={{ maxWidth:780, margin:'0 auto', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ fontSize:32 }}>🎸</div>
          <div>
            <div style={{ fontSize:20, fontWeight:900, color:'#FF6600', letterSpacing:1 }}>ADD BEAT TO YOUR VOCALS</div>
            <div style={{ fontSize:11, color:'#8b949e' }}>Upload any vocal → AI builds a full beat around it · {CREDIT_COST} credits</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:780, margin:'0 auto', padding:'16px 20px' }}>
        {/* Step 1 */}
        <div style={s.section}>
          <span style={{ ...s.label, color:'#FF6600' }}>STEP 1 — UPLOAD YOUR VOCAL</span>
          <DropZone onFile={handleVocalFile} file={vocalFile} label="Drop your vocal recording here" />
          {analyzing && <div style={{ fontSize:11, color:'#8b949e', marginTop:8, textAlign:'center' }}>🔍 Detecting pitch and tempo...</div>}
          <VocalInfo info={vocalInfo} />
          <div style={{ marginTop:10, fontSize:10, color:'#8b949e' }}>
            Works with: raw recordings, humming, acappella, voice memos — anything with your voice
          </div>
        </div>

        {/* Step 2 — Genre */}
        <div style={s.section}>
          <span style={{ ...s.label, color:'#FF6600' }}>STEP 2 — CHOOSE GENRE</span>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:6 }}>
            {GENRES.map(g => (
              <div key={g.id} onClick={() => setGenre(g.id)} style={{
                background: genre===g.id ? '#FF660011' : '#0d1117',
                border:`1px solid ${genre===g.id ? '#FF6600' : '#21262d'}`,
                borderRadius:7, padding:'7px 8px', cursor:'pointer', textAlign:'center', transition:'all 0.15s',
              }}>
                <div style={{ fontSize:18, marginBottom:2 }}>{g.icon}</div>
                <div style={{ fontSize:9, fontWeight:700, color: genre===g.id ? '#FF6600' : '#e6edf3', fontFamily:'JetBrains Mono,monospace' }}>{g.label}</div>
                <div style={{ fontSize:8, color:'#8b949e' }}>{g.bpmRange}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3 — Feel + Instruments */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div style={s.section}>
            <span style={{ ...s.label, color:'#FF6600' }}>FEEL / MOOD</span>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {FEELS.map(f => (
                <div key={f.id} onClick={() => setFeel(f.id)} style={{
                  display:'flex', alignItems:'center', gap:8,
                  background: feel===f.id ? '#FF660011' : 'transparent',
                  border:`1px solid ${feel===f.id ? '#FF6600' : '#21262d'}`,
                  borderRadius:5, padding:'5px 8px', cursor:'pointer', transition:'all 0.15s',
                }}>
                  <span style={{ fontSize:14 }}>{f.icon}</span>
                  <span style={{ fontSize:10, color: feel===f.id ? '#FF6600' : '#e6edf3', fontFamily:'JetBrains Mono,monospace' }}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={s.section}>
            <span style={{ ...s.label, color:'#FF6600' }}>INSTRUMENTATION</span>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {INSTRUMENT_SETS.map(i => (
                <div key={i.id} onClick={() => setInstruments(i.id)} style={{
                  background: instruments===i.id ? '#FF660011' : 'transparent',
                  border:`1px solid ${instruments===i.id ? '#FF6600' : '#21262d'}`,
                  borderRadius:5, padding:'6px 8px', cursor:'pointer', transition:'all 0.15s',
                }}>
                  <div style={{ fontSize:10, fontWeight:700, color: instruments===i.id ? '#FF6600' : '#e6edf3', fontFamily:'JetBrains Mono,monospace' }}>{i.label}</div>
                  <div style={{ fontSize:9, color:'#8b949e' }}>{i.desc}</div>
                </div>
              ))}
            </div>

            {/* Manual BPM */}
            <div style={{ marginTop:10 }}>
              <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', marginBottom:6 }}>
                <input type="checkbox" checked={!autoTempo} onChange={e => setAutoTempo(!e.target.checked)} style={{ accentColor:'#FF6600' }} />
                <span style={{ fontSize:10, color:'#e6edf3' }}>Set BPM manually</span>
              </label>
              {!autoTempo && (
                <input type="number" min={60} max={200} value={customBpm}
                  onChange={e => setCustomBpm(e.target.value)}
                  placeholder="e.g. 90"
                  style={{ ...s.input, width:100 }} />
              )}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background:'#ff444422', border:'1px solid #ff4444', borderRadius:6, padding:'8px 10px', color:'#ff8888', fontSize:11, marginBottom:10 }}>
            {error}
          </div>
        )}

        <button onClick={generate} disabled={generating || !vocalFile} style={{
          width:'100%', padding:'12px', borderRadius:8,
          background: generating ? '#21262d' : 'linear-gradient(135deg, #FF6600, #FFD700)',
          border:'none', color: generating ? '#8b949e' : '#0d1117',
          fontFamily:'inherit', fontSize:14, fontWeight:900, letterSpacing:1,
          cursor: (!vocalFile||generating) ? 'not-allowed' : 'pointer',
          opacity: (!vocalFile&&!generating) ? 0.4 : 1, transition:'all 0.2s',
        }}>
          {generating ? genMsg||'Building your beat...' : `🎸 Build My Beat — ${CREDIT_COST} Credits`}
        </button>

        {generating && genProg > 0 && (
          <div style={{ marginTop:8, height:3, background:'#21262d', borderRadius:2 }}>
            <div style={{ height:'100%', borderRadius:2, width:`${genProg}%`,
              background:'linear-gradient(90deg, #FF6600, #FFD700)', transition:'width 0.5s' }} />
          </div>
        )}

        {result && (
          <ResultPlayer result={result}
            onSaveToDaw={r => alert(`"${r.title}" → DAW\n\nIn production opens RecordingStudio with both vocal and beat tracks loaded.`)} />
        )}
      </div>
    </div>
  );
}
