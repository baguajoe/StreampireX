// =============================================================================
// SPXEPSTab.js — SPX-EPS Sampler Engine
// 13-bit / variable rate (27.5kHz–29.4kHz), DOC chip emulation,
// low-mid emphasis, asymmetric noise floor, gritty textured character
// own timeline + shared master clock sync
// =============================================================================
import React, { useState, useRef, useCallback, useEffect } from 'react';
import '../../styles/SPXEPSTab.css';

const PADS          = 16;
const SAMPLE_RATE   = 29400;    // 29.4kHz — upper end of EPS variable rate
const ROLLOFF_HZ    = 13000;    // EPS rolls off earlier than clean samplers
const NOISE_FLOOR   = 0.00085;  // ~-61dB — noticeably noisy, part of the sound
const CHOKE_GROUPS  = 8;
const PPQN          = 96;

// EPS 13-bit: uses 8192 steps (2^13) but the DAC ladder was uneven
// This creates a specific non-uniform quantization error — we model it
// by applying a slight nonlinear curve before quantization
const epsQuantCurve = x => {
  // Slight mid compression — EPS DAC ladder was heavier in the midrange
  return x * (1 + 0.08 * Math.abs(x));
};

// DOC chip saturation — harder, less refined than E-mu or Akai
// Generates both even and odd harmonics — the "muddy but warm" character
const docSaturate = (x, drive = 1.35) => {
  const d = x * drive;
  // Harder symmetric core with slight asymmetric bias
  const sym  = d / (1 + Math.abs(d));
  const asym = d > 0 ? d * 0.04 : d * 0.02;
  return sym + asym;
};

// Low-mid emphasis — EPS had a resonant bump around 180–250Hz from output stage
// We model this as a simple biquad peaking filter applied to the buffer
const applyLowMidBump = (ctx, buffer) => {
  if (!buffer) return buffer;
  const sr  = buffer.sampleRate;
  const fc  = 220;                   // center freq Hz
  const Q   = 1.8;                   // narrowish peak
  const dBg = 2.2;                   // +2.2dB boost
  const A   = Math.pow(10, dBg / 40);
  const w0  = 2 * Math.PI * fc / sr;
  const alpha = Math.sin(w0) / (2 * Q);
  const b0 =  1 + alpha * A;
  const b1 = -2 * Math.cos(w0);
  const b2 =  1 - alpha * A;
  const a0 =  1 + alpha / A;
  const a1 = -2 * Math.cos(w0);
  const a2 =  1 - alpha / A;
  const B0 = b0/a0; const B1 = b1/a0; const B2 = b2/a0;
  const A1 = a1/a0; const A2 = a2/a0;
  const nc = buffer.numberOfChannels; const len = buffer.length;
  const out = ctx.createBuffer(nc, len, sr);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch); const dst = out.getChannelData(ch);
    let x1=0, x2=0, y1=0, y2=0;
    for (let i = 0; i < len; i++) {
      const x0 = src[i];
      const y0 = B0*x0 + B1*x1 + B2*x2 - A1*y1 - A2*y2;
      x2=x1; x1=x0; y2=y1; y1=y0; dst[i] = y0;
    }
  }
  return out;
};

// 13-bit quantization — non-uniform via DOC curve + TPDF dither
const apply13bit = (ctx, buffer) => {
  if (!buffer) return buffer;
  const nc = buffer.numberOfChannels; const len = buffer.length;
  const out = ctx.createBuffer(nc, len, buffer.sampleRate);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch); const dst = out.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const tpdf = (Math.random() - Math.random()) * NOISE_FLOOR;
      const curved = epsQuantCurve(src[i]);
      const q = Math.round(curved * 4096) / 4096; // 2^12 = 4096 (13-bit signed half)
      dst[i] = docSaturate(q) + tpdf;
    }
  }
  return out;
};

// 29.4kHz resample — dirtier aliasing than Akai 40kHz
const applyResample = (ctx, buffer) => {
  if (!buffer) return buffer;
  const ratio = SAMPLE_RATE / buffer.sampleRate;
  const nc = buffer.numberOfChannels; const srcLen = buffer.length;
  const dnLen = Math.floor(srcLen * ratio);
  const out = ctx.createBuffer(nc, srcLen, buffer.sampleRate);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch); const dst = out.getChannelData(ch);
    const down = new Float32Array(dnLen);
    for (let i = 0; i < dnLen; i++) {
      const pos = i / ratio; const idx = Math.floor(pos); const f = pos - idx;
      down[i] = src[Math.min(idx, srcLen-1)] * (1-f) + src[Math.min(idx+1, srcLen-1)] * f;
    }
    for (let i = 0; i < srcLen; i++) {
      const pos = i * ratio; const idx = Math.floor(pos); const f = pos - idx;
      dst[i] = down[Math.min(idx, dnLen-1)] * (1-f) + down[Math.min(idx+1, dnLen-1)] * f;
    }
  }
  return out;
};

const applyRolloff = (ctx, buffer) => {
  if (!buffer) return buffer;
  const a = (1/buffer.sampleRate) / (1/(2*Math.PI*ROLLOFF_HZ) + 1/buffer.sampleRate);
  const nc = buffer.numberOfChannels; const len = buffer.length;
  const out = ctx.createBuffer(nc, len, buffer.sampleRate);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch); const dst = out.getChannelData(ch);
    let prev = 0;
    for (let i = 0; i < len; i++) { prev = a*src[i] + (1-a)*prev; dst[i] = prev; }
  }
  return out;
};

const applyDSP = (ctx, buf) => {
  let b = applyResample(ctx, buf);
  b = apply13bit(ctx, b);
  b = applyRolloff(ctx, b);
  b = applyLowMidBump(ctx, b);
  return b;
};

const mkPad = idx => ({
  idx, name: '', buffer: null, processedBuffer: null,
  volume: 1.0, pan: 0, tune: 0, decay: 1.2, chokeGroup: 0, muted: false,
});

const mkSeq = (bars = 2) => ({
  bars,
  steps: Array.from({ length: bars * 16 }, () =>
    Array.from({ length: PADS }, () => ({ on: false, vel: 100 }))
  ),
});

export default function SPXEPSTab({ onExport, onSendToArrange, isEmbedded, masterClock, onSendToTriple }) {
  const [pads, setPads]               = useState(() => Array.from({ length: PADS }, (_, i) => mkPad(i)));
  const [sequences, setSequences]     = useState([mkSeq(2)]);
  const [seqIdx, setSeqIdx]           = useState(0);
  const [playing, setPlaying]         = useState(false);
  const [step, setStep]               = useState(0);
  const [bpm, setBpm]                 = useState(90);
  const [swing, setSwing]             = useState(0);
  const [bars, setBars]               = useState(2);
  const [selectedPad, setSelectedPad] = useState(null);
  const [view, setView]               = useState('pads');
  const [syncToMaster, setSyncToMaster] = useState(false);
  const [activeSteps, setActiveSteps]   = useState([]);

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

  useEffect(() => { bpmRef.current    = bpm; },       [bpm]);
  useEffect(() => { swingRef.current  = swing; },     [swing]);
  useEffect(() => { padsRef.current   = pads; },      [pads]);
  useEffect(() => { seqRef.current    = sequences; }, [sequences]);
  useEffect(() => { seqIdxRef.current = seqIdx; },    [seqIdx]);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctxRef.current;
  }, []);

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
    gain.gain.setTargetAtTime(0, ctx.currentTime + pad.decay * 0.85, pad.decay * 0.15);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pad.pan;
    src.connect(gain); gain.connect(panner); panner.connect(ctx.destination);
    src.start();
    src.onended = () => { srcMap.current[pi] = null; };
    srcMap.current[pi] = src;
  }, [getCtx, stopPadSrc]);

  const scheduleStep = useCallback(() => {
    if (!playRef.current) return;
    const seq = seqRef.current[seqIdxRef.current] || seqRef.current[0];
    const s = stepRef.current;
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
      const s = ms % (seq.bars * 16);
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
    const processed = applyDSP(ctx, decoded);
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
    setPads(prev => { const next = [...prev]; next[pi] = { ...next[pi], [key]: val }; padsRef.current = next; return next; });
  }, []);

  const seq = sequences[seqIdx] || sequences[0];

  return (
    <div className="spxeps-root">
      <div className="spxeps-header">
        <div className="spxeps-logo">
          <span className="spxeps-brand">SPX</span>
          <span className="spxeps-model">EPS</span>
        </div>
        <div className="spxeps-lcd">
          <span className="spxeps-lcd-item">{pads.filter(p => p.processedBuffer).length}/{PADS} LOADED</span>
          <span className="spxeps-lcd-item">BPM {bpm}</span>
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
          <label className="spxeps-label">BARS</label>
          <select className="spxeps-select" value={bars} onChange={e => updateBars(+e.target.value)}>
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
        <div className="spxeps-ctrl-group">
          <label className="spxeps-label">CLOCK</label>
          <button className={`spxeps-sync-btn${syncToMaster ? ' active' : ''}`}
            onClick={() => setSyncToMaster(p => !p)}>
            {syncToMaster ? '⟳ MASTER' : '⟳ OWN'}
          </button>
        </div>
        <div className="spxeps-ctrl-group">
          <button className={`spxeps-view-btn${view === 'pads' ? ' active' : ''}`} onClick={() => setView('pads')}>PADS</button>
          <button className={`spxeps-view-btn${view === 'seq' ? ' active' : ''}`} onClick={() => setView('seq')}>SEQ</button>
        </div>
      </div>

      {view === 'pads' && (
        <div className="spxeps-pads-wrap">
          <div className="spxeps-pads">
            {[3,2,1,0].map(row => (
              <div key={row} className="spxeps-pad-row">
                {[0,1,2,3].map(col => {
                  const pi = row * 4 + col; const pad = pads[pi];
                  return (
                    <div key={pi}
                      className={`spxeps-pad${pad.processedBuffer ? ' loaded' : ''}${activeSteps.includes(pi) ? ' firing' : ''}${selectedPad === pi ? ' selected' : ''}${pad.muted ? ' muted' : ''}`}
                      onMouseDown={() => { setSelectedPad(pi); triggerPad(pi, 0.9); }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadSample(pi, f); }}
                      onDoubleClick={() => fileSelect(pi)}>
                      <span className="spxeps-pad-num">{pi + 1}</span>
                      {pad.name ? <span className="spxeps-pad-name">{pad.name}</span>
                                : <span className="spxeps-pad-drop">DROP</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {selectedPad !== null && pads[selectedPad] && (
            <div className="spxeps-pad-settings">
              <div className="spxeps-settings-title">PAD {selectedPad + 1}{pads[selectedPad].name ? ` — ${pads[selectedPad].name}` : ''}</div>
              <div className="spxeps-settings-grid">
                {[
                  { key: 'volume', label: 'VOL',   min: 0,    max: 1,  step: 0.01 },
                  { key: 'tune',   label: 'TUNE',  min: -12,  max: 12, step: 0.1  },
                  { key: 'pan',    label: 'PAN',   min: -1,   max: 1,  step: 0.01 },
                  { key: 'decay',  label: 'DECAY', min: 0.05, max: 4,  step: 0.05 },
                ].map(({ key, label, min, max, step: s }) => (
                  <div key={key} className="spxeps-knob-row">
                    <label className="spxeps-knob-label">{label}</label>
                    <input className="spxeps-range" type="range" min={min} max={max} step={s}
                      value={pads[selectedPad][key] ?? (key === 'volume' ? 1 : 0)}
                      onChange={e => updatePad(selectedPad, key, +e.target.value)} />
                    <span className="spxeps-val">{Number(pads[selectedPad][key] ?? 0).toFixed(2)}</span>
                  </div>
                ))}
                <div className="spxeps-knob-row">
                  <label className="spxeps-knob-label">CHOKE</label>
                  <select className="spxeps-select" value={pads[selectedPad].chokeGroup}
                    onChange={e => updatePad(selectedPad, 'chokeGroup', +e.target.value)}>
                    <option value={0}>OFF</option>
                    {Array.from({ length: CHOKE_GROUPS }, (_, i) => (
                      <option key={i+1} value={i+1}>GRP {i+1}</option>
                    ))}
                  </select>
                </div>
                <div className="spxeps-knob-row">
                  <label className="spxeps-knob-label">MUTE</label>
                  <input type="checkbox" checked={pads[selectedPad].muted}
                    onChange={e => updatePad(selectedPad, 'muted', e.target.checked)} />
                </div>
              </div>
              <div className="spxeps-settings-actions">
                <button className="spxeps-action-btn" onClick={() => fileSelect(selectedPad)}>📂 LOAD</button>
                <button className="spxeps-action-btn" onClick={() => clearPad(selectedPad)}>✕ CLEAR</button>
                {pads[selectedPad].processedBuffer && onSendToArrange && (
                  <button className="spxeps-action-btn" onClick={() => onSendToArrange(selectedPad, pads[selectedPad])}>→ ARR</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'seq' && (
        <div className="spxeps-seq">
          <div className="spxeps-seq-grid">
            {pads.map((pad, pi) => (
              <div key={pi} className="spxeps-seq-row">
                <button className="spxeps-seq-pad-btn" onMouseDown={() => triggerPad(pi, 0.9)}>
                  {pad.name || `P${pi+1}`}
                </button>
                <div className="spxeps-seq-steps">
                  {seq.steps.map((row, si) => (
                    <button key={si}
                      className={`spxeps-step${row[pi]?.on ? ' on' : ''}${si === step && (playing || syncToMaster) ? ' current' : ''}${si % 4 === 0 ? ' beat' : ''}`}
                      onClick={() => toggleStep(si, pi)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="spxeps-dsp-strip">
        {['13-BIT','29.4kHz','DOC CHIP','LOW-MID BUMP','TPDF DITHER','ASYMMETRIC NOISE'].map(b => (
          <span key={b} className="spxeps-dsp-badge">{b}</span>
        ))}
      </div>
    </div>
  );
}
