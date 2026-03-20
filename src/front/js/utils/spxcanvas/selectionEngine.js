// src/front/js/utils/spxcanvas/selectionEngine.js
// SPX Canvas — Marquee selection, magic wand, lasso

export function createRectSelection(x,y,w,h) {
  return { type:'rect', x, y, width:w, height:h };
}

export function createEllipseSelection(x,y,w,h) {
  return { type:'ellipse', x, y, width:w, height:h };
}

export function createLassoSelection(points) {
  return { type:'lasso', points };
}

// Test if point is inside selection
export function pointInSelection(sel, px, py) {
  if (!sel) return false;
  if (sel.type === 'rect') {
    return px>=sel.x && px<=sel.x+sel.width && py>=sel.y && py<=sel.y+sel.height;
  }
  if (sel.type === 'ellipse') {
    const cx=sel.x+sel.width/2, cy=sel.y+sel.height/2;
    const rx=sel.width/2, ry=sel.height/2;
    return ((px-cx)/rx)**2 + ((py-cy)/ry)**2 <= 1;
  }
  if (sel.type === 'lasso') {
    return pointInPolygon(sel.points, px, py);
  }
  return false;
}

function pointInPolygon(points, x, y) {
  let inside = false;
  for (let i=0,j=points.length-1; i<points.length; j=i++) {
    const xi=points[i].x, yi=points[i].y, xj=points[j].x, yj=points[j].y;
    const intersect = ((yi>y)!==(yj>y)) && (x<(xj-xi)*(y-yi)/(yj-yi)+xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Magic wand — flood fill selection
export function magicWandSelect(imageData, W, H, startX, startY, tolerance=32) {
  const d = imageData.data;
  const idx = (startY*W+startX)*4;
  const [tr,tg,tb] = [d[idx],d[idx+1],d[idx+2]];
  const visited = new Uint8Array(W*H);
  const selected = new Set();
  const queue = [[Math.round(startX),Math.round(startY)]];

  while (queue.length) {
    const [x,y] = queue.shift();
    if (x<0||x>=W||y<0||y>=H) continue;
    const i=y*W+x;
    if (visited[i]) continue;
    visited[i]=1;
    const pi=i*4;
    const dist=Math.sqrt((d[pi]-tr)**2+(d[pi+1]-tg)**2+(d[pi+2]-tb)**2);
    if (dist>tolerance) continue;
    selected.add(i);
    queue.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
  }
  return selected;
}

// Draw selection marching ants on ctx
export function drawSelectionMarquee(ctx, sel, time) {
  if (!sel) return;
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.setLineDash([6,4]);
  ctx.lineDashOffset = -(time*2%10);

  if (sel.type === 'rect') {
    ctx.strokeRect(sel.x, sel.y, sel.width, sel.height);
  } else if (sel.type === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(sel.x+sel.width/2, sel.y+sel.height/2, sel.width/2, sel.height/2, 0, 0, Math.PI*2);
    ctx.stroke();
  } else if (sel.type === 'lasso' && sel.points?.length) {
    ctx.beginPath();
    ctx.moveTo(sel.points[0].x, sel.points[0].y);
    sel.points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

export default { createRectSelection, createEllipseSelection, createLassoSelection,
  pointInSelection, magicWandSelect, drawSelectionMarquee };
