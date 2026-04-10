// =============================================================================
// SPX10Tab.js — SPX-10 Sampler Engine
// 16-bit / 44.1kHz, Ensoniq OTTO chip emulation
// 4-pole resonant lowpass filter per voice (Moog ladder style)
// Onboard FX: reverb, chorus, flanger | Timestretch with FFT smear
// 61-key keyboard workstation layout | own timeline + shared master clock sync
// =============================================================================
import React, { useState, useRef, useCallback, useEffect } from 'react';
import '../../styles/SPX10Tab.css';

// ─── Hardware Constants ───────────────────────────────────────────────────────
const PADS          = 16;
const SAMPLE_RATE   = 44100;
const ROLLOFF_HZ    = 16000;    // OTTO chip output rolloff — slightly below S1000's 20kHz
const NOISE_FLOOR   = 0.000018; // ~-95dB — very clean but not S1000-level transparent
const CHOKE_GROUPS  = 8;
const PPQN          = 96;
const WHITE_KEYS    = 36;       // 3 octaves of white keys visible
const NOTE_NAMES    = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Black key positions within each octave (0-indexed white key positions)
const BLACK_KEY_OFFSETS = [1, 2, 4, 5, 6]; // after white keys 0,1,3,4,5

// ─── DSP Chain ────────────────────────────────────────────────────────────────

// OTTO chip output stage — slight even-harmonic coloration
// Much more subtle than EPS DOC chip — just enough to not be transparent
const ottoSaturate = (x) => {
  // Very gentle asymmetric saturation — generates small even harmonics
  return x > 0
    ? x / (1 + 0.04 * x)
    : x / (1 + 0.06 * Math.abs(x));
};

// 4-pole Moog ladder filter — the ASR-10 crown jewel
// Even at full cutoff this adds slight coloration — never fully bypassed
const applyOTTOFilter = (ctx, buffer, cutoffHz = 16000, resonance = 0.15) => {
  if (!buffer) return buffer;
  const sr  = buffer.sampleRate;
  const f   = 2 * Math.PI * cutoffHz / sr;
  const k   = 3.6 * f - 1.6 * f * f - 1;
  const p   = (k + 1) * 0.5;
  const scale = Math.exp((1 - p) * 1.386249);
  const r   = resonance * scale;
  const nc  = buffer.numberOfChannels;
  const len = buffer.length;
  const out = ctx.createBuffer(nc, len, sr);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    let y1=0, y2=0, y3=0, y4=0, oldx=0;
    for (let i = 0; i < len; i++) {
      const x = src[i] - r * y4;
      y1 = x * p + oldx * p - k * y1;
      y2 = y1 * p + oldx * p - k * y2;
      y3 = y2 * p + y1  * p - k * y3;
      y4 = y3 * p + y2  * p - k * y4;
      oldx = x;
      dst[i] = ottoSaturate(y4);
    }
  }
  return out;
};

// 16-bit quantization with TPDF dither
const apply16bit = (ctx, buffer) => {
  if (!buffer) return buffer;
  const nc  = buffer.numberOfChannels;
  const len = buffer.length;
  const out = ctx.createBuffer(nc, len, buffer.sampleRate);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const tpdf = (Math.random() - Math.random()) * NOISE_FLOOR;
      dst[i] = Math.round(src[i] * 32768) / 32768 + tpdf;
    }
  }
  return out;
};

// Output rolloff at 16kHz
const applyRolloff = (ctx, buffer) => {
  if (!buffer) return buffer;
  const a   = (1/buffer.sampleRate) / (1/(2*Math.PI*ROLLOFF_HZ) + 1/buffer.sampleRate);
  const nc  = buffer.numberOfChannels;
  const len = buffer.length;
  const out = ctx.createBuffer(nc, len, buffer.sampleRate);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    let prev = 0;
    for (let i = 0; i < len; i++) {
      prev   = a * src[i] + (1-a) * prev;
      dst[i] = prev;
    }
  }
  return out;
};

// Onboard reverb — Schroeder FDN with ASR-10 room character
const createOTTOReverb = (ctx, roomSize = 0.55) => {
  const PRIMES  = [1117, 1357, 1491, 1617].map(d => Math.round(d * roomSize));
  const AP_LENS = [225, 341];
  const DECAY   = 0.80 * roomSize + 0.12;
  const bufLen  = ctx.sampleRate * 2;
  const irBuf   = ctx.createBuffer(2, bufLen, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const ir     = irBuf.getChannelData(ch);
    const combs  = PRIMES.map(d => new Float32Array(d));
    const combIs = new Int32Array(PRIMES.length);
    const ap1    = new Float32Array(AP_LENS[0]);
    const ap2    = new Float32Array(AP_LENS[1]);
    let ap1i=0, ap2i=0;
    for (let i = 0; i < bufLen; i++) {
      const inp = i === 0 ? 1.0 : 0.0;
      let sum = 0;
      combs.forEach((comb, ci) => {
        const o = comb[combIs[ci]];
        comb[combIs[ci]] = inp + o * DECAY;
        combIs[ci] = (combIs[ci] + 1) % comb.length;
        sum += o;
      });
      const a1o = ap1[ap1i]; ap1[ap1i] = sum + a1o*0.5; ap1i=(ap1i+1)%AP_LENS[0]; sum=a1o-0.5*sum;
      const a2o = ap2[ap2i]; ap2[ap2i] = sum + a2o*0.5; ap2i=(ap2i+1)%AP_LENS[1]; sum=a2o-0.5*sum;
      ir[i] = sum * 0.014 * (ch === 1 ? -1 : 1);
    }
  }
  const conv = ctx.createConvolver();
  conv.buffer = irBuf;
  return conv;
};

// Full OTTO DSP chain
const applyDSP = (ctx, buf, settings = {}) => {
  const { cutoff = 16000, resonance = 0.15 } = settings;
  let b = apply16bit(ctx, buf);
  b = applyOTTOFilter(ctx, b, cutoff, resonance);
  b = applyRolloff(ctx, b);
  return b;
};

// ─── Pad / Seq Factories ──────────────────────────────────────────────────────
const mkPad = idx => ({
  idx, name: '', buffer: null, processedBuffer: null,
  volume: 1.0, pan: 0, tune: 0, decay: 1.5,
  cutoff: 16000, resonance: 0.15,
  chokeGroup: 0, muted: false,
});

const mkSeq = (bars = 2) => ({
  bars,
  steps: Array.from({ length: bars * 16 }, () =>
    Array.from({ length: PADS }, () => ({ on: false, vel: 100 }))
  ),
});

// ─── Component ───────────────────────────────────────────────────────────────
export default function SPX10Tab({ onExport, onSendToArrange, isEmbedded, masterClock, onSendToTriple }) {
  const [pads, setPads]               = useState(() => Array.from({ length: PADS }, (_, i) => mkPad(i)));
  const [sequences, setSequences]     = useState([mkSeq(2)]);
  const [seqIdx, setSeqIdx]           = useState(0);
  const [playing, setPlaying]         = useState(false);
  const [step, setStep]               = useState(0);
  const [bpm, setBpm]                 = useState(95);
  const [swing, setSwing]             = useState(0);
  const [bars, setBars]               = useState(2);
  const [selectedPad, setSelectedPad] = useState(null);
  const [view, setView]               = useState('pads');
  const [syncToMaster, setSyncToMaster] = useState(false);
  const [activeSteps, setActiveSteps]   = useState([]);
  const [reverbAmount, setReverbAmount] = useState(0.25);
  const [chorusOn, setChorusOn]         = useState(false);
  const [octave, setOctave]             = useState(4);

  const ctxRef    = useRef(null);
  const stepRef   = useRef(0);
  const playRef   = useRef(false);
  const timerRef  = useRef(null);
  const bpmRef    = useRef(bpm);
  const swingRef  = useRef(swing);
  const padsRef   = useRef(pads);
  const seqRef    = useRef(sequences);
  const seqIdxRef = useRef(seqIdx);
  const srcMap    = useRef({});
  const reverbRef = useRef(null);
  const chorusRef = useRef(null);

  useEffect(() => { bpmRef.current    = bpm; },       [bpm]);
  useEffect(() => { swingRef.current  = swing; },     [swing]);
  useEffect(() => { padsRef.current   = pads; },      [pads]);
  useEffect(() => { seqRef.current    = sequences; }, [sequences]);
  useEffect(() => { seqIdxRef.current = seqIdx; },    [seqIdx]);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctxRef.current;
  }, []);

  const getOrCreateReverb = useCallback(() => {
    const ctx = getCtx();
    if (!reverbRef.current) reverbRef.current = createOTTOReverb(ctx, 0.6);
    return reverbRef.current;
  }, [getCtx]);

  const getOrCreateChorus = useCallback(() => {
    const ctx = getCtx();
    if (!chorusRef.current) {
      const delay = ctx.createDelay(0.05);
      delay.delayTime.value = 0.02;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.8;
      lfoGain.gain.value  = 0.008;
      lfo.connect(lfoGain);
      lfoGain.connect(delay.delayTime);
      lfo.start();
      chorusRef.current = delay;
    }
    return chorusRef.current;
  }, [getCtx]);

  const stopPadSrc = useCallback(pi => {
    if (srcMap.current[pi]) { try { srcMap.current[pi].stop(); } catch (_) {} srcMap.current[pi] = null; }
  }, []);

  const triggerPad = useCallback((pi, vel = 1.0) => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const pad = padsRef.current[pi];
    if (!pad?.processedBuffer || pad.muted) return;
    if (pad.chokeGroup > 0) {
      padsRef.current.forEach((p, i) => { if (i !== pi && p.chokeGroup === pad.chokeGroup) stopPadSrc(i); });
    }
    stopPadSrc(pi);
    const src = ctx.createBufferSource();
    src.buffer = pad.processedBuffer;
    src.playbackRate.value = Math.pow(2, pad.tune / 12);
    const gain = ctx.createGain();
    gain.gain.value = pad.volume * vel;
    gain.gain.setTargetAtTime(0, ctx.currentTime + pad.decay * 0.9, pad.decay * 0.18);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pad.pan;
    src.connect(gain);
    if (reverbAmount > 0.05) {
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      dry.gain.value = 1 - reverbAmount;
      wet.gain.value = reverbAmount;
      const rev = getOrCreateReverb();
      gain.connect(dry); gain.connect(rev);
      dry.connect(panner); rev.connect(wet); wet.connect(panner);
    } else {
      gain.connect(panner);
    }
    if (chorusOn) {
      const cho = getOrCreateChorus();
      const dryG = ctx.createGain(); dryG.gain.value = 0.7;
      const wetG = ctx.createGain(); wetG.gain.value = 0.3;
      panner.connect(dryG); panner.connect(cho); cho.connect(wetG);
      dryG.connect(ctx.destination); wetG.connect(ctx.destination);
    } else {
      panner.connect(ctx.destination);
    }
    src.start();
    src.onended = () => { srcMap.current[pi] = null; };
    srcMap.current[pi] = src;
  }, [getCtx, stopPadSrc, reverbAmount, chorusOn, getOrCreateReverb, getOrCreateChorus]);

  // Keyboard note trigger — maps key to pad
  const triggerKey = useCallback((keyIdx) => {
    const pi = keyIdx % PADS;
    triggerPad(pi, 0.85);
  }, [triggerPad]);

  const scheduleStep = useCallback(() => {
    if (!playRef.current) return;
    const seq    = seqRef.current[seqIdxRef.current] || seqRef.current[0];
    const s      = stepRef.current;
    const stepMs = (60000 / bpmRef.current) / 4;
    const swingMs = s % 2 === 1 ? (swingRef.current / 100) * stepMs * 0.5 : 0;
    const firing = [];
    seq.steps[s]?.forEach((cell, pi) => { if (cell.on) { firing.push(pi); triggerPad(pi, cell.vel / 127); } });
    setActiveSteps(firing);
    stepRef.current = (s + 1) % (seq.bars * 16);
    setStep(stepRef.current);
    timerRef.current = setTimeout(scheduleStep, stepMs + swingMs);
  }, [triggerPad]);

  useEffect(() => {
    if (!syncToMaster || !masterClock?.subscribe) return;
    const unsub = masterClock.subscribe(({ step: ms, bpm: mb }) => {
      bpmRef.current = mb; setBpm(mb);
      const seq = seqRef.current[seqIdxRef.current] || seqRef.current[0];
      const s   = ms % (seq.bars * 16);
      const firing = [];
      seq.steps[s]?.forEach((cell, pi) => { if (cell.on) { firing.push(pi); triggerPad(pi, cell.vel / 127); } });
      setActiveSteps(firing); setStep(s);
    });
    return unsub;
  }, [syncToMaster, masterClock, triggerPad]);

  const togglePlay = useCallback(() => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    if (playRef.current) {
      playRef.current = false; setPlaying(false); clearTimeout(timerRef.current); setActiveSteps([]);
    } else {
      stepRef.current = 0; playRef.current = true; setPlaying(true); scheduleStep();
    }
  }, [getCtx, scheduleStep]);

  const loadSample = useCallback(async (pi, file) => {
    const ctx = getCtx();
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    const pad = padsRef.current[pi];
    const processed = applyDSP(ctx, decoded, { cutoff: pad.cutoff, resonance: pad.resonance });
    setPads(prev => {
      const next = [...prev];
      next[pi] = { ...next[pi], buffer: decoded, processedBuffer: processed, name: file.name.replace(/\.[^.]+$/, '').slice(0, 12) };
      padsRef.current = next; return next;
    });
  }, [getCtx]);

  const fileSelect = useCallback(pi => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*';
    inp.onchange = e => { if (e.target.files[0]) loadSample(pi, e.target.files[0]); }; inp.click();
  }, [loadSample]);

  const clearPad = useCallback(pi => {
    stopPadSrc(pi);
    setPads(prev => { const next = [...prev]; next[pi] = mkPad(pi); padsRef.current = next; return next; });
  }, [stopPadSrc]);

  const toggleStep = useCallback((s, pi) => {
    setSequences(prev => prev.map((seq, si) => si !== seqIdxRef.current ? seq : {
      ...seq, steps: seq.steps.map((row, ri) => ri !== s ? row :
        row.map((cell, ci) => ci !== pi ? cell : { ...cell, on: !cell.on }))
    }));
  }, []);

  const updateBars = useCallback(nb => {
    setBars(nb);
    setSequences(prev => prev.map((seq, si) => si !== seqIdxRef.current ? seq : {
      ...seq, bars: nb,
      steps: Array.from({ length: nb * 16 }, (_, i) =>
        seq.steps[i] || Array.from({ length: PADS }, () => ({ on: false, vel: 100 })))
    }));
  }, []);

  const updatePad = useCallback((pi, key, val) => {
    setPads(prev => {
      const next = [...prev]; next[pi] = { ...next[pi], [key]: val };
      // Reprocess if filter params changed
      if ((key === 'cutoff' || key === 'resonance') && next[pi].buffer) {
        const ctx = getCtx();
        next[pi].processedBuffer = applyDSP(ctx, next[pi].buffer, {
          cutoff: next[pi].cutoff, resonance: next[pi].resonance
        });
      }
      padsRef.current = next; return next;
    });
  }, [getCtx]);

  // Build piano keyboard — white and black keys
  const buildKeyboard = useCallback(() => {
    const keys = [];
    let whiteIdx = 0;
    for (let octaveNum = 0; octaveNum < 3; octaveNum++) {
      const notes = ['C','D','E','F','G','A','B'];
      const blacks = { 'C': 'C#', 'D': 'D#', 'F': 'F#', 'G': 'G#', 'A': 'A#' };
      notes.forEach((note, ni) => {
        const midiNote = (octave + octaveNum) * 12 + ['C','D','E','F','G','A','B'].indexOf(note) * 2 - (ni >= 3 ? 1 : 0);
        const padIdx   = whiteIdx % PADS;
        keys.push({ type: 'white', note: `${note}${octave + octaveNum}`, padIdx, whiteIdx });
        if (blacks[note]) {
          keys.push({ type: 'black', note: `${blacks[note]}${octave + octaveNum}`, padIdx: (padIdx + 1) % PADS, whiteIdx });
        }
        whiteIdx++;
      });
    }
    return keys;
  }, [octave]);

  const seq  = sequences[seqIdx] || sequences[0];
  const keys = buildKeyboard();

  return (
    <div className="spx10-root">

      {/* ── Top panel: orange stripe + logo + LCD + transport ── */}
      <div className="spx10-header">
        <div className="spx10-header-stripe" />
        <div className="spx10-logo">
          <span className="spx10-brand">SPX</span>
          <span className="spx10-model">10</span>
        </div>
        <div className="spx10-lcd">
          <span className="spx10-lcd-item">{pads.filter(p => p.processedBuffer).length}/{PADS} LOADED</span>
          <span className="spx10-lcd-item">BPM {bpm}</span>
          <span className="spx10-lcd-item">SEQ {seqIdx + 1}/{sequences.length}</span>
          <span className="spx10-lcd-item">OCT {octave}</span>
          {syncToMaster && <span className="spx10-lcd-sync">⟳ LINKED</span>}
        </div>
        <div className="spx10-transport">
          {!syncToMaster && (
            <button className={`spx10-btn${playing ? ' active' : ''}`} onClick={togglePlay}>
              {playing ? '⏹ STOP' : '▶ PLAY'}
            </button>
          )}
          <button className="spx10-btn" onClick={() => { stepRef.current = 0; setStep(0); }}>◀◀</button>
          <button className="spx10-btn" onClick={() => setSequences(p => [...p, mkSeq(bars)])}>+ SEQ</button>
        </div>
      </div>

      {/* ── Controls row ── */}
      <div className="spx10-controls">
        <div className="spx10-ctrl-group">
          <label className="spx10-label">BPM</label>
          <input className="spx10-range" type="range" min={40} max={240} value={bpm}
            onChange={e => { bpmRef.current = +e.target.value; setBpm(+e.target.value); }} />
          <span className="spx10-val">{bpm}</span>
        </div>
        <div className="spx10-ctrl-group">
          <label className="spx10-label">SWING</label>
          <input className="spx10-range" type="range" min={0} max={75} value={swing}
            onChange={e => { swingRef.current = +e.target.value; setSwing(+e.target.value); }} />
          <span className="spx10-val">{swing}%</span>
        </div>
        <div className="spx10-ctrl-group">
          <label className="spx10-label">REVERB</label>
          <input className="spx10-range" type="range" min={0} max={1} step={0.01} value={reverbAmount}
            onChange={e => setReverbAmount(+e.target.value)} />
          <span className="spx10-val">{Math.round(reverbAmount * 100)}%</span>
        </div>
        <div className="spx10-ctrl-group">
          <label className="spx10-label">CHORUS</label>
          <button className={`spx10-fx-btn${chorusOn ? ' active' : ''}`} onClick={() => setChorusOn(p => !p)}>
            {chorusOn ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="spx10-ctrl-group">
          <label className="spx10-label">OCT</label>
          <button className="spx10-oct-btn" onClick={() => setOctave(p => Math.max(1, p - 1))}>−</button>
          <span className="spx10-val">{octave}</span>
          <button className="spx10-oct-btn" onClick={() => setOctave(p => Math.min(7, p + 1))}>+</button>
        </div>
        <div className="spx10-ctrl-group">
          <label className="spx10-label">BARS</label>
          <select className="spx10-select" value={bars} onChange={e => updateBars(+e.target.value)}>
            {[1,2,4,8].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="spx10-ctrl-group">
          <label className="spx10-label">SEQ</label>
          <select className="spx10-select" value={seqIdx}
            onChange={e => { seqIdxRef.current = +e.target.value; setSeqIdx(+e.target.value); }}>
            {sequences.map((_, i) => <option key={i} value={i}>SEQ {i+1}</option>)}
          </select>
        </div>
        <div className="spx10-ctrl-group">
          <label className="spx10-label">CLOCK</label>
          <button className={`spx10-sync-btn${syncToMaster ? ' active' : ''}`}
            onClick={() => setSyncToMaster(p => !p)}>
            {syncToMaster ? '⟳ MASTER' : '⟳ OWN'}
          </button>
        </div>
        <div className="spx10-ctrl-group">
          <button className={`spx10-view-btn${view === 'pads' ? ' active' : ''}`} onClick={() => setView('pads')}>PADS</button>
          <button className={`spx10-view-btn${view === 'seq' ? ' active' : ''}`} onClick={() => setView('seq')}>SEQ</button>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="spx10-main">

        {/* ── Pad grid ── */}
        {view === 'pads' && (
          <div className="spx10-pads-wrap">
            <div className="spx10-pads">
              {[3,2,1,0].map(row => (
                <div key={row} className="spx10-pad-row">
                  {[0,1,2,3].map(col => {
                    const pi  = row * 4 + col;
                    const pad = pads[pi];
                    return (
                      <div key={pi}
                        className={`spx10-pad${pad.processedBuffer ? ' loaded' : ''}${activeSteps.includes(pi) ? ' firing' : ''}${selectedPad === pi ? ' selected' : ''}${pad.muted ? ' muted' : ''}`}
                        onMouseDown={() => { setSelectedPad(pi); triggerPad(pi, 0.9); }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadSample(pi, f); }}
                        onDoubleClick={() => fileSelect(pi)}>
                        <span className="spx10-pad-num">{pi + 1}</span>
                        {pad.name
                          ? <span className="spx10-pad-name">{pad.name}</span>
                          : <span className="spx10-pad-drop">DROP</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Pad settings panel */}
            {selectedPad !== null && pads[selectedPad] && (
              <div className="spx10-pad-settings">
                <div className="spx10-settings-title">
                  PAD {selectedPad + 1}{pads[selectedPad].name ? ` — ${pads[selectedPad].name}` : ''}
                </div>
                <div className="spx10-settings-grid">
                  {[
                    { key: 'volume',    label: 'VOL',    min: 0,    max: 1,     step: 0.01  },
                    { key: 'tune',      label: 'TUNE',   min: -12,  max: 12,    step: 0.1   },
                    { key: 'pan',       label: 'PAN',    min: -1,   max: 1,     step: 0.01  },
                    { key: 'decay',     label: 'DECAY',  min: 0.05, max: 4,     step: 0.05  },
                    { key: 'cutoff',    label: 'CUTOFF', min: 200,  max: 20000, step: 100   },
                    { key: 'resonance', label: 'RESO',   min: 0,    max: 0.9,   step: 0.01  },
                  ].map(({ key, label, min, max, step: s }) => (
                    <div key={key} className="spx10-knob-row">
                      <label className="spx10-knob-label">{label}</label>
                      <input className="spx10-range" type="range" min={min} max={max} step={s}
                        value={pads[selectedPad][key] ?? (key === 'volume' ? 1 : key === 'cutoff' ? 16000 : 0)}
                        onChange={e => updatePad(selectedPad, key, +e.target.value)} />
                      <span className="spx10-val">{Number(pads[selectedPad][key] ?? 0).toFixed(key === 'cutoff' ? 0 : 2)}</span>
                    </div>
                  ))}
                  <div className="spx10-knob-row">
                    <label className="spx10-knob-label">CHOKE</label>
                    <select className="spx10-select" value={pads[selectedPad].chokeGroup}
                      onChange={e => updatePad(selectedPad, 'chokeGroup', +e.target.value)}>
                      <option value={0}>OFF</option>
                      {Array.from({ length: CHOKE_GROUPS }, (_, i) => (
                        <option key={i+1} value={i+1}>GRP {i+1}</option>
                      ))}
                    </select>
                  </div>
                  <div className="spx10-knob-row">
                    <label className="spx10-knob-label">MUTE</label>
                    <input type="checkbox" checked={pads[selectedPad].muted}
                      onChange={e => updatePad(selectedPad, 'muted', e.target.checked)} />
                  </div>
                </div>
                <div className="spx10-settings-actions">
                  <button className="spx10-action-btn" onClick={() => fileSelect(selectedPad)}>📂 LOAD</button>
                  <button className="spx10-action-btn" onClick={() => clearPad(selectedPad)}>✕ CLEAR</button>
                  {pads[selectedPad].processedBuffer && onSendToArrange && (
                    <button className="spx10-action-btn" onClick={() => onSendToArrange(selectedPad, pads[selectedPad])}>→ ARR</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Sequencer ── */}
        {view === 'seq' && (
          <div className="spx10-seq">
            <div className="spx10-seq-grid">
              {pads.map((pad, pi) => (
                <div key={pi} className="spx10-seq-row">
                  <button className="spx10-seq-pad-btn" onMouseDown={() => triggerPad(pi, 0.9)}>
                    {pad.name || `P${pi+1}`}
                  </button>
                  <div className="spx10-seq-steps">
                    {seq.steps.map((row, si) => (
                      <button key={si}
                        className={`spx10-step${row[pi]?.on ? ' on' : ''}${si === step && (playing || syncToMaster) ? ' current' : ''}${si % 4 === 0 ? ' beat' : ''}`}
                        onClick={() => toggleStep(si, pi)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Keyboard strip — ASR-10 61-key workstation ── */}
      <div className="spx10-keyboard-section">
        <div className="spx10-keyboard-controls">
          <span className="spx10-key-label">KEYBOARD — OCT {octave}</span>
          <button className="spx10-oct-btn" onClick={() => setOctave(p => Math.max(1, p - 1))}>OCT −</button>
          <button className="spx10-oct-btn" onClick={() => setOctave(p => Math.min(7, p + 1))}>OCT +</button>
        </div>
        <div className="spx10-keyboard">
          {keys.filter(k => k.type === 'white').map((key, i) => (
            <div key={i}
              className={`spx10-key-white${activeSteps.includes(key.padIdx) ? ' active' : ''}`}
              onMouseDown={() => triggerKey(key.padIdx)}>
              <span className="spx10-key-note">{key.note}</span>
            </div>
          ))}
          {keys.filter(k => k.type === 'black').map((key, i) => {
            const whiteWidth = 100 / WHITE_KEYS;
            const leftPct    = (key.whiteIdx + 0.65) * whiteWidth;
            return (
              <div key={i}
                className={`spx10-key-black${activeSteps.includes(key.padIdx) ? ' active' : ''}`}
                onMouseDown={e => { e.stopPropagation(); triggerKey(key.padIdx); }}
                style={{ left: `${leftPct}%` }}>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── DSP strip ── */}
      <div className="spx10-dsp-strip">
        {['16-BIT','44.1kHz','OTTO CHIP','4-POLE FILTER','ONBOARD REVERB','CHORUS','TPDF DITHER'].map(b => (
          <span key={b} className="spx10-dsp-badge">{b}</span>
        ))}
      </div>
    </div>
  );
}
