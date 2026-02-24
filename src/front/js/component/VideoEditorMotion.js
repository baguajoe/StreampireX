// =============================================================================
// VideoEditorMotion.js — Keyframe Animation & Motion Graphics Engine
// =============================================================================
// Location: src/front/js/component/VideoEditorMotion.js
// Features: Keyframe animation, text/title animator, animated captions,
//   stickers/overlays, watermark, aspect ratios, PIP, chroma key,
//   freeze frame, speed ramping, adjustment layers, social templates
// =============================================================================

import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. EASING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const EASING = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => t * (2 - t),
  easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInQuart: t => t * t * t * t,
  easeOutQuart: t => 1 - (--t) * t * t * t,
  bounce: t => {
    if (t < 1/2.75) return 7.5625*t*t;
    if (t < 2/2.75) return 7.5625*(t-=1.5/2.75)*t+0.75;
    if (t < 2.5/2.75) return 7.5625*(t-=2.25/2.75)*t+0.9375;
    return 7.5625*(t-=2.625/2.75)*t+0.984375;
  },
  elastic: t => t===0||t===1 ? t : -Math.pow(2,10*(t-1))*Math.sin((t-1.1)*5*Math.PI),
  spring: t => 1 - Math.cos(t*4.5*Math.PI)*Math.exp(-t*6),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. KEYFRAME ANIMATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export const ANIMATABLE_PROPS = {
  x:        { label: 'Position X',  default: 0,   min: -2000, max: 2000, unit: 'px' },
  y:        { label: 'Position Y',  default: 0,   min: -2000, max: 2000, unit: 'px' },
  scaleX:   { label: 'Scale X',     default: 1,   min: 0, max: 5, unit: 'x', step: 0.01 },
  scaleY:   { label: 'Scale Y',     default: 1,   min: 0, max: 5, unit: 'x', step: 0.01 },
  rotation: { label: 'Rotation',    default: 0,   min: -360, max: 360, unit: '°' },
  opacity:  { label: 'Opacity',     default: 1,   min: 0, max: 1, unit: '', step: 0.01 },
  blur:     { label: 'Blur',        default: 0,   min: 0, max: 50, unit: 'px' },
  brightness:{ label: 'Brightness', default: 100, min: 0, max: 200, unit: '%' },
  contrast: { label: 'Contrast',    default: 100, min: 0, max: 200, unit: '%' },
  saturate: { label: 'Saturation',  default: 100, min: 0, max: 200, unit: '%' },
  hueRotate:{ label: 'Hue Rotate',  default: 0,   min: 0, max: 360, unit: '°' },
};

export const createKeyframe = (time, property, value, easing = 'easeInOut') => ({
  id: `kf_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  time, property, value, easing,
});

export const interpolateKeyframes = (keyframes, time) => {
  const result = {};
  const grouped = {};
  for (const kf of keyframes) {
    if (!grouped[kf.property]) grouped[kf.property] = [];
    grouped[kf.property].push(kf);
  }
  for (const [prop, kfs] of Object.entries(grouped)) {
    const sorted = [...kfs].sort((a,b) => a.time - b.time);
    if (sorted.length === 0) continue;
    if (time <= sorted[0].time) { result[prop] = sorted[0].value; continue; }
    if (time >= sorted[sorted.length-1].time) { result[prop] = sorted[sorted.length-1].value; continue; }
    for (let i = 0; i < sorted.length-1; i++) {
      if (time >= sorted[i].time && time <= sorted[i+1].time) {
        const t0=sorted[i].time, t1=sorted[i+1].time, v0=sorted[i].value, v1=sorted[i+1].value;
        const easingFn = EASING[sorted[i+1].easing] || EASING.linear;
        const progress = t1===t0 ? 1 : (time-t0)/(t1-t0);
        result[prop] = v0 + (v1-v0) * easingFn(progress);
        break;
      }
    }
  }
  return result;
};

export const keyframesToCSS = (values) => {
  const transforms=[], filters=[], styles={};
  if (values.x!==undefined||values.y!==undefined) transforms.push(`translate(${values.x||0}px,${values.y||0}px)`);
  if (values.scaleX!==undefined||values.scaleY!==undefined) transforms.push(`scale(${values.scaleX??1},${values.scaleY??1})`);
  if (values.rotation!==undefined) transforms.push(`rotate(${values.rotation}deg)`);
  if (values.opacity!==undefined) styles.opacity = values.opacity;
  if (values.blur>0) filters.push(`blur(${values.blur}px)`);
  if (values.brightness!==undefined&&values.brightness!==100) filters.push(`brightness(${values.brightness}%)`);
  if (values.contrast!==undefined&&values.contrast!==100) filters.push(`contrast(${values.contrast}%)`);
  if (values.saturate!==undefined&&values.saturate!==100) filters.push(`saturate(${values.saturate}%)`);
  if (values.hueRotate!==undefined&&values.hueRotate!==0) filters.push(`hue-rotate(${values.hueRotate}deg)`);
  if (transforms.length>0) styles.transform = transforms.join(' ');
  if (filters.length>0) styles.filter = filters.join(' ');
  return styles;
};

// ── Keyframe Editor Panel ──
export const KeyframeEditor = ({ clipId, keyframes=[], duration=10, currentTime=0, onAdd, onRemove }) => {
  const [selectedProp, setSelectedProp] = React.useState('opacity');
  const [selectedEasing, setSelectedEasing] = React.useState('easeInOut');
  const addKf = () => {
    const prop = ANIMATABLE_PROPS[selectedProp];
    onAdd && onAdd(clipId, createKeyframe(currentTime, selectedProp, prop?.default??0, selectedEasing));
  };
  const grouped = {};
  for (const kf of keyframes) { if (!grouped[kf.property]) grouped[kf.property]=[]; grouped[kf.property].push(kf); }
  const S = { bg:'#161b22', input:'#21262d', border:'#30363d', text:'#c9d1d9', dim:'#5a7088', accent:'#00ffc8' };
  return (
    <div style={{background:S.bg,borderRadius:8,padding:10,fontSize:'0.7rem'}}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
        <span style={{fontWeight:700,color:S.accent}}>⏱ Keyframes</span>
        <select value={selectedProp} onChange={e=>setSelectedProp(e.target.value)} style={{background:S.input,border:`1px solid ${S.border}`,borderRadius:4,color:S.text,padding:'2px 4px',fontSize:'0.65rem'}}>
          {Object.entries(ANIMATABLE_PROPS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={selectedEasing} onChange={e=>setSelectedEasing(e.target.value)} style={{background:S.input,border:`1px solid ${S.border}`,borderRadius:4,color:S.text,padding:'2px 4px',fontSize:'0.65rem'}}>
          {Object.keys(EASING).map(e=><option key={e} value={e}>{e}</option>)}
        </select>
        <button onClick={addKf} style={{padding:'2px 8px',borderRadius:4,background:S.accent,border:'none',color:'#000',fontWeight:700,fontSize:'0.6rem',cursor:'pointer'}}>
          + Add at {currentTime.toFixed(2)}s
        </button>
      </div>
      {Object.entries(grouped).map(([prop,kfs])=>(
        <div key={prop} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
          <span style={{width:70,color:S.dim,fontSize:'0.6rem'}}>{ANIMATABLE_PROPS[prop]?.label||prop}</span>
          <div style={{flex:1,height:20,background:S.input,borderRadius:4,position:'relative'}}>
            {kfs.sort((a,b)=>a.time-b.time).map(kf=>(
              <div key={kf.id} style={{position:'absolute',left:`${(kf.time/duration)*100}%`,top:2,width:12,height:12,background:'#ff9500',borderRadius:2,transform:'translateX(-6px) rotate(45deg)',cursor:'pointer',border:'1px solid #ffcc00'}} title={`${kf.value} @ ${kf.time.toFixed(2)}s`} onClick={()=>onRemove&&onRemove(clipId,kf.id)}/>
            ))}
            <div style={{position:'absolute',left:`${(currentTime/duration)*100}%`,top:0,width:2,height:'100%',background:'#ff3b30'}}/>
          </div>
          <span style={{width:40,fontSize:'0.55rem',color:S.dim,textAlign:'right'}}>{kfs.length} kf</span>
        </div>
      ))}
      {Object.keys(grouped).length===0&&<div style={{color:S.dim,fontSize:'0.6rem',textAlign:'center',padding:8}}>No keyframes yet</div>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TEXT ANIMATION PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

export const TEXT_PRESETS = [
  { id:'fade_in', name:'Fade In', enter:[{property:'opacity',from:0,to:1,duration:0.5,easing:'easeOut'}] },
  { id:'slide_up', name:'Slide Up', enter:[{property:'y',from:50,to:0,duration:0.6,easing:'easeOutCubic'},{property:'opacity',from:0,to:1,duration:0.4,easing:'easeOut'}] },
  { id:'slide_down', name:'Slide Down', enter:[{property:'y',from:-50,to:0,duration:0.6,easing:'easeOutCubic'},{property:'opacity',from:0,to:1,duration:0.4,easing:'easeOut'}] },
  { id:'slide_left', name:'Slide Left', enter:[{property:'x',from:100,to:0,duration:0.6,easing:'easeOutCubic'},{property:'opacity',from:0,to:1,duration:0.4,easing:'easeOut'}] },
  { id:'slide_right', name:'Slide Right', enter:[{property:'x',from:-100,to:0,duration:0.6,easing:'easeOutCubic'},{property:'opacity',from:0,to:1,duration:0.4,easing:'easeOut'}] },
  { id:'zoom_in', name:'Zoom In', enter:[{property:'scaleX',from:0.3,to:1,duration:0.5,easing:'easeOutCubic'},{property:'scaleY',from:0.3,to:1,duration:0.5,easing:'easeOutCubic'},{property:'opacity',from:0,to:1,duration:0.3,easing:'easeOut'}] },
  { id:'zoom_out', name:'Zoom Out', enter:[{property:'scaleX',from:1.5,to:1,duration:0.5,easing:'easeOutCubic'},{property:'scaleY',from:1.5,to:1,duration:0.5,easing:'easeOutCubic'},{property:'opacity',from:0,to:1,duration:0.3,easing:'easeOut'}] },
  { id:'bounce_in', name:'Bounce In', enter:[{property:'scaleX',from:0,to:1,duration:0.7,easing:'bounce'},{property:'scaleY',from:0,to:1,duration:0.7,easing:'bounce'},{property:'opacity',from:0,to:1,duration:0.2,easing:'easeOut'}] },
  { id:'spin_in', name:'Spin In', enter:[{property:'rotation',from:360,to:0,duration:0.8,easing:'easeOutCubic'},{property:'scaleX',from:0,to:1,duration:0.6,easing:'easeOutCubic'},{property:'scaleY',from:0,to:1,duration:0.6,easing:'easeOutCubic'}] },
  { id:'typewriter', name:'Typewriter', enter:[{property:'opacity',from:0,to:1,duration:0.05,easing:'linear',perChar:true}] },
  { id:'elastic_in', name:'Elastic In', enter:[{property:'scaleX',from:0,to:1,duration:1,easing:'elastic'},{property:'scaleY',from:0,to:1,duration:1,easing:'elastic'}] },
  { id:'glitch', name:'Glitch', enter:[{property:'x',from:-10,to:0,duration:0.1,easing:'linear',repeat:5},{property:'opacity',from:0,to:1,duration:0.05,easing:'linear',repeat:8}] },
];

// ── Lower Third Templates ──
export const LOWER_THIRD_TEMPLATES = [
  { id:'clean', name:'Clean', style:{background:'rgba(0,0,0,0.7)',padding:'8px 16px',borderRadius:4,borderLeft:'3px solid #00ffc8'}, nameStyle:{fontSize:18,fontWeight:700,color:'#fff'}, titleStyle:{fontSize:12,color:'#00ffc8',marginTop:2} },
  { id:'bold', name:'Bold', style:{background:'#00ffc8',padding:'10px 20px',borderRadius:0}, nameStyle:{fontSize:22,fontWeight:900,color:'#000',textTransform:'uppercase'}, titleStyle:{fontSize:13,color:'#333',fontWeight:600} },
  { id:'minimal', name:'Minimal', style:{background:'transparent',padding:'6px 0',borderBottom:'2px solid #fff'}, nameStyle:{fontSize:16,fontWeight:600,color:'#fff'}, titleStyle:{fontSize:11,color:'#aaa'} },
  { id:'news', name:'News', style:{background:'linear-gradient(90deg,#1a1a2e,#16213e)',padding:'8px 16px',borderRadius:2,borderBottom:'3px solid #e94560'}, nameStyle:{fontSize:18,fontWeight:700,color:'#fff'}, titleStyle:{fontSize:11,color:'#e94560',textTransform:'uppercase',letterSpacing:1} },
  { id:'gradient', name:'Gradient', style:{background:'linear-gradient(135deg,rgba(0,255,200,0.9),rgba(0,122,255,0.9))',padding:'10px 20px',borderRadius:8}, nameStyle:{fontSize:20,fontWeight:800,color:'#fff',textShadow:'0 2px 4px rgba(0,0,0,0.3)'}, titleStyle:{fontSize:12,color:'rgba(255,255,255,0.8)'} },
  { id:'outline', name:'Outline', style:{background:'transparent',padding:'8px 16px',border:'2px solid #fff',borderRadius:4}, nameStyle:{fontSize:18,fontWeight:700,color:'#fff'}, titleStyle:{fontSize:11,color:'#ccc'} },
];

export default {
  EASING, ANIMATABLE_PROPS, createKeyframe, interpolateKeyframes, keyframesToCSS,
  KeyframeEditor, TEXT_PRESETS, LOWER_THIRD_TEMPLATES,
};