// =============================================================================
// MasteringChain.js — Full Professional Mastering Suite
// =============================================================================
// Location: src/front/js/component/MasteringChain.js
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Knob } from './Knob';
import '../../styles/MasteringChain.css';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const STREAMING_TARGETS = {
  Spotify:        { lufs: -14, tp: -1.0,  label: '-14 LUFS' },
  'Apple Music':  { lufs: -16, tp: -1.0,  label: '-16 LUFS' },
  YouTube:        { lufs: -14, tp: -1.0,  label: '-14 LUFS' },
  Tidal:          { lufs: -14, tp: -1.0,  label: '-14 LUFS' },
  'Amazon Music': { lufs: -14, tp: -2.0,  label: '-14 LUFS' },
  SoundCloud:     { lufs: -8,  tp: -0.2,  label: '-8 LUFS'  },
  Podcast:        { lufs: -16, tp: -3.0,  label: '-16 LUFS' },
};

// ─────────────────────────────────────────────────────────────────────────────
// KnobCell — rotary knob + live value + label, full-width flex child
// ─────────────────────────────────────────────────────────────────────────────
const KnobCell = ({ label, value, min, max, step, fmt, color, onChange, size = 68 }) => (
  <div className="mc-knob-cell">
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
    <span className="mc-knob-value" style={{ color }}>
      {fmt(value)}
    </span>
    <span className="mc-knob-label">{label}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ToolSlot — collapsible section wrapper
// ─────────────────────────────────────────────────────────────────────────────
const ToolSlot = ({ label, icon, color, enabled, onToggle, expanded, onExpand, children }) => (
  <div
    className={`mc-slot ${enabled ? 'enabled' : ''}`}
    style={{ '--slot-color': color }}
  >
    <div className="mc-slot-header" onClick={onExpand}>
      <button
        className={`mc-bypass-btn ${enabled ? 'on' : ''}`}
        onClick={e => { e.stopPropagation(); onToggle(); }}
        title={enabled ? 'Click to bypass' : 'Click to enable'}
      />
      <span className="mc-slot-icon">{icon}</span>
      <span className="mc-slot-label">{label}</span>
      {!enabled && <span className="mc-bypassed-tag">BYPASSED</span>}
      <span className={`mc-slot-chevron ${expanded ? 'open' : ''}`}>▾</span>
    </div>

    {expanded && (
      <div className="mc-slot-body">
        {children}
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MasteringChain
// ─────────────────────────────────────────────────────────────────────────────
const MasteringChain = ({ audioContext, inputNode, outputNode, onClose, isEmbedded }) => {

  // ── Tool states ──────────────────────────────────────────────────────────
  const [hpf, setHpf] = useState({ enabled: true, freq: 30, slope: 2 });

  const [eq, setEq] = useState({
    enabled: true,
    lowShelf: 0, lowFreq: 80,
    midPeak: 0,  midFreq: 2500, midQ: 1.0,
    highShelf: 0, highFreq: 10000,
  });

  const [ms, setMs] = useState({
    enabled: false,
    midGain: 0, sideGain: 0, sideWidth: 1.0,
  });

  const [exciter, setExciter] = useState({
    enabled: false,
    amount: 20, freq: 6000, blend: 0.3,
  });

  const [widener, setWidener] = useState({ enabled: false, width: 1.0 });

  const [limiter, setLimiter] = useState({
    enabled: true,
    ceiling: -0.3, release: 50, drive: 0,
  });

  // ── Meter states ─────────────────────────────────────────────────────────
  const [lufs,         setLufs]         = useState(-20);
  const [lufsShort,    setLufsShort]    = useState(-20);
  const [truePeakVal,  setTruePeakVal]  = useState(-20);
  const [correlation,  setCorrelation]  = useState(1);
  const [spectrumData, setSpectrumData] = useState(new Array(64).fill(0));
  const [gonioData,    setGonioData]    = useState([]);
  const [clipping,     setClipping]     = useState(false);
  const [target,       setTarget]       = useState('Spotify');

  const [expanded, setExpanded] = useState({
    hpf: true, eq: true, ms: false,
    exciter: false, widener: false, limiter: true,
  });

  const [activeTab, setActiveTab] = useState('chain');

  // ── Refs ─────────────────────────────────────────────────────────────────
  const nodesRef     = useRef({});
  const analyserLRef = useRef(null);
  const analyserRRef = useRef(null);
  const analyserFFT  = useRef(null);
  const animRef      = useRef(null);
  const lufsHistory  = useRef([]);
  const lufsShortBuf = useRef([]);
  const peakHold     = useRef(-100);
  const peakTimer    = useRef(null);

  // ── Build audio graph ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!audioContext || !inputNode || !outputNode) return;
    const ctx = audioContext;
    const n   = {};

    n.hpf1 = ctx.createBiquadFilter();
    n.hpf1.type = 'highpass';
    n.hpf1.frequency.value = hpf.freq;
    n.hpf1.Q.value = 0.707;

    n.hpf2 = ctx.createBiquadFilter();
    n.hpf2.type = 'highpass';
    n.hpf2.frequency.value = hpf.freq;
    n.hpf2.Q.value = 0.707;

    n.eqLowShelf = ctx.createBiquadFilter();
    n.eqLowShelf.type = 'lowshelf';
    n.eqLowShelf.frequency.value = eq.lowFreq;
    n.eqLowShelf.gain.value = eq.lowShelf;

    n.eqMidPeak = ctx.createBiquadFilter();
    n.eqMidPeak.type = 'peaking';
    n.eqMidPeak.frequency.value = eq.midFreq;
    n.eqMidPeak.gain.value = eq.midPeak;
    n.eqMidPeak.Q.value = eq.midQ;

    n.eqHighShelf = ctx.createBiquadFilter();
    n.eqHighShelf.type = 'highshelf';
    n.eqHighShelf.frequency.value = eq.highFreq;
    n.eqHighShelf.gain.value = eq.highShelf;

    n.exciterLP    = ctx.createBiquadFilter();
    n.exciterLP.type = 'highpass';
    n.exciterLP.frequency.value = exciter.freq;

    n.exciterShape = ctx.createWaveShaper();
    n.exciterGain  = ctx.createGain();
    n.exciterGain.gain.value = (exciter.amount / 100) * 0.5;
    n.exciterMix   = ctx.createGain();
    n.exciterMix.gain.value = 1;

    const excCurve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      excCurve[i] = (3 * x / 2) * (1 - (x * x) / 3);
    }
    n.exciterShape.curve = excCurve;

    n.splitter   = ctx.createChannelSplitter(2);
    n.merger     = ctx.createChannelMerger(2);
    n.widthGainL = ctx.createGain();
    n.widthGainL.gain.value = widener.width;
    n.widthGainR = ctx.createGain();
    n.widthGainR.gain.value = widener.width;

    n.limiterDrive = ctx.createGain();
    n.limiterDrive.gain.value = Math.pow(10, limiter.drive / 20);

    n.limiterComp = ctx.createDynamicsCompressor();
    n.limiterComp.threshold.value = limiter.ceiling;
    n.limiterComp.knee.value      = 0;
    n.limiterComp.ratio.value     = 20;
    n.limiterComp.attack.value    = 0.001;
    n.limiterComp.release.value   = limiter.release / 1000;

    n.analyserL = ctx.createAnalyser();
    n.analyserL.fftSize = 256;
    n.analyserL.smoothingTimeConstant = 0.3;

    n.analyserR = ctx.createAnalyser();
    n.analyserR.fftSize = 256;
    n.analyserR.smoothingTimeConstant = 0.3;

    n.analyserFFT = ctx.createAnalyser();
    n.analyserFFT.fftSize = 2048;
    n.analyserFFT.smoothingTimeConstant = 0.7;

    analyserLRef.current = n.analyserL;
    analyserRRef.current = n.analyserR;
    analyserFFT.current  = n.analyserFFT;

    try {
      inputNode.connect(n.hpf1);
      n.hpf1.connect(n.hpf2);
      n.hpf2.connect(n.eqLowShelf);
      n.eqLowShelf.connect(n.eqMidPeak);
      n.eqMidPeak.connect(n.eqHighShelf);
      n.eqHighShelf.connect(n.exciterLP);
      n.exciterLP.connect(n.exciterShape);
      n.exciterShape.connect(n.exciterGain);
      n.exciterGain.connect(n.exciterMix);
      n.eqHighShelf.connect(n.exciterMix);
      n.exciterMix.connect(n.splitter);
      n.splitter.connect(n.widthGainL, 0);
      n.splitter.connect(n.widthGainR, 1);
      n.widthGainL.connect(n.merger, 0, 0);
      n.widthGainR.connect(n.merger, 0, 1);
      n.merger.connect(n.limiterDrive);
      n.limiterDrive.connect(n.limiterComp);
      n.limiterComp.connect(n.analyserFFT);
      n.limiterComp.connect(outputNode);
      n.limiterComp.connect(n.splitter);
      n.splitter.connect(n.analyserL, 0);
      n.splitter.connect(n.analyserR, 1);
    } catch (e) {
      console.warn('[MasteringChain] wire error', e);
    }

    nodesRef.current = n;
    return () => { Object.values(n).forEach(node => { try { node.disconnect(); } catch (_) {} }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioContext, inputNode, outputNode]);

  // ── Sync params → nodes ───────────────────────────────────────────────────
  useEffect(() => {
    const n = nodesRef.current; if (!n.hpf1) return;
    const t = audioContext?.currentTime ?? 0;
    n.hpf1?.frequency?.setTargetAtTime(hpf.freq, t, 0.02);
    n.hpf2?.frequency?.setTargetAtTime(hpf.freq, t, 0.02);
  }, [hpf, audioContext]);

  useEffect(() => {
    const n = nodesRef.current; if (!n.eqLowShelf) return;
    const t = audioContext?.currentTime ?? 0;
    n.eqLowShelf?.gain?.setTargetAtTime(eq.lowShelf,   t, 0.02);
    n.eqLowShelf?.frequency?.setTargetAtTime(eq.lowFreq,   t, 0.02);
    n.eqMidPeak?.gain?.setTargetAtTime(eq.midPeak,     t, 0.02);
    n.eqMidPeak?.frequency?.setTargetAtTime(eq.midFreq,    t, 0.02);
    n.eqMidPeak?.Q?.setTargetAtTime(eq.midQ,           t, 0.02);
    n.eqHighShelf?.gain?.setTargetAtTime(eq.highShelf, t, 0.02);
    n.eqHighShelf?.frequency?.setTargetAtTime(eq.highFreq, t, 0.02);
  }, [eq, audioContext]);

  useEffect(() => {
    const n = nodesRef.current; if (!n.exciterGain) return;
    n.exciterGain.gain.value = (exciter.enabled ? exciter.amount / 100 : 0) * exciter.blend;
    n.exciterLP?.frequency?.setTargetAtTime(exciter.freq, audioContext?.currentTime ?? 0, 0.02);
  }, [exciter, audioContext]);

  useEffect(() => {
    const n = nodesRef.current; if (!n.widthGainL) return;
    const w = widener.enabled ? widener.width : 1.0;
    n.widthGainL.gain.value = w;
    n.widthGainR.gain.value = w;
  }, [widener]);

  useEffect(() => {
    const n = nodesRef.current; if (!n.limiterComp || !n.limiterDrive) return;
    const t = audioContext?.currentTime ?? 0;
    n.limiterComp.threshold.setTargetAtTime(limiter.ceiling,              t, 0.01);
    n.limiterComp.release.setTargetAtTime(limiter.release / 1000,         t, 0.01);
    n.limiterDrive.gain.setTargetAtTime(Math.pow(10, limiter.drive / 20), t, 0.01);
  }, [limiter, audioContext]);

  // ── Metering loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      animRef.current = requestAnimationFrame(tick);
      const aL = analyserLRef.current;
      const aR = analyserRRef.current;
      const aF = analyserFFT.current;
      if (!aL || !aR) return;

      const bufL = new Float32Array(aL.fftSize);
      const bufR = new Float32Array(aR.fftSize);
      aL.getFloatTimeDomainData(bufL);
      aR.getFloatTimeDomainData(bufR);

      let sumL = 0, sumR = 0, peakL = 0, peakR = 0;
      for (let i = 0; i < bufL.length; i++) {
        sumL  += bufL[i] * bufL[i];
        sumR  += bufR[i] * bufR[i];
        peakL  = Math.max(peakL, Math.abs(bufL[i]));
        peakR  = Math.max(peakR, Math.abs(bufR[i]));
      }

      const rms       = (Math.sqrt(sumL / bufL.length) + Math.sqrt(sumR / bufR.length)) / 2;
      const momentary = rms > 0.000001 ? 20 * Math.log10(rms) - 0.7 : -100;

      lufsShortBuf.current.push(momentary);
      if (lufsShortBuf.current.length > 60) lufsShortBuf.current.shift();
      const shortSum  = lufsShortBuf.current.reduce((a, b) => a + Math.pow(10, b / 10), 0);
      const shortLUFS = lufsShortBuf.current.length
        ? 10 * Math.log10(shortSum / lufsShortBuf.current.length) : -100;

      lufsHistory.current.push(momentary);
      if (lufsHistory.current.length > 600) lufsHistory.current.shift();
      const histSum    = lufsHistory.current.reduce((a, b) => a + Math.pow(10, b / 10), 0);
      const integrated = lufsHistory.current.length
        ? 10 * Math.log10(histSum / lufsHistory.current.length) : -100;

      setLufs(isFinite(integrated) ? integrated : -100);
      setLufsShort(isFinite(shortLUFS) ? shortLUFS : -100);

      const tp = 20 * Math.log10(Math.max(peakL, peakR, 0.000001));
      if (tp > peakHold.current) {
        peakHold.current = tp;
        clearTimeout(peakTimer.current);
        peakTimer.current = setTimeout(() => { peakHold.current = -100; }, 2000);
      }
      setTruePeakVal(tp);
      setClipping(tp > -0.1);

      let corrSum = 0;
      for (let i = 0; i < Math.min(bufL.length, bufR.length); i++) corrSum += bufL[i] * bufR[i];
      const normL = Math.sqrt(sumL / bufL.length);
      const normR = Math.sqrt(sumR / bufR.length);
      const corr  = normL * normR > 0 ? corrSum / (bufL.length * normL * normR) : 1;
      setCorrelation(Math.max(-1, Math.min(1, corr)));

      if (aF) {
        const freq = new Uint8Array(aF.frequencyBinCount);
        aF.getByteFrequencyData(freq);
        const out = [];
        for (let i = 0; i < 64; i++) {
          const idx = Math.floor(Math.pow(freq.length, i / 63));
          out.push((freq[Math.min(idx, freq.length - 1)] ?? 0) / 255);
        }
        setSpectrumData(out);
      }

      const step = Math.max(1, Math.floor(bufL.length / 60));
      const pts  = [];
      for (let i = 0; i < bufL.length; i += step)
        pts.push({ x: (bufL[i] - bufR[i]) * 80, y: (bufL[i] + bufR[i]) * 80 });
      setGonioData(pts);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(animRef.current); clearTimeout(peakTimer.current); };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const lufsColor = (val) => {
    const diff = val - (STREAMING_TARGETS[target]?.lufs ?? -14);
    if (diff > 2)  return '#ff6b6b';
    if (diff > -1) return '#00ffc8';
    if (diff > -6) return '#ffd60a';
    return '#4a9eff';
  };

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));
  const tgt = STREAMING_TARGETS[target];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="mc-root">

      {/* ═══ HEADER ═══════════════════════════════════════════════════════ */}
      <div className="mc-header">
        <span className="mc-header-title">MASTERING CHAIN</span>
        <div className="mc-header-spacer" />

        <span className="mc-target-label">TARGET</span>
        <select
          className="mc-target-select"
          value={target}
          onChange={e => setTarget(e.target.value)}
        >
          {Object.keys(STREAMING_TARGETS).map(k => (
            <option key={k} value={k}>{k} ({STREAMING_TARGETS[k].label})</option>
          ))}
        </select>

        {['chain', 'meters', 'spectrum', 'gonio'].map(tab => (
          <button
            key={tab}
            className={`mc-tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}

        {onClose && (
          <button className="mc-close-btn" onClick={onClose}>✕</button>
        )}
      </div>

      {/* ═══ LUFS BAR ═════════════════════════════════════════════════════ */}
      <div className="mc-lufs-bar">
        {/* Integrated */}
        <div className="mc-lufs-group">
          <span className="mc-lufs-stat-label">INTEGRATED</span>
          <span className="mc-lufs-value" style={{ color: lufsColor(lufs) }}>
            {lufs > -99 ? lufs.toFixed(1) : '—'}
          </span>
          <span className="mc-lufs-unit">LUFS</span>
        </div>

        <div className="mc-lufs-divider" />

        {/* Short-term */}
        <div className="mc-lufs-group">
          <span className="mc-lufs-stat-label">SHORT</span>
          <span className="mc-lufs-short-value" style={{ color: lufsColor(lufsShort) }}>
            {lufsShort > -99 ? lufsShort.toFixed(1) : '—'}
          </span>
          <span className="mc-lufs-unit">LUFS</span>
        </div>

        <div className="mc-lufs-divider" />

        {/* True peak */}
        <div className="mc-lufs-group">
          <span className="mc-lufs-stat-label">PEAK</span>
          <span className="mc-peak-value" style={{ color: clipping ? '#ff2d55' : '#cdd9e5' }}>
            {truePeakVal > -99 ? truePeakVal.toFixed(1) : '—'} dBTP
          </span>
          {clipping && <span className="mc-clip-badge">CLIP</span>}
        </div>

        <div className="mc-lufs-spacer" />

        {/* Target bar */}
        <div className="mc-target-group">
          <span className="mc-lufs-stat-label">TARGET {tgt?.lufs} LUFS</span>
          <div className="mc-target-bar-wrap">
            <div
              className="mc-target-bar-fill"
              style={{
                width: `${Math.max(0, Math.min(100, ((lufs + 30) / 30) * 100))}%`,
                background: lufsColor(lufs),
              }}
            />
            <div
              className="mc-target-bar-marker"
              style={{ left: `${((tgt.lufs + 30) / 30) * 100}%` }}
            />
          </div>
        </div>

        <div className="mc-lufs-divider" />

        {/* Correlation */}
        <div className="mc-corr-group">
          <span className="mc-lufs-stat-label">CORR</span>
          <div className="mc-corr-bar-wrap">
            <div className="mc-corr-bar-center" />
            <div
              className="mc-corr-bar-needle"
              style={{
                left: `${((correlation + 1) / 2) * 100}%`,
                background: correlation > 0 ? '#00ffc8' : '#ff6b6b',
              }}
            />
          </div>
          <span
            className="mc-corr-value"
            style={{ color: correlation > 0 ? '#00ffc8' : '#ff6b6b' }}
          >
            {correlation.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ═══ MAIN AREA ════════════════════════════════════════════════════ */}
      <div className="mc-main">

        {/* ── CHAIN TAB ── */}
        {activeTab === 'chain' && (
          <div className="mc-chain-scroll">

            {/* HIGH-PASS FILTER */}
            <ToolSlot
              label="High-Pass Filter" icon="⌇" color="#4a9eff"
              enabled={hpf.enabled}
              onToggle={() => setHpf(p => ({ ...p, enabled: !p.enabled }))}
              expanded={expanded.hpf}
              onExpand={() => toggleExpand('hpf')}
            >
              <KnobCell label="Frequency" value={hpf.freq} min={20} max={300} step={1}
                color="#4a9eff" fmt={v => `${v}Hz`}
                onChange={v => setHpf(p => ({ ...p, freq: v }))} />
              <KnobCell label="Slope" value={hpf.slope} min={1} max={4} step={1}
                color="#4a9eff" fmt={v => `${v * 12}dB/oct`}
                onChange={v => setHpf(p => ({ ...p, slope: v }))} />
            </ToolSlot>

            {/* MASTERING EQ */}
            <ToolSlot
              label="Mastering EQ" icon="〰" color="#00ffc8"
              enabled={eq.enabled}
              onToggle={() => setEq(p => ({ ...p, enabled: !p.enabled }))}
              expanded={expanded.eq}
              onExpand={() => toggleExpand('eq')}
            >
              <KnobCell label="Low Shelf" value={eq.lowShelf} min={-6} max={6} step={0.1}
                color="#00ffc8" fmt={v => `${v > 0 ? '+' : ''}${v.toFixed(1)}dB`}
                onChange={v => setEq(p => ({ ...p, lowShelf: v }))} />
              <KnobCell label="Low Freq" value={eq.lowFreq} min={40} max={500} step={5}
                color="#00ffc8" fmt={v => `${v}Hz`}
                onChange={v => setEq(p => ({ ...p, lowFreq: v }))} />
              <KnobCell label="Mid Peak" value={eq.midPeak} min={-6} max={6} step={0.1}
                color="#00ffc8" fmt={v => `${v > 0 ? '+' : ''}${v.toFixed(1)}dB`}
                onChange={v => setEq(p => ({ ...p, midPeak: v }))} />
              <KnobCell label="Mid Freq" value={eq.midFreq} min={200} max={8000} step={50}
                color="#00ffc8" fmt={v => v >= 1000 ? `${(v/1000).toFixed(1)}kHz` : `${v}Hz`}
                onChange={v => setEq(p => ({ ...p, midFreq: v }))} />
              <KnobCell label="Mid Q" value={eq.midQ} min={0.3} max={4} step={0.1}
                color="#00ffc8" fmt={v => v.toFixed(1)}
                onChange={v => setEq(p => ({ ...p, midQ: v }))} />
              <KnobCell label="High Shelf" value={eq.highShelf} min={-6} max={6} step={0.1}
                color="#00ffc8" fmt={v => `${v > 0 ? '+' : ''}${v.toFixed(1)}dB`}
                onChange={v => setEq(p => ({ ...p, highShelf: v }))} />
              <KnobCell label="High Freq" value={eq.highFreq} min={4000} max={20000} step={100}
                color="#00ffc8" fmt={v => `${(v/1000).toFixed(0)}kHz`}
                onChange={v => setEq(p => ({ ...p, highFreq: v }))} />
            </ToolSlot>

            {/* MID / SIDE */}
            <ToolSlot
              label="Mid / Side" icon="◎" color="#bf5af2"
              enabled={ms.enabled}
              onToggle={() => setMs(p => ({ ...p, enabled: !p.enabled }))}
              expanded={expanded.ms}
              onExpand={() => toggleExpand('ms')}
            >
              <KnobCell label="Mid Gain" value={ms.midGain} min={-12} max={12} step={0.5}
                color="#bf5af2" fmt={v => `${v > 0 ? '+' : ''}${v}dB`}
                onChange={v => setMs(p => ({ ...p, midGain: v }))} />
              <KnobCell label="Side Gain" value={ms.sideGain} min={-12} max={12} step={0.5}
                color="#bf5af2" fmt={v => `${v > 0 ? '+' : ''}${v}dB`}
                onChange={v => setMs(p => ({ ...p, sideGain: v }))} />
              <KnobCell label="Width" value={ms.sideWidth} min={0} max={2} step={0.01}
                color="#bf5af2" fmt={v => `${Math.round(v * 100)}%`}
                onChange={v => setMs(p => ({ ...p, sideWidth: v }))} />
            </ToolSlot>

            {/* HARMONIC EXCITER */}
            <ToolSlot
              label="Harmonic Exciter" icon="✦" color="#ffd60a"
              enabled={exciter.enabled}
              onToggle={() => setExciter(p => ({ ...p, enabled: !p.enabled }))}
              expanded={expanded.exciter}
              onExpand={() => toggleExpand('exciter')}
            >
              <KnobCell label="Amount" value={exciter.amount} min={0} max={100} step={1}
                color="#ffd60a" fmt={v => `${v}%`}
                onChange={v => setExciter(p => ({ ...p, amount: v }))} />
              <KnobCell label="Freq" value={exciter.freq} min={2000} max={16000} step={100}
                color="#ffd60a" fmt={v => `${(v/1000).toFixed(1)}kHz`}
                onChange={v => setExciter(p => ({ ...p, freq: v }))} />
              <KnobCell label="Blend" value={exciter.blend} min={0} max={1} step={0.01}
                color="#ffd60a" fmt={v => `${Math.round(v * 100)}%`}
                onChange={v => setExciter(p => ({ ...p, blend: v }))} />
            </ToolSlot>

            {/* STEREO WIDENER */}
            <ToolSlot
              label="Stereo Widener" icon="⟺" color="#30d158"
              enabled={widener.enabled}
              onToggle={() => setWidener(p => ({ ...p, enabled: !p.enabled }))}
              expanded={expanded.widener}
              onExpand={() => toggleExpand('widener')}
            >
              <KnobCell label="Width" value={widener.width} min={0} max={2} step={0.01}
                color="#30d158"
                fmt={v => v === 1 ? 'Normal' : v < 1 ? `${Math.round(v*100)}% ↙` : `${Math.round(v*100)}% ↗`}
                onChange={v => setWidener(p => ({ ...p, width: v }))} />
              <div className="mc-width-presets">
                {[
                  { w: 0,   lbl: 'MONO'   },
                  { w: 0.5, lbl: 'NARROW' },
                  { w: 1,   lbl: 'NORMAL' },
                  { w: 1.5, lbl: 'WIDE'   },
                  { w: 2,   lbl: 'MAX'    },
                ].map(({ w, lbl }) => (
                  <button
                    key={w}
                    className={`mc-width-btn ${widener.width === w ? 'active' : ''}`}
                    onClick={() => setWidener(p => ({ ...p, width: w }))}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </ToolSlot>

            {/* TRUE PEAK LIMITER */}
            <ToolSlot
              label="True Peak Limiter" icon="⊟" color="#ff6b6b"
              enabled={limiter.enabled}
              onToggle={() => setLimiter(p => ({ ...p, enabled: !p.enabled }))}
              expanded={expanded.limiter}
              onExpand={() => toggleExpand('limiter')}
            >
              <div className="mc-preset-row">
                {Object.entries(STREAMING_TARGETS).map(([k, v]) => (
                  <button
                    key={k}
                    className={`mc-preset-btn ${target === k ? 'active' : ''}`}
                    style={{ '--slot-color': '#ff6b6b' }}
                    onClick={() => { setTarget(k); setLimiter(p => ({ ...p, ceiling: v.tp })); }}
                  >
                    {k.split(' ')[0]}
                  </button>
                ))}
              </div>
              <KnobCell label="Ceiling" value={limiter.ceiling} min={-6} max={0} step={0.1}
                color="#ff6b6b" fmt={v => `${v.toFixed(1)}dBTP`}
                onChange={v => setLimiter(p => ({ ...p, ceiling: v }))} />
              <KnobCell label="Release" value={limiter.release} min={1} max={500} step={1}
                color="#ff6b6b" fmt={v => `${v}ms`}
                onChange={v => setLimiter(p => ({ ...p, release: v }))} />
              <KnobCell label="Drive" value={limiter.drive} min={0} max={12} step={0.1}
                color="#ff6b6b" fmt={v => `${v.toFixed(1)}dB`}
                onChange={v => setLimiter(p => ({ ...p, drive: v }))} />
            </ToolSlot>
          </div>
        )}

        {/* ── METERS TAB ── */}
        {activeTab === 'meters' && (
          <div className="mc-meters-tab">
            <div className="mc-lufs-history-panel">
              <div className="mc-panel-label">INTEGRATED LUFS — HISTORY</div>
              <div className="mc-history-bars">
                {lufsHistory.current.slice(-120).map((v, i) => (
                  <div
                    key={i}
                    className="mc-history-bar"
                    style={{
                      height: `${Math.max(2, Math.min(100, ((v + 40) / 40) * 100))}%`,
                      background: lufsColor(v),
                      opacity: 0.7 + 0.3 * (i / 120),
                    }}
                  />
                ))}
              </div>
              <div className="mc-history-footer">
                <span className="mc-history-footer-label">-40 LUFS</span>
                <span className="mc-history-target-label">Target: {tgt.lufs} LUFS</span>
                <span className="mc-history-footer-label">0 LUFS</span>
              </div>
            </div>

            <div className="mc-platform-panel">
              <div className="mc-panel-label">PLATFORM CHECK</div>
              {Object.entries(STREAMING_TARGETS).map(([k, v]) => {
                const diff = lufs - v.lufs;
                const ok   = Math.abs(diff) < 1.5;
                const loud = diff > 1.5;
                return (
                  <div key={k} className="mc-platform-row">
                    <span className="mc-platform-status" style={{ color: ok ? '#00ffc8' : loud ? '#ff6b6b' : '#ffd60a' }}>
                      {ok ? '✓' : loud ? '↓' : '↑'}
                    </span>
                    <span className="mc-platform-name">{k}</span>
                    <span className="mc-platform-target">{v.lufs} LUFS</span>
                    <span className="mc-platform-diff" style={{ color: ok ? '#00ffc8' : '#ff6b6b' }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)} dB
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SPECTRUM TAB ── */}
        {activeTab === 'spectrum' && (
          <div className="mc-spectrum-tab">
            <div className="mc-spectrum-panel">
              <div className="mc-panel-label">SPECTRAL ANALYZER</div>
              <div className="mc-spectrum-bars">
                {spectrumData.map((v, i) => {
                  const hue = 180 - i * 2;
                  return (
                    <div
                      key={i}
                      className="mc-spectrum-bar"
                      style={{
                        height: `${Math.max(2, v * 100)}%`,
                        background: `hsl(${hue}, 90%, 55%)`,
                        boxShadow: v > 0.8 ? `0 0 6px hsl(${hue},90%,55%)` : 'none',
                      }}
                    />
                  );
                })}
              </div>
              <div className="mc-spectrum-freq-labels">
                {['20Hz','100Hz','500Hz','1kHz','5kHz','10kHz','20kHz'].map(f => (
                  <span key={f}>{f}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GONIO TAB ── */}
        {activeTab === 'gonio' && (
          <div className="mc-gonio-tab">
            <div className="mc-gonio-panel">
              <div className="mc-panel-label">GONIOMETER (STEREO PHASE)</div>
              <div className="mc-gonio-scope">
                <div className="mc-gonio-axis-h" />
                <div className="mc-gonio-axis-v" />
                <div className="mc-gonio-diag-r" />
                <div className="mc-gonio-diag-l" />

                {gonioData.slice(-120).map((pt, i) => (
                  <div
                    key={i}
                    className="mc-gonio-point"
                    style={{
                      left: `${50 + pt.x * 0.6}%`,
                      top:  `${50 - pt.y * 0.6}%`,
                      background: `rgba(0,255,200,${0.3 + 0.7 * (i / 120)})`,
                    }}
                  />
                ))}

                <span className="mc-gonio-label-top">M</span>
                <span className="mc-gonio-label-bottom">M-</span>
                <span className="mc-gonio-label-left">L</span>
                <span className="mc-gonio-label-right">R</span>
              </div>

              <div className="mc-gonio-corr">
                Correlation:{' '}
                <span style={{
                  color: correlation > 0.5 ? '#00ffc8' : correlation > 0 ? '#ffd60a' : '#ff6b6b',
                  fontWeight: 800,
                }}>
                  {correlation.toFixed(3)}
                </span>
                {correlation < 0 && (
                  <span className="mc-gonio-phase-warn">⚠ PHASE ISSUES</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MasteringChain;
