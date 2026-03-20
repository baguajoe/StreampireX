// src/front/js/utils/motionstudio/renderEngine.js
// SPX Motion — Real Layer Renderer with transforms, keyframes, masks, effects

import { interpolateKeyframes } from "./keyframeEngine";
import { applyEasing } from "./easing";
import { projectLayer25D } from "./camera25d";

// ─── Effect Stack → CSS Filter ────────────────────────────────────────────────
export function getCanvasFilter(effects = []) {
  const parts = [];
  for (const fx of effects) {
    if (!fx.enabled && fx.enabled !== undefined) continue;
    switch (fx.type) {
      case 'blur':       parts.push(`blur(${fx.radius ?? 4}px)`); break;
      case 'brightness': parts.push(`brightness(${fx.value ?? 1})`); break;
      case 'contrast':   parts.push(`contrast(${fx.value ?? 1})`); break;
      case 'saturate':   parts.push(`saturate(${fx.value ?? 1})`); break;
      case 'hue':        parts.push(`hue-rotate(${fx.value ?? 0}deg)`); break;
      case 'grayscale':  parts.push(`grayscale(${fx.value ?? 1})`); break;
      case 'invert':     parts.push(`invert(${fx.value ?? 1})`); break;
      case 'sepia':      parts.push(`sepia(${fx.value ?? 1})`); break;
      case 'drop-shadow':parts.push(`drop-shadow(${fx.x??0}px ${fx.y??4}px ${fx.blur??8}px ${fx.color??'#000'})`); break;
    }
  }
  return parts.length ? parts.join(' ') : 'none';
}

// ─── Glow Overlay ─────────────────────────────────────────────────────────────
function drawGlow(ctx, x, y, w, h, color, strength = 0.5) {
  ctx.save();
  ctx.filter = `blur(${strength * 20}px)`;
  ctx.globalAlpha = strength * 0.6;
  ctx.fillStyle = color;
  ctx.fillRect(x - w * 0.1, y - h * 0.1, w * 1.2, h * 1.2);
  ctx.restore();
}

// ─── Shape Renderer ───────────────────────────────────────────────────────────
function renderShape(ctx, layer, x, y, time) {
  const w = layer.width  ?? 120;
  const h = layer.height ?? 80;
  const shape = layer.shape || 'rect';
  const color = layer.color || '#00ffc8';
  const stroke = layer.strokeColor || null;
  const strokeW = layer.strokeWidth || 2;
  const radius = layer.borderRadius || 0;

  if (layer.glow) drawGlow(ctx, x, y, w, h, color, layer.glowStrength ?? 0.5);

  ctx.fillStyle = color;
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeW; }

  if (shape === 'circle') {
    ctx.beginPath();
    ctx.arc(x + w/2, y + h/2, Math.min(w,h)/2, 0, Math.PI*2);
    ctx.fill();
    if (stroke) ctx.stroke();
  } else if (shape === 'triangle') {
    ctx.beginPath();
    ctx.moveTo(x + w/2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    if (stroke) ctx.stroke();
  } else if (shape === 'star') {
    const cx = x + w/2, cy = y + h/2;
    const outerR = Math.min(w,h)/2, innerR = outerR * 0.4;
    const points = layer.starPoints || 5;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI / points) - Math.PI/2;
      const r = i % 2 === 0 ? outerR : innerR;
      i === 0 ? ctx.moveTo(cx + r*Math.cos(angle), cy + r*Math.sin(angle))
              : ctx.lineTo(cx + r*Math.cos(angle), cy + r*Math.sin(angle));
    }
    ctx.closePath();
    ctx.fill();
    if (stroke) ctx.stroke();
  } else if (shape === 'line') {
    ctx.beginPath();
    ctx.moveTo(x, y + h/2);
    ctx.lineTo(x + w, y + h/2);
    ctx.strokeStyle = color;
    ctx.lineWidth = layer.lineWidth || 4;
    ctx.stroke();
  } else if (radius > 0) {
    // Rounded rect
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, radius)
                  : ctx.rect(x, y, w, h);
    ctx.fill();
    if (stroke) ctx.stroke();
  } else {
    ctx.fillRect(x, y, w, h);
    if (stroke) { ctx.strokeRect(x, y, w, h); }
  }
}

// ─── Text Renderer ────────────────────────────────────────────────────────────
function renderText(ctx, layer, x, y) {
  const text     = layer.text     || 'SPX Motion';
  const fontSize = layer.fontSize ?? 42;
  const weight   = layer.fontWeight ?? 700;
  const font     = layer.fontFamily || 'Arial';
  const color    = layer.color    || '#ffffff';
  const align    = layer.textAlign || 'left';
  const shadow   = layer.textShadow;

  ctx.font = `${weight} ${fontSize}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';

  if (shadow) {
    ctx.shadowColor   = shadow.color   || 'rgba(0,0,0,0.5)';
    ctx.shadowBlur    = shadow.blur    || 8;
    ctx.shadowOffsetX = shadow.x       || 2;
    ctx.shadowOffsetY = shadow.y       || 2;
  }

  if (layer.glow) {
    ctx.save();
    ctx.shadowColor = layer.color || '#00ffc8';
    ctx.shadowBlur  = (layer.glowStrength ?? 0.5) * 30;
    ctx.fillStyle   = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur  = 0;

  // Subtitle
  if (layer.subtitle) {
    ctx.font = `400 ${Math.round(fontSize * 0.5)}px ${font}`;
    ctx.fillStyle = layer.subtitleColor || 'rgba(255,255,255,0.6)';
    ctx.fillText(layer.subtitle, x, y + fontSize + 6);
  }
}

// ─── Image/Video Layer ────────────────────────────────────────────────────────
function renderMedia(ctx, layer, x, y) {
  const el = layer._element;
  if (!el) {
    // Placeholder
    ctx.fillStyle = '#16263d';
    ctx.fillRect(x, y, layer.width ?? 200, layer.height ?? 120);
    ctx.fillStyle = '#00ffc8';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(layer.src ? '⏳ Loading...' : '📷 Media', x + (layer.width??200)/2, y + (layer.height??120)/2);
    return;
  }
  try {
    ctx.drawImage(el, x, y, layer.width ?? 200, layer.height ?? 120);
  } catch(e) {}
}

// ─── Roto/Mask Clip ───────────────────────────────────────────────────────────
function applyMaskClip(ctx, mask) {
  if (!mask?.enabled || !mask.points?.length) return false;
  ctx.beginPath();
  const pts = mask.points;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    ctx.bezierCurveTo(p.inX??p.x, p.inY??p.y, p.outX??p.x, p.outY??p.y, p.x, p.y);
  }
  ctx.closePath();
  ctx.clip();
  return true;
}

// ─── Particle System ─────────────────────────────────────────────────────────
const _particles = new Map();

function renderParticles(ctx, layer, x, y, time) {
  const key = layer.id;
  if (!_particles.has(key)) _particles.set(key, []);
  let pts = _particles.get(key);

  // Emit
  const rate = layer.emitRate ?? 2;
  for (let i = 0; i < rate; i++) {
    pts.push({
      x: x + (layer.width??100)*Math.random(),
      y: y + (layer.height??100)*Math.random(),
      vx: (Math.random()-0.5) * (layer.speed??2),
      vy: -(Math.random()) * (layer.speed??2) - 0.5,
      life: 1.0,
      decay: 0.008 + Math.random()*0.012,
      size: (layer.particleSize ?? 4) * (0.5 + Math.random()),
      color: layer.color || '#00ffc8',
    });
  }

  // Update + draw
  pts = pts.filter(p => p.life > 0);
  for (const p of pts) {
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += layer.gravity ?? 0.05;
    p.life -= p.decay;
    ctx.globalAlpha = p.life * (layer.opacity ?? 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI*2);
    ctx.fill();
  }
  _particles.set(key, pts);
  ctx.globalAlpha = 1;
}

// ─── Gradient Background ──────────────────────────────────────────────────────
function renderGradient(ctx, layer, W, H) {
  const type = layer.gradientType || 'linear';
  const c1   = layer.color  || '#0b1220';
  const c2   = layer.color2 || '#14213d';
  let g;
  if (type === 'radial') {
    g = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)/2);
  } else {
    const angle = (layer.gradientAngle ?? 135) * Math.PI / 180;
    const x1 = W/2 - Math.cos(angle)*W/2, y1 = H/2 - Math.sin(angle)*H/2;
    const x2 = W/2 + Math.cos(angle)*W/2, y2 = H/2 + Math.sin(angle)*H/2;
    g = ctx.createLinearGradient(x1, y1, x2, y2);
  }
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ─── Main renderLayers ────────────────────────────────────────────────────────
export function renderLayers(ctx, layers = [], time = 0, camera = null) {
  if (!ctx) return;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Background
  const bgLayer = layers.find(l => l.type === 'background' || l.type === 'gradient');
  if (bgLayer) {
    renderGradient(ctx, bgLayer, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0b1220'); g.addColorStop(1, '#14213d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  const sorted = [...layers]
    .filter(l => l.type !== 'background' && l.type !== 'gradient')
    .filter(l => l.visible !== false)
    .sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  for (const layer of sorted) {
    ctx.save();

    // Interpolate keyframes
    const kfValues = layer.keyframes && Object.keys(layer.keyframes).length
      ? interpolateKeyframes(layer.keyframes, time)
      : {};

    const x       = (kfValues.x        ?? layer.x        ?? 100);
    const y       = (kfValues.y        ?? layer.y        ?? 100);
    const scaleX  = (kfValues.scaleX   ?? layer.scaleX   ?? layer.scale ?? 1);
    const scaleY  = (kfValues.scaleY   ?? layer.scaleY   ?? layer.scale ?? 1);
    const rot     = (kfValues.rotation ?? layer.rotation ?? 0) * Math.PI / 180;
    const opacity = (kfValues.opacity  ?? layer.opacity  ?? 1);

    // Wobble animation
    const wobble = layer.animate
      ? Math.sin(time * (layer.speed ?? 1) * Math.PI * 2) * (layer.amplitude ?? 10)
      : 0;

    const px = x + wobble;
    const py = y;
    const cx = px + (layer.width ?? 100) / 2;
    const cy = py + (layer.height ?? 60) / 2;

    // Apply 2.5D camera projection
    let projX = px, projY = py, projScale = 1;
    if (camera && layer.z !== undefined) {
      const proj = projectLayer25D(layer, camera);
      projScale = proj.projectedScale;
      projX = proj.projectedX;
      projY = proj.projectedY;
    }

    // Transform
    ctx.translate(cx + projX - px, cy + projY - py);
    ctx.rotate(rot);
    ctx.scale(scaleX * projScale, scaleY * projScale);
    ctx.translate(-cx, -cy);

    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
    ctx.filter = getCanvasFilter(layer.effects || []);

    // Mask clip
    if (layer.mask?.enabled) applyMaskClip(ctx, layer.mask);

    // Blend mode
    if (layer.blendMode) ctx.globalCompositeOperation = layer.blendMode;

    // Render by type
    switch (layer.type) {
      case 'text':       renderText(ctx, layer, px, py); break;
      case 'shape':      renderShape(ctx, layer, px, py, time); break;
      case 'image':
      case 'video':      renderMedia(ctx, layer, px, py); break;
      case 'particles':  renderParticles(ctx, layer, px, py, time); break;
      default:           renderText(ctx, layer, px, py);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.restore();
  }
}

export default { renderLayers, getCanvasFilter };
