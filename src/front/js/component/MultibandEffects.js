import { Knob } from './Knob';
// =============================================================================
// MultibandEffects.js — 3-Band Multiband Compressor + Effects
// =============================================================================
// Location: src/front/js/component/MultibandEffects.js
// Visual redesign: larger knobs, high-contrast band panels, bold meters,
// clear typography, generous spacing.
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

const dbToLin = (db) => Math.pow(10, db / 20);

function makeSoftClip(amount) {
  const n = 512;
  const curve = new Float32Array(n);
  const k = amount * 80;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = k === 0
      ? x
      : ((1 + k / 100) * x) / (1 + (k / 100) * Math.abs(x));
  }
  return curve;
}

const BAND_DEFS = [
  {
    id: 'low',  label: 'LOW',  freqRange: '20 – 250 Hz',
    color: '#ff6b6b', glow: '#ff6b6b33',
    xover: 250,   threshold: -24, ratio: 4,   attack: 0.010, release: 0.150, makeup: 0, sat: 0,
  },
  {
    id: 'mid',  label: 'MID',  freqRange: '250 Hz – 4 kHz',
    color: '#00ffc8', glow: '#00ffc833',
    xover: 4000,  threshold: -18, ratio: 3,   attack: 0.005, release: 0.100, makeup: 0, sat: 0,
  },
  {
    id: 'high', label: 'HIGH', freqRange: '4 kHz – 20 kHz',
    color: '#4a9eff', glow: '#4a9eff33',
    xover: 20000, threshold: -12, ratio: 2.5, attack: 0.002, release: 0.080, makeup: 0, sat: 0,
  },
];

const PRESETS = {
  Gentle: { threshold: -18, ratio: 2,   attack: 0.020, release: 0.150, makeup: 2,  sat: 0    },
  Punch:  { threshold: -24, ratio: 6,   attack: 0.005, release: 0.080, makeup: 4,  sat: 0.15 },
  Limit:  { threshold:  -6, ratio: 20,  attack: 0.001, release: 0.050, makeup: 0,  sat: 0    },
  Air:    { threshold: -10, ratio: 1.5, attack: 0.010, release: 0.200, makeup: 3,  sat: 0.05 },
  Reset:  { threshold: -24, ratio: 4,   attack: 0.010, release: 0.150, makeup: 0,  sat: 0    },
};

// ─────────────────────────────────────────────────────────────────────────────
// KnobCell — large rotary knob with prominent value + label
// ─────────────────────────────────────────────────────────────────────────────
const KnobCell = ({ label, value, min, max, step, fmt, color, onChange, size = 64 }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      padding: '10px 8px 8px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '10px',
      border: `1px solid rgba(255,255,255,0.06)`,
      minWidth: size + 24,
      transition: 'background 0.15s, border-color 0.15s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = `${color}10`;
      e.currentTarget.style.borderColor = `${color}44`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
    }}
  >
    <Knob
      value={value}
      min={min}
      max={max}
      step={step}
      fmt={fmt}
      color={color}
      size={size}
      onChange={onChange}
    />
    <span
      style={{
        color,
        fontSize: '14px',
        fontWeight: 800,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.03em',
        textShadow: `0 0 10px ${color}88`,
      }}
    >
      {fmt(value)}
    </span>
    <span
      style={{
        color: '#8b949e',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        textAlign: 'center',
      }}
    >
      {label}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MultibandEffects
// ─────────────────────────────────────────────────────────────────────────────
const MultibandEffects = ({ audioContext, inputNode, outputNode, trackName, onClose, isEmbedded }) => {
  const [bands,        setBands]        = useState(BAND_DEFS.map((b) => ({ ...b })));
  const [activeBand,   setActiveBand]   = useState(0);
  const [masterMakeup, setMasterMakeup] = useState(0);
  const [enabled,      setEnabled]      = useState(true);
  const [viewMode,     setViewMode]     = useState('detail');
  const [grLevels,     setGrLevels]     = useState([0, 0, 0]);
  const [outLevels,    setOutLevels]    = useState([0, 0, 0]);
  const [peakHold,     setPeakHold]     = useState([0, 0, 0]);

  const graphRef       = useRef(null);
  const masterGainRef  = useRef(null);
  const sumNodeRef     = useRef(null);
  const animRef        = useRef(null);
  const builtRef       = useRef(false);
  const peakTimers     = useRef([0, 0, 0]);
  const peakVals       = useRef([0, 0, 0]);
  const specCanvasRef  = useRef(null);
  const scopeCanvasRef = useRef(null);

  // ── Build audio graph ────────────────────────────────────────────────────
  useEffect(() => {
    if (!audioContext || !inputNode || !outputNode || builtRef.current) return;

    const sum = audioContext.createGain(); sum.gain.value = 1; sumNodeRef.current = sum;
    const mg  = audioContext.createGain(); mg.gain.value  = dbToLin(masterMakeup); masterGainRef.current = mg;
    sum.connect(mg);
    mg.connect(outputNode);

    const nodes = BAND_DEFS.map((def, i) => {
      const filters = [];
      if (i === 0) {
        const lp1 = audioContext.createBiquadFilter(); lp1.type = 'lowpass';  lp1.frequency.value = def.xover; lp1.Q.value = 0.707;
        const lp2 = audioContext.createBiquadFilter(); lp2.type = 'lowpass';  lp2.frequency.value = def.xover; lp2.Q.value = 0.707;
        filters.push(lp1, lp2);
      } else if (i === 1) {
        const hp = audioContext.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = BAND_DEFS[0].xover; hp.Q.value = 0.707;
        const lp = audioContext.createBiquadFilter(); lp.type = 'lowpass';  lp.frequency.value = def.xover;          lp.Q.value = 0.707;
        filters.push(hp, lp);
      } else {
        const hp1 = audioContext.createBiquadFilter(); hp1.type = 'highpass'; hp1.frequency.value = BAND_DEFS[1].xover; hp1.Q.value = 0.707;
        const hp2 = audioContext.createBiquadFilter(); hp2.type = 'highpass'; hp2.frequency.value = BAND_DEFS[1].xover; hp2.Q.value = 0.707;
        filters.push(hp1, hp2);
      }

      const comp     = audioContext.createDynamicsCompressor();
      comp.threshold.value = def.threshold; comp.ratio.value = def.ratio;
      comp.attack.value    = def.attack;    comp.release.value = def.release; comp.knee.value = 6;

      const sat      = audioContext.createWaveShaper(); sat.curve = makeSoftClip(def.sat); sat.oversample = '4x';
      const gain     = audioContext.createGain();       gain.gain.value = dbToLin(def.makeup);
      const mute     = audioContext.createGain();       mute.gain.value = 1;
      const analyser = audioContext.createAnalyser();   analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.6;

      inputNode.connect(filters[0]);
      for (let j = 0; j < filters.length - 1; j++) filters[j].connect(filters[j + 1]);
      filters[filters.length - 1].connect(comp);
      comp.connect(sat); sat.connect(gain); gain.connect(mute); mute.connect(analyser); analyser.connect(sum);

      return { filters, comp, sat, gain, mute, analyser };
    });

    graphRef.current = nodes;
    builtRef.current = true;
    startAnimation();

    return () => { cancelAnimationFrame(animRef.current); teardown(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioContext, inputNode, outputNode]);

  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.forEach((node, i) => {
      const b = bands[i]; if (!node) return;
      node.comp.threshold.value = b.threshold; node.comp.ratio.value = b.ratio;
      node.comp.attack.value    = b.attack;    node.comp.release.value = b.release;
      node.gain.gain.value = dbToLin(b.makeup); node.sat.curve = makeSoftClip(b.sat);
      if (i === 0)      node.filters.forEach((f) => (f.frequency.value = b.xover));
      else if (i === 1) { node.filters[0].frequency.value = bands[0].xover; node.filters[1].frequency.value = b.xover; }
      else              node.filters.forEach((f) => (f.frequency.value = bands[1].xover));
    });
  }, [bands]);

  useEffect(() => {
    if (!graphRef.current) return;
    const soloIdx = bands.findIndex((b) => b.solo);
    graphRef.current.forEach((node, i) => {
      if (!node) return;
      node.mute.gain.value = enabled && (soloIdx >= 0 ? i === soloIdx : !bands[i].mute) ? 1 : 0;
    });
  }, [bands, enabled]);

  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = dbToLin(masterMakeup);
  }, [masterMakeup]);

  const teardown = () => {
    if (!graphRef.current) return;
    graphRef.current.forEach((n) => {
      try { n.filters.forEach((f) => f.disconnect()); n.comp.disconnect(); n.sat.disconnect(); n.gain.disconnect(); n.mute.disconnect(); n.analyser.disconnect(); } catch (_) {}
    });
    try { sumNodeRef.current?.disconnect(); masterGainRef.current?.disconnect(); } catch (_) {}
    graphRef.current = null; builtRef.current = false;
  };

  const startAnimation = () => {
    const floatBuf = new Float32Array(1024);
    const byteBuf  = new Uint8Array(512);

    const tick = () => {
      animRef.current = requestAnimationFrame(tick);
      if (!graphRef.current) return;

      const gr = [], out = [];
      graphRef.current.forEach((node, i) => {
        if (!node) { gr.push(0); out.push(0); return; }
        gr.push(Math.abs(node.comp.reduction ?? 0));
        node.analyser.getFloatTimeDomainData(floatBuf);
        let peak = 0;
        for (let j = 0; j < floatBuf.length; j++) peak = Math.max(peak, Math.abs(floatBuf[j]));
        out.push(Math.min(1, peak));
        const t = performance.now();
        if (peak > peakVals.current[i]) { peakVals.current[i] = peak; peakTimers.current[i] = t + 1500; }
        else if (t > peakTimers.current[i]) { peakVals.current[i] = Math.max(0, peakVals.current[i] - 0.002); }
      });

      setGrLevels([...gr]);
      setOutLevels([...out]);
      setPeakHold([...peakVals.current]);
      drawCanvases(floatBuf, byteBuf);
    };

    animRef.current = requestAnimationFrame(tick);
  };

  const drawCanvases = (floatBuf, byteBuf) => {
    const sc = specCanvasRef.current;
    if (sc && graphRef.current) {
      const ctx = sc.getContext('2d');
      const w = sc.width, h = sc.height;
      ctx.fillStyle = '#080c10';
      ctx.fillRect(0, 0, w, h);

      // grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += w / 8)  { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += h / 4)   { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      const bcolors = ['#ff6b6b', '#00ffc8', '#4a9eff'];
      graphRef.current.forEach((node, bi) => {
        if (!node) return;
        node.analyser.getByteFrequencyData(byteBuf);
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, bcolors[bi] + 'aa');
        grad.addColorStop(1, bcolors[bi] + '00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        for (let i = 0; i < byteBuf.length; i++) {
          const x = (i / byteBuf.length) * w;
          const y = h - (byteBuf[i] / 255) * h;
          if (i === 0) ctx.moveTo(x, h);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = bcolors[bi]; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < byteBuf.length; i++) {
          const x = (i / byteBuf.length) * w;
          const y = h - (byteBuf[i] / 255) * h;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
    }

    const oc = scopeCanvasRef.current;
    if (oc && graphRef.current && graphRef.current[0]) {
      const ctx = oc.getContext('2d');
      const w = oc.width, h = oc.height;
      ctx.fillStyle = '#080c10'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
      graphRef.current[0].analyser.getFloatTimeDomainData(floatBuf);
      ctx.strokeStyle = '#00ffc8'; ctx.lineWidth = 2; ctx.shadowColor = '#00ffc8'; ctx.shadowBlur = 10;
      ctx.beginPath();
      for (let i = 0; i < floatBuf.length; i++) {
        const x = (i / floatBuf.length) * w;
        const y = (0.5 + floatBuf[i] * 0.5) * h;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.shadowBlur = 0;
    }
  };

  const updateBand = useCallback(
    (idx, key, val) => setBands((prev) => prev.map((b, i) => (i === idx ? { ...b, [key]: val } : b))),
    []
  );

  const applyPreset = (name) => {
    const p = PRESETS[name]; if (!p) return;
    setBands((prev) => prev.map((b, i) => (i === activeBand ? { ...b, ...p } : b)));
  };

  const b         = bands[activeBand];
  const bandColor = BAND_DEFS[activeBand].color;
  const bandGlow  = BAND_DEFS[activeBand].glow;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#0b0f14',
        color: '#e6edf3',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: '13px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent 0%, ${bandColor} 50%, transparent 100%)`,
          transition: 'background 0.5s',
          zIndex: 10,
        }}
      />

      {/* ══ HEADER ══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
          flexShrink: 0,
          zIndex: 5,
        }}
      >
        {/* Icon */}
        <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
          <rect x="1"  y="6" width="4" height="11" rx="1.5" fill="#ff6b6b" />
          <rect x="7"  y="2" width="4" height="15" rx="1.5" fill="#00ffc8" />
          <rect x="13" y="8" width="4" height="9"  rx="1.5" fill="#4a9eff" />
        </svg>

        <div>
          <div style={{ color: '#e6edf3', fontWeight: 800, fontSize: '13px', letterSpacing: '0.12em' }}>
            MULTIBAND
          </div>
          <div style={{ color: '#6e7681', fontSize: '11px', letterSpacing: '0.08em', marginTop: '1px' }}>
            3-BAND COMPRESSOR + SATURATION
          </div>
        </div>

        {trackName && (
          <div
            style={{
              padding: '3px 10px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '6px',
              color: '#8b949e',
              fontSize: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {trackName}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '8px',
            padding: '3px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {['detail', 'scope'].map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              style={{
                background: viewMode === v ? 'rgba(255,255,255,0.1)' : 'none',
                border: 'none',
                color: viewMode === v ? '#e6edf3' : '#6e7681',
                borderRadius: '5px',
                padding: '4px 14px',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'inherit',
                fontWeight: viewMode === v ? 700 : 400,
                transition: 'all 0.12s',
                letterSpacing: '0.06em',
              }}
            >
              {v === 'detail' ? 'BANDS' : 'SCOPE'}
            </button>
          ))}
        </div>

        {/* Master makeup */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'rgba(0,255,200,0.05)',
            borderRadius: '8px',
            border: '1px solid rgba(0,255,200,0.15)',
          }}
        >
          <span style={{ color: '#6e7681', fontSize: '11px', letterSpacing: '0.1em' }}>MASTER</span>
          <Knob
            min={-12} max={12} step={0.5}
            value={masterMakeup}
            onChange={setMasterMakeup}
            color="#00ffc8"
            size={64}
            fmt={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`}
          />
          <span style={{ color: '#00ffc8', fontWeight: 800, fontSize: '14px', minWidth: '44px' }}>
            {masterMakeup > 0 ? '+' : ''}{masterMakeup}dB
          </span>
        </div>

        {/* Enable/bypass */}
        <button
          onClick={() => setEnabled((p) => !p)}
          style={{
            background: enabled ? '#00ffc8' : 'rgba(255,255,255,0.05)',
            color: enabled ? '#0b0f14' : '#6e7681',
            border: `1px solid ${enabled ? '#00ffc8' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '7px',
            padding: '6px 18px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.1em',
            transition: 'all 0.15s',
            boxShadow: enabled ? '0 0 20px rgba(0,255,200,0.3)' : 'none',
          }}
        >
          {enabled ? '● ON' : '○ BYPASS'}
        </button>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#6e7681',
              borderRadius: '6px',
              padding: '5px 10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '13px',
              transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ff6b6b'; e.currentTarget.style.color = '#ff6b6b'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#6e7681'; }}
          >
            ✕
          </button>
        )}
      </div>

      {/* ══ BAND TABS ══ */}
      <div
        style={{
          display: 'flex',
          gap: '0',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        {bands.map((band, i) => {
          const def      = BAND_DEFS[i];
          const isActive = activeBand === i;
          const grH      = Math.min(100, grLevels[i] * 5);
          const outH     = Math.min(100, outLevels[i] * 100);
          const pkH      = Math.min(100, peakHold[i] * 100);

          return (
            <div
              key={def.id}
              onClick={() => setActiveBand(i)}
              style={{
                flex: 1,
                padding: '12px 16px',
                cursor: 'pointer',
                background: isActive ? `${def.color}0d` : 'transparent',
                borderBottom: `3px solid ${isActive ? def.color : 'transparent'}`,
                transition: 'all 0.15s',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}
            >
              {/* Band top row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: def.color,
                    boxShadow: isActive ? `0 0 10px ${def.color}` : 'none',
                    transition: 'box-shadow 0.3s',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: isActive ? def.color : '#6e7681',
                    fontWeight: 800,
                    fontSize: '13px',
                    letterSpacing: '0.1em',
                    transition: 'color 0.15s',
                  }}
                >
                  {def.label}
                </span>
                <span style={{ color: '#484f58', fontSize: '11px', flex: 1 }}>{def.freqRange}</span>

                {/* Solo / Mute */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setBands((prev) => prev.map((b, j) => ({ ...b, solo: j === i ? !b.solo : false })));
                  }}
                  style={{
                    background: band.solo ? '#FF6600' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${band.solo ? '#FF6600' : 'rgba(255,255,255,0.1)'}`,
                    color: band.solo ? '#fff' : '#6e7681',
                    borderRadius: '4px',
                    padding: '2px 7px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontFamily: 'inherit',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}
                >
                  S
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); updateBand(i, 'mute', !band.mute); }}
                  style={{
                    background: band.mute ? '#ff4444' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${band.mute ? '#ff4444' : 'rgba(255,255,255,0.1)'}`,
                    color: band.mute ? '#fff' : '#6e7681',
                    borderRadius: '4px',
                    padding: '2px 7px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontFamily: 'inherit',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}
                >
                  M
                </button>
              </div>

              {/* Meters row */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '52px' }}>
                {/* GR meter */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                  <span style={{ color: '#484f58', fontSize: '8px', letterSpacing: '0.08em' }}>GR</span>
                  <div
                    style={{
                      width: '10px',
                      height: '40px',
                      background: 'rgba(0,0,0,0.4)',
                      border: `1px solid rgba(255,255,255,0.08)`,
                      borderRadius: '3px',
                      display: 'flex',
                      flexDirection: 'column-reverse',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: `${grH}%`,
                        background: `linear-gradient(to top, ${def.color}, ${def.color}66)`,
                        transition: 'height 0.05s linear',
                        boxShadow: grH > 10 ? `0 0 6px ${def.color}88` : 'none',
                      }}
                    />
                  </div>
                  <span style={{ color: def.color, fontSize: '11px', fontWeight: 700 }}>
                    -{grLevels[i].toFixed(1)}
                  </span>
                </div>

                {/* OUT meter */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                  <span style={{ color: '#484f58', fontSize: '8px', letterSpacing: '0.08em' }}>OUT</span>
                  <div
                    style={{
                      width: '100%',
                      height: '40px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '3px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0, left: 0, right: 0,
                        height: `${outH}%`,
                        background: `linear-gradient(to top, ${def.color}cc, ${def.color}22)`,
                        transition: 'height 0.05s linear',
                      }}
                    />
                    {/* Peak hold line */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0, right: 0,
                        bottom: `${pkH}%`,
                        height: '2px',
                        background: def.color,
                        boxShadow: `0 0 6px ${def.color}`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Threshold / ratio readout */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ color: '#6e7681', fontSize: '11px' }}>{band.threshold}dB</span>
                <span style={{ color: '#6e7681', fontSize: '11px' }}>{band.ratio.toFixed(1)}:1</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══ SPECTRUM CANVAS ══ */}
      <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
        <canvas
          ref={specCanvasRef}
          width={900}
          height={64}
          style={{
            width: '100%',
            height: '64px',
            borderRadius: '8px',
            display: 'block',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        />
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '12px 16px' }}>

        {/* ─ DETAIL VIEW ─ */}
        {viewMode === 'detail' && (
          <div style={{ display: 'flex', gap: '16px', height: '100%' }}>

            {/* Left: knobs */}
            <div
              style={{
                flex: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                overflowY: 'auto',
              }}
            >
              {/* Band header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: `${bandColor}0a`,
                  borderRadius: '10px',
                  border: `1px solid ${bandColor}33`,
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: bandColor,
                    boxShadow: `0 0 14px ${bandColor}`,
                  }}
                />
                <span
                  style={{
                    color: bandColor,
                    fontWeight: 800,
                    fontSize: '15px',
                    letterSpacing: '0.1em',
                    textShadow: `0 0 20px ${bandColor}66`,
                  }}
                >
                  {BAND_DEFS[activeBand].label} BAND
                </span>
                <span style={{ color: '#6e7681', fontSize: '13px' }}>
                  {BAND_DEFS[activeBand].freqRange}
                </span>
              </div>

              {/* Knob grid */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {activeBand < 2 && (
                  <KnobCell
                    label={activeBand === 0 ? 'Low Xover' : 'Mid Xover'}
                    value={b.xover}
                    min={activeBand === 0 ? 60 : 500}
                    max={activeBand === 0 ? 1000 : 10000}
                    step={activeBand === 0 ? 10 : 100}
                    color={bandColor}
                    fmt={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}Hz`}
                    onChange={(v) => updateBand(activeBand, 'xover', v)}
                    size={64}
                  />
                )}
                <KnobCell label="Threshold"  value={b.threshold} min={-60}   max={0}   step={0.5}  color={bandColor} fmt={(v) => `${v}dB`}                             onChange={(v) => updateBand(activeBand, 'threshold', v)} size={64} />
                <KnobCell label="Ratio"       value={b.ratio}     min={1}     max={20}  step={0.1}  color={bandColor} fmt={(v) => `${v.toFixed(1)}:1`}                   onChange={(v) => updateBand(activeBand, 'ratio', v)}     size={64} />
                <KnobCell label="Attack"      value={b.attack}    min={0.001} max={0.3} step={0.001}color={bandColor} fmt={(v) => `${Math.round(v * 1000)}ms`}            onChange={(v) => updateBand(activeBand, 'attack', v)}    size={64} />
                <KnobCell label="Release"     value={b.release}   min={0.01}  max={1}   step={0.01} color={bandColor} fmt={(v) => `${Math.round(v * 1000)}ms`}            onChange={(v) => updateBand(activeBand, 'release', v)}   size={64} />
                <KnobCell label="Makeup Gain" value={b.makeup}    min={-12}   max={24}  step={0.5}  color={bandColor} fmt={(v) => `${v > 0 ? '+' : ''}${v}dB`}           onChange={(v) => updateBand(activeBand, 'makeup', v)}    size={64} />
                <KnobCell label="Saturation"  value={b.sat}       min={0}     max={1}   step={0.01} color={bandColor} fmt={(v) => `${Math.round(v * 100)}%`}              onChange={(v) => updateBand(activeBand, 'sat', v)}       size={64} />
              </div>

              {/* Presets */}
              <div>
                <div
                  style={{
                    color: '#484f58',
                    fontSize: '11px',
                    letterSpacing: '0.15em',
                    marginBottom: '8px',
                    fontWeight: 700,
                  }}
                >
                  PRESETS
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.keys(PRESETS).map((name) => (
                    <button
                      key={name}
                      onClick={() => applyPreset(name)}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${bandColor}33`,
                        color: bandColor,
                        borderRadius: '6px',
                        padding: '6px 16px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        transition: 'all 0.12s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${bandColor}22`;
                        e.currentTarget.style.boxShadow = `0 0 12px ${bandColor}44`;
                        e.currentTarget.style.borderColor = bandColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = `${bandColor}33`;
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: GR meter + crossover summary */}
            <div style={{ flex: '0 0 130px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  color: '#6e7681',
                  fontSize: '11px',
                  letterSpacing: '0.15em',
                  textAlign: 'center',
                  fontWeight: 700,
                }}
              >
                GAIN REDUCTION
              </div>

              {/* Big GR meter */}
              <div
                style={{
                  flex: 1,
                  position: 'relative',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                {[0, 3, 6, 9, 12, 18, 24].map((db) => (
                  <div
                    key={db}
                    style={{
                      position: 'absolute',
                      top: `${(db / 24) * 100}%`,
                      left: 0,
                      right: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <div style={{ width: '12px', height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    <span style={{ color: '#484f58', fontSize: '8px' }}>-{db}</span>
                  </div>
                ))}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '36px',
                    right: '8px',
                    height: `${Math.min(100, grLevels[activeBand] / 24 * 100)}%`,
                    background: `linear-gradient(to bottom, ${bandColor}, ${bandColor}44)`,
                    borderRadius: '0 0 6px 6px',
                    transition: 'height 0.05s linear',
                    boxShadow: `0 4px 20px ${bandColor}66`,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      color: bandColor,
                      fontWeight: 800,
                      fontSize: '22px',
                      lineHeight: 1,
                      textShadow: `0 0 20px ${bandColor}`,
                    }}
                  >
                    -{grLevels[activeBand].toFixed(1)}
                  </div>
                  <div style={{ color: '#6e7681', fontSize: '11px', marginTop: '2px' }}>dB GR</div>
                </div>
              </div>

              {/* Crossover summary */}
              <div
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                  <span style={{ color: '#6e7681', fontSize: '11px', letterSpacing: '0.08em' }}>LOW XO</span>
                  <span style={{ color: '#ff6b6b', fontWeight: 700, fontSize: '13px' }}>
                    {bands[0].xover >= 1000 ? `${(bands[0].xover / 1000).toFixed(1)}kHz` : `${bands[0].xover}Hz`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6e7681', fontSize: '11px', letterSpacing: '0.08em' }}>MID XO</span>
                  <span style={{ color: '#00ffc8', fontWeight: 700, fontSize: '13px' }}>
                    {bands[1].xover >= 1000 ? `${(bands[1].xover / 1000).toFixed(1)}kHz` : `${bands[1].xover}Hz`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─ SCOPE VIEW ─ */}
        {viewMode === 'scope' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ color: '#6e7681', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 700 }}>
              OSCILLOSCOPE — LOW BAND OUTPUT
            </div>
            <canvas
              ref={scopeCanvasRef}
              width={900}
              height={180}
              style={{
                width: '100%',
                flex: 1,
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'block',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              {BAND_DEFS.map((def, i) => (
                <div
                  key={def.id}
                  onClick={() => setActiveBand(i)}
                  style={{
                    flex: 1,
                    background: activeBand === i ? `${def.color}0d` : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${activeBand === i ? def.color : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '8px',
                    padding: '10px 12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: activeBand === i ? `0 0 16px ${def.glow}` : 'none',
                  }}
                >
                  <div style={{ color: def.color, fontSize: '13px', marginBottom: '4px', fontWeight: 700, letterSpacing: '0.1em' }}>
                    {def.label}
                  </div>
                  <div style={{ color: '#e6edf3', fontSize: '20px', fontWeight: 800 }}>
                    -{grLevels[i].toFixed(1)}
                  </div>
                  <div style={{ color: '#6e7681', fontSize: '11px', marginTop: '2px' }}>dB GR</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ FOOTER ══ */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '6px 16px',
          display: 'flex',
          gap: '14px',
          color: '#484f58',
          fontSize: '11px',
          flexShrink: 0,
          background: 'rgba(0,0,0,0.3)',
          letterSpacing: '0.08em',
          alignItems: 'center',
        }}
      >
        <span style={{ color: '#6e7681', fontWeight: 700 }}>3-BAND MULTIBAND COMPRESSOR</span>
        <span>•</span>
        <span style={{ color: '#ff6b6b99' }}>
          LOW XO: {bands[0].xover >= 1000 ? `${(bands[0].xover / 1000).toFixed(1)}k` : bands[0].xover}Hz
        </span>
        <span>•</span>
        <span style={{ color: '#00ffc899' }}>
          MID XO: {bands[1].xover >= 1000 ? `${(bands[1].xover / 1000).toFixed(1)}k` : bands[1].xover}Hz
        </span>
        <div style={{ flex: 1 }} />
        <span
          style={{
            color: enabled ? '#00ffc8' : '#484f58',
            fontWeight: 800,
            letterSpacing: '0.1em',
          }}
        >
          {enabled ? '● ACTIVE' : '○ BYPASSED'}
        </span>
      </div>
    </div>
  );
};

export default MultibandEffects;