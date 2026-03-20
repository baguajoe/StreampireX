// src/front/js/component/nodecompositor/pro/ColorPipelinePanel.js
import React, { useMemo, useState, useCallback } from "react";
import { LUT_PRESETS, applyColorScience } from "../../../utils/color/lutUtils";
import { getFakeWaveform, getFakeVectorscope } from "../../../utils/color/scopeUtils";

const S = { bg:'#0d1117', accent:'#00ffc8', border:'rgba(0,255,200,0.15)', text:'#dde6ef', dim:'#4e6a82', orange:'#ff9f45' };

const Slider = ({ label, value, min, max, step=0.01, onChange, unit='' }) => (
  <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.7rem', color:S.dim, marginBottom:6 }}>
    <span style={{ width:80 }}>{label}</span>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ flex:1 }} />
    <span style={{ width:40, textAlign:'right', color:S.accent, fontFamily:'monospace' }}>
      {value.toFixed(2)}{unit}
    </span>
  </label>
);

export default function ColorPipelinePanel({ onGradeChange }) {
  const [lut,        setLut]        = useState('none');
  const [gain,       setGain]       = useState(1);
  const [gamma,      setGamma]      = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [lift,       setLift]       = useState(0);
  const [hue,        setHue]        = useState(0);
  const [contrast,   setContrast]   = useState(1);
  const [scope,      setScope]      = useState('waveform');

  const waveform = useMemo(() => getFakeWaveform(), []);
  const vectors  = useMemo(() => getFakeVectorscope(), []);
  const lutMeta  = LUT_PRESETS.find(p => p.id === lut) || LUT_PRESETS[0];

  const emit = useCallback(() => {
    onGradeChange?.({ lut, gain, gamma, saturation, lift, hue, contrast });
  }, [lut, gain, gamma, saturation, lift, hue, contrast, onGradeChange]);

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">🎨 Color Pipeline</div>

      <label style={{ color:S.dim, fontSize:'0.7rem', display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        LUT
        <select value={lut} onChange={e => { setLut(e.target.value); emit(); }}
          style={{ flex:1, background:'#16263d', border:`1px solid ${S.border}`, color:S.text, borderRadius:4, padding:'3px 6px', fontSize:'0.75rem' }}>
          {LUT_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>

      <Slider label="Gain"       value={gain}       min={0}    max={3}   step={0.01} onChange={v=>{setGain(v);emit();}} />
      <Slider label="Gamma"      value={gamma}      min={0.2}  max={3}   step={0.01} onChange={v=>{setGamma(v);emit();}} />
      <Slider label="Lift"       value={lift}       min={-0.5} max={0.5} step={0.01} onChange={v=>{setLift(v);emit();}} />
      <Slider label="Saturation" value={saturation} min={0}    max={3}   step={0.01} onChange={v=>{setSaturation(v);emit();}} />
      <Slider label="Contrast"   value={contrast}   min={0.5}  max={2}   step={0.01} onChange={v=>{setContrast(v);emit();}} />
      <Slider label="Hue"        value={hue}        min={-180} max={180} step={1}    onChange={v=>{setHue(v);emit();}} unit="°" />

      <div style={{ display:'flex', gap:6, margin:'10px 0 6px' }}>
        {['waveform','vectorscope'].map(s => (
          <button key={s} onClick={() => setScope(s)} style={{
            padding:'2px 8px', borderRadius:4, cursor:'pointer', fontSize:'0.65rem',
            background: scope===s ? S.accent : 'transparent',
            color: scope===s ? '#000' : S.dim,
            border: `1px solid ${scope===s ? S.accent : S.border}`,
          }}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
        ))}
      </div>

      <div style={{ background:'#081220', borderRadius:6, border:`1px solid ${S.border}`, padding:4 }}>
        {scope === 'waveform' ? (
          <svg width="100%" height={100} viewBox="0 0 64 48">
            <polyline fill="none" stroke={S.accent} strokeWidth="1"
              points={waveform.map(p => `${p.x},${48-p.y}`).join(' ')} />
          </svg>
        ) : (
          <svg width="100%" height={100} viewBox="-40 -40 80 80">
            <circle cx="0" cy="0" r="38" fill="none" stroke={S.dim} strokeWidth="0.5" />
            {vectors.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.2" fill={S.orange} opacity="0.7" />)}
          </svg>
        )}
        <div style={{ fontSize:'0.6rem', color:S.dim, textAlign:'center', marginTop:2 }}>
          Active LUT: {lutMeta.name}
        </div>
      </div>
    </div>
  );
}
