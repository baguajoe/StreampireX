// =============================================================================
// DAWAdvancedFeatures.js — Advanced Recording Studio Features
// =============================================================================
// Location: src/front/js/component/DAWAdvancedFeatures.js
//
// Features:
//   1. Inline Stem Separation (one-click in timeline)
//   2. Audio-to-MIDI (convert melodic audio to MIDI notes)
//   3. Inline Pitch Correction (track FX chain effect)
//
// Import into RecordingStudio.js
// =============================================================================

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';

const S = {
  bg: '#161b22', card: '#1c2128', input: '#21262d', border: '#30363d',
  text: '#c9d1d9', dim: '#5a7088', accent: '#00ffc8', accentOrange: '#FF6600',
  danger: '#ff4757', success: '#34c759', warn: '#ffcc00',
};

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const noteFromFreq = (f) => f > 0 ? Math.round(12 * Math.log2(f / 440) + 69) : -1;
const freqFromNote = (n) => 440 * Math.pow(2, (n - 69) / 12);
const noteName = (n) => `${NOTE_NAMES[n % 12]}${Math.floor(n / 12) - 1}`;

const backendURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
const getAuthHeaders = () => {
  const token = localStorage.getItem('jwt-token') || localStorage.getItem('token');
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
};


// ═══════════════════════════════════════════════════════════════════════════════
// 1. INLINE STEM SEPARATION
// ═══════════════════════════════════════════════════════════════════════════════

export const separateTrackStems = async (audioUrl, title = 'Track', model = 'htdemucs') => {
  const res = await fetch(`${backendURL}/api/ai/stems/upload-and-separate`, {
    method: 'POST', headers: getAuthHeaders(),
    body: JSON.stringify({ audio_url: audioUrl, title, model }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Stem separation failed (${res.status})`);
  }
  return res.json();
};

export const InlineStemSeparation = ({
  tracks = [], selectedTrackIndex = 0,
  onStemsReady, maxTracks = 32, currentTrackCount = 0,
}) => {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState('');
  const [model, setModel] = useState('htdemucs');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const trk = tracks[selectedTrackIndex];
  const hasAudio = trk?.audio_url || trk?.audioBuffer;

  const MODELS = [
    { id: 'htdemucs', name: 'HT Demucs', desc: '4 stems — best quality', stems: 4 },
    { id: 'htdemucs_6s', name: '6-Stem', desc: 'vocals/drums/bass/guitar/piano/other', stems: 6 },
    { id: 'mdx_extra', name: 'MDX Extra', desc: '4 stems — faster', stems: 4 },
  ];
  const sel = MODELS.find(m => m.id === model) || MODELS[0];
  const overLimit = currentTrackCount + sel.stems > maxTracks;

  const handleSeparate = async () => {
    if (!hasAudio) return;
    setStatus('separating'); setError('');
    setProgress('Uploading for separation…');
    try {
      if (!trk.audio_url) throw new Error('Track has no saved URL — save first.');
      setProgress('AI separating stems… 1-3 min');
      const data = await separateTrackStems(trk.audio_url, trk.name || 'Track', model);
      if (!data.stems) throw new Error('No stems returned');
      setResult(data); setStatus('complete');
      setProgress(`✅ ${Object.keys(data.stems).length} stems ready`);
    } catch (e) { setError(e.message); setStatus('error'); }
  };

  const handleAdd = () => {
    if (!result?.stems || !onStemsReady) return;
    const colors = { vocals:'#ff3b30', drums:'#ff9500', bass:'#007aff', other:'#af52de', guitar:'#34c759', piano:'#ffcc00' };
    onStemsReady(Object.entries(result.stems).map(([name, stem]) => ({
      name: `${trk.name||'Track'} — ${name.charAt(0).toUpperCase()+name.slice(1)}`,
      audioUrl: stem.url, color: colors[name]||'#5ac8fa', stemName: name,
    })));
    setStatus('idle'); setResult(null);
  };

  return (
    <div style={{background:S.bg,borderRadius:8,padding:10,fontSize:'0.7rem'}}>
      <div style={{fontWeight:700,color:S.accent,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
        <span>🎵</span> Stem Separation
        <span style={{fontSize:'0.5rem',color:S.dim,fontWeight:400}}>
          Track {selectedTrackIndex+1}: {trk?.name||'None'}
        </span>
      </div>

      {!hasAudio ? (
        <div style={{color:S.warn,textAlign:'center',padding:12,fontSize:'0.6rem'}}>
          ⚠️ No audio on selected track. Record or import first.
        </div>
      ) : status === 'idle' ? (
        <>
          <div style={{marginBottom:8}}>
            <label style={{color:S.dim,fontSize:'0.6rem'}}>Model</label>
            <div style={{display:'flex',flexDirection:'column',gap:4,marginTop:4}}>
              {MODELS.map(m=>(
                <div key={m.id} onClick={()=>setModel(m.id)} style={{
                  padding:'6px 8px',borderRadius:6,cursor:'pointer',
                  background:model===m.id?`${S.accent}15`:S.input,
                  border:`1px solid ${model===m.id?S.accent:S.border}`,
                  display:'flex',justifyContent:'space-between',
                }}>
                  <div>
                    <div style={{color:model===m.id?S.accent:S.text,fontWeight:600,fontSize:'0.6rem'}}>{m.name}</div>
                    <div style={{color:S.dim,fontSize:'0.5rem'}}>{m.desc}</div>
                  </div>
                  <span style={{color:S.dim,fontSize:'0.55rem'}}>{m.stems} stems</span>
                </div>
              ))}
            </div>
          </div>
          {overLimit && <div style={{color:S.warn,fontSize:'0.55rem',marginBottom:6}}>⚠️ Would exceed track limit ({maxTracks})</div>}
          <button onClick={handleSeparate} disabled={overLimit} style={{
            width:'100%',background:overLimit?S.input:`linear-gradient(135deg,${S.accent},#00b894)`,
            color:overLimit?S.dim:'#000',border:'none',borderRadius:6,padding:'8px 0',
            fontSize:'0.65rem',cursor:overLimit?'not-allowed':'pointer',fontWeight:700,
          }}>🎵 Separate into {sel.stems} Stems</button>
        </>
      ) : status === 'separating' ? (
        <div style={{textAlign:'center',padding:12}}>
          <div style={{color:S.accent,fontSize:'1.2rem',marginBottom:6}}>⏳</div>
          <div style={{color:S.text,fontSize:'0.6rem'}}>{progress}</div>
          <div style={{color:S.dim,fontSize:'0.5rem',marginTop:4}}>Don't close this panel</div>
        </div>
      ) : status === 'complete' && result ? (
        <div>
          <div style={{color:S.success,fontSize:'0.6rem',marginBottom:8,textAlign:'center'}}>{progress}</div>
          <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:8}}>
            {Object.entries(result.stems).map(([name,stem])=>(
              <div key={name} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 8px',background:S.input,borderRadius:4,border:`1px solid ${S.border}`}}>
                <span style={{fontSize:'0.8rem'}}>
                  {name==='vocals'?'🎤':name==='drums'?'🥁':name==='bass'?'🎸':name==='guitar'?'🎵':name==='piano'?'🎹':'🎼'}
                </span>
                <span style={{color:S.text,fontWeight:600,fontSize:'0.6rem',flex:1}}>{name.charAt(0).toUpperCase()+name.slice(1)}</span>
                <audio src={stem.url} controls style={{height:24,maxWidth:120}} />
              </div>
            ))}
          </div>
          <button onClick={handleAdd} style={{
            width:'100%',background:`linear-gradient(135deg,${S.accent},#00b894)`,
            color:'#000',border:'none',borderRadius:6,padding:'8px 0',fontSize:'0.65rem',cursor:'pointer',fontWeight:700,
          }}>✅ Add All Stems to Timeline</button>
        </div>
      ) : status === 'error' ? (
        <div style={{textAlign:'center',padding:12}}>
          <div style={{color:S.danger,fontSize:'0.6rem',marginBottom:6}}>❌ {error}</div>
          <button onClick={()=>{setStatus('idle');setError('');}} style={{background:S.input,color:S.text,border:`1px solid ${S.border}`,borderRadius:4,padding:'4px 12px',fontSize:'0.6rem',cursor:'pointer'}}>Try Again</button>
        </div>
      ) : null}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// 2. AUDIO-TO-MIDI — YIN pitch detection → MIDI notes
// ═══════════════════════════════════════════════════════════════════════════════

const yinPitchDetect = (buffer, sampleRate, threshold = 0.15) => {
  const N = buffer.length, half = N >> 1;
  const d = new Float32Array(half);
  for (let tau = 0; tau < half; tau++) {
    let sum = 0;
    for (let j = 0; j < half; j++) { const x = buffer[j] - buffer[j+tau]; sum += x*x; }
    d[tau] = sum;
  }
  const cmn = new Float32Array(half);
  cmn[0] = 1; let rs = 0;
  for (let tau = 1; tau < half; tau++) { rs += d[tau]; cmn[tau] = d[tau] / (rs / tau); }

  for (let tau = 2; tau < half; tau++) {
    if (cmn[tau] < threshold) {
      while (tau+1 < half && cmn[tau+1] < cmn[tau]) tau++;
      const s0 = tau > 0 ? cmn[tau-1] : cmn[tau];
      const s1 = cmn[tau];
      const s2 = tau+1 < half ? cmn[tau+1] : cmn[tau];
      return sampleRate / (tau + (s0-s2) / (2*(s0-2*s1+s2)||1));
    }
  }
  return -1;
};

export const audioToMIDI = (audioBuffer, options = {}) => {
  const {
    bpm = 120, frameSize = 2048, hopSize = 512,
    minNoteDuration = 0.05, minFrequency = 60, maxFrequency = 2000,
    confidenceThreshold = 0.15, quantize = 'none',
    key = null, scale = 'chromatic', velocitySensitivity = 1.0,
  } = options;

  const sr = audioBuffer.sampleRate;
  const data = audioBuffer.getChannelData(0);
  const bps = bpm / 60;

  const SCALES = {
    chromatic:[1,1,1,1,1,1,1,1,1,1,1,1], major:[1,0,1,0,1,1,0,1,0,1,0,1],
    minor:[1,0,1,1,0,1,0,1,1,0,1,0], pentatonic:[1,0,1,0,1,0,0,1,0,1,0,0],
    blues:[1,0,0,1,0,1,1,1,0,0,1,0],
  };
  const sc = SCALES[scale] || SCALES.chromatic;
  const ko = key ? NOTE_NAMES.indexOf(key) : 0;

  const snap = (n) => {
    if (scale==='chromatic') return n;
    const r = ((n-ko)%12+12)%12;
    if (sc[r]) return n;
    for (let o=1;o<=6;o++) { if (sc[(r+o)%12]) return n+o; if (sc[((r-o)%12+12)%12]) return n-o; }
    return n;
  };

  const qGrid = {'none':0,'1/4':1,'1/8':0.5,'1/16':0.25,'1/32':0.125};
  const qTime = (bt) => { const g=qGrid[quantize]; return g ? Math.round(bt/g)*g : bt; };

  const raw = []; let cur = null;
  for (let i=0; i<data.length-frameSize; i+=hopSize) {
    const frame = new Float32Array(frameSize);
    for (let j=0;j<frameSize;j++) frame[j] = data[i+j] * (0.5-0.5*Math.cos(2*Math.PI*j/(frameSize-1)));
    const t = i/sr, bt = t*bps;
    const freq = yinPitchDetect(frame, sr, confidenceThreshold);
    let rms=0; for(let j=0;j<frameSize;j++) rms+=data[i+j]*data[i+j]; rms=Math.sqrt(rms/frameSize);
    const vel = Math.min(1, rms*10*velocitySensitivity);

    if (freq>minFrequency && freq<maxFrequency && vel>0.01) {
      const mn = snap(noteFromFreq(freq));
      if (cur && cur.note===mn) { cur.endTime=t; cur.endBeat=bt; cur.velocity=Math.max(cur.velocity,vel); }
      else {
        if (cur && cur.endTime-cur.startTime>=minNoteDuration) raw.push({...cur});
        cur = { note:mn, frequency:freq, startTime:t, endTime:t, startBeat:bt, endBeat:bt, velocity:vel };
      }
    } else {
      if (cur && cur.endTime-cur.startTime>=minNoteDuration) raw.push({...cur});
      cur = null;
    }
  }
  if (cur && cur.endTime-cur.startTime>=minNoteDuration) raw.push(cur);

  return raw.map(n => ({
    note:n.note, frequency:n.frequency,
    startBeat:qTime(n.startBeat),
    duration:Math.max(0.125, qTime(n.endBeat)-qTime(n.startBeat)),
    velocity:Math.round(n.velocity*127)/127,
    name:noteName(n.note),
  }));
};

export const AudioToMIDIPanel = ({
  tracks=[], selectedTrackIndex=0, bpm=120,
  onNotesGenerated, onCreateMIDITrack,
}) => {
  const [status, setStatus] = useState('idle');
  const [notes, setNotes] = useState([]);
  const [settings, setSettings] = useState({
    quantize:'1/16', key:null, scale:'chromatic',
    confidenceThreshold:0.15, velocitySensitivity:1.0,
  });

  const trk = tracks[selectedTrackIndex];
  const hasAudio = trk?.audioBuffer;

  const handleAnalyze = () => {
    if (!hasAudio) return;
    setStatus('analyzing');
    setTimeout(() => {
      try {
        const r = audioToMIDI(trk.audioBuffer, { bpm, ...settings });
        setNotes(r); setStatus('complete');
      } catch(e) { console.error(e); setStatus('error'); }
    }, 50);
  };

  return (
    <div style={{background:S.bg,borderRadius:8,padding:10,fontSize:'0.7rem'}}>
      <div style={{fontWeight:700,color:S.accent,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
        <span>🎼</span> Audio → MIDI
      </div>

      {!hasAudio ? (
        <div style={{color:S.warn,textAlign:'center',padding:12,fontSize:'0.6rem'}}>
          ⚠️ No audio buffer on track. Record or import first.
        </div>
      ) : (
        <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:8}}>
            <div>
              <label style={{color:S.dim,fontSize:'0.55rem'}}>Quantize</label>
              <select value={settings.quantize} onChange={e=>setSettings(s=>({...s,quantize:e.target.value}))}
                style={{width:'100%',background:S.input,border:`1px solid ${S.border}`,borderRadius:4,color:S.text,padding:3,fontSize:'0.6rem'}}>
                {['none','1/4','1/8','1/16','1/32'].map(v=><option key={v} value={v}>{v==='none'?'Off':v+' note'}</option>)}
              </select>
            </div>
            <div>
              <label style={{color:S.dim,fontSize:'0.55rem'}}>Scale</label>
              <select value={settings.scale} onChange={e=>setSettings(s=>({...s,scale:e.target.value}))}
                style={{width:'100%',background:S.input,border:`1px solid ${S.border}`,borderRadius:4,color:S.text,padding:3,fontSize:'0.6rem'}}>
                {['chromatic','major','minor','pentatonic','blues'].map(v=><option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div style={{marginBottom:8}}>
            <label style={{color:S.dim,fontSize:'0.55rem'}}>Sensitivity: {Math.round((1-settings.confidenceThreshold)*100)}%</label>
            <input type="range" min="0" max="100" value={Math.round((1-settings.confidenceThreshold)*100)}
              onChange={e=>setSettings(s=>({...s,confidenceThreshold:1-parseInt(e.target.value)/100}))} style={{width:'100%'}} />
          </div>

          <div style={{marginBottom:8}}>
            <label style={{color:S.dim,fontSize:'0.55rem'}}>Key</label>
            <div style={{display:'flex',gap:3,flexWrap:'wrap',marginTop:3}}>
              <button onClick={()=>setSettings(s=>({...s,key:null}))} style={{
                background:!settings.key?`${S.accent}20`:S.input, color:!settings.key?S.accent:S.dim,
                border:`1px solid ${!settings.key?S.accent:S.border}`, borderRadius:4,padding:'2px 6px',fontSize:'0.5rem',cursor:'pointer',
              }}>Auto</button>
              {NOTE_NAMES.map(n=>(
                <button key={n} onClick={()=>setSettings(s=>({...s,key:n}))} style={{
                  background:settings.key===n?`${S.accent}20`:S.input, color:settings.key===n?S.accent:S.dim,
                  border:`1px solid ${settings.key===n?S.accent:S.border}`, borderRadius:4,padding:'2px 5px',fontSize:'0.5rem',cursor:'pointer',minWidth:22,
                }}>{n}</button>
              ))}
            </div>
          </div>

          {status==='idle' && (
            <button onClick={handleAnalyze} style={{
              width:'100%',background:`linear-gradient(135deg,${S.accent},#00b894)`,
              color:'#000',border:'none',borderRadius:6,padding:'8px 0',fontSize:'0.65rem',cursor:'pointer',fontWeight:700,
            }}>🎼 Convert Audio to MIDI</button>
          )}

          {status==='analyzing' && (
            <div style={{textAlign:'center',padding:12,color:S.accent,fontSize:'0.6rem'}}>⏳ Analyzing pitches…</div>
          )}

          {status==='error' && (
            <div style={{textAlign:'center',padding:12}}>
              <div style={{color:S.danger,fontSize:'0.6rem',marginBottom:6}}>❌ Failed</div>
              <button onClick={()=>setStatus('idle')} style={{background:S.input,color:S.text,border:`1px solid ${S.border}`,borderRadius:4,padding:'4px 12px',fontSize:'0.6rem',cursor:'pointer'}}>Retry</button>
            </div>
          )}

          {status==='complete' && notes.length>0 && (
            <div>
              <div style={{color:S.success,fontSize:'0.6rem',marginBottom:6,textAlign:'center'}}>✅ {notes.length} notes detected</div>
              {/* Mini preview */}
              <div style={{background:S.input,borderRadius:6,padding:6,marginBottom:8,border:`1px solid ${S.border}`,maxHeight:100,overflow:'auto'}}>
                <div style={{position:'relative',height:60}}>
                  {notes.slice(0,200).map((n,i)=>{
                    const mn=Math.min(...notes.map(x=>x.note)), mx=Math.max(...notes.map(x=>x.note));
                    const rng=Math.max(1,mx-mn), maxB=Math.max(...notes.map(x=>x.startBeat+x.duration));
                    return <div key={i} style={{
                      position:'absolute', left:`${(n.startBeat/maxB)*100}%`, bottom:`${((n.note-mn)/rng)*100}%`,
                      width:`${Math.max(2,(n.duration/maxB)*100)}%`, height:`${Math.max(2,100/rng)}%`,
                      background:S.accent, borderRadius:2, opacity:0.6+n.velocity*0.4,
                    }} title={`${n.name} @ ${n.startBeat.toFixed(2)} beats`} />;
                  })}
                </div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>onNotesGenerated&&onNotesGenerated(notes)} style={{
                  flex:1,background:`${S.accent}20`,color:S.accent,border:`1px solid ${S.accent}40`,
                  borderRadius:6,padding:'6px 0',fontSize:'0.6rem',cursor:'pointer',fontWeight:600,
                }}>🎹 Piano Roll</button>
                <button onClick={()=>onCreateMIDITrack&&onCreateMIDITrack(notes,`${trk?.name||'Track'} (MIDI)`)} style={{
                  flex:1,background:`${S.accentOrange}20`,color:S.accentOrange,border:`1px solid ${S.accentOrange}40`,
                  borderRadius:6,padding:'6px 0',fontSize:'0.6rem',cursor:'pointer',fontWeight:600,
                }}>➕ MIDI Track</button>
              </div>
            </div>
          )}

          {status==='complete' && notes.length===0 && (
            <div style={{color:S.warn,textAlign:'center',padding:12,fontSize:'0.6rem'}}>
              No pitched content found. Try lowering sensitivity.
            </div>
          )}
        </>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// 3. INLINE PITCH CORRECTION (per-track FX chain effect)
// ═══════════════════════════════════════════════════════════════════════════════

const SCALE_INTERVALS = {
  chromatic:[1,1,1,1,1,1,1,1,1,1,1,1],
  major:[1,0,1,0,1,1,0,1,0,1,0,1], minor:[1,0,1,1,0,1,0,1,1,0,1,0],
  dorian:[1,0,1,1,0,1,0,1,0,1,1,0], mixolydian:[1,0,1,0,1,1,0,1,0,1,1,0],
  pentatonic:[1,0,1,0,1,0,0,1,0,1,0,0], blues:[1,0,0,1,0,1,1,1,0,0,1,0],
  harmMinor:[1,0,1,1,0,1,0,1,1,0,0,1],
};

export const createPitchCorrectionEffect = () => ({
  enabled: false,
  key: 'C',
  scale: 'chromatic',
  speed: 0.5,         // 0=instant snap (T-Pain), 1=slow natural
  amount: 0.8,        // 0=off, 1=full
  formantPreserve: true,
  humanize: 0.2,
  retuneSpeed: 20,    // ms
});

export const findNearestScaleNote = (midiNote, key='C', scale='chromatic') => {
  const ki = NOTE_NAMES.indexOf(key);
  const iv = SCALE_INTERVALS[scale] || SCALE_INTERVALS.chromatic;
  const r = ((midiNote-ki)%12+12)%12;
  if (iv[r]) return midiNote;
  for (let o=1;o<=6;o++) { if (iv[(r+o)%12]) return midiNote+o; if (iv[((r-o)%12+12)%12]) return midiNote-o; }
  return midiNote;
};

export const calculatePitchCorrection = (freq, settings={}) => {
  const { key='C', scale='chromatic', amount=0.8, humanize=0.2 } = settings;
  if (freq <= 0) return { correction:0, targetNote:-1, cents:0 };
  const mn = noteFromFreq(freq);
  const tn = findNearestScaleNote(mn, key, scale);
  const tf = freqFromNote(tn);
  const cents = 1200 * Math.log2(freq / tf);
  const correction = -cents * amount;
  const jitter = (Math.random()-0.5) * humanize * 10;
  return { correction: correction + jitter, targetNote: tn, targetName: noteName(tn), cents: Math.round(cents), detectedNote: mn };
};

/**
 * PitchCorrectionPanel — compact UI for the FX chain
 */
export const PitchCorrectionPanel = ({ settings={}, onChange }) => {
  const s = { ...createPitchCorrectionEffect(), ...settings };
  const up = (k,v) => onChange && onChange({...s,[k]:v});

  const presets = [
    { name: '🎤 Natural', speed:0.6, amount:0.6, humanize:0.3 },
    { name: '🤖 T-Pain', speed:0.0, amount:1.0, humanize:0.0 },
    { name: '🎵 Subtle', speed:0.8, amount:0.4, humanize:0.4 },
    { name: '⚡ Hard Tune', speed:0.1, amount:0.95, humanize:0.05 },
  ];

  return (
    <div style={{background:S.bg,borderRadius:8,padding:10,fontSize:'0.7rem'}}>
      <div style={{fontWeight:700,color:S.accent,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
        <span>🎯</span> Pitch Correction
        <label style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:4}}>
          <input type="checkbox" checked={s.enabled} onChange={e=>up('enabled',e.target.checked)} />
          <span style={{color:s.enabled?S.success:S.dim}}>{s.enabled?'ON':'OFF'}</span>
        </label>
      </div>

      {s.enabled && (
        <>
          {/* Presets */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4,marginBottom:8}}>
            {presets.map(p=>(
              <button key={p.name} onClick={()=>onChange&&onChange({...s,speed:p.speed,amount:p.amount,humanize:p.humanize})}
                style={{
                  padding:'4px',borderRadius:4,fontSize:'0.5rem',cursor:'pointer',textAlign:'center',
                  background:S.input,color:S.text,border:`1px solid ${S.border}`,fontWeight:600,
                }}>{p.name}</button>
            ))}
          </div>

          {/* Key & Scale */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:8}}>
            <div>
              <label style={{color:S.dim,fontSize:'0.55rem'}}>Key</label>
              <select value={s.key} onChange={e=>up('key',e.target.value)}
                style={{width:'100%',background:S.input,border:`1px solid ${S.border}`,borderRadius:4,color:S.text,padding:3,fontSize:'0.6rem'}}>
                {NOTE_NAMES.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={{color:S.dim,fontSize:'0.55rem'}}>Scale</label>
              <select value={s.scale} onChange={e=>up('scale',e.target.value)}
                style={{width:'100%',background:S.input,border:`1px solid ${S.border}`,borderRadius:4,color:S.text,padding:3,fontSize:'0.6rem'}}>
                {Object.keys(SCALE_INTERVALS).map(k=><option key={k} value={k}>{k.charAt(0).toUpperCase()+k.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Speed */}
          <div style={{marginBottom:6}}>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <label style={{color:S.dim,fontSize:'0.55rem'}}>Retune Speed</label>
              <span style={{color:S.accent,fontSize:'0.55rem'}}>{s.speed===0?'Instant':s.speed<0.3?'Fast':s.speed<0.7?'Medium':'Slow'}</span>
            </div>
            <input type="range" min="0" max="100" value={s.speed*100} onChange={e=>up('speed',parseInt(e.target.value)/100)} style={{width:'100%'}} />
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.45rem',color:S.dim}}>
              <span>🤖 Hard Tune</span><span>🎤 Natural</span>
            </div>
          </div>

          {/* Amount */}
          <div style={{marginBottom:6}}>
            <label style={{color:S.dim,fontSize:'0.55rem'}}>Correction: {Math.round(s.amount*100)}%</label>
            <input type="range" min="0" max="100" value={s.amount*100} onChange={e=>up('amount',parseInt(e.target.value)/100)} style={{width:'100%'}} />
          </div>

          {/* Humanize */}
          <div style={{marginBottom:6}}>
            <label style={{color:S.dim,fontSize:'0.55rem'}}>Humanize: {Math.round(s.humanize*100)}%</label>
            <input type="range" min="0" max="100" value={s.humanize*100} onChange={e=>up('humanize',parseInt(e.target.value)/100)} style={{width:'100%'}} />
          </div>

          {/* Formant */}
          <label style={{display:'flex',alignItems:'center',gap:6,color:S.text,fontSize:'0.6rem',cursor:'pointer'}}>
            <input type="checkbox" checked={s.formantPreserve} onChange={e=>up('formantPreserve',e.target.checked)} />
            Preserve Formants <span style={{color:S.dim,fontSize:'0.5rem'}}>(natural timbre)</span>
          </label>
        </>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Stem Separation
  separateTrackStems, InlineStemSeparation,
  // Audio-to-MIDI
  audioToMIDI, AudioToMIDIPanel,
  // Pitch Correction
  createPitchCorrectionEffect, findNearestScaleNote,
  calculatePitchCorrection, PitchCorrectionPanel,
};