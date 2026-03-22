// =============================================================================
// DrumDesigner.js — Drum Synthesis Designer
// Location: src/front/js/component/DrumDesigner.js
// =============================================================================

import React, { useState, useRef, useCallback } from 'react';
import '../../styles/DrumDesigner.css';

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

const DRUM_DEFAULTS = {
  kick: {
    startFreq:60, endFreq:40, pitchDecay:0.06,
    bodyDecay:0.35, bodyGain:0.9,
    clickOn:true, clickGain:0.4, clickDecay:0.008,
    noiseOn:false, noiseGain:0.15, noiseDecay:0.02,
    distOn:true, distAmt:12,
    satOn:false, satAmt:0.3,
    duration:0.8, volume:0.9, punch:0.8,
  },
  '808': {
    startFreq:80, endFreq:45, pitchDecay:0.18,
    bodyDecay:1.8, bodyGain:0.85,
    clickOn:false, clickGain:0.3, clickDecay:0.006,
    noiseOn:false, noiseGain:0.05, noiseDecay:0.05,
    glide:0.12, glideFrom:180, harmonics:0.2,
    distOn:false, distAmt:8, satOn:true, satAmt:0.5,
    duration:2.5, volume:0.9, punch:1.0,
  },
  snare: {
    toneFreq:180, toneDecay:0.12, toneGain:0.5,
    noiseDecay:0.18, noiseGain:0.7, noiseFilter:3000,
    crackOn:true, crackGain:0.8, crackDecay:0.005,
    snappy:0.6, tune:0,
    reverbOn:false, reverbDecay:0.8, reverbMix:0.2,
    duration:0.5, volume:0.9,
  },
  clap: {
    bursts:3, burstSpread:0.012,
    noiseGain:0.9, noiseFilter:1500, noiseDecay:0.14,
    toneOn:false, toneFreq:900, toneGain:0.2, toneDecay:0.05,
    reverbOn:true, reverbDecay:0.6, reverbMix:0.35,
    duration:0.4, volume:0.85,
  },
  hihat: {
    brightness:7000, decay:0.06,
    open:false, metallic:0.6, tune:0,
    crispOn:true, crispGain:0.5,
    choke:true, duration:0.5, volume:0.75,
  },
  tom: {
    startFreq:140, endFreq:80, pitchDecay:0.08,
    bodyDecay:0.3, bodyGain:0.8,
    noiseGain:0.2, noiseDecay:0.06,
    duration:0.5, volume:0.85,
  },
  rim: {
    clickFreq:1200, toneFreq:400,
    decay:0.04, duration:0.12, volume:0.8,
  },
  perc: {
    startFreq:600, endFreq:200, pitchDecay:0.05,
    bodyDecay:0.25,
    noiseGain:0.3, noiseDecay:0.08,
    duration:0.5, volume:0.8,
  },
};

const DRUM_TYPES = [
  { id:'kick',  icon:'🦶', label:'KICK',   color:'#ffaa00' },
  { id:'808',   icon:'🌊', label:'808',    color:'#ff6b35' },
  { id:'snare', icon:'🥁', label:'SNARE',  color:'#5ac8fa' },
  { id:'clap',  icon:'👏', label:'CLAP',   color:'#a78bfa' },
  { id:'hihat', icon:'🔔', label:'HI-HAT', color:'#34d399' },
  { id:'tom',   icon:'🪘', label:'TOM',    color:'#00e5ff' },
  { id:'rim',   icon:'🔵', label:'RIM',    color:'#fb923c' },
  { id:'perc',  icon:'🟠', label:'PERC',   color:'#f59e0b' },
];

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function buildNoiseBuf(ctx, dur = 0.5) {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function buildReverbIR(ctx, decay) {
  const len = Math.floor(ctx.sampleRate * decay);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5);
  }
  return buf;
}

function makeDistCurve(amount, size = 44100) {
  const curve = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const x = (i * 2) / size - 1;
    curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

function synthDrum(ctx, type, params, dest) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = params.volume || 0.9;
  master.connect(dest);

  const addReverb = (src, decay, mix) => {
    const conv = ctx.createConvolver();
    conv.buffer = buildReverbIR(ctx, decay);
    const wet = ctx.createGain();
    wet.gain.value = mix;
    src.connect(conv);
    conv.connect(wet);
    wet.connect(ctx.destination);
  };

  if (type === 'kick') {
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(params.startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(params.endFreq, now + params.pitchDecay);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(params.punch, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + params.bodyDecay);
    let chain = osc;
    if (params.distOn) {
      const ws = ctx.createWaveShaper(); ws.oversample = '4x';
      ws.curve = makeDistCurve(params.distAmt);
      chain.connect(ws); chain = ws;
    }
    chain.connect(gain); gain.connect(master);
    osc.start(now); osc.stop(now + params.duration);

    if (params.clickOn) {
      const co = ctx.createOscillator(); co.type = 'square'; co.frequency.value = 3000;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(params.clickGain, now);
      cg.gain.exponentialRampToValueAtTime(0.001, now + params.clickDecay);
      const chp = ctx.createBiquadFilter(); chp.type = 'highpass'; chp.frequency.value = 800;
      co.connect(cg); cg.connect(chp); chp.connect(master);
      co.start(now); co.stop(now + params.clickDecay + 0.01);
    }
    if (params.noiseOn) {
      const nb = buildNoiseBuf(ctx, params.noiseDecay + 0.01);
      const ns = ctx.createBufferSource(); ns.buffer = nb;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(params.noiseGain, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + params.noiseDecay);
      ns.connect(ng); ng.connect(master);
      ns.start(now); ns.stop(now + params.noiseDecay + 0.01);
    }

  } else if (type === '808') {
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(params.glideFrom || params.startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(params.startFreq, now + (params.glide || 0.05));
    osc.frequency.exponentialRampToValueAtTime(params.endFreq, now + (params.glide || 0.05) + params.pitchDecay);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(params.punch || 1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + params.bodyDecay);
    if (params.harmonics > 0) {
      const ho = ctx.createOscillator(); ho.type = 'sawtooth';
      ho.frequency.setValueAtTime((params.glideFrom || params.startFreq) * 2, now);
      ho.frequency.exponentialRampToValueAtTime(params.startFreq * 2, now + (params.glide || 0.05));
      ho.frequency.exponentialRampToValueAtTime(params.endFreq * 2, now + (params.glide || 0.05) + params.pitchDecay);
      const hg = ctx.createGain(); hg.gain.value = params.harmonics * 0.3;
      ho.connect(hg); hg.connect(gain);
      ho.start(now); ho.stop(now + params.duration);
    }
    let chain = osc;
    if (params.satOn) {
      const ws = ctx.createWaveShaper(); ws.oversample = '4x';
      const curve = new Float32Array(44100);
      for (let i = 0; i < 44100; i++) {
        const x = (i * 2) / 44100 - 1;
        curve[i] = Math.tanh(x * (1 + params.satAmt * 5));
      }
      ws.curve = curve;
      chain.connect(ws); chain = ws;
    }
    chain.connect(gain); gain.connect(master);
    osc.start(now); osc.stop(now + params.duration);

  } else if (type === 'snare') {
    const osc = ctx.createOscillator(); osc.type = 'triangle';
    osc.frequency.value = params.toneFreq * Math.pow(2, (params.tune || 0) / 12);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(params.toneGain, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + params.toneDecay);
    osc.connect(tg); tg.connect(master);
    osc.start(now); osc.stop(now + params.toneDecay + 0.01);

    const nb = buildNoiseBuf(ctx, params.noiseDecay + 0.05);
    const ns = ctx.createBufferSource(); ns.buffer = nb;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(params.noiseGain, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + params.noiseDecay * params.snappy);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = params.noiseFilter;
    ns.connect(ng); ng.connect(hp); hp.connect(master);
    ns.start(now); ns.stop(now + params.noiseDecay + 0.05);

    if (params.crackOn) {
      const co = ctx.createOscillator(); co.type = 'square'; co.frequency.value = 800;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(params.crackGain, now);
      cg.gain.exponentialRampToValueAtTime(0.001, now + params.crackDecay);
      const chp = ctx.createBiquadFilter(); chp.type = 'highpass'; chp.frequency.value = 2000;
      co.connect(cg); cg.connect(chp); chp.connect(master);
      co.start(now); co.stop(now + params.crackDecay + 0.01);
    }
    if (params.reverbOn) addReverb(master, params.reverbDecay, params.reverbMix);

  } else if (type === 'clap') {
    for (let b = 0; b < params.bursts; b++) {
      const t = now + b * (params.burstSpread || 0.012);
      const nb = buildNoiseBuf(ctx, 0.06);
      const ns = ctx.createBufferSource(); ns.buffer = nb;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(params.noiseGain, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + params.noiseDecay / params.bursts);
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = params.noiseFilter;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 0.5;
      ns.connect(ng); ng.connect(hp); hp.connect(bp); bp.connect(master);
      ns.start(t); ns.stop(t + params.noiseDecay + 0.01);
    }
    if (params.reverbOn) addReverb(master, params.reverbDecay, params.reverbMix);

  } else if (type === 'hihat') {
    const ratios = [1, 1.483, 1.932, 2.546, 3.14, 4.07];
    const baseFreq = 40 + (params.tune || 0) * 10;
    ratios.forEach(r => {
      const o = ctx.createOscillator(); o.type = 'square';
      o.frequency.value = baseFreq * r;
      const og = ctx.createGain(); og.gain.value = 0.12;
      o.connect(og); og.connect(master);
      o.start(now); o.stop(now + params.decay + 0.05);
    });
    const nb = buildNoiseBuf(ctx, params.decay + 0.05);
    const ns = ctx.createBufferSource(); ns.buffer = nb;
    const nhp = ctx.createBiquadFilter(); nhp.type = 'highpass'; nhp.frequency.value = params.brightness;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.6, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + params.decay);
    ns.connect(nhp); nhp.connect(ng); ng.connect(ctx.destination);
    ns.start(now); ns.stop(now + params.decay + 0.05);

  } else if (type === 'tom') {
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(params.startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(params.endFreq, now + params.pitchDecay);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(params.bodyGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + params.bodyDecay);
    osc.connect(gain); gain.connect(master);
    osc.start(now); osc.stop(now + params.duration);
    const nb = buildNoiseBuf(ctx, params.noiseDecay + 0.01);
    const ns = ctx.createBufferSource(); ns.buffer = nb;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(params.noiseGain, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + params.noiseDecay);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 200;
    ns.connect(ng); ng.connect(hp); hp.connect(master);
    ns.start(now); ns.stop(now + params.noiseDecay + 0.01);

  } else if (type === 'rim') {
    const o1 = ctx.createOscillator(); o1.type = 'square'; o1.frequency.value = params.clickFreq;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = params.toneFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(params.volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + params.decay);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 600;
    o1.connect(g); o2.connect(g); g.connect(hp); hp.connect(master);
    o1.start(now); o2.start(now); o1.stop(now + params.duration); o2.stop(now + params.duration);

  } else if (type === 'perc') {
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(params.startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(params.endFreq, now + params.pitchDecay);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(params.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + params.bodyDecay);
    osc.connect(gain); gain.connect(master);
    osc.start(now); osc.stop(now + params.duration);
    if (params.noiseGain > 0) {
      const nb = buildNoiseBuf(ctx, params.noiseDecay + 0.01);
      const ns = ctx.createBufferSource(); ns.buffer = nb;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(params.noiseGain, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + params.noiseDecay);
      ns.connect(ng); ng.connect(master);
      ns.start(now); ns.stop(now + params.noiseDecay + 0.01);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// KNOB COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const Knob = ({ value, min, max, step = 0.01, onChange, label, unit = '', size = 52, color = '#ffaa00', log = false }) => {
  const drag = useRef(false), sy = useRef(0), sv = useRef(0);
  const toN = v => log
    ? Math.log(Math.max(v, 1e-4) / Math.max(min, 1e-4)) / Math.log(Math.max(max, 1e-4) / Math.max(min, 1e-4))
    : (v - min) / (max - min);
  const frN = n => log ? min * Math.pow(max / min, n) : min + n * (max - min);
  const angle = -135 + toN(value) * 270;

  const onMD = e => {
    e.preventDefault();
    drag.current = true; sy.current = e.clientY; sv.current = value;
    const mv = me => {
      if (!drag.current) return;
      let nn = Math.max(0, Math.min(1, toN(sv.current) + (sy.current - me.clientY) / 130));
      let nv = frN(nn);
      if (step) nv = Math.round(nv / step) * step;
      onChange(Math.max(min, Math.min(max, nv)));
    };
    const up = () => { drag.current = false; window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  };
  const onDbl = e => { e.preventDefault(); onChange(log ? Math.sqrt(min * max) : (min + max) / 2); };

  const disp = () => {
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
    if (step < 0.1) return value.toFixed(2);
    if (step < 1) return value.toFixed(1);
    return Math.round(value);
  };

  const r = size / 2 - 5, cx = size / 2, cy = size / 2;
  const rad = d => (d - 90) * Math.PI / 180;
  const ap = (a1, a2) => {
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const lg = (a2 - a1 + Math.PI * 2) % (Math.PI * 2) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2}`;
  };
  const dR = rad(angle);
  const uid = `dkg${label}${size}`.replace(/\s/g, '');

  return (
    <div className="dd-knob-wrap">
      <svg width={size} height={size} onMouseDown={onMD} onDoubleClick={onDbl} className="dd-knob-svg">
        <defs>
          <radialGradient id={uid} cx="38%" cy="32%">
            <stop offset="0%" stopColor="#1e3555" />
            <stop offset="100%" stopColor="#070f1c" />
          </radialGradient>
        </defs>
        <path d={ap(rad(-135), rad(135))} fill="none" stroke="#07101c" strokeWidth="4.5" strokeLinecap="round" />
        <path d={ap(rad(-135), rad(angle))} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}99)` }} />
        <circle cx={cx} cy={cy} r={size / 2 - 11} fill={`url(#${uid})`} stroke="#1a2d45" strokeWidth="1.5" />
        <circle cx={cx + (r - 5) * Math.cos(dR)} cy={cy + (r - 5) * Math.sin(dR)} r="2.5" fill={color}
          style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
      </svg>
      <div className="dd-knob-label">{label}</div>
      <div className="dd-knob-value" style={{ color }}>{disp()}{unit}</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const Toggle = ({ value, onChange, label, color = '#00e5ff' }) => (
  <button
    className={`dd-toggle ${value ? 'active' : ''}`}
    style={{ '--toggle-color': color }}
    onClick={() => onChange(!value)}
  >
    <span className="dd-led" />
    {label}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const DrumDesigner = ({ onClose, onAssignToPad, onAssignToTrack }) => {
  const [drumType, setDrumType] = useState('kick');
  const [params, setParams] = useState(() => {
    const p = {};
    DRUM_TYPES.forEach(({ id }) => { p[id] = { ...DRUM_DEFAULTS[id] }; });
    return p;
  });
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState('');
  const [clipboard, setClipboard] = useState(null);
  const ctxRef = useRef(null);

  const dt = DRUM_TYPES.find(d => d.id === drumType);
  const drumColor = dt?.color || '#ffaa00';

  const getCtx = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  };

  const set = (key, val) => setParams(p => ({ ...p, [drumType]: { ...p[drumType], [key]: val } }));
  const p = params[drumType];

  const toast = m => { setStatus(m); setTimeout(() => setStatus(''), 2000); };

  const playDrum = useCallback(() => {
    const ctx = getCtx();
    setPlaying(true);
    synthDrum(ctx, drumType, params[drumType], ctx.destination);
    setTimeout(() => setPlaying(false), 200);
  }, [drumType, params]);

  const randomize = () => {
    const base = DRUM_DEFAULTS[drumType];
    const rand = {};
    Object.keys(base).forEach(k => {
      const v = base[k];
      if (typeof v === 'boolean') rand[k] = Math.random() > 0.5;
      else if (typeof v === 'number') {
        const spread = Math.abs(v) * 0.4 || 0.1;
        rand[k] = Math.max(0, v + (Math.random() * spread * 2 - spread));
      } else rand[k] = v;
    });
    setParams(p => ({ ...p, [drumType]: rand }));
    toast('🎲 Randomized!');
  };

  const exportWAV = async () => {
    setExporting(true);
    try {
      const dur = (p.duration || 0.5) + 0.3;
      const offCtx = new OfflineAudioContext(2, Math.ceil(44100 * dur), 44100);
      synthDrum(offCtx, drumType, p, offCtx.destination);
      const rendered = await offCtx.startRendering();
      const nc = rendered.numberOfChannels, sr = rendered.sampleRate, len = rendered.length * nc * 2;
      const buf = new ArrayBuffer(44 + len);
      const view = new DataView(buf);
      const ws = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
      ws(0, 'RIFF'); view.setUint32(4, 36 + len, true); ws(8, 'WAVE');
      ws(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
      view.setUint16(22, nc, true); view.setUint32(24, sr, true);
      view.setUint32(28, sr * nc * 2, true); view.setUint16(32, nc * 2, true);
      view.setUint16(34, 16, true); ws(36, 'data'); view.setUint32(40, len, true);
      let off = 44;
      for (let i = 0; i < rendered.length; i++) {
        for (let ch = 0; ch < nc; ch++) {
          const s = Math.max(-1, Math.min(1, rendered.getChannelData(ch)[i]));
          view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2;
        }
      }
      const blob = new Blob([buf], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${drumType}_${Date.now()}.wav`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast('✓ WAV exported');
      if (onAssignToTrack) {
        const ctx = getCtx();
        const ab = await blob.arrayBuffer();
        return await ctx.decodeAudioData(ab);
      }
    } catch (e) { console.error(e); toast('✗ Export failed'); }
    setExporting(false);
    return null;
  };

  // ─── PARAM PANELS ───
  const renderParams = () => {
    if (drumType === 'kick') return (
      <div className="dd-params-grid">
        <Knob value={p.startFreq} min={40} max={400} step={1} onChange={v => set('startFreq', v)} label="START F" unit="Hz" color={drumColor} />
        <Knob value={p.endFreq} min={20} max={200} step={1} onChange={v => set('endFreq', v)} label="END F" unit="Hz" color={drumColor} />
        <Knob value={p.pitchDecay} min={0.01} max={0.5} step={0.005} log onChange={v => set('pitchDecay', v)} label="PITCH DEC" unit="s" color={drumColor} />
        <Knob value={p.bodyDecay} min={0.05} max={2} step={0.01} log onChange={v => set('bodyDecay', v)} label="BODY DEC" unit="s" color={drumColor} />
        <Knob value={p.punch} min={0} max={2} step={0.01} onChange={v => set('punch', v)} label="PUNCH" color={drumColor} />
        <Knob value={p.volume} min={0} max={1} step={0.01} onChange={v => set('volume', v)} label="VOLUME" color={drumColor} />
        <div className="dd-section" style={{ width: '100%' }}>
          <div className="dd-section-title">LAYERS</div>
          <div className="dd-toggle-row">
            <Toggle value={p.clickOn} onChange={v => set('clickOn', v)} label="CLICK" color={drumColor} />
            {p.clickOn && <>
              <Knob value={p.clickGain} min={0} max={1} step={0.01} onChange={v => set('clickGain', v)} label="Click Vol" size={46} color={drumColor} />
              <Knob value={p.clickDecay} min={0.001} max={0.05} step={0.001} log onChange={v => set('clickDecay', v)} label="Click Dec" size={46} unit="s" color={drumColor} />
            </>}
          </div>
          <div className="dd-toggle-row">
            <Toggle value={p.noiseOn} onChange={v => set('noiseOn', v)} label="NOISE" color={drumColor} />
            {p.noiseOn && <Knob value={p.noiseGain} min={0} max={1} step={0.01} onChange={v => set('noiseGain', v)} label="Noise Vol" size={46} color={drumColor} />}
          </div>
          <div className="dd-toggle-row">
            <Toggle value={p.distOn} onChange={v => set('distOn', v)} label="DISTORT" color="#f97316" />
            {p.distOn && <Knob value={p.distAmt} min={0} max={100} step={1} onChange={v => set('distAmt', v)} label="Drive" size={46} color="#f97316" />}
          </div>
        </div>
      </div>
    );

    if (drumType === '808') return (
      <div className="dd-params-grid">
        <Knob value={p.glideFrom} min={50} max={600} step={1} onChange={v => set('glideFrom', v)} label="GLIDE FROM" unit="Hz" color={drumColor} />
        <Knob value={p.startFreq} min={30} max={200} step={1} onChange={v => set('startFreq', v)} label="NOTE FREQ" unit="Hz" color={drumColor} />
        <Knob value={p.endFreq} min={20} max={150} step={1} onChange={v => set('endFreq', v)} label="END FREQ" unit="Hz" color={drumColor} />
        <Knob value={p.glide} min={0} max={0.5} step={0.005} onChange={v => set('glide', v)} label="GLIDE" unit="s" color={drumColor} />
        <Knob value={p.pitchDecay} min={0.01} max={1} step={0.01} log onChange={v => set('pitchDecay', v)} label="PITCH DEC" unit="s" color={drumColor} />
        <Knob value={p.bodyDecay} min={0.1} max={5} step={0.05} log onChange={v => set('bodyDecay', v)} label="TAIL" unit="s" color={drumColor} />
        <Knob value={p.harmonics} min={0} max={1} step={0.01} onChange={v => set('harmonics', v)} label="HARMONICS" color={drumColor} />
        <Knob value={p.volume} min={0} max={1} step={0.01} onChange={v => set('volume', v)} label="VOLUME" color={drumColor} />
        <div className="dd-section" style={{ width: '100%' }}>
          <div className="dd-toggle-row">
            <Toggle value={p.satOn} onChange={v => set('satOn', v)} label="SATURATION" color="#f97316" />
            {p.satOn && <Knob value={p.satAmt} min={0} max={1} step={0.01} onChange={v => set('satAmt', v)} label="Sat Amt" size={46} color="#f97316" />}
          </div>
        </div>
      </div>
    );

    if (drumType === 'snare') return (
      <div className="dd-params-grid">
        <Knob value={p.toneFreq} min={80} max={600} step={1} onChange={v => set('toneFreq', v)} label="TONE FREQ" unit="Hz" color={drumColor} />
        <Knob value={p.toneDecay} min={0.01} max={0.5} step={0.005} log onChange={v => set('toneDecay', v)} label="TONE DEC" unit="s" color={drumColor} />
        <Knob value={p.toneGain} min={0} max={1} step={0.01} onChange={v => set('toneGain', v)} label="TONE BODY" color={drumColor} />
        <Knob value={p.noiseGain} min={0} max={1} step={0.01} onChange={v => set('noiseGain', v)} label="NOISE" color={drumColor} />
        <Knob value={p.noiseDecay} min={0.01} max={0.5} step={0.005} log onChange={v => set('noiseDecay', v)} label="NOISE DEC" unit="s" color={drumColor} />
        <Knob value={p.snappy} min={0.1} max={1} step={0.01} onChange={v => set('snappy', v)} label="SNAPPY" color={drumColor} />
        <Knob value={p.noiseFilter} min={500} max={8000} step={100} log onChange={v => set('noiseFilter', v)} label="HP CUTOFF" unit="Hz" color={drumColor} />
        <Knob value={p.tune} min={-12} max={12} step={1} onChange={v => set('tune', v)} label="TUNE" unit="st" color={drumColor} />
        <Knob value={p.volume} min={0} max={1} step={0.01} onChange={v => set('volume', v)} label="VOLUME" color={drumColor} />
        <div className="dd-section" style={{ width: '100%' }}>
          <div className="dd-toggle-row">
            <Toggle value={p.crackOn} onChange={v => set('crackOn', v)} label="CRACK" color={drumColor} />
            {p.crackOn && <Knob value={p.crackGain} min={0} max={1} step={0.01} onChange={v => set('crackGain', v)} label="Crack Vol" size={46} color={drumColor} />}
          </div>
          <div className="dd-toggle-row">
            <Toggle value={p.reverbOn} onChange={v => set('reverbOn', v)} label="REVERB" color="#a78bfa" />
            {p.reverbOn && <>
              <Knob value={p.reverbMix} min={0} max={1} step={0.01} onChange={v => set('reverbMix', v)} label="Verb Mix" size={46} color="#a78bfa" />
              <Knob value={p.reverbDecay} min={0.1} max={3} step={0.1} onChange={v => set('reverbDecay', v)} label="Verb Dec" size={46} unit="s" color="#a78bfa" />
            </>}
          </div>
        </div>
      </div>
    );

    if (drumType === 'clap') return (
      <div className="dd-params-grid">
        <Knob value={p.bursts} min={1} max={6} step={1} onChange={v => set('bursts', v)} label="BURSTS" color={drumColor} />
        <Knob value={p.burstSpread} min={0.002} max={0.05} step={0.001} onChange={v => set('burstSpread', v)} label="SPREAD" unit="s" color={drumColor} />
        <Knob value={p.noiseGain} min={0} max={1} step={0.01} onChange={v => set('noiseGain', v)} label="LEVEL" color={drumColor} />
        <Knob value={p.noiseDecay} min={0.02} max={0.5} step={0.005} log onChange={v => set('noiseDecay', v)} label="DECAY" unit="s" color={drumColor} />
        <Knob value={p.noiseFilter} min={200} max={4000} step={50} log onChange={v => set('noiseFilter', v)} label="HP CUT" unit="Hz" color={drumColor} />
        <Knob value={p.volume} min={0} max={1} step={0.01} onChange={v => set('volume', v)} label="VOLUME" color={drumColor} />
        <div className="dd-section" style={{ width: '100%' }}>
          <div className="dd-toggle-row">
            <Toggle value={p.reverbOn} onChange={v => set('reverbOn', v)} label="REVERB" color="#a78bfa" />
            {p.reverbOn && <>
              <Knob value={p.reverbMix} min={0} max={1} step={0.01} onChange={v => set('reverbMix', v)} label="Verb Mix" size={46} color="#a78bfa" />
              <Knob value={p.reverbDecay} min={0.1} max={3} step={0.1} onChange={v => set('reverbDecay', v)} label="Verb Dec" size={46} unit="s" color="#a78bfa" />
            </>}
          </div>
        </div>
      </div>
    );

    if (drumType === 'hihat') return (
      <div className="dd-params-grid">
        <Knob value={p.brightness} min={2000} max={18000} step={100} log onChange={v => set('brightness', v)} label="BRIGHTNESS" unit="Hz" color={drumColor} />
        <Knob value={p.decay} min={0.005} max={2} step={0.005} log onChange={v => set('decay', v)} label="DECAY" unit="s" color={drumColor} />
        <Knob value={p.metallic} min={0} max={1} step={0.01} onChange={v => set('metallic', v)} label="METALLIC" color={drumColor} />
        <Knob value={p.tune} min={-6} max={6} step={1} onChange={v => set('tune', v)} label="TUNE" unit="st" color={drumColor} />
        <Knob value={p.volume} min={0} max={1} step={0.01} onChange={v => set('volume', v)} label="VOLUME" color={drumColor} />
      </div>
    );

    if (drumType === 'tom') return (
      <div className="dd-params-grid">
        <Knob value={p.startFreq} min={40} max={400} step={1} onChange={v => set('startFreq', v)} label="START FREQ" unit="Hz" color={drumColor} />
        <Knob value={p.endFreq} min={20} max={200} step={1} onChange={v => set('endFreq', v)} label="END FREQ" unit="Hz" color={drumColor} />
        <Knob value={p.pitchDecay} min={0.01} max={0.3} step={0.005} onChange={v => set('pitchDecay', v)} label="PITCH DEC" unit="s" color={drumColor} />
        <Knob value={p.bodyDecay} min={0.05} max={1.5} step={0.01} log onChange={v => set('bodyDecay', v)} label="BODY DEC" unit="s" color={drumColor} />
        <Knob value={p.bodyGain} min={0} max={1} step={0.01} onChange={v => set('bodyGain', v)} label="BODY" color={drumColor} />
        <Knob value={p.noiseGain} min={0} max={1} step={0.01} onChange={v => set('noiseGain', v)} label="NOISE" color={drumColor} />
        <Knob value={p.volume} min={0} max={1} step={0.01} onChange={v => set('volume', v)} label="VOLUME" color={drumColor} />
      </div>
    );

    if (drumType === 'rim') return (
      <div className="dd-params-grid">
        <Knob value={p.clickFreq} min={400} max={4000} step={10} log onChange={v => set('clickFreq', v)} label="CLICK FREQ" unit="Hz" color={drumColor} />
        <Knob value={p.toneFreq} min={100} max={1200} step={10} log onChange={v => set('toneFreq', v)} label="TONE FREQ" unit="Hz" color={drumColor} />
        <Knob value={p.decay} min={0.01} max={0.2} step={0.005} onChange={v => set('decay', v)} label="DECAY" unit="s" color={drumColor} />
        <Knob value={p.volume} min={0} max={1} step={0.01} onChange={v => set('volume', v)} label="VOLUME" color={drumColor} />
      </div>
    );

    if (drumType === 'perc') return (
      <div className="dd-params-grid">
        <Knob value={p.startFreq} min={100} max={2000} step={10} log onChange={v => set('startFreq', v)} label="START FREQ" unit="Hz" color={drumColor} />
        <Knob value={p.endFreq} min={40} max={1000} step={10} log onChange={v => set('endFreq', v)} label="END FREQ" unit="Hz" color={drumColor} />
        <Knob value={p.pitchDecay} min={0.005} max={0.3} step={0.005} onChange={v => set('pitchDecay', v)} label="PITCH DEC" unit="s" color={drumColor} />
        <Knob value={p.bodyDecay} min={0.02} max={2} step={0.01} log onChange={v => set('bodyDecay', v)} label="BODY DEC" unit="s" color={drumColor} />
        <Knob value={p.noiseGain} min={0} max={1} step={0.01} onChange={v => set('noiseGain', v)} label="NOISE" color={drumColor} />
        <Knob value={p.noiseDecay} min={0.01} max={0.5} step={0.01} onChange={v => set('noiseDecay', v)} label="NOISE DEC" unit="s" color={drumColor} />
        <Knob value={p.volume} min={0} max={1} step={0.01} onChange={v => set('volume', v)} label="VOLUME" color={drumColor} />
      </div>
    );

    return null;
  };

  return (
    <div className="dd-root">
      {/* HEADER */}
      <div className="dd-header">
        <div className="dd-brand">
          <span className="dd-brand-icon">🥁</span>
          <span className="dd-title">DRUM<span className="dd-title-accent">DESIGNER</span></span>
        </div>
        <div className="dd-header-right">
          {status && <span className="dd-status">{status}</span>}
          <button className="dd-btn dd-btn-play" onClick={playDrum} disabled={playing}>
            {playing ? '🔊' : '▶ PLAY'}
          </button>
          <button className="dd-btn" onClick={randomize} title="Randomize">🎲 RAND</button>
          <button className="dd-btn" onClick={() => { setClipboard({ ...params[drumType] }); toast('✓ Copied'); }}>⎘ COPY</button>
          {clipboard && <button className="dd-btn" onClick={() => { setParams(p => ({ ...p, [drumType]: { ...clipboard } })); toast('✓ Pasted'); }}>⎙ PASTE</button>}
          <button className="dd-btn dd-btn-export" onClick={exportWAV} disabled={exporting}>
            {exporting ? '⏳' : '⬇ WAV'}
          </button>
          {onAssignToPad && (
            <button className="dd-btn dd-btn-pad" onClick={async () => {
              const buf = await exportWAV();
              onAssignToPad({ type: drumType, params: p, audioBuffer: buf });
            }}>🎛 → PAD</button>
          )}
          {onClose && <button className="dd-btn dd-btn-close" onClick={onClose}>✕</button>}
        </div>
      </div>

      {/* DRUM TYPE SELECTOR */}
      <div className="dd-type-selector">
        {DRUM_TYPES.map(dt => (
          <button key={dt.id}
            className={`dd-type-btn ${drumType === dt.id ? 'active' : ''}`}
            style={{ '--drum-color': dt.color }}
            onClick={() => setDrumType(dt.id)}
          >
            <span className="dd-type-icon">{dt.icon}</span>
            <span className="dd-type-label">{dt.label}</span>
          </button>
        ))}
      </div>

      {/* PARAMS */}
      <div className="dd-params-container">
        <div className="dd-params-title" style={{ color: drumColor }}>
          {dt?.icon} {dt?.label} PARAMETERS
          <span style={{ marginLeft: 'auto', fontSize: '0.45rem', color: '#2a4060', letterSpacing: '0.08em' }}>
            DBL-CLICK KNOB TO RESET
          </span>
        </div>
        {renderParams()}
      </div>

      {/* FOOTER */}
      <div className="dd-footer">
        <button className="dd-btn dd-btn-reset"
          onClick={() => setParams(p => ({ ...p, [drumType]: { ...DRUM_DEFAULTS[drumType] } }))}>
          ↺ RESET {drumType.toUpperCase()}
        </button>
        <button className="dd-btn dd-btn-reset"
          onClick={() => {
            const fresh = {};
            DRUM_TYPES.forEach(({ id }) => { fresh[id] = { ...DRUM_DEFAULTS[id] }; });
            setParams(fresh);
            toast('All drums reset');
          }}>
          ↺ RESET ALL
        </button>
      </div>
    </div>
  );
};

export default DrumDesigner;