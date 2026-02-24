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

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PATH ANIMATION (Bezier Curves)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cubic bezier point interpolation
 * P = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
 */
const cubicBezier = (t, p0, p1, p2, p3) => {
  const mt = 1 - t;
  return mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
};

/**
 * Get tangent angle at point t on cubic bezier (for auto-rotation)
 */
const cubicBezierTangent = (t, p0, p1, p2, p3) => {
  const mt = 1 - t;
  return -3*mt*mt*p0 + 3*(mt*mt - 2*mt*t)*p1 + 3*(2*mt*t - t*t)*p2 + 3*t*t*p3;
};

/**
 * Create a bezier path with control points
 * Each segment has: start, controlPoint1, controlPoint2, end
 */
export const createBezierPath = (segments = []) => ({
  id: `path_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  type: 'bezier_path',
  segments, // [{x0,y0, cx1,cy1, cx2,cy2, x1,y1}]
  closed: false,
  totalLength: 0, // computed
});

/**
 * Add a segment to a bezier path
 */
export const addPathSegment = (path, { x0, y0, cx1, cy1, cx2, cy2, x1, y1 }) => ({
  ...path,
  segments: [...path.segments, { x0, y0, cx1, cy1, cx2, cy2, x1, y1 }],
});

/**
 * Evaluate position on a multi-segment bezier path at normalized t (0-1)
 */
export const evaluatePath = (path, t) => {
  if (!path.segments || path.segments.length === 0) return { x: 0, y: 0, angle: 0 };

  // Map t to segment index + local t
  const totalSegments = path.segments.length;
  const scaledT = t * totalSegments;
  const segIndex = Math.min(Math.floor(scaledT), totalSegments - 1);
  const localT = scaledT - segIndex;
  const seg = path.segments[segIndex];

  const x = cubicBezier(localT, seg.x0, seg.cx1, seg.cx2, seg.x1);
  const y = cubicBezier(localT, seg.y0, seg.cy1, seg.cy2, seg.y1);

  // Tangent for auto-orient
  const dx = cubicBezierTangent(localT, seg.x0, seg.cx1, seg.cx2, seg.x1);
  const dy = cubicBezierTangent(localT, seg.y0, seg.cy1, seg.cy2, seg.y1);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return { x, y, angle };
};

/**
 * Approximate total arc length of path (for uniform speed)
 */
export const computePathLength = (path, steps = 200) => {
  let length = 0;
  let prev = evaluatePath(path, 0);
  for (let i = 1; i <= steps; i++) {
    const curr = evaluatePath(path, i / steps);
    length += Math.sqrt((curr.x - prev.x)**2 + (curr.y - prev.y)**2);
    prev = curr;
  }
  return length;
};

/**
 * Get position at uniform distance along path (constant speed)
 * Uses arc-length parameterization lookup table
 */
export const evaluatePathUniform = (path, t, lut = null) => {
  if (!lut) {
    // Build lookup table
    const steps = 200;
    const table = [{ t: 0, dist: 0 }];
    let totalDist = 0;
    let prev = evaluatePath(path, 0);
    for (let i = 1; i <= steps; i++) {
      const curr = evaluatePath(path, i / steps);
      totalDist += Math.sqrt((curr.x - prev.x)**2 + (curr.y - prev.y)**2);
      table.push({ t: i / steps, dist: totalDist });
      prev = curr;
    }
    // Normalize distances
    for (const entry of table) entry.dist /= totalDist;
    lut = table;
  }

  // Binary search for t at target distance
  const targetDist = t;
  let lo = 0, hi = lut.length - 1;
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (lut[mid].dist < targetDist) lo = mid; else hi = mid;
  }
  const range = lut[hi].dist - lut[lo].dist;
  const frac = range > 0 ? (targetDist - lut[lo].dist) / range : 0;
  const mappedT = lut[lo].t + frac * (lut[hi].t - lut[lo].t);

  return evaluatePath(path, mappedT);
};

// ── Path Presets ──
export const PATH_PRESETS = [
  {
    id: 'circle', name: 'Circle', build: (cx=0, cy=0, r=100) => createBezierPath([
      { x0:cx+r, y0:cy, cx1:cx+r, cy1:cy+r*0.55, cx2:cx+r*0.55, cy2:cy+r, x1:cx, y1:cy+r },
      { x0:cx, y0:cy+r, cx1:cx-r*0.55, cy1:cy+r, cx2:cx-r, cy2:cy+r*0.55, x1:cx-r, y1:cy },
      { x0:cx-r, y0:cy, cx1:cx-r, cy1:cy-r*0.55, cx2:cx-r*0.55, cy2:cy-r, x1:cx, y1:cy-r },
      { x0:cx, y0:cy-r, cx1:cx+r*0.55, cy1:cy-r, cx2:cx+r, cy2:cy-r*0.55, x1:cx+r, y1:cy },
    ]),
  },
  {
    id: 'figure8', name: 'Figure 8', build: (cx=0, cy=0, r=100) => createBezierPath([
      { x0:cx, y0:cy, cx1:cx+r, cy1:cy-r, cx2:cx+r, cy2:cy+r, x1:cx, y1:cy },
      { x0:cx, y0:cy, cx1:cx-r, cy1:cy+r, cx2:cx-r, cy2:cy-r, x1:cx, y1:cy },
    ]),
  },
  {
    id: 'wave', name: 'Wave', build: (w=400, h=60, segs=4) => {
      const segments = [];
      const segW = w / segs;
      for (let i = 0; i < segs; i++) {
        const x0 = i * segW, y0 = 0;
        const x1 = (i + 1) * segW, y1 = 0;
        const dir = i % 2 === 0 ? -1 : 1;
        segments.push({ x0, y0, cx1:x0+segW*0.33, cy1:dir*h, cx2:x0+segW*0.66, cy2:dir*h, x1, y1 });
      }
      return createBezierPath(segments);
    },
  },
  {
    id: 'arc_left', name: 'Arc Left', build: (w=300, h=150) => createBezierPath([
      { x0:0, y0:0, cx1:-w*0.3, cy1:h*0.3, cx2:-w*0.3, cy2:h*0.7, x1:0, y1:h },
    ]),
  },
  {
    id: 'arc_right', name: 'Arc Right', build: (w=300, h=150) => createBezierPath([
      { x0:0, y0:0, cx1:w*0.3, cy1:h*0.3, cx2:w*0.3, cy2:h*0.7, x1:0, y1:h },
    ]),
  },
  {
    id: 'bounce_path', name: 'Bounce', build: (w=400, h=200) => createBezierPath([
      { x0:0, y0:0, cx1:w*0.15, cy1:h, cx2:w*0.35, cy2:h, x1:w*0.5, y1:0 },
      { x0:w*0.5, y0:0, cx1:w*0.6, cy1:h*0.6, cx2:w*0.75, cy2:h*0.6, x1:w*0.85, y1:0 },
      { x0:w*0.85, y0:0, cx1:w*0.9, cy1:h*0.3, cx2:w*0.95, cy2:h*0.3, x1:w, y1:0 },
    ]),
  },
  {
    id: 'spiral', name: 'Spiral In', build: (cx=0, cy=0, r=200, turns=3) => {
      const segments = [];
      const steps = turns * 4;
      for (let i = 0; i < steps; i++) {
        const t0 = i / steps, t1 = (i+1) / steps;
        const r0 = r * (1 - t0), r1 = r * (1 - t1);
        const a0 = t0 * turns * Math.PI * 2, a1 = t1 * turns * Math.PI * 2;
        const aMid1 = a0 + (a1-a0)*0.33, aMid2 = a0 + (a1-a0)*0.66;
        const rMid1 = r0 + (r1-r0)*0.33, rMid2 = r0 + (r1-r0)*0.66;
        segments.push({
          x0: cx+Math.cos(a0)*r0, y0: cy+Math.sin(a0)*r0,
          cx1: cx+Math.cos(aMid1)*rMid1, cy1: cy+Math.sin(aMid1)*rMid1,
          cx2: cx+Math.cos(aMid2)*rMid2, cy2: cy+Math.sin(aMid2)*rMid2,
          x1: cx+Math.cos(a1)*r1, y1: cy+Math.sin(a1)*r1,
        });
      }
      return createBezierPath(segments);
    },
  },
];

/**
 * Create a path animation binding for a layer
 */
export const createPathAnimation = ({
  pathId = null,
  path = null,
  startTime = 0,
  duration = 5,
  autoOrient = true, // rotate layer to follow path tangent
  loop = false,
  pingPong = false,
  uniformSpeed = true, // constant velocity along path
  easing = 'easeInOut',
} = {}) => ({
  id: `pathAnim_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  type: 'path_animation',
  pathId, path, startTime, duration,
  autoOrient, loop, pingPong, uniformSpeed, easing,
});

/**
 * Evaluate path animation at a given time → {x, y, rotation}
 */
export const evaluatePathAnimation = (anim, time) => {
  if (!anim.path || time < anim.startTime) return null;

  let elapsed = time - anim.startTime;
  if (anim.loop) elapsed = elapsed % anim.duration;
  else if (elapsed > anim.duration) return null;

  let t = Math.max(0, Math.min(1, elapsed / anim.duration));

  // Ping pong
  if (anim.pingPong) {
    const cycle = Math.floor(elapsed / anim.duration);
    if (cycle % 2 === 1) t = 1 - t;
  }

  // Apply easing
  const easingFn = EASING[anim.easing] || EASING.linear;
  t = easingFn(t);

  // Evaluate path
  const pos = anim.uniformSpeed
    ? evaluatePathUniform(anim.path, t)
    : evaluatePath(anim.path, t);

  return {
    x: pos.x,
    y: pos.y,
    rotation: anim.autoOrient ? pos.angle : 0,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PARENTING SYSTEM (Layer Linking)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Layer parent-child relationship manager.
 * Child layers inherit parent transforms (position, rotation, scale, opacity).
 */
export class LayerParentingSystem {
  constructor() {
    this.relationships = new Map(); // childId → parentId
    this.layerTransforms = new Map(); // layerId → {x, y, rotation, scaleX, scaleY, opacity}
  }

  /**
   * Set a parent for a child layer
   */
  setParent(childId, parentId) {
    // Prevent circular references
    if (this.wouldCreateCycle(childId, parentId)) {
      console.warn(`Cannot parent ${childId} to ${parentId}: would create cycle`);
      return false;
    }
    this.relationships.set(childId, parentId);
    return true;
  }

  /**
   * Remove parent from child
   */
  unparent(childId) {
    this.relationships.delete(childId);
  }

  /**
   * Check if parenting would create a cycle
   */
  wouldCreateCycle(childId, parentId) {
    let current = parentId;
    const visited = new Set();
    while (current) {
      if (current === childId) return true;
      if (visited.has(current)) return true;
      visited.add(current);
      current = this.relationships.get(current);
    }
    return false;
  }

  /**
   * Get all children of a parent (direct only)
   */
  getChildren(parentId) {
    const children = [];
    for (const [child, parent] of this.relationships) {
      if (parent === parentId) children.push(child);
    }
    return children;
  }

  /**
   * Get full ancestor chain for a layer
   */
  getAncestors(layerId) {
    const ancestors = [];
    let current = this.relationships.get(layerId);
    const visited = new Set();
    while (current && !visited.has(current)) {
      ancestors.push(current);
      visited.add(current);
      current = this.relationships.get(current);
    }
    return ancestors;
  }

  /**
   * Update a layer's local transform
   */
  setTransform(layerId, transform) {
    this.layerTransforms.set(layerId, {
      x: transform.x ?? 0,
      y: transform.y ?? 0,
      rotation: transform.rotation ?? 0,
      scaleX: transform.scaleX ?? 1,
      scaleY: transform.scaleY ?? 1,
      opacity: transform.opacity ?? 1,
    });
  }

  /**
   * Get world (accumulated) transform for a layer including all parents
   */
  getWorldTransform(layerId) {
    const local = this.layerTransforms.get(layerId) || { x:0, y:0, rotation:0, scaleX:1, scaleY:1, opacity:1 };
    const parentId = this.relationships.get(layerId);

    if (!parentId) return { ...local };

    const parentWorld = this.getWorldTransform(parentId);

    // Apply parent transform to child
    const rad = parentWorld.rotation * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);

    // Rotate child position by parent rotation, then scale
    const rx = local.x * parentWorld.scaleX;
    const ry = local.y * parentWorld.scaleY;
    const worldX = parentWorld.x + (rx * cos - ry * sin);
    const worldY = parentWorld.y + (rx * sin + ry * cos);

    return {
      x: worldX,
      y: worldY,
      rotation: parentWorld.rotation + local.rotation,
      scaleX: parentWorld.scaleX * local.scaleX,
      scaleY: parentWorld.scaleY * local.scaleY,
      opacity: parentWorld.opacity * local.opacity,
    };
  }

  /**
   * Convert world transform to CSS
   */
  getWorldCSS(layerId) {
    const w = this.getWorldTransform(layerId);
    return {
      transform: `translate(${w.x}px, ${w.y}px) rotate(${w.rotation}deg) scale(${w.scaleX}, ${w.scaleY})`,
      opacity: w.opacity,
    };
  }

  /**
   * Serialize for save/load
   */
  serialize() {
    return {
      relationships: Object.fromEntries(this.relationships),
      transforms: Object.fromEntries(this.layerTransforms),
    };
  }

  /**
   * Deserialize from saved data
   */
  static deserialize(data) {
    const sys = new LayerParentingSystem();
    if (data.relationships) {
      for (const [child, parent] of Object.entries(data.relationships)) {
        sys.relationships.set(child, parent);
      }
    }
    if (data.transforms) {
      for (const [id, transform] of Object.entries(data.transforms)) {
        sys.layerTransforms.set(id, transform);
      }
    }
    return sys;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. 3D CAMERA SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple 3D camera for 2.5D motion graphics.
 * Projects 3D layer positions through a perspective camera.
 */
export class Camera3D {
  constructor({
    x = 0, y = 0, z = -1000,      // Camera position
    targetX = 0, targetY = 0, targetZ = 0, // Look-at target
    fov = 60,                       // Field of view in degrees
    near = 1, far = 10000,         // Clipping planes
  } = {}) {
    this.position = { x, y, z };
    this.target = { x: targetX, y: targetY, z: targetZ };
    this.fov = fov;
    this.near = near;
    this.far = far;
    this.keyframes = []; // [{time, x, y, z, targetX, targetY, targetZ, fov}]
  }

  /**
   * Add a camera keyframe
   */
  addKeyframe(time, { x, y, z, targetX, targetY, targetZ, fov } = {}) {
    this.keyframes.push({
      time,
      x: x ?? this.position.x,
      y: y ?? this.position.y,
      z: z ?? this.position.z,
      targetX: targetX ?? this.target.x,
      targetY: targetY ?? this.target.y,
      targetZ: targetZ ?? this.target.z,
      fov: fov ?? this.fov,
    });
    this.keyframes.sort((a, b) => a.time - b.time);
  }

  /**
   * Interpolate camera state at time
   */
  getStateAtTime(time) {
    if (this.keyframes.length === 0) {
      return { ...this.position, ...this.target, fov: this.fov };
    }

    const kfs = this.keyframes;
    if (time <= kfs[0].time) return { ...kfs[0] };
    if (time >= kfs[kfs.length-1].time) return { ...kfs[kfs.length-1] };

    for (let i = 0; i < kfs.length - 1; i++) {
      if (time >= kfs[i].time && time <= kfs[i+1].time) {
        const t = (time - kfs[i].time) / (kfs[i+1].time - kfs[i].time);
        const e = EASING.easeInOut(t);
        const lerp = (a, b) => a + (b - a) * e;
        return {
          x: lerp(kfs[i].x, kfs[i+1].x),
          y: lerp(kfs[i].y, kfs[i+1].y),
          z: lerp(kfs[i].z, kfs[i+1].z),
          targetX: lerp(kfs[i].targetX, kfs[i+1].targetX),
          targetY: lerp(kfs[i].targetY, kfs[i+1].targetY),
          targetZ: lerp(kfs[i].targetZ, kfs[i+1].targetZ),
          fov: lerp(kfs[i].fov, kfs[i+1].fov),
        };
      }
    }
    return { ...kfs[kfs.length-1] };
  }

  /**
   * Project a 3D point through the camera → 2D screen position + scale
   * Returns { screenX, screenY, scale, visible }
   */
  project(worldX, worldY, worldZ, viewportWidth = 1920, viewportHeight = 1080, time = null) {
    const cam = time !== null ? this.getStateAtTime(time) : {
      ...this.position, ...this.target, fov: this.fov
    };

    // Camera-relative position
    const dx = worldX - cam.x;
    const dy = worldY - cam.y;
    const dz = worldZ - cam.z;

    // Simple perspective: distance from camera
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

    // Perspective scale factor
    const fovRad = cam.fov * Math.PI / 180;
    const perspScale = 1 / Math.tan(fovRad / 2);

    // Z-depth for perspective division
    const depthZ = dz || 0.001; // avoid division by zero
    const invZ = Math.abs(cam.z) / Math.max(1, Math.abs(depthZ));

    // Project to screen
    const screenX = viewportWidth / 2 + dx * perspScale * invZ;
    const screenY = viewportHeight / 2 + dy * perspScale * invZ;
    const scale = invZ;

    // Visibility check (behind camera or too far)
    const visible = depthZ > cam.z && dist < cam.far && dist > cam.near;

    return { screenX, screenY, scale, visible, depth: dist };
  }

  /**
   * Apply camera transform as CSS perspective on a container
   */
  getContainerCSS(time = null) {
    const cam = time !== null ? this.getStateAtTime(time) : {
      ...this.position, ...this.target, fov: this.fov
    };

    const perspective = Math.abs(cam.z) || 1000;

    return {
      perspective: `${perspective}px`,
      perspectiveOrigin: `${50 + (cam.x / 20)}% ${50 + (cam.y / 20)}%`,
      transformStyle: 'preserve-3d',
    };
  }

  /**
   * Get CSS transform for a layer at given 3D position
   */
  getLayerCSS(worldX, worldY, worldZ, time = null) {
    const cam = time !== null ? this.getStateAtTime(time) : {
      ...this.position, ...this.target, fov: this.fov
    };

    return {
      transform: `translate3d(${worldX - cam.x}px, ${worldY - cam.y}px, ${worldZ}px)`,
      transformStyle: 'preserve-3d',
    };
  }

  /**
   * Serialize for save/load
   */
  serialize() {
    return {
      position: this.position,
      target: this.target,
      fov: this.fov,
      near: this.near,
      far: this.far,
      keyframes: this.keyframes,
    };
  }

  static deserialize(data) {
    const cam = new Camera3D({
      x: data.position?.x, y: data.position?.y, z: data.position?.z,
      targetX: data.target?.x, targetY: data.target?.y, targetZ: data.target?.z,
      fov: data.fov, near: data.near, far: data.far,
    });
    cam.keyframes = data.keyframes || [];
    return cam;
  }
}

// ── Camera Presets ──
export const CAMERA_PRESETS = [
  { id:'static', name:'Static', keyframes:[] },
  { id:'dolly_in', name:'Dolly In', keyframes:[
    {time:0, x:0,y:0,z:-2000, targetX:0,targetY:0,targetZ:0, fov:60},
    {time:5, x:0,y:0,z:-500, targetX:0,targetY:0,targetZ:0, fov:60},
  ]},
  { id:'dolly_out', name:'Dolly Out', keyframes:[
    {time:0, x:0,y:0,z:-500, targetX:0,targetY:0,targetZ:0, fov:60},
    {time:5, x:0,y:0,z:-2000, targetX:0,targetY:0,targetZ:0, fov:60},
  ]},
  { id:'pan_left', name:'Pan Left', keyframes:[
    {time:0, x:300,y:0,z:-1000, targetX:300,targetY:0,targetZ:0, fov:60},
    {time:5, x:-300,y:0,z:-1000, targetX:-300,targetY:0,targetZ:0, fov:60},
  ]},
  { id:'pan_right', name:'Pan Right', keyframes:[
    {time:0, x:-300,y:0,z:-1000, targetX:-300,targetY:0,targetZ:0, fov:60},
    {time:5, x:300,y:0,z:-1000, targetX:300,targetY:0,targetZ:0, fov:60},
  ]},
  { id:'crane_up', name:'Crane Up', keyframes:[
    {time:0, x:0,y:200,z:-1000, targetX:0,targetY:200,targetZ:0, fov:60},
    {time:5, x:0,y:-200,z:-1000, targetX:0,targetY:-200,targetZ:0, fov:60},
  ]},
  { id:'orbit', name:'Orbit', keyframes:[
    {time:0, x:500,y:0,z:-866, targetX:0,targetY:0,targetZ:0, fov:60},
    {time:1.25, x:0,y:0,z:-1000, targetX:0,targetY:0,targetZ:0, fov:60},
    {time:2.5, x:-500,y:0,z:-866, targetX:0,targetY:0,targetZ:0, fov:60},
    {time:3.75, x:0,y:0,z:-1000, targetX:0,targetY:0,targetZ:0, fov:60},
    {time:5, x:500,y:0,z:-866, targetX:0,targetY:0,targetZ:0, fov:60},
  ]},
  { id:'vertigo', name:'Vertigo (Dolly Zoom)', keyframes:[
    {time:0, x:0,y:0,z:-2000, targetX:0,targetY:0,targetZ:0, fov:30},
    {time:5, x:0,y:0,z:-500, targetX:0,targetY:0,targetZ:0, fov:90},
  ]},
  { id:'shake', name:'Camera Shake', keyframes: (() => {
    const kfs = [];
    for (let i = 0; i <= 30; i++) {
      kfs.push({
        time: i * 0.1,
        x: (Math.random()-0.5)*20, y: (Math.random()-0.5)*15, z: -1000 + (Math.random()-0.5)*10,
        targetX: (Math.random()-0.5)*10, targetY: (Math.random()-0.5)*8, targetZ: 0,
        fov: 60,
      });
    }
    return kfs;
  })()},
];

export default {
  // Existing
  EASING, ANIMATABLE_PROPS, createKeyframe, interpolateKeyframes, keyframesToCSS,
  KeyframeEditor, TEXT_PRESETS, LOWER_THIRD_TEMPLATES,
  // Path Animation
  createBezierPath, addPathSegment, evaluatePath, computePathLength,
  evaluatePathUniform, PATH_PRESETS, createPathAnimation, evaluatePathAnimation,
  // Parenting
  LayerParentingSystem,
  // 3D Camera
  Camera3D, CAMERA_PRESETS,
};