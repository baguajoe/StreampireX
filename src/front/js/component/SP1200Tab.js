import '../../styles/SP1200Tab.css';
// =============================================================================
// SP1200Tab.js — StreamPireX SP-1200 Engine
// E-mu SP-1200 (1987) emulation:
// 26.04kHz resample, asymmetric E-mu 6364 chip saturation,
// low-end emphasis, hard transient crush, 12kHz rolloff
// 4 banks × 16 pads, 10-second total sample time sim, boom bap sequencer
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

// =============================================================================
// CONSTANTS — faithful to SP-1200 spec
// =============================================================================
const SP_BANKS       = ['A', 'B', 'C', 'D'];
const SP_PADS        = 16;
const SP_SAMPLE_RATE = 26040;   // SP-1200's actual sample rate
const SP_BIT_DEPTH   = 12;
const SP_NOISE_FLOOR = 0.00035; // harsher than MPC3000
const SP_ROLLOFF_HZ  = 12000;   // SP-1200 cuts at 12kHz
const SP_PPQN        = 24;      // SP-1200 was 24 PPQN (less resolution than MPC3000)
const SP_MAX_SEQS    = 32;
const SP_MAX_BARS    = 99;

const PAD_LAYOUT = [
  [12, 13, 14, 15],
  [ 8,  9, 10, 11],
  [ 4,  5,  6,  7],
  [ 0,  1,  2,  3],
];

const mkPad = (idx) => ({
  idx,
  name: '',
  buffer: null,
  url: null,
  color: '#8b0000',
  volume: 1.0,
  pan: 0,
  pitch: 0,
  chokeGroup: 0,
  muted: false,
  oneShot: true,
});

const mkBank = () => Array.from({ length: SP_PADS }, (_, i) => mkPad(i));

// =============================================================================
// SP-1200 DSP ENGINE
// =============================================================================

// E-mu 6364 asymmetric nonlinear saturation — even harmonics = analog warmth
const emuSaturate = (x, drive = 1.4) => {
  const d = x * drive;
  return d > 0
    ? d / (1 + 0.8  * d)
    : d / (1 + 1.25 * Math.abs(d));
};

// 26.04kHz resample — the core of the SP-1200 sound
const applySpResample = (ctx, buffer) => {
  if (!buffer) return buffer;
  const ratio  = SP_SAMPLE_RATE / buffer.sampleRate;
  const nc     = buffer.numberOfChannels;
  const srcLen = buffer.length;
  const dnLen  = Math.floor(srcLen * ratio);
  const out    = ctx.createBuffer(nc, srcLen, buffer.sampleRate);

  for (let ch = 0; ch < nc; ch++) {
    const src  = buffer.getChannelData(ch);
    const dst  = out.getChannelData(ch);
    const down = new Float32Array(dnLen);

    // Downsample — NO anti-alias filter (authentic to hardware)
    for (let i = 0; i < dnLen; i++) down[i] = src[Math.floor(i / ratio)];

    // Upsample back with linear interp
    for (let i = 0; i < srcLen; i++) {
      const pos  = i * ratio;
      const idx  = Math.floor(pos);
      const frac = pos - idx;
      const a    = down[Math.min(idx,     dnLen - 1)];
      const b    = down[Math.min(idx + 1, dnLen - 1)];
      dst[i]     = a + frac * (b - a);
    }
  }
  return out;
};

// SP-1200 12-bit quantization with harsh dither
const applySp12bit = (ctx, buffer) => {
  if (!buffer) return buffer;
  const STEPS = 4096;
  const nc    = buffer.numberOfChannels;
  const len   = buffer.length;
  const out   = ctx.createBuffer(nc, len, buffer.sampleRate);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const q      = Math.round(src[i] * STEPS) / STEPS;
      const dither = (Math.random() - 0.48) * SP_NOISE_FLOOR; // asymmetric dither
      dst[i]       = q + dither;
    }
  }
  return out;
};

// SP-1200 12kHz rolloff
const applySpRolloff = (ctx, buffer) => {
  if (!buffer) return buffer;
  const rc  = 1.0 / (2 * Math.PI * SP_ROLLOFF_HZ);
  const dt  = 1.0 / buffer.sampleRate;
  const a   = dt / (rc + dt);
  const nc  = buffer.numberOfChannels;
  const len = buffer.length;
  const out = ctx.createBuffer(nc, len, buffer.sampleRate);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    let prev  = 0;
    for (let i = 0; i < len; i++) {
      prev   = a * src[i] + (1 - a) * prev;
      dst[i] = prev;
    }
  }
  return out;
};

// SP-1200 low-end emphasis + transient crush — the boom bap secret
const applySpLowEnd = (ctx, buffer, emphasis = 0.45) => {
  if (!buffer) return buffer;
  const nc  = buffer.numberOfChannels;
  const len = buffer.length;
  const out = ctx.createBuffer(nc, len, buffer.sampleRate);
  const sr  = buffer.sampleRate;
  const wc  = 2 * Math.PI * 180 / sr;
  const a   = wc / (1 + wc);

  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    let lp = 0, envelope = 0;
    for (let i = 0; i < len; i++) {
      lp       = lp + a * (src[i] - lp);
      const abs = Math.abs(src[i]);
      envelope  = abs > envelope
        ? envelope + 0.3   * (abs - envelope)
        : envelope + 0.002 * (abs - envelope);
      const crushed = src[i] / (1 + 0.6 * envelope);
      const boosted = crushed + lp * emphasis;
      dst[i]        = emuSaturate(boosted, 1.3);
    }
  }
  return out;
};

// Full SP-1200 chain
const applySp1200Chain = (ctx, buffer) => {
  if (!buffer) return buffer;
  let buf = buffer;
  buf = applySpResample(ctx, buf);
  buf = applySp12bit(ctx, buf);
  buf = applySpRolloff(ctx, buf);
  buf = applySpLowEnd(ctx, buf);
  return buf;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function SP1200Tab({ onExport, onSendToArrange, isEmbedded }) {
  // ── Audio context ──────────────────────────────────────────────────────────
  const ctxRef    = useRef(null);
  const masterRef = useRef(null);
  const dacCache  = useRef({});

  const initCtx = useCallback(() => {
    if (ctxRef.current) return;
    const ctx    = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);
    ctxRef.current  = ctx;
    masterRef.current = master;
  }, []);

  // ── State ──────────────────────────────────────────────────────────────────
  const [banks, setBanks]           = useState({
    A: mkBank(), B: mkBank(), C: mkBank(), D: mkBank()
  });
  const [activeBank, setActiveBank] = useState('A');
  const [selectedPad, setSelectedPad] = useState(null);
  const [activePads, setActivePads]   = useState(new Set());
  const [dragPad, setDragPad]         = useState(null);

  // Sequencer
  const [bpm, setBpm]               = useState(90);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [curStep, setCurStep]       = useState(0);
  const [steps, setSteps]           = useState(16);
  const [swing, setSwing]           = useState(0);
  const [sequences, setSequences]   = useState(() => {
    // 32 sequences, each with 16 pads × 16 steps
    return Array.from({ length: SP_MAX_SEQS }, (_, si) => ({
      id: si,
      name: `SEQ ${si + 1}`,
      bars: 1,
      events: [], // { pad, bank, step, vel }
    }));
  });
  const [activeSeq, setActiveSeq]   = useState(0);
  const [view, setView]             = useState('pads'); // pads | sequencer

  // DSP controls
  const [spChainEnabled, setSpChainEnabled] = useState(true);
  const [emphasisAmt, setEmphasisAmt]       = useState(0.45);
  const [masterVol, setMasterVol]           = useState(85);
  const [noiseEnabled, setNoiseEnabled]     = useState(true);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const activeBankRef  = useRef(activeBank);
  const bpmRef         = useRef(bpm);
  const isPlayingRef   = useRef(isPlaying);
  const isRecordingRef = useRef(isRecording);
  const curStepRef     = useRef(0);
  const seqTimerRef    = useRef(null);
  const chopSrcRef     = useRef({});  // pad sources for choke
  const activeSeqRef   = useRef(activeSeq);
  const swingRef       = useRef(swing);
  const stepsRef       = useRef(steps);

  useEffect(() => { activeBankRef.current  = activeBank; },  [activeBank]);
  useEffect(() => { bpmRef.current         = bpm; },         [bpm]);
  useEffect(() => { isPlayingRef.current   = isPlaying; },   [isPlaying]);
  useEffect(() => { isRecordingRef.current = isRecording; },  [isRecording]);
  useEffect(() => { activeSeqRef.current   = activeSeq; },   [activeSeq]);
  useEffect(() => { swingRef.current       = swing; },       [swing]);
  useEffect(() => { stepsRef.current       = steps; },       [steps]);

  useEffect(() => {
    if (masterRef.current) masterRef.current.gain.value = masterVol / 100;
  }, [masterVol]);

  // ── Sample loading ─────────────────────────────────────────────────────────
  const loadSample = useCallback(async (bank, padIdx, file) => {
    initCtx();
    const ctx = ctxRef.current;
    const url = URL.createObjectURL(file);
    try {
      const ab  = await file.arrayBuffer();
      const raw = await ctx.decodeAudioData(ab);
      const cacheKey = `${bank}_${padIdx}_${spChainEnabled ? 1 : 0}_${emphasisAmt}`;
      let processed = spChainEnabled ? applySp1200Chain(ctx, raw) : raw;
      dacCache.current[cacheKey] = processed;
      setBanks(prev => ({
        ...prev,
        [bank]: prev[bank].map((p, i) =>
          i === padIdx ? {
            ...p,
            buffer: processed,
            url,
            name: file.name.replace(/\.[^.]+$/, '').slice(0, 14),
          } : p
        )
      }));
    } catch (e) {
      console.error('SP-1200 load error:', e);
    }
  }, [spChainEnabled, emphasisAmt, initCtx]);

  const fileSelect = useCallback((bank, padIdx) => {
    const inp    = document.createElement('input');
    inp.type     = 'file';
    inp.accept   = 'audio/*,.wav,.mp3,.ogg,.flac,.aiff,.m4a';
    inp.onchange = (e) => { if (e.target.files[0]) loadSample(bank, padIdx, e.target.files[0]); };
    inp.click();
  }, [loadSample]);

  const onDragOver = useCallback((e, padIdx) => {
    e.preventDefault(); e.stopPropagation();
    setDragPad(padIdx);
  }, []);

  const onDragLeave = useCallback(() => setDragPad(null), []);

  const onDrop = useCallback((e, padIdx) => {
    e.preventDefault(); e.stopPropagation();
    setDragPad(null);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('audio/') || /\.(wav|mp3|ogg|flac|aiff|m4a)$/i.test(file.name))) {
      loadSample(activeBankRef.current, padIdx, file);
    }
  }, [loadSample]);

  // ── Pad hit ────────────────────────────────────────────────────────────────
  const playPad = useCallback((padIdx, vel = 100, bank = null) => {
    initCtx();
    const ctx  = ctxRef.current;
    const b    = bank || activeBankRef.current;
    const pad  = banks[b]?.[padIdx];
    if (!pad?.buffer) return;

    // Choke group
    if (pad.chokeGroup > 0) {
      Object.entries(chopSrcRef.current).forEach(([key, src]) => {
        const [, , cg] = key.split('_');
        if (parseInt(cg) === pad.chokeGroup && key !== `${b}_${padIdx}_${pad.chokeGroup}`) {
          try { src.stop(); } catch (_) {}
        }
      });
    }

    const src  = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = pad.buffer;
    gain.gain.value = (pad.volume || 1.0) * (vel / 127);

    // Pan
    if (pad.pan !== 0) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pad.pan;
      src.connect(gain);
      gain.connect(panner);
      panner.connect(masterRef.current);
    } else {
      src.connect(gain);
      gain.connect(masterRef.current);
    }

    src.start();
    if (pad.chokeGroup > 0) {
      chopSrcRef.current[`${b}_${padIdx}_${pad.chokeGroup}`] = src;
    }

    // Visual flash
    setActivePads(prev => { const n = new Set(prev); n.add(`${b}_${padIdx}`); return n; });
    setTimeout(() => setActivePads(prev => { const n = new Set(prev); n.delete(`${b}_${padIdx}`); return n; }), 120);

    // Record
    if (isRecordingRef.current) {
      const stepMs   = (60000 / bpmRef.current) / (SP_PPQN / 4);
      const beatMs   = 60000 / bpmRef.current;
      const totalMs  = stepsRef.current * beatMs / 4;
      const now      = Date.now();
      const step     = Math.round((now % totalMs) / stepMs) % stepsRef.current;
      setSequences(prev => prev.map((seq, si) =>
        si !== activeSeqRef.current ? seq : {
          ...seq,
          events: [...seq.events.filter(ev => !(ev.pad === padIdx && ev.bank === b && ev.step === step)),
            { pad: padIdx, bank: b, step, vel }]
        }
      ));
    }
  }, [banks, initCtx]);

  // ── Sequencer ──────────────────────────────────────────────────────────────
  const startSeq = useCallback(() => {
    initCtx();
    curStepRef.current = 0;
    setIsPlaying(true);
    isPlayingRef.current = true;

    const tick = () => {
      if (!isPlayingRef.current) return;
      const step    = curStepRef.current;
      const seq     = sequences[activeSeqRef.current];
      const beatMs  = 60000 / bpmRef.current;
      const stepMs  = beatMs / 4;
      const swingMs = step % 2 === 1 ? (swingRef.current / 100) * stepMs * 0.5 : 0;

      // Fire events on this step
      seq.events.filter(ev => ev.step === step).forEach(ev => {
        playPad(ev.pad, ev.vel, ev.bank);
      });

      setCurStep(step);
      curStepRef.current = (step + 1) % stepsRef.current;
      seqTimerRef.current = setTimeout(tick, stepMs + swingMs);
    };
    tick();
  }, [sequences, playPad, initCtx]);

  const stopSeq = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (seqTimerRef.current) clearTimeout(seqTimerRef.current);
    setCurStep(0);
    curStepRef.current = 0;
  }, []);

  useEffect(() => () => { if (seqTimerRef.current) clearTimeout(seqTimerRef.current); }, []);

  // ── Toggle step ────────────────────────────────────────────────────────────
  const toggleStep = useCallback((padIdx, step) => {
    setSequences(prev => prev.map((seq, si) => {
      if (si !== activeSeq) return seq;
      const exists = seq.events.some(ev => ev.pad === padIdx && ev.step === step && ev.bank === activeBank);
      return {
        ...seq,
        events: exists
          ? seq.events.filter(ev => !(ev.pad === padIdx && ev.step === step && ev.bank === activeBank))
          : [...seq.events, { pad: padIdx, bank: activeBank, step, vel: 100 }]
      };
    }));
  }, [activeSeq, activeBank]);

  const curPads = banks[activeBank];
  const curSeq  = sequences[activeSeq];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="sp1200-root">

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <div className="sp1200-status-bar">
        <span className="sp1200-logo">SP<span className="sp1200-logo-sub">•1200</span></span>
        <div className="sp1200-status-info">
          <span className="sp1200-status-tag">E-MU 1987</span>
          <span className="sp1200-status-tag">26kHz</span>
          <span className="sp1200-status-tag">12-BIT</span>
          <span className="sp1200-status-tag sp1200-status-boom">BOOM BAP</span>
        </div>
        <div className="sp1200-transport">
          <button
            className={`sp1200-btn-transport ${isRecording ? 'rec' : ''}`}
            onClick={() => setIsRecording(r => !r)}
          >● REC</button>
          <button
            className={`sp1200-btn-transport ${isPlaying ? 'active' : ''}`}
            onClick={isPlaying ? stopSeq : startSeq}
          >{isPlaying ? '■ STOP' : '▶ PLAY'}</button>
        </div>
        <div className="sp1200-bpm-block">
          <span className="sp1200-bpm-val">{bpm}</span>
          <span className="sp1200-bpm-label">BPM</span>
          <div className="sp1200-bpm-btns">
            <button onClick={() => setBpm(b => Math.min(300, b + 1))}>▲</button>
            <button onClick={() => setBpm(b => Math.max(20,  b - 1))}>▼</button>
          </div>
        </div>
      </div>

      {/* ── Controls bar ─────────────────────────────────────────────────── */}
      <div className="sp1200-ctrl-bar">
        <div className="sp1200-ctrl-group">
          <span className="sp1200-ctrl-label">STEPS</span>
          <select className="sp1200-select" value={steps} onChange={e => setSteps(Number(e.target.value))}>
            {[8,16,32].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="sp1200-ctrl-group">
          <span className="sp1200-ctrl-label">SWING</span>
          <input type="range" min={0} max={75} value={swing}
            onChange={e => setSwing(Number(e.target.value))} className="sp1200-range"/>
          <span className="sp1200-ctrl-val">{swing}%</span>
        </div>
        <div className="sp1200-ctrl-group">
          <span className="sp1200-ctrl-label">VOL</span>
          <input type="range" min={0} max={100} value={masterVol}
            onChange={e => setMasterVol(Number(e.target.value))} className="sp1200-range"/>
          <span className="sp1200-ctrl-val">{masterVol}%</span>
        </div>
        <div className="sp1200-ctrl-group">
          <label className="sp1200-check-label">
            <input type="checkbox" checked={spChainEnabled}
              onChange={e => { setSpChainEnabled(e.target.checked); dacCache.current = {}; }}/>
            SP CHAIN
          </label>
        </div>
        <div className="sp1200-ctrl-group">
          <span className="sp1200-ctrl-label">EMPH</span>
          <input type="range" min={0} max={1} step={0.05} value={emphasisAmt}
            onChange={e => { setEmphasisAmt(Number(e.target.value)); dacCache.current = {}; }}
            className="sp1200-range"/>
          <span className="sp1200-ctrl-val">{emphasisAmt.toFixed(2)}</span>
        </div>
      </div>

      {/* ── View tabs ────────────────────────────────────────────────────── */}
      <div className="sp1200-view-tabs">
        {['pads','sequencer'].map(v => (
          <button key={v} className={`sp1200-view-tab ${view === v ? 'active' : ''}`}
            onClick={() => setView(v)}>
            {v.toUpperCase()}
          </button>
        ))}
        {/* Sequence selector */}
        <select className="sp1200-select sp1200-seq-sel"
          value={activeSeq} onChange={e => setActiveSeq(Number(e.target.value))}>
          {sequences.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
        </select>
        <button className="sp1200-btn-sm" onClick={() => {
          setSequences(prev => prev.map((s, i) =>
            i !== activeSeq ? s : { ...s, events: [] }
          ));
        }}>CLR</button>
      </div>

      {/* ── PADS VIEW ────────────────────────────────────────────────────── */}
      {view === 'pads' && (
        <div className="sp1200-pads-view">

          {/* Bank selector */}
          <div className="sp1200-bank-row">
            {SP_BANKS.map(b => (
              <button key={b}
                className={`sp1200-bank-btn ${activeBank === b ? 'active' : ''}`}
                onClick={() => setActiveBank(b)}>
                <span className="sp1200-bank-letter">BANK {b}</span>
                <span className="sp1200-bank-count">
                  {banks[b].filter(p => p.buffer).length}/16
                </span>
              </button>
            ))}
          </div>

          {/* 4×4 Pad grid */}
          <div className="sp1200-pad-grid">
            {PAD_LAYOUT.map(row =>
              row.map(padIdx => {
                const pad       = curPads[padIdx];
                const key       = `${activeBank}_${padIdx}`;
                const isActive  = activePads.has(key);
                const isSelected = selectedPad === padIdx;
                const isDragging = dragPad === padIdx;
                return (
                  <div key={padIdx}
                    className={`sp1200-pad ${pad.buffer ? 'loaded' : 'empty'} ${isActive ? 'hitting' : ''} ${isSelected ? 'selected' : ''} ${isDragging ? 'drag-over' : ''} ${pad.muted ? 'muted' : ''}`}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      initCtx();
                      const vel = e.shiftKey ? 64 : e.ctrlKey ? 127 : 100;
                      playPad(padIdx, vel);
                    }}
                    onContextMenu={e => { e.preventDefault(); setSelectedPad(padIdx); }}
                    onDragOver={e => onDragOver(e, padIdx)}
                    onDragLeave={onDragLeave}
                    onDrop={e => onDrop(e, padIdx)}
                    onClick={e => { if (!pad.buffer && !e.defaultPrevented) fileSelect(activeBank, padIdx); }}
                  >
                    <span className="sp1200-pad-num">{padIdx + 1}</span>
                    {pad.buffer && (
                      <div className="sp1200-pad-loaded-bar"/>
                    )}
                    <span className="sp1200-pad-name">
                      {pad.buffer
                        ? pad.name
                        : <span className="sp1200-pad-hint">DROP AUDIO</span>
                      }
                    </span>
                    <button className="sp1200-pad-load"
                      onClick={e => { e.stopPropagation(); fileSelect(activeBank, padIdx); }}
                      title="Load sample">📂</button>
                    {isActive && <div className="sp1200-pad-flash"/>}
                  </div>
                );
              })
            )}
          </div>

          {/* Pad settings — shown when pad selected */}
          {selectedPad !== null && curPads[selectedPad] && (
            <div className="sp1200-pad-settings">
              <div className="sp1200-pad-settings-title">
                PAD {selectedPad + 1} — {curPads[selectedPad].name || 'EMPTY'}
                <button className="sp1200-btn-sm" onClick={() => setSelectedPad(null)}>✕</button>
              </div>
              <div className="sp1200-pad-settings-row">
                {[
                  ['VOL', 'volume', 0, 1, 0.01, curPads[selectedPad].volume ?? 1],
                  ['PAN', 'pan',   -1, 1, 0.01, curPads[selectedPad].pan ?? 0],
                  ['PITCH', 'pitch', -24, 24, 1, curPads[selectedPad].pitch ?? 0],
                ].map(([lbl, key, min, max, step, val]) => (
                  <div key={key} className="sp1200-pad-ctrl">
                    <span className="sp1200-ctrl-label">{lbl}</span>
                    <input type="range" min={min} max={max} step={step} value={val}
                      className="sp1200-range"
                      onChange={e => setBanks(prev => ({
                        ...prev,
                        [activeBank]: prev[activeBank].map((p, i) =>
                          i === selectedPad ? { ...p, [key]: Number(e.target.value) } : p
                        )
                      }))}/>
                    <span className="sp1200-ctrl-val">{Number(val).toFixed(2)}</span>
                  </div>
                ))}
                <div className="sp1200-pad-ctrl">
                  <span className="sp1200-ctrl-label">CHOKE</span>
                  <select className="sp1200-select"
                    value={curPads[selectedPad].chokeGroup ?? 0}
                    onChange={e => setBanks(prev => ({
                      ...prev,
                      [activeBank]: prev[activeBank].map((p, i) =>
                        i === selectedPad ? { ...p, chokeGroup: Number(e.target.value) } : p
                      )
                    }))}>
                    <option value={0}>OFF</option>
                    {[1,2,3,4,5,6,7,8].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <label className="sp1200-check-label">
                  <input type="checkbox"
                    checked={curPads[selectedPad].muted ?? false}
                    onChange={e => setBanks(prev => ({
                      ...prev,
                      [activeBank]: prev[activeBank].map((p, i) =>
                        i === selectedPad ? { ...p, muted: e.target.checked } : p
                      )
                    }))}/>
                  MUTE
                </label>
                {curPads[selectedPad].buffer && (
                  <button className="sp1200-btn-sm sp1200-btn-danger"
                    onClick={() => {
                      setBanks(prev => ({
                        ...prev,
                        [activeBank]: prev[activeBank].map((p, i) =>
                          i === selectedPad ? mkPad(selectedPad) : p
                        )
                      }));
                      setSelectedPad(null);
                    }}>CLEAR</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SEQUENCER VIEW ───────────────────────────────────────────────── */}
      {view === 'sequencer' && (
        <div className="sp1200-seq-view">
          <div className="sp1200-seq-grid">
            {/* Step headers */}
            <div className="sp1200-seq-header">
              <div className="sp1200-seq-pad-label"/>
              {Array.from({ length: steps }, (_, s) => (
                <div key={s} className={`sp1200-seq-step-num ${curStep === s && isPlaying ? 'current' : ''}`}>
                  {s + 1}
                </div>
              ))}
            </div>
            {/* Pad rows — show active bank pads */}
            {curPads.map((pad, padIdx) => {
              if (!pad.buffer) return null;
              return (
                <div key={padIdx} className="sp1200-seq-row">
                  <div className="sp1200-seq-pad-label"
                    onMouseDown={() => playPad(padIdx, 100)}>
                    {pad.name || `PAD ${padIdx + 1}`}
                  </div>
                  {Array.from({ length: steps }, (_, s) => {
                    const on = curSeq.events.some(ev =>
                      ev.pad === padIdx && ev.step === s && ev.bank === activeBank
                    );
                    return (
                      <div key={s}
                        className={`sp1200-seq-cell ${on ? 'on' : ''} ${curStep === s && isPlaying ? 'playing' : ''}`}
                        onClick={() => toggleStep(padIdx, s)}
                      />
                    );
                  })}
                </div>
              );
            })}
            {curPads.every(p => !p.buffer) && (
              <div className="sp1200-seq-empty">Load samples onto pads first</div>
            )}
          </div>
        </div>
      )}

      {/* ── DSP info bar ─────────────────────────────────────────────────── */}
      <div className="sp1200-dsp-bar">
        <span className="sp1200-dsp-label">SP-1200 CHARACTER</span>
        <span className={`sp1200-dsp-chip ${spChainEnabled ? 'active' : ''}`}>26kHz RESAMPLE</span>
        <span className={`sp1200-dsp-chip ${spChainEnabled ? 'active' : ''}`}>12-BIT DAC</span>
        <span className={`sp1200-dsp-chip ${spChainEnabled ? 'active' : ''}`}>EMU SATURATE</span>
        <span className={`sp1200-dsp-chip ${spChainEnabled ? 'active' : ''}`}>12kHz ROLLOFF</span>
        <span className={`sp1200-dsp-chip ${spChainEnabled ? 'active' : ''}`}>LOW CRUNCH</span>
      </div>

    </div>
  );
}
