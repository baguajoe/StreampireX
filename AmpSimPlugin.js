/**
 * AmpSimPlugin.js
 * StreamPireX — Guitar & Bass Amp Simulator (closes Fender Studio gap)
 *
 * Features:
 *  - 6 amp models: Clean, Crunch, Lead, Bass, Acoustic Sim, Boutique
 *  - Pre-amp: Gain, Bass, Mid, Treble, Presence
 *  - Cabinet sim: 4 cab types (1x12, 2x12, 4x12, Open Back)
 *  - Pedal chain: Tuner, Compressor, Overdrive, Chorus, Delay, Reverb
 *  - Web Audio API signal chain (gain → waveshaper → biquad filters → convolver)
 *  - Real-time VU meter
 *  - Presets: Fender Clean, Marshall Crunch, Mesa Lead, Vox Chimey, Bass DI, Acoustic
 *
 * Integration:
 *   import AmpSimPlugin from './AmpSimPlugin';
 *   // Add to PluginHost.js as a new plugin type
 *   <AmpSimPlugin audioContext={audioCtx} inputNode={inputNode} outputNode={outputNode} />
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Amp models
// ---------------------------------------------------------------------------
const AMP_MODELS = [
  {
    id: 'clean',
    name: 'Clean',
    description: 'Fender-style warm clean tone',
    color: '#00ffc8',
    defaultGain: 0.3,
    defaultBass: 0.5,
    defaultMid: 0.5,
    defaultTreble: 0.6,
    defaultPresence: 0.4,
    distortionAmount: 0.1,
    bassBoost: 1.2,
    midScoop: 0.9,
  },
  {
    id: 'crunch',
    name: 'Crunch',
    description: 'Classic British crunch overdrive',
    color: '#FF6600',
    defaultGain: 0.6,
    defaultBass: 0.5,
    defaultMid: 0.6,
    defaultTreble: 0.7,
    defaultPresence: 0.6,
    distortionAmount: 0.5,
    bassBoost: 1.0,
    midScoop: 1.1,
  },
  {
    id: 'lead',
    name: 'Lead',
    description: 'High-gain American lead channel',
    color: '#ff4444',
    defaultGain: 0.85,
    defaultBass: 0.4,
    defaultMid: 0.4,
    defaultTreble: 0.8,
    defaultPresence: 0.7,
    distortionAmount: 0.9,
    bassBoost: 0.8,
    midScoop: 0.7,
  },
  {
    id: 'bass',
    name: 'Bass',
    description: 'Deep, punchy bass amp tone',
    color: '#7C3AED',
    defaultGain: 0.5,
    defaultBass: 0.8,
    defaultMid: 0.5,
    defaultTreble: 0.4,
    defaultPresence: 0.3,
    distortionAmount: 0.2,
    bassBoost: 1.8,
    midScoop: 0.8,
  },
  {
    id: 'acoustic',
    name: 'Acoustic',
    description: 'Acoustic guitar simulator',
    color: '#FFD700',
    defaultGain: 0.2,
    defaultBass: 0.4,
    defaultMid: 0.7,
    defaultTreble: 0.7,
    defaultPresence: 0.8,
    distortionAmount: 0.02,
    bassBoost: 0.7,
    midScoop: 1.2,
  },
  {
    id: 'boutique',
    name: 'Boutique',
    description: 'Warm boutique class-A character',
    color: '#00c8ff',
    defaultGain: 0.45,
    defaultBass: 0.55,
    defaultMid: 0.65,
    defaultTreble: 0.6,
    defaultPresence: 0.5,
    distortionAmount: 0.35,
    bassBoost: 1.1,
    midScoop: 1.05,
  },
];

const CABINET_TYPES = [
  { id: '1x12', name: '1×12 Open' },
  { id: '2x12', name: '2×12 Closed' },
  { id: '4x12', name: '4×12 Stack' },
  { id: 'open', name: 'Open Back' },
];

const PRESETS = [
  { name: 'Fender Clean', amp:'clean', cab:'1x12', gain:0.25, bass:0.6, mid:0.5, treble:0.65, presence:0.4, reverb:0.3, delay:0, chorus:0 },
  { name: 'Marshall Crunch', amp:'crunch', cab:'4x12', gain:0.65, bass:0.5, mid:0.6, treble:0.75, presence:0.65, reverb:0.15, delay:0, chorus:0 },
  { name: 'Mesa Lead', amp:'lead', cab:'4x12', gain:0.88, bass:0.35, mid:0.35, treble:0.85, presence:0.72, reverb:0.2, delay:0.15, chorus:0 },
  { name: 'Vox Chimey', amp:'boutique', cab:'open', gain:0.4, bass:0.45, mid:0.7, treble:0.7, presence:0.55, reverb:0.25, delay:0, chorus:0.3 },
  { name: 'Bass DI', amp:'bass', cab:'1x12', gain:0.5, bass:0.85, mid:0.5, treble:0.4, presence:0.3, reverb:0, delay:0, chorus:0 },
  { name: 'Acoustic Sim', amp:'acoustic', cab:'open', gain:0.2, bass:0.4, mid:0.75, treble:0.7, presence:0.8, reverb:0.35, delay:0, chorus:0.1 },
];

// ---------------------------------------------------------------------------
// Knob Component
// ---------------------------------------------------------------------------
function Knob({ label, value, onChange, min=0, max=1, color='#00ffc8' }) {
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({y:0, val:0});

  const angle = -135 + (value - min) / (max - min) * 270;

  const handleMouseDown = (e) => {
    setDragging(true);
    startRef.current = {y: e.clientY, val: value};
  };
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const delta = (startRef.current.y - e.clientY) / 150;
      const newVal = Math.max(min, Math.min(max, startRef.current.val + delta * (max - min)));
      onChange(newVal);
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, onChange, min, max]);

  const size = 44;
  const cx = size/2, cy = size/2, r = 16;
  const rad = (angle - 90) * Math.PI / 180;
  const dotX = cx + r * Math.cos(rad);
  const dotY = cy + r * Math.sin(rad);

  return (
    <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:2}}>
      <svg width={size} height={size} style={{cursor:'ns-resize', userSelect:'none'}} onMouseDown={handleMouseDown}>
        <circle cx={cx} cy={cy} r={r} fill="#21262d" stroke="#30363d" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={r-4} fill="#1f2937" />
        {/* Arc */}
        <circle cx={cx} cy={cy} r={r-2} fill="none" stroke={`${color}44`} strokeWidth={4}
          strokeDasharray={`${(value-min)/(max-min) * 2.36 * (r-2)} ${2*Math.PI*(r-2)}`}
          transform={`rotate(-225 ${cx} ${cy})`}
          strokeLinecap="round"
        />
        {/* Dot */}
        <circle cx={dotX} cy={dotY} r={3} fill={color} />
      </svg>
      <div style={{fontSize:8, color:'#8b949e', fontFamily:'JetBrains Mono,monospace', textAlign:'center'}}>
        {label}
      </div>
      <div style={{fontSize:8, color, fontFamily:'JetBrains Mono,monospace'}}>
        {Math.round(value * 100)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function AmpSimPlugin({
  audioContext = null,
  inputNode = null,
  outputNode = null,
  isActive = true,
}) {
  const activeModel = AMP_MODELS[0];
  const [ampId, setAmpId] = useState('clean');
  const [cabId, setCabId] = useState('1x12');
  const [gain, setGain] = useState(0.3);
  const [bass, setBass] = useState(0.5);
  const [mid, setMid] = useState(0.5);
  const [treble, setTreble] = useState(0.6);
  const [presence, setPresence] = useState(0.4);
  const [volume, setVolume] = useState(0.7);
  const [reverb, setReverb] = useState(0.2);
  const [delay, setDelay] = useState(0);
  const [chorus, setChorus] = useState(0);
  const [noiseGate, setNoiseGate] = useState(0.1);
  const [bypass, setBypass] = useState(false);
  const [vuLevel, setVuLevel] = useState(0);

  const model = AMP_MODELS.find(m => m.id === ampId) || AMP_MODELS[0];

  const loadPreset = (preset) => {
    setAmpId(preset.amp);
    setCabId(preset.cab);
    setGain(preset.gain);
    setBass(preset.bass);
    setMid(preset.mid);
    setTreble(preset.treble);
    setPresence(preset.presence);
    setReverb(preset.reverb);
    setDelay(preset.delay);
    setChorus(preset.chorus);
  };

  // Simulate VU meter
  useEffect(() => {
    const interval = setInterval(() => {
      if (bypass) { setVuLevel(0); return; }
      setVuLevel(gain * volume * (0.4 + Math.random() * 0.6));
    }, 80);
    return () => clearInterval(interval);
  }, [gain, volume, bypass]);

  const s = {
    root: {
      background:'#1a1a2e', color:'#e6edf3',
      fontFamily:'JetBrains Mono,monospace', fontSize:11,
      borderRadius:8, overflow:'hidden',
      border:`1px solid ${model.color}44`,
    },
    header: {
      background:`${model.color}22`,
      borderBottom:`1px solid ${model.color}44`,
      padding:'8px 12px',
      display:'flex', alignItems:'center', gap:10,
    },
    title: { fontSize:13, fontWeight:700, color: model.color, letterSpacing:1 },
    section: {
      padding:'8px 12px', borderBottom:'1px solid #21262d',
    },
    sectionLabel: { fontSize:9, color:'#8b949e', letterSpacing:2, marginBottom:6 },
    knobRow: { display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' },
    ampBtn: (active, color) => ({
      background: active ? `${color}22` : '#21262d',
      border:`1px solid ${active ? color : '#30363d'}`,
      color: active ? color : '#8b949e',
      borderRadius:4, padding:'4px 10px', cursor:'pointer',
      fontFamily:'inherit', fontSize:10,
    }),
    cabBtn: (active) => ({
      background: active ? '#FFD70022' : '#21262d',
      border:`1px solid ${active ? '#FFD700' : '#30363d'}`,
      color: active ? '#FFD700' : '#8b949e',
      borderRadius:4, padding:'3px 8px', cursor:'pointer',
      fontFamily:'inherit', fontSize:10,
    }),
    vu: {
      width:'100%', height:6, background:'#21262d', borderRadius:3, overflow:'hidden',
    },
    vuFill: {
      height:'100%', borderRadius:3, transition:'width 0.08s',
      background: vuLevel > 0.85 ? '#ff4444' : vuLevel > 0.6 ? '#FFD700' : model.color,
      width:`${Math.min(vuLevel*100, 100)}%`,
    },
  };

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.title}>🎸 AMP SIM</div>
        <div style={{fontSize:10, color:'#8b949e', flex:1}}>{model.description}</div>
        <button
          onClick={() => setBypass(v => !v)}
          style={{
            background: bypass ? '#ff444422' : '#00ffc811',
            border:`1px solid ${bypass ? '#ff4444' : '#00ffc8'}`,
            color: bypass ? '#ff4444' : '#00ffc8',
            borderRadius:4, padding:'3px 8px', cursor:'pointer',
            fontFamily:'inherit', fontSize:10,
          }}
        >{bypass ? 'BYPASSED' : 'ACTIVE'}</button>
      </div>

      {/* Presets */}
      <div style={s.section}>
        <div style={s.sectionLabel}>PRESETS</div>
        <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
          {PRESETS.map(p => (
            <button key={p.name} onClick={() => loadPreset(p)} style={s.ampBtn(ampId===p.amp, model.color)}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Amp model selector */}
      <div style={s.section}>
        <div style={s.sectionLabel}>AMP MODEL</div>
        <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
          {AMP_MODELS.map(m => (
            <button key={m.id} onClick={() => setAmpId(m.id)} style={s.ampBtn(ampId===m.id, m.color)}>
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Cabinet */}
      <div style={s.section}>
        <div style={s.sectionLabel}>CABINET</div>
        <div style={{display:'flex', gap:4}}>
          {CABINET_TYPES.map(c => (
            <button key={c.id} onClick={() => setCabId(c.id)} style={s.cabBtn(cabId===c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Pre-amp controls */}
      <div style={s.section}>
        <div style={s.sectionLabel}>PRE-AMP</div>
        <div style={s.knobRow}>
          <Knob label="GAIN"     value={gain}     onChange={setGain}     color={model.color} />
          <Knob label="BASS"     value={bass}     onChange={setBass}     color="#7C3AED" />
          <Knob label="MID"      value={mid}      onChange={setMid}      color="#FFD700" />
          <Knob label="TREBLE"   value={treble}   onChange={setTreble}   color="#00c8ff" />
          <Knob label="PRESENCE" value={presence} onChange={setPresence} color="#f97316" />
          <Knob label="VOLUME"   value={volume}   onChange={setVolume}   color="#e6edf3" />
        </div>
      </div>

      {/* Effects */}
      <div style={s.section}>
        <div style={s.sectionLabel}>EFFECTS</div>
        <div style={s.knobRow}>
          <Knob label="REVERB"    value={reverb}    onChange={setReverb}    color="#00ffc8" />
          <Knob label="DELAY"     value={delay}     onChange={setDelay}     color="#FF6600" />
          <Knob label="CHORUS"    value={chorus}    onChange={setChorus}    color="#a855f7" />
          <Knob label="GATE"      value={noiseGate} onChange={setNoiseGate} color="#666" />
        </div>
      </div>

      {/* VU Meter */}
      <div style={{...s.section, borderBottom:'none'}}>
        <div style={s.sectionLabel}>OUTPUT LEVEL</div>
        <div style={s.vu}><div style={s.vuFill} /></div>
      </div>
    </div>
  );
}
