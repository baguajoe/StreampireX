// =============================================================================
// SPXS1000Tab.js — SPX-1000 Sampler Engine
// 16-bit / 44.1kHz, linear PCM, cleanest of the vintage samplers
// Gentle output saturation, near-transparent — The Chronic / West Coast clean
// own timeline + shared master clock sync
// =============================================================================
import React, { useState, useRef, useCallback, useEffect } from 'react';
import '../../styles/SPXS1000Tab.css';

const PADS          = 16;
const SAMPLE_RATE   = 44100;
const ROLLOFF_HZ    = 20000;    // near full bandwidth — very clean
const NOISE_FLOOR   = 0.000012; // ~-98dB — essentially silent floor
const CHOKE_GROUPS  = 8;
const PPQN          = 96;

// Linear PCM output stage — very gentle saturation, almost transparent
// The S1000 was considered "too clean" by some producers — that IS the character
const linearSaturate = (x) => {
  // Soft ceiling only — no harmonic coloration, just gentle brick wall
  return Math.tanh(x * 1.02) / Math.tanh(1.02);
};

// Subtle high-freq air — S1000 had a slight 12kHz presence lift from output cap
const applyAirLift = (ctx, buffer) => {
  if (!buffer) return buffer;
  const sr  = buffer.sampleRate;
  const fc  = 12000;
  const Q   = 0.7;
  const dBg = 0.8; // very subtle +0.8dB air
  const A   = Math.pow(10, dBg / 40);
  const w0  = 2 * Math.PI * fc / sr;
  const alpha = Math.sin(w0) / (2 * Q);
  // High shelf
  const cosw = Math.cos(w0);
  const sqrtA = Math.sqrt(A);
  const b0 =     A*((A+1) + (A-1)*cosw + 2*sqrtA*alpha);
  const b1 = -2*A*((A-1) + (A+1)*cosw);
  const b2 =     A*((A+1) + (A-1)*cosw - 2*sqrtA*alpha);
  const a0 =        (A+1) - (A-1)*cosw + 2*sqrtA*alpha;
  const a1 =     2*((A-1) - (A+1)*cosw);
  const a2 =        (A+1) - (A-1)*cosw - 2*sqrtA*alpha;
  const B0=b0/a0; const B1=b1/a0; const B2=b2/a0; const A1=a1/a0; const A2=a2/a0;
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

// 16-bit linear PCM quantization
const apply16bit = (ctx, buffer) => {
  if (!buffer) return buffer;
  const nc = buffer.numberOfChannels; const len = buffer.length;
  const out = ctx.createBuffer(nc, len, buffer.sampleRate);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch); const dst = out.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const tpdf = (Math.random() - Math.random()) * NOISE_FLOOR;
      dst[i] = linearSaturate(Math.round(src[i] * 32768) / 32768) + tpdf;
    }
  }
  return out;
};

const applyDSP = (ctx, buf) => {
  let b = apply16bit(ctx, buf);
  b = applyAirLift(ctx, b);
  return b;
};

const mkPad = idx => ({
  idx, name: '', buffer: null, processedBuffer: null,
  volume: 1.0, pan: 0, tune: 0, decay: 1.0, chokeGroup: 0, muted: false,
});

const mkSeq = (bars = 2) => ({
  bars,
  steps: Array.from({ length: bars * 16 }, () =>
    Array.from({ length: PADS }, () => ({ on: false, vel: 100 }))
  ),
});

export default function SPXS1000Tab({ onExport, onSendToArrange, isEmbedded, masterClock, onSendToTriple }) {
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
    gain.gain.setTargetAtTime(0, ctx.currentTime + pad.decay * 0.85, pad.decay * 0.12);
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
    <div className="spxs1000-root">
      <div className="spxs1000-header">
        <div className="spxs1000-logo">
          <span className="spxs1000-brand">SPX</span>
          <span className="spxs1000-model">1000</span>
        </div>
        <div className="spxs1000-lcd">
          <span className="spxs1000-lcd-item">{pads.filter(p => p.processedBuffer).length}/{PADS} LOADED</span>
          <span className="spxs1000-lcd-item">BPM {bpm}</span>
          <span className="spxs1000-lcd-item">SEQ {seqIdx + 1}/{sequences.length}</span>
          {syncToMaster && <span className="spxs1000-lcd-sync">⟳ LINKED</span>}
        </div>
        <div className="spxs1000-transport">
          {!syncToMaster && (
            <button className={`spxs1000-btn${playing ? ' active' : ''}`} onClick={togglePlay}>
              {playing ? '⏹ STOP' : '▶ PLAY'}
            </button>
          )}
          <button className="spxs1000-btn" onClick={() => { stepRef.current = 0; setStep(0); }}>◀◀</button>
          <button className="spxs1000-btn" onClick={() => setSequences(p => [...p, mkSeq(bars)])}>+ SEQ</button>
        </div>
      </div>

      <div className="spxs1000-controls">
        <div className="spxs1000-ctrl-group spxs1000-master-knobs">
          <div className="spxs1000-knob-row">
            <label className="spxs1000-knob-label">MASTER</label>
            <input className="spxs1000-range" type="range" min={0} max={1} step={0.01}
              value={masterVol ?? 1}
              onChange={e => setMasterVol && setMasterVol(+e.target.value)} />
            <span className="spxs1000-val">{Math.round((masterVol ?? 1) * 100)}%</span>
          </div>
        </div>
        <div className="spxs1000-ctrl-group">
          <label className="spxs1000-label">BPM</label>
          <input className="spxs1000-range" type="range" min={40} max={240} value={bpm}
            onChange={e => { bpmRef.current = +e.target.value; setBpm(+e.target.value); }} />
          <span className="spxs1000-val">{bpm}</span>
        </div>
        <div className="spxs1000-ctrl-group">
          <label className="spxs1000-label">SWING</label>
          <input className="spxs1000-range" type="range" min={0} max={75} value={swing}
            onChange={e => { swingRef.current = +e.target.value; setSwing(+e.target.value); }} />
          <span className="spxs1000-val">{swing}%</span>
        </div>
        <div className="spxs1000-ctrl-group">
          <label className="spxs1000-label">BARS</label>
          <select className="spxs1000-select" value={bars} onChange={e => updateBars(+e.target.value)}>
            {[1,2,4,8].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="spxs1000-ctrl-group">
          <label className="spxs1000-label">SEQ</label>
          <select className="spxs1000-select" value={seqIdx}
            onChange={e => { seqIdxRef.current = +e.target.value; setSeqIdx(+e.target.value); }}>
            {sequences.map((_, i) => <option key={i} value={i}>SEQ {i+1}</option>)}
          </select>
        </div>
        <div className="spxs1000-ctrl-group">
          <label className="spxs1000-label">CLOCK</label>
          <button className={`spxs1000-sync-btn${syncToMaster ? ' active' : ''}`}
            onClick={() => setSyncToMaster(p => !p)}>
            {syncToMaster ? '⟳ MASTER' : '⟳ OWN'}
          </button>
        </div>
        <div className="spxs1000-ctrl-group">
          <button className={`spxs1000-view-btn${view === 'pads' ? ' active' : ''}`} onClick={() => setView('pads')}>PADS</button>
          <button className={`spxs1000-view-btn${view === 'seq' ? ' active' : ''}`} onClick={() => setView('seq')}>SEQ</button>
        </div>
      </div>

      {view === 'pads' && (
        <div className="spxs1000-pads-wrap">
          <div className="spxs1000-pads">
            {[3,2,1,0].map(row => (
              <div key={row} className="spxs1000-pad-row">
                {[0,1,2,3].map(col => {
                  const pi = row * 4 + col; const pad = pads[pi];
                  return (
                    <div key={pi}
                      className={`spxs1000-pad${pad.processedBuffer ? ' loaded' : ''}${activeSteps.includes(pi) ? ' firing' : ''}${selectedPad === pi ? ' selected' : ''}${pad.muted ? ' muted' : ''}`}
                      onMouseDown={() => { setSelectedPad(pi); triggerPad(pi, 0.9); }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadSample(pi, f); }}
                      onDoubleClick={() => fileSelect(pi)}>
                      <div className="spxs1000-pad-inner">
                        <span className="spxs1000-pad-num">{pi + 1}</span>
                        {pad.name ? <span className="spxs1000-pad-name">{pad.name}</span>
                                  : <span className="spxs1000-pad-drop">DROP</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {selectedPad !== null && pads[selectedPad] && (
            <div className="spxs1000-pad-settings">
              <div className="spxs1000-settings-title">PAD {selectedPad + 1}{pads[selectedPad].name ? ` — ${pads[selectedPad].name}` : ''}</div>
              <div className="spxs1000-settings-grid">
                {[
                  { key: 'volume', label: 'VOL',   min: 0,    max: 1,  step: 0.01 },
                  { key: 'tune',   label: 'TUNE',  min: -12,  max: 12, step: 0.1  },
                  { key: 'pan',    label: 'PAN',   min: -1,   max: 1,  step: 0.01 },
                  { key: 'decay',  label: 'DECAY', min: 0.05, max: 4,  step: 0.05 },
                ].map(({ key, label, min, max, step: s }) => (
                  <div key={key} className="spxs1000-knob-row">
                    <label className="spxs1000-knob-label">{label}</label>
                    <input className="spxs1000-range" type="range" min={min} max={max} step={s}
                      value={pads[selectedPad][key] ?? (key === 'volume' ? 1 : 0)}
                      onChange={e => updatePad(selectedPad, key, +e.target.value)} />
                    <span className="spxs1000-val">{Number(pads[selectedPad][key] ?? 0).toFixed(2)}</span>
                  </div>
                ))}
                <div className="spxs1000-knob-row">
                  <label className="spxs1000-knob-label">CHOKE</label>
                  <select className="spxs1000-select" value={pads[selectedPad].chokeGroup}
                    onChange={e => updatePad(selectedPad, 'chokeGroup', +e.target.value)}>
                    <option value={0}>OFF</option>
                    {Array.from({ length: CHOKE_GROUPS }, (_, i) => (
                      <option key={i+1} value={i+1}>GRP {i+1}</option>
                    ))}
                  </select>
                </div>
                <div className="spxs1000-knob-row">
                  <label className="spxs1000-knob-label">MUTE</label>
                  <input type="checkbox" checked={pads[selectedPad].muted}
                    onChange={e => updatePad(selectedPad, 'muted', e.target.checked)} />
                </div>
              </div>
              <div className="spxs1000-settings-actions">
                <button className="spxs1000-action-btn" onClick={() => fileSelect(selectedPad)}>📂 LOAD</button>
                {pads[selectedPad]?.processedBuffer && onChopRequest && (
                  <button className="spxs1000-action-btn" onClick={() => onChopRequest(pads[selectedPad].processedBuffer, updatePad, setPads)}>✂️ CHOP</button>
                )}
                <button className="spxs1000-action-btn" onClick={() => clearPad(selectedPad)}>✕ CLEAR</button>
                {pads[selectedPad].processedBuffer && onSendToArrange && (
                  <button className="spxs1000-action-btn" onClick={() => onSendToArrange(selectedPad, pads[selectedPad])}>→ ARR</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'seq' && (
        <div className="spxs1000-seq">
          <div className="spxs1000-seq-grid">
            {pads.map((pad, pi) => (
              <div key={pi} className="spxs1000-seq-row">
                <button className="spxs1000-seq-pad-btn" onMouseDown={() => triggerPad(pi, 0.9)}>
                  {pad.name || `P${pi+1}`}
                </button>
                <div className="spxs1000-seq-steps">
                  {seq.steps.map((row, si) => (
                    <button key={si}
                      className={`spxs1000-step${row[pi]?.on ? ' on' : ''}${si === step && (playing || syncToMaster) ? ' current' : ''}${si % 4 === 0 ? ' beat' : ''}`}
                      onClick={() => toggleStep(si, pi)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="spxs1000-dsp-strip">
        {['16-BIT','44.1kHz','LINEAR PCM','12kHz AIR LIFT','TPDF DITHER','WEST COAST CLEAN'].map(b => (
          <span key={b} className="spxs1000-dsp-badge">{b}</span>
        ))}
      </div>
    </div>
  );
}

export { applyDSP as dspChain };
