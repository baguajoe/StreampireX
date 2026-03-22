// =============================================================================
// InstrumentBuilder.js — Custom Instrument Layer Builder
// =============================================================================
// Location: src/front/js/component/InstrumentBuilder.js
//
// CONCEPT: Users build custom instruments by stacking multiple layers:
//   - Synth layer (oscillator with waveform, tune, ADSR, filter)
//   - Sample layer (upload a WAV/MP3 file, set pitch/loop/trim)
//   - Sub layer (sub sine oscillator, volume, octave)
//   - Noise layer (white/pink/brown, envelope, filter)
//
// Each layer has: on/off, volume, pan, individual ADSR, solo, mute
// Master FX: reverb, delay, chorus
// Save as named preset → localStorage
// Export as WAV → plays C4 chord for 2s
// QWERTY keyboard playback
// Assign to DAW sampler pad or keyboard track
// =============================================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import '../../styles/InstrumentBuilder.css';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const WAVEFORMS = ['sine', 'sawtooth', 'square', 'triangle'];
const WAVEFORM_ICONS = { sine: '~', sawtooth: '/|', square: '⊓', triangle: '/\\' };
const NOISE_TYPES = ['white', 'pink', 'brown'];
const LAYER_TYPES = ['synth', 'sample', 'sub', 'noise'];

const LAYER_COLORS = {
  synth:  '#00ffc8',
  sample: '#5ac8fa',
  sub:    '#FF6600',
  noise:  '#a78bfa',
};

const LAYER_ICONS = {
  synth:  '🎛️',
  sample: '🎵',
  sub:    '🔉',
  noise:  '📡',
};

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const getFreq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

const KEY_MAP = {
  'z':48,'s':49,'x':50,'d':51,'c':52,'v':53,'g':54,'b':55,'h':56,'n':57,'j':58,'m':59,
  'q':60,'2':61,'w':62,'3':63,'e':64,'r':65,'5':66,'t':67,'6':68,'y':69,'7':70,'u':71,'i':72,
};

const DEFAULT_LAYER_SYNTH = () => ({
  id: Date.now() + Math.random(),
  type: 'synth', on: true, mute: false, solo: false,
  wave: 'sawtooth', oct: 0, semi: 0, detune: 0,
  vol: 0.7, pan: 0,
  attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.4,
  filter: false, filterType: 'lowpass', filterCutoff: 4000, filterRes: 1,
  name: 'Synth Layer',
});

const DEFAULT_LAYER_SAMPLE = () => ({
  id: Date.now() + Math.random(),
  type: 'sample', on: true, mute: false, solo: false,
  buffer: null, fileName: null,
  vol: 0.8, pan: 0, pitch: 0, rootNote: 60,
  attack: 0.005, decay: 0.1, sustain: 1.0, release: 0.5,
  loopOn: false, trimStart: 0, trimEnd: null, reverse: false,
  name: 'Sample Layer',
});

const DEFAULT_LAYER_SUB = () => ({
  id: Date.now() + Math.random(),
  type: 'sub', on: true, mute: false, solo: false,
  oct: -1, vol: 0.5, pan: 0,
  attack: 0.005, decay: 0.1, sustain: 0.8, release: 0.3,
  name: 'Sub Layer',
});

const DEFAULT_LAYER_NOISE = () => ({
  id: Date.now() + Math.random(),
  type: 'noise', on: true, mute: false, solo: false,
  noiseType: 'white', vol: 0.15, pan: 0,
  attack: 0.01, decay: 0.2, sustain: 0.0, release: 0.1,
  filter: true, filterType: 'bandpass', filterCutoff: 3000, filterRes: 2,
  name: 'Noise Layer',
});

const DEFAULT_FX = {
  reverb: { on: false, decay: 2, mix: 0.25 },
  delay:  { on: false, time: 0.375, feedback: 0.35, mix: 0.25 },
  chorus: { on: false, rate: 1, depth: 0.003, mix: 0.3 },
};

// ─────────────────────────────────────────────────────────────────────────────
// MINI KNOB
// ─────────────────────────────────────────────────────────────────────────────

const Knob = ({ value, min, max, step = 0.01, onChange, label, unit = '', size = 44, color = '#00ffc8', log = false }) => {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const toNorm = (v) => log
    ? Math.log(Math.max(v, 1e-5) / Math.max(min, 1e-5)) / Math.log(Math.max(max, 1e-5) / Math.max(min, 1e-5))
    : (v - min) / (max - min);
  const fromNorm = (n) => log ? min * Math.pow(max / min, n) : min + n * (max - min);
  const angle = -135 + toNorm(value) * 270;

  const onMouseDown = (e) => {
    e.preventDefault();
    dragging.current = true; startY.current = e.clientY; startVal.current = value;
    const mv = (me) => {
      if (!dragging.current) return;
      let nn = Math.max(0, Math.min(1, toNorm(startVal.current) + (startY.current - me.clientY) / 120));
      let nv = fromNorm(nn);
      if (step) nv = Math.round(nv / step) * step;
      onChange(Math.max(min, Math.min(max, nv)));
    };
    const up = () => { dragging.current = false; window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  };

  const dv = () => {
    if (Math.abs(value) >= 1000) return `${(value/1000).toFixed(1)}k`;
    if (step < 0.1) return value.toFixed(2);
    if (step < 1) return value.toFixed(1);
    return Math.round(value);
  };

  const r = size/2-3, cx = size/2, cy = size/2;
  const rad = (d) => (d - 90) * Math.PI / 180;
  const ap = (a1, a2) => {
    const x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1),x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${Math.abs(a2-a1)>Math.PI?1:0} 1 ${x2} ${y2}`;
  };

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <svg width={size} height={size} onMouseDown={onMouseDown} style={{ cursor: 'ns-resize', display: 'block', margin: '0 auto' }}>
        <path d={ap(rad(-135), rad(135))} fill="none" stroke="#1e2d3d" strokeWidth="2.5" strokeLinecap="round" />
        <path d={ap(rad(-135), rad(angle))} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 3px ${color}55)` }} />
        <circle cx={cx+(r-3)*Math.cos(rad(angle))} cy={cy+(r-3)*Math.sin(rad(angle))} r="2.5" fill={color} />
        <circle cx={cx} cy={cy} r={size/2-9} fill="#0d1117" stroke="#1e2d3d" strokeWidth="1" />
      </svg>
      <div style={{ fontSize: '0.48rem', color: '#4a6080', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>{label}</div>
      <div style={{ fontSize: '0.55rem', color: '#ccd8e8', fontFamily: 'JetBrains Mono, monospace' }}>{dv()}{unit}</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO ENGINE
// ─────────────────────────────────────────────────────────────────────────────

function buildNoiseBuf(ctx, type = 'white', dur = 2) {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  if (type === 'white') { for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
  else if (type === 'pink') {
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.96900*b2+w*0.1538520;
      b3=0.86650*b3+w*0.3104856; b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)/5.5; b6=w*0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < len; i++) { last=(last+0.02*(Math.random()*2-1))/1.02; d[i]=last*3.5; }
  }
  return buf;
}

function buildReverbIR(ctx, decay) {
  const len = Math.floor(ctx.sampleRate * decay);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, 1.5);
  }
  return buf;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const InstrumentBuilder = ({ onClose, onAssignToPad, onAssignToTrack }) => {
  const [layers, setLayers] = useState([DEFAULT_LAYER_SYNTH()]);
  const [fx, setFx] = useState({ ...DEFAULT_FX });
  const [instrName, setInstrName] = useState('My Instrument');
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [savedPresets, setSavedPresets] = useState([]);
  const [showPresets, setShowPresets] = useState(false);
  const [octaveShift, setOctaveShift] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [editLayerId, setEditLayerId] = useState(null);
  const ctxRef = useRef(null);
  const activeVoices = useRef({});
  const fxInputRef = useRef(null);
  const heldKeys = useRef(new Set());
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const fxRef = useRef(fx);
  fxRef.current = fx;

  const getCtx = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  };

  // Load presets from localStorage
  useEffect(() => {
    try { const r = localStorage.getItem('spx_instr_presets'); if (r) setSavedPresets(JSON.parse(r)); } catch (e) {}
  }, []);

  // Build FX destination
  const buildFXChain = useCallback((ctx) => {
    const input = ctx.createGain(); input.gain.value = 1;
    let last = input;
    const f = fxRef.current;

    if (f.chorus.on) {
      const dry = ctx.createGain(); dry.gain.value = 1 - f.chorus.mix;
      const wet = ctx.createGain(); wet.gain.value = f.chorus.mix;
      const dl = ctx.createDelay(0.05); dl.delayTime.value = f.chorus.depth;
      const lfo = ctx.createOscillator(); lfo.frequency.value = f.chorus.rate;
      const lg = ctx.createGain(); lg.gain.value = f.chorus.depth * 0.5;
      lfo.connect(lg); lg.connect(dl.delayTime); lfo.start();
      const merge = ctx.createGain();
      last.connect(dry); dry.connect(merge); last.connect(dl); dl.connect(wet); wet.connect(merge);
      last = merge;
    }
    if (f.delay.on) {
      const dry = ctx.createGain(); dry.gain.value = 1;
      const wet = ctx.createGain(); wet.gain.value = f.delay.mix;
      const dl = ctx.createDelay(5); dl.delayTime.value = f.delay.time;
      const fb = ctx.createGain(); fb.gain.value = Math.min(0.9, f.delay.feedback);
      dl.connect(fb); fb.connect(dl);
      const merge = ctx.createGain();
      last.connect(dry); dry.connect(merge); last.connect(dl); dl.connect(wet); wet.connect(merge);
      last = merge;
    }
    if (f.reverb.on) {
      const ir = buildReverbIR(ctx, f.reverb.decay);
      const conv = ctx.createConvolver(); conv.buffer = ir;
      const dry = ctx.createGain(); dry.gain.value = 1 - f.reverb.mix;
      const wet = ctx.createGain(); wet.gain.value = f.reverb.mix;
      const merge = ctx.createGain();
      last.connect(dry); dry.connect(merge); last.connect(conv); conv.connect(wet); wet.connect(merge);
      last = merge;
    }
    last.connect(ctx.destination);
    fxInputRef.current = input;
    return input;
  }, []);

  const noteOn = useCallback((midi, velocity = 0.8) => {
    const ctx = getCtx();
    if (!fxInputRef.current) buildFXChain(ctx);
    const dest = fxInputRef.current;
    const freq = getFreq(midi);
    const now = ctx.currentTime;
    const currentLayers = layersRef.current;
    const hasSolo = currentLayers.some(l => l.solo && l.on);

    if (activeVoices.current[midi]) {
      try { Object.values(activeVoices.current[midi]).forEach(v => { v.forEach(n => { try { n.stop(now); n.disconnect(); } catch(e) {} }); }); } catch(e) {}
      delete activeVoices.current[midi];
    }

    const voiceNodes = [];

    currentLayers.forEach(layer => {
      if (!layer.on || layer.mute) return;
      if (hasSolo && !layer.solo) return;

      const layerGain = ctx.createGain();
      layerGain.gain.setValueAtTime(0, now);
      layerGain.gain.linearRampToValueAtTime(layer.vol * velocity, now + layer.attack);
      layerGain.gain.linearRampToValueAtTime(layer.vol * velocity * layer.sustain, now + layer.attack + layer.decay);
      const pan = ctx.createStereoPanner(); pan.pan.value = layer.pan;
      layerGain.connect(pan); pan.connect(dest);
      voiceNodes.push(layerGain, pan);

      if (layer.type === 'synth') {
        const osc = ctx.createOscillator();
        osc.type = layer.wave;
        osc.frequency.value = freq * Math.pow(2, layer.oct) * Math.pow(2, layer.semi / 12);
        osc.detune.value = layer.detune;
        let chain = osc;
        if (layer.filter) {
          const filt = ctx.createBiquadFilter();
          filt.type = layer.filterType; filt.frequency.value = layer.filterCutoff; filt.Q.value = layer.filterRes;
          chain.connect(filt); chain = filt; voiceNodes.push(filt);
        }
        chain.connect(layerGain);
        osc.start(now);
        voiceNodes.push(osc);

      } else if (layer.type === 'sample') {
        if (!layer.buffer) return;
        const src = ctx.createBufferSource();
        src.buffer = layer.buffer;
        src.playbackRate.value = Math.pow(2, (midi - layer.rootNote + layer.pitch) / 12);
        src.loop = layer.loopOn;
        if (layer.trimStart) src.loopStart = layer.trimStart;
        if (layer.trimEnd) src.loopEnd = layer.trimEnd;
        src.connect(layerGain);
        src.start(now);
        voiceNodes.push(src);

      } else if (layer.type === 'sub') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq * Math.pow(2, layer.oct);
        osc.connect(layerGain);
        osc.start(now);
        voiceNodes.push(osc);

      } else if (layer.type === 'noise') {
        const nBuf = buildNoiseBuf(ctx, layer.noiseType, 2);
        const ns = ctx.createBufferSource(); ns.buffer = nBuf; ns.loop = true;
        let chain = ns;
        if (layer.filter) {
          const filt = ctx.createBiquadFilter();
          filt.type = layer.filterType; filt.frequency.value = layer.filterCutoff; filt.Q.value = layer.filterRes;
          chain.connect(filt); chain = filt; voiceNodes.push(filt);
        }
        chain.connect(layerGain);
        ns.start(now);
        voiceNodes.push(ns);
      }
    });

    activeVoices.current[midi] = voiceNodes;
  }, [buildFXChain]);

  const noteOff = useCallback((midi) => {
    const nodes = activeVoices.current[midi];
    if (!nodes) return;
    const ctx = getCtx();
    const now = ctx.currentTime;
    const maxRelease = Math.max(...layersRef.current.map(l => l.on ? l.release : 0), 0.2);

    nodes.forEach(node => {
      if (node instanceof GainNode) {
        node.gain.cancelScheduledValues(now);
        node.gain.setValueAtTime(node.gain.value, now);
        node.gain.linearRampToValueAtTime(0, now + maxRelease);
      }
    });

    setTimeout(() => {
      nodes.forEach(n => { try { if (n.stop) n.stop(); n.disconnect(); } catch(e) {} });
      delete activeVoices.current[midi];
    }, (maxRelease + 0.1) * 1000);
  }, []);

  // Rebuild FX when it changes
  useEffect(() => {
    if (ctxRef.current) {
      if (fxInputRef.current) { try { fxInputRef.current.disconnect(); } catch(e) {} fxInputRef.current = null; }
      buildFXChain(ctxRef.current);
    }
  }, [fx, buildFXChain]);

  // QWERTY keyboard
  useEffect(() => {
    const dn = (e) => {
      if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (heldKeys.current.has(k)) return;
      if (KEY_MAP[k] != null) {
        heldKeys.current.add(k);
        const midi = KEY_MAP[k] + octaveShift * 12;
        noteOn(midi); setActiveKeys(p => new Set([...p, midi]));
      }
    };
    const up = (e) => {
      const k = e.key.toLowerCase(); heldKeys.current.delete(k);
      if (KEY_MAP[k] != null) {
        const midi = KEY_MAP[k] + octaveShift * 12;
        noteOff(midi); setActiveKeys(p => { const n = new Set(p); n.delete(midi); return n; });
      }
    };
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, [noteOn, noteOff, octaveShift]);

  const addLayer = (type) => {
    const defaults = { synth: DEFAULT_LAYER_SYNTH, sample: DEFAULT_LAYER_SAMPLE, sub: DEFAULT_LAYER_SUB, noise: DEFAULT_LAYER_NOISE };
    const newLayer = defaults[type]();
    setLayers(l => [...l, newLayer]);
    setEditLayerId(newLayer.id);
  };

  const removeLayer = (id) => setLayers(l => l.filter(layer => layer.id !== id));
  const updateLayer = (id, key, val) => setLayers(l => l.map(layer => layer.id === id ? { ...layer, [key]: val } : layer));

  const loadSampleFile = (id, file) => {
    const ctx = getCtx();
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buf = await ctx.decodeAudioData(e.target.result);
        setLayers(l => l.map(layer => layer.id === id ? { ...layer, buffer: buf, fileName: file.name, name: file.name.replace(/\.[^/.]+$/, '') } : layer));
      } catch (err) { console.error('Decode error:', err); }
    };
    reader.readAsArrayBuffer(file);
  };

  const savePreset = () => {
    const name = (saveName.trim() || instrName);
    // Can't serialize AudioBuffers — save everything except buffers
    const saveLayers = layers.map(l => ({ ...l, buffer: null }));
    const entry = { name, layers: saveLayers, fx: JSON.parse(JSON.stringify(fx)), savedAt: Date.now() };
    const updated = [...savedPresets.filter(p => p.name !== name), entry];
    setSavedPresets(updated);
    try { localStorage.setItem('spx_instr_presets', JSON.stringify(updated)); } catch(e) {}
    setInstrName(name); setShowSaveModal(false);
    setStatus('Saved!'); setTimeout(() => setStatus(''), 2000);
  };

  const loadPreset = (preset) => {
    setLayers(preset.layers.map(l => ({ ...l, buffer: null, id: Date.now() + Math.random() })));
    setFx(preset.fx || DEFAULT_FX);
    setInstrName(preset.name);
    setShowPresets(false);
  };

  const exportWAV = async () => {
    setExporting(true);
    try {
      const dur = 3;
      const offCtx = new OfflineAudioContext(2, Math.floor(44100 * dur), 44100);
      const dest = offCtx.destination;
      const now = 0;
      const notes = [60, 64, 67];

      notes.forEach((midi, ni) => {
        const t = ni * 0.04;
        const freq = getFreq(midi);
        layers.forEach(layer => {
          if (!layer.on || layer.mute || layer.type === 'sample') return;
          const lg = offCtx.createGain();
          lg.gain.setValueAtTime(0, t);
          lg.gain.linearRampToValueAtTime(layer.vol * 0.7, t + layer.attack);
          lg.gain.linearRampToValueAtTime(layer.vol * 0.7 * layer.sustain, t + layer.attack + layer.decay);
          lg.gain.linearRampToValueAtTime(0, dur - layer.release);
          lg.connect(dest);

          if (layer.type === 'synth') {
            const osc = offCtx.createOscillator(); osc.type = layer.wave;
            osc.frequency.value = freq * Math.pow(2, layer.oct) * Math.pow(2, layer.semi / 12);
            osc.detune.value = layer.detune;
            osc.connect(lg); osc.start(t); osc.stop(dur);
          } else if (layer.type === 'sub') {
            const osc = offCtx.createOscillator(); osc.type = 'sine';
            osc.frequency.value = freq * Math.pow(2, layer.oct);
            osc.connect(lg); osc.start(t); osc.stop(dur);
          } else if (layer.type === 'noise') {
            const nb = buildNoiseBuf(offCtx, layer.noiseType, dur);
            const ns = offCtx.createBufferSource(); ns.buffer = nb;
            ns.connect(lg); ns.start(t); ns.stop(dur);
          }
        });
      });

      const rendered = await offCtx.startRendering();
      const nc = rendered.numberOfChannels, sr = rendered.sampleRate;
      const bLen = rendered.length * nc * 2;
      const buf = new ArrayBuffer(44 + bLen);
      const view = new DataView(buf);
      const ws = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o+i, s.charCodeAt(i)); };
      ws(0,'RIFF'); view.setUint32(4,36+bLen,true); ws(8,'WAVE');
      ws(12,'fmt '); view.setUint32(16,16,true); view.setUint16(20,1,true);
      view.setUint16(22,nc,true); view.setUint32(24,sr,true);
      view.setUint32(28,sr*nc*2,true); view.setUint16(32,nc*2,true);
      view.setUint16(34,16,true); ws(36,'data'); view.setUint32(40,bLen,true);
      let off = 44;
      for (let i = 0; i < rendered.length; i++) {
        for (let ch = 0; ch < nc; ch++) {
          const s = Math.max(-1,Math.min(1,rendered.getChannelData(ch)[i]));
          view.setInt16(off,s<0?s*0x8000:s*0x7FFF,true); off+=2;
        }
      }
      const blob = new Blob([buf], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=`${instrName.replace(/\s+/g,'_')}.wav`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus('WAV exported!');
    } catch(e) { console.error(e); setStatus('Export failed'); }
    setExporting(false);
    setTimeout(() => setStatus(''), 2000);
  };

  // ─── Keyboard ───
  const OCTAVES = [3, 4, 5];
  const WHITE_W = 20, WHITE_H = 60, BLACK_W = 13, BLACK_H = 38;

  const renderKeyboard = () => {
    const whites = OCTAVES.flatMap(oct =>
      [0,2,4,5,7,9,11].map(semi => ({ midi: (oct+1)*12+semi + octaveShift*12, oct, semi }))
    );
    const blacks = OCTAVES.flatMap(oct =>
      [1,3,6,8,10].map(semi => ({ midi: (oct+1)*12+semi + octaveShift*12, oct, semi }))
    );

    return (
      <div style={{ position: 'relative', height: WHITE_H+2, width: whites.length * WHITE_W }}>
        {whites.map((k, i) => (
          <div key={k.midi}
            onMouseDown={(e) => { e.preventDefault(); noteOn(k.midi); setActiveKeys(p => new Set([...p, k.midi])); }}
            onMouseUp={() => { noteOff(k.midi); setActiveKeys(p => { const n = new Set(p); n.delete(k.midi); return n; }); }}
            onMouseLeave={() => { if (activeKeys.has(k.midi)) { noteOff(k.midi); setActiveKeys(p => { const n = new Set(p); n.delete(k.midi); return n; }); } }}
            style={{ position: 'absolute', left: i*WHITE_W, top: 0, width: WHITE_W-1, height: WHITE_H,
              background: activeKeys.has(k.midi) ? '#00ffc844' : '#e8f0f8',
              border: '1px solid #3a4a5a', borderTop: 'none', borderRadius: '0 0 3px 3px', cursor: 'pointer' }} />
        ))}
        {blacks.map(k => {
          const octIdx = OCTAVES.indexOf(k.oct);
          const wIdx = octIdx * 7 + [0,0,1,1,2,3,3,4,4,5,5,6][k.semi];
          const extra = [0,1,1,2,2,3,3,4,4,5,5,6].indexOf(k.semi % 7);
          const leftOffset = wIdx * WHITE_W + (WHITE_W - BLACK_W/2) - BLACK_W/2;
          return (
            <div key={k.midi}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); noteOn(k.midi, 0.9); setActiveKeys(p => new Set([...p, k.midi])); }}
              onMouseUp={(e) => { e.stopPropagation(); noteOff(k.midi); setActiveKeys(p => { const n = new Set(p); n.delete(k.midi); return n; }); }}
              style={{ position: 'absolute', left: leftOffset, top: 0, width: BLACK_W, height: BLACK_H,
                background: activeKeys.has(k.midi) ? '#00ffc8' : '#0d1117',
                border: '1px solid #4a5a6a', borderTop: 'none', borderRadius: '0 0 3px 3px',
                cursor: 'pointer', zIndex: 2, boxShadow: '1px 2px 3px rgba(0,0,0,0.5)' }} />
          );
        })}
      </div>
    );
  };

  const editLayer = layers.find(l => l.id === editLayerId);

  return (
    <div className="ib-root">
      {/* HEADER */}
      <div className="ib-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1rem' }}>🎸</span>
          <span className="ib-title">INSTRUMENT BUILDER</span>
          <input className="ib-name-input" value={instrName} onChange={e => setInstrName(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {status && <span style={{ fontSize: '0.6rem', color: '#00ffc8', fontFamily: 'JetBrains Mono, monospace' }}>{status}</span>}
          <button className="ib-btn ib-btn-teal" onClick={() => setShowPresets(!showPresets)}>📂</button>
          <button className="ib-btn" onClick={() => setShowSaveModal(true)}>💾</button>
          <button className="ib-btn ib-btn-orange" onClick={exportWAV} disabled={exporting}>{exporting ? '⏳' : '⬇ WAV'}</button>
          {onClose && <button className="ib-btn ib-btn-close" onClick={onClose}>✕</button>}
        </div>
      </div>

      {/* PRESETS */}
      {showPresets && savedPresets.length > 0 && (
        <div className="ib-presets">
          {savedPresets.map(p => (
            <button key={p.name} className="ib-preset-btn" onClick={() => loadPreset(p)}>{p.name}</button>
          ))}
        </div>
      )}

      <div className="ib-body">
        {/* LAYER STACK */}
        <div className="ib-layers">
          <div className="ib-layers-header">
            <span className="ib-section-label">LAYERS</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {LAYER_TYPES.map(t => (
                <button key={t} className="ib-add-btn" onClick={() => addLayer(t)}
                  style={{ borderColor: LAYER_COLORS[t] + '88', color: LAYER_COLORS[t] }}>
                  + {LAYER_ICONS[t]}
                </button>
              ))}
            </div>
          </div>

          {layers.map(layer => (
            <div key={layer.id}
              className={`ib-layer ${editLayerId === layer.id ? 'ib-layer-selected' : ''}`}
              style={{ borderColor: editLayerId === layer.id ? LAYER_COLORS[layer.type] + '88' : '#1e2d3d' }}
              onClick={() => setEditLayerId(layer.id)}>

              <div className="ib-layer-row">
                <span style={{ color: LAYER_COLORS[layer.type], fontSize: '0.8rem' }}>{LAYER_ICONS[layer.type]}</span>
                <span className="ib-layer-name" style={{ color: LAYER_COLORS[layer.type] }}>{layer.name}</span>
                {layer.type === 'sample' && layer.fileName && (
                  <span className="ib-layer-file">{layer.fileName}</span>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  <button className={`ib-mini-btn ${layer.mute ? 'ib-mini-active-red' : ''}`}
                    onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, 'mute', !layer.mute); }}>M</button>
                  <button className={`ib-mini-btn ${layer.solo ? 'ib-mini-active-teal' : ''}`}
                    onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, 'solo', !layer.solo); }}>S</button>
                  <button className={`ib-mini-btn ${layer.on ? 'ib-mini-active-teal' : ''}`}
                    onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, 'on', !layer.on); }}>●</button>
                  <button className="ib-mini-btn ib-mini-del"
                    onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); if (editLayerId === layer.id) setEditLayerId(null); }}>✕</button>
                </div>
              </div>

              <div className="ib-layer-mini-knobs" onClick={(e) => e.stopPropagation()}>
                <Knob value={layer.vol} min={0} max={1} step={0.01} onChange={v => updateLayer(layer.id, 'vol', v)} label="VOL" size={38} color={LAYER_COLORS[layer.type]} />
                <Knob value={layer.pan} min={-1} max={1} step={0.01} onChange={v => updateLayer(layer.id, 'pan', v)} label="PAN" size={38} color={LAYER_COLORS[layer.type]} />
                <Knob value={layer.attack} min={0.001} max={4} step={0.001} log onChange={v => updateLayer(layer.id, 'attack', v)} label="ATK" unit="s" size={38} color={LAYER_COLORS[layer.type]} />
                <Knob value={layer.release} min={0.01} max={8} step={0.01} log onChange={v => updateLayer(layer.id, 'release', v)} label="REL" unit="s" size={38} color={LAYER_COLORS[layer.type]} />
              </div>
            </div>
          ))}

          {layers.length === 0 && (
            <div style={{ textAlign: 'center', color: '#3a5570', fontSize: '0.65rem', padding: '20px 0' }}>
              Add a layer above to start building your instrument
            </div>
          )}
        </div>

        {/* DETAIL EDITOR */}
        <div className="ib-detail">
          {!editLayer && (
            <div style={{ textAlign: 'center', color: '#3a5570', fontSize: '0.65rem', paddingTop: 30 }}>
              Select a layer to edit its parameters
            </div>
          )}

          {editLayer && (
            <div>
              <div className="ib-section-label" style={{ marginBottom: 10, color: LAYER_COLORS[editLayer.type] }}>
                {LAYER_ICONS[editLayer.type]} {editLayer.name.toUpperCase()}
              </div>

              {/* SYNTH PARAMS */}
              {editLayer.type === 'synth' && (
                <div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                    {WAVEFORMS.map(w => (
                      <button key={w} className={`ib-pill ${editLayer.wave === w ? 'ib-pill-active' : ''}`}
                        onClick={() => updateLayer(editLayer.id, 'wave', w)}>{WAVEFORM_ICONS[w]}</button>
                    ))}
                  </div>
                  <div className="ib-knob-row">
                    <Knob value={editLayer.oct} min={-2} max={2} step={1} onChange={v => updateLayer(editLayer.id, 'oct', v)} label="OCT" size={56} color={LAYER_COLORS.synth} />
                    <Knob value={editLayer.semi} min={-12} max={12} step={1} onChange={v => updateLayer(editLayer.id, 'semi', v)} label="SEMI" size={56} color={LAYER_COLORS.synth} />
                    <Knob value={editLayer.detune} min={-100} max={100} step={1} onChange={v => updateLayer(editLayer.id, 'detune', v)} label="DETUNE" unit="¢" size={56} color={LAYER_COLORS.synth} />
                  </div>
                  <div className="ib-knob-row" style={{ marginTop: 10 }}>
                    <Knob value={editLayer.attack} min={0.001} max={4} step={0.001} log onChange={v => updateLayer(editLayer.id, 'attack', v)} label="ATK" unit="s" size={56} color={LAYER_COLORS.synth} />
                    <Knob value={editLayer.decay} min={0.01} max={4} step={0.01} log onChange={v => updateLayer(editLayer.id, 'decay', v)} label="DEC" unit="s" size={56} color={LAYER_COLORS.synth} />
                    <Knob value={editLayer.sustain} min={0} max={1} step={0.01} onChange={v => updateLayer(editLayer.id, 'sustain', v)} label="SUS" size={56} color={LAYER_COLORS.synth} />
                    <Knob value={editLayer.release} min={0.01} max={8} step={0.01} log onChange={v => updateLayer(editLayer.id, 'release', v)} label="REL" unit="s" size={56} color={LAYER_COLORS.synth} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                    <button className={`ib-pill ${editLayer.filter ? 'ib-pill-active' : ''}`}
                      onClick={() => updateLayer(editLayer.id, 'filter', !editLayer.filter)}>Filter ON</button>
                    {editLayer.filter && <>
                      {['lowpass','highpass','bandpass'].map(t => (
                        <button key={t} className={`ib-pill ${editLayer.filterType === t ? 'ib-pill-active' : ''}`}
                          onClick={() => updateLayer(editLayer.id, 'filterType', t)}>{t.slice(0,2).toUpperCase()}</button>
                      ))}
                    </>}
                  </div>
                  {editLayer.filter && (
                    <div className="ib-knob-row" style={{ marginTop: 8 }}>
                      <Knob value={editLayer.filterCutoff} min={20} max={20000} step={1} log onChange={v => updateLayer(editLayer.id, 'filterCutoff', v)} label="CUTOFF" unit="Hz" size={56} color="#5ac8fa" />
                      <Knob value={editLayer.filterRes} min={0.1} max={20} step={0.1} onChange={v => updateLayer(editLayer.id, 'filterRes', v)} label="Q" size={56} color="#5ac8fa" />
                    </div>
                  )}
                </div>
              )}

              {/* SAMPLE PARAMS */}
              {editLayer.type === 'sample' && (
                <div>
                  {!editLayer.buffer ? (
                    <div>
                      <p style={{ fontSize: '0.6rem', color: '#5a7088', marginBottom: 8 }}>Upload a WAV, MP3, or OGG file to use as this layer's sound source.</p>
                      <label className="ib-upload-btn">
                        📁 Load Sample File
                        <input type="file" accept="audio/*" style={{ display: 'none' }}
                          onChange={(e) => { if (e.target.files[0]) loadSampleFile(editLayer.id, e.target.files[0]); }} />
                      </label>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '0.6rem', color: '#00ffc8', marginBottom: 10 }}>✓ {editLayer.fileName}</p>
                      <div className="ib-knob-row">
                        <Knob value={editLayer.pitch} min={-24} max={24} step={1} onChange={v => updateLayer(editLayer.id, 'pitch', v)} label="PITCH" unit="st" size={56} color={LAYER_COLORS.sample} />
                        <Knob value={editLayer.rootNote} min={0} max={127} step={1} onChange={v => updateLayer(editLayer.id, 'rootNote', v)} label="ROOT" size={56} color={LAYER_COLORS.sample} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button className={`ib-pill ${editLayer.loopOn ? 'ib-pill-active' : ''}`}
                          onClick={() => updateLayer(editLayer.id, 'loopOn', !editLayer.loopOn)}>LOOP</button>
                        <button className={`ib-pill ${editLayer.reverse ? 'ib-pill-active' : ''}`}
                          onClick={() => updateLayer(editLayer.id, 'reverse', !editLayer.reverse)}>REVERSE</button>
                        <label className="ib-upload-btn" style={{ padding: '3px 8px', fontSize: '0.55rem' }}>
                          🔁 Replace
                          <input type="file" accept="audio/*" style={{ display: 'none' }}
                            onChange={(e) => { if (e.target.files[0]) loadSampleFile(editLayer.id, e.target.files[0]); }} />
                        </label>
                      </div>
                      <div className="ib-knob-row" style={{ marginTop: 10 }}>
                        <Knob value={editLayer.attack} min={0.001} max={4} step={0.001} log onChange={v => updateLayer(editLayer.id, 'attack', v)} label="ATK" unit="s" size={56} color={LAYER_COLORS.sample} />
                        <Knob value={editLayer.decay} min={0.01} max={4} step={0.01} log onChange={v => updateLayer(editLayer.id, 'decay', v)} label="DEC" unit="s" size={56} color={LAYER_COLORS.sample} />
                        <Knob value={editLayer.sustain} min={0} max={1} step={0.01} onChange={v => updateLayer(editLayer.id, 'sustain', v)} label="SUS" size={56} color={LAYER_COLORS.sample} />
                        <Knob value={editLayer.release} min={0.01} max={8} step={0.01} log onChange={v => updateLayer(editLayer.id, 'release', v)} label="REL" unit="s" size={56} color={LAYER_COLORS.sample} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUB PARAMS */}
              {editLayer.type === 'sub' && (
                <div className="ib-knob-row">
                  <Knob value={editLayer.oct} min={-3} max={-1} step={1} onChange={v => updateLayer(editLayer.id, 'oct', v)} label="OCT" size={56} color={LAYER_COLORS.sub} />
                  <Knob value={editLayer.attack} min={0.001} max={0.5} step={0.001} log onChange={v => updateLayer(editLayer.id, 'attack', v)} label="ATK" unit="s" size={56} color={LAYER_COLORS.sub} />
                  <Knob value={editLayer.release} min={0.01} max={4} step={0.01} log onChange={v => updateLayer(editLayer.id, 'release', v)} label="REL" unit="s" size={56} color={LAYER_COLORS.sub} />
                </div>
              )}

              {/* NOISE PARAMS */}
              {editLayer.type === 'noise' && (
                <div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                    {NOISE_TYPES.map(t => (
                      <button key={t} className={`ib-pill ${editLayer.noiseType === t ? 'ib-pill-active' : ''}`}
                        onClick={() => updateLayer(editLayer.id, 'noiseType', t)}>{t}</button>
                    ))}
                  </div>
                  <div className="ib-knob-row">
                    <Knob value={editLayer.attack} min={0.001} max={2} step={0.001} log onChange={v => updateLayer(editLayer.id, 'attack', v)} label="ATK" unit="s" size={56} color={LAYER_COLORS.noise} />
                    <Knob value={editLayer.decay} min={0.01} max={4} step={0.01} log onChange={v => updateLayer(editLayer.id, 'decay', v)} label="DEC" unit="s" size={56} color={LAYER_COLORS.noise} />
                    <Knob value={editLayer.sustain} min={0} max={1} step={0.01} onChange={v => updateLayer(editLayer.id, 'sustain', v)} label="SUS" size={56} color={LAYER_COLORS.noise} />
                    <Knob value={editLayer.release} min={0.01} max={4} step={0.01} log onChange={v => updateLayer(editLayer.id, 'release', v)} label="REL" unit="s" size={56} color={LAYER_COLORS.noise} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                    <button className={`ib-pill ${editLayer.filter ? 'ib-pill-active' : ''}`}
                      onClick={() => updateLayer(editLayer.id, 'filter', !editLayer.filter)}>Filter ON</button>
                    {editLayer.filter && (
                      <div className="ib-knob-row" style={{ marginTop: 6 }}>
                        <Knob value={editLayer.filterCutoff} min={100} max={16000} step={10} log onChange={v => updateLayer(editLayer.id, 'filterCutoff', v)} label="CUTOFF" unit="Hz" size={56} color="#5ac8fa" />
                        <Knob value={editLayer.filterRes} min={0.1} max={20} step={0.1} onChange={v => updateLayer(editLayer.id, 'filterRes', v)} label="Q" size={56} color="#5ac8fa" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MASTER FX */}
          <div style={{ marginTop: 16 }}>
            <div className="ib-section-label">MASTER FX</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {/* Chorus */}
              <div className="ib-fx-block">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                  <button className={`ib-pill ${fx.chorus.on ? 'ib-pill-active' : ''}`} onClick={() => setFx(f => ({ ...f, chorus: { ...f.chorus, on: !f.chorus.on } }))}>Chorus</button>
                </div>
                {fx.chorus.on && <div className="ib-knob-row">
                  <Knob value={fx.chorus.rate} min={0.1} max={10} step={0.1} onChange={v => setFx(f => ({ ...f, chorus: { ...f.chorus, rate: v } }))} label="RATE" unit="Hz" size={38} color="#34d399" />
                  <Knob value={fx.chorus.mix} min={0} max={1} step={0.01} onChange={v => setFx(f => ({ ...f, chorus: { ...f.chorus, mix: v } }))} label="MIX" size={38} color="#34d399" />
                </div>}
              </div>
              {/* Delay */}
              <div className="ib-fx-block">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                  <button className={`ib-pill ${fx.delay.on ? 'ib-pill-active' : ''}`} onClick={() => setFx(f => ({ ...f, delay: { ...f.delay, on: !f.delay.on } }))}>Delay</button>
                </div>
                {fx.delay.on && <div className="ib-knob-row">
                  <Knob value={fx.delay.time} min={0.01} max={2} step={0.01} onChange={v => setFx(f => ({ ...f, delay: { ...f.delay, time: v } }))} label="TIME" unit="s" size={38} color="#fb923c" />
                  <Knob value={fx.delay.feedback} min={0} max={0.9} step={0.01} onChange={v => setFx(f => ({ ...f, delay: { ...f.delay, feedback: v } }))} label="FB" size={38} color="#fb923c" />
                  <Knob value={fx.delay.mix} min={0} max={1} step={0.01} onChange={v => setFx(f => ({ ...f, delay: { ...f.delay, mix: v } }))} label="MIX" size={38} color="#fb923c" />
                </div>}
              </div>
              {/* Reverb */}
              <div className="ib-fx-block">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                  <button className={`ib-pill ${fx.reverb.on ? 'ib-pill-active' : ''}`} onClick={() => setFx(f => ({ ...f, reverb: { ...f.reverb, on: !f.reverb.on } }))}>Reverb</button>
                </div>
                {fx.reverb.on && <div className="ib-knob-row">
                  <Knob value={fx.reverb.decay} min={0.1} max={10} step={0.1} onChange={v => setFx(f => ({ ...f, reverb: { ...f.reverb, decay: v } }))} label="DECAY" unit="s" size={38} color="#a78bfa" />
                  <Knob value={fx.reverb.mix} min={0} max={1} step={0.01} onChange={v => setFx(f => ({ ...f, reverb: { ...f.reverb, mix: v } }))} label="MIX" size={38} color="#a78bfa" />
                </div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KEYBOARD */}
      <div className="ib-keyboard-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: '0.55rem', color: '#4a6080', fontFamily: 'JetBrains Mono, monospace' }}>OCT {3+octaveShift}–{5+octaveShift}</span>
          <button className="ib-btn" onClick={() => setOctaveShift(o => Math.max(-2, o-1))}>◀</button>
          <button className="ib-btn" onClick={() => setOctaveShift(o => Math.min(2, o+1))}>▶</button>
        </div>
        <div style={{ overflowX: 'auto' }}>{renderKeyboard()}</div>
      </div>

      {/* SAVE MODAL */}
      {showSaveModal && (
        <div className="ib-modal-backdrop">
          <div className="ib-modal">
            <h3 style={{ color: '#00ffc8', marginBottom: 10, fontSize: '0.8rem' }}>💾 Save Instrument</h3>
            <input className="ib-input" placeholder="Name..." value={saveName || instrName} onChange={e => setSaveName(e.target.value)} autoFocus />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="ib-btn ib-btn-teal" onClick={savePreset}>Save</button>
              <button className="ib-btn" onClick={() => setShowSaveModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstrumentBuilder;
