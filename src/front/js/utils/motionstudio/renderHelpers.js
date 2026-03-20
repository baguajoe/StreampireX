export function sortLayersForRender(layers = []) {
  return [...layers].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
}

export function toCanvasCoords(layer, width, height) {
  return {
    x: ((layer.x ?? 50) / 100) * width,
    y: ((layer.y ?? 50) / 100) * height,
  };
}

export function applyLayerStyles(ctx, layer) {
  ctx.globalAlpha = layer.opacity ?? 1;

  if (layer.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;
  } else {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
}

export function resetLayerStyles(ctx) {
  ctx.globalAlpha = 1;
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}
