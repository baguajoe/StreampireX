// =============================================================================
// DrumDesigner.js — Drum Synthesis Designer
// =============================================================================
// Location: src/front/js/component/DrumDesigner.js
//
// DRUM TYPES:
//   Kick    — sine pitch drop, click layer, noise burst, distortion, tail
//   808     — sine/sub, glide pitch, saturation, harmonics, long tail
//   Snare   — noise burst, tone body, transient crack, HP filter, reverb tail
//   Clap    — noise multi-burst, HP filter, reverb
//   Hi-Hat  — metallic noise, HP filter, fast envelope (closed/open)
//   Tom     — tone + noise, mid-range pitch, decay
//   Rim     — short click + tone
//   Perc    — flexible tone + noise + envelope
//
// Each drum type has dedicated synthesis parameters.
// Full WAV export. Assign to Beat Maker pad.
// Dark StreamPireX theme.
// =============================================================================

import React, { useState, useRef, useCallback } from 'react';
import '../../styles/DrumDesigner.css';

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULTS PER DRUM TYPE
// ─────────────────────────────────────────────────────────────────────────────

const DRUM_DEFAULTS = {
  kick: {
    // Tone oscillator (pitch drop)
    startFreq: 120,
    endFreq: 42,
    pitchDecay: 0.06,
    // Body
    bodyDecay: 0.35,
    bodyGain: 0.9,
    // Click layer
    clickOn: true,
    clickGain: 0.4,
    clickDecay: 0.008,
    // Noise burst
    noiseOn: false,
    noiseGain: 0.15,
    noiseDecay: 0.02,
    // Distortion
    distOn: true,
    distAmt: 12,
    // Saturation
    satOn: false,
    satAmt: 0.3,
    // Overall
    duration: 0.8,
    volume: 0.9,
    punch: 0.8,     // transient snap (peak gain before decay)
  },
  '808': {
    startFreq: 80,
    endFreq: 45,
    pitchDecay: 0.18,
    bodyDecay: 1.8,
    bodyGain: 0.85,
    clickOn: false,
    clickGain: 0.3,
    clickDecay: 0.006,
    noiseOn: false,
    noiseGain: 0.05,
    noiseDecay: 0.05,
    glide: 0.12,        // 808-style glide time
    glideFrom: 180,     // glide start freq
    harmonics: 0.2,     // sawtooth harmonic layer
    distOn: false,
    distAmt: 8,
    satOn: true,
    satAmt: 0.5,
    duration: 2.5,
    volume: 0.9,
    punch: 1.0,
  },
  snare: {
    // Tone body
    toneFreq: 180,
    toneDecay: 0.12,
    toneGain: 0.5,
    // Noise
    noiseDecay: 0.18,
    noiseGain: 0.7,
    noiseFilter: 3000,   // HP filter cutoff
    // Transient crack
    crackOn: true,
    crackGain: 0.8,
    crackDecay: 0.005,
    // Snappy (noise transient sharpness)
    snappy: 0.6,
    // Tune
    tune: 0,
    // Reverb tail
    reverbOn: false,
    reverbDecay: 0.8,
    reverbMix: 0.2,
    // Overall
    duration: 0.5,
    volume: 0.9,
  },
  clap: {
    // Multi-burst envelope
    bursts: 3,
    burstSpread: 0.012,
    // Noise
    noiseGain: 0.9,
    noiseFilter: 1500,
    noiseDecay: 0.14,
    // Tone body (subtle)
    toneOn: false,
    toneFreq: 900,
    toneGain: 0.2,
    toneDecay: 0.05,
    // Reverb
    reverbOn: true,
    reverbDecay: 0.6,
    reverbMix: 0.35,
    // Overall
    duration: 0.4,
    volume: 0.85,
  },
  hihat: {
    // Metallic noise (sum of detuned squares → very bright)
    brightness: 7000,   // HP filter cutoff
    decay: 0.06,        // closed = short, open = long
    open: false,        // closed vs open
    metallic: 0.6,      // mix of bandpass resonance (more = more ring)
    tune: 0,
    // Accent noise
    crispOn: true,
    crispGain: 0.5,
    // Choke: open hats choke closed
    choke: true,
    duration: 0.5,
    volume: 0.75,
  },
  tom: {
    startFreq: 140,
    endFreq: 80,
    pitchDecay: 0.08,
    bodyDecay: 0.3,
    bodyGain: 0.8,
    noiseGain: 0.2,
    noiseDecay: 0.06,
    duration: 0.5,
    volume: 0.85,
  },
  rim: {
    clickFreq: 1200,
    toneFreq: 400,
    decay: 0.04,
    duration: 0.12,
    volume: 0.8,
  },
  perc: {
    startFreq: 600,
    endFreq: 200,
    pitchDecay: 0.05,
    bodyDecay: 0.25,
    noiseGain: 0.3,
    noiseDecay: 0.08,
    duration: 0.5,
    volume: 0.8,
  },
};

const DRUM_TYPES = [
  { id: 'kick',   icon: '🦶', label: 'KICK' },
  { id: '808',    icon: '🌊', label: '808' },
  { id: 'snare',  icon: '🥁', label: 'SNARE' },
  { id: 'clap',   icon: '👏', label: 'CLAP' },
  { id: 'hihat',  icon: '🔔', label: 'HI-HAT' },
  { id: 'tom',    icon: '🪘', label: 'TOM' },
  { id: 'rim',    icon: '🔵', label: 'RIM' },
  { id: 'perc',   icon: '🟠', label: 'PERC' },
];

// ─────────────────────────────────────────────────────────────────────────────
// SYNTHESIS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

function buildNoiseBuf(ctx, dur = 0.5, type = 'white') {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function synthDrum(ctx, type, params, dest) {
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.value = params.volume || 0.9;
  masterGain.connect(dest);

  if (type === 'kick') {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(params.startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(params.endFreq, now + params.pitchDecay);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(params.punch, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + params.bodyDecay);

    let chain = osc;

    if (params.distOn) {
      const ws = ctx.createWaveShaper(); ws.oversample = '4x';
      const a = params.distAmt;
      const curve = new Float32Array(44100);
      for (let i = 0; i < 44100; i++) {
        const x = (i * 2) / 44100 - 1;
        curve[i] = ((3 + a) * x * 20 * (Math.PI / 180)) / (Math.PI + a * Math.abs(x));
      }
      ws.curve = curve;
      chain.connect(ws); chain = ws;
    }

    chain.connect(gain); gain.connect(masterGain);
    osc.start(now); osc.stop(now + params.duration);

    if (params.clickOn) {
      const click = ctx.createOscillator(); click.type = 'square';
      click.frequency.value = 3000;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(params.clickGain, now);
      cg.gain.exponentialRampToValueAtTime(0.001, now + params.clickDecay);
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 800;
      click.connect(cg); cg.connect(hp); hp.connect(masterGain);
      click.start(now); click.stop(now + params.clickDecay + 0.01);
    }

    if (params.noiseOn) {
      const nb = buildNoiseBuf(ctx, params.noiseDecay + 0.01);
      const ns = ctx.createBufferSource(); ns.buffer = nb;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(params.noiseGain, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + params.noiseDecay);
      ns.connect(ng); ng.connect(masterGain);
      ns.start(now); ns.stop(now + params.noiseDecay + 0.01);
    }

  } else if (type === '808') {
    // Sub sine with glide
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(params.glideFrom || params.startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(params.startFreq, now + (params.glide || 0.05));
    osc.frequency.exponentialRampToValueAtTime(params.endFreq, now + (params.glide || 0.05) + params.pitchDecay);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(params.punch || 1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + params.bodyDecay);

    let chain = osc;

    // Harmonics layer (sawtooth octave up)
    if (params.harmonics > 0) {
      const harmOsc = ctx.createOscillator(); harmOsc.type = 'sawtooth';
      harmOsc.frequency.setValueAtTime((params.glideFrom || params.startFreq) * 2, now);
      harmOsc.frequency.exponentialRampToValueAtTime(params.startFreq * 2, now + (params.glide || 0.05));
      harmOsc.frequency.exponentialRampToValueAtTime(params.endFreq * 2, now + (params.glide || 0.05) + params.pitchDecay);
      const hg = ctx.createGain(); hg.gain.value = params.harmonics * 0.3;
      harmOsc.connect(hg); hg.connect(gain);
      harmOsc.start(now); harmOsc.stop(now + params.duration);
    }

    // Saturation
    if (params.satOn) {
      const ws = ctx.createWaveShaper(); ws.oversample = '4x';
      const drv = params.satAmt;
      const curve = new Float32Array(44100);
      for (let i = 0; i < 44100; i++) {
        const x = (i * 2) / 44100 - 1;
        curve[i] = Math.tanh(x * (1 + drv * 5));
      }
      ws.curve = curve;
      chain.connect(ws); chain = ws;
    }

    chain.connect(gain); gain.connect(masterGain);
    osc.start(now); osc.stop(now + params.duration);

  } else if (type === 'snare') {
    // Tone body
    const osc = ctx.createOscillator(); osc.type = 'triangle';
    osc.frequency.value = params.toneFreq * Math.pow(2, (params.tune || 0) / 12);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(params.toneGain, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + params.toneDecay);
    osc.connect(tg); tg.connect(masterGain);
    osc.start(now); osc.stop(now + params.toneDecay + 0.01);

    // Noise burst
    const nb = buildNoiseBuf(ctx, params.noiseDecay + 0.05);
    const ns = ctx.createBufferSource(); ns.buffer = nb;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(params.noiseGain, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + params.noiseDecay * params.snappy);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = params.noiseFilter;
    ns.connect(ng); ng.connect(hp); hp.connect(masterGain);
    ns.start(now); ns.stop(now + params.noiseDecay + 0.05);

    // Transient crack
    if (params.crackOn) {
      const cOsc = ctx.createOscillator(); cOsc.type = 'square'; cOsc.frequency.value = 800;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(params.crackGain, now);
      cg.gain.exponentialRampToValueAtTime(0.001, now + params.crackDecay);
      const chp = ctx.createBiquadFilter(); chp.type = 'highpass'; chp.frequency.value = 2000;
      cOsc.connect(cg); cg.connect(chp); chp.connect(masterGain);
      cOsc.start(now); cOsc.stop(now + params.crackDecay + 0.01);
    }

    // Reverb tail
    if (params.reverbOn) {
      const len = Math.floor(ctx.sampleRate * params.reverbDecay);
      const irBuf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = irBuf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      }
      const conv = ctx.createConvolver(); conv.buffer = irBuf;
      const wet = ctx.createGain(); wet.gain.value = params.reverbMix;
      masterGain.connect(conv); conv.connect(wet); wet.connect(ctx.destination);
    }

  } else if (type === 'clap') {
    const bursts = params.bursts || 3;
    for (let b = 0; b < bursts; b++) {
      const t = now + b * (params.burstSpread || 0.012);
      const nb = buildNoiseBuf(ctx, 0.06);
      const ns = ctx.createBufferSource(); ns.buffer = nb;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(params.noiseGain, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + params.noiseDecay / bursts);
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = params.noiseFilter;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 0.5;
      ns.connect(ng); ng.connect(hp); hp.connect(bp); bp.connect(masterGain);
      ns.start(t); ns.stop(t + params.noiseDecay + 0.01);
    }

    // Reverb
    if (params.reverbOn) {
      const len = Math.floor(ctx.sampleRate * params.reverbDecay);
      const irBuf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = irBuf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      }
      const conv = ctx.createConvolver(); conv.buffer = irBuf;
      const wet = ctx.createGain(); wet.gain.value = params.reverbMix;
      masterGain.connect(conv); conv.connect(wet); wet.connect(ctx.destination);
    }

  } else if (type === 'hihat') {
    // Metallic: sum of 6 detuned square oscillators
    const ratios = [1, 1.483, 1.932, 2.546, 3.14, 4.07];
    const baseFreq = 40 + params.tune * 10;
    ratios.forEach(r => {
      const o = ctx.createOscillator(); o.type = 'square';
      o.frequency.value = baseFreq * r;
      const og = ctx.createGain(); og.gain.value = 0.12;
      o.connect(og); og.connect(masterGain);
      o.start(now); o.stop(now + params.decay + 0.05);
    });

    // HP to cut lows
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = params.brightness;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = params.brightness * 1.5; bp.Q.value = params.metallic * 8;
    masterGain.connect(hp); // actually re-route...

    // Gain envelope
    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(params.volume, now);
    envGain.gain.exponentialRampToValueAtTime(0.001, now + params.decay);

    const nb = buildNoiseBuf(ctx, params.decay + 0.05);
    const ns = ctx.createBufferSource(); ns.buffer = nb;
    const nhp = ctx.createBiquadFilter(); nhp.type = 'highpass'; nhp.frequency.value = params.brightness;
    const ng = ctx.createGain(); ng.gain.value = 0.6;
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
    osc.connect(gain); gain.connect(masterGain);
    osc.start(now); osc.stop(now + params.duration);

    const nb = buildNoiseBuf(ctx, params.noiseDecay + 0.01);
    const ns = ctx.createBufferSource(); ns.buffer = nb;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(params.noiseGain, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + params.noiseDecay);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 200;
    ns.connect(ng); ng.connect(hp); hp.connect(masterGain);
    ns.start(now); ns.stop(now + params.noiseDecay + 0.01);

  } else if (type === 'rim') {
    const o1 = ctx.createOscillator(); o1.type = 'square'; o1.frequency.value = params.clickFreq;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = params.toneFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(params.volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + params.decay);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 600;
    o1.connect(g); o2.connect(g); g.connect(hp); hp.connect(masterGain);
    o1.start(now); o2.start(now); o1.stop(now + params.duration); o2.stop(now + params.duration);

  } else if (type === 'perc') {
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(params.startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(params.endFreq, now + params.pitchDecay);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(params.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + params.bodyDecay);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(now); osc.stop(now + params.duration);

    if (params.noiseGain > 0) {
      const nb = buildNoiseBuf(ctx, params.noiseDecay + 0.01);
      const ns = ctx.createBufferSource(); ns.buffer = nb;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(params.noiseGain, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + params.noiseDecay);
      ns.connect(ng); ng.connect(masterGain);
      ns.start(now); ns.stop(now + params.noiseDecay + 0.01);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DDKnob = ({ value, min, max, step = 0.01, onChange, label, unit = '', size = 52, color = '#00ffc8', log = false }) => {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const toNorm = (v) => log ? (Math.log(Math.max(v, 0.0001) / Math.max(min, 0.0001)) / Math.log(Math.max(max, 0.0001) / Math.max(min, 0.0001))) : ((v - min) / (max - min));
  const fromNorm = (n) => log ? min * Math.pow(max / min, n) : min + n * (max - min);
  const angle = -135 + toNorm(value) * 270;

  const onMouseDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    startVal.current = value;
    const onMove = (me) => {
      if (!dragging.current) return;
      const delta = (startY.current - me.clientY) / 130;
      let newNorm = Math.max(0, Math.min(1, toNorm(startVal.current) + delta));
      let newVal = fromNorm(newNorm);
      if (step) newVal = Math.round(newVal / step) * step;
      newVal = Math.max(min, Math.min(max, newVal));
      onChange(newVal);
    };
    const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const dispVal = () => {
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
    if (step < 0.1) return value.toFixed(2);
    if (step < 1) return value.toFixed(1);
    return Math.round(value);
  };

  const r = size / 2 - 4;
  const cx = size / 2, cy = size / 2;
  const rad = (deg) => (deg - 90) * Math.PI / 180;
  const arcPath = (a1, a2) => {
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const large = Math.abs(a2 - a1) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  const trackS = rad(-135), trackE = rad(135), valE = rad(angle);

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <svg width={size} height={size} onMouseDown={onMouseDown} style={{ cursor: 'ns-resize', display: 'block', margin: '0 auto' }}>
        <path d={arcPath(trackS, trackE)} fill="none" stroke="#1e2d3d" strokeWidth="3" strokeLinecap="round" />
        <path d={arcPath(trackS, valE)} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 3px ${color}66)` }} />
        <circle cx={cx + (r-4)*Math.cos(rad(angle))} cy={cy + (r-4)*Math.sin(rad(angle))} r="3" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        <circle cx={cx} cy={cy} r={size/2-10} fill="#0d1117" stroke="#1e2d3d" strokeWidth="1" />
      </svg>
      <div style={{ fontSize: '0.5rem', color: '#4a6080', marginTop: 1, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'JetBrains Mono, monospace' }}>{label}</div>
      <div style={{ fontSize: '0.58rem', color: '#ddeeff', fontFamily: 'JetBrains Mono, monospace', marginTop: 1 }}>{dispVal()}{unit}</div>
    </div>
  );
};

const Toggle = ({ value, onChange, label }) => (
  <button onClick={() => onChange(!value)} style={{
    background: value ? '#00ffc822' : 'transparent',
    border: `1px solid ${value ? '#00ffc8' : '#2a3a4a'}`,
    color: value ? '#00ffc8' : '#4a5a6a',
    borderRadius: 4, padding: '3px 10px', fontSize: '0.6rem',
    cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
    transition: 'all 0.15s',
    boxShadow: value ? '0 0 6px #00ffc844' : 'none',
  }}>{label}</button>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const DrumDesigner = ({ onClose, onAssignToPad }) => {
  const [drumType, setDrumType] = useState('kick');
  const [params, setParams] = useState(() => {
    const p = {};
    Object.keys(DRUM_DEFAULTS).forEach(k => { p[k] = { ...DRUM_DEFAULTS[k] }; });
    return p;
  });
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState('');
  const ctxRef = useRef(null);

  const getCtx = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  };

  const set = (key, val) => setParams(p => ({ ...p, [drumType]: { ...p[drumType], [key]: val } }));
  const p = params[drumType];

  const playDrum = useCallback(() => {
    const ctx = getCtx();
    setPlaying(true);
    synthDrum(ctx, drumType, params[drumType], ctx.destination);
    setTimeout(() => setPlaying(false), 200);
  }, [drumType, params]);

  const exportWAV = async () => {
    setExporting(true);
    try {
      const dur = (p.duration || 0.5) + 0.3;
      const offCtx = new OfflineAudioContext(2, Math.ceil(44100 * dur), 44100);
      synthDrum(offCtx, drumType, p, offCtx.destination);
      const rendered = await offCtx.startRendering();

      const nc = rendered.numberOfChannels, sr = rendered.sampleRate;
      const len = rendered.length * nc * 2;
      const buf = new ArrayBuffer(44 + len);
      const view = new DataView(buf);
      const ws = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
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
      setStatus('WAV exported!');
    } catch (e) { console.error(e); setStatus('Export failed'); }
    setExporting(false);
    setTimeout(() => setStatus(''), 2000);
  };

  const renderParams = () => {
    const knobColor = drumType === '808' ? '#FF6600' : drumType === 'snare' ? '#5ac8fa' : drumType === 'clap' ? '#a78bfa' : drumType === 'hihat' ? '#34d399' : '#00ffc8';

    if (drumType === 'kick') return (
      <div className="dd-params-grid">
        <DDKnob value={p.startFreq} min={40} max={400} step={1} onChange={v => set('startFreq', v)} label="START F" unit="Hz" color={knobColor} />
        <DDKnob value={p.endFreq} min={20} max={200} step={1} onChange={v => set('endFreq', v)} label="END F" unit="Hz" color={knobColor} />
        <DDKnob value={p.pitchDecay} min={0.01} max={0.5} step={0.005} log onChange={v => set('pitchDecay', v)} label="PITCH DEC" unit="s" color={knobColor} />
        <DDKnob value={p.bodyDecay} min={0.05} max={2} step={0.01} log onChange={v => set('bodyDecay', v)} label="BODY DEC" unit="s" color={knobColor} />
        <DDKnob value={p.punch} min={0} max={2} step={0.01} onChange={v => set('punch', v)} label="PUNCH" color={knobColor} />
        <DDKnob value={p.volume} min={0} max={1} step={0.01} onChange={v => set('volume', v)} label="VOLUME" color={knobColor} />
        <div className="dd-toggles">
          <div className="dd-toggle-row">
            <Toggle value={p.clickOn} onChange={v => set('clickOn', v)} label="CLICK" />
            <DDKnob value={p.clickGain} min={0} max={1} step={0.01} onChange={v => set('clickGain', v)} label="Click Vol" size={56} color={knobColor} />
            <DDKnob value={p.clickDecay} min={0.001} max={0.05} step={0.001} log onChange={v => set('clickDecay', v)} label="Click Dec" size={56} unit="s" color={knobColor} />
          </div>
          <div className="dd-toggle-row">
            <Toggle value={p.noiseOn} onChange={v => set('noiseOn', v)} label="NOISE" />
            <DDKnob value={p.noiseGain} min={0} max={1} step={0.01} onChange={v => set('noiseGain', v)} label="Noise Vol" size={56} color={knobColor} />
          </div>
          <div className="dd-toggle-row">
            <Toggle value={p.distOn} onChange={v => set('distOn', v)} label="DIST" />
            <DDKnob value={p.distAmt} min={0} max={100} step={1} onChange={v => set('distAmt', v)} label="Drive" size={56} color="#f97316" />
          </div>
        </div>
      </div>
    );

    if (drumType === '808') return (
      <div className="dd-params-grid">
        <DDKnob value={p.glideFrom} min={50} max={600} step={1} onChange={v => set('glideFrom', v)} label="GLIDE FROM" unit="Hz" color={knobColor} />
        <DDKnob value={p.startFreq} min={30} max={200} step={1} onChange={v => set('startFreq', v)} label="NOTE FREQ" unit="Hz" color={knobColor} />
        <DDKnob value={p.endFreq} min={20} max={150} step={1} onChange={v => set('endFreq', v)} label="END FREQ" unit="Hz" color={knobColor} />
        <DDKnob value={p.glide} min={0} max={0.5} step={0.005} onChange={v => set('glide', v)} label="GLIDE" unit="s" color={knobColor} />
        <DDKnob value={p.pitchDecay} min={0.01} max={1} step={0.01} log onChange={v => set('pitchDecay', v)} label="PITCH DEC" unit="s" color={knobColor} />
        <DDKnob value={p.bodyDecay} min={0.1} max={5} step={0.05} log onChange={v => set('bodyDecay', v)} label="TAIL" unit="s" color={knobColor} />
        <DDKnob value={p.harmonics} min={0} max={1} step={0.01} onChange={v => set('harmonics', v)} label="HARMONICS" color={knobColor} />
        <DDKnob value={p.volume} min={0} max={1} step={0.01} onChange={v => set('volume', v)} label="VOLUME" color={knobColor} />
        <div className="dd-toggles">
          <div className="dd-toggle-row">
            <Toggle value={p.satOn} onChange={v => set('satOn', v)} label="SATURATION" />
            <DDKnob value={p.satAmt} min={0} max={1} step={0.01} onChange={v => set('satAmt', v)} label="Sat Amt" size={56} color="#f97316" />
          </div>
        </div>
      </div>
    );

    if (drumType === 'snare') return (
      <div className="dd-params-grid">
        <DDKnob value={p.toneFreq} min={80} max={600} step={1} onChange={v => set('toneFreq', v)} label="TONE FREQ" unit="Hz" color={knobColor} />
        <DDKnob value={p.toneDecay} min={0.01} max={0.5} step={0.005} log onChange={v => set('toneDecay', v)} label="TONE DEC" unit="s" color={knobColor} />
        <DDKnob value={p.toneGain} min={0} max={1} step={0.01} onChange={v => set('toneGain', v)} label="TONE BODY" color={knobColor} />
        <DDKnob value={p.noiseGain} min={0} max={1} step={0.01} onChange={v => set('noiseGain', v)} label="NOISE" color={knobColor} />
        <DDKnob value={p.noiseDecay} min={0.01} max={0.5} step={0.005} log onChange={v => set('noiseDecay', v)} label="NOISE DEC" unit="s" color={knobColor} />
        <DDKnob value={p.snappy} min={0.1} max={1} step={0.01} onChange={v => set('snappy', v)} label="SNAPPY" color={knobColor} />
        <DDKnob value={p.noiseFilter} min={500} max={8000} step={100} log onChange={v => set('noiseFilter', v)} label="HP CUTOFF" unit="Hz" color={knobColor} />
        <DDKnob value={p.tune} min={-12} max={12} step={1} onChange={v => set('tune', v)} label="TUNE" unit="st" color={knobColor} />
        <DDKnob value={p.volume} min={0} max={1} step={0.01} onChange={v => set('volume', v)} label="VOLUME" color={knobColor} />
        <div className="dd-toggles">
          <div className="dd-toggle-row">
            <Toggle value={p.crackOn} onChange={v => set('crackOn', v)} label="CRACK" />
            <DDKnob value={p.crackGain} min={0} max={1} step={0.01} onChange={v => set('crackGain', v)} label="Crack Vol" size={56} color={knobColor} />
          </div>
          <div className="dd-toggle-row">
            <Toggle value={p.reverbOn} onChange={v => set('reverbOn', v)} label="REVERB" />
            <DDKnob value={p.reverbMix} min={0} max={1} step={0.01} onChange={v => set('reverbMix', v)} label="Verb Mix" size={56} color="#a78bfa" />
            <DDKnob value={p.reverbDecay} min={0.1} max={3} step={0.1} onChange={v => set('reverbDecay', v)} label="Verb Dec" size={56} unit="s" color="#a78bfa" />
          </div>
        </div>
      </div>
    );

    if (drumType === 'clap') return (
      <div className="dd-params-grid">
        <DDKnob value={p.bursts} min={1} max={6} step={1} onChange={v => set('bursts', v)} label="BURSTS" color={knobColor} />
        <DDKnob value={p.burstSpread} min={0.002} max={0.05} step={0.001} onChange={v => set('burstSpread', v)} label="SPREAD" unit="s" color={knobColor} />
        <DDKnob value={p.noiseGain} min={0} max={1} step={0.01} onChange={v => set('noiseGain', v)} label="LEVEL" color={knobColor} />
        <DDKnob value={p.noiseDecay} min={0.02} max={0.5} step={0.005} log onChange={v => set('noiseDecay', v)} label="DECAY" unit="s" color={knobColor} />
        <DDKnob value={p.noiseFilter} min={200} max={4000} step={50} log onChange={v => set('noiseFilter', v)} label="HP CUT" unit="Hz" color={knobColor} />
        <DDKnob value={p.volume} min={0} max={1} step={0.01} onChange={v => set('volume', v)} label="VOLUME" color={knobColor} />
        <div className="dd-toggles">
          <div className="dd-toggle-row">
            <Toggle value={p.reverbOn} onChange={v => set('reverbOn', v)} label="REVERB" />
            <DDKnob value={p.reverbMix} min={0} max={1} step={0.01} onChange={v => set('reverbMix', v)} label="Verb Mix" size={56} color="#a78bfa" />
            <DDKnob value={p.reverbDecay} min={0.1} max={3} step={0.1} onChange={v => set('reverbDecay', v)} label="Verb Dec" size={56} unit="s" color="#a78bfa" />
          </div>
        </div>
      </div>
    );

    if (drumType === 'hihat') return (
      <div className="dd-params-grid">
        <DDKnob value={p.brightness} min={2000} max={18000} step={100} log onChange={v => set('brightness', v)} label="BRIGHTNESS" unit="Hz" color={knobColor} />
        <DDKnob value={p.decay} min={0.005} max={2} step={0.005} log onChange={v => set('decay', v)} label="DECAY" unit="s" color={knobColor} />
        <DDKnob value={p.metallic} min={0} max={1} step={0.01} onChange={v => set('metallic', v)} label="METALLIC" color={knobColor} />
        <DDKnob value={p.tune} min={-6} max={6} step={1} onChange={v => set('tune', v)} label="TUNE" unit="st" color={knobColor} />
        <DDKnob value={p.volume} min={0} max={1} step={0.01} onChange={v => set('volume', v)} label="VOLUME" color={knobColor} />
      </div>
    );

    if (drumType === 'tom') return (
      <div className="dd-params-grid">
        <DDKnob value={p.startFreq} min={40} max={400} step={1} onChange={v => set('startFreq', v)} label="START FREQ" unit="Hz" color={knobColor} />
        <DDKnob value={p.endFreq} min={20} max={200} step={1} onChange={v => set('endFreq', v)} label="END FREQ" unit="Hz" color={knobColor} />
        <DDKnob value={p.pitchDecay} min={0.01} max={0.3} step={0.005} onChange={v => set('pitchDecay', v)} label="PITCH DEC" unit="s" color={knobColor} />
        <DDKnob value={p.bodyDecay} min={0.05} max={1.5} step={0.01} log onChange={v => set('bodyDecay', v)} label="BODY DEC" unit="s" color={knobColor} />
        <DDKnob value={p.bodyGain} min={0} max={1} step={0.01} onChange={v => set('bodyGain', v)} label="BODY" color={knobColor} />
        <DDKnob value={p.noiseGain} min={0} max={1} step={0.01} onChange={v => set('noiseGain', v)} label="NOISE" color={knobColor} />
        <DDKnob value={p.volume} min={0} max={1} step={0.01} onChange={v => set('volume', v)} label="VOLUME" color={knobColor} />
      </div>
    );

    if (drumType === 'rim') return (
      <div className="dd-params-grid">
        <DDKnob value={p.clickFreq} min={400} max={4000} step={10} log onChange={v => set('clickFreq', v)} label="CLICK FREQ" unit="Hz" color={knobColor} />
        <DDKnob value={p.toneFreq} min={100} max={1200} step={10} log onChange={v => set('toneFreq', v)} label="TONE FREQ" unit="Hz" color={knobColor} />
        <DDKnob value={p.decay} min={0.01} max={0.2} step={0.005} onChange={v => set('decay', v)} label="DECAY" unit="s" color={knobColor} />
        <DDKnob value={p.volume} min={0} max={1} step={0.01} onChange={v => set('volume', v)} label="VOLUME" color={knobColor} />
      </div>
    );

    if (drumType === 'perc') return (
      <div className="dd-params-grid">
        <DDKnob value={p.startFreq} min={100} max={2000} step={10} log onChange={v => set('startFreq', v)} label="START FREQ" unit="Hz" color={knobColor} />
        <DDKnob value={p.endFreq} min={40} max={1000} step={10} log onChange={v => set('endFreq', v)} label="END FREQ" unit="Hz" color={knobColor} />
        <DDKnob value={p.pitchDecay} min={0.005} max={0.3} step={0.005} onChange={v => set('pitchDecay', v)} label="PITCH DEC" unit="s" color={knobColor} />
        <DDKnob value={p.bodyDecay} min={0.02} max={2} step={0.01} log onChange={v => set('bodyDecay', v)} label="BODY DEC" unit="s" color={knobColor} />
        <DDKnob value={p.noiseGain} min={0} max={1} step={0.01} onChange={v => set('noiseGain', v)} label="NOISE" color={knobColor} />
        <DDKnob value={p.noiseDecay} min={0.01} max={0.5} step={0.01} onChange={v => set('noiseDecay', v)} label="NOISE DEC" unit="s" color={knobColor} />
        <DDKnob value={p.volume} min={0} max={1} step={0.01} onChange={v => set('volume', v)} label="VOLUME" color={knobColor} />
      </div>
    );

    return null;
  };

  return (
    <div className="dd-root">
      {/* HEADER */}
      <div className="dd-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1rem' }}>🥁</span>
          <span className="dd-title">DRUM DESIGNER</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {status && <span style={{ fontSize: '0.62rem', color: '#00ffc8', fontFamily: 'JetBrains Mono, monospace' }}>{status}</span>}
          <button className="dd-btn dd-btn-play" onClick={playDrum} disabled={playing}>
            {playing ? '🔊' : '▶ PLAY'}
          </button>
          <button className="dd-btn dd-btn-export" onClick={exportWAV} disabled={exporting}>
            {exporting ? '⏳' : '⬇ WAV'}
          </button>
          {onAssignToPad && (
            <button className="dd-btn dd-btn-pad" onClick={async () => { const buf = await exportWAV(); onAssignToPad({ type: drumType, params: p, audioBuffer: buf }); }}>
              🎛 → PAD
            </button>
          )}
          {onClose && <button className="dd-btn dd-btn-close" onClick={onClose}>✕</button>}
        </div>
      </div>

      {/* DRUM TYPE SELECTOR */}
      <div className="dd-type-selector">
        {DRUM_TYPES.map(dt => (
          <button key={dt.id}
            className={`dd-type-btn ${drumType === dt.id ? 'active' : ''}`}
            onClick={() => setDrumType(dt.id)}
          >
            <span className="dd-type-icon">{dt.icon}</span>
            <span className="dd-type-label">{dt.label}</span>
          </button>
        ))}
      </div>

      {/* PARAMETERS */}
      <div className="dd-params-container">
        <div className="dd-params-title">
          {DRUM_TYPES.find(d => d.id === drumType)?.icon} {DRUM_TYPES.find(d => d.id === drumType)?.label} PARAMETERS
        </div>
        {renderParams()}
      </div>

      {/* RESET */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid #1a2535' }}>
        <button className="dd-btn" onClick={() => setParams(p => ({ ...p, [drumType]: { ...DRUM_DEFAULTS[drumType] } }))}>
          ↺ Reset {drumType.toUpperCase()}
        </button>
      </div>
    </div>
  );
};

export default DrumDesigner;
