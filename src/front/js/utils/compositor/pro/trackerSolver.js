export function createTrackerJob() {
  return {
    id: `track_${Date.now()}`,
    status: "idle",
    points: [],
    sampledFrames: [],
  };
}

export function solveTrackFromSamples(samples = []) {
  if (!samples.length) return [];
  return samples.map((s, idx) => ({
    time: s.time ?? idx / 30,
    x: s.x ?? 0,
    y: s.y ?? 0,
  }));
}

export function sampleTrackerMotion(seed = { x: 320, y: 180 }, duration = 5, fps = 12) {
  const frames = Math.max(1, Math.floor(duration * fps));
  const arr = [];
  for (let i = 0; i < frames; i++) {
    const t = i / fps;
    arr.push({
      time: t,
      x: seed.x + Math.sin(t * 2.1) * 24,
      y: seed.y + Math.cos(t * 1.6) * 18,
    });
  }
  return arr;
}
