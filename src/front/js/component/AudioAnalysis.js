// =============================================================================
// AudioAnalysis.js — BPM & Key Detection for StreamPireX Sampler
// =============================================================================
// Location: src/front/js/component/AudioAnalysis.js
// Pure Web Audio API — no external libraries
//
// Exports:
//   detectBPM(audioBuffer)   → { bpm, confidence, candidates }
//   detectKey(audioBuffer)   → { key, scale, confidence, chroma }
//   analyzeAudio(buffer)     → { bpm: {...}, key: {...} }
// =============================================================================

const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

export function detectBPM(buffer, opts = {}) {
  if (!buffer?.getChannelData) return { bpm: 0, confidence: 0, candidates: [] };
  const { minBpm = 60, maxBpm = 200 } = opts;
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const hopSize = Math.round(sr * 0.01);
  const frameSize = hopSize * 2;
  const numFrames = Math.floor((data.length - frameSize) / hopSize);
  if (numFrames < 20) return { bpm: 0, confidence: 0, candidates: [] };
  const onsetEnergy = new Float32Array(numFrames);
  let prevEnergy = 0;
  for (let f = 0; f < numFrames; f++) {
    const offset = f * hopSize;
    let energy = 0;
    for (let i = 0; i < frameSize && offset + i < data.length; i++) {
      energy += data[offset + i] * data[offset + i];
    }
    energy /= frameSize;
    onsetEnergy[f] = Math.max(0, energy - prevEnergy);
    prevEnergy = energy;
  }
  let maxOnset = 0;
  for (let i = 0; i < onsetEnergy.length; i++) if (onsetEnergy[i] > maxOnset) maxOnset = onsetEnergy[i];
  if (maxOnset > 0) for (let i = 0; i < onsetEnergy.length; i++) onsetEnergy[i] /= maxOnset;
  const framesPerSec = sr / hopSize;
  const minLag = Math.floor(framesPerSec * 60 / maxBpm);
  const maxLag = Math.min(Math.ceil(framesPerSec * 60 / minBpm), onsetEnergy.length - 1);
  const acf = new Float32Array(maxLag + 1);
  const len = onsetEnergy.length;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0, count = 0;
    for (let i = 0; i < len - lag; i++) { sum += onsetEnergy[i] * onsetEnergy[i + lag]; count++; }
    acf[lag] = count > 0 ? sum / count : 0;
  }
  const candidates = [];
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (acf[lag] > acf[lag - 1] && acf[lag] > acf[lag + 1] && acf[lag] > 0.01) {
      const bpm = Math.round((framesPerSec * 60) / lag);
      if (bpm >= minBpm && bpm <= maxBpm) candidates.push({ bpm, strength: acf[lag], lag });
    }
  }
  candidates.sort((a, b) => b.strength - a.strength);
  const weighted = candidates.map(c => {
    let weight = c.strength;
    if (c.bpm >= 80 && c.bpm <= 160) weight *= 1.5;
    else if (c.bpm >= 60 && c.bpm <= 200) weight *= 1.2;
    return { ...c, weight };
  });
  weighted.sort((a, b) => b.weight - a.weight);
  if (weighted.length === 0) return { bpm: 0, confidence: 0, candidates: [] };
  const best = weighted[0];
  return {
    bpm: best.bpm,
    confidence: Math.round(Math.min(1, best.strength * 3) * 100) / 100,
    candidates: weighted.slice(0, 5).map(c => ({ bpm: c.bpm, strength: Math.round(c.strength * 100) / 100 })),
  };
}

function pearsonCorrelation(x, y) {
  const n = x.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i]; sumY += y[i]; sumXY += x[i] * y[i]; sumX2 += x[i] * x[i]; sumY2 += y[i] * y[i];
  }
  const denom = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
}

export function detectKey(buffer) {
  const empty = { key: 'C', scale: 'major', confidence: 0, chroma: Array(12).fill(0), allKeys: [] };
  if (!buffer?.getChannelData) return empty;
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const frameSize = 4096;
  const hopSize = 2048;
  const numFrames = Math.floor((data.length - frameSize) / hopSize);
  if (numFrames < 1) return empty;
  const chroma = new Float64Array(12);
  const hann = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) hann[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frameSize - 1)));
  for (let f = 0; f < numFrames; f++) {
    const offset = f * hopSize;
    const frame = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) frame[i] = (data[offset + i] || 0) * hann[i];
    for (let pc = 0; pc < 12; pc++) {
      let energy = 0;
      for (let oct = 2; oct <= 7; oct++) {
        const freq = 440 * Math.pow(2, (pc - 9 + (oct - 4) * 12) / 12);
        const bin = Math.round(freq * frameSize / sr);
        if (bin < 1 || bin >= frameSize / 2) continue;
        const w = 2 * Math.PI * bin / frameSize;
        const coeff = 2 * Math.cos(w);
        let s0 = 0, s1 = 0, s2 = 0;
        for (let i = 0; i < frameSize; i++) { s0 = frame[i] + coeff * s1 - s2; s2 = s1; s1 = s0; }
        energy += Math.sqrt(s1 * s1 + s2 * s2 - coeff * s1 * s2);
      }
      chroma[pc] += energy;
    }
  }
  let maxC = 0;
  for (let i = 0; i < 12; i++) if (chroma[i] > maxC) maxC = chroma[i];
  const norm = new Float64Array(12);
  if (maxC > 0) for (let i = 0; i < 12; i++) norm[i] = chroma[i] / maxC;
  const allKeys = [];
  for (let root = 0; root < 12; root++) {
    const rotated = new Float64Array(12);
    for (let i = 0; i < 12; i++) rotated[i] = norm[(i + root) % 12];
    allKeys.push({ key: KEY_NAMES[root], scale: 'major', correlation: pearsonCorrelation(rotated, MAJOR_PROFILE) });
    allKeys.push({ key: KEY_NAMES[root], scale: 'minor', correlation: pearsonCorrelation(rotated, MINOR_PROFILE) });
  }
  allKeys.sort((a, b) => b.correlation - a.correlation);
  const best = allKeys[0];
  const second = allKeys[1];
  const confidence = Math.min(1, Math.max(0, (best.correlation - second.correlation) * 3 + 0.3));
  return {
    key: best.key,
    scale: best.scale,
    confidence: Math.round(confidence * 100) / 100,
    chroma: Array.from(norm).map(v => Math.round(v * 100) / 100),
    allKeys: allKeys.slice(0, 6).map(k => ({ key: k.key, scale: k.scale, correlation: Math.round(k.correlation * 100) / 100 })),
  };
}

export function analyzeAudio(buffer) {
  return { bpm: detectBPM(buffer), key: detectKey(buffer) };
}

export default { detectBPM, detectKey, analyzeAudio };
