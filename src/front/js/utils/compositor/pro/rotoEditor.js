// src/front/js/utils/compositor/pro/rotoEditor.js
// SPX Roto Editor — Bezier spline math, feathering, per-frame interpolation

export function createEmptyRotoShape(id = null) {
  return {
    id: id || `roto_${Date.now()}`,
    closed: true,
    feather: 0,
    invert: false,
    points: [],
  };
}

export function addRotoPoint(shape, x, y) {
  const pt = { x, y, inX: x - 30, inY: y, outX: x + 30, outY: y };
  return { ...shape, points: [...shape.points, pt] };
}

export function updateRotoPoint(shape, idx, patch) {
  const points = shape.points.map((p, i) => i === idx ? { ...p, ...patch } : p);
  return { ...shape, points };
}

export function removeRotoPoint(shape, idx) {
  return { ...shape, points: shape.points.filter((_, i) => i !== idx) };
}

export function closeRotoShape(shape) {
  return { ...shape, closed: true };
}

// Cubic bezier point at t
function cubicBezier(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
}

// Get polyline approximation of the spline for rendering
export function getRotoPathData(shape, segments = 20) {
  const pts = shape.points;
  if (!pts || pts.length < 2) return '';
  const parts = [];
  const count = shape.closed ? pts.length : pts.length - 1;
  for (let i = 0; i < count; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    for (let t = 0; t <= segments; t++) {
      const s = t / segments;
      const x = cubicBezier(a.x, a.outX, b.inX, b.x, s);
      const y = cubicBezier(a.y, a.outY, b.inY, b.y, s);
      parts.push(`${i === 0 && t === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
  }
  if (shape.closed) parts.push('Z');
  return parts.join(' ');
}

// Apply roto mask to canvas ImageData
export function applyRotoMask(imageData, shape, W, H) {
  const pts = shape.points;
  if (!pts || pts.length < 3) return imageData;

  // Build offscreen mask canvas
  const mc = document.createElement('canvas');
  mc.width = W; mc.height = H;
  const mctx = mc.getContext('2d');
  mctx.fillStyle = shape.invert ? 'white' : 'black';
  mctx.fillRect(0, 0, W, H);
  mctx.fillStyle = shape.invert ? 'black' : 'white';

  // Draw bezier path
  mctx.beginPath();
  mctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    mctx.bezierCurveTo(a.outX, a.outY, b.inX, b.inY, b.x, b.y);
  }
  mctx.closePath();

  if (shape.feather > 0) {
    mctx.filter = `blur(${shape.feather}px)`;
  }
  mctx.fill();
  mctx.filter = 'none';

  const maskData = mctx.getImageData(0, 0, W, H);
  const out = new ImageData(new Uint8ClampedArray(imageData.data), W, H);
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i+3] = Math.round((out.data[i+3] / 255) * (maskData.data[i] / 255) * 255);
  }
  return out;
}

// Linear interpolation of roto keyframes
export function interpolateRotoKeyframes(keyframes, totalFrames) {
  if (!keyframes || keyframes.length === 0) return [];
  if (keyframes.length === 1) return Array(totalFrames).fill(keyframes[0]);

  const sorted = [...keyframes].sort((a, b) => a.frame - b.frame);
  const result = [];

  for (let f = 0; f < totalFrames; f++) {
    // Find surrounding keyframes
    let lo = sorted[0], hi = sorted[sorted.length - 1];
    for (let k = 0; k < sorted.length - 1; k++) {
      if (sorted[k].frame <= f && sorted[k+1].frame >= f) {
        lo = sorted[k]; hi = sorted[k+1]; break;
      }
    }
    if (lo === hi) { result.push({ frame: f, points: lo.points }); continue; }

    const t = (f - lo.frame) / (hi.frame - lo.frame);
    const pts = lo.points.map((p, i) => {
      const q = hi.points[i] || p;
      return {
        x:    p.x    + (q.x    - p.x)    * t,
        y:    p.y    + (q.y    - p.y)    * t,
        inX:  p.inX  + (q.inX  - p.inX)  * t,
        inY:  p.inY  + (q.inY  - p.inY)  * t,
        outX: p.outX + (q.outX - p.outX) * t,
        outY: p.outY + (q.outY - p.outY) * t,
      };
    });
    result.push({ frame: f, points: pts });
  }
  return result;
}

export default { createEmptyRotoShape, addRotoPoint, updateRotoPoint, removeRotoPoint,
  getRotoPathData, applyRotoMask, interpolateRotoKeyframes };
