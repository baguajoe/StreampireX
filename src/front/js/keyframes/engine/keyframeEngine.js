import { INTERPOLATION_TYPES } from './keyframeTypes';
import { interpolateValue } from '../interpolation/easing';

export function sortKeyframes(keyframes = []) {
  return [...keyframes].sort((a, b) => a.time - b.time);
}

export function createKeyframe({
  time = 0,
  value = 0,
  interpolation = INTERPOLATION_TYPES.LINEAR,
} = {}) {
  return {
    id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    time,
    value,
    interpolation,
  };
}

export function addKeyframe(trackKeyframes = [], keyframe) {
  const merged = [...trackKeyframes.filter((kf) => kf.time !== keyframe.time), keyframe];
  return sortKeyframes(merged);
}

export function updateKeyframe(trackKeyframes = [], keyframeId, patch = {}) {
  return sortKeyframes(
    trackKeyframes.map((kf) => (kf.id === keyframeId ? { ...kf, ...patch } : kf))
  );
}

export function removeKeyframe(trackKeyframes = [], keyframeId) {
  return trackKeyframes.filter((kf) => kf.id !== keyframeId);
}

export function getKeyframeValueAtTime(trackKeyframes = [], time = 0, fallbackValue = 0) {
  const keyframes = sortKeyframes(trackKeyframes);

  if (!keyframes.length) return fallbackValue;
  if (time <= keyframes[0].time) return keyframes[0].value;
  if (time >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1].value;

  for (let i = 0; i < keyframes.length - 1; i++) {
    const current = keyframes[i];
    const next = keyframes[i + 1];

    if (time >= current.time && time <= next.time) {
      const span = next.time - current.time;
      if (span <= 0) return current.value;

      const t = (time - current.time) / span;
      return interpolateValue(
        current.value,
        next.value,
        t,
        current.interpolation || INTERPOLATION_TYPES.LINEAR
      );
    }
  }

  return fallbackValue;
}

export function ensurePropertyKeyframes(clip = {}, property) {
  return clip?.keyframes?.[property] || [];
}

export function getClipAnimatedValue(clip = {}, property, time = 0, fallbackValue = 0) {
  const keyframes = ensurePropertyKeyframes(clip, property);
  return getKeyframeValueAtTime(keyframes, time, fallbackValue);
}

export function upsertClipKeyframe(clip = {}, property, keyframe) {
  const existing = clip?.keyframes || {};
  return {
    ...clip,
    keyframes: {
      ...existing,
      [property]: addKeyframe(existing[property] || [], keyframe),
    },
  };
}

export function patchClipKeyframe(clip = {}, property, keyframeId, patch) {
  const existing = clip?.keyframes || {};
  return {
    ...clip,
    keyframes: {
      ...existing,
      [property]: updateKeyframe(existing[property] || [], keyframeId, patch),
    },
  };
}

export function deleteClipKeyframe(clip = {}, property, keyframeId) {
  const existing = clip?.keyframes || {};
  return {
    ...clip,
    keyframes: {
      ...existing,
      [property]: removeKeyframe(existing[property] || [], keyframeId),
    },
  };
}
