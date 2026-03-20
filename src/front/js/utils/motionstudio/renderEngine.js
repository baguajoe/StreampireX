import { getCanvasFilter } from "../effects/effectStack";
import { drawText } from "../text/textRenderer";

export function renderLayers(ctx, layers = [], time = 0) {
  if (!ctx) return;

  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  ctx.clearRect(0, 0, width, height);

  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, "#0b1220");
  g.addColorStop(1, "#14213d");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  [...layers]
    .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
    .forEach((layer) => {
      ctx.save();

      const wobble = layer.animate ? Math.sin(time * (layer.speed ?? 1)) * (layer.amplitude ?? 10) : 0;
      ctx.globalAlpha = layer.opacity ?? 1;
      ctx.filter = getCanvasFilter(layer.effects || []);

      if (layer.type === "shape") {
        ctx.fillStyle = layer.color || "#00ffc8";
        ctx.fillRect((layer.x ?? 100) + wobble, layer.y ?? 100, layer.width ?? 100, layer.height ?? 100);
      } else {
        drawText(ctx, {
          ...layer,
          x: (layer.x ?? 100) + wobble,
        });
      }

      ctx.restore();
    });
}
