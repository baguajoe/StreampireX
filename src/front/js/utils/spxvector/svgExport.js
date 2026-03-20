// src/front/js/utils/spxvector/svgExport.js
// SPX Vector — Full SVG export with gradients, effects, text

import { anchorsToBezierPath } from './bezierMath';

export function exportFullSVG(project, name='spx-vector') {
  const svg = buildSVGString(project);
  const blob = new Blob([svg], { type:'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`${name}.svg`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}

export function exportSVGString(project) {
  return buildSVGString(project);
}

export function buildSVGString(project) {
  const W = project.width || 800, H = project.height || 600;
  const defs = buildDefs(project);
  const layers = [...(project.layers||[])].reverse();
  const body = layers.map(l => layerToSVGElement(l, project)).filter(Boolean).join('\n  ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
${defs}
  </defs>
  <rect width="${W}" height="${H}" fill="${project.background||'#ffffff'}" />
  ${body}
</svg>`;
}

function buildDefs(project) {
  const defs = [];
  (project.layers||[]).forEach(l => {
    if (l.fill && typeof l.fill === 'object') {
      const id = `grad_${l.id}`;
      if (l.fill.type === 'linear') {
        defs.push(`    <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="0%">
${(l.fill.stops||[]).map(s=>`      <stop offset="${s.offset*100}%" stop-color="${s.color}" />`).join('\n')}
    </linearGradient>`);
      } else if (l.fill.type === 'radial') {
        defs.push(`    <radialGradient id="${id}">
${(l.fill.stops||[]).map(s=>`      <stop offset="${s.offset*100}%" stop-color="${s.color}" />`).join('\n')}
    </radialGradient>`);
      }
    }
    if ((l.effects||[]).some(fx=>fx.type==='blur')) {
      const blur = l.effects.find(fx=>fx.type==='blur');
      defs.push(`    <filter id="blur_${l.id}"><feGaussianBlur stdDeviation="${blur.value||4}" /></filter>`);
    }
    if ((l.effects||[]).some(fx=>fx.type==='shadow')) {
      const sh = l.effects.find(fx=>fx.type==='shadow');
      defs.push(`    <filter id="shadow_${l.id}">
      <feDropShadow dx="${sh.x||0}" dy="${sh.y||4}" stdDeviation="${sh.blur||8}" flood-color="${sh.color||'#000'}" />
    </filter>`);
    }
  });
  return defs.join('\n');
}

function getFill(layer) {
  if (!layer.fill || layer.fill === 'none') return layer.color || '#000000';
  if (typeof layer.fill === 'string') return layer.fill;
  if (layer.fill.type) return `url(#grad_${layer.id})`;
  return layer.color || '#000000';
}

function getTransform(layer) {
  const parts = [];
  if (layer.rotation) parts.push(`rotate(${layer.rotation} ${(layer.x||0)+(layer.width||0)/2} ${(layer.y||0)+(layer.height||0)/2})`);
  if (layer.scaleX && layer.scaleX !== 1) parts.push(`scale(${layer.scaleX})`);
  return parts.length ? `transform="${parts.join(' ')}"` : '';
}

function getFilters(layer) {
  const filters = [];
  if ((layer.effects||[]).some(fx=>fx.type==='blur')) filters.push(`filter="url(#blur_${layer.id})"`);
  if ((layer.effects||[]).some(fx=>fx.type==='shadow')) filters.push(`filter="url(#shadow_${layer.id})"`);
  return filters.join(' ');
}

function layerToSVGElement(layer, project) {
  const fill = getFill(layer);
  const stroke = layer.stroke || 'none';
  const sw = layer.strokeWidth || 0;
  const opacity = layer.opacity !== undefined ? `opacity="${layer.opacity}"` : '';
  const transform = getTransform(layer);
  const filters = getFilters(layer);
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${opacity} ${transform} ${filters}`;

  if (layer.type === 'rect') {
    const r = layer.borderRadius || 0;
    return `  <rect x="${layer.x||0}" y="${layer.y||0}" width="${layer.width||100}" height="${layer.height||100}" rx="${r}" ry="${r}" ${common} />`;
  }
  if (layer.type === 'ellipse') {
    const cx=(layer.x||0)+(layer.width||100)/2, cy=(layer.y||0)+(layer.height||100)/2;
    return `  <ellipse cx="${cx}" cy="${cy}" rx="${(layer.width||100)/2}" ry="${(layer.height||100)/2}" ${common} />`;
  }
  if (layer.type === 'path' && layer.anchors?.length) {
    const d = anchorsToBezierPath(layer.anchors, layer.closed);
    return `  <path d="${d}" ${common} />`;
  }
  if (layer.type === 'text') {
    const x = layer.x||0, y=(layer.y||0)+(layer.fontSize||24);
    const size = layer.fontSize || 24;
    const weight = layer.fontWeight || 400;
    const family = layer.fontFamily || 'Arial';
    const anchor = layer.textAlign==='center'?'middle':layer.textAlign==='right'?'end':'start';
    const lines = String(layer.text||'').split('\n');
    const spans = lines.map((line,i)=>`    <tspan x="${x}" dy="${i===0?0:size*1.4}">${escapeXml(line)}</tspan>`).join('\n');
    return `  <text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" font-family="${family}" text-anchor="${anchor}" fill="${fill}" ${opacity} ${transform}>
${spans}
  </text>`;
  }
  return null;
}

function escapeXml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function exportPDF(project, name='spx-vector') {
  // Requires jsPDF — fallback to SVG
  console.warn('[SPXVector] PDF export requires jsPDF. Falling back to SVG.');
  exportFullSVG(project, name);
}

export default { exportFullSVG, exportSVGString, buildSVGString };
