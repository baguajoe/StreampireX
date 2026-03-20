export function interpolateRotoKeyframes(keyframes = [], totalFrames = 120) {
  if (!keyframes.length) return [];
  const sorted = [...keyframes].sort((a, b) => a.frame - b.frame);
  const timeline = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const span = Math.max(1, b.frame - a.frame);

    for (let f = a.frame; f < b.frame; f++) {
      const t = (f - a.frame) / span;
      const points = (a.points || []).map((pt, idx) => {
        const next = (b.points || [])[idx] || pt;
        return {
          x: pt.x + (next.x - pt.x) * t,
          y: pt.y + (next.y - pt.y) * t,
        };
      });
      timeline.push({ frame: f, points });
    }
  }

  timeline.push(sorted[sorted.length - 1]);
  return timeline.filter((item) => item.frame < totalFrames);
}
