// =============================================================================
// SPX60Tab.js — SPX-60 Sampler Engine
// 12-bit / 40kHz, Roger Linn swing (PPQN-accurate offset table),
// 4-step velocity quantization, sigma-delta DAC, TPDF dither,
// choke groups, own timeline + shared master clock sync
// =============================================================================
import React, { useState, useRef, useCallback, useEffect } from 'react';
import '../../styles/SPX60Tab.css';
import SpecBadge from './sampler/SpecBadge';

const PADS          = 16;
const SAMPLE_RATE   = 40000;
const ROLLOFF_HZ    = 17500;
const NOISE_FLOOR   = 0.00042;
const CHOKE_GROUPS  = 8;
const PPQN          = 96;

// Roger Linn swing offset table — PPQN subdivisions per swing %
// Odd 16th notes are delayed by this amount, creating the "drunk" pocket feel
const LINN_SWING_TABLE = { 50: 0, 54: 4, 58: 8, 62: 12, 66: 16, 70: 20, 75: 24 };
const SWING_OPTIONS    = Object.keys(LINN_SWING_TABLE).map(Number);

// 4 discrete velocity layers — hardware stepped quantization
const VEL_LAYERS  = [32, 64, 96, 127];
const quantizeVel = v => VEL_LAYERS.reduce((p, c) => Math.abs(c - v) < Math.abs(p - v) ? c : p);

// Sigma-delta DAC saturation — near-symmetric, slight asymmetry for warmth
const sdSaturate = (x, drive = 1.2) =>
  x >= 0 ? (x * drive) / (1 + 0.65 * x * drive) : (x * drive) / (1 + 0.72 * Math.abs(x * drive));

const applyResample = (ctx, buffer) => {
  if (!buffer) return buffer;
  const ratio = SAMPLE_RATE / buffer.sampleRate;
  const nc = buffer.numberOfChannels;
  const srcLen = buffer.length;
  const dnLen = Math.floor(srcLen * ratio);
  const out = ctx.createBuffer(nc, srcLen, buffer.sampleRate);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
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

const apply12bit = (ctx, buffer) => {
  if (!buffer) return buffer;
  const nc = buffer.numberOfChannels; const len = buffer.length;
  const out = ctx.createBuffer(nc, len, buffer.sampleRate);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch); const dst = out.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const tpdf = (Math.random() - Math.random()) * NOISE_FLOOR;
      dst[i] = sdSaturate(Math.round(src[i] * 2048) / 2048) + tpdf;
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

const applyDSP = (ctx, buf) => applyRolloff(ctx, apply12bit(ctx, applyResample(ctx, buf)));

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

export default function SPX60Tab({ onExport, onSendToArrange, isEmbedded, masterClock, onSendToTriple }) {
  const [pads, setPads]               = useState(() => Array.from({ length: PADS }, (_, i) => mkPad(i)));
  const [sequences, setSequences]     = useState([mkSeq(2)]);
  const [seqIdx, setSeqIdx]           = useState(0);
  const [playing, setPlaying]         = useState(false);
  const [step, setStep]               = useState(0);
  const [bpm, setBpm]                 = useState(90);
  const [swing, setSwing]             = useState(62);
  const [bars, setBars]               = useState(2);
  const [selectedPad, setSelectedPad] = useState(0);
  const [view, setView]               = useState('pads');
  const [syncToMaster, setSyncToMaster] = useState(false);
  const [activeSteps, setActiveSteps]   = useState([]);
  const [songBlocks, setSongBlocks]     = useState([]);
  const [songMode, setSongMode]         = useState(false);
  const [songPos, setSongPos]           = useState(0);

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
    const qVel = quantizeVel(Math.round(vel * 127)) / 127;
    const src = ctx.createBufferSource();
    src.buffer = pad.processedBuffer;
    src.playbackRate.value = Math.pow(2, pad.tune / 12);
    const gain = ctx.createGain();
    gain.gain.value = pad.volume * qVel;
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
    const ppqnOffset = LINN_SWING_TABLE[swingRef.current] ?? 0;
    const swingMs = s % 2 === 1 ? (ppqnOffset / PPQN) * stepMs * 2 : 0;
    const firing = [];
    seq.steps[s]?.forEach((cell, pi) => { if (cell.on) { firing.push(pi); triggerPad(pi, cell.vel / 127); } });
    setActiveSteps(firing);
    stepRef.current = (s + 1) % (seq.bars * 16);
    setStep(stepRef.current);
    timerRef.current = setTimeout(scheduleStep, stepMs + swingMs);
  }, [triggerPad]);

  // Master clock sync — subscribe when linked
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
      playRef.current = false; setPlaying(false);
      clearTimeout(timerRef.current); setActiveSteps([]);
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
    <div className="spx60-root">
      <div className="spx60-header">
        <div className="spx60-logo">
          <span className="spx60-brand">SPX</span>
          <span className="spx60-model">60</span>
        </div>
        <div className="spx60-lcd">
          <span className="spx60-lcd-item">{pads.filter(p => p.processedBuffer).length}/{PADS} LOADED</span>
          <span className="spx60-lcd-item">BPM {bpm}</span>
          <span className="spx60-lcd-item">SWING {swing}%</span>
          <span className="spx60-lcd-item">SEQ {seqIdx + 1}/{sequences.length}</span>
          {syncToMaster && <span className="spx60-lcd-sync">⟳ LINKED</span>}
        </div>
        <div className="spx60-transport">
          {!syncToMaster && (
            <button className={`spx60-btn${playing ? ' active' : ''}`} onClick={togglePlay}>
              {playing ? '⏹ STOP' : '▶ PLAY'}
            </button>
          )}
          <button className="spx60-btn" onClick={() => { stepRef.current = 0; setStep(0); }}>◀◀</button>
          <button className="spx60-btn" onClick={() => setSequences(p => [...p, mkSeq(bars)])}>+ SEQ</button>
        </div>
      </div>

      <div className="spx60-controls">
        <div className="spx60-ctrl-group">
          <label className="spx60-label">BPM</label>
          <input className="spx60-range" type="range" min={40} max={240} value={bpm}
            onChange={e => { bpmRef.current = +e.target.value; setBpm(+e.target.value); }} />
          <span className="spx60-val">{bpm}</span>
        </div>
        <div className="spx60-ctrl-group">
          <label className="spx60-label">SWING</label>
          <select className="spx60-select" value={swing}
            onChange={e => { swingRef.current = +e.target.value; setSwing(+e.target.value); }}>
            {SWING_OPTIONS.map(k => <option key={k} value={k}>{k}%{k === 62 ? ' ★' : ''}</option>)}
          </select>
        </div>
        <div className="spx60-ctrl-group">
          <label className="spx60-label">BARS</label>
          <select className="spx60-select" value={bars} onChange={e => updateBars(+e.target.value)}>
            {[1,2,4,8].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="spx60-ctrl-group">
          <label className="spx60-label">SEQ</label>
          <select className="spx60-select" value={seqIdx}
            onChange={e => { seqIdxRef.current = +e.target.value; setSeqIdx(+e.target.value); }}>
            {sequences.map((_, i) => <option key={i} value={i}>SEQ {i+1}</option>)}
          </select>
        </div>
        <div className="spx60-ctrl-group">
          <label className="spx60-label">CLOCK</label>
          <button className={`spx60-sync-btn${syncToMaster ? ' active' : ''}`}
            onClick={() => setSyncToMaster(p => !p)}>
            {syncToMaster ? '⟳ MASTER' : '⟳ OWN'}
          </button>
        </div>
        <div className="spx60-ctrl-group">
          <button className={`spx60-view-btn${view === 'pads' ? ' active' : ''}`} onClick={() => setView('pads')}>PADS</button>
          <button className={`spx60-view-btn${view === 'seq' ? ' active' : ''}`} onClick={() => setView('seq')}>SEQ</button>
          <button className={`spx60-view-btn${view === 'song' ? ' active' : ''}`} onClick={() => setView('song')}>SONG</button>
          <button className={`spx60-view-btn${view === 'mixer' ? ' active' : ''}`} onClick={() => setView('mixer')}>MIXER</button>
        </div>
      </div>

      {view === 'pads' && (
        <div className="spx60-pads-wrap">
          <div className="spx60-pads">
            {[3,2,1,0].map(row => (
              <div key={row} className="spx60-pad-row">
                {[0,1,2,3].map(col => {
                  const pi = row * 4 + col; const pad = pads[pi];
                  return (
                    <div key={pi}
                      className={`spx60-pad${pad.processedBuffer ? ' loaded' : ''}${activeSteps.includes(pi) ? ' firing' : ''}${selectedPad === pi ? ' selected' : ''}${pad.muted ? ' muted' : ''}`}
                      onMouseDown={() => { setSelectedPad(pi); triggerPad(pi, 0.9); }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadSample(pi, f); }}
                      onDoubleClick={() => fileSelect(pi)}>
                      <span className="spx60-pad-num">{pi + 1}</span>
                      {pad.name
                        ? <span className="spx60-pad-name">{pad.name}</span>
                        : <span className="spx60-pad-drop">DROP</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {selectedPad !== null && pads[selectedPad] && (
            <div className="spx60-pad-settings">
              <div className="spx60-settings-title">PAD {selectedPad + 1}{pads[selectedPad].name ? ` — ${pads[selectedPad].name}` : ''}</div>
              <div className="spx60-settings-grid">
                {[
                  { key: 'volume', label: 'VOL',   min: 0,    max: 1,  step: 0.01 },
                  { key: 'tune',   label: 'TUNE',  min: -12,  max: 12, step: 0.1  },
                  { key: 'pan',    label: 'PAN',   min: -1,   max: 1,  step: 0.01 },
                  { key: 'decay',  label: 'DECAY', min: 0.05, max: 4,  step: 0.05 },
                ].map(({ key, label, min, max, step: s }) => (
                  <div key={key} className="spx60-knob-row">
                    <label className="spx60-knob-label">{label}</label>
                    <input className="spx60-range" type="range" min={min} max={max} step={s}
                      value={pads[selectedPad][key] ?? (key === 'volume' ? 1 : 0)}
                      onChange={e => updatePad(selectedPad, key, +e.target.value)} />
                    <span className="spx60-val">{Number(pads[selectedPad][key] ?? 0).toFixed(2)}</span>
                  </div>
                ))}
                <div className="spx60-knob-row">
                  <label className="spx60-knob-label">CHOKE</label>
                  <select className="spx60-select" value={pads[selectedPad].chokeGroup}
                    onChange={e => updatePad(selectedPad, 'chokeGroup', +e.target.value)}>
                    <option value={0}>OFF</option>
                    {Array.from({ length: CHOKE_GROUPS }, (_, i) => (
                      <option key={i+1} value={i+1}>GRP {i+1}</option>
                    ))}
                  </select>
                </div>
                <div className="spx60-knob-row">
                  <label className="spx60-knob-label">MUTE</label>
                  <input type="checkbox" checked={pads[selectedPad].muted}
                    onChange={e => updatePad(selectedPad, 'muted', e.target.checked)} />
                </div>
              </div>
              <div className="spx60-settings-actions">
                <button className="spx60-action-btn" onClick={() => fileSelect(selectedPad)}>📂 LOAD</button>
                {pads[selectedPad]?.processedBuffer && onChopRequest && (
                  <button className="spx60-action-btn" onClick={() => onChopRequest(pads[selectedPad].processedBuffer, updatePad, setPads)}>✂️ CHOP</button>
                )}
                <button className="spx60-action-btn" onClick={() => clearPad(selectedPad)}>✕ CLEAR</button>
                {pads[selectedPad].processedBuffer && onSendToArrange && (
                  <button className="spx60-action-btn" onClick={() => onSendToArrange(selectedPad, pads[selectedPad])}>→ ARR</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'seq' && (
        <div className="spx60-seq">
          <div className="spx60-seq-grid">
            {pads.map((pad, pi) => (
              <div key={pi} className="spx60-seq-row">
                <button className="spx60-seq-pad-btn" onMouseDown={() => triggerPad(pi, 0.9)}>
                  {pad.name || `P${pi+1}`}
                </button>
                <div className="spx60-seq-steps">
                  {seq.steps.map((row, si) => (
                    <button key={si}
                      className={`spx60-step${row[pi]?.on ? ' on' : ''}${si === step && (playing || syncToMaster) ? ' current' : ''}${si % 4 === 0 ? ' beat' : ''}`}
                      onClick={() => toggleStep(si, pi)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'song' && (
        <div className="spx60-song-view">
          <div className="spx60-song-header">
            <span className="spx60-song-title">SONG MODE</span>
            <button
              className={`spx60-view-btn${songMode ? ' active' : ''}`}
              onClick={() => setSongMode(p => !p)}
            >{songMode ? '● SONG ON' : 'SONG OFF'}</button>
            <span className="spx60-song-info">{songBlocks.length} blocks</span>
          </div>
          <div className="spx60-song-add">
            <span style={{fontSize:10,color:'#88cc44'}}>Add sequence:</span>
            {sequences.map((s, i) => (
              <button key={i} className="spx60-song-add-btn"
                onClick={() => setSongBlocks(p => [...p, {seqIdx:i, reps:1}])}>
                + SEQ {i+1}
              </button>
            ))}
          </div>
          <div className="spx60-song-blocks">
            {songBlocks.length === 0 ? (
              <div className="spx60-song-empty">Add sequences above to build your song</div>
            ) : songBlocks.map((block, bi) => (
              <div key={bi} className={`spx60-song-block${songMode && playing && songPos === bi ? ' playing' : ''}`}>
                <span className="spx60-song-block-num">{bi+1}</span>
                <span className="spx60-song-block-name">SEQ {block.seqIdx+1}</span>
                <div className="spx60-song-reps">
                  <button onClick={() => setSongBlocks(p => p.map((b,i) => i===bi ? {...b,reps:Math.max(1,b.reps-1)} : b))}>−</button>
                  <span>×{block.reps}</span>
                  <button onClick={() => setSongBlocks(p => p.map((b,i) => i===bi ? {...b,reps:Math.min(99,b.reps+1)} : b))}>+</button>
                </div>
                <div className="spx60-song-block-actions">
                  {bi > 0 && <button onClick={() => setSongBlocks(p => { const u=[...p]; [u[bi-1],u[bi]]=[u[bi],u[bi-1]]; return u; })}>↑</button>}
                  {bi < songBlocks.length-1 && <button onClick={() => setSongBlocks(p => { const u=[...p]; [u[bi],u[bi+1]]=[u[bi+1],u[bi]]; return u; })}>↓</button>}
                  <button onClick={() => setSongBlocks(p => p.filter((_,i) => i !== bi))}>✕</button>
                </div>
              </div>
            ))}
          </div>
          {songBlocks.length > 0 && (
            <button className="spx60-song-clear" onClick={() => setSongBlocks([])}>🗑️ Clear Song</button>
          )}
        </div>
      )}

      {view === 'mixer' && (
        <div className="spx60-mixer-view">
          <div className="spx60-mixer-grid">
            {pads.map((pad, pi) => (
              <div key={pi} className={`spx60-mixer-ch${!pad.processedBuffer ? ' empty' : ''}`}>
                <div className="spx60-mixer-meter">
                  <div className="spx60-mixer-meter-fill" style={{height:`${activeSteps.includes(pi) ? 75 : 0}%`}}/>
                </div>
                <input type="range" className="spx60-mixer-fader" orient="vertical"
                  min={0} max={1} step={0.01} value={pad.volume ?? 1}
                  onChange={e => setPads(p => p.map((pd,i) => i===pi ? {...pd, volume:+e.target.value} : pd))}/>
                <span className="spx60-mixer-vol">{Math.round((pad.volume??1)*100)}</span>
                <input type="range" className="spx60-mixer-pan"
                  min={-1} max={1} step={0.01} value={pad.pan ?? 0}
                  onChange={e => setPads(p => p.map((pd,i) => i===pi ? {...pd, pan:+e.target.value} : pd))}/>
                <button
                  className={`spx60-mixer-mute${pad.muted ? ' on' : ''}`}
                  onClick={() => setPads(p => p.map((pd,i) => i===pi ? {...pd, muted:!pd.muted} : pd))}
                >M</button>
                <div className="spx60-mixer-label" style={{color: pad.color || '#88cc44'}}>{pi+1}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="spx60-dsp-strip">
        {['12-BIT','40kHz','LINN SWING','4-VEL LAYERS','SIGMA-DELTA DAC','TPDF DITHER'].map(b => (
          <SpecBadge key={b} label={b} className="spx60-dsp-badge" />
        ))}
      </div>
    </div>
  );
}

export { applyDSP as dspChain };
