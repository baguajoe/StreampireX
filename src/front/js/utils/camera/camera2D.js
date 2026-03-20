export function applyCamera(ctx, camera = {}) {
  const x = camera.x ?? 0;
  const y = camera.y ?? 0;
  const z = camera.z ?? 0;
  const zoom = camera.zoom ?? 1;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(-x, -y);
  ctx.scale(zoom + z * 0.001, zoom + z * 0.001);
}
