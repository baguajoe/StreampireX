// src/front/js/utils/spxvector/booleanOps.js
// SPX Vector — Boolean operations (union, subtract, intersect, exclude)
// Canvas 2D path-based implementation

function layerToPath2D(layer) {
  const p = new Path2D();
  if (layer.type === 'rect') {
    const r = layer.borderRadius || 0;
    if (r > 0) {
      const x=layer.x,y=layer.y,w=layer.width,h=layer.height;
      p.moveTo(x+r,y);
      p.lineTo(x+w-r,y); p.arcTo(x+w,y,x+w,y+r,r);
      p.lineTo(x+w,y+h-r); p.arcTo(x+w,y+h,x+w-r,y+h,r);
      p.lineTo(x+r,y+h); p.arcTo(x,y+h,x,y+h-r,r);
      p.lineTo(x,y+r); p.arcTo(x,y,x+r,y,r);
      p.closePath();
    } else {
      p.rect(layer.x,layer.y,layer.width,layer.height);
    }
  } else if (layer.type === 'ellipse') {
    p.ellipse(layer.x+layer.width/2,layer.y+layer.height/2,layer.width/2,layer.height/2,0,0,Math.PI*2);
  } else if (layer.type === 'path' && layer.anchors?.length) {
    const { anchorsToBezierPath } = require('./bezierMath');
    const d = anchorsToBezierPath(layer.anchors, layer.closed);
    if (d) return new Path2D(d);
  }
  return p;
}

// Rasterize two layers on offscreen canvas and combine
function rasterizeBoolean(layerA, layerB, op, W=2000, H=2000) {
  const make = (layer) => {
    const c = document.createElement('canvas'); c.width=W; c.height=H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fill(layerToPath2D(layer));
    return ctx.getImageData(0,0,W,H);
  };

  const dataA = make(layerA);
  const dataB = make(layerB);
  const result = new ImageData(W, H);

  for (let i=0; i<dataA.data.length; i+=4) {
    const a = dataA.data[i] > 128;
    const b = dataB.data[i] > 128;
    let fill = false;
    if (op === 'union')     fill = a || b;
    if (op === 'subtract')  fill = a && !b;
    if (op === 'intersect') fill = a && b;
    if (op === 'exclude')   fill = (a||b) && !(a&&b);
    if (fill) { result.data[i]=255; result.data[i+1]=255; result.data[i+2]=255; result.data[i+3]=255; }
  }
  return result;
}

export function booleanUnion(layerA, layerB) {
  return _makeBooleanLayer(layerA, layerB, 'union');
}

export function booleanSubtract(layerA, layerB) {
  return _makeBooleanLayer(layerA, layerB, 'subtract');
}

export function booleanIntersect(layerA, layerB) {
  return _makeBooleanLayer(layerA, layerB, 'intersect');
}

export function booleanExclude(layerA, layerB) {
  return _makeBooleanLayer(layerA, layerB, 'exclude');
}

function _makeBooleanLayer(layerA, layerB, op) {
  // Return a combined path layer approximated by bounding box for now
  // Real boolean ops require polygon clipping library (e.g. polybool)
  const x = Math.min(layerA.x, layerB.x);
  const y = Math.min(layerA.y, layerB.y);
  const x2 = Math.max(layerA.x+(layerA.width||0), layerB.x+(layerB.width||0));
  const y2 = Math.max(layerA.y+(layerA.height||0), layerB.y+(layerB.height||0));
  return {
    id: `bool_${Date.now()}`,
    type: 'boolean',
    booleanOp: op,
    sourceIds: [layerA.id, layerB.id],
    x, y, width: x2-x, height: y2-y,
    fill: layerA.fill || layerA.color || '#00ffc8',
    stroke: layerA.stroke || null,
    strokeWidth: layerA.strokeWidth || 0,
    name: `${op} (${layerA.name||''} + ${layerB.name||''})`,
  };
}

export default { booleanUnion, booleanSubtract, booleanIntersect, booleanExclude };
