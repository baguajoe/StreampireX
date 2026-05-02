import '../../styles/SP1200Tab.css';
import SpecBadge from './sampler/SpecBadge';
import React, { useState, useRef, useCallback, useEffect } from 'react';

const SP_PADS = 8;
const SP_SAMPLE_RATE = 26040;
const SP_ROLLOFF_HZ  = 12000;
const SP_NOISE_FLOOR = 0.00035;
const SP_MAX_SEQS    = 32;

const mkPad = (idx) => ({
  idx, name: '', buffer: null, url: null,
  volume: 1.0, pan: 0, tune: 0, decay: 1.0,
  chokeGroup: 0, muted: false,
});

const emuSaturate = (x, drive = 1.4) => {
  const d = x * drive;
  return d > 0 ? d / (1 + 0.8 * d) : d / (1 + 1.25 * Math.abs(d));
};


// ─── Ring Mod variant — SP-1200 Ring ───────────────────────────────────────
// Metallic edge on top of SP-1200 character
// Ring modulation at ~680Hz (carrier) creates harmonic sidebands
// Adds the metallic, experimental texture of the SP1200 Ring variant
const RING_CARRIER_HZ = 680;

const applyRingMod = (ctx, buffer, amount = 0.35) => {
  if (!buffer) return buffer;
  const sr  = buffer.sampleRate;
  const nc  = buffer.numberOfChannels;
  const len = buffer.length;
  const out = ctx.createBuffer(nc, len, sr);
  const phase_inc = (2 * Math.PI * RING_CARRIER_HZ) / sr;
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    let phase = 0;
    for (let i = 0; i < len; i++) {
      const carrier = Math.sin(phase);
      // Blend dry + ring mod signal by amount
      dst[i] = src[i] * (1 - amount) + (src[i] * carrier) * amount;
      // Apply extra emuSaturate to add metallic grit
      dst[i] = emuSaturate(dst[i], 1.6);
      phase += phase_inc;
      if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
    }
  }
  return out;
};

const applySpResample = (ctx, buffer) => {
  if (!buffer) return buffer;
  const ratio = SP_SAMPLE_RATE / buffer.sampleRate;
  const nc = buffer.numberOfChannels;
  const srcLen = buffer.length;
  const dnLen = Math.floor(srcLen * ratio);
  const out = ctx.createBuffer(nc, srcLen, buffer.sampleRate);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    const down = new Float32Array(dnLen);
    for (let i = 0; i < dnLen; i++) down[i] = src[Math.floor(i / ratio)];
    for (let i = 0; i < srcLen; i++) {
      const pos = i * ratio;
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const a = down[Math.min(idx, dnLen - 1)];
      const b = down[Math.min(idx + 1, dnLen - 1)];
      dst[i] = a + frac * (b - a);
    }
  }
  return out;
};

const applySp12bit = (ctx, buffer) => {
  if (!buffer) return buffer;
  const nc = buffer.numberOfChannels;
  const len = buffer.length;
  const out = ctx.createBuffer(nc, len, buffer.sampleRate);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      // TPDF dither: two uniform randoms summed = triangular distribution
      // Eliminates bias and reduces dither noise coloration
      const tpdf = (Math.random() - Math.random()) * SP_NOISE_FLOOR;
      // Correct 12-bit signed quantization: 2^11 = 2048 steps per polarity
      dst[i] = Math.round(src[i] * 2048) / 2048 + tpdf;
    }
  }
  return out;
};

const applySpRolloff = (ctx, buffer) => {
  if (!buffer) return buffer;
  const a = (1 / buffer.sampleRate) / (1 / (2 * Math.PI * SP_ROLLOFF_HZ) + 1 / buffer.sampleRate);
  const nc = buffer.numberOfChannels;
  const len = buffer.length;
  const out = ctx.createBuffer(nc, len, buffer.sampleRate);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    let prev = 0;
    for (let i = 0; i < len; i++) {
      prev = a * src[i] + (1 - a) * prev;
      dst[i] = prev;
    }
  }
  return out;
};

const applySpLowEnd = (ctx, buffer, emphasis = 0.45) => {
  if (!buffer) return buffer;
  const nc = buffer.numberOfChannels;
  const len = buffer.length;
  const out = ctx.createBuffer(nc, len, buffer.sampleRate);
  const a = (2 * Math.PI * 180 / buffer.sampleRate) / (1 + 2 * Math.PI * 180 / buffer.sampleRate);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    let lp = 0, env = 0;
    for (let i = 0; i < len; i++) {
      lp = lp + a * (src[i] - lp);
      const abs = Math.abs(src[i]);
      env = abs > env ? env + 0.3 * (abs - env) : env + 0.002 * (abs - env);
      // 60Hz transformer resonance — subtle but gives that SP1200 'weight'
      // Models the output transformer's magnetic resonance characteristic
      const xfmrRes = lp * 0.12 * Math.sin(2 * Math.PI * 60 * i / buffer.sampleRate);
      dst[i] = emuSaturate(src[i] / (1 + 0.6 * env) + lp * emphasis + xfmrRes, 1.3);
    }
  }
  return out;
};

const applySp1200Chain = (ctx, buffer, emphasis = 0.45) => {
  if (!buffer) return buffer;
  let b = applySpResample(ctx, buffer);
  b = applySp12bit(ctx, b);
  b = applySpRolloff(ctx, b);
  b = applySpLowEnd(ctx, b, emphasis);
  return b;
};

export default function SP1200Tab({ onExport, onSendToArrange, isEmbedded, onChopRequest }) {
  const ctxRef    = useRef(null);
  const masterRef = useRef(null);
  const chopRef   = useRef({});
  const seqTimer  = useRef(null);

  const initCtx = useCallback(() => {
    if (ctxRef.current) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);
    ctxRef.current = ctx;
    masterRef.current = master;
  }, []);

  const [pads, setPads]               = useState(() => Array.from({ length: SP_PADS }, (_, i) => mkPad(i)));
  const [selectedPad, setSelectedPad] = useState(null);
  const [activePads, setActivePads]   = useState(new Set());
  const [dragPad, setDragPad]         = useState(null);
  const [faders, setFaders]           = useState(Array(SP_PADS).fill(0.85));
  const [bpm, setBpm]                 = useState(90);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [curStep, setCurStep]         = useState(-1);
  const [steps, setSteps]             = useState(16);
  const [ringMode, setRingMode] = useState(false);
  const ringModeRef = useRef(false);
  useEffect(() => { ringModeRef.current = ringMode; }, [ringMode]);
  const [swing, setSwing]             = useState(0);
  const [activeSeq, setActiveSeq]     = useState(0);
  const [sequences, setSequences]     = useState(() =>
    Array.from({ length: SP_MAX_SEQS }, (_, i) => ({
      id: i, name: `SEQ ${String(i + 1).padStart(2, '0')}`, events: []
    }))
  );
  const [view, setView]       = useState('pads');
  const [spChain, setSpChain] = useState(true);
  const [emphasis, setEmphasis] = useState(0.45);
  const [masterVol, setMasterVol] = useState(85);

  const bpmRef       = useRef(bpm);
  const isPlayingRef = useRef(false);
  const isRecRef     = useRef(false);
  const curStepRef   = useRef(0);
  const stepsRef     = useRef(steps);
  const swingRef     = useRef(swing);
  const seqRef       = useRef(activeSeq);
  const padsRef      = useRef(pads);
  const fadersRef    = useRef(faders);

  useEffect(() => { bpmRef.current    = bpm; },       [bpm]);
  useEffect(() => { stepsRef.current  = steps; },     [steps]);
  useEffect(() => { swingRef.current  = swing; },     [swing]);
  useEffect(() => { seqRef.current    = activeSeq; }, [activeSeq]);
  useEffect(() => { padsRef.current   = pads; },      [pads]);
  useEffect(() => { fadersRef.current = faders; },    [faders]);
  useEffect(() => {
    if (masterRef.current) masterRef.current.gain.value = masterVol / 100;
  }, [masterVol]);

  const loadSample = useCallback(async (padIdx, file) => {
    initCtx();
    const ctx = ctxRef.current;
    try {
      const ab  = await file.arrayBuffer();
      const raw = await ctx.decodeAudioData(ab);
      const processed = spChain ? applySp1200Chain(ctx, raw, emphasis) : raw;
      setPads(prev => prev.map((p, i) =>
        i === padIdx ? {
          ...p, buffer: processed,
          url: URL.createObjectURL(file),
          name: file.name.replace(/\.[^.]+$/, '').slice(0, 12)
        } : p
      ));
    } catch (e) { console.error('SP-1200:', e); }
  }, [spChain, emphasis, initCtx]);

  const fileSelect = useCallback((i) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'audio/*,.wav,.mp3,.ogg,.flac,.aiff,.m4a';
    inp.onchange = e => { if (e.target.files[0]) loadSample(i, e.target.files[0]); };
    inp.click();
  }, [loadSample]);

  const onDragOver  = useCallback((e, i) => { e.preventDefault(); setDragPad(i); }, []);
  const onDragLeave = useCallback(() => setDragPad(null), []);
  const onDrop      = useCallback((e, i) => {
    e.preventDefault(); setDragPad(null);
    const f = e.dataTransfer.files[0];
    if (f) loadSample(i, f);
  }, [loadSample]);

  const playPad = useCallback((i, vel = 100) => {
    initCtx();
    const pad = padsRef.current[i];
    if (!pad?.buffer || pad.muted) return;
    const ctx = ctxRef.current;
    if (pad.chokeGroup > 0) {
      Object.entries(chopRef.current).forEach(([k, s]) => {
        if (parseInt(k.split('_')[1]) === pad.chokeGroup) { try { s.stop(); } catch (_) {} }
      });
    }
    const src  = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = pad.buffer;
    if (pad.tune !== 0) src.detune.value = pad.tune * 100;
    gain.gain.value = (pad.volume ?? 1) * (fadersRef.current[i] ?? 0.85) * (vel / 127);
    if (pad.pan !== 0) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = pad.pan;
      src.connect(gain); gain.connect(pan); pan.connect(masterRef.current);
    } else {
      src.connect(gain); gain.connect(masterRef.current);
    }
    src.start();
    if (pad.chokeGroup > 0) chopRef.current[`${i}_${pad.chokeGroup}`] = src;
    setActivePads(prev => { const n = new Set(prev); n.add(i); return n; });
    setTimeout(() => setActivePads(prev => { const n = new Set(prev); n.delete(i); return n; }), 100);
    if (isRecRef.current) {
      const stepMs = (60000 / bpmRef.current) / 4;
      const step   = Math.round((Date.now() % (stepsRef.current * stepMs)) / stepMs) % stepsRef.current;
      setSequences(prev => prev.map((seq, si) =>
        si !== seqRef.current ? seq : {
          ...seq,
          events: [...seq.events.filter(ev => !(ev.pad === i && ev.step === step)), { pad: i, step, vel }]
        }
      ));
    }
  }, [initCtx]);

  const startSeq = useCallback(() => {
    initCtx();
    isPlayingRef.current = true;
    curStepRef.current = 0;
    setIsPlaying(true);
    const tick = () => {
      if (!isPlayingRef.current) return;
      const step   = curStepRef.current;
      const stepMs = (60000 / bpmRef.current) / 4;
      const swMs   = step % 2 === 1 ? (swingRef.current / 100) * stepMs * 0.5 : 0;
      sequences[seqRef.current].events
        .filter(ev => ev.step === step)
        .forEach(ev => playPad(ev.pad, ev.vel));
      setCurStep(step);
      curStepRef.current = (step + 1) % stepsRef.current;
      seqTimer.current = setTimeout(tick, stepMs + swMs);
    };
    tick();
  }, [sequences, playPad, initCtx]);

  const stopSeq = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (seqTimer.current) clearTimeout(seqTimer.current);
    setCurStep(-1);
    curStepRef.current = 0;
  }, []);

  const toggleStep = (padIdx, step) => {
    setSequences(prev => prev.map((seq, si) => {
      if (si !== activeSeq) return seq;
      const exists = seq.events.some(ev => ev.pad === padIdx && ev.step === step);
      return {
        ...seq,
        events: exists
          ? seq.events.filter(ev => !(ev.pad === padIdx && ev.step === step))
          : [...seq.events, { pad: padIdx, step, vel: 100 }]
      };
    }));
  };

  const updatePad = (idx, changes) =>
    setPads(prev => prev.map((p, i) => i === idx ? { ...p, ...changes } : p));

  useEffect(() => () => { if (seqTimer.current) clearTimeout(seqTimer.current); }, []);

  const curSeq = sequences[activeSeq];

  return (
    <div className="sp12-root">

      {/* TOP HARDWARE PANEL */}
      <div className="sp12-hw-top">
        <div className="sp12-logo-block">
          <div className="sp12-logo-main">SPX•1200</div>
          <div className="sp12-logo-sub">SAMPLING PERCUSSION</div>
          <div className="sp12-logo-mfr">E-mu Systems, Inc.</div>
        </div>
        <div className="sp12-hw-sections">
          <div className="sp12-hw-sect">
            <div className="sp12-hw-sect-title">SET-UP</div>
            {['MIDI', 'CLICK', 'FILTER', 'TUNING'].map(l => (
              <div key={l} className="sp12-led-row">
                <div className="sp12-led"/><span>{l}</span>
              </div>
            ))}
          </div>
          <div className="sp12-hw-sect">
            <div className="sp12-hw-sect-title">DISK</div>
            {['SAVE', 'LOAD', 'FORMAT', 'CATALOG'].map(l => (
              <div key={l} className="sp12-led-row">
                <div className="sp12-led"/><span>{l}</span>
              </div>
            ))}
          </div>
          <div className="sp12-hw-sect">
            <div className="sp12-hw-sect-title">SYNC</div>
            {['MIDI CLK', 'TAPE', 'INT', 'EXT'].map(l => (
              <div key={l} className="sp12-led-row">
                <div className="sp12-led"/><span>{l}</span>
              </div>
            ))}
          </div>
          <div className="sp12-hw-sect">
            <div className="sp12-hw-sect-title">SAMPLE</div>
            <div className="sp12-lcd">{pads.filter(p => p.buffer).length}/8</div>
            <div className="sp12-led-row">
              <div className={`sp12-led sp12-led-red${isRecording ? ' on' : ''}`}/><span>REC</span>
            </div>
            <button
              className={`sp12-hw-btn${isRecording ? ' active-red' : ''}`}
              onClick={() => { isRecRef.current = !isRecording; setIsRecording(r => !r); }}>
              ● RECORD
            </button>
          </div>
        </div>
        <div className="sp12-master-sect">
          <div className="sp12-hw-sect-title">MASTER CONTROL</div>
          <div className="sp12-lcd sp12-lcd-bpm">{bpm}</div>
          <div className="sp12-lcd-label">BPM</div>
          <div className="sp12-bpm-btns">
            <button className="sp12-hw-btn" onClick={() => setBpm(b => Math.min(300, b + 1))}>▲</button>
            <button className="sp12-hw-btn" onClick={() => setBpm(b => Math.max(20, b - 1))}>▼</button>
          </div>
          <div className="sp12-transport">
            <button
              className={`sp12-hw-btn sp12-btn-play${isPlaying ? ' active' : ''}`}
              onClick={isPlaying ? stopSeq : startSeq}>
              {isPlaying ? '■ STOP' : '▶ PLAY'}
            </button>
          </div>
        </div>
      </div>

      {/* PROGRAMMING */}
      <div className="sp12-prog-panel">
        <div className="sp12-prog-label">PROGRAMMING</div>
        <div className="sp12-prog-row">
          <div className="sp12-ctrl-item">
            <span className="sp12-ctrl-lbl">SEQ</span>
            <select className="sp12-select" value={activeSeq}
              onChange={e => { seqRef.current = Number(e.target.value); setActiveSeq(Number(e.target.value)); }}>
              {sequences.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
            </select>
          </div>
          <div className="sp12-ctrl-item">
            <span className="sp12-ctrl-lbl">STEPS</span>
            <select className="sp12-select" value={steps}
              onChange={e => { stepsRef.current = Number(e.target.value); setSteps(Number(e.target.value)); }}>
              {[8, 16, 32].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="sp12-ctrl-item">
            <span className="sp12-ctrl-lbl">SWING</span>
            <input type="range" min={0} max={75} value={swing} className="sp12-range"
              onChange={e => { swingRef.current = Number(e.target.value); setSwing(Number(e.target.value)); }}/>
            <span className="sp12-ctrl-val">{swing}%</span>
          </div>
          <div className="sp12-ctrl-item">
            <span className="sp12-ctrl-lbl">VOL</span>
            <input type="range" min={0} max={100} value={masterVol} className="sp12-range"
              onChange={e => setMasterVol(Number(e.target.value))}/>
            <span className="sp12-ctrl-val">{masterVol}%</span>
          </div>
          <div className="sp12-ctrl-item">
            <label className="sp12-check-lbl">
              <input type="checkbox" checked={spChain} onChange={e => setSpChain(e.target.checked)}/>
              SP ENGINE
            </label>
          </div>
          <div className="sp12-ctrl-item">
            <span className="sp12-ctrl-lbl">EMPH</span>
            <input type="range" min={0} max={1} step={0.05} value={emphasis} className="sp12-range"
              onChange={e => setEmphasis(Number(e.target.value))}/>
            <span className="sp12-ctrl-val">{emphasis.toFixed(2)}</span>
          </div>
          <div className="sp12-ctrl-item">
            <button className="sp12-hw-btn"
              onClick={() => setSequences(prev => prev.map((s, i) => i !== activeSeq ? s : { ...s, events: [] }))}>
              CLR
            </button>
          </div>
          <div className="sp12-view-toggle">
            {['pads', 'sequencer'].map(v => (
              <button key={v} className={`sp12-view-btn${view === v ? ' active' : ''}`}
                onClick={() => setView(v)}>{v.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>

      {/* FADERS */}
      <div className="sp12-perf-panel">
        <div className="sp12-prog-label">PERFORMANCE</div>
        <div className="sp12-faders">
          {pads.map((pad, i) => (
            <div key={i} className="sp12-fader-col">
              <span className="sp12-fader-sample-name">{pad.name || '\u2014'}</span>
              <div className="sp12-fader-wrap">
                <input type="range" min={0} max={1} step={0.01} value={faders[i]}
                  orient="vertical" className="sp12-fader"
                  onChange={e => setFaders(prev => prev.map((f, fi) => fi === i ? Number(e.target.value) : f))}/>
              </div>
              <span className="sp12-fader-num">{i + 1}</span>
            </div>
          ))}
          <div className="sp12-fader-col sp12-fader-master-col">
            <span className="sp12-fader-sample-name">MASTER</span>
            <div className="sp12-fader-wrap">
              <input type="range" min={0} max={100} step={1} value={masterVol}
                orient="vertical" className="sp12-fader sp12-fader-master"
                onChange={e => setMasterVol(Number(e.target.value))}/>
            </div>
            <span className="sp12-fader-num">M</span>
          </div>
        </div>
      </div>

      {/* 8 PADS */}
      {view === 'pads' && (
        <div className="sp12-pads-panel">
          <div className="sp12-pad-row">
            {pads.map((pad, i) => (
              <div key={i}
                className={`sp12-pad${pad.buffer ? ' loaded' : ''}${activePads.has(i) ? ' hitting' : ''}${selectedPad === i ? ' selected' : ''}${dragPad === i ? ' dragover' : ''}${pad.muted ? ' muted' : ''}`}
                onMouseDown={e => { if (e.button !== 0) return; initCtx(); playPad(i, e.shiftKey ? 64 : 100); }}
                onContextMenu={e => { e.preventDefault(); setSelectedPad(selectedPad === i ? null : i); }}
                onDragOver={e => onDragOver(e, i)}
                onDragLeave={onDragLeave}
                onDrop={e => onDrop(e, i)}
                onClick={e => { if (!pad.buffer && !e.defaultPrevented) fileSelect(i); }}>
                <div className="sp12-pad-inner">
                  <div className="sp12-pad-header">
                    <span className="sp12-pad-num">{i + 1}</span>
                    <div className={`sp12-pad-led${activePads.has(i) ? ' on' : ''}`}/>
                    <button className="sp12-pad-load"
                      onClick={e => { e.stopPropagation(); fileSelect(i); }}>&#128194;</button>
                  </div>
                  <div className="sp12-pad-content">
                    {pad.buffer
                      ? <span className="sp12-pad-name">{pad.name}</span>
                      : <span className="sp12-pad-hint">DROP<br/>AUDIO</span>
                    }
                  </div>
                  {pad.buffer && <div className="sp12-pad-loaded-strip"/>}
                </div>
              </div>
            ))}
          </div>

          {selectedPad !== null && pads[selectedPad] && (
            <div className="sp12-pad-editor">
              <div className="sp12-pad-editor-title">
                PAD {selectedPad + 1}{pads[selectedPad].name ? ` \u2014 ${pads[selectedPad].name}` : ''}
                <button className="sp12-hw-btn" onClick={() => setSelectedPad(null)}>&#x2715;</button>
              </div>
              <div className="sp12-pad-editor-row">
                {[
                  ['VOLUME', 'volume', 0, 1, 0.01],
                  ['PAN', 'pan', -1, 1, 0.01],
                  ['TUNE', 'tune', -24, 24, 1],
                  ['DECAY', 'decay', 0.05, 2, 0.01],
                ].map(([lbl, key, min, max, step]) => (
                  <div key={key} className="sp12-pad-ctrl">
                    <span className="sp12-ctrl-lbl">{lbl}</span>
                    <input type="range" min={min} max={max} step={step}
                      value={pads[selectedPad][key] ?? (key === 'volume' ? 1 : 0)}
                      className="sp12-range"
                      onChange={e => updatePad(selectedPad, { [key]: Number(e.target.value) })}/>
                    <span className="sp12-ctrl-val">
                      {Number(pads[selectedPad][key] ?? (key === 'volume' ? 1 : 0)).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="sp12-pad-ctrl">
                  <span className="sp12-ctrl-lbl">CHOKE</span>
                  <select className="sp12-select"
                    value={pads[selectedPad].chokeGroup ?? 0}
                    onChange={e => updatePad(selectedPad, { chokeGroup: Number(e.target.value) })}>
                    <option value={0}>OFF</option>
                    {[1, 2, 3, 4].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <label className="sp12-check-lbl">
                  <input type="checkbox"
                    checked={pads[selectedPad].muted ?? false}
                    onChange={e => updatePad(selectedPad, { muted: e.target.checked })}/>
                  MUTE
                </label>
                {/* Bug #10: Chop button — opens shared ChopView via parent's onChopRequest */}
                {pads[selectedPad].buffer && onChopRequest && (
                  <button className="sp12-hw-btn"
                    onClick={() => onChopRequest(pads[selectedPad].buffer, (pi, data) => updatePad(pi, data), setPads)}
                    title="Open chop editor for this pad">
                    ✂ CHOP
                  </button>
                )}
                {pads[selectedPad].buffer && (
                  <button className="sp12-hw-btn sp12-btn-danger"
                    onClick={() => { updatePad(selectedPad, mkPad(selectedPad)); setSelectedPad(null); }}>
                    CLEAR
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEQUENCER */}
      {view === 'sequencer' && (
        <div className="sp12-seq-panel">
          <div className="sp12-seq-grid">
            <div className="sp12-seq-header-row">
              <div className="sp12-seq-pad-lbl"/>
              {Array.from({ length: steps }, (_, s) => (
                <div key={s} className={`sp12-seq-step-hdr${curStep === s ? ' cur' : ''}`}>{s + 1}</div>
              ))}
            </div>
            {pads.map((pad, i) => (
              <div key={i} className="sp12-seq-row">
                <div className="sp12-seq-pad-lbl" onMouseDown={() => playPad(i, 100)}>
                  {pad.name ? pad.name.slice(0, 8) : `PAD ${i + 1}`}
                </div>
                {Array.from({ length: steps }, (_, s) => {
                  const on = curSeq.events.some(ev => ev.pad === i && ev.step === s);
                  return (
                    <div key={s}
                      className={`sp12-seq-cell${on ? ' on' : ''}${curStep === s ? ' playing' : ''}${!pad.buffer ? ' disabled' : ''}`}
                      onClick={() => pad.buffer && toggleStep(i, s)}/>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DSP BAR */}
      <div className="sp12-dsp-bar">
        <span className="sp12-dsp-brand">SP-1200 CHARACTER</span>
        {[
          ['26kHz RESAMPLE', spChain],
          ['12-BIT DAC', spChain],
          ['EMU SATURATE', spChain],
          ['12kHz ROLLOFF', spChain],
          ['LOW CRUNCH', spChain],
        ].map(([lbl, on]) => (
          <SpecBadge key={lbl} label={lbl} className={`sp12-dsp-chip${on ? ' on' : ''}`} active={on} />
        ))}
        {ringMode !== undefined && (
          <button
            className={`sp12-ring-btn${ringMode ? ' active' : ''}`}
            onClick={() => setRingMode(p => !p)}
            title="SP-1200 Ring Mod — adds metallic harmonic edge">
            💠 RING
          </button>
        )}
        <span className="sp12-dsp-loaded">{pads.filter(p => p.buffer).length}/8 LOADED</span>
      </div>

    </div>
  );
}
