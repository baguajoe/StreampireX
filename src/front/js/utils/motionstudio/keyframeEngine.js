// src/front/js/utils/motionstudio/keyframeEngine.js
// SPX Motion — Keyframe interpolation engine with easing

import { applyEasing, EASING_FUNCTIONS } from "./easing";

export const ANIMATABLE_PROPS = {
  x:          { label:'X Position',   default:100,  unit:'px', min:-2000, max:2000 },
  y:          { label:'Y Position',   default:100,  unit:'px', min:-2000, max:2000 },
  scaleX:     { label:'Scale X',      default:1,    unit:'',   min:0,     max:10 },
  scaleY:     { label:'Scale Y',      default:1,    unit:'',   min:0,     max:10 },
  rotation:   { label:'Rotation',     default:0,    unit:'°',  min:-360,  max:360 },
  opacity:    { label:'Opacity',      default:1,    unit:'',   min:0,     max:1 },
  blur:       { label:'Blur',         default:0,    unit:'px', min:0,     max:100 },
  brightness: { label:'Brightness',   default:100,  unit:'%',  min:0,     max:400 },
  contrast:   { label:'Contrast',     default:100,  unit:'%',  min:0,     max:400 },
  saturate:   { label:'Saturation',   default:100,  unit:'%',  min:0,     max:400 },
  hueRotate:  { label:'Hue Rotate',   default:0,    unit:'°',  min:-360,  max:360 },
  fontSize:   { label:'Font Size',    default:42,   unit:'px', min:4,     max:400 },
  width:      { label:'Width',        default:200,  unit:'px', min:0,     max:4000 },
  height:     { label:'Height',       default:100,  unit:'px', min:0,     max:4000 },
  z:          { label:'Z Depth',      default:0,    unit:'',   min:-1000, max:1000 },
};

export function createKeyframe(time, prop, value, easing = 'linear') {
  return { time, prop, value, easing };
}

// keyframes format: { x: [{time, value, easing}, ...], opacity: [...], ... }
export function interpolateKeyframes(keyframes, currentTime) {
  const result = {};
  for (const [prop, kfList] of Object.entries(keyframes)) {
    if (!Array.isArray(kfList) || kfList.length === 0) continue;
    const sorted = [...kfList].sort((a, b) => a.time - b.time);
    if (currentTime <= sorted[0].time) { result[prop] = sorted[0].value; continue; }
    if (currentTime >= sorted[sorted.length-1].time) { result[prop] = sorted[sorted.length-1].value; continue; }
    for (let i = 0; i < sorted.length - 1; i++) {
      const k0 = sorted[i], k1 = sorted[i+1];
      if (currentTime >= k0.time && currentTime <= k1.time) {
        const t = (currentTime - k0.time) / (k1.time - k0.time);
        const easedT = applyEasing(k0.easing || 'linear', t);
        result[prop] = k0.value + (k1.value - k0.value) * easedT;
        break;
      }
    }
  }
  return result;
}

// Add or update a keyframe for a layer property
export function addKeyframe(layer, prop, time, value, easing = 'easeInOut') {
  const kfs = { ...(layer.keyframes || {}) };
  const list = [...(kfs[prop] || [])];
  const idx = list.findIndex(k => Math.abs(k.time - time) < 0.001);
  if (idx >= 0) list[idx] = { time, value, easing };
  else list.push({ time, value, easing });
  list.sort((a,b) => a.time - b.time);
  return { ...layer, keyframes: { ...kfs, [prop]: list } };
}

export function removeKeyframe(layer, prop, time) {
  const kfs = { ...(layer.keyframes || {}) };
  const list = (kfs[prop] || []).filter(k => Math.abs(k.time - time) >= 0.001);
  return { ...layer, keyframes: { ...kfs, [prop]: list } };
}

export function getAllKeyframeTimes(layer) {
  const times = new Set();
  for (const list of Object.values(layer.keyframes || {})) {
    list.forEach(k => times.add(k.time));
  }
  return [...times].sort((a,b) => a-b);
}

export function hasKeyframes(layer) {
  return Object.values(layer.keyframes || {}).some(l => l.length > 0);
}

export function getLayerValueAtTime(layer, prop, time) {
  if (!layer.keyframes?.[prop]?.length) return layer[prop] ?? ANIMATABLE_PROPS[prop]?.default ?? 0;
  return interpolateKeyframes(layer.keyframes, time)[prop] ?? layer[prop];
}

export default { interpolateKeyframes, createKeyframe, addKeyframe, removeKeyframe,
  getAllKeyframeTimes, hasKeyframes, getLayerValueAtTime, ANIMATABLE_PROPS };
