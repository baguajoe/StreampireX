// =============================================================================
// SynthCreator.js — Full-Featured Subtractive Synthesizer
// =============================================================================
// Location: src/front/js/component/SynthCreator.js
// Route: Accessible via DAW sidebar (tab "Synth")
//
// FEATURES:
//   Sound Source:
//     - 3 oscillators: sine / saw / square / triangle / pulse
//     - Per-osc: waveform, octave, semitone, detune, volume, on/off
//     - Unison (up to 7 voices per osc, spread, stereo width)
//     - Noise generator (white/pink/brown, volume)
//     - Sub oscillator (sine, -1 or -2 octave, volume)
//   Shaping:
//     - ADSR envelope (amp + filter separate)
//     - Filter: lowpass / highpass / bandpass / notch — cutoff + resonance
//     - Filter envelope (amount, attack, decay, sustain, release)
//     - LFO: rate, depth, destination (pitch/filter/amp/pan), waveform
//     - Glide / portamento
//     - Pitch envelope
//   FX Chain:
//     - Chorus, Phaser, Flanger, Distortion, Bit Crusher, Reverb, Delay
//   Output:
//     - Master volume + voice limit
//     - 88-key playable keyboard (mouse + QWERTY)
//     - Save preset (localStorage + API sync)
//     - Export WAV (OfflineAudioContext render)
//     - Assign to Sampler Pad / DAW keyboard track
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '../../styles/SynthCreator.css';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const WAVEFORMS = ['sine', 'sawtooth', 'square', 'triangle'];
const WAVEFORM_LABELS = { sine: '~', sawtooth: '/|', square: '⊓', triangle: '/\\' };
const FILTER_TYPES = ['lowpass', 'highpass', 'bandpass', 'notch'];
const LFO_DESTS = ['pitch', 'filter', 'amp', 'pan'];
const LFO_WAVES = ['sine', 'sawtooth', 'square', 'triangle'];
const NOISE_TYPES = ['white', 'pink', 'brown'];

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const getFreq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// QWERTY → MIDI mapping (2 octaves from C3)
const KEY_MAP = {
  'z':48,'s':49,'x':50,'d':51,'c':52,'v':53,'g':54,'b':55,'h':56,'n':57,'j':58,'m':59,
  'q':60,'2':61,'w':62,'3':63,'e':64,'r':65,'5':66,'t':67,'6':68,'y':69,'7':70,'u':71,'i':72,
};

const DEFAULT_PRESET = {
  name: 'Init',
  oscs: [
    { on: true,  wave: 'sawtooth', oct: 0, semi: 0, detune: 0, vol: 0.8 },
    { on: false, wave: 'square',   oct: 0, semi: 0, detune: 5, vol: 0.5 },
    { on: false, wave: 'sine',     oct: -1,semi: 0, detune: 0, vol: 0.4 },
  ],
  unison: { voices: 1, spread: 10, width: 0.8 },
  noise:  { on: false, type: 'white', vol: 0.15 },
  sub:    { on: false, oct: -1, vol: 0.4 },
  amp:    { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.4 },
  filter: { type: 'lowpass', cutoff: 4000, res: 1, on: true },
  filterEnv: { amount: 2000, attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.4 },
  lfo:    { on: false, wave: 'sine', rate: 2.5, depth: 50, dest: 'filter', sync: false },
  glide:  { on: false, time: 0.1 },
  pitchEnv: { on: false, amount: 12, attack: 0.01, decay: 0.3 },
  fx: {
    chorus:   { on: false, rate: 1.2, depth: 0.003, mix: 0.4 },
    phaser:   { on: false, rate: 0.5, depth: 1000,  mix: 0.5 },
    flanger:  { on: false, rate: 0.3, depth: 0.005, mix: 0.4 },
    distort:  { on: false, amount: 30 },
    bitcrush: { on: false, bits: 8, sr: 0.5 },
    reverb:   { on: true,  decay: 1.5, mix: 0.2 },
    delay:    { on: false, time: 0.375, feedback: 0.4, mix: 0.3 },
  },
  master: { vol: 0.7, voices: 8 },
};

const FACTORY_PRESETS = [
  { name: '808 Bass', oscs: [{ on:true, wave:'sine', oct:-1, semi:0, detune:0, vol:0.9 },{ on:false, wave:'sawtooth', oct:0, semi:0, detune:0, vol:0.5 },{ on:false, wave:'sine', oct:0, semi:0, detune:0, vol:0.4 }], unison:{voices:1,spread:0,width:0}, noise:{on:false,type:'white',vol:0.1}, sub:{on:true,oct:-1,vol:0.5}, amp:{attack:0.005,decay:0.8,sustain:0.0,release:0.5}, filter:{type:'lowpass',cutoff:800,res:2,on:true}, filterEnv:{amount:1200,attack:0.005,decay:0.4,sustain:0,release:0.3}, lfo:{on:false,wave:'sine',rate:2,depth:30,dest:'filter',sync:false}, glide:{on:true,time:0.08}, pitchEnv:{on:false,amount:12,attack:0.01,decay:0.3}, fx:{chorus:{on:false,rate:1.2,depth:0.003,mix:0.4},phaser:{on:false,rate:0.5,depth:1000,mix:0.5},flanger:{on:false,rate:0.3,depth:0.005,mix:0.4},distort:{on:true,amount:15},bitcrush:{on:false,bits:8,sr:0.5},reverb:{on:false,decay:1.5,mix:0.15},delay:{on:false,time:0.375,feedback:0.4,mix:0.3}}, master:{vol:0.8,voices:4} },
  { name: 'Supersaw Lead', oscs: [{ on:true, wave:'sawtooth', oct:0, semi:0, detune:0, vol:0.7 },{ on:true, wave:'sawtooth', oct:0, semi:0, detune:12, vol:0.7 },{ on:true, wave:'sawtooth', oct:1, semi:0, detune:-8, vol:0.4 }], unison:{voices:7,spread:25,width:0.9}, noise:{on:false,type:'white',vol:0.05}, sub:{on:false,oct:-1,vol:0.3}, amp:{attack:0.01,decay:0.1,sustain:0.8,release:0.4}, filter:{type:'lowpass',cutoff:6000,res:3,on:true}, filterEnv:{amount:3000,attack:0.01,decay:0.4,sustain:0.3,release:0.3}, lfo:{on:true,wave:'sine',rate:0.3,depth:20,dest:'filter',sync:false}, glide:{on:false,time:0.05}, pitchEnv:{on:false,amount:12,attack:0.01,decay:0.3}, fx:{chorus:{on:true,rate:0.8,depth:0.004,mix:0.5},phaser:{on:false,rate:0.5,depth:1000,mix:0.5},flanger:{on:false,rate:0.3,depth:0.005,mix:0.4},distort:{on:false,amount:10},bitcrush:{on:false,bits:8,sr:0.5},reverb:{on:true,decay:2,mix:0.3},delay:{on:true,time:0.375,feedback:0.35,mix:0.25}}, master:{vol:0.7,voices:8} },
  { name: 'Dreamy Pad', oscs: [{ on:true, wave:'sawtooth', oct:0, semi:0, detune:0, vol:0.5 },{ on:true, wave:'sawtooth', oct:0, semi:7, detune:5, vol:0.4 },{ on:true, wave:'triangle', oct:1, semi:0, detune:-3, vol:0.3 }], unison:{voices:4,spread:15,width:0.85}, noise:{on:false,type:'white',vol:0.05}, sub:{on:false,oct:-1,vol:0.2}, amp:{attack:0.6,decay:0.5,sustain:0.7,release:2.0}, filter:{type:'lowpass',cutoff:2500,res:2,on:true}, filterEnv:{amount:800,attack:0.5,decay:0.8,sustain:0.4,release:1.5}, lfo:{on:true,wave:'sine',rate:0.15,depth:300,dest:'filter',sync:false}, glide:{on:false,time:0.1}, pitchEnv:{on:false,amount:12,attack:0.01,decay:0.3}, fx:{chorus:{on:true,rate:0.5,depth:0.005,mix:0.6},phaser:{on:true,rate:0.2,depth:1500,mix:0.4},flanger:{on:false,rate:0.3,depth:0.005,mix:0.4},distort:{on:false,amount:10},bitcrush:{on:false,bits:8,sr:0.5},reverb:{on:true,decay:4,mix:0.5},delay:{on:true,time:0.5,feedback:0.4,mix:0.3}}, master:{vol:0.65,voices:6} },
  { name: 'Pluck Keys', oscs: [{ on:true, wave:'triangle', oct:0, semi:0, detune:0, vol:0.8 },{ on:false, wave:'sine', oct:0, semi:0, detune:0, vol:0.4 },{ on:false, wave:'sawtooth', oct:0, semi:0, detune:0, vol:0.3 }], unison:{voices:1,spread:0,width:0}, noise:{on:true,type:'white',vol:0.08}, sub:{on:false,oct:-1,vol:0.3}, amp:{attack:0.003,decay:0.4,sustain:0.0,release:0.3}, filter:{type:'lowpass',cutoff:5000,res:4,on:true}, filterEnv:{amount:6000,attack:0.001,decay:0.25,sustain:0,release:0.15}, lfo:{on:false,wave:'sine',rate:2,depth:20,dest:'filter',sync:false}, glide:{on:false,time:0.05}, pitchEnv:{on:false,amount:12,attack:0.01,decay:0.3}, fx:{chorus:{on:false,rate:1.2,depth:0.003,mix:0.3},phaser:{on:false,rate:0.5,depth:1000,mix:0.5},flanger:{on:false,rate:0.3,depth:0.005,mix:0.4},distort:{on:false,amount:10},bitcrush:{on:false,bits:8,sr:0.5},reverb:{on:true,decay:1.2,mix:0.25},delay:{on:true,time:0.25,feedback:0.3,mix:0.2}}, master:{vol:0.75,voices:6} },
  { name: 'Wobble Bass', oscs: [{ on:true, wave:'sawtooth', oct:-1, semi:0, detune:0, vol:0.8 },{ on:true, wave:'square', oct:-1, semi:0, detune:3, vol:0.5 },{ on:false, wave:'sine', oct:0, semi:0, detune:0, vol:0.3 }], unison:{voices:2,spread:8,width:0.5}, noise:{on:false,type:'white',vol:0.05}, sub:{on:true,oct:-1,vol:0.4}, amp:{attack:0.01,decay:0.2,sustain:0.8,release:0.3}, filter:{type:'lowpass',cutoff:400,res:12,on:true}, filterEnv:{amount:0,attack:0.01,decay:0.3,sustain:0,release:0.3}, lfo:{on:true,wave:'sine',rate:4,depth:3000,dest:'filter',sync:false}, glide:{on:false,time:0.05}, pitchEnv:{on:false,amount:12,attack:0.01,decay:0.3}, fx:{chorus:{on:false,rate:1.2,depth:0.003,mix:0.3},phaser:{on:false,rate:0.5,depth:1000,mix:0.5},flanger:{on:false,rate:0.3,depth:0.005,mix:0.4},distort:{on:true,amount:25},bitcrush:{on:false,bits:8,sr:0.5},reverb:{on:false,decay:1.5,mix:0.1},delay:{on:false,time:0.375,feedback:0.4,mix:0.2}}, master:{vol:0.75,voices:4} },
  { name: 'Lo-Fi Keys', oscs: [{ on:true, wave:'triangle', oct:0, semi:0, detune:0, vol:0.7 },{ on:true, wave:'sine', oct:0, semi:0, detune:2, vol:0.3 },{ on:false, wave:'sine', oct:0, semi:0, detune:0, vol:0.3 }], unison:{voices:1,spread:0,width:0}, noise:{on:true,type:'pink',vol:0.04}, sub:{on:false,oct:-1,vol:0.2}, amp:{attack:0.005,decay:0.6,sustain:0.2,release:0.8}, filter:{type:'lowpass',cutoff:2000,res:1.5,on:true}, filterEnv:{amount:1500,attack:0.005,decay:0.4,sustain:0,release:0.3}, lfo:{on:true,wave:'sine',rate:0.8,depth:8,dest:'pitch',sync:false}, glide:{on:false,time:0.05}, pitchEnv:{on:false,amount:12,attack:0.01,decay:0.3}, fx:{chorus:{on:true,rate:0.4,depth:0.003,mix:0.3},phaser:{on:false,rate:0.5,depth:1000,mix:0.5},flanger:{on:false,rate:0.3,depth:0.005,mix:0.4},distort:{on:false,amount:10},bitcrush:{on:true,bits:12,sr:0.7},reverb:{on:true,decay:2,mix:0.3},delay:{on:false,time:0.375,feedback:0.3,mix:0.2}}, master:{vol:0.7,voices:6} },
  { name: 'FX Sweep', oscs: [{ on:true, wave:'sawtooth', oct:0, semi:0, detune:0, vol:0.6 },{ on:true, wave:'square', oct:0, semi:5, detune:0, vol:0.4 },{ on:false, wave:'sine', oct:0, semi:0, detune:0, vol:0.3 }], unison:{voices:3,spread:20,width:0.7}, noise:{on:true,type:'white',vol:0.1}, sub:{on:false,oct:-1,vol:0.3}, amp:{attack:0.8,decay:0.5,sustain:0.5,release:2.0}, filter:{type:'lowpass',cutoff:200,res:8,on:true}, filterEnv:{amount:8000,attack:1.5,decay:1,sustain:0.3,release:1.5}, lfo:{on:true,wave:'sine',rate:0.5,depth:2,dest:'pitch',sync:false}, glide:{on:false,time:0.1}, pitchEnv:{on:false,amount:12,attack:0.01,decay:0.3}, fx:{chorus:{on:true,rate:1,depth:0.005,mix:0.5},phaser:{on:true,rate:0.8,depth:2000,mix:0.6},flanger:{on:false,rate:0.3,depth:0.005,mix:0.4},distort:{on:false,amount:10},bitcrush:{on:false,bits:8,sr:0.5},reverb:{on:true,decay:3,mix:0.4},delay:{on:true,time:0.5,feedback:0.5,mix:0.35}}, master:{vol:0.65,voices:6} },
];

// ─────────────────────────────────────────────────────────────────────────────
// KNOB COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const Knob = ({ value, min, max, step = 0.01, onChange, label, unit = '', size = 48, color = '#00ffc8', log = false }) => {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const toNorm = (v) => log
    ? (Math.log(v / min) / Math.log(max / min))
    : ((v - min) / (max - min));
  const fromNorm = (n) => log
    ? min * Math.pow(max / min, n)
    : min + n * (max - min);

  const angle = -135 + toNorm(value) * 270;

  const onMouseDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    startVal.current = value;
    const onMove = (me) => {
      if (!dragging.current) return;
      const delta = (startY.current - me.clientY) / 150;
      let newNorm = Math.max(0, Math.min(1, toNorm(startVal.current) + delta));
      let newVal = fromNorm(newNorm);
      if (step) newVal = Math.round(newVal / step) * step;
      newVal = Math.max(min, Math.min(max, newVal));
      onChange(newVal);
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const displayVal = () => {
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
    if (step < 0.1) return value.toFixed(2);
    if (step < 1) return value.toFixed(1);
    return Math.round(value);
  };

  const r = size / 2 - 4;
  const cx = size / 2, cy = size / 2;
  const toRad = (deg) => (deg - 90) * Math.PI / 180;
  const trackStart = toRad(-135);
  const trackEnd = toRad(135);
  const valEnd = toRad(angle);

  const arcPath = (a1, a2) => {
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const large = Math.abs(a2 - a1) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <div className="sc-knob" style={{ width: size, textAlign: 'center', userSelect: 'none' }}>
      <svg width={size} height={size} onMouseDown={onMouseDown} style={{ cursor: 'ns-resize', display: 'block' }}>
        <path d={arcPath(trackStart, trackEnd)} fill="none" stroke="#1e2d3d" strokeWidth="3" strokeLinecap="round" />
        <path d={arcPath(trackStart, valEnd)} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px ${color}66)` }} />
        <circle cx={cx + (r - 4) * Math.cos(toRad(angle))} cy={cy + (r - 4) * Math.sin(toRad(angle))}
          r="3" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        <circle cx={cx} cy={cy} r={size / 2 - 10} fill="#0d1117" stroke="#1e2d3d" strokeWidth="1" />
      </svg>
      <div style={{ fontSize: '0.55rem', color: '#5a7088', marginTop: 1 }}>{label}</div>
      <div style={{ fontSize: '0.6rem', color: '#ddeeff', fontFamily: 'JetBrains Mono, monospace', marginTop: 1 }}>
        {displayVal()}{unit}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE BUTTON
// ─────────────────────────────────────────────────────────────────────────────

const Toggle = ({ value, onChange, label, color = '#00ffc8' }) => (
  <button
    onClick={() => onChange(!value)}
    style={{
      background: value ? color + '22' : 'transparent',
      border: `1px solid ${value ? color : '#2a3a4a'}`,
      color: value ? color : '#4a5a6a',
      borderRadius: 4, padding: '3px 8px', fontSize: '0.6rem',
      cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
      transition: 'all 0.15s',
      boxShadow: value ? `0 0 6px ${color}44` : 'none',
    }}
  >{label}</button>
);

// ─────────────────────────────────────────────────────────────────────────────
// WAVE SELECTOR
// ─────────────────────────────────────────────────────────────────────────────

const WaveSelect = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {WAVEFORMS.map(w => (
      <button key={w} onClick={() => onChange(w)} style={{
        background: value === w ? '#00ffc822' : 'transparent',
        border: `1px solid ${value === w ? '#00ffc8' : '#2a3a4a'}`,
        color: value === w ? '#00ffc8' : '#4a6080',
        borderRadius: 3, padding: '2px 6px', fontSize: '0.7rem',
        cursor: 'pointer', fontFamily: 'monospace',
        boxShadow: value === w ? '0 0 5px #00ffc844' : 'none',
        transition: 'all 0.1s',
      }}>{WAVEFORM_LABELS[w]}</button>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────

const SectionHeader = ({ icon, title, right }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '1px solid #1a2535', paddingBottom: 6, marginBottom: 10 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: '0.8rem' }}>{icon}</span>
      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#7a9ab8',
        textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'JetBrains Mono, monospace' }}>{title}</span>
    </div>
    {right}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO ENGINE HOOK
// ─────────────────────────────────────────────────────────────────────────────

function useSynthEngine(preset) {
  const ctxRef = useRef(null);
  const activeVoices = useRef({}); // midi → { oscs, gains, filter, lfo... }
  const lfoNodeRef = useRef(null);
  const lfoGainRef = useRef(null);
  const masterGainRef = useRef(null);
  const fxChainRef = useRef(null);
  const fxInputRef = useRef(null);
  const reverbIRRef = useRef(null);
  const lastNoteRef = useRef(null);
  const presetRef = useRef(preset);
  presetRef.current = preset;

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  // Build reverb IR
  const buildIR = useCallback((ctx, decay) => {
    const len = Math.floor(ctx.sampleRate * decay);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5);
    }
    return buf;
  }, []);

  // Build noise buffer (white/pink/brown)
  const buildNoise = useCallback((ctx, type, duration = 2) => {
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    if (type === 'white') {
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } else if (type === 'pink') {
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
        b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856;
        b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
        d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362)/5.5; b6 = w*0.115926;
      }
    } else { // brown
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    return buf;
  }, []);

  // Build FX chain: returns { input, output }
  const buildFX = useCallback((ctx, p) => {
    const fx = p.fx;
    const nodes = [];
    let last = null;
    const chain = (node) => { if (last) last.connect(node); nodes.push(node); last = node; };

    const input = ctx.createGain();
    last = input;

    // Chorus
    if (fx.chorus.on) {
      const dry = ctx.createGain(); dry.gain.value = 1 - fx.chorus.mix;
      const wet = ctx.createGain(); wet.gain.value = fx.chorus.mix;
      const dl = ctx.createDelay(0.05); dl.delayTime.value = fx.chorus.depth;
      const lfo = ctx.createOscillator(); lfo.frequency.value = fx.chorus.rate;
      const lfoG = ctx.createGain(); lfoG.gain.value = fx.chorus.depth * 0.5;
      lfo.connect(lfoG); lfoG.connect(dl.delayTime); lfo.start();
      const merge = ctx.createGain();
      last.connect(dry); dry.connect(merge);
      last.connect(dl); dl.connect(wet); wet.connect(merge);
      last = merge; nodes.push(dry, wet, dl, lfo, lfoG, merge);
    }

    // Flanger
    if (fx.flanger.on) {
      const dry = ctx.createGain(); dry.gain.value = 1 - fx.flanger.mix;
      const wet = ctx.createGain(); wet.gain.value = fx.flanger.mix;
      const dl = ctx.createDelay(0.02); dl.delayTime.value = 0.003;
      const lfo = ctx.createOscillator(); lfo.frequency.value = fx.flanger.rate;
      const lfoG = ctx.createGain(); lfoG.gain.value = fx.flanger.depth * 0.3;
      const fb = ctx.createGain(); fb.gain.value = 0.5;
      lfo.connect(lfoG); lfoG.connect(dl.delayTime); lfo.start();
      dl.connect(fb); fb.connect(dl);
      const merge = ctx.createGain();
      last.connect(dry); dry.connect(merge);
      last.connect(dl); dl.connect(wet); wet.connect(merge);
      last = merge; nodes.push(dry, wet, dl, lfo, lfoG, fb, merge);
    }

    // Phaser (4-stage allpass)
    if (fx.phaser.on) {
      const merge = ctx.createGain();
      const phDry = ctx.createGain(); phDry.gain.value = 0.5;
      const phWet = ctx.createGain(); phWet.gain.value = fx.phaser.mix * 0.5;
      const stages = Array.from({ length: 4 }, () => { const f = ctx.createBiquadFilter(); f.type = 'allpass'; f.frequency.value = fx.phaser.depth; f.Q.value = 5; return f; });
      stages.reduce((a, b) => { a.connect(b); return b; });
      const lfo = ctx.createOscillator(); lfo.frequency.value = fx.phaser.rate;
      const lfoG = ctx.createGain(); lfoG.gain.value = fx.phaser.depth * 0.5;
      lfo.connect(lfoG);
      stages.forEach(s => lfoG.connect(s.frequency));
      lfo.start();
      last.connect(phDry); phDry.connect(merge);
      last.connect(stages[0]); stages[stages.length - 1].connect(phWet); phWet.connect(merge);
      last = merge; nodes.push(...stages, lfo, lfoG, phDry, phWet, merge);
    }

    // Distortion
    if (fx.distort.on) {
      const ws = ctx.createWaveShaper(); ws.oversample = '4x';
      const a = fx.distort.amount;
      const curve = new Float32Array(44100);
      for (let i = 0; i < 44100; i++) {
        const x = (i * 2) / 44100 - 1;
        curve[i] = ((3 + a) * x * 20 * (Math.PI / 180)) / (Math.PI + a * Math.abs(x));
      }
      ws.curve = curve;
      chain(ws);
    }

    // Bit Crusher
    if (fx.bitcrush.on) {
      const sc = ctx.createScriptProcessor(4096, 1, 1);
      const bits = Math.round(fx.bitcrush.bits);
      const step = Math.pow(0.5, bits - 1);
      const srRed = Math.max(1, Math.round(1 / (fx.bitcrush.sr + 0.01)));
      let held = 0, counter = 0;
      sc.onaudioprocess = (e) => {
        const inp = e.inputBuffer.getChannelData(0);
        const out = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < inp.length; i++) {
          if (++counter >= srRed) { counter = 0; held = step * Math.round(inp[i] / step); }
          out[i] = held;
        }
      };
      chain(sc);
    }

    // Delay
    if (fx.delay.on) {
      const dry = ctx.createGain(); dry.gain.value = 1;
      const wet = ctx.createGain(); wet.gain.value = fx.delay.mix;
      const dl = ctx.createDelay(5); dl.delayTime.value = fx.delay.time;
      const fb = ctx.createGain(); fb.gain.value = Math.min(0.9, fx.delay.feedback);
      dl.connect(fb); fb.connect(dl);
      const merge = ctx.createGain();
      last.connect(dry); dry.connect(merge);
      last.connect(dl); dl.connect(wet); wet.connect(merge);
      last = merge; nodes.push(dry, wet, dl, fb, merge);
    }

    // Reverb
    if (fx.reverb.on) {
      const conv = ctx.createConvolver();
      if (!reverbIRRef.current) reverbIRRef.current = buildIR(ctx, fx.reverb.decay);
      conv.buffer = reverbIRRef.current;
      const dry = ctx.createGain(); dry.gain.value = 1 - fx.reverb.mix;
      const wet = ctx.createGain(); wet.gain.value = fx.reverb.mix;
      const merge = ctx.createGain();
      last.connect(dry); dry.connect(merge);
      last.connect(conv); conv.connect(wet); wet.connect(merge);
      last = merge; nodes.push(conv, dry, wet, merge);
    }

    const masterGain = ctx.createGain();
    masterGain.gain.value = p.master.vol;
    last.connect(masterGain);
    masterGain.connect(ctx.destination);

    fxInputRef.current = input;
    masterGainRef.current = masterGain;
    fxChainRef.current = nodes;

    return { input, masterGain };
  }, [buildIR]);

  // ── NOTE ON ──
  const noteOn = useCallback((midi, velocity = 0.8) => {
    const p = presetRef.current;
    const ctx = getCtx();
    if (!fxInputRef.current) buildFX(ctx, p);

    if (activeVoices.current[midi]) noteOff(midi);
    const freq = getFreq(midi);
    const now = ctx.currentTime;
    const dest = fxInputRef.current;

    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(0, now);
    voiceGain.gain.linearRampToValueAtTime(velocity * p.master.vol, now + p.amp.attack);
    voiceGain.gain.linearRampToValueAtTime(
      velocity * p.master.vol * p.amp.sustain,
      now + p.amp.attack + p.amp.decay
    );
    voiceGain.connect(dest);

    // Filter
    const filter = ctx.createBiquadFilter();
    filter.type = p.filter.type;
    filter.frequency.setValueAtTime(p.filter.cutoff + p.filterEnv.amount, now);
    filter.frequency.linearRampToValueAtTime(
      p.filter.cutoff + p.filterEnv.amount * p.filterEnv.sustain,
      now + p.filterEnv.attack + p.filterEnv.decay
    );
    filter.Q.value = p.filter.res;
    filter.connect(voiceGain);

    const oscsOut = [];

    // Oscillators
    p.oscs.forEach((osc) => {
      if (!osc.on) return;
      const uniVoices = Math.max(1, p.unison.voices);

      for (let u = 0; u < uniVoices; u++) {
        const spread = uniVoices > 1 ? ((u / (uniVoices - 1)) - 0.5) * p.unison.spread : 0;
        const o = ctx.createOscillator();
        o.type = osc.wave;
        const baseFreq = freq * Math.pow(2, osc.oct) * Math.pow(2, osc.semi / 12);

        // Glide
        if (p.glide.on && lastNoteRef.current != null) {
          const lastFreq = getFreq(lastNoteRef.current) * Math.pow(2, osc.oct) * Math.pow(2, osc.semi / 12);
          o.frequency.setValueAtTime(lastFreq, now);
          o.frequency.linearRampToValueAtTime(baseFreq, now + p.glide.time);
        } else {
          o.frequency.setValueAtTime(baseFreq, now);
        }

        o.detune.value = osc.detune + spread;
        const og = ctx.createGain(); og.gain.value = osc.vol / uniVoices;

        // Pan for unison stereo spread
        const pan = ctx.createStereoPanner();
        pan.pan.value = uniVoices > 1 ? ((u / (uniVoices - 1)) - 0.5) * p.unison.width : 0;

        o.connect(og); og.connect(pan); pan.connect(filter);
        o.start(now);
        oscsOut.push({ osc: o, gain: og, pan });
      }
    });

    // Sub oscillator
    if (p.sub.on) {
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = freq * Math.pow(2, p.sub.oct);
      const sg = ctx.createGain(); sg.gain.value = p.sub.vol;
      sub.connect(sg); sg.connect(filter);
      sub.start(now);
      oscsOut.push({ osc: sub, gain: sg });
    }

    // Noise
    if (p.noise.on) {
      const nBuf = buildNoise(ctx, p.noise.type, 2);
      const ns = ctx.createBufferSource(); ns.buffer = nBuf; ns.loop = true;
      const ng = ctx.createGain(); ng.gain.value = p.noise.vol;
      ns.connect(ng); ng.connect(filter);
      ns.start(now);
      oscsOut.push({ osc: ns, gain: ng, isNoise: true });
    }

    // LFO
    let lfoNode = null;
    if (p.lfo.on) {
      const lfo = ctx.createOscillator();
      lfo.type = p.lfo.wave;
      lfo.frequency.value = p.lfo.rate;
      const lg = ctx.createGain();
      lfoNode = { lfo, gain: lg };

      if (p.lfo.dest === 'filter') {
        lg.gain.value = p.lfo.depth;
        lfo.connect(lg); lg.connect(filter.frequency);
      } else if (p.lfo.dest === 'pitch') {
        lg.gain.value = p.lfo.depth;
        lfo.connect(lg);
        oscsOut.forEach(v => { if (v.osc.detune) lg.connect(v.osc.detune); });
      } else if (p.lfo.dest === 'amp') {
        lg.gain.value = p.lfo.depth * 0.01;
        lfo.connect(lg); lg.connect(voiceGain.gain);
      }
      lfo.start(now);
    }

    lastNoteRef.current = midi;
    activeVoices.current[midi] = { oscs: oscsOut, voiceGain, filter, lfoNode };
  }, [getCtx, buildFX, buildNoise]);

  // ── NOTE OFF ──
  const noteOff = useCallback((midi) => {
    const p = presetRef.current;
    const voice = activeVoices.current[midi];
    if (!voice) return;
    const ctx = getCtx();
    const now = ctx.currentTime;
    const rel = p.amp.release;

    voice.voiceGain.gain.cancelScheduledValues(now);
    voice.voiceGain.gain.setValueAtTime(voice.voiceGain.gain.value, now);
    voice.voiceGain.gain.linearRampToValueAtTime(0, now + rel);

    const stop = now + rel + 0.05;
    voice.oscs.forEach(({ osc }) => { try { osc.stop(stop); } catch (e) {} });
    if (voice.lfoNode) { try { voice.lfoNode.lfo.stop(stop); } catch (e) {} }

    setTimeout(() => {
      try { voice.voiceGain.disconnect(); voice.filter.disconnect(); } catch (e) {}
      delete activeVoices.current[midi];
    }, (rel + 0.1) * 1000);
  }, [getCtx]);

  // Rebuild FX when preset changes significantly
  const initFX = useCallback(() => {
    const ctx = getCtx();
    // Disconnect old chain
    if (fxInputRef.current) {
      try { fxInputRef.current.disconnect(); } catch (e) {}
    }
    reverbIRRef.current = null;
    buildFX(ctx, presetRef.current);
  }, [getCtx, buildFX]);

  return { noteOn, noteOff, initFX, getCtx };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const SynthCreator = ({ onClose, onAssignToPad, onAssignToTrack }) => {
  const [preset, setPreset] = useState(() => JSON.parse(JSON.stringify(DEFAULT_PRESET)));
  const [activeTab, setActiveTab] = useState('osc'); // osc|env|filter|lfo|fx|out
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [octaveShift, setOctaveShift] = useState(0);
  const [presetName, setPresetName] = useState('My Synth 01');
  const [savedPresets, setSavedPresets] = useState([]);
  const [showPresets, setShowPresets] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [status, setStatus] = useState('');
  const heldKeys = useRef(new Set());

  const { noteOn, noteOff, initFX, getCtx } = useSynthEngine(preset);

  // Load saved presets
  useEffect(() => {
    try {
      const raw = localStorage.getItem('spx_synth_presets');
      if (raw) setSavedPresets(JSON.parse(raw));
    } catch (e) {}
  }, []);

  // Reinit FX when relevant preset parts change
  useEffect(() => { initFX(); }, [preset.fx, preset.master.vol]);

  // QWERTY keyboard
  useEffect(() => {
    const down = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const key = e.key.toLowerCase();
      if (heldKeys.current.has(key)) return;
      if (KEY_MAP[key] != null) {
        heldKeys.current.add(key);
        const midi = KEY_MAP[key] + octaveShift * 12;
        noteOn(midi);
        setActiveKeys(prev => new Set([...prev, midi]));
      }
      if (key === 'z' && e.shiftKey) setOctaveShift(o => Math.max(-2, o - 1));
      if (key === 'x' && e.shiftKey) setOctaveShift(o => Math.min(2, o + 1));
    };
    const up = (e) => {
      const key = e.key.toLowerCase();
      heldKeys.current.delete(key);
      if (KEY_MAP[key] != null) {
        const midi = KEY_MAP[key] + octaveShift * 12;
        noteOff(midi);
        setActiveKeys(prev => { const n = new Set(prev); n.delete(midi); return n; });
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [noteOn, noteOff, octaveShift]);

  // ── Patch helpers ──
  const setOsc = (i, key, val) => setPreset(p => {
    const oscs = p.oscs.map((o, idx) => idx === i ? { ...o, [key]: val } : o);
    return { ...p, oscs };
  });
  const setAmp = (key, val) => setPreset(p => ({ ...p, amp: { ...p.amp, [key]: val } }));
  const setFilter = (key, val) => setPreset(p => ({ ...p, filter: { ...p.filter, [key]: val } }));
  const setFilterEnv = (key, val) => setPreset(p => ({ ...p, filterEnv: { ...p.filterEnv, [key]: val } }));
  const setLfo = (key, val) => setPreset(p => ({ ...p, lfo: { ...p.lfo, [key]: val } }));
  const setFx = (fxKey, key, val) => setPreset(p => ({
    ...p, fx: { ...p.fx, [fxKey]: { ...p.fx[fxKey], [key]: val } }
  }));
  const setUnison = (key, val) => setPreset(p => ({ ...p, unison: { ...p.unison, [key]: val } }));
  const setNoise = (key, val) => setPreset(p => ({ ...p, noise: { ...p.noise, [key]: val } }));
  const setSub = (key, val) => setPreset(p => ({ ...p, sub: { ...p.sub, [key]: val } }));
  const setGlide = (key, val) => setPreset(p => ({ ...p, glide: { ...p.glide, [key]: val } }));

  const loadPreset = (p) => { setPreset(JSON.parse(JSON.stringify(p))); setPresetName(p.name); setShowPresets(false); };

  const savePreset = () => {
    const name = saveName.trim() || presetName;
    const newPreset = { ...JSON.parse(JSON.stringify(preset)), name };
    const updated = [...savedPresets.filter(p => p.name !== name), newPreset];
    setSavedPresets(updated);
    try { localStorage.setItem('spx_synth_presets', JSON.stringify(updated)); } catch (e) {}
    setPresetName(name);
    setShowSaveModal(false);
    setStatus('Preset saved!');
    setTimeout(() => setStatus(''), 2000);
  };

  const exportWAV = async () => {
    setExporting(true);
    try {
      const ctx = getCtx();
      const duration = 3;
      const offCtx = new OfflineAudioContext(2, Math.floor(44100 * duration), 44100);

      // Build a mini render: play chord C-E-G
      const notes = [60, 64, 67];
      const reverbIR = (() => {
        const len = Math.floor(44100 * (preset.fx.reverb.decay || 1.5));
        const buf = offCtx.createBuffer(2, len, 44100);
        for (let ch = 0; ch < 2; ch++) {
          const d = buf.getChannelData(ch);
          for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5);
        }
        return buf;
      })();

      const masterOut = offCtx.createGain();
      masterOut.gain.value = preset.master.vol;
      masterOut.connect(offCtx.destination);

      notes.forEach((midi, ni) => {
        const startTime = ni * 0.05;
        const freq = getFreq(midi);
        const voiceGain = offCtx.createGain();
        voiceGain.gain.setValueAtTime(0, startTime);
        voiceGain.gain.linearRampToValueAtTime(0.6, startTime + preset.amp.attack);
        voiceGain.gain.linearRampToValueAtTime(0.6 * preset.amp.sustain, startTime + preset.amp.attack + preset.amp.decay);
        voiceGain.gain.linearRampToValueAtTime(0, duration - preset.amp.release);

        const filt = offCtx.createBiquadFilter();
        filt.type = preset.filter.type;
        filt.frequency.setValueAtTime(preset.filter.cutoff + preset.filterEnv.amount, startTime);
        filt.frequency.linearRampToValueAtTime(preset.filter.cutoff + preset.filterEnv.amount * preset.filterEnv.sustain, startTime + preset.filterEnv.attack + preset.filterEnv.decay);
        filt.Q.value = preset.filter.res;
        filt.connect(voiceGain);

        let dest = voiceGain;
        if (preset.fx.reverb.on) {
          const conv = offCtx.createConvolver(); conv.buffer = reverbIR;
          const dry = offCtx.createGain(); dry.gain.value = 1 - preset.fx.reverb.mix;
          const wet = offCtx.createGain(); wet.gain.value = preset.fx.reverb.mix;
          const merge = offCtx.createGain();
          voiceGain.connect(dry); dry.connect(merge);
          voiceGain.connect(conv); conv.connect(wet); wet.connect(merge);
          merge.connect(masterOut);
          dest = voiceGain;
        } else {
          voiceGain.connect(masterOut);
        }

        preset.oscs.forEach(osc => {
          if (!osc.on) return;
          const o = offCtx.createOscillator();
          o.type = osc.wave;
          o.frequency.value = freq * Math.pow(2, osc.oct) * Math.pow(2, osc.semi / 12);
          o.detune.value = osc.detune;
          const og = offCtx.createGain(); og.gain.value = osc.vol;
          o.connect(og); og.connect(filt);
          o.start(startTime); o.stop(duration);
        });
      });

      const rendered = await offCtx.startRendering();

      // WAV encode
      const nc = rendered.numberOfChannels, sr = rendered.sampleRate;
      const len = rendered.length * nc * 2;
      const buf = new ArrayBuffer(44 + len);
      const view = new DataView(buf);
      const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
      writeStr(0, 'RIFF'); view.setUint32(4, 36 + len, true); writeStr(8, 'WAVE');
      writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
      view.setUint16(22, nc, true); view.setUint32(24, sr, true);
      view.setUint32(28, sr * nc * 2, true); view.setUint16(32, nc * 2, true);
      view.setUint16(34, 16, true); writeStr(36, 'data'); view.setUint32(40, len, true);
      let off = 44;
      for (let i = 0; i < rendered.length; i++) {
        for (let ch = 0; ch < nc; ch++) {
          const s = Math.max(-1, Math.min(1, rendered.getChannelData(ch)[i]));
          view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2;
        }
      }
      const blob = new Blob([buf], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `${presetName.replace(/\s+/g, '_')}.wav`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus('WAV exported!');
      setExporting(false);
      setTimeout(() => setStatus(''), 2000);
      return buf;
    } catch (e) {
      console.error(e);
      setStatus('Export failed');
      setExporting(false);
      setTimeout(() => setStatus(''), 2000);
      return null;
    }
  };

  // ── Mini keyboard ──
  const KEYS_PER_OCTAVE = [
    { note: 'C',  black: false, midi: 0 },
    { note: 'C#', black: true,  midi: 1 },
    { note: 'D',  black: false, midi: 2 },
    { note: 'D#', black: true,  midi: 3 },
    { note: 'E',  black: false, midi: 4 },
    { note: 'F',  black: false, midi: 5 },
    { note: 'F#', black: true,  midi: 6 },
    { note: 'G',  black: false, midi: 7 },
    { note: 'G#', black: true,  midi: 8 },
    { note: 'A',  black: false, midi: 9 },
    { note: 'A#', black: true,  midi: 10 },
    { note: 'B',  black: false, midi: 11 },
  ];

  const OCTAVES = [3, 4, 5];
  const WHITE_W = 22, WHITE_H = 70, BLACK_W = 14, BLACK_H = 44;
  const blackOffsets = { 1: 14, 3: 36, 6: 80, 8: 102, 10: 124 };

  const renderKeyboard = () => {
    const allKeys = [];
    OCTAVES.forEach(oct => {
      KEYS_PER_OCTAVE.forEach(k => {
        const midi = (oct + 1) * 12 + k.midi + octaveShift * 12;
        allKeys.push({ ...k, midi, oct });
      });
    });
    const whites = allKeys.filter(k => !k.black);
    const totalW = whites.length * WHITE_W;

    return (
      <div style={{ position: 'relative', height: WHITE_H + 2, width: totalW, userSelect: 'none' }}>
        {whites.map((k, i) => (
          <div key={`w-${k.midi}`}
            onMouseDown={(e) => { e.preventDefault(); noteOn(k.midi, 0.8); setActiveKeys(prev => new Set([...prev, k.midi])); }}
            onMouseUp={() => { noteOff(k.midi); setActiveKeys(prev => { const n = new Set(prev); n.delete(k.midi); return n; }); }}
            onMouseLeave={() => { if (activeKeys.has(k.midi)) { noteOff(k.midi); setActiveKeys(prev => { const n = new Set(prev); n.delete(k.midi); return n; }); } }}
            style={{
              position: 'absolute', left: i * WHITE_W, top: 0,
              width: WHITE_W - 1, height: WHITE_H,
              background: activeKeys.has(k.midi) ? '#00ffc844' : '#e8f0f8',
              border: '1px solid #3a4a5a', borderTop: 'none',
              borderRadius: '0 0 3px 3px', cursor: 'pointer',
              transition: 'background 0.05s',
              boxSizing: 'border-box',
            }} />
        ))}
        {allKeys.filter(k => k.black).map(k => {
          const octIdx = OCTAVES.indexOf(k.oct);
          const whitesBefore = octIdx * 7 + [0,1,1,2,2,3,3,4,4,5,5,6][k.midi % 12];
          return (
            <div key={`b-${k.midi}`}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); noteOn(k.midi, 0.9); setActiveKeys(prev => new Set([...prev, k.midi])); }}
              onMouseUp={(e) => { e.stopPropagation(); noteOff(k.midi); setActiveKeys(prev => { const n = new Set(prev); n.delete(k.midi); return n; }); }}
              style={{
                position: 'absolute',
                left: whitesBefore * WHITE_W + (WHITE_W - BLACK_W / 2) - BLACK_W / 2,
                top: 0, width: BLACK_W, height: BLACK_H,
                background: activeKeys.has(k.midi) ? '#00ffc8' : '#0d1117',
                border: '1px solid #4a5a6a', borderTop: 'none',
                borderRadius: '0 0 3px 3px', cursor: 'pointer', zIndex: 2,
                transition: 'background 0.05s',
                boxShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              }} />
          );
        })}
      </div>
    );
  };

  const TABS = [
    { id: 'osc',    label: '🎛️ OSC' },
    { id: 'env',    label: '📐 ENV' },
    { id: 'filter', label: '🔊 FILTER' },
    { id: 'lfo',    label: '🌊 LFO' },
    { id: 'fx',     label: '⚡ FX' },
    { id: 'out',    label: '💾 OUT' },
  ];

  return (
    <div className="sc-root">
      {/* HEADER */}
      <div className="sc-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.1rem' }}>🎹</span>
          <span className="sc-title">SYNTH CREATOR</span>
          <span className="sc-subtitle">StreamPireX Studio</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {status && <span style={{ fontSize: '0.65rem', color: '#00ffc8', fontFamily: 'JetBrains Mono, monospace' }}>{status}</span>}
          <button className="sc-btn sc-btn-teal" onClick={() => setShowPresets(!showPresets)}>📂 Presets</button>
          <button className="sc-btn" onClick={() => setShowSaveModal(true)}>💾 Save</button>
          <button className="sc-btn sc-btn-orange" onClick={exportWAV} disabled={exporting}>
            {exporting ? '⏳ Rendering...' : '⬇ WAV'}
          </button>
          {onClose && <button className="sc-btn sc-btn-close" onClick={onClose}>✕</button>}
        </div>
      </div>

      {/* PRESET PANEL */}
      {showPresets && (
        <div className="sc-presets-panel">
          <div className="sc-presets-section-label">Factory Presets</div>
          <div className="sc-presets-grid">
            {FACTORY_PRESETS.map(p => (
              <button key={p.name} className="sc-preset-btn" onClick={() => loadPreset(p)}>{p.name}</button>
            ))}
          </div>
          {savedPresets.length > 0 && <>
            <div className="sc-presets-section-label" style={{ marginTop: 8 }}>My Presets</div>
            <div className="sc-presets-grid">
              {savedPresets.map(p => (
                <button key={p.name} className="sc-preset-btn sc-preset-user" onClick={() => loadPreset(p)}>{p.name}</button>
              ))}
            </div>
          </>}
        </div>
      )}

      {/* TABS */}
      <div className="sc-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`sc-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="sc-panel">

        {/* ── OSCILLATORS ── */}
        {activeTab === 'osc' && (
          <div>
            {preset.oscs.map((osc, i) => (
              <div key={i} className={`sc-osc-row ${osc.on ? 'active' : 'inactive'}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Toggle value={osc.on} onChange={v => setOsc(i, 'on', v)} label={`OSC ${i+1}`} />
                  <WaveSelect value={osc.wave} onChange={v => setOsc(i, 'wave', v)} />
                </div>
                <div className="sc-knob-row">
                  <Knob value={osc.oct} min={-2} max={2} step={1} onChange={v => setOsc(i, 'oct', v)} label="OCT" />
                  <Knob value={osc.semi} min={-12} max={12} step={1} onChange={v => setOsc(i, 'semi', v)} label="SEMI" />
                  <Knob value={osc.detune} min={-100} max={100} step={1} onChange={v => setOsc(i, 'detune', v)} label="DETUNE" unit="¢" />
                  <Knob value={osc.vol} min={0} max={1} step={0.01} onChange={v => setOsc(i, 'vol', v)} label="VOL" />
                </div>
              </div>
            ))}

            {/* Unison */}
            <div className="sc-section">
              <SectionHeader icon="🔀" title="Unison" />
              <div className="sc-knob-row">
                <Knob value={preset.unison.voices} min={1} max={7} step={2} onChange={v => setUnison('voices', v)} label="VOICES" color="#FF6600" />
                <Knob value={preset.unison.spread} min={0} max={100} step={1} onChange={v => setUnison('spread', v)} label="SPREAD" unit="¢" color="#FF6600" />
                <Knob value={preset.unison.width} min={0} max={1} step={0.01} onChange={v => setUnison('width', v)} label="WIDTH" color="#FF6600" />
              </div>
            </div>

            {/* Sub + Noise */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="sc-section" style={{ flex: 1 }}>
                <SectionHeader icon="🔉" title="Sub Osc" right={
                  <Toggle value={preset.sub.on} onChange={v => setSub('on', v)} label="ON" />
                } />
                <div className="sc-knob-row">
                  <Knob value={preset.sub.oct} min={-2} max={-1} step={1} onChange={v => setSub('oct', v)} label="OCT" />
                  <Knob value={preset.sub.vol} min={0} max={1} step={0.01} onChange={v => setSub('vol', v)} label="VOL" />
                </div>
              </div>
              <div className="sc-section" style={{ flex: 1 }}>
                <SectionHeader icon="📢" title="Noise" right={
                  <Toggle value={preset.noise.on} onChange={v => setNoise('on', v)} label="ON" />
                } />
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                  {NOISE_TYPES.map(t => (
                    <button key={t} onClick={() => setNoise('type', t)} className={`sc-pill ${preset.noise.type === t ? 'active' : ''}`}>{t}</button>
                  ))}
                </div>
                <Knob value={preset.noise.vol} min={0} max={1} step={0.01} onChange={v => setNoise('vol', v)} label="VOL" />
              </div>
            </div>

            {/* Glide */}
            <div className="sc-section">
              <SectionHeader icon="〰" title="Glide / Portamento" right={
                <Toggle value={preset.glide.on} onChange={v => setGlide('on', v)} label="ON" />
              } />
              <Knob value={preset.glide.time} min={0.01} max={2} step={0.01} onChange={v => setGlide('time', v)} label="TIME" unit="s" />
            </div>
          </div>
        )}

        {/* ── ENVELOPE ── */}
        {activeTab === 'env' && (
          <div>
            <div className="sc-section">
              <SectionHeader icon="📐" title="Amp Envelope" />
              <div className="sc-knob-row">
                <Knob value={preset.amp.attack} min={0.001} max={4} step={0.001} log onChange={v => setAmp('attack', v)} label="ATTACK" unit="s" />
                <Knob value={preset.amp.decay} min={0.01} max={4} step={0.01} log onChange={v => setAmp('decay', v)} label="DECAY" unit="s" />
                <Knob value={preset.amp.sustain} min={0} max={1} step={0.01} onChange={v => setAmp('sustain', v)} label="SUSTAIN" />
                <Knob value={preset.amp.release} min={0.01} max={8} step={0.01} log onChange={v => setAmp('release', v)} label="RELEASE" unit="s" />
              </div>
              {/* ADSR visual */}
              <svg width="100%" height="60" style={{ marginTop: 8 }}>
                {(() => {
                  const w = 300, h = 50;
                  const a = Math.min(preset.amp.attack * 40, 60);
                  const d = Math.min(preset.amp.decay * 30, 50);
                  const s = preset.amp.sustain;
                  const r = Math.min(preset.amp.release * 25, 50);
                  const pts = `0,${h} ${a},2 ${a+d},${h*(1-s)} ${a+d+40},${h*(1-s)} ${a+d+40+r},${h}`;
                  return <>
                    <polygon points={pts} fill="#00ffc811" />
                    <polyline points={pts} fill="none" stroke="#00ffc8" strokeWidth="2" strokeLinejoin="round"
                      style={{ filter: 'drop-shadow(0 0 4px #00ffc888)' }} />
                  </>;
                })()}
              </svg>
            </div>

            <div className="sc-section">
              <SectionHeader icon="🎚" title="Pitch Envelope" right={
                <Toggle value={preset.pitchEnv.on} onChange={v => setPreset(p => ({ ...p, pitchEnv: { ...p.pitchEnv, on: v } }))} label="ON" />
              } />
              <div className="sc-knob-row">
                <Knob value={preset.pitchEnv.amount} min={-48} max={48} step={1} onChange={v => setPreset(p => ({ ...p, pitchEnv: { ...p.pitchEnv, amount: v } }))} label="AMOUNT" unit="st" />
                <Knob value={preset.pitchEnv.attack} min={0.001} max={2} step={0.001} log onChange={v => setPreset(p => ({ ...p, pitchEnv: { ...p.pitchEnv, attack: v } }))} label="ATTACK" unit="s" />
                <Knob value={preset.pitchEnv.decay} min={0.01} max={4} step={0.01} log onChange={v => setPreset(p => ({ ...p, pitchEnv: { ...p.pitchEnv, decay: v } }))} label="DECAY" unit="s" />
              </div>
            </div>
          </div>
        )}

        {/* ── FILTER ── */}
        {activeTab === 'filter' && (
          <div>
            <div className="sc-section">
              <SectionHeader icon="🔊" title="Filter" right={
                <Toggle value={preset.filter.on} onChange={v => setFilter('on', v)} label="ON" />
              } />
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {FILTER_TYPES.map(t => (
                  <button key={t} onClick={() => setFilter('type', t)} className={`sc-pill ${preset.filter.type === t ? 'active' : ''}`}>{t}</button>
                ))}
              </div>
              <div className="sc-knob-row">
                <Knob value={preset.filter.cutoff} min={20} max={20000} step={1} log onChange={v => setFilter('cutoff', v)} label="CUTOFF" unit="Hz" color="#5ac8fa" />
                <Knob value={preset.filter.res} min={0.1} max={20} step={0.1} onChange={v => setFilter('res', v)} label="RESONANCE" color="#5ac8fa" />
              </div>
            </div>

            <div className="sc-section">
              <SectionHeader icon="📐" title="Filter Envelope" />
              <div className="sc-knob-row">
                <Knob value={preset.filterEnv.amount} min={-10000} max={10000} step={50} onChange={v => setFilterEnv('amount', v)} label="AMOUNT" unit="Hz" color="#5ac8fa" />
                <Knob value={preset.filterEnv.attack} min={0.001} max={4} step={0.001} log onChange={v => setFilterEnv('attack', v)} label="ATTACK" unit="s" color="#5ac8fa" />
                <Knob value={preset.filterEnv.decay} min={0.01} max={4} step={0.01} log onChange={v => setFilterEnv('decay', v)} label="DECAY" unit="s" color="#5ac8fa" />
                <Knob value={preset.filterEnv.sustain} min={0} max={1} step={0.01} onChange={v => setFilterEnv('sustain', v)} label="SUSTAIN" color="#5ac8fa" />
                <Knob value={preset.filterEnv.release} min={0.01} max={8} step={0.01} log onChange={v => setFilterEnv('release', v)} label="RELEASE" unit="s" color="#5ac8fa" />
              </div>
            </div>
          </div>
        )}

        {/* ── LFO ── */}
        {activeTab === 'lfo' && (
          <div>
            <div className="sc-section">
              <SectionHeader icon="🌊" title="LFO" right={
                <Toggle value={preset.lfo.on} onChange={v => setLfo('on', v)} label="ON" />
              } />
              <div style={{ marginBottom: 10 }}>
                <div className="sc-label">Waveform</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {LFO_WAVES.map(w => (
                    <button key={w} onClick={() => setLfo('wave', w)} className={`sc-pill ${preset.lfo.wave === w ? 'active' : ''}`}>
                      {WAVEFORM_LABELS[w]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div className="sc-label">Destination</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {LFO_DESTS.map(d => (
                    <button key={d} onClick={() => setLfo('dest', d)} className={`sc-pill ${preset.lfo.dest === d ? 'active' : ''}`}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="sc-knob-row">
                <Knob value={preset.lfo.rate} min={0.01} max={20} step={0.01} log onChange={v => setLfo('rate', v)} label="RATE" unit="Hz" color="#a78bfa" />
                <Knob value={preset.lfo.depth} min={0} max={preset.lfo.dest === 'pitch' ? 200 : preset.lfo.dest === 'filter' ? 8000 : 1} step={preset.lfo.dest === 'amp' ? 0.01 : 1} onChange={v => setLfo('depth', v)} label="DEPTH" color="#a78bfa" />
              </div>
            </div>
          </div>
        )}

        {/* ── FX ── */}
        {activeTab === 'fx' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Chorus */}
            <div className="sc-section">
              <SectionHeader icon="🌊" title="Chorus" right={
                <Toggle value={preset.fx.chorus.on} onChange={v => setFx('chorus', 'on', v)} label="ON" />
              } />
              <div className="sc-knob-row">
                <Knob value={preset.fx.chorus.rate} min={0.1} max={10} step={0.1} onChange={v => setFx('chorus', 'rate', v)} label="RATE" unit="Hz" size={56} />
                <Knob value={preset.fx.chorus.mix} min={0} max={1} step={0.01} onChange={v => setFx('chorus', 'mix', v)} label="MIX" size={56} />
              </div>
            </div>

            {/* Phaser */}
            <div className="sc-section">
              <SectionHeader icon="🔄" title="Phaser" right={
                <Toggle value={preset.fx.phaser.on} onChange={v => setFx('phaser', 'on', v)} label="ON" />
              } />
              <div className="sc-knob-row">
                <Knob value={preset.fx.phaser.rate} min={0.05} max={5} step={0.05} onChange={v => setFx('phaser', 'rate', v)} label="RATE" unit="Hz" size={56} color="#5ac8fa" />
                <Knob value={preset.fx.phaser.mix} min={0} max={1} step={0.01} onChange={v => setFx('phaser', 'mix', v)} label="MIX" size={56} color="#5ac8fa" />
              </div>
            </div>

            {/* Flanger */}
            <div className="sc-section">
              <SectionHeader icon="〰" title="Flanger" right={
                <Toggle value={preset.fx.flanger.on} onChange={v => setFx('flanger', 'on', v)} label="ON" />
              } />
              <div className="sc-knob-row">
                <Knob value={preset.fx.flanger.rate} min={0.05} max={5} step={0.05} onChange={v => setFx('flanger', 'rate', v)} label="RATE" unit="Hz" size={56} color="#34d399" />
                <Knob value={preset.fx.flanger.mix} min={0} max={1} step={0.01} onChange={v => setFx('flanger', 'mix', v)} label="MIX" size={56} color="#34d399" />
              </div>
            </div>

            {/* Distortion */}
            <div className="sc-section">
              <SectionHeader icon="🔥" title="Distortion" right={
                <Toggle value={preset.fx.distort.on} onChange={v => setFx('distort', 'on', v)} label="ON" />
              } />
              <Knob value={preset.fx.distort.amount} min={0} max={100} step={1} onChange={v => setFx('distort', 'amount', v)} label="DRIVE" color="#f97316" />
            </div>

            {/* Bit Crusher */}
            <div className="sc-section">
              <SectionHeader icon="💻" title="Bit Crusher" right={
                <Toggle value={preset.fx.bitcrush.on} onChange={v => setFx('bitcrush', 'on', v)} label="ON" />
              } />
              <div className="sc-knob-row">
                <Knob value={preset.fx.bitcrush.bits} min={2} max={16} step={1} onChange={v => setFx('bitcrush', 'bits', v)} label="BITS" size={56} color="#f97316" />
                <Knob value={preset.fx.bitcrush.sr} min={0.01} max={1} step={0.01} onChange={v => setFx('bitcrush', 'sr', v)} label="SR RED" size={56} color="#f97316" />
              </div>
            </div>

            {/* Reverb */}
            <div className="sc-section">
              <SectionHeader icon="🏛" title="Reverb" right={
                <Toggle value={preset.fx.reverb.on} onChange={v => setFx('reverb', 'on', v)} label="ON" />
              } />
              <div className="sc-knob-row">
                <Knob value={preset.fx.reverb.decay} min={0.1} max={10} step={0.1} onChange={v => setFx('reverb', 'decay', v)} label="DECAY" unit="s" size={56} color="#a78bfa" />
                <Knob value={preset.fx.reverb.mix} min={0} max={1} step={0.01} onChange={v => setFx('reverb', 'mix', v)} label="MIX" size={56} color="#a78bfa" />
              </div>
            </div>

            {/* Delay */}
            <div className="sc-section" style={{ gridColumn: 'span 2' }}>
              <SectionHeader icon="⏱" title="Delay" right={
                <Toggle value={preset.fx.delay.on} onChange={v => setFx('delay', 'on', v)} label="ON" />
              } />
              <div className="sc-knob-row">
                <Knob value={preset.fx.delay.time} min={0.01} max={2} step={0.01} onChange={v => setFx('delay', 'time', v)} label="TIME" unit="s" color="#fb923c" />
                <Knob value={preset.fx.delay.feedback} min={0} max={0.9} step={0.01} onChange={v => setFx('delay', 'feedback', v)} label="FEEDBACK" color="#fb923c" />
                <Knob value={preset.fx.delay.mix} min={0} max={1} step={0.01} onChange={v => setFx('delay', 'mix', v)} label="MIX" color="#fb923c" />
              </div>
            </div>
          </div>
        )}

        {/* ── OUTPUT ── */}
        {activeTab === 'out' && (
          <div>
            <div className="sc-section">
              <SectionHeader icon="🔈" title="Master Output" />
              <div className="sc-knob-row">
                <Knob value={preset.master.vol} min={0} max={1} step={0.01} onChange={v => setPreset(p => ({ ...p, master: { ...p.master, vol: v } }))} label="VOLUME" />
                <Knob value={preset.master.voices} min={1} max={32} step={1} onChange={v => setPreset(p => ({ ...p, master: { ...p.master, voices: v } }))} label="VOICES" color="#FF6600" />
              </div>
            </div>
            <div className="sc-section">
              <SectionHeader icon="🎹" title="Keyboard" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span className="sc-label">OCTAVE SHIFT:</span>
                <button className="sc-btn" onClick={() => setOctaveShift(o => Math.max(-2, o - 1))}>◀</button>
                <span style={{ color: '#00ffc8', fontFamily: 'JetBrains Mono, monospace', minWidth: 24, textAlign: 'center' }}>
                  {octaveShift > 0 ? `+${octaveShift}` : octaveShift}
                </span>
                <button className="sc-btn" onClick={() => setOctaveShift(o => Math.min(2, o + 1))}>▶</button>
                <span className="sc-label" style={{ marginLeft: 10 }}>QWERTY: Z→B=C3-B3 | Q→U=C4-B4</span>
              </div>
            </div>
            {onAssignToPad && (
              <div className="sc-section">
                <SectionHeader icon="🥁" title="Assign to Beat Maker" />
                <p style={{ fontSize: '0.65rem', color: '#5a7088', marginBottom: 8 }}>Export a 1-shot render and load directly into a sampler pad.</p>
                <button className="sc-btn sc-btn-teal" onClick={() => { exportWAV(); onAssignToPad && onAssignToPad(preset); }}>
                  🎛 Render → Assign to Pad
                </button>
              </div>
            )}
            {onAssignToTrack && (
              <div className="sc-section">
                <SectionHeader icon="🎚" title="Assign to DAW Track" />
                <p style={{ fontSize: '0.65rem', color: '#5a7088', marginBottom: 8 }}>Route this synth as a live instrument track in the Arranger.</p>
                <button className="sc-btn sc-btn-orange" onClick={() => onAssignToTrack && onAssignToTrack(preset)}>
                  🎹 Add as Instrument Track
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* KEYBOARD */}
      <div className="sc-keyboard-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="sc-label">KEYBOARD — Oct {3 + octaveShift}–{5 + octaveShift}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="sc-btn" onClick={() => setOctaveShift(o => Math.max(-2, o - 1))}>◀ OCT</button>
            <button className="sc-btn" onClick={() => setOctaveShift(o => Math.min(2, o + 1))}>OCT ▶</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {renderKeyboard()}
        </div>
      </div>

      {/* SAVE MODAL */}
      {showSaveModal && (
        <div className="sc-modal-backdrop">
          <div className="sc-modal">
            <h3 style={{ color: '#00ffc8', marginBottom: 12, fontSize: '0.85rem' }}>💾 Save Preset</h3>
            <input
              className="sc-input"
              placeholder="Preset name..."
              value={saveName || presetName}
              onChange={e => setSaveName(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="sc-btn sc-btn-teal" onClick={savePreset}>Save</button>
              <button className="sc-btn" onClick={() => setShowSaveModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SynthCreator;
