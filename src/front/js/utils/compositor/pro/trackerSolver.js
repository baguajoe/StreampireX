// src/front/js/utils/compositor/pro/trackerSolver.js
// SPX Tracker — NCC-based point tracker + solver

export function createTrackerJob(opts = {}) {
  return {
    id: `trk_${Date.now()}`,
    status: 'idle',
    seedX: opts.seedX || 320,
    seedY: opts.seedY || 180,
    templateSize: opts.templateSize || 21,
    searchRadius: opts.searchRadius || 40,
    smoothing: opts.smoothing || 0.5,
    sampledFrames: [],
    solvedPath: [],
  };
}

// Simulate tracker motion with realistic drift + shake
export function sampleTrackerMotion(seed, fps = 24, duration = 5) {
  const frames = fps * duration;
  const samples = [];
  let x = seed.x, y = seed.y;
  let vx = 0.3, vy = 0.15;
  for (let f = 0; f < frames; f++) {
    vx += (Math.random() - 0.5) * 0.2;
    vy += (Math.random() - 0.5) * 0.2;
    x += vx + (Math.random() - 0.5) * 1.5;
    y += vy + (Math.random() - 0.5) * 1.5;
    samples.push({ frame: f, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, confidence: 0.85 + Math.random() * 0.15 });
  }
  return samples;
}

// Gaussian smoothing pass on tracked path
export function solveTrackFromSamples(samples, smoothing = 0.5) {
  if (!samples.length) return [];
  const win = Math.max(1, Math.round(smoothing * 10));
  return samples.map((s, i) => {
    let sx = 0, sy = 0, count = 0;
    for (let j = Math.max(0, i - win); j <= Math.min(samples.length - 1, i + win); j++) {
      sx += samples[j].x; sy += samples[j].y; count++;
    }
    return { ...s, x: sx / count, y: sy / count };
  });
}

// Attach solved track to a transform node
export function applyTrackToNode(node, solvedPath, currentFrame) {
  const entry = solvedPath.find(s => s.frame === currentFrame) || solvedPath[0];
  if (!entry) return node;
  return {
    ...node,
    properties: {
      ...(node.properties || {}),
      x: entry.x,
      y: entry.y,
    },
  };
}

// NCC stub — real pixel matching needs canvas ImageData
export function nccMatch(templateData, searchData, W, H, tx, ty, radius) {
  // Simplified: return center of search window + small random offset
  return {
    x: tx + (Math.random() - 0.5) * radius * 0.3,
    y: ty + (Math.random() - 0.5) * radius * 0.3,
    confidence: 0.8 + Math.random() * 0.2,
  };
}

export default { createTrackerJob, sampleTrackerMotion, solveTrackFromSamples, applyTrackToNode, nccMatch };
