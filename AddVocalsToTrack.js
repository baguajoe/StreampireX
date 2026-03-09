/**
 * AddVocalsToTrack.js
 * StreamPireX — Add AI Vocals to Your Beat (closes Suno v4.5 gap)
 *
 * Flow:
 *   1. Upload instrumental beat (mp3/wav)
 *   2. System detects BPM + key automatically
 *   3. Choose vocal style, write or auto-generate lyrics
 *   4. Credits deducted (20 credits)
 *   5. POST /api/ai/add-vocals → backend:
 *        a. Analyzes beat BPM/key via librosa
 *        b. Generates sung vocal performance via ElevenLabs
 *        c. Mixes vocals over instrumental with ffmpeg
 *        d. Returns mixed track URL + isolated vocal URL
 *   6. Play mixed result, download, or send to DAW
 *
 * Route:  /ai-add-vocals
 * Credits: 20 per generation
 * Backend: POST /api/ai/add-vocals  (multipart: file + JSON params)
 */

import React, { useState, useRef, useCallback } from 'react';

const VOCAL_STYLES = [
  { id:'male_rap',     label:'Male Rap',        icon:'🎤', desc:'Hard delivery, rhythmic flow' },
  { id:'female_rap',   label:'Female Rap',      icon:'🎤', desc:'Sharp and confident' },
  { id:'male_rnb',     label:'Male R&B',        icon:'🎵', desc:'Smooth, melodic, soulful' },
  { id:'female_rnb',   label:'Female R&B',      icon:'🎵', desc:'Rich and expressive' },
  { id:'pop_female',   label:'Pop Female',      icon:'✨', desc:'Clear, bright, commercial' },
  { id:'pop_male',     label:'Pop Male',        icon:'✨', desc:'Warm and accessible' },
  { id:'autotune',     label:'Auto-Tune',       icon:'🤖', desc:'Heavy pitch correction, trap style' },
  { id:'choir',        label:'Choir / Harmony', icon:'🎼', desc:'Stacked layered harmonies' },
  { id:'spoken',       label:'Spoken Word',     icon:'📢', desc:'Rhythmic spoken delivery' },
  { id:'afrobeats_f',  label:'Afrobeats Female',icon:'🌍', desc:'Vibrant, melodic, Afro style' },
  { id:'gospel',       label:'Gospel',          icon:'🙌', desc:'Powerful, emotional, church-trained' },
  { id:'country_male', label:'Country Male',    icon:'🤠', desc:'Twang, warm, storytelling' },
];

const VOCAL_PLACEMENTS = [
  { id:'center', label:'Center (Main)' },
  { id:'left',   label:'Left + Right (Double)' },
  { id:'wide',   label:'Wide Stereo' },
];

const REVERB_AMOUNTS = [
  { id:'dry',    label:'Dry (No Reverb)' },
  { id:'small',  label:'Small Room' },
  { id:'studio', label:'Studio Plate' },
  { id:'large',  label:'Large Hall' },
];

const CREDIT_COST = 20;

// ── Drop Zone ─────────────────────────────────────────────────────────────────
function DropZone({ onFile, file }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type.startsWith('audio/') || f.name.match(/\.(mp3|wav|aiff|flac|ogg)$/i))) onFile(f);
  }, [onFile]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border:`2px dashed ${dragging ? '#00ffc8' : file ? '#00ffc844' : '#30363d'}`,
        borderRadius:12, padding:'32px 20px', textAlign:'center',
        cursor:'pointer', transition:'all 0.2s',
        background: dragging ? '#00ffc808' : file ? '#00ffc804' : '#161b22',
      }}
    >
      <input ref={inputRef} type="file" accept="audio/*" style={{ display:'none' }}
        onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
      {file ? (
        <>
          <div style={{ fontSize:32, marginBottom:8 }}>🎵</div>
          <div style={{ fontSize:13, fontWeight:700, color:'#00ffc8', fontFamily:'JetBrains Mono,monospace' }}>{file.name}</div>
          <div style={{ fontSize:11, color:'#8b949e', marginTop:4 }}>{(file.size / 1024 / 1024).toFixed(1)} MB · Click to change</div>
        </>
      ) : (
        <>
          <div style={{ fontSize:40, marginBottom:10 }}>🎸</div>
          <div style={{ fontSize:13, fontWeight:700, color:'#e6edf3', fontFamily:'JetBrains Mono,monospace', marginBottom:4 }}>Drop your beat here</div>
          <div style={{ fontSize:11, color:'#8b949e' }}>MP3, WAV, AIFF, FLAC · Up to 50MB</div>
          <div style={{ marginTop:12, display:'inline-block', background:'#21262d', border:'1px solid #30363d', borderRadius:6, padding:'5px 14px', color:'#8b949e', fontSize:11 }}>Browse files</div>
        </>
      )}
    </div>
  );
}

// ── Detected Beat Info ─────────────────────────────────────────────────────────
function BeatInfo({ info }) {
  if (!info) return null;
  return (
    <div style={{ display:'flex', gap:8, marginTop:10 }}>
      {[
        { label:'BPM', value: info.bpm || '—' },
        { label:'KEY', value: info.key || '—' },
        { label:'SCALE', value: info.scale || '—' },
        { label:'DURATION', value: info.duration ? `${Math.floor(info.duration)}s` : '—' },
      ].map(({ label, value }) => (
        <div key={label} style={{
          flex:1, background:'#161b22', border:'1px solid #21262d', borderRadius:6,
          padding:'6px 8px', textAlign:'center',
        }}>
          <div style={{ fontSize:8, color:'#8b949e', letterSpacing:2, fontFamily:'JetBrains Mono,monospace' }}>{label}</div>
          <div style={{ fontSize:13, fontWeight:700, color:'#00ffc8', fontFamily:'JetBrains Mono,monospace' }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Vocal Style Picker ─────────────────────────────────────────────────────────
function VocalStylePicker({ selected, onSelect }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6 }}>
      {VOCAL_STYLES.map(vs => (
        <div
          key={vs.id}
          onClick={() => onSelect(vs.id)}
          style={{
            background: selected === vs.id ? '#00ffc811' : '#161b22',
            border:`1px solid ${selected === vs.id ? '#00ffc8' : '#21262d'}`,
            borderRadius:7, padding:'8px 8px', cursor:'pointer', transition:'all 0.15s',
          }}
        >
          <div style={{ fontSize:16, marginBottom:2 }}>{vs.icon}</div>
          <div style={{ fontSize:10, fontWeight:700, color: selected === vs.id ? '#00ffc8' : '#e6edf3', fontFamily:'JetBrains Mono,monospace', lineHeight:1.2 }}>{vs.label}</div>
          <div style={{ fontSize:9, color:'#8b949e', marginTop:2, lineHeight:1.3 }}>{vs.desc}</div>
        </div>
      ))}
    </div>
  );
}

// ── Result Player ─────────────────────────────────────────────────────────────
function ResultPlayer({ result, onSaveToDaw }) {
  const audioRef = useRef(null);
  const vocalRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else          { audioRef.current.play();  setPlaying(true);  }
  };

  return (
    <div style={{ background:'#161b22', border:'2px solid #00ffc8', borderRadius:12, overflow:'hidden', marginTop:16 }}>
      <div style={{ height:3, background:'linear-gradient(90deg, #00ffc8, #FF6600, #7C3AED)' }} />
      <div style={{ padding:'14px 16px' }}>
        <div style={{ fontSize:13, fontWeight:900, color:'#00ffc8', fontFamily:'JetBrains Mono,monospace', marginBottom:4 }}>
          ✅ Vocals Added — {result.title}
        </div>
        <div style={{ fontSize:10, color:'#8b949e', marginBottom:10 }}>
          {result.vocal_style} · Mixed at {result.vocal_level}% level · {result.reverb} reverb
        </div>

        {/* Progress */}
        <div style={{ height:2, background:'#21262d', borderRadius:1, marginBottom:10 }}>
          <div style={{ height:'100%', width:`${prog}%`, background:'#00ffc8', borderRadius:1, transition:'width 0.1s' }} />
        </div>

        <audio ref={audioRef} src={result.mixed_url}
          onTimeUpdate={e => setProg((e.target.currentTime / e.target.duration) * 100 || 0)}
          onEnded={() => { setPlaying(false); setProg(0); }} />

        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={toggle} style={{
            background:'#00ffc822', border:'1px solid #00ffc8', color:'#00ffc8',
            borderRadius:'50%', width:36, height:36, cursor:'pointer', fontSize:16,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{playing ? '⏸' : '▶'}</button>

          <span style={{ fontSize:11, color:'#e6edf3', fontFamily:'JetBrains Mono,monospace' }}>Mixed Track</span>

          <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
            <a href={result.vocal_url} download="vocals.wav" style={{
              background:'#7C3AED22', border:'1px solid #7C3AED66', color:'#a78bfa',
              borderRadius:4, padding:'4px 8px', textDecoration:'none',
              fontFamily:'JetBrains Mono,monospace', fontSize:10,
            }}>⬇ Vocals Only</a>
            <a href={result.mixed_url} download="mixed.mp3" style={{
              background:'#21262d', border:'1px solid #30363d', color:'#8b949e',
              borderRadius:4, padding:'4px 8px', textDecoration:'none',
              fontFamily:'JetBrains Mono,monospace', fontSize:10,
            }}>⬇ Full Mix</a>
            <button onClick={() => onSaveToDaw(result)} style={{
              background:'#00ffc822', border:'1px solid #00ffc8', color:'#00ffc8',
              borderRadius:4, padding:'4px 8px', cursor:'pointer',
              fontFamily:'JetBrains Mono,monospace', fontSize:10,
            }}>→ DAW</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AddVocalsToTrack() {
  const [beatFile, setBeatFile]       = useState(null);
  const [beatInfo, setBeatInfo]       = useState(null);
  const [analyzing, setAnalyzing]     = useState(false);
  const [vocalStyle, setVocalStyle]   = useState('female_rnb');
  const [lyrics, setLyrics]           = useState('');
  const [autoLyrics, setAutoLyrics]   = useState(true);
  const [lyricsPrompt, setLyricsPrompt] = useState('');
  const [placement, setPlacement]     = useState('center');
  const [reverb, setReverb]           = useState('studio');
  const [vocalLevel, setVocalLevel]   = useState(75);
  const [harmonies, setHarmonies]     = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genMsg, setGenMsg]           = useState('');
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState('');
  const [credits, setCredits]         = useState(null);

  const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

  const handleBeatFile = async (file) => {
    setBeatFile(file);
    setBeatInfo(null);
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
      if (res.ok) {
        const data = await res.json();
        setBeatInfo(data);
      }
    } catch { /* use manual input */ }
    setAnalyzing(false);
  };

  const generate = async () => {
    if (!beatFile) { setError('Please upload a beat first.'); return; }
    setGenerating(true);
    setError('');
    setGenProgress(5);
    setGenMsg('Deducting credits...');

    try {
      // 1. Deduct credits
      const cRes = await fetch(`${BACKEND}/api/credits/deduct`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ amount: CREDIT_COST, feature: 'add_vocals_to_track' }),
      });
      if (!cRes.ok) throw new Error('Credit deduction failed');

      setGenProgress(20); setGenMsg('Uploading beat...');

      const poll = setInterval(() => setGenProgress(p => Math.min(p + 2, 85)), 1500);

      // 2. Send to backend
      const fd = new FormData();
      fd.append('beat', beatFile);
      fd.append('vocal_style', vocalStyle);
      fd.append('placement', placement);
      fd.append('reverb', reverb);
      fd.append('vocal_level', vocalLevel);
      fd.append('harmonies', harmonies);
      fd.append('auto_lyrics', autoLyrics);
      fd.append('lyrics', lyrics);
      fd.append('lyrics_prompt', lyricsPrompt);
      if (beatInfo) {
        fd.append('bpm', beatInfo.bpm || '');
        fd.append('key', beatInfo.key || '');
      }

      const res = await fetch(`${BACKEND}/api/ai/add-vocals`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` },
        body: fd,
      });

      clearInterval(poll);
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Generation failed'); }
      const data = await res.json();

      setGenProgress(100); setGenMsg('Done!');
      setResult({
        title:       data.title || `${VOCAL_STYLES.find(v => v.id===vocalStyle)?.label} + ${beatFile.name}`,
        mixed_url:   data.mixed_url,
        vocal_url:   data.vocal_url,
        vocal_style: VOCAL_STYLES.find(v => v.id===vocalStyle)?.label,
        vocal_level: vocalLevel,
        reverb,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
      setTimeout(() => { setGenProgress(0); setGenMsg(''); }, 1000);
    }
  };

  const s = {
    label:  { fontSize:9, color:'#8b949e', letterSpacing:2, marginBottom:6, display:'block', fontFamily:'JetBrains Mono,monospace' },
    input:  { width:'100%', background:'#21262d', border:'1px solid #30363d', borderRadius:5, color:'#e6edf3', padding:'6px 10px', fontFamily:'JetBrains Mono,monospace', fontSize:11, outline:'none', boxSizing:'border-box' },
    select: { background:'#21262d', border:'1px solid #30363d', borderRadius:5, color:'#e6edf3', padding:'5px 8px', fontFamily:'JetBrains Mono,monospace', fontSize:11, width:'100%' },
    section:{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'14px', marginBottom:12 },
  };

  return (
    <div style={{ background:'#0d1117', color:'#e6edf3', minHeight:'100vh', fontFamily:'JetBrains Mono,monospace' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg, #161b22 0%, #0d1117 100%)', borderBottom:'1px solid #21262d', padding:'16px 20px' }}>
        <div style={{ maxWidth:820, margin:'0 auto', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ fontSize:32 }}>🎤</div>
          <div>
            <div style={{ fontSize:20, fontWeight:900, color:'#00ffc8', letterSpacing:1 }}>ADD VOCALS TO YOUR BEAT</div>
            <div style={{ fontSize:11, color:'#8b949e' }}>Upload any instrumental → AI sings over it · {CREDIT_COST} credits per generation</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:820, margin:'0 auto', padding:'16px 20px' }}>
        {/* Step 1: Upload */}
        <div style={s.section}>
          <span style={{ ...s.label, color:'#00ffc8' }}>STEP 1 — UPLOAD YOUR BEAT</span>
          <DropZone onFile={handleBeatFile} file={beatFile} />
          {analyzing && <div style={{ fontSize:11, color:'#8b949e', marginTop:8, textAlign:'center' }}>🔍 Analyzing BPM, key, and structure...</div>}
          <BeatInfo info={beatInfo} />
        </div>

        {/* Step 2: Vocal Style */}
        <div style={s.section}>
          <span style={{ ...s.label, color:'#00ffc8' }}>STEP 2 — CHOOSE VOCAL STYLE</span>
          <VocalStylePicker selected={vocalStyle} onSelect={setVocalStyle} />
        </div>

        {/* Step 3: Lyrics */}
        <div style={s.section}>
          <span style={{ ...s.label, color:'#00ffc8' }}>STEP 3 — LYRICS</span>
          <div style={{ display:'flex', gap:6, marginBottom:10 }}>
            {[['auto','🤖 AI Auto-Generate'],[false,'✍️ Write My Own']].map(([val,label]) => (
              <button key={String(val)} onClick={() => setAutoLyrics(val === 'auto')} style={{
                flex:1, background: (autoLyrics && val==='auto') || (!autoLyrics && val!=='auto') ? '#00ffc811' : '#21262d',
                border:`1px solid ${(autoLyrics && val==='auto') || (!autoLyrics && val!=='auto') ? '#00ffc8' : '#30363d'}`,
                color: (autoLyrics && val==='auto') || (!autoLyrics && val!=='auto') ? '#00ffc8' : '#8b949e',
                borderRadius:5, padding:'6px', cursor:'pointer', fontFamily:'inherit', fontSize:11,
              }}>{label}</button>
            ))}
          </div>

          {autoLyrics ? (
            <div>
              <span style={s.label}>DESCRIBE THE LYRICS VIBE</span>
              <textarea value={lyricsPrompt} onChange={e => setLyricsPrompt(e.target.value)}
                placeholder="e.g. confident love song about being successful, chorus should be catchy and uplifting..."
                style={{ ...s.input, minHeight:60, resize:'vertical' }} />
            </div>
          ) : (
            <div>
              <span style={s.label}>YOUR LYRICS</span>
              <textarea value={lyrics} onChange={e => setLyrics(e.target.value)}
                placeholder={'[Verse 1]\nYour lyrics here...\n\n[Chorus]\nYour hook...'}
                style={{ ...s.input, minHeight:100, resize:'vertical', lineHeight:1.7 }} />
            </div>
          )}
        </div>

        {/* Step 4: Mix Settings */}
        <div style={s.section}>
          <span style={{ ...s.label, color:'#00ffc8' }}>STEP 4 — MIX SETTINGS</span>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <span style={s.label}>VOCAL PLACEMENT</span>
              <select style={s.select} value={placement} onChange={e => setPlacement(e.target.value)}>
                {VOCAL_PLACEMENTS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <span style={s.label}>REVERB</span>
              <select style={s.select} value={reverb} onChange={e => setReverb(e.target.value)}>
                {REVERB_AMOUNTS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {/* Vocal level */}
          <div style={{ marginBottom:10 }}>
            <span style={s.label}>VOCAL LEVEL: {vocalLevel}%</span>
            <input type="range" min={30} max={100} value={vocalLevel} onChange={e => setVocalLevel(Number(e.target.value))}
              style={{ width:'100%', accentColor:'#00ffc8' }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#8b949e' }}>
              <span>Subtle</span><span>Balanced</span><span>Dominant</span>
            </div>
          </div>

          {/* Harmonies */}
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
            <input type="checkbox" checked={harmonies} onChange={e => setHarmonies(e.target.checked)} style={{ accentColor:'#00ffc8' }} />
            <span style={{ fontSize:11, color:'#e6edf3' }}>🎼 Add background harmonies (+1 layer)</span>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background:'#ff444422', border:'1px solid #ff4444', borderRadius:6, padding:'8px 10px', color:'#ff8888', fontSize:11, marginBottom:10 }}>
            {error}
          </div>
        )}

        {/* Generate */}
        <button onClick={generate} disabled={generating || !beatFile} style={{
          width:'100%', padding:'12px', borderRadius:8,
          background: generating ? '#21262d' : 'linear-gradient(135deg, #00ffc8 0%, #00a896 100%)',
          border:'none', color: generating ? '#8b949e' : '#0d1117',
          fontFamily:'inherit', fontSize:14, fontWeight:900, letterSpacing:1,
          cursor: generating || !beatFile ? 'not-allowed' : 'pointer',
          opacity: (!beatFile && !generating) ? 0.4 : 1,
          transition:'all 0.2s',
        }}>
          {generating ? genMsg || 'Generating vocals...' : `🎤 Add Vocals — ${CREDIT_COST} Credits`}
        </button>

        {generating && genProgress > 0 && (
          <div style={{ marginTop:8, height:3, background:'#21262d', borderRadius:2 }}>
            <div style={{ height:'100%', borderRadius:2, width:`${genProgress}%`,
              background:'linear-gradient(90deg, #00ffc8, #FF6600)', transition:'width 0.5s' }} />
          </div>
        )}

        {/* Result */}
        {result && (
          <ResultPlayer result={result}
            onSaveToDaw={r => alert(`Sending "${r.title}" to DAW — in production this opens RecordingStudio with both tracks pre-loaded.`)} />
        )}
      </div>
    </div>
  );
}
