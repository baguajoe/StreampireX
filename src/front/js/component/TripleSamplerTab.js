// =============================================================================
// TripleSamplerTab.js — Unified 3-Engine Sampler
// SP-1200 (Bank A) + SPX3000 (Bank B) + SPX-3200 (Bank C)
// Master clock: SPX3000 96 PPQN
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Color / label constants ───────────────────────────────────────────────────
const ENGINES = [
  { id: 'sp1200',  label: '🔴 SP-1200',  color: '#ff4400', tag: 'A', desc: '26kHz · 12-bit · E-mu grit' },
  { id: 'spx3000', label: '🎛️ SPX3000', color: '#00ffc8', tag: 'B', desc: '44.1kHz · 12-bit · MPC warm' },
  { id: 'spx3200', label: '🎹 SPX-3200',  color: '#5ac8fa', tag: 'C', desc: '48kHz · 24-bit · clean' },
];

const STEPS = 16;
const PPQN  = 96; // SPX3000 resolution

function emptyPads() {
  return Array.from({ length: 8 }, (_, i) => ({
    name: `Pad ${i + 1}`, buffer: null, url: null,
    volume: 0.85, pan: 0, tune: 0, mute: false, solo: false,
  }));
}

function emptySeq() {
  return Array.from({ length: 8 }, () => Array(STEPS).fill(false));
}

// ── Tiny Knob ─────────────────────────────────────────────────────────────────
function MiniKnob({ value, min, max, step, label, color, onChange }) {
  const [drag, setDrag] = useState(false);
  const startY = useRef(0);
  const startV = useRef(value);
  const pct = (value - min) / (max - min);
  const angle = -140 + pct * 280;
  const autoChop = () => {
    if (!chopBuffer) return;
    const sr = chopBuffer.sampleRate;
    const ch = chopBuffer.getChannelData(0);
    const pts = [0];
    const threshold = 0.1;
    let lastTrig = 0;
    const minGap = Math.floor(sr * 0.05);
    for (let i = 1; i < ch.length; i++) {
      if (Math.abs(ch[i]) > threshold && Math.abs(ch[i-1]) <= threshold && i - lastTrig > minGap) {
        pts.push(i / sr);
        lastTrig = i;
      }
    }
    setChopPts(pts);
  };

  const assignChopsToEngine = () => {
    if (!chopPts.length || !chopBuffer) return;
    const enginePads = padsByEngine[activeEngine];
    chopPts.slice(0, 8).forEach((pt, i) => {
      const end = chopPts[i+1] || chopBuffer.duration;
      const dur = end - pt;
      const startSamp = Math.floor(pt * chopBuffer.sampleRate);
      const endSamp = Math.floor(end * chopBuffer.sampleRate);
      const nc = chopBuffer.numberOfChannels;
      const offCtx = new OfflineAudioContext(nc, endSamp - startSamp, chopBuffer.sampleRate);
      const chopBuf = offCtx.createBuffer(nc, endSamp - startSamp, chopBuffer.sampleRate);
      for (let c = 0; c < nc; c++) {
        const src2 = chopBuffer.getChannelData(c);
        const dst = chopBuf.getChannelData(c);
        for (let j = 0; j < endSamp - startSamp; j++) dst[j] = src2[startSamp + j];
      }
      if (enginePads[i]) enginePads[i].buffer = chopBuf;
    });
    setShowChop(false);
  };

  return (
    <div style={{ textAlign: 'center', cursor: 'ns-resize', userSelect: 'none' }}
      onMouseDown={e => { setDrag(true); startY.current = e.clientY; startV.current = value; }}
      onMouseMove={e => { if (!drag) return; const delta = (startY.current - e.clientY) / 80; const nv = Math.min(max, Math.max(min, startV.current + delta * (max - min))); onChange(Math.round(nv / step) * step); }}
      onMouseUp={() => setDrag(false)} onMouseLeave={() => setDrag(false)}>
      <svg width={32} height={32} viewBox="0 0 32 32">
        <circle cx={16} cy={16} r={12} fill="#0a1628" stroke={color} strokeWidth={1.5} />
        <line x1={16} y1={16} x2={16 + 9 * Math.sin(angle * Math.PI / 180)} y2={16 - 9 * Math.cos(angle * Math.PI / 180)}
          stroke={color} strokeWidth={2} strokeLinecap="round" />
      </svg>
      <div style={{ fontSize: 8, color: '#5a7088', marginTop: -2 }}>{label}</div>
      <div style={{ fontSize: 9, color, fontWeight: 700 }}>{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : value}</div>
    </div>
  );
}

// ── Pad Grid ──────────────────────────────────────────────────────────────────
function PadGrid({ pads, activePads, engine, onPadClick, onLoad, onClear, color }) {
  const autoChop = () => {
    if (!chopBuffer) return;
    const sr = chopBuffer.sampleRate;
    const ch = chopBuffer.getChannelData(0);
    const pts = [0];
    const threshold = 0.1;
    let lastTrig = 0;
    const minGap = Math.floor(sr * 0.05);
    for (let i = 1; i < ch.length; i++) {
      if (Math.abs(ch[i]) > threshold && Math.abs(ch[i-1]) <= threshold && i - lastTrig > minGap) {
        pts.push(i / sr);
        lastTrig = i;
      }
    }
    setChopPts(pts);
  };

  const assignChopsToEngine = () => {
    if (!chopPts.length || !chopBuffer) return;
    const enginePads = padsByEngine[activeEngine];
    chopPts.slice(0, 8).forEach((pt, i) => {
      const end = chopPts[i+1] || chopBuffer.duration;
      const dur = end - pt;
      const startSamp = Math.floor(pt * chopBuffer.sampleRate);
      const endSamp = Math.floor(end * chopBuffer.sampleRate);
      const nc = chopBuffer.numberOfChannels;
      const offCtx = new OfflineAudioContext(nc, endSamp - startSamp, chopBuffer.sampleRate);
      const chopBuf = offCtx.createBuffer(nc, endSamp - startSamp, chopBuffer.sampleRate);
      for (let c = 0; c < nc; c++) {
        const src2 = chopBuffer.getChannelData(c);
        const dst = chopBuf.getChannelData(c);
        for (let j = 0; j < endSamp - startSamp; j++) dst[j] = src2[startSamp + j];
      }
      if (enginePads[i]) enginePads[i].buffer = chopBuf;
    });
    setShowChop(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: 8 }}>
      {pads.map((pad, i) => {
        const active = activePads.has(i);
        const hasBuffer = !!pad.buffer;
        return (
          <div key={i}
            style={{
              background: active ? color + '33' : hasBuffer ? '#0d1f35' : '#070f1a',
              border: `1px solid ${active ? color : hasBuffer ? color + '66' : '#1a2a3a'}`,
              borderRadius: 6, padding: '6px 4px', cursor: 'pointer', textAlign: 'center',
              transition: 'all 0.08s', boxShadow: active ? `0 0 8px ${color}44` : 'none',
              minHeight: 52,
            }}
            onClick={() => hasBuffer && onPadClick(i)}
            onContextMenu={e => { e.preventDefault(); onClear(i); }}>
            <div style={{ fontSize: 9, color: active ? color : '#5a7088', fontWeight: 700, marginBottom: 2 }}>
              {engine.tag}{i + 1}
            </div>
            <div style={{ fontSize: 9, color: hasBuffer ? '#ccc' : '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pad.name}
            </div>
            {!hasBuffer && (
              <div onClick={e => { e.stopPropagation(); onLoad(i); }}
                style={{ fontSize: 8, color: color + '88', marginTop: 4, cursor: 'pointer' }}>
                + load
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step Sequencer Row ────────────────────────────────────────────────────────
function SeqRow({ engineId, engineLabel, color, pads, seq, setSeq, activePad, setActivePad, currentStep, muted, soloed, onMute, onSolo }) {
  const selectedPad = activePad ?? 0;
  const steps = seq[selectedPad] || Array(STEPS).fill(false);
  const autoChop = () => {
    if (!chopBuffer) return;
    const sr = chopBuffer.sampleRate;
    const ch = chopBuffer.getChannelData(0);
    const pts = [0];
    const threshold = 0.1;
    let lastTrig = 0;
    const minGap = Math.floor(sr * 0.05);
    for (let i = 1; i < ch.length; i++) {
      if (Math.abs(ch[i]) > threshold && Math.abs(ch[i-1]) <= threshold && i - lastTrig > minGap) {
        pts.push(i / sr);
        lastTrig = i;
      }
    }
    setChopPts(pts);
  };

  const assignChopsToEngine = () => {
    if (!chopPts.length || !chopBuffer) return;
    const enginePads = padsByEngine[activeEngine];
    chopPts.slice(0, 8).forEach((pt, i) => {
      const end = chopPts[i+1] || chopBuffer.duration;
      const dur = end - pt;
      const startSamp = Math.floor(pt * chopBuffer.sampleRate);
      const endSamp = Math.floor(end * chopBuffer.sampleRate);
      const nc = chopBuffer.numberOfChannels;
      const offCtx = new OfflineAudioContext(nc, endSamp - startSamp, chopBuffer.sampleRate);
      const chopBuf = offCtx.createBuffer(nc, endSamp - startSamp, chopBuffer.sampleRate);
      for (let c = 0; c < nc; c++) {
        const src2 = chopBuffer.getChannelData(c);
        const dst = chopBuf.getChannelData(c);
        for (let j = 0; j < endSamp - startSamp; j++) dst[j] = src2[startSamp + j];
      }
      if (enginePads[i]) enginePads[i].buffer = chopBuf;
    });
    setShowChop(false);
  };

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Row header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 10, color, fontWeight: 700, width: 80 }}>{engineLabel}</div>
        {/* Pad selector */}
        <div style={{ display: 'flex', gap: 2 }}>
          {pads.map((p, i) => (
            <button key={i} onClick={() => setActivePad(i)}
              style={{
                width: 18, height: 18, borderRadius: 3, border: `1px solid ${i === selectedPad ? color : '#1a2a3a'}`,
                background: i === selectedPad ? color + '33' : '#070f1a',
                color: p.buffer ? (i === selectedPad ? color : '#5a7088') : '#222',
                fontSize: 7, fontWeight: 700, cursor: 'pointer', padding: 0,
              }}>{i + 1}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button onClick={onMute}
            style={{ padding: '2px 8px', fontSize: 9, fontWeight: 700, borderRadius: 3, cursor: 'pointer', border: `1px solid ${muted ? '#ff4444' : '#1a2a3a'}`, background: muted ? '#ff444433' : '#070f1a', color: muted ? '#ff4444' : '#5a7088' }}>M</button>
          <button onClick={onSolo}
            style={{ padding: '2px 8px', fontSize: 9, fontWeight: 700, borderRadius: 3, cursor: 'pointer', border: `1px solid ${soloed ? '#ffaa00' : '#1a2a3a'}`, background: soloed ? '#ffaa0033' : '#070f1a', color: soloed ? '#ffaa00' : '#5a7088' }}>S</button>
        </div>
      </div>
      {/* Step buttons */}
      <div style={{ display: 'flex', gap: 2 }}>
        {steps.map((on, si) => {
          const isCurrent = si === currentStep;
          return (
            <button key={si}
              onClick={() => {
                const ns = seq.map((row, ri) => ri === selectedPad ? row.map((v, vi) => vi === si ? !v : v) : row);
                setSeq(ns);
              }}
              style={{
                flex: 1, height: 24, borderRadius: 3, cursor: 'pointer', border: 'none',
                background: isCurrent ? '#ffffff33' : on ? color : si % 4 === 0 ? '#0d1f35' : '#070f1a',
                outline: isCurrent ? `2px solid ${color}` : 'none',
                boxShadow: on && isCurrent ? `0 0 6px ${color}` : 'none',
                transition: 'background 0.05s',
              }} />
          );
        })}
      </div>
    </div>
  );
}

// ── Main TripleSamplerTab ─────────────────────────────────────────────────────
export default function TripleSamplerTab({ onExport, onSendToArrange, sp1200Pads, spx3000Pads, spx3200Pads }) {
  // ── Per-engine pad state ───────────────────────────────────────────────────
  const [padsA, setPadsA] = useState(() => emptyPads()); // SP-1200
  const [padsB, setPadsB] = useState(() => emptyPads()); // SPX3000
  const [padsC, setPadsC] = useState(() => emptyPads()); // Digital

  // ── Per-engine sequencer ───────────────────────────────────────────────────
  const [seqA, setSeqA] = useState(() => emptySeq());
  const [seqB, setSeqB] = useState(() => emptySeq());
  const [seqC, setSeqC] = useState(() => emptySeq());

  // ── Active pad selection per engine (for sequencer row) ───────────────────
  const [activePadA, setActivePadA] = useState(0);
  const [activePadB, setActivePadB] = useState(0);
  const [activePadC, setActivePadC] = useState(0);

  // ── Active pads (flashing) ─────────────────────────────────────────────────
  const [activeA, setActiveA] = useState(new Set());
  const [activeB, setActiveB] = useState(new Set());
  const [activeC, setActiveC] = useState(new Set());

  // ── Engine mute/solo ──────────────────────────────────────────────────────
  const [mutedA, setMutedA] = useState(false);
  const [mutedB, setMutedB] = useState(false);
  const [mutedC, setMutedC] = useState(false);
  const [soloA, setSoloA]   = useState(false);
  const [soloB, setSoloB]   = useState(false);
  const [soloC, setSoloC]   = useState(false);

  // ── Transport ─────────────────────────────────────────────────────────────
  const [bpm, setBpm]         = useState(95);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [activeBank, setActiveBank]   = useState('sp1200');

  // ── Audio contexts per engine ─────────────────────────────────────────────
  const ctxA = useRef(null);
  const ctxB = useRef(null);
  const ctxC = useRef(null);
  const masterA = useRef(null);
  const masterB = useRef(null);
  const masterC = useRef(null);

  const stepRef    = useRef(0);
  const bpmRef     = useRef(bpm);
  const playRef    = useRef(false);
  const seqARef    = useRef(seqA);
  const seqBRef    = useRef(seqB);
  const seqCRef    = useRef(seqC);
  const padsARef   = useRef(padsA);
  const padsBRef   = useRef(padsB);
  const padsCRef   = useRef(padsC);
  const mutedARef  = useRef(mutedA);
  const mutedBRef  = useRef(mutedB);
  const mutedCRef  = useRef(mutedC);
  const soloARef   = useRef(soloA);
  const soloBRef   = useRef(soloB);
  const soloCRef   = useRef(soloC);
  const intervalRef = useRef(null);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { seqARef.current = seqA; }, [seqA]);
  useEffect(() => { seqBRef.current = seqB; }, [seqB]);
  useEffect(() => { seqCRef.current = seqC; }, [seqC]);
  useEffect(() => { padsARef.current = padsA; }, [padsA]);
  useEffect(() => { padsBRef.current = padsB; }, [padsB]);
  useEffect(() => { padsCRef.current = padsC; }, [padsC]);
  useEffect(() => { mutedARef.current = mutedA; }, [mutedA]);
  useEffect(() => { mutedBRef.current = mutedB; }, [mutedB]);
  useEffect(() => { mutedCRef.current = mutedC; }, [mutedC]);
  useEffect(() => { soloARef.current = soloA; }, [soloA]);
  useEffect(() => { soloBRef.current = soloB; }, [soloB]);
  useEffect(() => { soloCRef.current = soloC; }, [soloC]);

  // ── Init audio contexts ───────────────────────────────────────────────────
  const initCtxs = useCallback(() => {
    if (!ctxA.current) {
      ctxA.current = new (window.AudioContext || window.webkitAudioContext)();
      masterA.current = ctxA.current.createGain(); masterA.current.gain.value = 0.85;
      masterA.current.connect(ctxA.current.destination);
    }
    if (!ctxB.current) {
      ctxB.current = new (window.AudioContext || window.webkitAudioContext)();
      masterB.current = ctxB.current.createGain(); masterB.current.gain.value = 0.85;
      masterB.current.connect(ctxB.current.destination);
    }
    if (!ctxC.current) {
      ctxC.current = new (window.AudioContext || window.webkitAudioContext)();
      masterC.current = ctxC.current.createGain(); masterC.current.gain.value = 0.85;
      masterC.current.connect(ctxC.current.destination);
    }
    [ctxA, ctxB, ctxC].forEach(r => { if (r.current?.state === 'suspended') r.current.resume(); });
  }, []);

  // ── Fire a pad ────────────────────────────────────────────────────────────
  const firePad = useCallback((padIdx, pads, ctx, master, setActive) => {
    const pad = pads[padIdx];
    if (!pad?.buffer || pad.mute) return;
    const src  = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = pad.buffer;
    if (pad.tune) src.detune.value = pad.tune * 100;
    gain.gain.value = pad.volume ?? 0.85;
    if (pad.pan) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pad.pan;
      src.connect(gain); gain.connect(panner); panner.connect(master);
    } else {
      src.connect(gain); gain.connect(master);
    }
    src.start();
    setActive(prev => { const n = new Set(prev); n.add(padIdx); return n; });
    setTimeout(() => setActive(prev => { const n = new Set(prev); n.delete(padIdx); return n; }), 120);
  }, []);

  // ── Master clock tick (SPX3000 96 PPQN style) ────────────────────────────
  const tick = useCallback(() => {
    const step = stepRef.current;
    setCurrentStep(step);

    const anySolo = soloARef.current || soloBRef.current || soloCRef.current;

    // SP-1200 Bank A
    if (!mutedARef.current && (!anySolo || soloARef.current)) {
      seqARef.current.forEach((row, padIdx) => {
        if (row[step]) firePad(padIdx, padsARef.current, ctxA.current, masterA.current, setActiveA);
      });
    }

    // SPX3000 Bank B
    if (!mutedBRef.current && (!anySolo || soloBRef.current)) {
      seqBRef.current.forEach((row, padIdx) => {
        if (row[step]) firePad(padIdx, padsBRef.current, ctxB.current, masterB.current, setActiveB);
      });
    }

    // Digital Bank C
    if (!mutedCRef.current && (!anySolo || soloCRef.current)) {
      seqCRef.current.forEach((row, padIdx) => {
        if (row[step]) firePad(padIdx, padsCRef.current, ctxC.current, masterC.current, setActiveC);
      });
    }

    stepRef.current = (step + 1) % STEPS;
  }, [firePad]);

  // ── Transport controls ────────────────────────────────────────────────────
  const startPlay = useCallback(() => {
    initCtxs();
    stepRef.current = 0;
    playRef.current = true;
    setPlaying(true);
    const ms = (60000 / bpmRef.current) / 4; // 16th note interval
    intervalRef.current = setInterval(tick, ms);
  }, [initCtxs, tick]);

  const stopPlay = useCallback(() => {
    playRef.current = false;
    setPlaying(false);
    clearInterval(intervalRef.current);
    setCurrentStep(-1);
    stepRef.current = 0;
  }, []);

  // Restart when BPM changes while playing
  useEffect(() => {
    if (playing) { stopPlay(); setTimeout(startPlay, 50); }
  }, [bpm]);

  // ── Load sample into pad ──────────────────────────────────────────────────
  const loadPad = useCallback((engine, padIdx) => {
    initCtxs();
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'audio/*';
    inp.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const ab = await file.arrayBuffer();
      const ctx = engine === 'sp1200' ? ctxA.current : engine === 'spx3000' ? ctxB.current : ctxC.current;
      const raw = await ctx.decodeAudioData(ab);
      const name = file.name.replace(/\.[^.]+$/, '').slice(0, 14);
      const setPads = engine === 'sp1200' ? setPadsA : engine === 'spx3000' ? setPadsB : setPadsC;
      setPads(prev => prev.map((p, i) => i === padIdx ? { ...p, buffer: raw, name, url: URL.createObjectURL(file) } : p));
    };
    inp.click();
  }, [initCtxs]);

  const clearPad = useCallback((engine, padIdx) => {
    const setPads = engine === 'sp1200' ? setPadsA : engine === 'spx3000' ? setPadsB : setPadsC;
    setPads(prev => prev.map((p, i) => i === padIdx ? { ...p, buffer: null, name: `Pad ${padIdx + 1}`, url: null } : p));
  }, []);

  // ── Import from individual tabs ───────────────────────────────────────────
  const importFromProps = useCallback((engine) => {
    if (engine === 'sp1200' && sp1200Pads) setPadsA(sp1200Pads.slice(0, 8).map(p => ({ ...p })));
    if (engine === 'spx3000' && spx3000Pads) setPadsB(spx3000Pads.slice(0, 8).map(p => ({ ...p })));
    if (engine === 'spx3200' && spx3200Pads) setPadsC(spx3200Pads.slice(0, 8).map(p => ({ ...p })));
  }, [sp1200Pads, spx3000Pads, spx3200Pads]);

  // ── Active bank pads ──────────────────────────────────────────────────────
  const bankData = {
    sp1200:  { pads: padsA, setPads: setPadsA, active: activeA, seq: seqA, setSeq: setSeqA, activePad: activePadA, setActivePad: setActivePadA, muted: mutedA, soloed: soloA, ctx: ctxA, master: masterA, setActive: setActiveA, color: ENGINES[0].color },
    spx3000: { pads: padsB, setPads: setPadsB, active: activeB, seq: seqB, setSeq: setSeqB, activePad: activePadB, setActivePad: setActivePadB, muted: mutedB, soloed: soloB, ctx: ctxB, master: masterB, setActive: setActiveB, color: ENGINES[1].color },
    spx3200: { pads: padsC, setPads: setPadsC, active: activeC, seq: seqC, setSeq: setSeqC, activePad: activePadC, setActivePad: setActivePadC, muted: mutedC, soloed: soloC, ctx: ctxC, master: masterC, setActive: setActiveC, color: ENGINES[2].color },
  };

  const muteFns  = { sp1200: () => setMutedA(v => !v), spx3000: () => setMutedB(v => !v), spx3200: () => setMutedC(v => !v) };
  const soloFns  = { sp1200: () => setSoloA(v => !v),  spx3000: () => setSoloB(v => !v),  spx3200: () => setSoloC(v => !v) };

  const ab = bankData[activeBank] || bankData[Object.keys(bankData)[0]];

  const autoChop = () => {
    if (!chopBuffer) return;
    const sr = chopBuffer.sampleRate;
    const ch = chopBuffer.getChannelData(0);
    const pts = [0];
    const threshold = 0.1;
    let lastTrig = 0;
    const minGap = Math.floor(sr * 0.05);
    for (let i = 1; i < ch.length; i++) {
      if (Math.abs(ch[i]) > threshold && Math.abs(ch[i-1]) <= threshold && i - lastTrig > minGap) {
        pts.push(i / sr);
        lastTrig = i;
      }
    }
    setChopPts(pts);
  };

  const assignChopsToEngine = () => {
    if (!chopPts.length || !chopBuffer) return;
    const enginePads = padsByEngine[activeEngine];
    chopPts.slice(0, 8).forEach((pt, i) => {
      const end = chopPts[i+1] || chopBuffer.duration;
      const dur = end - pt;
      const startSamp = Math.floor(pt * chopBuffer.sampleRate);
      const endSamp = Math.floor(end * chopBuffer.sampleRate);
      const nc = chopBuffer.numberOfChannels;
      const offCtx = new OfflineAudioContext(nc, endSamp - startSamp, chopBuffer.sampleRate);
      const chopBuf = offCtx.createBuffer(nc, endSamp - startSamp, chopBuffer.sampleRate);
      for (let c = 0; c < nc; c++) {
        const src2 = chopBuffer.getChannelData(c);
        const dst = chopBuf.getChannelData(c);
        for (let j = 0; j < endSamp - startSamp; j++) dst[j] = src2[startSamp + j];
      }
      if (enginePads[i]) enginePads[i].buffer = chopBuf;
    });
    setShowChop(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#06060f', color: '#ccc', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden' }}>

      {/* ── MASTER TRANSPORT ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#0a1628', borderBottom: '1px solid #1a2a3a' }}>
        <div style={{ fontSize: 9, color: '#00ffc8', fontWeight: 700 }}>⚡ SPX Trident</div>
        <div style={{ fontSize: 9, color: '#5a7088' }}>MASTER CLOCK · SPX3000 96 PPQN</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* BPM */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => setBpm(b => Math.max(40, b - 1))} style={{ background: 'none', border: 'none', color: '#5a7088', cursor: 'pointer', fontSize: 12 }}>−</button>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#00ffc8', minWidth: 36, textAlign: 'center' }}>{bpm}</div>
            <button onClick={() => setBpm(b => Math.min(240, b + 1))} style={{ background: 'none', border: 'none', color: '#5a7088', cursor: 'pointer', fontSize: 12 }}>+</button>
            <div style={{ fontSize: 9, color: '#5a7088' }}>BPM</div>
          </div>
          {/* Play/Stop */}
          <button onClick={playing ? stopPlay : startPlay}
            style={{ padding: '6px 20px', background: playing ? '#ff444433' : '#00ffc833', color: playing ? '#ff4444' : '#00ffc8', border: `1px solid ${playing ? '#ff4444' : '#00ffc8'}`, borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
            {playing ? '⏹ STOP' : '▶ PLAY ALL'}
          </button>
        </div>
      </div>

      {/* ── BANK SELECTOR + IMPORT ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#080f1a', borderBottom: '1px solid #1a2a3a' }}>
        {ENGINES.map(eng => (
          <button key={eng.id} onClick={() => setActiveBank(eng.id)}
            style={{
              padding: '7px 16px', background: activeBank === eng.id ? '#0d1f35' : 'transparent',
              color: activeBank === eng.id ? eng.color : '#5a7088',
              border: 'none', borderBottom: activeBank === eng.id ? `2px solid ${eng.color}` : '2px solid transparent',
              cursor: 'pointer', fontSize: '0.7rem', fontWeight: activeBank === eng.id ? 700 : 400,
            }}>
            {eng.label}
            <span style={{ fontSize: 8, color: '#5a7088', marginLeft: 4 }}>{eng.desc}</span>
          </button>
        ))}
        {/* Import buttons */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, padding: '0 8px' }}>
          {ENGINES.map(eng => (
            <button key={eng.id} onClick={() => importFromProps(eng.id)}
              title={`Import ${eng.label} pads from individual tab`}
              style={{ padding: '3px 8px', fontSize: 8, color: eng.color, background: 'none', border: `1px solid ${eng.color}33`, borderRadius: 3, cursor: 'pointer' }}>
              ↙ {eng.tag}
            </button>
          ))}
        </div>
      </div>

      {/* ── PAD GRID (active bank) ────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid #1a2a3a' }}>
        <PadGrid
          pads={ab.pads}
          activePads={ab.active}
          engine={ENGINES.find(e => e.id === activeBank)}
          onPadClick={(i) => firePad(i, ab.pads, ab.ctx.current, ab.master.current, ab.setActive)}
          onLoad={(i) => loadPad(activeBank, i)}
          onClear={(i) => clearPad(activeBank, i)}
          color={ab.color}
        />
      </div>

      {/* ── SEQUENCER — all 3 rows ────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        <div style={{ fontSize: 9, color: '#5a7088', marginBottom: 8, letterSpacing: 1 }}>
          SEQUENCER · {STEPS} STEPS · {playing ? `STEP ${currentStep + 1}` : 'STOPPED'}
        </div>

        <SeqRow
          engineId="sp1200" engineLabel="🔴 SP-1200" color={ENGINES[0].color}
          pads={padsA} seq={seqA} setSeq={setSeqA}
          activePad={activePadA} setActivePad={setActivePadA}
          currentStep={currentStep} muted={mutedA} soloed={soloA}
          onMute={muteFns.sp1200} onSolo={soloFns.sp1200}
        />

        <SeqRow
          engineId="spx3000" engineLabel="🎛️ SPX3000" color={ENGINES[1].color}
          pads={padsB} seq={seqB} setSeq={setSeqB}
          activePad={activePadB} setActivePad={setActivePadB}
          currentStep={currentStep} muted={mutedB} soloed={soloB}
          onMute={muteFns.spx3000} onSolo={soloFns.spx3000}
        />

        <SeqRow
          engineId="digital" engineLabel="🎹 SPX-3200" color={ENGINES[2].color}
          pads={padsC} seq={seqC} setSeq={setSeqC}
          activePad={activePadC} setActivePad={setActivePadC}
          currentStep={currentStep} muted={mutedC} soloed={soloC}
          onMute={muteFns.digital} onSolo={soloFns.digital}
        />

        {/* ── Step count + swing ────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 9, color: '#5a7088' }}>STEPS</div>
          {[8, 16, 32].map(s => (
            <button key={s} style={{ padding: '2px 8px', fontSize: 9, fontWeight: 700, borderRadius: 3, cursor: 'pointer', border: `1px solid ${s === STEPS ? '#00ffc8' : '#1a2a3a'}`, background: s === STEPS ? '#00ffc833' : '#070f1a', color: s === STEPS ? '#00ffc8' : '#5a7088' }}>{s}</button>
          ))}
          <div style={{ marginLeft: 16, fontSize: 9, color: '#5a7088' }}>
            CLOCK · SPX3000 96 PPQN MASTER
          </div>
        </div>

        {/* ── Engine status bar ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {ENGINES.map((eng, ei) => {
            const bd = bankData[eng.id];
            const loaded = bd.pads.filter(p => p.buffer).length;
            return (
              <div key={eng.id} style={{ flex: 1, background: '#080f1a', border: `1px solid ${eng.color}22`, borderRadius: 4, padding: '6px 8px' }}>
                <div style={{ fontSize: 9, color: eng.color, fontWeight: 700 }}>{eng.label}</div>
                <div style={{ fontSize: 8, color: '#5a7088', marginTop: 2 }}>{eng.desc}</div>
                <div style={{ fontSize: 8, color: '#5a7088', marginTop: 2 }}>{loaded}/8 pads loaded</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  <button onClick={muteFns[eng.id]}
                    style={{ flex: 1, padding: '2px 0', fontSize: 8, fontWeight: 700, borderRadius: 2, cursor: 'pointer', border: `1px solid ${bd.muted ? '#ff4444' : '#1a2a3a'}`, background: bd.muted ? '#ff444433' : 'transparent', color: bd.muted ? '#ff4444' : '#5a7088' }}>MUTE</button>
                  <button onClick={soloFns[eng.id]}
                    style={{ flex: 1, padding: '2px 0', fontSize: 8, fontWeight: 700, borderRadius: 2, cursor: 'pointer', border: `1px solid ${bd.soloed ? '#ffaa00' : '#1a2a3a'}`, background: bd.soloed ? '#ffaa0033' : 'transparent', color: bd.soloed ? '#ffaa00' : '#5a7088' }}>SOLO</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
