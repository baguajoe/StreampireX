export const Easing = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - Math.pow(1 - t, 2),
  easeInOut: (t) =>
    t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2,
  hold: () => 0,
};

export function interpolateValue(startValue, endValue, t, interpolation = 'linear') {
  if (interpolation === 'hold') return startValue;
  const easeFn = Easing[interpolation] || Easing.linear;
  const k = easeFn(Math.max(0, Math.min(1, t)));
  return startValue + (endValue - startValue) * k;
}
