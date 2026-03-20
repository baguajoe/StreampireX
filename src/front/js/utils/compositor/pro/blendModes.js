export const BLEND_MODES = [
  "normal",
  "screen",
  "multiply",
  "overlay",
  "lighten",
  "darken",
];

export function applyBlendMode(ctx, mode = "normal") {
  const supported = new Set(BLEND_MODES);
  ctx.globalCompositeOperation = supported.has(mode) ? mode : "source-over";
}

export function resetBlendMode(ctx) {
  ctx.globalCompositeOperation = "source-over";
}
