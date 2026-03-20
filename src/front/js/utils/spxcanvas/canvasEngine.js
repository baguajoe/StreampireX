// src/front/js/utils/spxcanvas/canvasEngine.js
// SPX Canvas — Real Canvas 2D pixel rendering engine

// ─── Layer Renderers ──────────────────────────────────────────────────────────

export function renderLayer(ctx, layer, selected = false) {
  if (!layer.visible && layer.visible !== undefined) return;
  ctx.save();

  const x = layer.x || 0, y = layer.y || 0;
  const w = layer.width || 100, h = layer.height || 100;
  const cx = x + w/2, cy = y + h/2;
  const rot = ((layer.rotation || 0) * Math.PI) / 180;
  const opacity = layer.opacity ?? 1;
  const blend = layer.blendMode || 'source-over';

  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = blend;

  // Transform from center
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(layer.scaleX ?? 1, layer.scaleY ?? 1);
  ctx.translate(-cx, -cy);

  // Apply effects
  const filter = buildFilter(layer.effects || []);
  if (filter) ctx.filter = filter;

  switch (layer.type) {
    case 'rect':      renderRect(ctx, layer, x, y, w, h); break;
    case 'ellipse':   renderEllipse(ctx, layer, x, y, w, h); break;
    case 'triangle':  renderTriangle(ctx, layer, x, y, w, h); break;
    case 'star':      renderStar(ctx, layer, x, y, w, h); break;
    case 'polygon':   renderPolygon(ctx, layer, x, y, w, h); break;
    case 'line':      renderLine(ctx, layer); break;
    case 'brush':     renderBrush(ctx, layer); break;
    case 'text':      renderText(ctx, layer, x, y, w, h); break;
    case 'image':     renderImage(ctx, layer, x, y, w, h); break;
    case 'gradient':  renderGradientLayer(ctx, layer, x, y, w, h); break;
    case 'pattern':   renderPatternLayer(ctx, layer, x, y, w, h); break;
    default:          renderRect(ctx, layer, x, y, w, h);
  }

  ctx.filter = 'none';

  // Selection handles
  if (selected) drawSelectionHandles(ctx, x, y, w, h);

  ctx.restore();
}

function applyFillStroke(ctx, layer, path2d = null) {
  const fill = layer.fill !== undefined ? layer.fill : (layer.color || '#00ffc8');
  const stroke = layer.stroke || null;
  const strokeW = layer.strokeWidth || 0;

  if (fill && fill !== 'none') {
    ctx.fillStyle = buildFill(ctx, layer, fill);
    path2d ? ctx.fill(path2d) : ctx.fill();
  }
  if (stroke && strokeW > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;
    ctx.lineCap = layer.lineCap || 'round';
    ctx.lineJoin = layer.lineJoin || 'round';
    if (layer.dashArray) ctx.setLineDash(layer.dashArray);
    path2d ? ctx.stroke(path2d) : ctx.stroke();
    ctx.setLineDash([]);
  }
}

function buildFill(ctx, layer, fill) {
  if (!fill || typeof fill === 'string') return fill || 'transparent';
  if (fill.type === 'linear') {
    const g = ctx.createLinearGradient(fill.x1||0, fill.y1||0, fill.x2||layer.width||100, fill.y2||0);
    (fill.stops||[]).forEach(s => g.addColorStop(s.offset, s.color));
    return g;
  }
  if (fill.type === 'radial') {
    const g = ctx.createRadialGradient(
      fill.cx||(layer.x+(layer.width||100)/2), fill.cy||(layer.y+(layer.height||100)/2), fill.r0||0,
      fill.cx||(layer.x+(layer.width||100)/2), fill.cy||(layer.y+(layer.height||100)/2), fill.r1||(Math.max(layer.width||100,layer.height||100)/2)
    );
    (fill.stops||[]).forEach(s => g.addColorStop(s.offset, s.color));
    return g;
  }
  return fill;
}

function renderRect(ctx, layer, x, y, w, h) {
  const r = layer.borderRadius || 0;
  ctx.beginPath();
  if (r > 0 && ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  applyFillStroke(ctx, layer);
}

function renderEllipse(ctx, layer, x, y, w, h) {
  ctx.beginPath();
  ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, Math.PI*2);
  applyFillStroke(ctx, layer);
}

function renderTriangle(ctx, layer, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x + w/2, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  applyFillStroke(ctx, layer);
}

function renderStar(ctx, layer, x, y, w, h) {
  const pts = layer.points || 5;
  const cx = x+w/2, cy = y+h/2;
  const outerR = Math.min(w,h)/2, innerR = outerR*(layer.innerRadius||0.4);
  ctx.beginPath();
  for (let i = 0; i < pts*2; i++) {
    const angle = (i*Math.PI/pts) - Math.PI/2;
    const r = i%2===0 ? outerR : innerR;
    i===0 ? ctx.moveTo(cx+r*Math.cos(angle),cy+r*Math.sin(angle))
           : ctx.lineTo(cx+r*Math.cos(angle),cy+r*Math.sin(angle));
  }
  ctx.closePath();
  applyFillStroke(ctx, layer);
}

function renderPolygon(ctx, layer, x, y, w, h) {
  const sides = layer.sides || 6;
  const cx = x+w/2, cy = y+h/2, r = Math.min(w,h)/2;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (i*2*Math.PI/sides) - Math.PI/2;
    i===0 ? ctx.moveTo(cx+r*Math.cos(angle),cy+r*Math.sin(angle))
           : ctx.lineTo(cx+r*Math.cos(angle),cy+r*Math.sin(angle));
  }
  ctx.closePath();
  applyFillStroke(ctx, layer);
}

function renderLine(ctx, layer) {
  const pts = layer.points || [];
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.strokeStyle = layer.color || '#00ffc8';
  ctx.lineWidth = layer.strokeWidth || 2;
  ctx.lineCap = layer.lineCap || 'round';
  ctx.lineJoin = layer.lineJoin || 'round';
  if (layer.dashArray) ctx.setLineDash(layer.dashArray);
  ctx.stroke();
  ctx.setLineDash([]);
}

function renderBrush(ctx, layer) {
  const pts = layer.points || [];
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length-1; i++) {
    const mx = (pts[i].x + pts[i+1].x)/2;
    const my = (pts[i].y + pts[i+1].y)/2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const last = pts[pts.length-1];
  ctx.lineTo(last.x, last.y);
  ctx.strokeStyle = layer.color || '#ffffff';
  ctx.lineWidth = layer.brushSize || 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = (layer.opacity ?? 1) * (layer.brushOpacity ?? 1);
  ctx.stroke();
}

function renderText(ctx, layer, x, y, w, h) {
  const text = layer.text || 'Text';
  const size = layer.fontSize || 32;
  const weight = layer.fontWeight || 400;
  const family = layer.fontFamily || 'Arial';
  const color = layer.color || '#ffffff';
  const align = layer.textAlign || 'left';
  const valign = layer.textVAlign || 'top';
  const leading = layer.lineHeight || 1.4;

  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = buildFill(ctx, layer, color);
  ctx.textAlign = align;
  ctx.textBaseline = 'top';

  if (layer.textShadow) {
    ctx.shadowColor   = layer.textShadow.color || '#000';
    ctx.shadowBlur    = layer.textShadow.blur  || 8;
    ctx.shadowOffsetX = layer.textShadow.x     || 2;
    ctx.shadowOffsetY = layer.textShadow.y     || 2;
  }

  if (layer.textStroke) {
    ctx.strokeStyle = layer.textStroke.color || '#000';
    ctx.lineWidth   = layer.textStroke.width || 2;
  }

  const lines = text.split('\n');
  const totalH = lines.length * size * leading;
  let startY = y;
  if (valign === 'middle') startY = y + (h - totalH) / 2;
  if (valign === 'bottom') startY = y + h - totalH;

  const startX = align === 'center' ? x+w/2 : align === 'right' ? x+w : x;

  lines.forEach((line, i) => {
    const ly = startY + i * size * leading;
    if (layer.textStroke) ctx.strokeText(line, startX, ly);
    ctx.fillText(line, startX, ly);
  });

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
}

function renderImage(ctx, layer, x, y, w, h) {
  const el = layer._element;
  if (!el) {
    ctx.fillStyle = '#1c2a38';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#00ffc8';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📷 ' + (layer.name||'Image'), x+w/2, y+h/2);
    return;
  }
  if (layer.objectFit === 'contain') {
    const scale = Math.min(w/el.naturalWidth, h/el.naturalHeight);
    const dw = el.naturalWidth*scale, dh = el.naturalHeight*scale;
    ctx.drawImage(el, x+(w-dw)/2, y+(h-dh)/2, dw, dh);
  } else {
    ctx.drawImage(el, x, y, w, h);
  }
}

function renderGradientLayer(ctx, layer, x, y, w, h) {
  const stops = layer.stops || [{ offset:0, color:'#0b1220' }, { offset:1, color:'#00ffc8' }];
  const angle = (layer.gradientAngle || 0) * Math.PI / 180;
  const g = layer.gradientType === 'radial'
    ? ctx.createRadialGradient(x+w/2, y+h/2, 0, x+w/2, y+h/2, Math.max(w,h)/2)
    : ctx.createLinearGradient(
        x+w/2-Math.cos(angle)*w/2, y+h/2-Math.sin(angle)*h/2,
        x+w/2+Math.cos(angle)*w/2, y+h/2+Math.sin(angle)*h/2
      );
  stops.forEach(s => g.addColorStop(s.offset, s.color));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function renderPatternLayer(ctx, layer, x, y, w, h) {
  const size = layer.patternSize || 20;
  const color1 = layer.color  || '#1c2a38';
  const color2 = layer.color2 || '#263544';
  const type = layer.patternType || 'checker';

  const pc = document.createElement('canvas');
  pc.width = size; pc.height = size;
  const pctx = pc.getContext('2d');

  if (type === 'checker') {
    pctx.fillStyle = color1; pctx.fillRect(0,0,size,size);
    pctx.fillStyle = color2;
    pctx.fillRect(0,0,size/2,size/2);
    pctx.fillRect(size/2,size/2,size/2,size/2);
  } else if (type === 'dots') {
    pctx.fillStyle = color1; pctx.fillRect(0,0,size,size);
    pctx.fillStyle = color2;
    pctx.beginPath(); pctx.arc(size/2,size/2,size/4,0,Math.PI*2); pctx.fill();
  } else if (type === 'lines') {
    pctx.fillStyle = color1; pctx.fillRect(0,0,size,size);
    pctx.strokeStyle = color2; pctx.lineWidth = 1;
    pctx.beginPath(); pctx.moveTo(0,size/2); pctx.lineTo(size,size/2); pctx.stroke();
  } else if (type === 'crosshatch') {
    pctx.fillStyle = color1; pctx.fillRect(0,0,size,size);
    pctx.strokeStyle = color2; pctx.lineWidth = 0.5;
    pctx.beginPath(); pctx.moveTo(0,size/2); pctx.lineTo(size,size/2); pctx.stroke();
    pctx.beginPath(); pctx.moveTo(size/2,0); pctx.lineTo(size/2,size); pctx.stroke();
  }

  const pat = ctx.createPattern(pc, 'repeat');
  if (pat) { ctx.fillStyle = pat; ctx.fillRect(x, y, w, h); }
}

// ─── Selection Handles ────────────────────────────────────────────────────────
function drawSelectionHandles(ctx, x, y, w, h) {
  ctx.save();
  ctx.strokeStyle = '#00ffc8';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x-2, y-2, w+4, h+4);
  ctx.setLineDash([]);
  const handles = [
    [x-4,y-4],[x+w/2-4,y-4],[x+w-4,y-4],
    [x-4,y+h/2-4],[x+w-4,y+h/2-4],
    [x-4,y+h-4],[x+w/2-4,y+h-4],[x+w-4,y+h-4],
  ];
  ctx.fillStyle = '#fff';
  handles.forEach(([hx,hy]) => {
    ctx.fillRect(hx, hy, 8, 8);
    ctx.strokeRect(hx, hy, 8, 8);
  });
  ctx.restore();
}

// ─── Effect Filter ────────────────────────────────────────────────────────────
function buildFilter(effects = []) {
  const parts = [];
  for (const fx of effects) {
    if (fx.enabled === false) continue;
    switch(fx.type) {
      case 'blur':       parts.push(`blur(${fx.value||4}px)`); break;
      case 'brightness': parts.push(`brightness(${fx.value||1})`); break;
      case 'contrast':   parts.push(`contrast(${fx.value||1})`); break;
      case 'saturate':   parts.push(`saturate(${fx.value||1})`); break;
      case 'hue':        parts.push(`hue-rotate(${fx.value||0}deg)`); break;
      case 'grayscale':  parts.push(`grayscale(${fx.value||1})`); break;
      case 'invert':     parts.push(`invert(1)`); break;
      case 'sepia':      parts.push(`sepia(${fx.value||1})`); break;
      case 'sharpen':    parts.push(`contrast(1.4) brightness(1.1)`); break;
    }
  }
  return parts.join(' ');
}

// ─── Main Render All Layers ───────────────────────────────────────────────────
export function renderCanvas(canvas, project, selectedId = null) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = project.background || '#1c2a38';
  ctx.fillRect(0, 0, W, H);

  // Render layers bottom to top
  const sorted = [...(project.layers||[])].reverse();
  for (const layer of sorted) {
    renderLayer(ctx, layer, layer.id === selectedId);
  }
}

// ─── Hit Test ─────────────────────────────────────────────────────────────────
export function hitTestLayers(layers, x, y) {
  // Top layer first
  for (let i = layers.length-1; i >= 0; i--) {
    const l = layers[i];
    if (l.visible === false || l.locked) continue;
    if (x >= l.x && x <= l.x+(l.width||100) && y >= l.y && y <= l.y+(l.height||100)) return l;
  }
  return null;
}

// ─── Export ───────────────────────────────────────────────────────────────────
export function exportCanvasPNG(canvas, name='spx-canvas') {
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`${name}.png`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  },'image/png');
}

export function exportCanvasJPG(canvas, name='spx-canvas', quality=0.95) {
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`${name}.jpg`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  },'image/jpeg',quality);
}

export function exportCanvasWebP(canvas, name='spx-canvas') {
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`${name}.webp`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  },'image/webp',0.95);
}

export default { renderCanvas, renderLayer, hitTestLayers, exportCanvasPNG, exportCanvasJPG, exportCanvasWebP };
