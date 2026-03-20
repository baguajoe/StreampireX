export function drawText(ctx, layer) {
  ctx.font = `${layer.fontWeight ?? 700} ${layer.fontSize ?? 42}px Arial`;
  ctx.fillStyle = layer.color || "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(layer.text || "Text", layer.x ?? 100, layer.y ?? 100);

  if (layer.subtitle) {
    ctx.font = `500 ${Math.max(14, (layer.fontSize ?? 42) * 0.45)}px Arial`;
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText(layer.subtitle, layer.x ?? 100, (layer.y ?? 100) + (layer.fontSize ?? 42) * 0.85);
  }
}
