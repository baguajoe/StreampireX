// =============================================================================
// PerformanceEngine.js — Performance modes for SamplerBeatMaker
// Note Repeat, Roll/Stutter, Tape Stop, Filter Sweep, Scale Lock, Chord Trigger
// =============================================================================

export const SCALES = {
  major: [0,2,4,5,7,9,11], minor: [0,2,3,5,7,8,10],
  dorian: [0,2,3,5,7,9,10], mixolydian: [0,2,4,5,7,9,10],
  pentatonic: [0,2,4,7,9], minPenta: [0,3,5,7,10],
  blues: [0,3,5,6,7,10], chromatic: [0,1,2,3,4,5,6,7,8,9,10,11],
  harmonicMin: [0,2,3,5,7,8,11],
};

export const CHORD_TYPES = {
  triad: [0,4,7], minor: [0,3,7], maj7: [0,4,7,11],
  min7: [0,3,7,10], dom7: [0,4,7,10], sus2: [0,2,7],
  sus4: [0,5,7], dim: [0,3,6], aug: [0,4,8], power: [0,7],
};

export const NOTE_REPEAT_RATES = [
  { label: '1/4', div: 1 }, { label: '1/8', div: 2 },
  { label: '1/8T', div: 3 }, { label: '1/16', div: 4 },
  { label: '1/16T', div: 6 }, { label: '1/32', div: 8 },
  { label: '1/64', div: 16 },
];

export function snapToScale(midi, root, scale) {
  const s = SCALES[scale] || SCALES.chromatic;
  const r = root % 12, nc = midi % 12, oct = Math.floor(midi / 12);
  let best = nc, bestD = 99;
  for (const d of s) {
    const p = (r + d) % 12;
    const dist = Math.min(Math.abs(nc - p), 12 - Math.abs(nc - p));
    if (dist < bestD) { bestD = dist; best = p; }
  }
  return oct * 12 + best;
}

export function getChordNotes(root, type, inv = 0) {
  const ivs = CHORD_TYPES[type] || CHORD_TYPES.triad;
  let n = ivs.map(i => root + i);
  for (let i = 0; i < inv && i < n.length - 1; i++) n[i] += 12;
  return n.sort((a, b) => a - b);
}

export function noteRepeatInterval(bpm, div) {
  return (60 / bpm) / div;
}

export function rollEnvelope(count, start = 1, end = 0.2, curve = 'linear') {
  const h = [];
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    h.push(Math.max(0, Math.min(1,
      curve === 'exponential'
        ? start * Math.pow(end / Math.max(0.01, start), t)
        : start + (end - start) * t
    )));
  }
  return h;
}

export function applyTapeStop(ctx, src, gain, dur = 0.8) {
  const now = ctx.currentTime;
  src.playbackRate.setValueAtTime(src.playbackRate.value, now);
  src.playbackRate.linearRampToValueAtTime(0.001, now + dur);
  if (gain) {
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + dur + 0.05);
  }
  try { src.stop(now + dur + 0.1); } catch (e) {}
}

export function applyTapeStart(ctx, src, dur = 0.3) {
  const now = ctx.currentTime;
  src.playbackRate.setValueAtTime(0.01, now);
  src.playbackRate.exponentialRampToValueAtTime(1.0, now + dur);
}

export function filterSweepParams(k) {
  let type, freq, q;
  if (k < 0.45) {
    type = 'lowpass';
    const t = k / 0.45;
    freq = 80 + t * 6000;
    q = 0.5 + Math.sin(t * Math.PI) * 8;
  } else if (k < 0.55) {
    type = 'bandpass';
    freq = 1000 + ((k - 0.45) / 0.1) * 3000;
    q = 2 + Math.sin(((k - 0.45) / 0.1) * Math.PI) * 6;
  } else {
    type = 'highpass';
    const t = (k - 0.55) / 0.45;
    freq = 200 + t * 17800;
    q = 0.5 + Math.sin((1 - t) * Math.PI) * 8;
  }
  return { type, freq: Math.round(freq), q: Math.round(q * 10) / 10 };
}