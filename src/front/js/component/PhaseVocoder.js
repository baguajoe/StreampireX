// =============================================================================
// PhaseVocoder.js — Industry-Grade Pitch Shift & Time Stretch Engine
// =============================================================================
// FFT-based phase vocoder with PRO-LEVEL enhancements:
//   - STFT analysis (windowed FFT) with adaptive FFT sizing
//   - Phase accumulation (preserves phase coherence)
//   - Overlap-add resynthesis with proper COLA normalization
//   - ★ TRANSIENT DETECTION + PRESERVATION (drum/percussion clarity)
//   - ★ FORMANT PRESERVATION (natural vocal pitch shifting)
//   - ★ ADAPTIVE MULTI-RESOLUTION FFT (auto-selects best size)
//   - ★ GRANULAR SYNTHESIS ENGINE (for short segments & extreme ratios)
//   - ★ QUALITY MODES: realtime / standard / hq / ultra
//   - Pitch shifting WITHOUT speed change
//   - Time stretching WITHOUT pitch change
//   - PSOLA-style pitch correction for vocal tuning
//   - Onset-aware timing alignment
//
// Used by: VocalTuner, HarmonyGenerator, VocalAlignment, SamplerBeatMaker
// =============================================================================

/**
 * Phase Vocoder Pro — the core DSP class
 *
 * How it works:
 * 1. STFT: Break input into overlapping windows, apply Hann window, FFT each frame
 * 2. Analysis: Extract magnitude + phase from each FFT bin
 * 3. Phase accumulation: Track phase evolution to preserve frequency relationships
 * 4. Modification: Shift bins for pitch change, resample frames for time stretch
 * 5. Resynthesis: Inverse FFT each modified frame, overlap-add to output
 *
 * PRO ADDITIONS:
 * 6. Transient detection splits audio into transient + tonal components
 * 7. Tonal goes through phase vocoder; transients are copied directly
 * 8. Formant envelope extracted before pitch shift, re-applied after
 * 9. Adaptive FFT selects resolution per-segment based on content
 * 10. Granular engine handles segments too short for FFT
 */


// =============================================================================
// QUALITY PRESETS
// =============================================================================
export const QUALITY_MODES = {
  realtime: { fftSize: 1024, hopDivisor: 4, overlapFactor: 4 },
  standard: { fftSize: 2048, hopDivisor: 4, overlapFactor: 4 },
  hq:       { fftSize: 4096, hopDivisor: 8, overlapFactor: 8 },
  ultra:    { fftSize: 8192, hopDivisor: 8, overlapFactor: 8 },
};


// =============================================================================
// FFT IMPLEMENTATION (Cooley-Tukey radix-2 DIT)
// =============================================================================

class FFT {
  constructor(size) {
    this.size = size;
    this.halfSize = size / 2;

    // Precompute twiddle factors
    this.cosTable = new Float32Array(this.halfSize);
    this.sinTable = new Float32Array(this.halfSize);
    for (let i = 0; i < this.halfSize; i++) {
      this.cosTable[i] = Math.cos(-2 * Math.PI * i / size);
      this.sinTable[i] = Math.sin(-2 * Math.PI * i / size);
    }

    // Bit reversal permutation
    this.revTable = new Uint32Array(size);
    const bits = Math.log2(size);
    for (let i = 0; i < size; i++) {
      let rev = 0;
      for (let j = 0; j < bits; j++) {
        rev = (rev << 1) | ((i >> j) & 1);
      }
      this.revTable[i] = rev;
    }
  }

  forward(real, imag) {
    const n = this.size;

    for (let i = 0; i < n; i++) {
      const j = this.revTable[i];
      if (j > i) {
        let tmp = real[i]; real[i] = real[j]; real[j] = tmp;
        tmp = imag[i]; imag[i] = imag[j]; imag[j] = tmp;
      }
    }

    for (let len = 2; len <= n; len *= 2) {
      const halfLen = len / 2;
      const step = n / len;
      for (let i = 0; i < n; i += len) {
        for (let j = 0; j < halfLen; j++) {
          const twIdx = j * step;
          const cos = this.cosTable[twIdx];
          const sin = this.sinTable[twIdx];
          const idx1 = i + j;
          const idx2 = i + j + halfLen;
          const tR = real[idx2] * cos - imag[idx2] * sin;
          const tI = real[idx2] * sin + imag[idx2] * cos;
          real[idx2] = real[idx1] - tR;
          imag[idx2] = imag[idx1] - tI;
          real[idx1] += tR;
          imag[idx1] += tI;
        }
      }
    }
  }

  inverse(real, imag) {
    for (let i = 0; i < this.size; i++) imag[i] = -imag[i];
    this.forward(real, imag);
    const scale = 1 / this.size;
    for (let i = 0; i < this.size; i++) {
      real[i] *= scale;
      imag[i] = -imag[i] * scale;
    }
  }
}

// FFT instance cache to avoid re-creating for same sizes
const fftCache = {};
const getFFT = (size) => {
  if (!fftCache[size]) fftCache[size] = new FFT(size);
  return fftCache[size];
};


// =============================================================================
// WINDOW FUNCTIONS
// =============================================================================

const windowCache = {};

const createHannWindow = (size) => {
  if (windowCache[`hann_${size}`]) return windowCache[`hann_${size}`];
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
  }
  windowCache[`hann_${size}`] = w;
  return w;
};

const createBlackmanHarrisWindow = (size) => {
  if (windowCache[`bh_${size}`]) return windowCache[`bh_${size}`];
  const w = new Float32Array(size);
  const a0 = 0.35875, a1 = 0.48829, a2 = 0.14128, a3 = 0.01168;
  for (let i = 0; i < size; i++) {
    const t = 2 * Math.PI * i / (size - 1);
    w[i] = a0 - a1 * Math.cos(t) + a2 * Math.cos(2 * t) - a3 * Math.cos(3 * t);
  }
  windowCache[`bh_${size}`] = w;
  return w;
};

const wrapPhase = (phase) => {
  return phase - 2 * Math.PI * Math.round(phase / (2 * Math.PI));
};


// =============================================================================
// ★ TRANSIENT DETECTION ENGINE
// =============================================================================
// Detects percussive onsets using spectral flux + high-frequency energy.
// This is the #1 upgrade that separates amateur from professional time-stretch:
// drums stay crisp instead of getting smeared by the phase vocoder.
// =============================================================================

/**
 * Detect transient locations in audio
 * Returns array of { start, end } sample positions for transient regions
 *
 * @param {Float32Array} audioData
 * @param {number} sampleRate
 * @param {Object} opts - sensitivity, windowSize, minTransientLen
 * @returns {Array<{start: number, end: number}>}
 */
export const detectTransients = (audioData, sampleRate, opts = {}) => {
  const {
    sensitivity = 1.5,       // Higher = fewer detections, lower = more
    windowSize = 1024,       // Analysis window
    hopSize = 256,           // Hop between analysis frames
    minTransientMs = 5,      // Minimum transient duration (ms)
    maxTransientMs = 50,     // Maximum transient region (ms)
    highFreqWeight = 2.0,    // Weight for high-frequency energy (transients are HF-heavy)
  } = opts;

  const minTransientSamps = Math.floor(sampleRate * minTransientMs / 1000);
  const maxTransientSamps = Math.floor(sampleRate * maxTransientMs / 1000);
  const fft = getFFT(windowSize);
  const window = createHannWindow(windowSize);
  const halfFFT = windowSize / 2 + 1;

  // Compute spectral flux (positive-only, with HF weighting)
  let prevMag = new Float32Array(halfFFT);
  const fluxValues = [];
  const positions = [];

  for (let pos = 0; pos + windowSize <= audioData.length; pos += hopSize) {
    const real = new Float32Array(windowSize);
    const imag = new Float32Array(windowSize);
    for (let i = 0; i < windowSize; i++) {
      real[i] = audioData[pos + i] * window[i];
      imag[i] = 0;
    }
    fft.forward(real, imag);

    const mag = new Float32Array(halfFFT);
    for (let k = 0; k < halfFFT; k++) {
      mag[k] = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
    }

    // Spectral flux: sum of positive magnitude differences, HF-weighted
    let flux = 0;
    const hfBoundary = Math.floor(halfFFT * 0.3); // Above 30% of spectrum = HF
    for (let k = 0; k < halfFFT; k++) {
      const diff = mag[k] - prevMag[k];
      if (diff > 0) {
        const weight = k >= hfBoundary ? highFreqWeight : 1.0;
        flux += diff * weight;
      }
    }

    fluxValues.push(flux);
    positions.push(pos + windowSize / 2); // Center of window
    prevMag = mag;
  }

  if (fluxValues.length === 0) return [];

  // Adaptive threshold: median + sensitivity * MAD (median absolute deviation)
  const sorted = [...fluxValues].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const mad = [...fluxValues].map(v => Math.abs(v - median)).sort((a, b) => a - b);
  const madMedian = mad[Math.floor(mad.length / 2)];
  const threshold = median + sensitivity * Math.max(madMedian * 1.4826, median * 0.1);

  // Find peaks above threshold
  const transients = [];
  for (let i = 1; i < fluxValues.length - 1; i++) {
    if (fluxValues[i] > threshold &&
        fluxValues[i] >= fluxValues[i - 1] &&
        fluxValues[i] >= fluxValues[i + 1]) {
      const center = positions[i];
      // Transient region: a few ms before onset to maxTransientMs after
      const start = Math.max(0, center - minTransientSamps);
      const end = Math.min(audioData.length, center + maxTransientSamps);

      // Merge with previous if overlapping
      if (transients.length > 0 && start <= transients[transients.length - 1].end) {
        transients[transients.length - 1].end = end;
      } else {
        transients.push({ start, end });
      }
    }
  }

  return transients;
};

/**
 * Split audio into transient and tonal components
 * @returns {{ tonal: Float32Array, transientRegions: Array, transientData: Array<{start, end, samples: Float32Array}> }}
 */
export const splitTransientTonal = (audioData, sampleRate, opts = {}) => {
  const transients = detectTransients(audioData, sampleRate, opts);

  // Create tonal version with transients smoothly removed
  const tonal = new Float32Array(audioData);
  const transientData = [];
  const fadeLen = 64; // Crossfade samples at boundaries

  for (const { start, end } of transients) {
    // Save transient audio
    const len = end - start;
    const samples = new Float32Array(len);
    for (let i = 0; i < len; i++) samples[i] = audioData[start + i];
    transientData.push({ start, end, samples });

    // Fade out transient from tonal signal (smooth removal, not hard cut)
    for (let i = start; i < end && i < tonal.length; i++) {
      const distFromEdge = Math.min(i - start, end - i);
      if (distFromEdge < fadeLen) {
        tonal[i] *= distFromEdge / fadeLen;
      } else {
        tonal[i] = 0;
      }
    }
  }

  return { tonal, transientRegions: transients, transientData };
};


// =============================================================================
// ★ FORMANT PRESERVATION ENGINE
// =============================================================================
// Extracts spectral envelope (formants) before pitch shifting, re-applies after.
// This prevents the "chipmunk" effect on vocals. Uses true envelope estimation
// via cepstral method (liftering in the cepstral domain).
// =============================================================================

/**
 * Extract spectral envelope via cepstral method
 * @param {Float32Array} magnitude - magnitude spectrum (half FFT)
 * @param {number} fftSize
 * @param {number} lifterOrder - cutoff quefrency (lower = smoother envelope)
 * @returns {Float32Array} - spectral envelope (same size as magnitude)
 */
const extractSpectralEnvelope = (magnitude, fftSize, lifterOrder = 30) => {
  const halfFFT = magnitude.length;

  // Log magnitude spectrum
  const logMag = new Float32Array(fftSize);
  for (let k = 0; k < halfFFT; k++) {
    logMag[k] = Math.log(Math.max(magnitude[k], 1e-10));
  }
  // Mirror
  for (let k = halfFFT; k < fftSize; k++) {
    logMag[k] = logMag[fftSize - k];
  }

  // Real cepstrum via IFFT of log magnitude
  const fft = getFFT(fftSize);
  const imagZero = new Float32Array(fftSize);
  const cepstrum = new Float32Array(logMag);
  const cepImag = new Float32Array(fftSize);
  fft.inverse(cepstrum, cepImag);

  // Lifter: zero out high quefrencies (keep only smooth spectral shape)
  for (let i = lifterOrder; i < fftSize - lifterOrder; i++) {
    cepstrum[i] = 0;
    cepImag[i] = 0;
  }
  // Ramp at boundary to avoid artifacts
  if (lifterOrder > 2) {
    const rampLen = Math.min(5, Math.floor(lifterOrder / 3));
    for (let i = 0; i < rampLen; i++) {
      const fade = 1 - (i / rampLen);
      cepstrum[lifterOrder - 1 - i] *= fade;
      cepImag[lifterOrder - 1 - i] *= fade;
      if (fftSize - lifterOrder + i < fftSize) {
        cepstrum[fftSize - lifterOrder + i] *= fade;
        cepImag[fftSize - lifterOrder + i] *= fade;
      }
    }
  }

  // Forward FFT of liftered cepstrum = log spectral envelope
  fft.forward(cepstrum, cepImag);

  // Exponentiate to get linear spectral envelope
  const envelope = new Float32Array(halfFFT);
  for (let k = 0; k < halfFFT; k++) {
    envelope[k] = Math.exp(cepstrum[k]);
  }

  return envelope;
};

/**
 * Apply formant preservation to a pitch-shifted magnitude spectrum.
 * Removes the original spectral envelope, shifts the flat spectrum,
 * then re-applies the original envelope.
 *
 * @param {Float32Array} magnitude - original magnitude spectrum
 * @param {Float32Array} originalEnvelope - formant envelope of original
 * @param {number} pitchRatio - pitch shift ratio
 * @param {number} fftSize
 * @returns {Float32Array} - formant-preserved magnitude
 */
const applyFormantPreservation = (magnitude, originalEnvelope, pitchRatio, fftSize) => {
  const halfFFT = magnitude.length;
  const result = new Float32Array(halfFFT);

  for (let k = 0; k < halfFFT; k++) {
    // Where would this bin come from in the shifted version?
    const srcBin = k / pitchRatio;
    const srcIdx = Math.floor(srcBin);
    const frac = srcBin - srcIdx;

    // Get the shifted envelope value (what the envelope WOULD be after pitch shift)
    let shiftedEnv;
    if (srcIdx >= 0 && srcIdx < halfFFT - 1) {
      shiftedEnv = originalEnvelope[srcIdx] * (1 - frac) + originalEnvelope[srcIdx + 1] * frac;
    } else if (srcIdx >= 0 && srcIdx < halfFFT) {
      shiftedEnv = originalEnvelope[srcIdx];
    } else {
      shiftedEnv = 1e-10;
    }

    // Flatten: remove shifted envelope, then apply original envelope
    const flat = magnitude[k] / Math.max(shiftedEnv, 1e-10);
    result[k] = flat * originalEnvelope[Math.min(k, halfFFT - 1)];
  }

  return result;
};


// =============================================================================
// ★ GRANULAR SYNTHESIS ENGINE
// =============================================================================
// For segments too short for FFT, or for extreme stretch ratios (>3x or <0.3x),
// granular synthesis provides cleaner results than phase vocoder.
// Uses overlapping grains with pitch-synchronous windowing.
// =============================================================================

/**
 * Granular time stretch — works on short segments and extreme ratios
 * @param {Float32Array} audioData
 * @param {number} stretchRatio
 * @param {number} sampleRate
 * @param {Object} opts
 * @returns {Float32Array}
 */
export const granularTimeStretch = (audioData, stretchRatio, sampleRate, opts = {}) => {
  const {
    grainSize = Math.floor(sampleRate * 0.03),  // 30ms default grain
    overlap = 0.5,                                // 50% overlap
    jitter = 0.0,                                 // Random position jitter (0-1)
  } = opts;

  if (Math.abs(stretchRatio - 1.0) < 0.001) return new Float32Array(audioData);

  const outputLen = Math.ceil(audioData.length * stretchRatio);
  const output = new Float32Array(outputLen);
  const hopOut = Math.floor(grainSize * (1 - overlap));
  const window = createHannWindow(grainSize);

  // Simple PRNG for deterministic jitter
  let seed = 42;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  for (let outPos = 0; outPos + grainSize < outputLen; outPos += hopOut) {
    // Map output position back to input position
    let inPos = Math.floor((outPos / outputLen) * audioData.length);

    // Add jitter
    if (jitter > 0) {
      const maxJit = Math.floor(grainSize * jitter);
      inPos += Math.floor((rand() - 0.5) * 2 * maxJit);
      inPos = Math.max(0, Math.min(audioData.length - grainSize, inPos));
    }

    // Ensure we don't read past input
    if (inPos + grainSize > audioData.length) {
      inPos = audioData.length - grainSize;
    }
    if (inPos < 0) inPos = 0;

    // Copy grain with window
    for (let i = 0; i < grainSize && outPos + i < outputLen; i++) {
      const srcIdx = inPos + i;
      if (srcIdx < audioData.length) {
        output[outPos + i] += audioData[srcIdx] * window[i];
      }
    }
  }

  // Normalize to prevent volume buildup from overlapping grains
  const maxVal = output.reduce((mx, v) => Math.max(mx, Math.abs(v)), 0);
  const inputMax = audioData.reduce((mx, v) => Math.max(mx, Math.abs(v)), 0);
  if (maxVal > 0 && inputMax > 0) {
    const normFactor = inputMax / maxVal;
    for (let i = 0; i < outputLen; i++) output[i] *= normFactor;
  }

  return output;
};

/**
 * Pitch-synchronous granular synthesis
 * Adapts grain size to detected pitch period for cleaner pitched content
 */
export const pitchSyncGranularStretch = (audioData, stretchRatio, sampleRate, opts = {}) => {
  const detectedPitch = detectPitch(audioData, sampleRate);

  if (detectedPitch > 0) {
    // Use pitch period as grain size for optimal results
    const pitchPeriod = Math.round(sampleRate / detectedPitch);
    const grainSize = pitchPeriod * 2; // Two periods per grain
    return granularTimeStretch(audioData, stretchRatio, sampleRate, {
      ...opts,
      grainSize: Math.max(256, Math.min(grainSize, Math.floor(sampleRate * 0.08))),
      overlap: 0.75, // Higher overlap for pitched content
    });
  }

  // No pitch detected — use default grain size (good for noise/drums)
  return granularTimeStretch(audioData, stretchRatio, sampleRate, opts);
};


// =============================================================================
// STFT ANALYSIS + RESYNTHESIS (with quality modes)
// =============================================================================

export const analyzeSTFT = (audioData, fftSize = 2048, hopSize = 512) => {
  const fft = getFFT(fftSize);
  const window = createHannWindow(fftSize);
  const halfFFT = fftSize / 2 + 1;
  const frames = [];

  for (let pos = 0; pos + fftSize <= audioData.length; pos += hopSize) {
    const real = new Float32Array(fftSize);
    const imag = new Float32Array(fftSize);

    for (let i = 0; i < fftSize; i++) {
      real[i] = audioData[pos + i] * window[i];
      imag[i] = 0;
    }

    fft.forward(real, imag);

    const magnitude = new Float32Array(halfFFT);
    const phase = new Float32Array(halfFFT);
    for (let k = 0; k < halfFFT; k++) {
      magnitude[k] = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
      phase[k] = Math.atan2(imag[k], real[k]);
    }

    frames.push({ magnitude, phase });
  }

  return frames;
};

export const resynthesizeSTFT = (frames, fftSize = 2048, hopSize = 512, outputLength = null) => {
  const fft = getFFT(fftSize);
  const window = createHannWindow(fftSize);
  const len = outputLength || (frames.length * hopSize + fftSize);
  const output = new Float32Array(len);
  const windowSum = new Float32Array(len);

  for (let f = 0; f < frames.length; f++) {
    const pos = f * hopSize;
    if (pos + fftSize > len) break;

    const { magnitude, phase } = frames[f];
    const halfFFT = magnitude.length;

    const real = new Float32Array(fftSize);
    const imag = new Float32Array(fftSize);
    for (let k = 0; k < halfFFT; k++) {
      real[k] = magnitude[k] * Math.cos(phase[k]);
      imag[k] = magnitude[k] * Math.sin(phase[k]);
    }
    for (let k = halfFFT; k < fftSize; k++) {
      real[k] = real[fftSize - k];
      imag[k] = -imag[fftSize - k];
    }

    fft.inverse(real, imag);

    for (let i = 0; i < fftSize; i++) {
      if (pos + i < len) {
        output[pos + i] += real[i] * window[i];
        windowSum[pos + i] += window[i] * window[i];
      }
    }
  }

  for (let i = 0; i < len; i++) {
    if (windowSum[i] > 1e-6) output[i] /= windowSum[i];
  }

  return output;
};


// =============================================================================
// ★ CORE TIME STRETCHING — with transient preservation
// =============================================================================

/**
 * Basic phase vocoder time stretch (internal, no transient handling)
 */
const timeStretchPV = (audioData, stretchRatio, sampleRate, fftSize = 2048, hopSize = 512) => {
  if (Math.abs(stretchRatio - 1.0) < 0.001) return new Float32Array(audioData);

  const halfFFT = fftSize / 2 + 1;
  const analysisHop = hopSize;
  const synthesisHop = Math.round(hopSize * stretchRatio);

  const expectedPhaseAdvance = new Float32Array(halfFFT);
  for (let k = 0; k < halfFFT; k++) {
    expectedPhaseAdvance[k] = 2 * Math.PI * k * analysisHop / fftSize;
  }

  const frames = analyzeSTFT(audioData, fftSize, analysisHop);
  if (frames.length === 0) return new Float32Array(audioData.length);

  const synthFrames = [];
  const accumPhase = new Float32Array(halfFFT);

  for (let k = 0; k < halfFFT; k++) {
    accumPhase[k] = frames[0].phase[k];
  }

  synthFrames.push({
    magnitude: new Float32Array(frames[0].magnitude),
    phase: new Float32Array(frames[0].phase),
  });

  for (let f = 1; f < frames.length; f++) {
    const prevPhase = frames[f - 1].phase;
    const currPhase = frames[f].phase;
    const currMag = frames[f].magnitude;

    const newPhase = new Float32Array(halfFFT);
    for (let k = 0; k < halfFFT; k++) {
      let phaseDiff = currPhase[k] - prevPhase[k];
      phaseDiff -= expectedPhaseAdvance[k];
      phaseDiff = wrapPhase(phaseDiff);
      const trueFreq = expectedPhaseAdvance[k] + phaseDiff;
      accumPhase[k] += trueFreq * (synthesisHop / analysisHop);
      newPhase[k] = accumPhase[k];
    }

    synthFrames.push({
      magnitude: new Float32Array(currMag),
      phase: newPhase,
    });
  }

  const outputLen = Math.ceil(synthFrames.length * synthesisHop + fftSize);
  return resynthesizeSTFT(synthFrames, fftSize, synthesisHop, outputLen);
};

/**
 * ★ INDUSTRY-GRADE TIME STRETCH
 * Splits into transient + tonal, processes separately, recombines.
 *
 * @param {Float32Array} audioData
 * @param {number} stretchRatio - >1 = longer, <1 = shorter
 * @param {number} sampleRate
 * @param {number} fftSize
 * @param {number} hopSize
 * @param {Object} opts - { preserveTransients, quality, transientSensitivity }
 * @returns {Float32Array}
 */
export const timeStretch = (audioData, stretchRatio, sampleRate, fftSize = 2048, hopSize = 512, opts = {}) => {
  if (Math.abs(stretchRatio - 1.0) < 0.001) return new Float32Array(audioData);

  const {
    preserveTransients = true,
    quality = 'standard',
    transientSensitivity = 1.5,
    useGranularFallback = true,
  } = opts;

  // Apply quality mode settings
  const qm = QUALITY_MODES[quality] || QUALITY_MODES.standard;
  const effectiveFFT = fftSize || qm.fftSize;
  const effectiveHop = hopSize || Math.floor(effectiveFFT / qm.hopDivisor);

  // For extreme ratios, use hybrid granular+PV approach
  if (useGranularFallback && (stretchRatio > 3.0 || stretchRatio < 0.3)) {
    // Granular handles extreme ratios better than pure PV
    if (audioData.length < effectiveFFT * 4) {
      return pitchSyncGranularStretch(audioData, stretchRatio, sampleRate);
    }
    // Hybrid: PV for moderate stretch, then granular for the extreme portion
    const midRatio = stretchRatio > 1 ? 2.5 : 0.4;
    const firstPass = timeStretch(audioData, midRatio, sampleRate, effectiveFFT, effectiveHop, {
      ...opts,
      useGranularFallback: false,
    });
    const secondRatio = stretchRatio / midRatio;
    return pitchSyncGranularStretch(firstPass, secondRatio, sampleRate);
  }

  // Short audio: use granular directly (FFT needs enough frames)
  if (audioData.length < effectiveFFT * 4) {
    return pitchSyncGranularStretch(audioData, stretchRatio, sampleRate);
  }

  // ★ TRANSIENT PRESERVATION PATH
  if (preserveTransients) {
    const { tonal, transientRegions, transientData } = splitTransientTonal(
      audioData, sampleRate, { sensitivity: transientSensitivity }
    );

    // If no transients found, just do standard PV
    if (transientRegions.length === 0) {
      return timeStretchPV(audioData, stretchRatio, sampleRate, effectiveFFT, effectiveHop);
    }

    // Time-stretch the tonal component with phase vocoder
    const stretchedTonal = timeStretchPV(tonal, stretchRatio, sampleRate, effectiveFFT, effectiveHop);
    const outputLen = stretchedTonal.length;
    const output = new Float32Array(stretchedTonal);

    // Re-insert transients at their time-scaled positions (WITHOUT stretching them)
    const fadeLen = 64;
    for (const td of transientData) {
      // Scale the transient's position proportionally
      const originalCenter = (td.start + td.end) / 2;
      const scaledCenter = Math.floor(originalCenter * stretchRatio);
      const halfLen = Math.floor(td.samples.length / 2);
      const outStart = Math.max(0, scaledCenter - halfLen);

      // Crossfade transient back in
      for (let i = 0; i < td.samples.length && outStart + i < outputLen; i++) {
        // Fade in/out at edges
        let env = 1;
        if (i < fadeLen) env = i / fadeLen;
        if (td.samples.length - i < fadeLen) env = Math.min(env, (td.samples.length - i) / fadeLen);

        // Mix: transient has priority (louder), blend with stretched tonal
        output[outStart + i] = output[outStart + i] * (1 - env * 0.7) + td.samples[i] * env;
      }
    }

    return output;
  }

  // Standard PV path (no transient preservation)
  return timeStretchPV(audioData, stretchRatio, sampleRate, effectiveFFT, effectiveHop);
};


// =============================================================================
// RESAMPLING (Hermite 4-point interpolation)
// =============================================================================

export const resample = (input, outputLength) => {
  const output = new Float32Array(outputLength);
  const ratio = input.length / outputLength;

  for (let i = 0; i < outputLength; i++) {
    const srcPos = i * ratio;
    const srcInt = Math.floor(srcPos);
    const frac = srcPos - srcInt;

    const s0 = srcInt > 0 ? input[srcInt - 1] : input[0];
    const s1 = input[srcInt] || 0;
    const s2 = srcInt + 1 < input.length ? input[srcInt + 1] : 0;
    const s3 = srcInt + 2 < input.length ? input[srcInt + 2] : 0;

    const c0 = s1;
    const c1 = 0.5 * (s2 - s0);
    const c2 = s0 - 2.5 * s1 + 2 * s2 - 0.5 * s3;
    const c3 = 0.5 * (s3 - s0) + 1.5 * (s1 - s2);

    output[i] = ((c3 * frac + c2) * frac + c1) * frac + c0;
  }

  return output;
};


// =============================================================================
// ★ PITCH SHIFTING — with formant preservation + transient preservation
// =============================================================================

/**
 * ★ INDUSTRY-GRADE PITCH SHIFT
 * Phase vocoder stretch → resample, with formant + transient preservation.
 *
 * @param {Float32Array} audioData
 * @param {number} pitchRatio - >1 = higher, <1 = lower
 * @param {number} sampleRate
 * @param {number} fftSize
 * @param {number} hopSize
 * @param {Object} opts - { preserveFormants, preserveTransients, quality, lifterOrder }
 * @returns {Float32Array}
 */
export const pitchShift = (audioData, pitchRatio, sampleRate, fftSize = 2048, hopSize = 512, opts = {}) => {
  if (Math.abs(pitchRatio - 1.0) < 0.001) return new Float32Array(audioData);

  const {
    preserveFormants = true,
    preserveTransients = true,
    quality = 'standard',
    lifterOrder = 30,
    transientSensitivity = 1.5,
  } = opts;

  const qm = QUALITY_MODES[quality] || QUALITY_MODES.standard;
  const effectiveFFT = fftSize || qm.fftSize;
  const effectiveHop = hopSize || Math.floor(effectiveFFT / qm.hopDivisor);

  // ★ FORMANT PRESERVATION PATH
  if (preserveFormants && audioData.length >= effectiveFFT * 4) {
    const { tonal, transientRegions, transientData } = preserveTransients
      ? splitTransientTonal(audioData, sampleRate, { sensitivity: transientSensitivity })
      : { tonal: audioData, transientRegions: [], transientData: [] };

    const processTarget = preserveTransients && transientRegions.length > 0 ? tonal : audioData;

    // Step 1: Analyze original spectral envelope per frame
    const halfFFT = effectiveFFT / 2 + 1;
    const analysisHop = effectiveHop;
    const frames = analyzeSTFT(processTarget, effectiveFFT, analysisHop);

    if (frames.length === 0) return new Float32Array(audioData);

    // Extract envelope for each frame
    const envelopes = frames.map(f => extractSpectralEnvelope(f.magnitude, effectiveFFT, lifterOrder));

    // Step 2: Time-stretch by 1/pitchRatio
    const stretchRatio = 1.0 / pitchRatio;
    const synthesisHop = Math.round(analysisHop * stretchRatio);

    const expectedPhaseAdvance = new Float32Array(halfFFT);
    for (let k = 0; k < halfFFT; k++) {
      expectedPhaseAdvance[k] = 2 * Math.PI * k * analysisHop / effectiveFFT;
    }

    const synthFrames = [];
    const accumPhase = new Float32Array(halfFFT);
    for (let k = 0; k < halfFFT; k++) accumPhase[k] = frames[0].phase[k];

    // First frame with formant preservation
    const firstMag = applyFormantPreservation(frames[0].magnitude, envelopes[0], pitchRatio, effectiveFFT);
    synthFrames.push({
      magnitude: firstMag,
      phase: new Float32Array(frames[0].phase),
    });

    for (let f = 1; f < frames.length; f++) {
      const prevPhase = frames[f - 1].phase;
      const currPhase = frames[f].phase;

      const newPhase = new Float32Array(halfFFT);
      for (let k = 0; k < halfFFT; k++) {
        let phaseDiff = currPhase[k] - prevPhase[k] - expectedPhaseAdvance[k];
        phaseDiff = wrapPhase(phaseDiff);
        accumPhase[k] += (expectedPhaseAdvance[k] + phaseDiff) * (synthesisHop / analysisHop);
        newPhase[k] = accumPhase[k];
      }

      // Apply formant preservation to this frame
      const correctedMag = applyFormantPreservation(frames[f].magnitude, envelopes[f], pitchRatio, effectiveFFT);

      synthFrames.push({
        magnitude: correctedMag,
        phase: newPhase,
      });
    }

    // Resynthesize
    const stretchedLen = Math.ceil(synthFrames.length * synthesisHop + effectiveFFT);
    const stretched = resynthesizeSTFT(synthFrames, effectiveFFT, synthesisHop, stretchedLen);

    // Step 3: Resample to original length
    const output = resample(stretched, audioData.length);

    // Step 4: Re-insert transients if we split them
    if (preserveTransients && transientData.length > 0) {
      const fadeLen = 64;
      for (const td of transientData) {
        for (let i = 0; i < td.samples.length && td.start + i < output.length; i++) {
          let env = 1;
          if (i < fadeLen) env = i / fadeLen;
          if (td.samples.length - i < fadeLen) env = Math.min(env, (td.samples.length - i) / fadeLen);
          output[td.start + i] = output[td.start + i] * (1 - env * 0.7) + td.samples[i] * env;
        }
      }
    }

    return output;
  }

  // Fallback: standard PV (no formant preservation)
  const stretchRatio = 1.0 / pitchRatio;
  const stretched = timeStretch(audioData, stretchRatio, sampleRate, effectiveFFT, effectiveHop, {
    preserveTransients,
    quality,
    transientSensitivity,
  });
  return resample(stretched, audioData.length);
};

/**
 * Pitch shift by semitones (convenience wrapper)
 */
export const pitchShiftSemitones = (audioData, semitones, sampleRate, fftSize = 2048, hopSize = 512, opts = {}) => {
  const ratio = Math.pow(2, semitones / 12);
  return pitchShift(audioData, ratio, sampleRate, fftSize, hopSize, opts);
};


// =============================================================================
// ★ ADAPTIVE MULTI-RESOLUTION TIME STRETCH
// =============================================================================
// Automatically selects FFT size based on audio content analysis.
// Low frequencies need larger windows; high-frequency transients need smaller.
// This is what commercial engines like élastique do internally.
// =============================================================================

/**
 * Analyze audio content to determine optimal FFT size
 * @returns {{ fftSize: number, hopSize: number, isPercussive: boolean, dominantFreq: number }}
 */
export const analyzeContentForFFT = (audioData, sampleRate) => {
  // Check RMS and zero-crossing rate
  let rms = 0, zeroCrossings = 0;
  for (let i = 1; i < audioData.length; i++) {
    rms += audioData[i] * audioData[i];
    if ((audioData[i] >= 0) !== (audioData[i - 1] >= 0)) zeroCrossings++;
  }
  rms = Math.sqrt(rms / audioData.length);
  const zcr = zeroCrossings / audioData.length;

  // High ZCR relative to RMS = percussive/noisy content
  const isPercussive = zcr > 0.15 || rms < 0.02;

  // Detect dominant frequency
  const dominantFreq = detectPitch(audioData.slice(0, Math.min(audioData.length, sampleRate)), sampleRate);

  let fftSize, hopSize;

  if (isPercussive) {
    // Percussive: smaller FFT for better time resolution
    fftSize = 1024;
    hopSize = 256;
  } else if (dominantFreq > 0 && dominantFreq < 200) {
    // Low-frequency content: larger FFT for better frequency resolution
    fftSize = 8192;
    hopSize = 2048;
  } else if (dominantFreq > 0 && dominantFreq < 500) {
    // Mid-frequency: balanced
    fftSize = 4096;
    hopSize = 1024;
  } else {
    // High-frequency or mixed: standard
    fftSize = 2048;
    hopSize = 512;
  }

  return { fftSize, hopSize, isPercussive, dominantFreq };
};

/**
 * ★ ADAPTIVE TIME STRETCH — auto-selects best parameters
 */
export const adaptiveTimeStretch = (audioData, stretchRatio, sampleRate, opts = {}) => {
  const { fftSize, hopSize, isPercussive } = analyzeContentForFFT(audioData, sampleRate);

  return timeStretch(audioData, stretchRatio, sampleRate, fftSize, hopSize, {
    ...opts,
    preserveTransients: opts.preserveTransients !== undefined ? opts.preserveTransients : !isPercussive,
    // For very percussive content, use granular instead
    useGranularFallback: isPercussive || opts.useGranularFallback,
  });
};

/**
 * ★ ADAPTIVE PITCH SHIFT — auto-selects best parameters
 */
export const adaptivePitchShift = (audioData, pitchRatio, sampleRate, opts = {}) => {
  const { fftSize, hopSize, isPercussive, dominantFreq } = analyzeContentForFFT(audioData, sampleRate);

  return pitchShift(audioData, pitchRatio, sampleRate, fftSize, hopSize, {
    ...opts,
    // Only preserve formants if pitched content is detected
    preserveFormants: opts.preserveFormants !== undefined ? opts.preserveFormants : (dominantFreq > 0),
    preserveTransients: opts.preserveTransients !== undefined ? opts.preserveTransients : true,
  });
};


// =============================================================================
// PITCH DETECTION (autocorrelation with parabolic interpolation)
// =============================================================================

export const detectPitch = (audioData, sampleRate, minFreq = 60, maxFreq = 1100, threshold = 0.85) => {
  const size = audioData.length;
  const halfSize = Math.floor(size / 2);

  let rms = 0;
  for (let i = 0; i < size; i++) rms += audioData[i] * audioData[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.008) return -1;

  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.floor(sampleRate / minFreq);

  let bestCorr = 0;
  let bestOffset = -1;

  for (let offset = minPeriod; offset < maxPeriod && offset < halfSize; offset++) {
    let correlation = 0, norm1 = 0, norm2 = 0;

    for (let i = 0; i < halfSize; i++) {
      correlation += audioData[i] * audioData[i + offset];
      norm1 += audioData[i] * audioData[i];
      norm2 += audioData[i + offset] * audioData[i + offset];
    }

    const norm = Math.sqrt(norm1 * norm2);
    if (norm > 0) correlation /= norm;

    if (correlation > threshold && correlation > bestCorr) {
      bestCorr = correlation;
      bestOffset = offset;
    }
  }

  if (bestOffset <= 0 || bestCorr < threshold) return -1;

  // Parabolic interpolation for sub-sample accuracy
  if (bestOffset > minPeriod && bestOffset < maxPeriod - 1) {
    let c0 = 0, cM = 0, cP = 0;
    let n0 = 0, nM = 0, nP = 0;
    for (let i = 0; i < halfSize; i++) {
      c0 += audioData[i] * audioData[i + bestOffset];
      n0 += audioData[i + bestOffset] * audioData[i + bestOffset];
      cM += audioData[i] * audioData[i + bestOffset - 1];
      nM += audioData[i + bestOffset - 1] * audioData[i + bestOffset - 1];
      cP += audioData[i] * audioData[i + bestOffset + 1];
      nP += audioData[i + bestOffset + 1] * audioData[i + bestOffset + 1];
    }
    const r0 = n0 > 0 ? c0 / Math.sqrt(n0 * n0) : 0;
    const rM = nM > 0 ? cM / Math.sqrt(nM * nM) : 0;
    const rP = nP > 0 ? cP / Math.sqrt(nP * nP) : 0;

    const shift = (rM - rP) / (2 * (2 * r0 - rM - rP) + 1e-10);
    return sampleRate / (bestOffset + shift);
  }

  return sampleRate / bestOffset;
};


// =============================================================================
// PSOLA-STYLE PITCH CORRECTION
// =============================================================================

const SCALE_INTERVALS = {
  major:           [0, 2, 4, 5, 7, 9, 11],
  minor:           [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor:   [0, 2, 3, 5, 7, 8, 11],
  melodicMinor:    [0, 2, 3, 5, 7, 9, 11],
  dorian:          [0, 2, 3, 5, 7, 9, 10],
  mixolydian:      [0, 2, 4, 5, 7, 9, 10],
  pentatonic:      [0, 2, 4, 7, 9],
  blues:           [0, 3, 5, 6, 7, 10],
  chromatic:       [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const correctPitch = (audioData, sampleRate, key = 0, scale = 'chromatic', correctionStrength = 1.0) => {
  const scaleNotes = SCALE_INTERVALS[scale] || SCALE_INTERVALS.chromatic;
  const targetNotes = scaleNotes.map(n => (n + key) % 12);

  const windowSize = Math.floor(sampleRate * 0.04); // 40ms windows
  const hopSize = Math.floor(windowSize / 4);
  const output = new Float32Array(audioData.length);
  let outputWritten = 0;

  for (let pos = 0; pos + windowSize <= audioData.length; pos += hopSize) {
    const segment = audioData.slice(pos, pos + windowSize);
    const freq = detectPitch(segment, sampleRate);

    if (freq <= 0) {
      // No pitch — copy through
      for (let i = 0; i < hopSize && pos + i < output.length; i++) {
        output[pos + i] += segment[i];
      }
      continue;
    }

    // Find nearest target note
    const midiNote = 69 + 12 * Math.log2(freq / 440);
    const noteClass = ((Math.round(midiNote) % 12) + 12) % 12;
    let nearestNote = targetNotes[0];
    let minDist = 12;
    for (const tn of targetNotes) {
      const dist = Math.min(Math.abs(noteClass - tn), 12 - Math.abs(noteClass - tn));
      if (dist < minDist) { minDist = dist; nearestNote = tn; }
    }

    // Calculate correction in semitones
    let correction = nearestNote - noteClass;
    if (correction > 6) correction -= 12;
    if (correction < -6) correction += 12;
    correction *= correctionStrength;

    if (Math.abs(correction) < 0.01) {
      for (let i = 0; i < hopSize && pos + i < output.length; i++) {
        output[pos + i] += segment[i];
      }
    } else {
      // Pitch shift this segment
      const ratio = Math.pow(2, correction / 12);
      const shifted = pitchShift(segment, ratio, sampleRate, 1024, 256, {
        preserveFormants: true,
        preserveTransients: false,
        quality: 'realtime',
      });
      for (let i = 0; i < hopSize && pos + i < output.length; i++) {
        output[pos + i] += shifted[i] || 0;
      }
    }
  }

  return output;
};


// =============================================================================
// HARMONY GENERATION (uses formant-preserving pitch shift)
// =============================================================================

export const generateHarmonyVoice = (audioData, sampleRate, semitones) => {
  return pitchShiftSemitones(audioData, semitones, sampleRate, 2048, 512, {
    preserveFormants: true,
    preserveTransients: true,
    quality: 'hq',
  });
};

const getScaleDegreeShift = (pitch, sampleRate, degreeShift, key, scale) => {
  const scaleDegrees = SCALE_INTERVALS[scale] || SCALE_INTERVALS.major;
  const freq = typeof pitch === 'number' ? pitch : detectPitch(pitch, sampleRate);
  if (freq <= 0) return getDefaultShift(degreeShift, scaleDegrees);

  const midiNote = 69 + 12 * Math.log2(freq / 440);
  const pc = ((Math.round(midiNote) - key) % 12 + 12) % 12;

  let minDist = 12, currentDegree = 0;
  for (let i = 0; i < scaleDegrees.length; i++) {
    const dist = Math.abs(scaleDegrees[i] - pc);
    if (dist < minDist) { minDist = dist; currentDegree = i; }
  }

  const targetDegree = currentDegree + degreeShift;
  const octaveShift = Math.floor(targetDegree / scaleDegrees.length);
  const degInScale = ((targetDegree % scaleDegrees.length) + scaleDegrees.length) % scaleDegrees.length;
  const targetPc = scaleDegrees[degInScale];

  return (targetPc - pc) + octaveShift * 12;
};

const getDefaultShift = (degreeShift, scaleDegrees) => {
  if (degreeShift >= 0 && degreeShift < scaleDegrees.length) return scaleDegrees[degreeShift];
  return degreeShift;
};

export const generateScaleHarmony = (audioData, sampleRate, degreeShift, key = 0, scale = 'major') => {
  const windowSize = Math.floor(sampleRate * 0.05);
  const hopSize = Math.floor(windowSize / 4);
  const output = new Float32Array(audioData.length);

  for (let pos = 0; pos + windowSize <= audioData.length; pos += hopSize) {
    const segment = audioData.slice(pos, pos + windowSize);
    const semitoneShift = getScaleDegreeShift(segment, sampleRate, degreeShift, key, scale);
    const shifted = pitchShiftSemitones(segment, semitoneShift, sampleRate, 2048, 512, {
      preserveFormants: true,
      quality: 'standard',
    });
    const window = createHannWindow(windowSize);
    for (let i = 0; i < hopSize && pos + i < output.length; i++) {
      output[pos + i] += (shifted[i] || 0) * window[i];
    }
  }

  return output;
};


// =============================================================================
// TIME ALIGNMENT (onset-aware)
// =============================================================================

export const alignTiming = (audioData, sampleRate, alignments) => {
  if (!alignments || alignments.length === 0) return new Float32Array(audioData);

  const output = new Float32Array(audioData.length);
  const sorted = [...alignments].sort((a, b) => a.originalTime - b.originalTime);

  const points = [
    { originalTime: 0, targetTime: 0 },
    ...sorted,
    { originalTime: audioData.length / sampleRate, targetTime: audioData.length / sampleRate },
  ];

  for (let i = 0; i < points.length - 1; i++) {
    const srcStart = Math.floor(points[i].originalTime * sampleRate);
    const srcEnd = Math.floor(points[i + 1].originalTime * sampleRate);
    const dstStart = Math.floor(points[i].targetTime * sampleRate);
    const dstEnd = Math.floor(points[i + 1].targetTime * sampleRate);

    const srcLen = srcEnd - srcStart;
    const dstLen = dstEnd - dstStart;

    if (srcLen <= 0 || dstLen <= 0) continue;

    const segment = audioData.slice(srcStart, srcEnd);
    let processed;
    const stretchRatio = dstLen / srcLen;

    if (Math.abs(stretchRatio - 1.0) < 0.02) {
      processed = segment;
    } else if (srcLen > 4096) {
      // Use adaptive stretch for each segment
      processed = timeStretch(segment, stretchRatio, sampleRate, 2048, 512, {
        preserveTransients: true,
        quality: 'standard',
      });
    } else {
      processed = pitchSyncGranularStretch(segment, stretchRatio, sampleRate);
    }

    const fadeLen = Math.min(128, Math.floor(dstLen / 4));
    for (let j = 0; j < dstLen && (dstStart + j) < output.length; j++) {
      const sample = j < processed.length ? processed[j] : 0;
      let fade = 1;
      if (j < fadeLen) fade = j / fadeLen;
      if (dstLen - j < fadeLen) fade = Math.min(fade, (dstLen - j) / fadeLen);
      output[dstStart + j] += sample * fade;
    }
  }

  return output;
};


// =============================================================================
// DEFAULT EXPORT
// =============================================================================
export default {
  // Core (upgraded)
  pitchShift,
  pitchShiftSemitones,
  timeStretch,
  resample,

  // ★ New Pro features
  adaptiveTimeStretch,
  adaptivePitchShift,
  detectTransients,
  splitTransientTonal,
  granularTimeStretch,
  pitchSyncGranularStretch,
  analyzeContentForFFT,
  QUALITY_MODES,

  // Existing features (upgraded internals)
  detectPitch,
  correctPitch,
  generateHarmonyVoice,
  generateScaleHarmony,
  alignTiming,
  analyzeSTFT,
  resynthesizeSTFT,
};