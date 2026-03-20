export function createEmptyRotoShape() {
  return {
    id: `roto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    closed: true,
    feather: 0,
    invert: false,
    points: [],
  };
}

export function addRotoPoint(shape, x, y) {
  return {
    ...shape,
    points: [...(shape.points || []), { x, y }],
  };
}

export function updateRotoPoint(shape, index, patch) {
  const pts = [...(shape.points || [])];
  if (!pts[index]) return shape;
  pts[index] = { ...pts[index], ...patch };
  return { ...shape, points: pts };
}

export function drawRotoShape(ctx, shape) {
  const pts = shape?.points || [];
  if (!pts.length) return;

  ctx.save();
  ctx.strokeStyle = "#ff9f45";
  ctx.lineWidth = 2;
  ctx.fillStyle = "rgba(255,159,69,0.08)";

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  if (shape.closed) ctx.closePath();
  ctx.fill();
  ctx.stroke();

  pts.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#00ffc8";
    ctx.fill();
  });

  ctx.restore();
}

export function applyRotoClip(ctx, shape) {
  const pts = shape?.points || [];
  if (!pts.length) return;

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  if (shape.closed) ctx.closePath();
  ctx.clip();
}
