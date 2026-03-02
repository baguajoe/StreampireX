// =============================================================================
// AudioAnalysis.js — BPM Detection + Musical Key Detection for Sampler
// =============================================================================
// Named exports: detectBPM, detectKey, analyzeAudio
// Used by SamplerBeatMaker.js for automatic sample analysis on load
// =============================================================================

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Krumhansl-Kessler key profiles (perceptual weighting of pitch classes)
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

// ─────────────────────────────────────────────────────────────────────────────
// BPM DETECTION — Autocorrelation-based tempo estimation
// ─────────────────────────────────────────────────────────────────────────────

export function detectBPM(audioBuffer) {
  if (!audioBuffer || audioBuffer.duration < 1) {
    return { bpm: 0, confidence: 0, candidates: [] };
  }

  const data = audioBuffer.getChannelData(0);
  const sr = audioBuffer.sampleRate;

  // Downsample to ~4kHz for faster processing
  const dsRate = 4000;
  const dsFactor = Math.max(1, Math.floor(sr / dsRate));
  const ds = [];
  for (let i = 0; i < data.length; i += dsFactor) {
    ds.push(Math.abs(data[i]));
  }

  // Compute onset detection function (spectral flux approximation)
  const frameSize = 128;
  const energy = [];
  for (let i = 0; i < ds.length - frameSize; i += frameSize) {
    let e = 0;
    for (let j = 0; j < frameSize; j++) e += ds[i + j] * ds[i + j];
    energy.push(e / frameSize);
  }

  // Half-wave rectified first difference
  const diff = [0];
  for (let i = 1; i < energy.length; i++) {
    diff.push(Math.max(0, energy[i] - energy[i - 1]));
  }

  // Autocorrelation to find periodicity
  const minBPM = 50, maxBPM = 200;
  const effectiveSR = dsRate / frameSize;
  const minLag = Math.floor(effectiveSR * 60 / maxBPM);
  const maxLag = Math.floor(effectiveSR * 60 / minBPM);
  const maxSearch = Math.min(maxLag, Math.floor(diff.length / 2));

  const correlations = [];
  let bestLag = minLag, bestCorr = -1;

  for (let lag = minLag; lag <= maxSearch; lag++) {
    let corr = 0;
    for (let i = 0; i < diff.length - lag; i++) {
      corr += diff[i] * diff[i + lag];
    }
    // Normalize
    corr /= (diff.length - lag);
    correlations.push({ lag, corr });
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  const detectedBPM = Math.round(60 / (bestLag / effectiveSR));

  // Find confidence (ratio of best peak to second-best non-harmonic peak)
  correlations.sort((a, b) => b.corr - a.corr);
  let confidence = 0.5;
  if (correlations.length >= 2) {
    const best = correlations[0];
    // Find next peak that isn't a harmonic (within 10% of double/half)
    const nonHarmonic = correlations.find(c => {
      const ratio = c.lag / best.lag;
      return Math.abs(ratio - 1) > 0.1 &&
             Math.abs(ratio - 2) > 0.15 &&
             Math.abs(ratio - 0.5) > 0.15;
    });
    if (nonHarmonic && nonHarmonic.corr > 0) {
      confidence = Math.min(0.99, best.corr / (best.corr + nonHarmonic.corr));
    }
  }

  // Build candidate list (top 5 plausible tempos)
  const candidates = [];
  const seen = new Set();
  for (const c of correlations.slice(0, 20)) {
    const bpm = Math.round(60 / (c.lag / effectiveSR));
    if (bpm >= minBPM && bpm <= maxBPM && !seen.has(bpm)) {
      seen.add(bpm);
      candidates.push({
        bpm,
        confidence: c.corr / (correlations[0]?.corr || 1),
      });
      if (candidates.length >= 5) break;
    }
  }

  // Prefer tempos in common ranges (double/half correction)
  let finalBPM = detectedBPM;
  if (finalBPM > 0 && finalBPM < 60) finalBPM *= 2;
  if (finalBPM > 180) finalBPM = Math.round(finalBPM / 2);

  return {
    bpm: (finalBPM >= minBPM && finalBPM <= maxBPM) ? finalBPM : 0,
    confidence: Math.max(0, Math.min(1, confidence)),
    candidates,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// KEY DETECTION — Chroma-based Krumhansl-Schmuckler algorithm
// ─────────────────────────────────────────────────────────────────────────────

export function detectKey(audioBuffer) {
  if (!audioBuffer || audioBuffer.duration < 1) {
    return { key: '', scale: '', confidence: 0, allKeys: [] };
  }

  const data = audioBuffer.getChannelData(0);
  const sr = audioBuffer.sampleRate;

  // Compute chroma features using DFT on overlapping frames
  const frameSize = 4096;
  const hopSize = 2048;
  const chroma = new Float32Array(12).fill(0);
  let frameCount = 0;

  for (let start = 0; start + frameSize < data.length; start += hopSize) {
    // Apply Hann window
    const frame = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) {
      frame[i] = data[start + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (frameSize - 1)));
    }

    // Simple DFT for pitch class extraction
    // Map frequency bins to chroma bins
    for (let bin = 1; bin < frameSize / 2; bin++) {
      const freq = bin * sr / frameSize;
      if (freq < 65 || freq > 2000) continue; // C2 to B6 range

      // Compute magnitude for this bin
      let re = 0, im = 0;
      for (let n = 0; n < frameSize; n++) {
        const angle = -2 * Math.PI * bin * n / frameSize;
        re += frame[n] * Math.cos(angle);
        im += frame[n] * Math.sin(angle);
      }
      const mag = Math.sqrt(re * re + im * im);

      // Map frequency to chroma bin
      const midiNote = 12 * Math.log2(freq / 440) + 69;
      const chromaBin = Math.round(midiNote) % 12;
      if (chromaBin >= 0 && chromaBin < 12) {
        chroma[chromaBin] += mag * mag; // energy
      }
    }
    frameCount++;

    // Limit processing for long files (process ~10 seconds max)
    if (frameCount > (sr * 10) / hopSize) break;
  }

  // Normalize chroma
  let maxChroma = 0;
  for (let i = 0; i < 12; i++) {
    if (chroma[i] > maxChroma) maxChroma = chroma[i];
  }
  if (maxChroma > 0) {
    for (let i = 0; i < 12; i++) chroma[i] /= maxChroma;
  }

  // Correlate with all 24 key profiles (12 major + 12 minor)
  const allKeys = [];

  for (let root = 0; root < 12; root++) {
    // Rotate profile to match root
    const majorCorr = pearsonCorrelation(chroma, rotateArray(MAJOR_PROFILE, root));
    const minorCorr = pearsonCorrelation(chroma, rotateArray(MINOR_PROFILE, root));

    allKeys.push({ key: CHROMATIC[root], scale: 'major', correlation: majorCorr });
    allKeys.push({ key: CHROMATIC[root], scale: 'minor', correlation: minorCorr });
  }

  // Sort by correlation (best match first)
  allKeys.sort((a, b) => b.correlation - a.correlation);

  const best = allKeys[0];
  const second = allKeys[1];

  // Confidence: difference between best and second-best
  const confidence = best && second
    ? Math.min(1, Math.max(0, (best.correlation - second.correlation) * 2 + 0.3))
    : 0;

  return {
    key: best?.key || '',
    scale: best?.scale || '',
    confidence,
    allKeys: allKeys.slice(0, 6), // top 6 candidates
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED ANALYSIS — runs both BPM + Key detection
// ─────────────────────────────────────────────────────────────────────────────

export function analyzeAudio(audioBuffer) {
  const bpm = detectBPM(audioBuffer);
  const key = detectKey(audioBuffer);
  return { bpm, key };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function rotateArray(arr, n) {
  const rotated = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    rotated[i] = arr[(i + arr.length - n) % arr.length];
  }
  return rotated;
}

function pearsonCorrelation(a, b) {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;

  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
    sumAB += a[i] * b[i];
    sumA2 += a[i] * a[i];
    sumB2 += b[i] * b[i];
  }

  const numerator = n * sumAB - sumA * sumB;
  const denominator = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));

  return denominator === 0 ? 0 : numerator / denominator;
}

// Default export for backwards compatibility
export default { detectBPM, detectKey, analyzeAudio };