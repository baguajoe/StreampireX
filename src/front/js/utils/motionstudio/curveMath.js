export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function cubicBezierPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
}

export function evaluateBezierSegment(kfA, kfB, t) {
  const p0 = kfA.value ?? 0;
  const p3 = kfB.value ?? 0;
  const curveA = kfA.curveStrength ?? 0.33;
  const curveB = kfB.curveStrength ?? 0.33;

  const p1 = lerp(p0, p3, curveA);
  const p2 = lerp(p3, p0, curveB);

  return cubicBezierPoint(p0, p1, p2, p3, t);
}
