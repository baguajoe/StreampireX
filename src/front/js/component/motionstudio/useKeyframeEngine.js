const EASING = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  bounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) {
      const v = t - 1.5 / 2.75;
      return 7.5625 * v * v + 0.75;
    }
    if (t < 2.5 / 2.75) {
      const v = t - 2.25 / 2.75;
      return 7.5625 * v * v + 0.9375;
    }
    const v = t - 2.625 / 2.75;
    return 7.5625 * v * v + 0.984375;
  }
};

function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function applyCurveStrength(t, strength = 0.5, mode = "easeInOut") {
  const s = clamp(strength, 0, 1);

  if (mode === "easeIn") {
    const power = 1 + s * 3;
    return Math.pow(t, power);
  }

  if (mode === "easeOut") {
    const power = 1 + s * 3;
    return 1 - Math.pow(1 - t, power);
  }

  const inPower = 1 + s * 3;
  const outPower = 1 + s * 3;
  return t < 0.5
    ? 0.5 * Math.pow(t * 2, inPower)
    : 1 - 0.5 * Math.pow((1 - t) * 2, outPower);
}

export function interpolate(track, time) {
  if (!Array.isArray(track) || track.length === 0) return null;

  const sorted = [...track].sort((a, b) => a.time - b.time);

  if (time <= sorted[0].time) return sorted[0].value;
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

  for (let i = 0; i < sorted.length - 1; i++) {
    const prev = sorted[i];
    const next = sorted[i + 1];

    if (time >= prev.time && time <= next.time) {
      const span = next.time - prev.time;
      if (span === 0) return next.value;

      const rawT = (time - prev.time) / span;
      const easingName = next.easing || "linear";
      const curveStrength = next.curveStrength ?? 0.5;

      let t;
      if (easingName === "easeIn" || easingName === "easeOut" || easingName === "easeInOut") {
        t = applyCurveStrength(rawT, curveStrength, easingName);
      } else {
        const easingFn = EASING[easingName] || EASING.linear;
        t = easingFn(clamp(rawT));
      }

      return prev.value + (next.value - prev.value) * t;
    }
  }

  return sorted[sorted.length - 1]?.value ?? null;
}

export { EASING, applyCurveStrength };
