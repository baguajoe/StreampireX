// =============================================================================
// SPXEPSTab.js — SPX-EPS Keyboard Workstation
// 13-bit / 29.4kHz, DOC chip, low-mid bump, asymmetric noise floor
// Keyboard workstation layout — no drum pads
// Views: KEYBOARD | ZONES | PARAMS | SEQ
// =============================================================================
import React, { useState, useRef, useCallback, useEffect } from 'react';
import '../../styles/SPXEPSTab.css';
import SpecBadge from './sampler/SpecBadge';

const SAMPLE_RATE  = 29400;
const ROLLOFF_HZ   = 13000;
const NOISE_FLOOR  = 0.00085;
const PPQN         = 96;
// Bug #4: doubled to 16 to match the Ensoniq EPS spec (the original hardware
// supports 16 keyboard zones across split presets — 8 was an arbitrary throttle).
const NUM_ZONES    = 16;
const WHITE_KEYS   = 36;
const NOTES        = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const WHITE_NOTE_PATTERN = [0,2,4,5,7,9,11]; // C D E F G A B semitone offsets

// ─── DSP ─────────────────────────────────────────────────────────────────────
const epsQuantCurve = x => x * (1 + 0.08 * Math.abs(x));

const docSaturate = (x, drive = 1.35) => {
  const d = x * drive;
  return d / (1 + Math.abs(d)) + (d > 0 ? d * 0.04 : d * 0.02);
};

const applyLowMidBump = (ctx, buffer) => {
  if (!buffer) return buffer;
  const sr = buffer.sampleRate;
  const fc = 220; const Q = 1.8; const dBg = 2.2;
  const A = Math.pow(10, dBg / 40);
  const w0 = 2 * Math.PI * fc / sr;
  const alpha = Math.sin(w0) / (2 * Q);
  const b0=1+alpha*A, b1=-2*Math.cos(w0), b2=1-alpha*A;
  const a0=1+alpha/A, a1=-2*Math.cos(w0), a2=1-alpha/A;
  const B0=b0/a0, B1=b1/a0, B2=b2/a0, A1=a1/a0, A2=a2/a0;
  const nc=buffer.numberOfChannels, len=buffer.length;
  const out=ctx.createBuffer(nc,len,sr);
  for(let ch=0;ch<nc;ch++){
    const src=buffer.getChannelData(ch), dst=out.getChannelData(ch);
    let x1=0,x2=0,y1=0,y2=0;
    for(let i=0;i<len;i++){
      const x0=src[i], y0=B0*x0+B1*x1+B2*x2-A1*y1-A2*y2;
      x2=x1;x1=x0;y2=y1;y1=y0;dst[i]=y0;
    }
  }
  return out;
};

const apply13bit = (ctx, buffer) => {
  if (!buffer) return buffer;
  const nc=buffer.numberOfChannels, len=buffer.length;
  const out=ctx.createBuffer(nc,len,buffer.sampleRate);
  for(let ch=0;ch<nc;ch++){
    const src=buffer.getChannelData(ch), dst=out.getChannelData(ch);
    for(let i=0;i<len;i++){
      const tpdf=(Math.random()-Math.random())*NOISE_FLOOR;
      dst[i]=docSaturate(Math.round(epsQuantCurve(src[i])*4096)/4096)+tpdf;
    }
  }
  return out;
};

const applyResample = (ctx, buffer) => {
  if (!buffer) return buffer;
  const ratio=SAMPLE_RATE/buffer.sampleRate;
  const nc=buffer.numberOfChannels, srcLen=buffer.length;
  const dnLen=Math.floor(srcLen*ratio);
  const out=ctx.createBuffer(nc,srcLen,buffer.sampleRate);
  for(let ch=0;ch<nc;ch++){
    const src=buffer.getChannelData(ch), dst=out.getChannelData(ch);
    const down=new Float32Array(dnLen);
    for(let i=0;i<dnLen;i++){
      const pos=i/ratio, idx=Math.floor(pos), f=pos-idx;
      down[i]=src[Math.min(idx,srcLen-1)]*(1-f)+src[Math.min(idx+1,srcLen-1)]*f;
    }
    for(let i=0;i<srcLen;i++){
      const pos=i*ratio, idx=Math.floor(pos), f=pos-idx;
      dst[i]=down[Math.min(idx,dnLen-1)]*(1-f)+down[Math.min(idx+1,dnLen-1)]*f;
    }
  }
  return out;
};

const applyRolloff = (ctx, buffer) => {
  if (!buffer) return buffer;
  const a=(1/buffer.sampleRate)/(1/(2*Math.PI*ROLLOFF_HZ)+1/buffer.sampleRate);
  const nc=buffer.numberOfChannels, len=buffer.length;
  const out=ctx.createBuffer(nc,len,buffer.sampleRate);
  for(let ch=0;ch<nc;ch++){
    const src=buffer.getChannelData(ch), dst=out.getChannelData(ch);
    let prev=0;
    for(let i=0;i<len;i++){prev=a*src[i]+(1-a)*prev;dst[i]=prev;}
  }
  return out;
};

const applyDSP = (ctx, buf) => applyLowMidBump(ctx, applyRolloff(ctx, apply13bit(ctx, applyResample(ctx, buf))));

// ─── Zone factory ────────────────────────────────────────────────────────────
const mkZone = (idx) => ({
  idx,
  name: `Zone ${idx + 1}`,
  buffer: null,
  processedBuffer: null,
  // 16 zones × 6 keys covers a 96-key range starting at MIDI 24 (C0). Each zone
  // is a half-octave wide; rootNote sits in the middle for chromatic playback.
  loNote: 24 + idx * 6,
  hiNote: 24 + idx * 6 + 5,
  rootNote: 24 + idx * 6 + 2,
  volume: 1.0,
  pan: 0,
  tune: 0,
  cutoff: 13000,
  resonance: 0.1,
  attack: 0.01,
  decay: 0.3,
  sustain: 0.8,
  release: 0.5,
  muted: false,
});

const mkSeq = (bars = 2) => ({
  bars,
  steps: Array.from({ length: bars * 16 }, () =>
    Array.from({ length: NUM_ZONES }, () => ({ on: false, vel: 100 }))
  ),
});

// ─── Component ───────────────────────────────────────────────────────────────
export default function SPXEPSTab({ onExport, onSendToArrange, isEmbedded, masterClock, onSendToTriple }) {
  const [zones, setZones]             = useState(() => Array.from({ length: NUM_ZONES }, (_, i) => mkZone(i)));
  const [sequences, setSequences]     = useState([mkSeq(2)]);
  const [seqIdx, setSeqIdx]           = useState(0);
  const [playing, setPlaying]         = useState(false);
  const [step, setStep]               = useState(0);
  const [bpm, setBpm]                 = useState(95);
  const [swing, setSwing]             = useState(0);
  const [bars, setBars]               = useState(2);
  const [selectedZone, setSelectedZone] = useState(0);
  const [view, setView]               = useState('keyboard');
  const [syncToMaster, setSyncToMaster] = useState(false);
  const [activeNotes, setActiveNotes]   = useState(new Set());
  const [octave, setOctave]             = useState(3);

  const ctxRef    = useRef(null);
  const stepRef   = useRef(0);
  const playRef   = useRef(false);
  const timerRef  = useRef(null);
  const bpmRef    = useRef(bpm);
  const swingRef  = useRef(swing);
  const zonesRef  = useRef(zones);
  const seqRef    = useRef(sequences);
  const seqIdxRef = useRef(seqIdx);
  const srcMap    = useRef({});

  useEffect(() => { bpmRef.current   = bpm; },       [bpm]);
  useEffect(() => { swingRef.current = swing; },     [swing]);
  useEffect(() => { zonesRef.current = zones; },     [zones]);
  useEffect(() => { seqRef.current   = sequences; }, [sequences]);
  useEffect(() => { seqIdxRef.current = seqIdx; },   [seqIdx]);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctxRef.current;
  }, []);

  const stopNote = useCallback((key) => {
    if (srcMap.current[key]) { try { srcMap.current[key].stop(); } catch (_) {} srcMap.current[key] = null; }
  }, []);

  // Find zone that covers this MIDI note
  const findZone = useCallback((midiNote) => {
    return zonesRef.current.find(z => z.processedBuffer && !z.muted && midiNote >= z.loNote && midiNote <= z.hiNote);
  }, []);

  const triggerNote = useCallback((midiNote, vel = 0.8) => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const zone = findZone(midiNote);
    if (!zone) return;
    stopNote(midiNote);
    const src = ctx.createBufferSource();
    src.buffer = zone.processedBuffer;
    const semitones = midiNote - zone.rootNote + zone.tune;
    src.playbackRate.value = Math.pow(2, semitones / 12);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(zone.volume * vel, ctx.currentTime + zone.attack);
    gain.gain.setTargetAtTime(zone.volume * vel * zone.sustain, ctx.currentTime + zone.attack + zone.decay, 0.1);
    const panner = ctx.createStereoPanner();
    panner.pan.value = zone.pan;
    // Bug #4: filter is now wired into the chain (was cosmetic — UI sliders
    // moved values but no node existed). Lowpass with the per-zone cutoff/Q.
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.max(20, zone.cutoff ?? 13000);
    // Resonance slider is 0..0.9; map to a usable Q range (0.7..18) for character
    // without going self-oscillation crazy.
    filter.Q.value = 0.7 + (zone.resonance ?? 0) * 19;
    src.connect(filter); filter.connect(gain); gain.connect(panner); panner.connect(ctx.destination);
    src.start();
    src.onended = () => { srcMap.current[midiNote] = null; };
    srcMap.current[midiNote] = src;
    setActiveNotes(prev => new Set([...prev, midiNote]));
  }, [getCtx, findZone, stopNote]);

  const releaseNote = useCallback((midiNote) => {
    stopNote(midiNote);
    setActiveNotes(prev => { const n = new Set(prev); n.delete(midiNote); return n; });
  }, [stopNote]);

  const scheduleStep = useCallback(() => {
    if (!playRef.current) return;
    const seq = seqRef.current[seqIdxRef.current] || seqRef.current[0];
    const s = stepRef.current;
    const stepMs = (60000 / bpmRef.current) / 4;
    const swingMs = s % 2 === 1 ? (swingRef.current / 100) * stepMs * 0.5 : 0;
    seq.steps[s]?.forEach((cell, zi) => {
      if (cell.on) {
        const zone = zonesRef.current[zi];
        if (zone) triggerNote(zone.rootNote, cell.vel / 127);
      }
    });
    stepRef.current = (s + 1) % (seq.bars * 16);
    setStep(stepRef.current);
    timerRef.current = setTimeout(scheduleStep, stepMs + swingMs);
  }, [triggerNote]);

  useEffect(() => {
    if (!syncToMaster || !masterClock?.subscribe) return;
    const unsub = masterClock.subscribe(({ step: ms, bpm: mb }) => {
      bpmRef.current = mb; setBpm(mb);
      const seq = seqRef.current[seqIdxRef.current] || seqRef.current[0];
      const s = ms % (seq.bars * 16);
      seq.steps[s]?.forEach((cell, zi) => {
        if (cell.on) { const zone = zonesRef.current[zi]; if (zone) triggerNote(zone.rootNote, cell.vel / 127); }
      });
      setStep(s);
    });
    return unsub;
  }, [syncToMaster, masterClock, triggerNote]);

  const togglePlay = useCallback(() => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    if (playRef.current) {
      playRef.current = false; setPlaying(false); clearTimeout(timerRef.current);
    } else {
      stepRef.current = 0; playRef.current = true; setPlaying(true); scheduleStep();
    }
  }, [getCtx, scheduleStep]);

  const loadSample = useCallback(async (zi, file) => {
    const ctx = getCtx();
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    const processed = applyDSP(ctx, decoded);
    setZones(prev => {
      const next = [...prev];
      next[zi] = { ...next[zi], buffer: decoded, processedBuffer: processed, name: file.name.replace(/\.[^.]+$/, '').slice(0, 14) };
      zonesRef.current = next; return next;
    });
  }, [getCtx]);

  const fileSelect = useCallback(zi => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*';
    inp.onchange = e => { if (e.target.files[0]) loadSample(zi, e.target.files[0]); }; inp.click();
  }, [loadSample]);

  const updateZone = useCallback((zi, key, val) => {
    setZones(prev => { const next=[...prev]; next[zi]={...next[zi],[key]:val}; zonesRef.current=next; return next; });
  }, []);

  const toggleStep = useCallback((s, zi) => {
    setSequences(prev => prev.map((seq, si) => si !== seqIdxRef.current ? seq : {
      ...seq, steps: seq.steps.map((row, ri) => ri !== s ? row :
        row.map((cell, ci) => ci !== zi ? cell : { ...cell, on: !cell.on }))
    }));
  }, []);

  // Build piano keys
  const buildKeys = useCallback(() => {
    const keys = [];
    let wi = 0;
    for (let oct = octave; oct < octave + 3; oct++) {
      WHITE_NOTE_PATTERN.forEach((semitone, ni) => {
        const midi = oct * 12 + semitone;
        keys.push({ type: 'white', midi, note: NOTES[semitone] + oct, wi });
        const nextSemitone = WHITE_NOTE_PATTERN[ni + 1];
        if (nextSemitone !== undefined && nextSemitone - semitone === 2) {
          keys.push({ type: 'black', midi: midi + 1, note: NOTES[semitone + 1] + oct, wi });
        }
        wi++;
      });
    }
    return keys;
  }, [octave]);

  const seq  = sequences[seqIdx] || sequences[0];
  const keys = buildKeys();
  const whiteKeys = keys.filter(k => k.type === 'white');
  const blackKeys = keys.filter(k => k.type === 'black');

  return (
    <div className="spxeps-root">

      {/* ── Header ── */}
      <div className="spxeps-header">
        <div className="spxeps-header-stripe" />
        <div className="spxeps-logo">
          <span className="spxeps-brand">SPX</span>
          <span className="spxeps-model">EPS</span>
        </div>
        <div className="spxeps-lcd">
          <span className="spxeps-lcd-item">{zones.filter(z => z.processedBuffer).length}/{NUM_ZONES} ZONES</span>
          <span className="spxeps-lcd-item">BPM {bpm}</span>
          <span className="spxeps-lcd-item">OCT {octave}</span>
          <span className="spxeps-lcd-item">SEQ {seqIdx + 1}/{sequences.length}</span>
          {syncToMaster && <span className="spxeps-lcd-sync">⟳ LINKED</span>}
        </div>
        <div className="spxeps-transport">
          {!syncToMaster && (
            <button className={`spxeps-btn${playing ? ' active' : ''}`} onClick={togglePlay}>
              {playing ? '⏹ STOP' : '▶ PLAY'}
            </button>
          )}
          <button className="spxeps-btn" onClick={() => { stepRef.current = 0; setStep(0); }}>◀◀</button>
          <button className="spxeps-btn" onClick={() => setSequences(p => [...p, mkSeq(bars)])}>+ SEQ</button>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="spxeps-controls">
        <div className="spxeps-ctrl-group">
          <label className="spxeps-label">BPM</label>
          <input className="spxeps-range" type="range" min={40} max={240} value={bpm}
            onChange={e => { bpmRef.current = +e.target.value; setBpm(+e.target.value); }} />
          <span className="spxeps-val">{bpm}</span>
        </div>
        <div className="spxeps-ctrl-group">
          <label className="spxeps-label">SWING</label>
          <input className="spxeps-range" type="range" min={0} max={75} value={swing}
            onChange={e => { swingRef.current = +e.target.value; setSwing(+e.target.value); }} />
          <span className="spxeps-val">{swing}%</span>
        </div>
        <div className="spxeps-ctrl-group">
          <label className="spxeps-label">OCT</label>
          <button className="spxeps-oct-btn" onClick={() => setOctave(p => Math.max(1, p - 1))}>−</button>
          <span className="spxeps-val">{octave}</span>
          <button className="spxeps-oct-btn" onClick={() => setOctave(p => Math.min(7, p + 1))}>+</button>
        </div>
        <div className="spxeps-ctrl-group">
          <label className="spxeps-label">CLOCK</label>
          <button className={`spxeps-sync-btn${syncToMaster ? ' active' : ''}`}
            onClick={() => setSyncToMaster(p => !p)}>
            {syncToMaster ? '⟳ MASTER' : '⟳ OWN'}
          </button>
        </div>
        <div className="spxeps-ctrl-group">
          {['keyboard', 'zones', 'params', 'seq'].map(v => (
            <button key={v} className={`spxeps-view-btn${view === v ? ' active' : ''}`}
              onClick={() => setView(v)}>{v.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="spxeps-main">

        {/* KEYBOARD view */}
        {view === 'keyboard' && (
          <div className="spxeps-keyboard-view">
            <div className="spxeps-zone-bar">
              {zones.map((z, zi) => (
                <div key={zi}
                  className={`spxeps-zone-chip${z.processedBuffer ? ' loaded' : ''}${selectedZone === zi ? ' selected' : ''}`}
                  onClick={() => setSelectedZone(zi)}
                  onDoubleClick={() => fileSelect(zi)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadSample(zi, f); }}>
                  <span className="spxeps-zone-name">{z.name}</span>
                  {z.processedBuffer && <span className="spxeps-zone-range">{NOTES[z.loNote % 12]}{Math.floor(z.loNote/12)}–{NOTES[z.hiNote % 12]}{Math.floor(z.hiNote/12)}</span>}
                  {!z.processedBuffer && <span className="spxeps-zone-drop">DROP</span>}
                </div>
              ))}
            </div>
            <div className="spxeps-keyboard-info">
              <span>Zone {selectedZone + 1}: {zones[selectedZone].name}</span>
              <button className="spxeps-action-btn" onClick={() => fileSelect(selectedZone)}>📂 LOAD SAMPLE</button>
              {zones[selectedZone]?.processedBuffer && onChopRequest && (
                <button className="spxeps-action-btn" onClick={() => onChopRequest(zones[selectedZone].processedBuffer, (zi, data) => updateZone(zi, Object.keys(data)[0], Object.values(data)[0]), setZones)}>✂️ CHOP</button>
              )}
              {zones[selectedZone].processedBuffer && (
                <button className="spxeps-action-btn" onClick={() => updateZone(selectedZone, 'processedBuffer', null)}>✕ CLEAR</button>
              )}
            </div>
          </div>
        )}

        {/* ZONES view */}
        {view === 'zones' && (
          <div className="spxeps-zones-view">
            {zones.map((z, zi) => (
              <div key={zi} className={`spxeps-zone-row${selectedZone === zi ? ' selected' : ''}`}
                onClick={() => setSelectedZone(zi)}>
                <span className="spxeps-zone-idx">{zi + 1}</span>
                <span className="spxeps-zone-name-cell">{z.name}</span>
                <span className="spxeps-zone-range-cell">
                  {NOTES[z.loNote % 12]}{Math.floor(z.loNote/12)} – {NOTES[z.hiNote % 12]}{Math.floor(z.hiNote/12)}
                </span>
                <span className="spxeps-zone-root">ROOT: {NOTES[z.rootNote % 12]}{Math.floor(z.rootNote/12)}</span>
                <span className={`spxeps-zone-status${z.processedBuffer ? ' loaded' : ''}`}>
                  {z.processedBuffer ? '● LOADED' : '○ EMPTY'}
                </span>
                <button className="spxeps-action-btn" onClick={e => { e.stopPropagation(); fileSelect(zi); }}>📂</button>
              </div>
            ))}
          </div>
        )}

        {/* PARAMS view */}
        {view === 'params' && (
          <div className="spxeps-params-view">
            <div className="spxeps-params-zone-select">
              {zones.map((z, zi) => (
                <button key={zi}
                  className={`spxeps-param-zone-btn${selectedZone === zi ? ' active' : ''}`}
                  onClick={() => setSelectedZone(zi)}>
                  Z{zi + 1}
                </button>
              ))}
            </div>
            <div className="spxeps-params-grid">
              <div className="spxeps-params-title">ZONE {selectedZone + 1} — {zones[selectedZone].name}</div>
              {[
                { key: 'volume',    label: 'VOLUME',    min: 0,    max: 1,     step: 0.01  },
                { key: 'pan',       label: 'PAN',       min: -1,   max: 1,     step: 0.01  },
                { key: 'tune',      label: 'TUNE',      min: -12,  max: 12,    step: 0.1   },
                { key: 'cutoff',    label: 'CUTOFF',    min: 200,  max: 13000, step: 100   },
                { key: 'resonance', label: 'RESONANCE', min: 0,    max: 0.9,   step: 0.01  },
                { key: 'attack',    label: 'ATTACK',    min: 0.001,max: 2,     step: 0.001 },
                { key: 'decay',     label: 'DECAY',     min: 0.01, max: 3,     step: 0.01  },
                { key: 'sustain',   label: 'SUSTAIN',   min: 0,    max: 1,     step: 0.01  },
                { key: 'release',   label: 'RELEASE',   min: 0.01, max: 4,     step: 0.01  },
                { key: 'loNote',    label: 'LO NOTE',   min: 0,    max: 127,   step: 1     },
                { key: 'hiNote',    label: 'HI NOTE',   min: 0,    max: 127,   step: 1     },
                { key: 'rootNote',  label: 'ROOT NOTE', min: 0,    max: 127,   step: 1     },
              ].map(({ key, label, min, max, step: s }) => (
                <div key={key} className="spxeps-param-row">
                  <label className="spxeps-param-label">{label}</label>
                  <input className="spxeps-range" type="range" min={min} max={max} step={s}
                    value={zones[selectedZone][key] ?? 0}
                    onChange={e => updateZone(selectedZone, key, +e.target.value)} />
                  <span className="spxeps-val">
                    {key.includes('Note')
                      ? `${NOTES[zones[selectedZone][key] % 12]}${Math.floor(zones[selectedZone][key]/12)}`
                      : Number(zones[selectedZone][key] ?? 0).toFixed(key === 'cutoff' ? 0 : 2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEQ view */}
        {view === 'seq' && (
          <div className="spxeps-seq">
            <div className="spxeps-seq-controls">
              <div className="spxeps-ctrl-group">
                <label className="spxeps-label">BARS</label>
                <select className="spxeps-select" value={bars}
                  onChange={e => {
                    const nb = +e.target.value; setBars(nb);
                    setSequences(prev => prev.map((sq, si) => si !== seqIdxRef.current ? sq : {
                      ...sq, bars: nb,
                      steps: Array.from({ length: nb * 16 }, (_, i) =>
                        sq.steps[i] || Array.from({ length: 8 }, () => ({ on: false, vel: 100 })))
                    }));
                  }}>
                  {[1,2,4,8].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="spxeps-ctrl-group">
                <label className="spxeps-label">SEQ</label>
                <select className="spxeps-select" value={seqIdx}
                  onChange={e => { seqIdxRef.current = +e.target.value; setSeqIdx(+e.target.value); }}>
                  {sequences.map((_, i) => <option key={i} value={i}>SEQ {i+1}</option>)}
                </select>
              </div>
            </div>
            <div className="spxeps-seq-grid">
              {zones.map((zone, zi) => (
                <div key={zi} className="spxeps-seq-row">
                  <button className="spxeps-seq-zone-btn"
                    onMouseDown={() => triggerNote(zone.rootNote, 0.8)}>
                    {zone.name.slice(0, 8)}
                  </button>
                  <div className="spxeps-seq-steps">
                    {seq.steps.map((row, si) => (
                      <button key={si}
                        className={`spxeps-step${row[zi]?.on ? ' on' : ''}${si === step && (playing || syncToMaster) ? ' current' : ''}${si % 4 === 0 ? ' beat' : ''}`}
                        onClick={() => toggleStep(si, zi)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Piano keyboard — always visible ── */}
      <div className="spxeps-keyboard-section">
        <div className="spxeps-keyboard">
          {whiteKeys.map((key, i) => (
            <div key={i}
              className={`spxeps-key-white${activeNotes.has(key.midi) ? ' active' : ''}${findZone(key.midi) ? ' mapped' : ''}`}
              onMouseDown={() => triggerNote(key.midi)}
              onMouseUp={() => releaseNote(key.midi)}
              onMouseLeave={() => releaseNote(key.midi)}>
              <span className="spxeps-key-note">{key.note}</span>
            </div>
          ))}
          {blackKeys.map((key, i) => {
            const pct = ((key.wi + 0.65) / whiteKeys.length) * 100;
            return (
              <div key={i}
                className={`spxeps-key-black${activeNotes.has(key.midi) ? ' active' : ''}${findZone(key.midi) ? ' mapped' : ''}`}
                onMouseDown={e => { e.stopPropagation(); triggerNote(key.midi); }}
                onMouseUp={e => { e.stopPropagation(); releaseNote(key.midi); }}
                onMouseLeave={() => releaseNote(key.midi)}
                style={{ left: `${pct}%` }} />
            );
          })}
        </div>
      </div>

      {/* ── DSP strip ── */}
      <div className="spxeps-dsp-strip">
        {['13-BIT','29.4kHz','DOC CHIP','LOW-MID BUMP','TPDF DITHER','ASYMMETRIC NOISE','16 ZONES','LOWPASS FILTER'].map(b => (
          <SpecBadge key={b} label={b} className="spxeps-dsp-badge" />
        ))}
      </div>
    </div>
  );
}

export { applyDSP as dspChain };
