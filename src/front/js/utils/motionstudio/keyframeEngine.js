import { applyEasing } from "./easing";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getTrackValue(track = [], time = 0, fallback = 0) {
  if (!Array.isArray(track) || track.length === 0) return fallback;

  const sorted = [...track].sort((a, b) => a.time - b.time);

  if (time <= sorted[0].time) return sorted[0].value ?? fallback;
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value ?? fallback;

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (time >= a.time && time <= b.time) {
      const span = Math.max(0.0001, b.time - a.time);
      const rawT = (time - a.time) / span;
      const eased = applyEasing(a.easing || "linear", rawT);
      return lerp(a.value ?? fallback, b.value ?? fallback, eased);
    }
  }

  return fallback;
}

export function evaluateLayerAtTime(layer, time) {
  const keyframes = layer?.keyframes || {};

  return {
    ...layer,
    x: getTrackValue(keyframes.positionX, time, layer.x ?? 0),
    y: getTrackValue(keyframes.positionY, time, layer.y ?? 0),
    scale: getTrackValue(keyframes.scale, time, layer.scale ?? 1),
    rotation: getTrackValue(keyframes.rotation, time, layer.rotation ?? 0),
    opacity: getTrackValue(keyframes.opacity, time, layer.opacity ?? 1),
  };
}

export function evaluateVisibleLayers(layers = [], time = 0) {
  return layers
    .filter((layer) => {
      const start = layer.startTime ?? 0;
      const duration = layer.duration ?? 0;
      return time >= start && time <= start + duration;
    })
    .map((layer) => evaluateLayerAtTime(layer, time));
}
