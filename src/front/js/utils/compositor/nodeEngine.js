// src/front/js/utils/compositor/nodeEngine.js
// SPX Compositor — Real Node Execution Engine
// Topological sort + per-node pixel operations via Canvas 2D

// ─── Node Type Registry ───────────────────────────────────────────────────────
export const NODE_TYPES = {
  media:      { label: 'Media In',       color: '#00ffc8', inputs: [],           outputs: ['rgba'] },
  text:       { label: 'Text',           color: '#4a9eff', inputs: [],           outputs: ['rgba'] },
  solid:      { label: 'Solid Color',    color: '#ff9f45', inputs: [],           outputs: ['rgba'] },
  gradient:   { label: 'Gradient',       color: '#ff9f45', inputs: [],           outputs: ['rgba'] },
  noise:      { label: 'Fractal Noise',  color: '#a78bfa', inputs: [],           outputs: ['rgba'] },
  merge:      { label: 'Merge',          color: '#ff6b6b', inputs: ['a','b'],    outputs: ['rgba'] },
  over:       { label: 'Over',           color: '#ff6b6b', inputs: ['fg','bg'],  outputs: ['rgba'] },
  multiply:   { label: 'Multiply',       color: '#ff6b6b', inputs: ['a','b'],    outputs: ['rgba'] },
  screen:     { label: 'Screen',         color: '#ff6b6b', inputs: ['a','b'],    outputs: ['rgba'] },
  difference: { label: 'Difference',     color: '#ff6b6b', inputs: ['a','b'],    outputs: ['rgba'] },
  add:        { label: 'Add',            color: '#ff6b6b', inputs: ['a','b'],    outputs: ['rgba'] },
  transform:  { label: 'Transform',      color: '#ffd60a', inputs: ['src'],      outputs: ['rgba'] },
  crop:       { label: 'Crop',           color: '#ffd60a', inputs: ['src'],      outputs: ['rgba'] },
  blur:       { label: 'Blur',           color: '#26c6da', inputs: ['src'],      outputs: ['rgba'] },
  sharpen:    { label: 'Sharpen',        color: '#26c6da', inputs: ['src'],      outputs: ['rgba'] },
  colorgrade: { label: 'Color Grade',    color: '#26c6da', inputs: ['src'],      outputs: ['rgba'] },
  levels:     { label: 'Levels',         color: '#26c6da', inputs: ['src'],      outputs: ['rgba'] },
  chromakey:  { label: 'Chroma Key',     color: '#00ffc8', inputs: ['src'],      outputs: ['rgba'] },
  mask:       { label: 'Mask',           color: '#a78bfa', inputs: ['src','msk'],outputs: ['rgba'] },
  roto:       { label: 'Roto Mask',      color: '#a78bfa', inputs: ['src'],      outputs: ['rgba'] },
  tracker:    { label: 'Tracker',        color: '#ffd60a', inputs: ['src'],      outputs: ['rgba','data'] },
  shader:     { label: 'Shader',         color: '#ff6600', inputs: ['src'],      outputs: ['rgba'] },
  lut:        { label: 'LUT',            color: '#26c6da', inputs: ['src'],      outputs: ['rgba'] },
  value:      { label: 'Value',          color: '#8fa8bf', inputs: [],           outputs: ['value'] },
  output:     { label: 'Output',         color: '#00ffc8', inputs: ['src'],      outputs: [] },
};

// ─── Topological Sort ─────────────────────────────────────────────────────────
export function topoSortNodes(nodes = [], edges = []) {
  const indegree = new Map();
  const graph = new Map();
  nodes.forEach(n => { indegree.set(n.id, 0); graph.set(n.id, []); });
  edges.forEach(e => {
    const src = e.source || e.from;
    const tgt = e.target || e.to;
    if (!graph.has(src) || !graph.has(tgt)) return;
    graph.get(src).push(tgt);
    indegree.set(tgt, (indegree.get(tgt) || 0) + 1);
  });
  const queue = [];
  indegree.forEach((deg, id) => deg === 0 && queue.push(id));
  const out = [];
  while (queue.length) {
    const id = queue.shift();
    const node = nodes.find(n => n.id === id);
    if (node) out.push(node);
    for (const next of graph.get(id) || []) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  return out.length === nodes.length ? out : nodes;
}

export function getInputNodes(node, nodes = [], edges = []) {
  return edges
    .filter(e => (e.target || e.to) === node.id)
    .map(e => nodes.find(n => n.id === (e.source || e.from)))
    .filter(Boolean);
}

export function findOutputNode(nodes = []) {
  return nodes.find(n => (n.type||'').toLowerCase() === 'output') || nodes[nodes.length - 1] || null;
}

// ─── Canvas Factory ───────────────────────────────────────────────────────────
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function cloneCanvas(src) {
  const dst = makeCanvas(src.width, src.height);
  dst.getContext('2d').drawImage(src, 0, 0);
  return dst;
}

// ─── Per-Node Pixel Executors ─────────────────────────────────────────────────
const EXECUTORS = {

  solid(node, _inputs, W, H) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.fillStyle = node.properties?.color || '#000000';
    ctx.fillRect(0, 0, W, H);
    return c;
  },

  gradient(node, _inputs, W, H) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const p = node.properties || {};
    const g = ctx.createLinearGradient(0, 0, p.horizontal ? W : 0, p.horizontal ? 0 : H);
    g.addColorStop(0, p.color1 || '#000000');
    g.addColorStop(1, p.color2 || '#ffffff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    return c;
  },

  noise(_node, _inputs, W, H) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255 | 0;
      img.data[i] = v; img.data[i+1] = v; img.data[i+2] = v; img.data[i+3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  },

  text(node, _inputs, W, H) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const p = node.properties || {};
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = p.color || '#ffffff';
    ctx.font = `${p.bold ? 'bold ' : ''}${p.fontSize || 60}px ${p.font || 'Arial'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text || 'SPX', W / 2, H / 2);
    return c;
  },

  media(node, _inputs, W, H) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const el = node._mediaElement;
    if (el && (el.complete !== false)) {
      try { ctx.drawImage(el, 0, 0, W, H); return c; } catch(e) {}
    }
    // placeholder
    ctx.fillStyle = '#16263d';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#00ffc8';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, W-20, H-20);
    ctx.fillStyle = '#00ffc8';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(node.properties?.name || 'Media In', W/2, H/2);
    return c;
  },

  merge(node, inputs, W, H) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const p = node.properties || {};
    const mode = p.blendMode || 'source-over';
    const opacity = p.opacity ?? 1;
    if (inputs.a) ctx.drawImage(inputs.a, 0, 0, W, H);
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = opacity;
    if (inputs.b) ctx.drawImage(inputs.b, 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    return c;
  },

  over(_node, inputs, W, H) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    if (inputs.bg) ctx.drawImage(inputs.bg, 0, 0, W, H);
    if (inputs.fg) ctx.drawImage(inputs.fg, 0, 0, W, H);
    return c;
  },

  multiply(_node, inputs, W, H) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    if (inputs.a) ctx.drawImage(inputs.a, 0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply';
    if (inputs.b) ctx.drawImage(inputs.b, 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    return c;
  },

  screen(_node, inputs, W, H) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    if (inputs.a) ctx.drawImage(inputs.a, 0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    if (inputs.b) ctx.drawImage(inputs.b, 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    return c;
  },

  difference(_node, inputs, W, H) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    if (inputs.a) ctx.drawImage(inputs.a, 0, 0, W, H);
    ctx.globalCompositeOperation = 'difference';
    if (inputs.b) ctx.drawImage(inputs.b, 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    return c;
  },

  add(_node, inputs, W, H) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    if (inputs.a) ctx.drawImage(inputs.a, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    if (inputs.b) ctx.drawImage(inputs.b, 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    return c;
  },

  transform(node, inputs, W, H) {
    const src = inputs.src; if (!src) return makeCanvas(W, H);
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const p = node.properties || {};
    const tx = p.x || 0, ty = p.y || 0;
    const sx = p.scaleX ?? 1, sy = p.scaleY ?? 1;
    const rot = ((p.rotation || 0) * Math.PI) / 180;
    const ox = p.pivotX ?? W / 2, oy = p.pivotY ?? H / 2;
    ctx.save();
    ctx.translate(ox + tx, oy + ty);
    ctx.rotate(rot);
    ctx.scale(sx, sy);
    ctx.drawImage(src, -ox, -oy, W, H);
    ctx.restore();
    return c;
  },

  crop(node, inputs, W, H) {
    const src = inputs.src; if (!src) return makeCanvas(W, H);
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const p = node.properties || {};
    const x = p.x || 0, y = p.y || 0;
    const w = p.width || W, h = p.height || H;
    ctx.drawImage(src, x, y, w, h, 0, 0, W, H);
    return c;
  },

  blur(node, inputs, W, H) {
    const src = inputs.src; if (!src) return makeCanvas(W, H);
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const radius = node.properties?.radius ?? 4;
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(src, 0, 0, W, H);
    ctx.filter = 'none';
    return c;
  },

  sharpen(node, inputs, W, H) {
    const src = inputs.src; if (!src) return makeCanvas(W, H);
    const c = cloneCanvas(src);
    const ctx = c.getContext('2d');
    // Simple unsharp mask via canvas
    const strength = node.properties?.strength ?? 0.5;
    const blurred = makeCanvas(W, H);
    const bctx = blurred.getContext('2d');
    bctx.filter = 'blur(2px)';
    bctx.drawImage(src, 0, 0, W, H);
    bctx.filter = 'none';
    const orig = ctx.getImageData(0, 0, W, H);
    const blur = bctx.getImageData(0, 0, W, H);
    for (let i = 0; i < orig.data.length; i += 4) {
      orig.data[i]   = Math.min(255, orig.data[i]   + (orig.data[i]   - blur.data[i])   * strength);
      orig.data[i+1] = Math.min(255, orig.data[i+1] + (orig.data[i+1] - blur.data[i+1]) * strength);
      orig.data[i+2] = Math.min(255, orig.data[i+2] + (orig.data[i+2] - blur.data[i+2]) * strength);
    }
    ctx.putImageData(orig, 0, 0);
    return c;
  },

  colorgrade(node, inputs, W, H) {
    const src = inputs.src; if (!src) return makeCanvas(W, H);
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0, W, H);
    const p = node.properties || {};
    const brightness = p.brightness ?? 0;
    const contrast   = p.contrast   ?? 1;
    const saturation = p.saturation ?? 1;
    const hue        = p.hue        ?? 0;
    ctx.filter = [
      `brightness(${1 + brightness})`,
      `contrast(${contrast})`,
      `saturate(${saturation})`,
      `hue-rotate(${hue}deg)`,
    ].join(' ');
    const tmp = makeCanvas(W, H);
    tmp.getContext('2d').drawImage(c, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.filter = [
      `brightness(${1 + brightness})`,
      `contrast(${contrast})`,
      `saturate(${saturation})`,
      `hue-rotate(${hue}deg)`,
    ].join(' ');
    ctx.drawImage(src, 0, 0, W, H);
    ctx.filter = 'none';
    return c;
  },

  levels(node, inputs, W, H) {
    const src = inputs.src; if (!src) return makeCanvas(W, H);
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0, W, H);
    const p = node.properties || {};
    const inBlack  = p.inBlack  ?? 0;
    const inWhite  = p.inWhite  ?? 255;
    const gamma    = p.gamma    ?? 1;
    const outBlack = p.outBlack ?? 0;
    const outWhite = p.outWhite ?? 255;
    const img = ctx.getImageData(0, 0, W, H);
    const range = inWhite - inBlack || 1;
    const outRange = outWhite - outBlack;
    for (let i = 0; i < img.data.length; i += 4) {
      for (let ch = 0; ch < 3; ch++) {
        let v = (img.data[i+ch] - inBlack) / range;
        v = Math.max(0, Math.min(1, v));
        v = Math.pow(v, 1 / gamma);
        img.data[i+ch] = outBlack + v * outRange;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  },

  chromakey(node, inputs, W, H) {
    const src = inputs.src; if (!src) return makeCanvas(W, H);
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0, W, H);
    const p = node.properties || {};
    const keyR = p.keyR ?? 0, keyG = p.keyG ?? 255, keyB = p.keyB ?? 0;
    const thresh = p.threshold ?? 80;
    const img = ctx.getImageData(0, 0, W, H);
    for (let i = 0; i < img.data.length; i += 4) {
      const dr = img.data[i]   - keyR;
      const dg = img.data[i+1] - keyG;
      const db = img.data[i+2] - keyB;
      const dist = Math.sqrt(dr*dr + dg*dg + db*db);
      if (dist < thresh) img.data[i+3] = 0;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  },

  mask(_node, inputs, W, H) {
    const src = inputs.src; if (!src) return makeCanvas(W, H);
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    if (inputs.msk) {
      ctx.drawImage(inputs.msk, 0, 0, W, H);
      ctx.globalCompositeOperation = 'source-in';
    }
    ctx.drawImage(src, 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    return c;
  },

  roto(node, inputs, W, H) {
    const src = inputs.src; if (!src) return makeCanvas(W, H);
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const points = node.properties?.points || [];
    if (points.length < 3) { ctx.drawImage(src, 0, 0, W, H); return c; }
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const pt = points[i];
      ctx.bezierCurveTo(
        pt.inX ?? pt.x, pt.inY ?? pt.y,
        pt.outX ?? pt.x, pt.outY ?? pt.y,
        pt.x, pt.y
      );
    }
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ctx.drawImage(src, 0, 0, W, H);
    ctx.restore();
    return c;
  },

  lut(node, inputs, W, H) {
    const src = inputs.src; if (!src) return makeCanvas(W, H);
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0, W, H);
    const img = ctx.getImageData(0, 0, W, H);
    const type = node.properties?.lut || 'none';
    for (let i = 0; i < img.data.length; i += 4) {
      let r = img.data[i]/255, g = img.data[i+1]/255, b = img.data[i+2]/255;
      if (type === 'cineon')   { r = Math.pow(r, 1/1.7); g = Math.pow(g, 1/1.7); b = Math.pow(b, 1/1.7); }
      if (type === 'rec709')   { r = r < 0.018 ? r*4.5 : 1.099*Math.pow(r,0.45)-0.099; g = g < 0.018 ? g*4.5 : 1.099*Math.pow(g,0.45)-0.099; b = b < 0.018 ? b*4.5 : 1.099*Math.pow(b,0.45)-0.099; }
      if (type === 'slog2')    { r = 0.432699*Math.log10(r*155+0.037584)+0.616596; g = 0.432699*Math.log10(g*155+0.037584)+0.616596; b = 0.432699*Math.log10(b*155+0.037584)+0.616596; }
      if (type === 'vintage')  { r = r*0.9+0.05; b = b*0.85; g = g*0.95+0.02; }
      if (type === 'teal_orange') { r = Math.min(1, r*1.2); b = Math.min(1, b*0.8+0.1); g = g*0.95; }
      img.data[i]   = Math.min(255, Math.max(0, r*255));
      img.data[i+1] = Math.min(255, Math.max(0, g*255));
      img.data[i+2] = Math.min(255, Math.max(0, b*255));
    }
    ctx.putImageData(img, 0, 0);
    return c;
  },

  shader(node, inputs, W, H) {
    // Canvas 2D shader simulation — real WebGL handled by ShaderPreviewCanvas
    const src = inputs.src;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    if (src) ctx.drawImage(src, 0, 0, W, H);
    const shaderType = node.shader || node.properties?.shader || 'glow';
    if (shaderType === 'glow') {
      ctx.filter = 'blur(8px) brightness(1.5)';
      const tmp = makeCanvas(W, H);
      tmp.getContext('2d').drawImage(c, 0, 0);
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(tmp, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (shaderType === 'vignette') {
      const g = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.85);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    if (shaderType === 'film_grain') {
      const img = ctx.getImageData(0, 0, W, H);
      const amount = node.properties?.amount ?? 20;
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (Math.random() - 0.5) * amount;
        img.data[i]   = Math.min(255, Math.max(0, img.data[i]   + n));
        img.data[i+1] = Math.min(255, Math.max(0, img.data[i+1] + n));
        img.data[i+2] = Math.min(255, Math.max(0, img.data[i+2] + n));
      }
      ctx.putImageData(img, 0, 0);
    }
    if (shaderType === 'chromatic_aberration') {
      const img = ctx.getImageData(0, 0, W, H);
      const shift = node.properties?.shift ?? 4;
      const shifted = ctx.getImageData(0, 0, W, H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const ri = (y * W + Math.min(W-1, x + shift)) * 4;
          const bi = (y * W + Math.max(0, x - shift)) * 4;
          shifted.data[i]   = img.data[ri];
          shifted.data[i+2] = img.data[bi+2];
        }
      }
      ctx.putImageData(shifted, 0, 0);
    }
    return c;
  },

  value(node) { return node.value ?? 0; },
  output(_node, inputs) { return inputs.src || null; },
};

// ─── Main Graph Evaluator ─────────────────────────────────────────────────────
export function evaluateGraph(nodes = [], edges = [], options = {}) {
  const W = options.width  || 1280;
  const H = options.height || 720;
  const cache = new Map();
  const results = {};
  const sorted = topoSortNodes(nodes, edges);

  for (const node of sorted) {
    const type = (node.type || 'solid').toLowerCase();

    // Gather inputs from connected nodes
    const inputEdges = edges.filter(e => (e.target || e.to) === node.id);
    const inputs = {};
    inputEdges.forEach(e => {
      const slot = e.targetHandle || e.inputSlot || 'src';
      const srcId = e.source || e.from;
      if (cache.has(srcId)) inputs[slot] = cache.get(srcId);
    });
    // Also map first input to common slot names
    const firstInput = Object.values(inputs)[0];
    if (firstInput && !inputs.src) inputs.src = firstInput;
    if (firstInput && !inputs.a)   inputs.a   = firstInput;

    const executor = EXECUTORS[type];
    let result = null;
    try {
      result = executor ? executor(node, inputs, W, H) : makeCanvas(W, H);
    } catch (err) {
      console.warn(`[nodeEngine] Node ${node.id} (${type}) failed:`, err);
      result = makeCanvas(W, H);
    }

    cache.set(node.id, result);
    results[node.id] = result;
  }

  const outputNode = findOutputNode(sorted);
  return {
    results,
    finalOutput: outputNode ? cache.get(outputNode.id) : null,
    nodeCount: sorted.length,
    executed: sorted.map(n => n.id),
  };
}

export default { evaluateGraph, topoSortNodes, getInputNodes, findOutputNode, NODE_TYPES };
