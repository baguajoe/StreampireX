// =============================================================================
// MultibandEffects.js — 3-Band Multiband Compressor + Effects
// =============================================================================
// Location: src/front/js/component/MultibandEffects.js
//
// Premium DAW-grade UI featuring:
//  • Canvas-based animated spectrum analyzer
//  • Per-band gain reduction meters with peak hold
//  • Real Web Audio DynamicsCompressor + WaveShaper per band
//  • Crossover frequency sliders with live filter updates
//  • Saturation / soft-clip per band
//  • Solo / Mute per band with correct priority
//  • Preset system per band (Gentle / Punch / Limit / Air)
//  • Master makeup gain
//  • Oscilloscope output display
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dbToLin = (db) => Math.pow(10, db / 20);

function makeSoftClip(amount) {
  const n = 512;
  const curve = new Float32Array(n);
  const k = amount * 80;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = k === 0 ? x : ((1 + k / 100) * x) / (1 + (k / 100) * Math.abs(x));
  }
  return curve;
}

const BAND_DEFS = [
  { id: 'low',  label: 'LOW',  freqRange: '20 – 250 Hz',    color: '#ff6b6b', glow: '#ff6b6b44', xover: 250,   threshold: -24, ratio: 4,   attack: 0.010, release: 0.150, makeup: 0, sat: 0 },
  { id: 'mid',  label: 'MID',  freqRange: '250 Hz – 4 kHz', color: '#00ffc8', glow: '#00ffc844', xover: 4000,  threshold: -18, ratio: 3,   attack: 0.005, release: 0.100, makeup: 0, sat: 0 },
  { id: 'high', label: 'HIGH', freqRange: '4 kHz – 20 kHz', color: '#4a9eff', glow: '#4a9eff44', xover: 20000, threshold: -12, ratio: 2.5, attack: 0.002, release: 0.080, makeup: 0, sat: 0 },
];

const PRESETS = {
  Gentle: { threshold: -18, ratio: 2,  attack: 0.020, release: 0.150, makeup: 2,  sat: 0    },
  Punch:  { threshold: -24, ratio: 6,  attack: 0.005, release: 0.080, makeup: 4,  sat: 0.15 },
  Limit:  { threshold:  -6, ratio: 20, attack: 0.001, release: 0.050, makeup: 0,  sat: 0    },
  Air:    { threshold: -10, ratio: 1.5,attack: 0.010, release: 0.200, makeup: 3,  sat: 0.05 },
  Reset:  { threshold: -24, ratio: 4,  attack: 0.010, release: 0.150, makeup: 0,  sat: 0    },
};

const MultibandEffects = ({ audioContext, inputNode, outputNode, trackName, onClose, isEmbedded }) => {
  const [bands, setBands] = useState(BAND_DEFS.map(b => ({ ...b })));
  const [activeBand, setActiveBand] = useState(0);
  const [masterMakeup, setMasterMakeup] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [viewMode, setViewMode] = useState('detail');
  const [grLevels, setGrLevels] = useState([0, 0, 0]);
  const [outLevels, setOutLevels] = useState([0, 0, 0]);
  const [peakHold, setPeakHold] = useState([0, 0, 0]);

  const graphRef = useRef(null);
  const masterGainRef = useRef(null);
  const sumNodeRef = useRef(null);
  const animRef = useRef(null);
  const builtRef = useRef(false);
  const peakTimers = useRef([0, 0, 0]);
  const peakVals = useRef([0, 0, 0]);
  const specCanvasRef = useRef(null);
  const scopeCanvasRef = useRef(null);

  useEffect(() => {
    if (!audioContext || !inputNode || !outputNode || builtRef.current) return;

    const sum = audioContext.createGain(); sum.gain.value = 1; sumNodeRef.current = sum;
    const mg = audioContext.createGain(); mg.gain.value = dbToLin(masterMakeup); masterGainRef.current = mg;
    sum.connect(mg); mg.connect(outputNode);

    const nodes = BAND_DEFS.map((def, i) => {
      const filters = [];
      if (i === 0) {
        const lp1 = audioContext.createBiquadFilter(); lp1.type = 'lowpass'; lp1.frequency.value = def.xover; lp1.Q.value = 0.707;
        const lp2 = audioContext.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = def.xover; lp2.Q.value = 0.707;
        filters.push(lp1, lp2);
      } else if (i === 1) {
        const hp = audioContext.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = BAND_DEFS[0].xover; hp.Q.value = 0.707;
        const lp = audioContext.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = def.xover; lp.Q.value = 0.707;
        filters.push(hp, lp);
      } else {
        const hp1 = audioContext.createBiquadFilter(); hp1.type = 'highpass'; hp1.frequency.value = BAND_DEFS[1].xover; hp1.Q.value = 0.707;
        const hp2 = audioContext.createBiquadFilter(); hp2.type = 'highpass'; hp2.frequency.value = BAND_DEFS[1].xover; hp2.Q.value = 0.707;
        filters.push(hp1, hp2);
      }
      const comp = audioContext.createDynamicsCompressor();
      comp.threshold.value = def.threshold; comp.ratio.value = def.ratio;
      comp.attack.value = def.attack; comp.release.value = def.release; comp.knee.value = 6;
      const sat = audioContext.createWaveShaper(); sat.curve = makeSoftClip(def.sat); sat.oversample = '4x';
      const gain = audioContext.createGain(); gain.gain.value = dbToLin(def.makeup);
      const mute = audioContext.createGain(); mute.gain.value = 1;
      const analyser = audioContext.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.6;
      inputNode.connect(filters[0]);
      for (let j = 0; j < filters.length - 1; j++) filters[j].connect(filters[j + 1]);
      filters[filters.length - 1].connect(comp); comp.connect(sat); sat.connect(gain); gain.connect(mute); mute.connect(analyser); analyser.connect(sum);
      return { filters, comp, sat, gain, mute, analyser };
    });

    graphRef.current = nodes; builtRef.current = true;
    startAnimation();
    return () => { cancelAnimationFrame(animRef.current); teardown(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioContext, inputNode, outputNode]);

  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.forEach((node, i) => {
      const b = bands[i]; if (!node) return;
      node.comp.threshold.value = b.threshold; node.comp.ratio.value = b.ratio;
      node.comp.attack.value = b.attack; node.comp.release.value = b.release;
      node.gain.gain.value = dbToLin(b.makeup); node.sat.curve = makeSoftClip(b.sat);
      if (i === 0) { node.filters.forEach(f => f.frequency.value = b.xover); }
      else if (i === 1) { node.filters[0].frequency.value = bands[0].xover; node.filters[1].frequency.value = b.xover; }
      else { node.filters.forEach(f => f.frequency.value = bands[1].xover); }
    });
  }, [bands]);

  useEffect(() => {
    if (!graphRef.current) return;
    const soloIdx = bands.findIndex(b => b.solo);
    graphRef.current.forEach((node, i) => {
      if (!node) return;
      node.mute.gain.value = (enabled && (soloIdx >= 0 ? i === soloIdx : !bands[i].mute)) ? 1 : 0;
    });
  }, [bands, enabled]);

  useEffect(() => { if (masterGainRef.current) masterGainRef.current.gain.value = dbToLin(masterMakeup); }, [masterMakeup]);

  const teardown = () => {
    if (!graphRef.current) return;
    graphRef.current.forEach(n => { try { n.filters.forEach(f => f.disconnect()); n.comp.disconnect(); n.sat.disconnect(); n.gain.disconnect(); n.mute.disconnect(); n.analyser.disconnect(); } catch (_) {} });
    try { sumNodeRef.current?.disconnect(); masterGainRef.current?.disconnect(); } catch (_) {}
    graphRef.current = null; builtRef.current = false;
  };

  const startAnimation = () => {
    const floatBuf = new Float32Array(1024);
    const byteBuf = new Uint8Array(512);
    const nowFn = () => performance.now();
    const tick = () => {
      animRef.current = requestAnimationFrame(tick);
      if (!graphRef.current) return;
      const gr = [], out = [];
      graphRef.current.forEach((node, i) => {
        if (!node) { gr.push(0); out.push(0); return; }
        gr.push(Math.abs(node.comp.reduction ?? 0));
        node.analyser.getFloatTimeDomainData(floatBuf);
        let peak = 0; for (let j = 0; j < floatBuf.length; j++) peak = Math.max(peak, Math.abs(floatBuf[j]));
        out.push(Math.min(1, peak));
        const t = nowFn();
        if (peak > peakVals.current[i]) { peakVals.current[i] = peak; peakTimers.current[i] = t + 1500; }
        else if (t > peakTimers.current[i]) { peakVals.current[i] = Math.max(0, peakVals.current[i] - 0.002); }
      });
      setGrLevels([...gr]); setOutLevels([...out]); setPeakHold([...peakVals.current]);
      drawCanvases(floatBuf, byteBuf);
    };
    animRef.current = requestAnimationFrame(tick);
  };

  const drawCanvases = (floatBuf, byteBuf) => {
    const sc = specCanvasRef.current;
    if (sc && graphRef.current) {
      const ctx = sc.getContext('2d'); const w = sc.width, h = sc.height;
      ctx.fillStyle = '#0a0e14'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
      for (let x = 0; x < w; x += w / 10) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += h / 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      const bcolors = ['#ff6b6b', '#00ffc8', '#4a9eff'];
      graphRef.current.forEach((node, bi) => {
        if (!node) return;
        node.analyser.getByteFrequencyData(byteBuf);
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, bcolors[bi] + 'bb'); grad.addColorStop(1, bcolors[bi] + '00');
        ctx.fillStyle = grad; ctx.beginPath();
        for (let i = 0; i < byteBuf.length; i++) {
          const x = (i / byteBuf.length) * w; const y = h - (byteBuf[i] / 255) * h;
          i === 0 ? ctx.moveTo(x, h) : void 0; ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = bcolors[bi]; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i < byteBuf.length; i++) {
          const x = (i / byteBuf.length) * w; const y = h - (byteBuf[i] / 255) * h;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
    }
    const oc = scopeCanvasRef.current;
    if (oc && graphRef.current && graphRef.current[0]) {
      const ctx = oc.getContext('2d'); const w = oc.width, h = oc.height;
      ctx.fillStyle = '#0a0e14'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
      graphRef.current[0].analyser.getFloatTimeDomainData(floatBuf);
      ctx.strokeStyle = '#00ffc8'; ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00ffc8'; ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i < floatBuf.length; i++) {
        const x = (i / floatBuf.length) * w; const y = (0.5 + floatBuf[i] * 0.5) * h;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.shadowBlur = 0;
    }
  };

  const updateBand = useCallback((idx, key, val) => setBands(prev => prev.map((b, i) => i === idx ? { ...b, [key]: val } : b)), []);
  const applyPreset = (name) => { const p = PRESETS[name]; if (!p) return; setBands(prev => prev.map((b, i) => i === activeBand ? { ...b, ...p } : b)); };

  const b = bands[activeBand];
  const bandColor = BAND_DEFS[activeBand].color;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'linear-gradient(180deg, #0d1117 0%, #0a0e14 100%)', color: '#cdd9e5', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '11px', overflow: 'hidden', position: 'relative' }}>

      {/* Top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent 0%, ${bandColor}99 50%, transparent 100%)`, transition: 'background 0.4s ease', zIndex: 10 }} />

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', borderBottom: '1px solid #1c2128', background: '#161b22', flexShrink: 0, zIndex: 5 }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1" y="6"  width="4" height="11" rx="1" fill="#ff6b6b"/>
          <rect x="7" y="2"  width="4" height="15" rx="1" fill="#00ffc8"/>
          <rect x="13" y="8" width="4" height="9"  rx="1" fill="#4a9eff"/>
        </svg>
        <span style={{ color: '#e6edf3', fontWeight: 800, fontSize: '12px', letterSpacing: '0.12em' }}>MULTIBAND</span>
        <span style={{ color: '#484f58', fontSize: '10px' }}>3-Band Compressor + Saturation</span>
        {trackName && <div style={{ padding: '2px 8px', background: '#21262d', borderRadius: '4px', color: '#8b949e', fontSize: '10px' }}>{trackName}</div>}
        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <div style={{ display: 'flex', gap: '2px', background: '#0d1117', borderRadius: '6px', padding: '2px', border: '1px solid #21262d' }}>
          {['detail', 'scope'].map(v => (
            <button key={v} onClick={() => setViewMode(v)} style={{ background: viewMode === v ? '#21262d' : 'none', border: 'none', color: viewMode === v ? '#e6edf3' : '#6e7681', borderRadius: '4px', padding: '3px 12px', cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit', transition: 'all 0.1s' }}>
              {v === 'detail' ? 'Bands' : 'Scope'}
            </button>
          ))}
        </div>

        {/* Master makeup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#6e7681', fontSize: '10px', letterSpacing: '0.08em' }}>MASTER</span>
          <Knob min={-12} max={12} step={0.5} value={masterMakeup} onChange={setMasterMakeup} color="#00ffc8" size={36} />
          <span style={{ color: '#00ffc8', minWidth: '40px', fontWeight: 700, fontSize: '11px' }}>{masterMakeup > 0 ? '+' : ''}{masterMakeup}dB</span>
        </div>

        {/* Enable/Bypass */}
        <button onClick={() => setEnabled(p => !p)} style={{ background: enabled ? '#00ffc8' : '#161b22', color: enabled ? '#0d1117' : '#484f58', border: `1px solid ${enabled ? '#00ffc8' : '#30363d'}`, borderRadius: '5px', padding: '4px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '10px', fontWeight: 800, transition: 'all 0.15s', boxShadow: enabled ? '0 0 14px #00ffc844' : 'none' }}>
          {enabled ? 'ON' : 'BYPASS'}
        </button>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: '1px solid #30363d', color: '#6e7681', borderRadius: '4px', padding: '3px 9px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✕</button>}
      </div>

      {/* ── BAND SELECTOR ROW ── */}
      <div style={{ display: 'flex', gap: '8px', padding: '10px 14px 0', flexShrink: 0 }}>
        {bands.map((band, i) => {
          const def = BAND_DEFS[i];
          const isActive = activeBand === i;
          const grH = Math.min(100, grLevels[i] * 5);
          const outH = Math.min(100, outLevels[i] * 100);
          const pkH = Math.min(100, peakHold[i] * 100);
          return (
            <div key={def.id} onClick={() => setActiveBand(i)} style={{ flex: 1, border: `1px solid ${isActive ? def.color : '#21262d'}`, borderRadius: '8px', padding: '8px 10px 6px', cursor: 'pointer', background: isActive ? `${def.color}08` : '#161b22', transition: 'all 0.15s', boxShadow: isActive ? `0 0 20px ${def.glow}, inset 0 1px 0 ${def.color}33` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: def.color, flexShrink: 0, boxShadow: isActive ? `0 0 8px ${def.color}` : 'none', transition: 'box-shadow 0.3s' }} />
                <span style={{ color: def.color, fontWeight: 800, fontSize: '11px' }}>{def.label}</span>
                <span style={{ color: '#3d444d', fontSize: '9px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{def.freqRange}</span>
                <button onClick={e => { e.stopPropagation(); setBands(prev => prev.map((b, j) => ({ ...b, solo: j === i ? !b.solo : false }))); }} style={{ background: band.solo ? '#FF6600' : 'none', border: `1px solid ${band.solo ? '#FF6600' : '#30363d'}`, color: band.solo ? '#fff' : '#484f58', borderRadius: '3px', padding: '0 5px', cursor: 'pointer', fontSize: '9px', fontFamily: 'inherit', lineHeight: '14px' }}>S</button>
                <button onClick={e => { e.stopPropagation(); updateBand(i, 'mute', !band.mute); }} style={{ background: band.mute ? '#ff6b6b' : 'none', border: `1px solid ${band.mute ? '#ff6b6b' : '#30363d'}`, color: band.mute ? '#fff' : '#484f58', borderRadius: '3px', padding: '0 5px', cursor: 'pointer', fontSize: '9px', fontFamily: 'inherit', lineHeight: '14px' }}>M</button>
              </div>

              {/* Meters */}
              <div style={{ display: 'flex', gap: '4px', height: '48px', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <span style={{ color: '#3d444d', fontSize: '8px' }}>GR</span>
                  <div style={{ width: '8px', height: '40px', background: '#0d1117', border: '1px solid #21262d', borderRadius: '2px', display: 'flex', flexDirection: 'column-reverse', overflow: 'hidden' }}>
                    <div style={{ height: `${grH}%`, background: `linear-gradient(to top, ${def.color}, ${def.color}44)`, transition: 'height 0.05s linear' }} />
                  </div>
                  <span style={{ color: def.color, fontSize: '8px', fontWeight: 700 }}>-{grLevels[i].toFixed(1)}</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <span style={{ color: '#3d444d', fontSize: '8px' }}>OUT</span>
                  <div style={{ width: '100%', height: '40px', background: '#0d1117', border: '1px solid #21262d', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${outH}%`, background: `linear-gradient(to top, ${def.color}cc, ${def.color}22)`, transition: 'height 0.05s linear' }} />
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${pkH}%`, height: '1px', background: def.color, opacity: 0.9, boxShadow: `0 0 4px ${def.color}` }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ color: '#3d444d', fontSize: '8px' }}>{band.threshold}dB</span>
                <span style={{ color: '#3d444d', fontSize: '8px' }}>{band.ratio.toFixed(1)}:1</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── SPECTRUM ANALYZER ── */}
      <div style={{ padding: '8px 14px 0', flexShrink: 0 }}>
        <canvas ref={specCanvasRef} width={900} height={56}
          style={{ width: '100%', height: '56px', borderRadius: '6px', display: 'block', border: '1px solid #1c2128' }} />
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '10px 14px' }}>

        {/* ─ DETAIL VIEW ─ */}
        {viewMode === 'detail' && (
          <div style={{ display: 'flex', gap: '14px', height: '100%' }}>

            {/* Left: param sliders */}
            <div style={{ flex: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', alignContent: 'start' }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: `1px solid ${bandColor}33` }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: bandColor, boxShadow: `0 0 10px ${bandColor}` }} />
                <span style={{ color: bandColor, fontWeight: 800, fontSize: '13px', letterSpacing: '0.1em' }}>{BAND_DEFS[activeBand].label} BAND</span>
                <span style={{ color: '#484f58', fontSize: '10px' }}>{BAND_DEFS[activeBand].freqRange}</span>
              </div>

              {activeBand < 2 && (
                <KnobRow label={activeBand === 0 ? 'Low Xover' : 'Mid Xover'}
                  value={b.xover} min={activeBand === 0 ? 60 : 500} max={activeBand === 0 ? 1000 : 10000} step={activeBand === 0 ? 10 : 100}
                  color={bandColor} fmt={v => v >= 1000 ? `${(v / 1000).toFixed(1)}kHz` : `${v}Hz`}
                  onChange={v => updateBand(activeBand, 'xover', v)} />
              )}

              <KnobRow label="Threshold" value={b.threshold} min={-60} max={0} step={0.5} color={bandColor} fmt={v => `${v}dB`} onChange={v => updateBand(activeBand, 'threshold', v)} />
              <KnobRow label="Ratio" value={b.ratio} min={1} max={20} step={0.1} color={bandColor} fmt={v => `${v.toFixed(1)}:1`} onChange={v => updateBand(activeBand, 'ratio', v)} />
              <KnobRow label="Attack" value={b.attack} min={0.001} max={0.3} step={0.001} color={bandColor} fmt={v => `${Math.round(v * 1000)}ms`} onChange={v => updateBand(activeBand, 'attack', v)} />
              <KnobRow label="Release" value={b.release} min={0.01} max={1} step={0.01} color={bandColor} fmt={v => `${Math.round(v * 1000)}ms`} onChange={v => updateBand(activeBand, 'release', v)} />
              <KnobRow label="Makeup Gain" value={b.makeup} min={-12} max={24} step={0.5} color={bandColor} fmt={v => `${v > 0 ? '+' : ''}${v}dB`} onChange={v => updateBand(activeBand, 'makeup', v)} />
              <KnobRow label="Saturation" value={b.sat} min={0} max={1} step={0.01} color={bandColor} fmt={v => `${Math.round(v * 100)}%`} onChange={v => updateBand(activeBand, 'sat', v)} />

              {/* Presets */}
              <div style={{ gridColumn: '1 / -1', paddingTop: '4px' }}>
                <div style={{ color: '#484f58', fontSize: '9px', letterSpacing: '0.1em', marginBottom: '6px' }}>PRESETS</div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {Object.keys(PRESETS).map(name => (
                    <button key={name} onClick={() => applyPreset(name)} style={{ background: 'none', border: `1px solid ${bandColor}44`, color: bandColor, borderRadius: '5px', padding: '4px 12px', cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit', transition: 'all 0.12s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = bandColor + '22'; e.currentTarget.style.boxShadow = `0 0 8px ${bandColor}44`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: big GR meter */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: '#484f58', fontSize: '9px', letterSpacing: '0.1em', textAlign: 'center' }}>GAIN REDUCTION</div>
              <div style={{ flex: 1, position: 'relative', background: '#0a0e14', border: '1px solid #1c2128', borderRadius: '8px', overflow: 'hidden' }}>
                {[0, 3, 6, 9, 12, 18, 24].map(db => (
                  <div key={db} style={{ position: 'absolute', top: `${(db / 24) * 100}%`, left: 0, right: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '10px', height: '1px', background: '#21262d' }} />
                    <span style={{ color: '#3d444d', fontSize: '8px' }}>-{db}</span>
                  </div>
                ))}
                <div style={{
                  position: 'absolute', top: 0, left: '32px', right: '8px',
                  height: `${Math.min(100, grLevels[activeBand] / 24 * 100)}%`,
                  background: `linear-gradient(to bottom, ${bandColor}ee, ${bandColor}22)`,
                  borderRadius: '0 0 6px 6px', transition: 'height 0.05s linear',
                  boxShadow: `0 0 16px ${BAND_DEFS[activeBand].glow}`,
                }} />
                <div style={{ position: 'absolute', bottom: '10px', left: 0, right: 0, textAlign: 'center' }}>
                  <div style={{ color: bandColor, fontWeight: 800, fontSize: '20px', lineHeight: 1 }}>-{grLevels[activeBand].toFixed(1)}</div>
                  <div style={{ color: '#484f58', fontSize: '9px' }}>dB GR</div>
                </div>
              </div>

              {/* Crossover summary */}
              <div style={{ background: '#0a0e14', border: '1px solid #1c2128', borderRadius: '6px', padding: '8px 10px', fontSize: '9px', color: '#484f58' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span>LOW XO</span>
                  <span style={{ color: '#ff6b6b', fontWeight: 700 }}>{bands[0].xover >= 1000 ? `${(bands[0].xover / 1000).toFixed(1)}kHz` : `${bands[0].xover}Hz`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>MID XO</span>
                  <span style={{ color: '#00ffc8', fontWeight: 700 }}>{bands[1].xover >= 1000 ? `${(bands[1].xover / 1000).toFixed(1)}kHz` : `${bands[1].xover}Hz`}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─ SCOPE VIEW ─ */}
        {viewMode === 'scope' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ color: '#484f58', fontSize: '9px', letterSpacing: '0.1em' }}>OSCILLOSCOPE — LOW BAND OUTPUT</div>
            <canvas ref={scopeCanvasRef} width={900} height={180}
              style={{ width: '100%', flex: 1, borderRadius: '8px', border: '1px solid #1c2128', display: 'block' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              {BAND_DEFS.map((def, i) => (
                <div key={def.id} onClick={() => setActiveBand(i)} style={{ flex: 1, background: '#0a0e14', border: `1px solid ${activeBand === i ? def.color : '#1c2128'}`, borderRadius: '6px', padding: '8px 10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s', boxShadow: activeBand === i ? `0 0 14px ${def.glow}` : 'none' }}>
                  <div style={{ color: def.color, fontSize: '10px', marginBottom: '4px', fontWeight: 700 }}>{def.label}</div>
                  <div style={{ color: '#e6edf3', fontSize: '18px', fontWeight: 800 }}>-{grLevels[i].toFixed(1)}</div>
                  <div style={{ color: '#484f58', fontSize: '9px' }}>dB GR</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop: '1px solid #1c2128', padding: '5px 14px', display: 'flex', gap: '12px', color: '#3d444d', fontSize: '9px', flexShrink: 0, background: '#0a0e14', letterSpacing: '0.07em' }}>
        <span style={{ color: '#484f58' }}>3-BAND MULTIBAND COMPRESSOR</span>
        <span>•</span>
        <span style={{ color: '#ff6b6b88' }}>LOW XO: {bands[0].xover >= 1000 ? `${(bands[0].xover / 1000).toFixed(1)}k` : bands[0].xover}Hz</span>
        <span>•</span>
        <span style={{ color: '#00ffc888' }}>MID XO: {bands[1].xover >= 1000 ? `${(bands[1].xover / 1000).toFixed(1)}k` : bands[1].xover}Hz</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: enabled ? '#00ffc8' : '#3d444d', fontWeight: 700 }}>
          {enabled ? '● ACTIVE' : '○ BYPASSED'}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// KnobRow — stylized labeled range slider
// ---------------------------------------------------------------------------
const KnobRow = ({ label, value, min, max, step, fmt, color, onChange }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#6e7681', fontSize: '10px', letterSpacing: '0.06em' }}>{label.toUpperCase()}</span>
        <span style={{ color, fontSize: '11px', fontWeight: 700, textShadow: `0 0 8px ${color}66` }}>{fmt(value)}</span>
      </div>
      <div style={{ position: 'relative', height: '16px', display: 'flex', alignItems: 'center' }}>
        {/* Track background */}
        <div style={{ position: 'absolute', left: 0, right: 0, height: '3px', background: '#1c2128', borderRadius: '2px' }} />
        {/* Track fill */}
        <div style={{ position: 'absolute', left: 0, width: `${pct}%`, height: '3px', background: color, borderRadius: '2px', boxShadow: `0 0 6px ${color}77` }} />
        {/* Thumb dot */}
        <div style={{ position: 'absolute', left: `calc(${pct}% - 5px)`, width: '10px', height: '10px', background: color, borderRadius: '50%', boxShadow: `0 0 8px ${color}, 0 0 2px ${color}` }} />
        {/* Invisible range input on top */}
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ position: 'absolute', left: 0, right: 0, width: '100%', margin: 0, opacity: 0, cursor: 'pointer', height: '100%', zIndex: 2 }} />
      </div>
    </div>
  );
};

export default MultibandEffects;