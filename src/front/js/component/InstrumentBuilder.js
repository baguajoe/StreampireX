// =============================================================================
// InstrumentBuilder.js — Custom Instrument Layer Builder
// Location: src/front/js/component/InstrumentBuilder.js
// NEW: Layer solo/mute/on, sample upload, per-layer ADSR+filter,
//      master FX (reverb/delay/chorus), WAV export, QWERTY keyboard,
//      preset save/load, assign to track/pad
// =============================================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import '../../styles/InstrumentBuilder.css';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const WAVEFORMS    = ['sine', 'sawtooth', 'square', 'triangle'];
const WAVE_ICONS   = { sine: '∿', sawtooth: '⋀', square: '⊓', triangle: '△' };
const NOISE_TYPES  = ['white', 'pink', 'brown'];
const LAYER_TYPES  = ['synth', 'sample', 'sub', 'noise'];

const LAYER_COLORS = { synth: '#00e5ff', sample: '#5ac8fa', sub: '#ff6b35', noise: '#a78bfa' };
const LAYER_ICONS  = { synth: '◎', sample: '♪', sub: '◉', noise: '≋' };
const LAYER_LABELS = { synth: 'SYNTH', sample: 'SAMPLE', sub: 'SUB', noise: 'NOISE' };

const getFreq = midi => 440 * Math.pow(2, (midi - 69) / 12);

const KEY_MAP = {
  'z':48,'s':49,'x':50,'d':51,'c':52,'v':53,'g':54,'b':55,'h':56,'n':57,'j':58,'m':59,
  'q':60,'2':61,'w':62,'3':63,'e':64,'r':65,'5':66,'t':67,'6':68,'y':69,'7':70,'u':71,'i':72,
};

const DEFAULT_SYNTH_LAYER = () => ({
  id: `l_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  type: 'synth', on: true, mute: false, solo: false,
  name: 'Synth Layer',
  wave: 'sawtooth', oct: 0, semi: 0, detune: 0,
  vol: 0.7, pan: 0,
  attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.4,
  filterOn: false, filterType: 'lowpass', filterCutoff: 4000, filterRes: 1,
});

const DEFAULT_SAMPLE_LAYER = () => ({
  id: `l_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  type: 'sample', on: true, mute: false, solo: false,
  name: 'Sample Layer',
  buffer: null, fileName: null,
  vol: 0.8, pan: 0, pitch: 0, rootNote: 60,
  attack: 0.005, decay: 0.1, sustain: 1.0, release: 0.5,
  loopOn: false, reverse: false,
});

const DEFAULT_SUB_LAYER = () => ({
  id: `l_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  type: 'sub', on: true, mute: false, solo: false,
  name: 'Sub Layer',
  oct: -1, vol: 0.5, pan: 0,
  attack: 0.005, decay: 0.1, sustain: 0.8, release: 0.3,
});

const DEFAULT_NOISE_LAYER = () => ({
  id: `l_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  type: 'noise', on: true, mute: false, solo: false,
  name: 'Noise Layer',
  noiseType: 'white', vol: 0.15, pan: 0,
  attack: 0.01, decay: 0.2, sustain: 0.0, release: 0.1,
  filterOn: true, filterType: 'bandpass', filterCutoff: 3000, filterRes: 2,
});

const DEFAULT_FX = {
  reverb: { on: false, decay: 2, mix: 0.25 },
  delay:  { on: false, time: 0.375, feedback: 0.35, mix: 0.25 },
  chorus: { on: false, rate: 1, depth: 0.003, mix: 0.3 },
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function buildNoiseBuf(ctx, type = 'white', dur = 2) {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  if (type === 'white') {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } else if (type === 'pink') {
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
      b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
      b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
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
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len,1.5);
  }
  return buf;
}

// ─────────────────────────────────────────────────────────────────────────────
// KNOB
// ─────────────────────────────────────────────────────────────────────────────

const Knob = ({ value, min, max, step=0.01, onChange, label, unit='', size=48, color='#00e5ff', log=false, bipolar=false }) => {
  const drag=useRef(false), sy=useRef(0), sv=useRef(0);
  const toN = v => bipolar ? (v-min)/(max-min) : log
    ? Math.log(Math.max(v,1e-4)/Math.max(min,1e-4))/Math.log(Math.max(max,1e-4)/Math.max(min,1e-4))
    : (v-min)/(max-min);
  const frN = n => bipolar ? min+n*(max-min) : log ? min*Math.pow(max/min,n) : min+n*(max-min);
  const angle = -135 + toN(value)*270;
  const onMD = e => {
    e.preventDefault(); drag.current=true; sy.current=e.clientY; sv.current=value;
    const mv = me => {
      if (!drag.current) return;
      let nn=Math.max(0,Math.min(1,toN(sv.current)+(sy.current-me.clientY)/130));
      let nv=frN(nn); if(step) nv=Math.round(nv/step)*step;
      onChange(Math.max(min,Math.min(max,nv)));
    };
    const up = () => { drag.current=false; window.removeEventListener('mousemove',mv); window.removeEventListener('mouseup',up); };
    window.addEventListener('mousemove',mv); window.addEventListener('mouseup',up);
  };
  const onDbl = e => { e.preventDefault(); onChange(bipolar?0:log?Math.sqrt(min*max):(min+max)/2); };
  const disp = () => {
    if (Math.abs(value)>=1000) return `${(value/1000).toFixed(1)}k`;
    if (step<0.1) return value.toFixed(2);
    if (step<1) return value.toFixed(1);
    return Math.round(value);
  };
  const r=size/2-4, cx=size/2, cy=size/2;
  const rad = d => (d-90)*Math.PI/180;
  const ap = (a1,a2) => {
    const x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1),x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2);
    const lg=(a2-a1+Math.PI*2)%(Math.PI*2)>Math.PI?1:0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2}`;
  };
  const dR = rad(angle);
  const uid = `ibkg_${label}_${size}`.replace(/\W/g,'_');
  return (
    <div className="ib-knob-wrap">
      <svg width={size} height={size} onMouseDown={onMD} onDoubleClick={onDbl} className="ib-knob-svg">
        <defs><radialGradient id={uid} cx="38%" cy="32%">
          <stop offset="0%" stopColor="#1e3555"/><stop offset="100%" stopColor="#070f1c"/>
        </radialGradient></defs>
        <path d={ap(rad(-135),rad(135))} fill="none" stroke="#07101c" strokeWidth="4" strokeLinecap="round"/>
        <path d={ap(rad(-135),rad(angle))} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"
          style={{filter:`drop-shadow(0 0 4px ${color}99)`}}/>
        <circle cx={cx} cy={cy} r={size/2-10} fill={`url(#${uid})`} stroke="#1a2d45" strokeWidth="1.5"/>
        <circle cx={cx+(r-4)*Math.cos(dR)} cy={cy+(r-4)*Math.sin(dR)} r="2.5" fill={color}
          style={{filter:`drop-shadow(0 0 5px ${color})`}}/>
      </svg>
      <div className="ib-knob-label">{label}</div>
      <div className="ib-knob-value" style={{color}}>{disp()}{unit}</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LED TOGGLE
// ─────────────────────────────────────────────────────────────────────────────

const LEDToggle = ({ value, onChange, label, color='#00e5ff' }) => (
  <button className={`ib-led-toggle ${value?'active':''}`} style={{'--led-color':color}} onClick={()=>onChange(!value)}>
    <span className="ib-led-dot"/>{label}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// PILL GROUP
// ─────────────────────────────────────────────────────────────────────────────

const PillGroup = ({ options, value, onChange, color='#00e5ff' }) => (
  <div className="ib-pill-group">
    {options.map(opt => {
      const v=opt.value||opt, l=opt.label||opt;
      return <button key={v} className={`ib-pill ${value===v?'active':''}`}
        style={{'--panel-color':color}} onClick={()=>onChange(v)}>{l}</button>;
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// PANEL BOX
// ─────────────────────────────────────────────────────────────────────────────

const Panel = ({ title, color='#00e5ff', children, right }) => (
  <div className="ib-panel-box" style={{'--panel-color':color}}>
    <div className="ib-panel-header">
      <div className="ib-panel-title">
        <span className="ib-panel-bar"/>
        {title}
      </div>
      {right && <div className="ib-panel-right">{right}</div>}
    </div>
    <div className="ib-panel-body">{children}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// LAYER CARD
// ─────────────────────────────────────────────────────────────────────────────

const LayerCard = ({ layer, selected, onSelect, onUpdate, onRemove, color }) => {
  const lc = color || LAYER_COLORS[layer.type];
  return (
    <div
      className={`ib-layer ${selected ? 'selected' : ''}`}
      style={{ '--layer-color': lc }}
      onClick={onSelect}
    >
      <div className="ib-layer-top">
        <span className="ib-layer-icon" style={{ color: lc }}>{LAYER_ICONS[layer.type]}</span>
        <span className="ib-layer-name" style={{ color: lc }}>{layer.name}</span>
        {layer.type === 'sample' && layer.fileName && (
          <span className="ib-layer-file">{layer.fileName}</span>
        )}
        <div className="ib-layer-controls" onClick={e => e.stopPropagation()}>
          <button className={`ib-mini-btn ${layer.mute ? 'muted' : ''}`}
            onClick={() => onUpdate('mute', !layer.mute)} title="Mute">M</button>
          <button className={`ib-mini-btn ${layer.solo ? 'soloed' : ''}`}
            onClick={() => onUpdate('solo', !layer.solo)} title="Solo">S</button>
          <button className={`ib-mini-btn ${layer.on ? 'on' : ''}`}
            onClick={() => onUpdate('on', !layer.on)} title="On/Off">●</button>
          <button className="ib-mini-btn del" onClick={onRemove} title="Remove">✕</button>
        </div>
      </div>
      {/* Mini knobs always visible */}
      <div className="ib-layer-knobs" onClick={e => e.stopPropagation()}>
        <Knob value={layer.vol} min={0} max={1} step={0.01}
          onChange={v => onUpdate('vol', v)} label="VOL" size={38} color={lc}/>
        <Knob value={layer.pan} min={-1} max={1} step={0.01}
          onChange={v => onUpdate('pan', v)} label="PAN" size={38} color={lc} bipolar/>
        <Knob value={layer.attack} min={0.001} max={4} step={0.001} log
          onChange={v => onUpdate('attack', v)} label="ATK" unit="s" size={38} color={lc}/>
        <Knob value={layer.release} min={0.01} max={8} step={0.01} log
          onChange={v => onUpdate('release', v)} label="REL" unit="s" size={38} color={lc}/>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL EDITOR
// ─────────────────────────────────────────────────────────────────────────────

const LayerDetail = ({ layer, onUpdate, color }) => {
  const lc = color || LAYER_COLORS[layer.type];

  if (layer.type === 'synth') return (
    <div>
      <div className="ib-wave-group" style={{ marginBottom: 12 }}>
        {WAVEFORMS.map(w => (
          <button key={w} className={`ib-wave-btn ${layer.wave===w?'active':''}`}
            style={{ '--panel-color': lc }} onClick={() => onUpdate('wave', w)}>
            <span>{WAVE_ICONS[w]}</span>
          </button>
        ))}
      </div>
      <div className="ib-knob-row">
        <Knob value={layer.oct} min={-2} max={2} step={1} onChange={v=>onUpdate('oct',v)} label="OCT" size={52} color={lc} bipolar/>
        <Knob value={layer.semi} min={-12} max={12} step={1} onChange={v=>onUpdate('semi',v)} label="SEMI" size={52} color={lc} bipolar/>
        <Knob value={layer.detune} min={-100} max={100} step={1} onChange={v=>onUpdate('detune',v)} label="DETUNE" unit="¢" size={52} color={lc} bipolar/>
      </div>
      <div className="ib-knob-row" style={{ marginTop: 12 }}>
        <Knob value={layer.attack} min={0.001} max={4} step={0.001} log onChange={v=>onUpdate('attack',v)} label="ATTACK" unit="s" size={52} color={lc}/>
        <Knob value={layer.decay} min={0.01} max={4} step={0.01} log onChange={v=>onUpdate('decay',v)} label="DECAY" unit="s" size={52} color={lc}/>
        <Knob value={layer.sustain} min={0} max={1} step={0.01} onChange={v=>onUpdate('sustain',v)} label="SUSTAIN" size={52} color={lc}/>
        <Knob value={layer.release} min={0.01} max={8} step={0.01} log onChange={v=>onUpdate('release',v)} label="RELEASE" unit="s" size={52} color={lc}/>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <LEDToggle value={layer.filterOn} onChange={v=>onUpdate('filterOn',v)} label="FILTER" color={lc}/>
        {layer.filterOn && <>
          <PillGroup options={['lowpass','highpass','bandpass'].map(t=>({label:t.slice(0,2).toUpperCase(),value:t}))}
            value={layer.filterType} onChange={v=>onUpdate('filterType',v)} color={lc}/>
          <Knob value={layer.filterCutoff} min={20} max={20000} step={1} log onChange={v=>onUpdate('filterCutoff',v)} label="CUTOFF" unit="Hz" size={48} color="#5ac8fa"/>
          <Knob value={layer.filterRes} min={0.1} max={20} step={0.1} onChange={v=>onUpdate('filterRes',v)} label="Q" size={48} color="#5ac8fa"/>
        </>}
      </div>
    </div>
  );

  if (layer.type === 'sample') return (
    <div>
      {!layer.buffer ? (
        <div>
          <p style={{ fontSize: '0.62rem', color: '#4a6a88', marginBottom: 10, lineHeight: 1.5 }}>
            Upload a WAV, MP3, or OGG file to use as this layer's sound source.
          </p>
          <label className="ib-upload-btn">
            ◫ LOAD SAMPLE FILE
            <input type="file" accept="audio/*" style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) onUpdate('__file__', e.target.files[0]); }}/>
          </label>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '0.62rem', color: '#00ffcc', marginBottom: 10 }}>✓ {layer.fileName}</div>
          <div className="ib-knob-row">
            <Knob value={layer.pitch} min={-24} max={24} step={1} onChange={v=>onUpdate('pitch',v)} label="PITCH" unit="st" size={52} color={lc} bipolar/>
            <Knob value={layer.rootNote} min={0} max={127} step={1} onChange={v=>onUpdate('rootNote',v)} label="ROOT" size={52} color={lc}/>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <LEDToggle value={layer.loopOn} onChange={v=>onUpdate('loopOn',v)} label="LOOP" color={lc}/>
            <LEDToggle value={layer.reverse} onChange={v=>onUpdate('reverse',v)} label="REVERSE" color={lc}/>
            <label className="ib-upload-btn" style={{ padding: '4px 10px', fontSize: '0.55rem' }}>
              ↺ REPLACE
              <input type="file" accept="audio/*" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) onUpdate('__file__', e.target.files[0]); }}/>
            </label>
          </div>
          <div className="ib-knob-row" style={{ marginTop: 12 }}>
            <Knob value={layer.attack} min={0.001} max={4} step={0.001} log onChange={v=>onUpdate('attack',v)} label="ATTACK" unit="s" size={52} color={lc}/>
            <Knob value={layer.decay} min={0.01} max={4} step={0.01} log onChange={v=>onUpdate('decay',v)} label="DECAY" unit="s" size={52} color={lc}/>
            <Knob value={layer.sustain} min={0} max={1} step={0.01} onChange={v=>onUpdate('sustain',v)} label="SUSTAIN" size={52} color={lc}/>
            <Knob value={layer.release} min={0.01} max={8} step={0.01} log onChange={v=>onUpdate('release',v)} label="RELEASE" unit="s" size={52} color={lc}/>
          </div>
        </div>
      )}
    </div>
  );

  if (layer.type === 'sub') return (
    <div className="ib-knob-row">
      <Knob value={layer.oct} min={-3} max={-1} step={1} onChange={v=>onUpdate('oct',v)} label="OCT" size={52} color={lc}/>
      <Knob value={layer.attack} min={0.001} max={0.5} step={0.001} log onChange={v=>onUpdate('attack',v)} label="ATTACK" unit="s" size={52} color={lc}/>
      <Knob value={layer.decay} min={0.01} max={2} step={0.01} log onChange={v=>onUpdate('decay',v)} label="DECAY" unit="s" size={52} color={lc}/>
      <Knob value={layer.sustain} min={0} max={1} step={0.01} onChange={v=>onUpdate('sustain',v)} label="SUSTAIN" size={52} color={lc}/>
      <Knob value={layer.release} min={0.01} max={4} step={0.01} log onChange={v=>onUpdate('release',v)} label="RELEASE" unit="s" size={52} color={lc}/>
    </div>
  );

  if (layer.type === 'noise') return (
    <div>
      <PillGroup options={NOISE_TYPES} value={layer.noiseType} onChange={v=>onUpdate('noiseType',v)} color={lc}/>
      <div className="ib-knob-row" style={{ marginTop: 12 }}>
        <Knob value={layer.attack} min={0.001} max={2} step={0.001} log onChange={v=>onUpdate('attack',v)} label="ATTACK" unit="s" size={52} color={lc}/>
        <Knob value={layer.decay} min={0.01} max={4} step={0.01} log onChange={v=>onUpdate('decay',v)} label="DECAY" unit="s" size={52} color={lc}/>
        <Knob value={layer.sustain} min={0} max={1} step={0.01} onChange={v=>onUpdate('sustain',v)} label="SUSTAIN" size={52} color={lc}/>
        <Knob value={layer.release} min={0.01} max={4} step={0.01} log onChange={v=>onUpdate('release',v)} label="RELEASE" unit="s" size={52} color={lc}/>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <LEDToggle value={layer.filterOn} onChange={v=>onUpdate('filterOn',v)} label="FILTER" color={lc}/>
        {layer.filterOn && <>
          <PillGroup options={['lowpass','highpass','bandpass'].map(t=>({label:t.slice(0,2).toUpperCase(),value:t}))}
            value={layer.filterType} onChange={v=>onUpdate('filterType',v)} color={lc}/>
          <Knob value={layer.filterCutoff} min={100} max={16000} step={10} log onChange={v=>onUpdate('filterCutoff',v)} label="CUTOFF" unit="Hz" size={48} color="#5ac8fa"/>
          <Knob value={layer.filterRes} min={0.1} max={20} step={0.1} onChange={v=>onUpdate('filterRes',v)} label="Q" size={48} color="#5ac8fa"/>
        </>}
      </div>
    </div>
  );

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const InstrumentBuilder = ({ onClose, onAssignToPad, onAssignToTrack }) => {
  const [layers, setLayers]         = useState([DEFAULT_SYNTH_LAYER()]);
  const [fx, setFx]                 = useState({ ...DEFAULT_FX });
  const [instrName, setInstrName]   = useState('My Instrument');
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [savedPresets, setSavedPresets] = useState([]);
  const [showPresets, setShowPresets]   = useState(false);
  const [octaveShift, setOctaveShift]   = useState(0);
  const [exporting, setExporting]   = useState(false);
  const [status, setStatus]         = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName]     = useState('');
  const [editLayerId, setEditLayerId] = useState(null);

  const ctxRef        = useRef(null);
  const activeVoices  = useRef({});
  const fxInputRef    = useRef(null);
  const heldKeys      = useRef(new Set());
  const layersRef     = useRef(layers);
  const fxRef         = useRef(fx);
  layersRef.current   = layers;
  fxRef.current       = fx;

  const getCtx = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  };

  const toast = m => { setStatus(m); setTimeout(() => setStatus(''), 2500); };

  // Load saved presets
  useEffect(() => {
    try { const r = localStorage.getItem('spx_instr_presets'); if (r) setSavedPresets(JSON.parse(r)); } catch (e) {}
  }, []);

  // Build FX chain → fxInputRef
  const buildFXChain = useCallback((ctx) => {
    const f = fxRef.current;
    const input = ctx.createGain(); let last = input;

    if (f.chorus.on) {
      const dry=ctx.createGain();dry.gain.value=1-f.chorus.mix;
      const wet=ctx.createGain();wet.gain.value=f.chorus.mix;
      const dl=ctx.createDelay(0.05);dl.delayTime.value=f.chorus.depth;
      const lfo=ctx.createOscillator();lfo.frequency.value=f.chorus.rate;
      const lg=ctx.createGain();lg.gain.value=f.chorus.depth*0.5;
      lfo.connect(lg);lg.connect(dl.delayTime);lfo.start();
      const m=ctx.createGain();last.connect(dry);dry.connect(m);last.connect(dl);dl.connect(wet);wet.connect(m);last=m;
    }
    if (f.delay.on) {
      const dry=ctx.createGain();dry.gain.value=1;
      const wet=ctx.createGain();wet.gain.value=f.delay.mix;
      const dl=ctx.createDelay(5);dl.delayTime.value=f.delay.time;
      const fb=ctx.createGain();fb.gain.value=Math.min(0.9,f.delay.feedback);
      dl.connect(fb);fb.connect(dl);
      const m=ctx.createGain();last.connect(dry);dry.connect(m);last.connect(dl);dl.connect(wet);wet.connect(m);last=m;
    }
    if (f.reverb.on) {
      const ir=buildReverbIR(ctx,f.reverb.decay);
      const conv=ctx.createConvolver();conv.buffer=ir;
      const dry=ctx.createGain();dry.gain.value=1-f.reverb.mix;
      const wet=ctx.createGain();wet.gain.value=f.reverb.mix;
      const m=ctx.createGain();last.connect(dry);dry.connect(m);last.connect(conv);conv.connect(wet);wet.connect(m);last=m;
    }
    last.connect(ctx.destination);
    fxInputRef.current = input;
  }, []);

  // Rebuild FX when it changes
  useEffect(() => {
    if (ctxRef.current) {
      if (fxInputRef.current) { try { fxInputRef.current.disconnect(); } catch (e) {} fxInputRef.current = null; }
      buildFXChain(ctxRef.current);
    }
  }, [fx, buildFXChain]);

  // Note on
  const noteOn = useCallback((midi, velocity = 0.8) => {
    const ctx = getCtx();
    if (!fxInputRef.current) buildFXChain(ctx);
    const dest = fxInputRef.current;
    const freq = getFreq(midi);
    const now = ctx.currentTime;
    const currentLayers = layersRef.current;
    const hasSolo = currentLayers.some(l => l.solo && l.on);

    // Stop previous voice on this note
    if (activeVoices.current[midi]) {
      activeVoices.current[midi].forEach(n => { try { if (n.stop) n.stop(); n.disconnect(); } catch (e) {} });
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
      const pan = ctx.createStereoPanner(); pan.pan.value = layer.pan || 0;
      layerGain.connect(pan); pan.connect(dest);
      voiceNodes.push(layerGain, pan);

      if (layer.type === 'synth') {
        const osc = ctx.createOscillator(); osc.type = layer.wave;
        osc.frequency.value = freq * Math.pow(2, layer.oct) * Math.pow(2, layer.semi / 12);
        osc.detune.value = layer.detune || 0;
        let chain = osc;
        if (layer.filterOn) {
          const filt = ctx.createBiquadFilter();
          filt.type = layer.filterType; filt.frequency.value = layer.filterCutoff; filt.Q.value = layer.filterRes;
          chain.connect(filt); chain = filt; voiceNodes.push(filt);
        }
        chain.connect(layerGain); osc.start(now); voiceNodes.push(osc);

      } else if (layer.type === 'sample') {
        if (!layer.buffer) return;
        const src = ctx.createBufferSource();
        src.buffer = layer.buffer;
        src.playbackRate.value = Math.pow(2, (midi - layer.rootNote + (layer.pitch || 0)) / 12);
        src.loop = layer.loopOn || false;
        src.connect(layerGain); src.start(now); voiceNodes.push(src);

      } else if (layer.type === 'sub') {
        const osc = ctx.createOscillator(); osc.type = 'sine';
        osc.frequency.value = freq * Math.pow(2, layer.oct);
        osc.connect(layerGain); osc.start(now); voiceNodes.push(osc);

      } else if (layer.type === 'noise') {
        const nBuf = buildNoiseBuf(ctx, layer.noiseType, 2);
        const ns = ctx.createBufferSource(); ns.buffer = nBuf; ns.loop = true;
        let chain = ns;
        if (layer.filterOn) {
          const filt = ctx.createBiquadFilter();
          filt.type = layer.filterType; filt.frequency.value = layer.filterCutoff; filt.Q.value = layer.filterRes;
          chain.connect(filt); chain = filt; voiceNodes.push(filt);
        }
        chain.connect(layerGain); ns.start(now); voiceNodes.push(ns);
      }
    });

    activeVoices.current[midi] = voiceNodes;
  }, [buildFXChain]);

  // Note off
  const noteOff = useCallback((midi) => {
    const nodes = activeVoices.current[midi]; if (!nodes) return;
    const ctx = getCtx(); const now = ctx.currentTime;
    const maxRelease = Math.max(...layersRef.current.map(l => l.on ? (l.release || 0.3) : 0), 0.2);
    nodes.forEach(node => {
      if (node instanceof GainNode) {
        node.gain.cancelScheduledValues(now);
        node.gain.setValueAtTime(node.gain.value, now);
        node.gain.linearRampToValueAtTime(0, now + maxRelease);
      }
    });
    setTimeout(() => {
      nodes.forEach(n => { try { if (n.stop) n.stop(); n.disconnect(); } catch (e) {} });
      delete activeVoices.current[midi];
    }, (maxRelease + 0.1) * 1000);
  }, []);

  // QWERTY keyboard
  useEffect(() => {
    const dn = e => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const k = e.key.toLowerCase(); if (heldKeys.current.has(k)) return;
      if (KEY_MAP[k] != null) {
        heldKeys.current.add(k);
        const midi = KEY_MAP[k] + octaveShift * 12;
        noteOn(midi); setActiveKeys(p => new Set([...p, midi]));
      }
    };
    const up = e => {
      const k = e.key.toLowerCase(); heldKeys.current.delete(k);
      if (KEY_MAP[k] != null) {
        const midi = KEY_MAP[k] + octaveShift * 12;
        noteOff(midi); setActiveKeys(p => { const n = new Set(p); n.delete(midi); return n; });
      }
    };
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, [noteOn, noteOff, octaveShift]);

  // Layer helpers
  const addLayer = type => {
    const defaults = { synth: DEFAULT_SYNTH_LAYER, sample: DEFAULT_SAMPLE_LAYER, sub: DEFAULT_SUB_LAYER, noise: DEFAULT_NOISE_LAYER };
    const nl = defaults[type]();
    setLayers(l => [...l, nl]);
    setEditLayerId(nl.id);
  };

  const removeLayer = id => {
    setLayers(l => l.filter(x => x.id !== id));
    if (editLayerId === id) setEditLayerId(null);
  };

  const updateLayer = (id, key, val) => {
    if (key === '__file__') {
      // Handle audio file upload
      const ctx = getCtx();
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          const buf = await ctx.decodeAudioData(e.target.result);
          setLayers(l => l.map(x => x.id === id ? { ...x, buffer: buf, fileName: val.name, name: val.name.replace(/\.[^/.]+$/, '').slice(0, 22) } : x));
        } catch (err) { toast('✗ Could not decode audio file'); }
      };
      reader.readAsArrayBuffer(val);
      return;
    }
    setLayers(l => l.map(x => x.id === id ? { ...x, [key]: val } : x));
  };

  const setFxParam = (fxKey, key, val) => setFx(f => ({ ...f, [fxKey]: { ...f[fxKey], [key]: val } }));

  // Presets
  const savePreset = () => {
    const name = (saveName.trim() || instrName);
    const saveLayers = layers.map(l => ({ ...l, buffer: null })); // can't serialize AudioBuffers
    const entry = { name, layers: saveLayers, fx: JSON.parse(JSON.stringify(fx)), savedAt: Date.now() };
    const updated = [...savedPresets.filter(p => p.name !== name), entry];
    setSavedPresets(updated);
    try { localStorage.setItem('spx_instr_presets', JSON.stringify(updated)); } catch (e) {}
    setInstrName(name); setShowSaveModal(false); setSaveName('');
    toast('✓ Saved');
  };

  const loadPreset = preset => {
    setLayers(preset.layers.map(l => ({ ...l, buffer: null, id: `l_${Date.now()}_${Math.random().toString(36).slice(2,6)}` })));
    setFx(preset.fx || DEFAULT_FX);
    setInstrName(preset.name);
    setShowPresets(false);
    setEditLayerId(null);
  };

  const deletePreset = name => {
    const u = savedPresets.filter(p => p.name !== name);
    setSavedPresets(u);
    try { localStorage.setItem('spx_instr_presets', JSON.stringify(u)); } catch (e) {}
  };

  // Export WAV (plays C4 chord for 2.5s)
  const exportWAV = async () => {
    setExporting(true);
    try {
      const dur = 3;
      const offCtx = new OfflineAudioContext(2, Math.floor(44100 * dur), 44100);
      const dest = offCtx.destination;
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
            osc.detune.value = layer.detune || 0;
            osc.connect(lg); osc.start(t); osc.stop(dur);
          } else if (layer.type === 'sub') {
            const osc = offCtx.createOscillator(); osc.type = 'sine';
            osc.frequency.value = freq * Math.pow(2, layer.oct);
            osc.connect(lg); osc.start(t); osc.stop(dur);
          } else if (layer.type === 'noise') {
            const nb = buildNoiseBuf(offCtx, layer.noiseType, dur);
            const ns = offCtx.createBufferSource(); ns.buffer = nb;
            if (layer.filterOn) {
              const filt = offCtx.createBiquadFilter();
              filt.type = layer.filterType; filt.frequency.value = layer.filterCutoff; filt.Q.value = layer.filterRes;
              ns.connect(filt); filt.connect(lg);
            } else { ns.connect(lg); }
            ns.start(t); ns.stop(dur);
          }
        });
      });

      const rendered = await offCtx.startRendering();
      const nc = rendered.numberOfChannels, sr = rendered.sampleRate, len = rendered.length * nc * 2;
      const buf = new ArrayBuffer(44 + len); const view = new DataView(buf);
      const ws = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
      ws(0,'RIFF'); view.setUint32(4,36+len,true); ws(8,'WAVE');
      ws(12,'fmt '); view.setUint32(16,16,true); view.setUint16(20,1,true);
      view.setUint16(22,nc,true); view.setUint32(24,sr,true);
      view.setUint32(28,sr*nc*2,true); view.setUint16(32,nc*2,true);
      view.setUint16(34,16,true); ws(36,'data'); view.setUint32(40,len,true);
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
      a.download = `${instrName.replace(/\s+/g, '_')}.wav`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast('✓ WAV exported');
      if (onAssignToTrack) {
        const ctx = getCtx(); const ab = await blob.arrayBuffer();
        return await ctx.decodeAudioData(ab);
      }
    } catch (e) { console.error(e); toast('✗ Export failed'); }
    setExporting(false); return null;
  };

  // Keyboard
  const OCTAVES = [3, 4, 5]; const WW = 22, WH = 70, BW = 14, BH = 44;
  const KPO = [{b:false,m:0},{b:true,m:1},{b:false,m:2},{b:true,m:3},{b:false,m:4},{b:false,m:5},{b:true,m:6},{b:false,m:7},{b:true,m:8},{b:false,m:9},{b:true,m:10},{b:false,m:11}];

  const renderKeyboard = () => {
    const allKeys = OCTAVES.flatMap(oct => KPO.map(k => ({ ...k, midi: (oct+1)*12+k.m+octaveShift*12, oct })));
    const whites = allKeys.filter(k => !k.b);
    return (
      <div style={{ position: 'relative', height: WH + 4, width: whites.length * WW, userSelect: 'none', flexShrink: 0 }}>
        {whites.map((k, i) => (
          <div key={`w${k.midi}`}
            onMouseDown={e => { e.preventDefault(); noteOn(k.midi, 0.8); setActiveKeys(p => new Set([...p, k.midi])); }}
            onMouseUp={() => { noteOff(k.midi); setActiveKeys(p => { const n = new Set(p); n.delete(k.midi); return n; }); }}
            onMouseLeave={() => { if (activeKeys.has(k.midi)) { noteOff(k.midi); setActiveKeys(p => { const n = new Set(p); n.delete(k.midi); return n; }); } }}
            className={`ib-key-white ${activeKeys.has(k.midi) ? 'active' : ''}`}
            style={{ position: 'absolute', left: i * WW, width: WW - 1, height: WH }}/>
        ))}
        {allKeys.filter(k => k.b).map(k => {
          const oi = OCTAVES.indexOf(k.oct);
          const wbO = [0,1,1,2,2,3,3,4,4,5,5,6][k.m];
          const left = (oi * 7 + wbO) * WW + WW - BW / 2;
          return (
            <div key={`b${k.midi}`}
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); noteOn(k.midi, 0.9); setActiveKeys(p => new Set([...p, k.midi])); }}
              onMouseUp={e => { e.stopPropagation(); noteOff(k.midi); setActiveKeys(p => { const n = new Set(p); n.delete(k.midi); return n; }); }}
              className={`ib-key-black ${activeKeys.has(k.midi) ? 'active' : ''}`}
              style={{ position: 'absolute', left, width: BW, height: BH }}/>
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
        <div className="ib-brand">
          <span className="ib-title">INSTRUMENT<span className="ib-title-accent">BUILDER</span></span>
          <input className="ib-name-input" value={instrName} onChange={e => setInstrName(e.target.value)}/>
        </div>
        <div className="ib-header-right">
          {status && <span className="ib-status">{status}</span>}
          <button className="ib-btn ib-btn-teal" onClick={() => setShowPresets(!showPresets)}>◫ PRESETS</button>
          <button className="ib-btn" onClick={() => setShowSaveModal(true)}>↓ SAVE</button>
          <button className="ib-btn ib-btn-orange" onClick={exportWAV} disabled={exporting}>{exporting ? '⏳' : '⬇ WAV'}</button>
          {onClose && <button className="ib-btn ib-btn-close" onClick={onClose}>✕</button>}
        </div>
      </div>

      {/* PRESETS */}
      {showPresets && savedPresets.length > 0 && (
        <div className="ib-presets">
          {savedPresets.map(p => (
            <div key={p.name} style={{ display: 'flex', gap: 3 }}>
              <button className="ib-preset-btn" onClick={() => loadPreset(p)}>{p.name}</button>
              <button className="ib-preset-del" onClick={() => deletePreset(p.name)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* BODY */}
      <div className="ib-body">
        {/* LAYER STACK */}
        <div className="ib-layers">
          <div className="ib-layers-header">
            <span className="ib-section-label">LAYERS</span>
            <div className="ib-add-btns">
              {LAYER_TYPES.map(t => (
                <button key={t} className="ib-add-btn"
                  style={{ borderColor: LAYER_COLORS[t]+'88', color: LAYER_COLORS[t] }}
                  onClick={() => addLayer(t)}>
                  + {LAYER_ICONS[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="ib-layers-scroll">
            {layers.map(layer => (
              <LayerCard key={layer.id}
                layer={layer}
                selected={editLayerId === layer.id}
                color={LAYER_COLORS[layer.type]}
                onSelect={() => setEditLayerId(layer.id)}
                onUpdate={(k, v) => updateLayer(layer.id, k, v)}
                onRemove={() => removeLayer(layer.id)}
              />
            ))}
            {layers.length === 0 && (
              <div className="ib-empty-hint">
                Add a layer above<br/>to start building
              </div>
            )}
          </div>
        </div>

        {/* DETAIL */}
        <div className="ib-detail">
          {editLayer ? (
            <>
              <Panel
                title={`${LAYER_ICONS[editLayer.type]} ${editLayer.name.toUpperCase()}`}
                color={LAYER_COLORS[editLayer.type]}
              >
                <LayerDetail
                  layer={editLayer}
                  onUpdate={(k, v) => updateLayer(editLayer.id, k, v)}
                  color={LAYER_COLORS[editLayer.type]}
                />
              </Panel>
            </>
          ) : (
            <div className="ib-empty-hint" style={{ paddingTop: 30 }}>
              Select a layer to edit its parameters
            </div>
          )}

          {/* MASTER FX */}
          <Panel title="MASTER FX" color="#34d399">
            <div className="ib-fx-grid">
              {/* Chorus */}
              <div className="ib-fx-block">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <LEDToggle value={fx.chorus.on} onChange={v=>setFxParam('chorus','on',v)} label="CHORUS" color="#34d399"/>
                </div>
                {fx.chorus.on && <div className="ib-knob-row">
                  <Knob value={fx.chorus.rate} min={0.1} max={10} step={0.1} onChange={v=>setFxParam('chorus','rate',v)} label="RATE" unit="Hz" size={42} color="#34d399"/>
                  <Knob value={fx.chorus.mix} min={0} max={1} step={0.01} onChange={v=>setFxParam('chorus','mix',v)} label="MIX" size={42} color="#34d399"/>
                </div>}
              </div>
              {/* Delay */}
              <div className="ib-fx-block">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <LEDToggle value={fx.delay.on} onChange={v=>setFxParam('delay','on',v)} label="DELAY" color="#fb923c"/>
                </div>
                {fx.delay.on && <div className="ib-knob-row">
                  <Knob value={fx.delay.time} min={0.01} max={2} step={0.01} onChange={v=>setFxParam('delay','time',v)} label="TIME" unit="s" size={42} color="#fb923c"/>
                  <Knob value={fx.delay.feedback} min={0} max={0.9} step={0.01} onChange={v=>setFxParam('delay','feedback',v)} label="FB" size={42} color="#fb923c"/>
                  <Knob value={fx.delay.mix} min={0} max={1} step={0.01} onChange={v=>setFxParam('delay','mix',v)} label="MIX" size={42} color="#fb923c"/>
                </div>}
              </div>
              {/* Reverb */}
              <div className="ib-fx-block">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <LEDToggle value={fx.reverb.on} onChange={v=>setFxParam('reverb','on',v)} label="REVERB" color="#a78bfa"/>
                </div>
                {fx.reverb.on && <div className="ib-knob-row">
                  <Knob value={fx.reverb.decay} min={0.1} max={10} step={0.1} onChange={v=>setFxParam('reverb','decay',v)} label="DECAY" unit="s" size={42} color="#a78bfa"/>
                  <Knob value={fx.reverb.mix} min={0} max={1} step={0.01} onChange={v=>setFxParam('reverb','mix',v)} label="MIX" size={42} color="#a78bfa"/>
                </div>}
              </div>
            </div>
          </Panel>

          {/* Assign buttons */}
          {(onAssignToPad || onAssignToTrack) && (
            <Panel title="ASSIGN" color="#00ffcc">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {onAssignToPad && (
                  <button className="ib-upload-btn" onClick={async () => {
                    const buf = await exportWAV();
                    onAssignToPad && onAssignToPad({ layers, fx, instrName, audioBuffer: buf });
                  }}>🎛 → PAD</button>
                )}
                {onAssignToTrack && (
                  <button className="ib-upload-btn" style={{ borderColor: '#ff6b3555', color: '#ff6b35', background: '#ff6b3510' }}
                    onClick={async () => {
                      const buf = await exportWAV();
                      onAssignToTrack && onAssignToTrack({ layers, fx, instrName }, buf);
                    }}>🎹 → TRACK</button>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* KEYBOARD */}
      <div className="ib-keyboard-row">
        <div className="ib-kbd-controls">
          <span className="ib-kbd-label">OCT {3+octaveShift}–{5+octaveShift}</span>
          <button className="ib-btn" onClick={() => setOctaveShift(o => Math.max(-2, o-1))}>◀</button>
          <button className="ib-btn" onClick={() => setOctaveShift(o => Math.min(2, o+1))}>▶</button>
          <span style={{ fontSize: '0.48rem', color: '#1e3050', marginLeft: 6 }}>QWERTY PLAYABLE</span>
        </div>
        <div style={{ overflowX: 'auto' }}>{renderKeyboard()}</div>
      </div>

      {/* SAVE MODAL */}
      {showSaveModal && (
        <div className="ib-modal-backdrop">
          <div className="ib-modal">
            <h3>↓ SAVE INSTRUMENT</h3>
            <input className="ib-input" placeholder="Name…" value={saveName || instrName}
              onChange={e => setSaveName(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') savePreset(); if (e.key === 'Escape') setShowSaveModal(false); }}/>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="ib-btn ib-btn-teal" onClick={savePreset}>SAVE</button>
              <button className="ib-btn" onClick={() => setShowSaveModal(false)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstrumentBuilder;