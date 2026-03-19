export const NODE_EASING = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
};

export function createNodeKeyframe(time, property, value, easing = "easeInOut") {
  return {
    id: `nkf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    time,
    property,
    value,
    easing
  };
}

export function interpolateNodeKeyframes(keyframes = [], time) {
  const result = {};
  const grouped = {};

  keyframes.forEach((kf) => {
    if (!grouped[kf.property]) grouped[kf.property] = [];
    grouped[kf.property].push(kf);
  });

  Object.entries(grouped).forEach(([prop, frames]) => {
    const sorted = [...frames].sort((a, b) => a.time - b.time);
    if (!sorted.length) return;

    if (time <= sorted[0].time) {
      result[prop] = sorted[0].value;
      return;
    }

    if (time >= sorted[sorted.length - 1].time) {
      result[prop] = sorted[sorted.length - 1].value;
      return;
    }

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (time >= a.time && time <= b.time) {
        const span = b.time - a.time || 1;
        const rawT = (time - a.time) / span;
        const ease = NODE_EASING[b.easing] || NODE_EASING.linear;

        if (typeof a.value === "number" && typeof b.value === "number") {
          result[prop] = a.value + (b.value - a.value) * ease(rawT);
        } else {
          result[prop] = rawT < 0.5 ? a.value : b.value;
        }
        break;
      }
    }
  });

  return result;
}

export function applyAnimatedProps(properties = {}, keyframes = [], currentTime = 0) {
  const animated = interpolateNodeKeyframes(keyframes, currentTime);
  return {
    ...properties,
    ...animated
  };
}
