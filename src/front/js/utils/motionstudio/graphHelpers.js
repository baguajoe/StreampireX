import { clamp, evaluateBezierSegment } from "./curveMath";
import { applyEasing } from "./easing";

export function normalizeTrack(track = []) {
  return [...track]
    .map((kf, i) => ({
      id: kf.id || `kf_${i}_${Math.floor(Math.random() * 10000)}`,
      time: kf.time ?? 0,
      value: kf.value ?? 0,
      easing: kf.easing || "linear",
      curveStrength: kf.curveStrength ?? 0.33,
    }))
    .sort((a, b) => a.time - b.time);
}

export function sampleTrack(track = [], sampleCount = 48) {
  const normalized = normalizeTrack(track);
  if (normalized.length === 0) return [];
  if (normalized.length === 1) {
    return [{ time: normalized[0].time, value: normalized[0].value }];
  }

  const start = normalized[0].time;
  const end = normalized[normalized.length - 1].time;
  const span = Math.max(0.0001, end - start);

  const out = [];
  for (let i = 0; i <= sampleCount; i++) {
    const time = start + (span * i) / sampleCount;
    out.push({ time, value: evaluateTrackAtTime(normalized, time) });
  }
  return out;
}

export function evaluateTrackAtTime(track = [], time = 0) {
  const normalized = normalizeTrack(track);
  if (!normalized.length) return 0;
  if (time <= normalized[0].time) return normalized[0].value;
  if (time >= normalized[normalized.length - 1].time) return normalized[normalized.length - 1].value;

  for (let i = 0; i < normalized.length - 1; i++) {
    const a = normalized[i];
    const b = normalized[i + 1];
    if (time >= a.time && time <= b.time) {
      const span = Math.max(0.0001, b.time - a.time);
      const rawT = (time - a.time) / span;
      const easedT = applyEasing(a.easing || "linear", rawT);
      return evaluateBezierSegment(a, b, easedT);
    }
  }

  return normalized[normalized.length - 1].value;
}

export function moveKeyframe(track = [], keyframeId, patch = {}) {
  return normalizeTrack(track).map((kf) =>
    kf.id === keyframeId
      ? {
          ...kf,
          ...patch,
          time: patch.time !== undefined ? Math.max(0, patch.time) : kf.time,
          curveStrength:
            patch.curveStrength !== undefined
              ? clamp(patch.curveStrength, 0, 1)
              : kf.curveStrength,
        }
      : kf
  ).sort((a, b) => a.time - b.time);
}
