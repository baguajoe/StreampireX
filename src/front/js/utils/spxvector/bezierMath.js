// src/front/js/utils/spxvector/bezierMath.js
// SPX Vector — Full cubic bezier math engine

// Point on cubic bezier at t
export function cubicBezierPoint(p0, p1, p2, p3, t) {
  const mt = 1-t;
  return {
    x: mt**3*p0.x + 3*mt**2*t*p1.x + 3*mt*t**2*p2.x + t**3*p3.x,
    y: mt**3*p0.y + 3*mt**2*t*p1.y + 3*mt*t**2*p2.y + t**3*p3.y,
  };
}

// Tangent on cubic bezier at t
export function cubicBezierTangent(p0, p1, p2, p3, t) {
  const mt = 1-t;
  return {
    x: 3*(mt**2*(p1.x-p0.x) + 2*mt*t*(p2.x-p1.x) + t**2*(p3.x-p2.x)),
    y: 3*(mt**2*(p1.y-p0.y) + 2*mt*t*(p2.y-p1.y) + t**2*(p3.y-p2.y)),
  };
}

// Split bezier at t (de Casteljau)
export function splitCubicBezier(p0, p1, p2, p3, t) {
  const q0 = lerp(p0,p1,t), q1 = lerp(p1,p2,t), q2 = lerp(p2,p3,t);
  const r0 = lerp(q0,q1,t), r1 = lerp(q1,q2,t);
  const s  = lerp(r0,r1,t);
  return [[p0,q0,r0,s],[s,r1,q2,p3]];
}

function lerp(a,b,t) { return { x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t }; }

// Approximate arc length of bezier
export function bezierLength(p0, p1, p2, p3, steps=20) {
  let len=0, prev=p0;
  for (let i=1;i<=steps;i++) {
    const pt=cubicBezierPoint(p0,p1,p2,p3,i/steps);
    len+=Math.hypot(pt.x-prev.x,pt.y-prev.y);
    prev=pt;
  }
  return len;
}

// Closest point on bezier to a given point (Newton's method)
export function closestPointOnBezier(p0, p1, p2, p3, px, py, steps=20) {
  let best={t:0,dist:Infinity};
  for (let i=0;i<=steps;i++) {
    const t=i/steps;
    const pt=cubicBezierPoint(p0,p1,p2,p3,t);
    const d=Math.hypot(pt.x-px,pt.y-py);
    if(d<best.dist){best={t,dist:d,x:pt.x,y:pt.y};}
  }
  return best;
}

// Build SVG path string from anchor points with bezier handles
export function anchorsToBezierPath(anchors=[], closed=false) {
  if (!anchors.length) return '';
  const pts = [];
  pts.push(`M ${anchors[0].x.toFixed(2)} ${anchors[0].y.toFixed(2)}`);
  for (let i=1; i<anchors.length; i++) {
    const prev = anchors[i-1];
    const curr = anchors[i];
    const c1x = (prev.outX !== undefined ? prev.outX : prev.x).toFixed(2);
    const c1y = (prev.outY !== undefined ? prev.outY : prev.y).toFixed(2);
    const c2x = (curr.inX  !== undefined ? curr.inX  : curr.x).toFixed(2);
    const c2y = (curr.inY  !== undefined ? curr.inY  : curr.y).toFixed(2);
    pts.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`);
  }
  if (closed && anchors.length > 1) {
    const prev = anchors[anchors.length-1];
    const curr = anchors[0];
    const c1x = (prev.outX !== undefined ? prev.outX : prev.x).toFixed(2);
    const c1y = (prev.outY !== undefined ? prev.outY : prev.y).toFixed(2);
    const c2x = (curr.inX  !== undefined ? curr.inX  : curr.x).toFixed(2);
    const c2y = (curr.inY  !== undefined ? curr.inY  : curr.y).toFixed(2);
    pts.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`);
    pts.push('Z');
  }
  return pts.join(' ');
}

// Create anchor with symmetric bezier handles
export function createAnchor(x, y, handleLen=40, angle=0) {
  const cos=Math.cos(angle), sin=Math.sin(angle);
  return {
    x, y,
    inX:  x - cos*handleLen, inY:  y - sin*handleLen,
    outX: x + cos*handleLen, outY: y + sin*handleLen,
    type: 'smooth', // smooth | corner | symmetric
  };
}

// Move anchor and its handles together
export function moveAnchor(anchor, dx, dy) {
  return {
    ...anchor,
    x: anchor.x+dx, y: anchor.y+dy,
    inX: anchor.inX+dx, inY: anchor.inY+dy,
    outX: anchor.outX+dx, outY: anchor.outY+dy,
  };
}

// Update in-handle, mirror out-handle if smooth
export function updateInHandle(anchor, inX, inY) {
  const dx=anchor.x-inX, dy=anchor.y-inY;
  const len=Math.hypot(dx,dy);
  if (anchor.type==='smooth' && len>0) {
    return { ...anchor, inX, inY, outX: anchor.x+dx/len*len, outY: anchor.y+dy/len*len };
  }
  return { ...anchor, inX, inY };
}

export function updateOutHandle(anchor, outX, outY) {
  const dx=anchor.x-outX, dy=anchor.y-outY;
  const len=Math.hypot(dx,dy);
  if (anchor.type==='smooth' && len>0) {
    return { ...anchor, outX, outY, inX: anchor.x+dx/len*len, inY: anchor.y+dy/len*len };
  }
  return { ...anchor, outX, outY };
}

export function convertToCorner(anchor) { return {...anchor, type:'corner'}; }
export function convertToSmooth(anchor) { return {...anchor, type:'smooth'}; }

export default {
  cubicBezierPoint, cubicBezierTangent, splitCubicBezier, bezierLength,
  closestPointOnBezier, anchorsToBezierPath, createAnchor, moveAnchor,
  updateInHandle, updateOutHandle, convertToCorner, convertToSmooth,
};
