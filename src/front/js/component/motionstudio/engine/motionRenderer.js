import { projectMotionLayers } from "../../../utils/motionstudio/camera25d";
import { safeLayers } from "../../../utils/motionstudio/safety";
import {
  sortLayersForRender,
  toCanvasCoords,
  applyLayerStyles,
  resetLayerStyles,
} from "../../../utils/motionstudio/renderHelpers";

function applyCanvasFilterFromEffects(ctx, effects = {}) {
  const blur = effects.blur ?? 0;
  const brightness = effects.brightness ?? 100;
  const contrast = effects.contrast ?? 100;
  const saturation = effects.saturation ?? 100;
  ctx.filter = `blur(${blur}px) brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
}

function resetCanvasFilter(ctx) {
  ctx.filter = "none";
}

function applyMaskPath(ctx, layer, width, height) {
  const mask = layer.mask;
  if (!mask?.enabled) return;

  const cx = ((mask.x ?? 50) / 100) * width;
  const cy = ((mask.y ?? 50) / 100) * height;
  const mw = ((mask.width ?? 40) / 100) * width;
  const mh = ((mask.height ?? 40) / 100) * height;

  ctx.beginPath();
  if ((mask.shape || "rectangle") === "ellipse") {
    ctx.ellipse(cx, cy, mw / 2, mh / 2, 0, 0, Math.PI * 2);
  } else {
    ctx.rect(cx - mw / 2, cy - mh / 2, mw, mh);
  }
  ctx.clip();
}

function drawSafeBackground(ctx, width, height) {
  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, "#0b1220");
  g.addColorStop(1, "#14213d");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;

  for (let x = 0; x < width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawLowerThirdBar(ctx, x, y, width = 420, height = 96) {
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x - width / 2, y - 10, width, height);

  ctx.fillStyle = "#00ffc8";
  ctx.fillRect(x - width / 2, y - 10, 12, height);
}

function drawTextLayer(ctx, layer, width, height) {
  const { x, y } = toCanvasCoords(
    { x: layer.projectedX ?? layer.x, y: layer.projectedY ?? layer.y },
    width,
    height
  );
  const scale = layer.projectedScale ?? layer.scale ?? 1;
  const rotation = ((layer.rotation ?? 0) * Math.PI) / 180;
  const fontSize = layer.fontSize ?? 42;
  const color = layer.color || "#ffffff";

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);

  applyLayerStyles(ctx, layer);
  applyCanvasFilterFromEffects(ctx, layer.effects || {});
  if (layer.mask?.enabled) {
    applyMaskPath(ctx, layer, width, height);
  }

  if (layer.type === "lowerThird") {
    drawLowerThirdBar(ctx, 0, 0);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.font = `${layer.fontWeight || 700} ${fontSize}px Arial`;

  if (layer.outline) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.strokeText(layer.text || "Text", 0, 0);
  }

  ctx.fillText(layer.text || "Text", 0, 0);

  if (layer.subtitle) {
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = `500 ${Math.max(14, fontSize * 0.45)}px Arial`;
    ctx.fillText(layer.subtitle, 0, fontSize * 0.85);
  }

  resetCanvasFilter(ctx);
  resetLayerStyles(ctx);
  ctx.restore();
}

export function renderMotionFrame(canvas, layers = [], options = {}) {
  layers = safeLayers(layers);

  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  drawSafeBackground(ctx, width, height);

  const projectedLayers = options.camera
    ? projectMotionLayers(layers, options.camera, width, height)
    : layers;

  const sorted = sortLayersForRender(projectedLayers);

  sorted.forEach((layer) => {
    if (layer.type === "text" || layer.type === "lowerThird") {
      drawTextLayer(ctx, layer, width, height);
    }
  });

  if (options.showTitleSafe) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    const marginX = width * 0.1;
    const marginY = height * 0.1;
    ctx.strokeRect(marginX, marginY, width - marginX * 2, height - marginY * 2);
    ctx.restore();
  }
}
