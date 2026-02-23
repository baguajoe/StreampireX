// =============================================================================
// PhaseVocoder.js — High-Quality Pitch Shift & Time Stretch Engine
// =============================================================================
// FFT-based phase vocoder with:
//   - STFT analysis (windowed FFT)
//   - Phase accumulation (preserves phase coherence)
//   - Overlap-add resynthesis
//   - Pitch shifting WITHOUT speed change
//   - Time stretching WITHOUT pitch change
//   - PSOLA-style pitch correction for vocal tuning
//
// Used by: VocalTuner, HarmonyGenerator, VocalAlignment
// =============================================================================

/**
 * Phase Vocoder — the core DSP class
 *
 * How it works:
 * 1. STFT: Break input into overlapping windows, apply Hann window, FFT each frame
 * 2. Analysis: Extract magnitude + phase from each FFT bin
 * 3. Phase accumulation: Track how phase evolves between frames to preserve
 *    frequency relationships (this is what prevents the "phasey" sound)
 * 4. Modification: Shift bins for pitch change, resample frames for time stretch
 * 5. Resynthesis: Inverse FFT each modified frame, overlap-add to output
 *
 * The key insight: naive pitch shifting via resampling changes speed.
 * Phase vocoder decouples pitch from time by working in the frequency domain.
 */

// ── FFT implementation (Cooley-Tukey radix-2 DIT) ──
// We need our own because OfflineAudioContext doesn't expose raw FFT

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

  // Forward FFT: real/imag arrays, in-place
  forward(real, imag) {
    const n = this.size;

    // Bit-reversal
    for (let i = 0; i < n; i++) {
      const j = this.revTable[i];
      if (j > i) {
        let tmp = real[i]; real[i] = real[j]; real[j] = tmp;
        tmp = imag[i]; imag[i] = imag[j]; imag[j] = tmp;
      }
    }

    // Butterfly stages
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

  // Inverse FFT
  inverse(real, imag) {
    // Conjugate
    for (let i = 0; i < this.size; i++) imag[i] = -imag[i];

    this.forward(real, imag);

    // Conjugate and scale
    const scale = 1 / this.size;
    for (let i = 0; i < this.size; i++) {
      real[i] *= scale;
      imag[i] = -imag[i] * scale;
    }
  }
}

// ── Hann window ──
const createHannWindow = (size) => {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
  }
  return w;
};

// ── Phase wrapping ──
const wrapPhase = (phase) => {
  return phase - 2 * Math.PI * Math.round(phase / (2 * Math.PI));
};

// =============================================================================
// STFT Analysis + Resynthesis
// =============================================================================

/**
 * Analyze audio into STFT frames
 * Returns array of { magnitude[], phase[] } for each frame
 */
export const analyzeSTFT = (audioData, fftSize = 2048, hopSize = 512) => {
  const fft = new FFT(fftSize);
  const window = createHannWindow(fftSize);
  const halfFFT = fftSize / 2 + 1;
  const frames = [];

  for (let pos = 0; pos + fftSize <= audioData.length; pos += hopSize) {
    const real = new Float32Array(fftSize);
    const imag = new Float32Array(fftSize);

    // Windowed frame
    for (let i = 0; i < fftSize; i++) {
      real[i] = audioData[pos + i] * window[i];
      imag[i] = 0;
    }

    fft.forward(real, imag);

    // Extract magnitude and phase
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

/**
 * Resynthesize audio from STFT frames
 * Uses overlap-add with phase accumulation
 */
export const resynthesizeSTFT = (frames, fftSize = 2048, hopSize = 512, outputLength = null) => {
  const fft = new FFT(fftSize);
  const window = createHannWindow(fftSize);
  const len = outputLength || (frames.length * hopSize + fftSize);
  const output = new Float32Array(len);
  const windowSum = new Float32Array(len); // for normalization

  for (let f = 0; f < frames.length; f++) {
    const pos = f * hopSize;
    if (pos + fftSize > len) break;

    const { magnitude, phase } = frames[f];
    const halfFFT = magnitude.length;

    // Build complex spectrum from magnitude + phase
    const real = new Float32Array(fftSize);
    const imag = new Float32Array(fftSize);
    for (let k = 0; k < halfFFT; k++) {
      real[k] = magnitude[k] * Math.cos(phase[k]);
      imag[k] = magnitude[k] * Math.sin(phase[k]);
    }
    // Mirror for real signal
    for (let k = halfFFT; k < fftSize; k++) {
      real[k] = real[fftSize - k];
      imag[k] = -imag[fftSize - k];
    }

    fft.inverse(real, imag);

    // Overlap-add with window
    for (let i = 0; i < fftSize; i++) {
      if (pos + i < len) {
        output[pos + i] += real[i] * window[i];
        windowSum[pos + i] += window[i] * window[i];
      }
    }
  }

  // Normalize by window sum to prevent amplitude modulation
  for (let i = 0; i < len; i++) {
    if (windowSum[i] > 1e-6) {
      output[i] /= windowSum[i];
    }
  }

  return output;
};


// =============================================================================
// PITCH SHIFTING (preserves duration)
// =============================================================================

/**
 * Shift pitch by a ratio (e.g., 2.0 = up one octave, 0.5 = down one octave)
 * Uses phase vocoder to stretch/compress time, then resamples to restore duration.
 *
 * @param {Float32Array} audioData - mono audio samples
 * @param {number} pitchRatio - pitch multiplier (>1 = higher, <1 = lower)
 * @param {number} sampleRate - sample rate
 * @param {number} fftSize - FFT window size (2048 default, larger = better freq resolution)
 * @param {number} hopSize - hop between frames (512 default = 75% overlap)
 * @returns {Float32Array} - pitch-shifted audio, same length as input
 */
export const pitchShift = (audioData, pitchRatio, sampleRate, fftSize = 2048, hopSize = 512) => {
  if (Math.abs(pitchRatio - 1.0) < 0.001) return new Float32Array(audioData);

  // Step 1: Time-stretch by 1/pitchRatio (makes it longer/shorter)
  const timeStretchRatio = 1.0 / pitchRatio;
  const stretched = timeStretch(audioData, timeStretchRatio, sampleRate, fftSize, hopSize);

  // Step 2: Resample to original length (changes speed back, applies pitch)
  const output = resample(stretched, audioData.length);

  return output;
};

/**
 * Pitch shift by semitones
 */
export const pitchShiftSemitones = (audioData, semitones, sampleRate, fftSize = 2048, hopSize = 512) => {
  const ratio = Math.pow(2, semitones / 12);
  return pitchShift(audioData, ratio, sampleRate, fftSize, hopSize);
};


// =============================================================================
// TIME STRETCHING (preserves pitch)
// =============================================================================

/**
 * Time-stretch audio by a ratio (e.g., 2.0 = twice as long, 0.5 = half as long)
 * Uses phase vocoder with proper phase accumulation.
 *
 * @param {Float32Array} audioData - mono audio samples
 * @param {number} stretchRatio - time multiplier (>1 = longer, <1 = shorter)
 * @param {number} sampleRate - sample rate
 * @param {number} fftSize - FFT size
 * @param {number} hopSize - analysis hop size
 * @returns {Float32Array} - time-stretched audio
 */
export const timeStretch = (audioData, stretchRatio, sampleRate, fftSize = 2048, hopSize = 512) => {
  if (Math.abs(stretchRatio - 1.0) < 0.001) return new Float32Array(audioData);

  const halfFFT = fftSize / 2 + 1;
  const analysisHop = hopSize;
  const synthesisHop = Math.round(hopSize * stretchRatio);

  // Expected phase advance per analysis hop for each bin
  const freqPerBin = sampleRate / fftSize;
  const expectedPhaseAdvance = new Float32Array(halfFFT);
  for (let k = 0; k < halfFFT; k++) {
    expectedPhaseAdvance[k] = 2 * Math.PI * k * analysisHop / fftSize;
  }

  // Analyze
  const frames = analyzeSTFT(audioData, fftSize, analysisHop);
  if (frames.length === 0) return new Float32Array(audioData.length);

  // Phase accumulation for synthesis
  const synthFrames = [];
  const accumPhase = new Float32Array(halfFFT);

  // Initialize with first frame's phase
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
      // Phase difference between consecutive analysis frames
      let phaseDiff = currPhase[k] - prevPhase[k];

      // Remove expected phase advance
      phaseDiff -= expectedPhaseAdvance[k];

      // Wrap to [-π, π]
      phaseDiff = wrapPhase(phaseDiff);

      // True frequency deviation
      const trueFreq = expectedPhaseAdvance[k] + phaseDiff;

      // Accumulate phase at synthesis rate
      accumPhase[k] += trueFreq * (synthesisHop / analysisHop);
      newPhase[k] = accumPhase[k];
    }

    synthFrames.push({
      magnitude: new Float32Array(currMag),
      phase: newPhase,
    });
  }

  // Resynthesize with synthesis hop
  const outputLen = Math.ceil(synthFrames.length * synthesisHop + fftSize);
  return resynthesizeSTFT(synthFrames, fftSize, synthesisHop, outputLen);
};


// =============================================================================
// RESAMPLING (simple high-quality linear + windowed sinc)
// =============================================================================

/**
 * Resample audio to a new length using windowed sinc interpolation
 * (4-point for speed, good quality)
 */
export const resample = (input, outputLength) => {
  const output = new Float32Array(outputLength);
  const ratio = input.length / outputLength;

  for (let i = 0; i < outputLength; i++) {
    const srcPos = i * ratio;
    const srcInt = Math.floor(srcPos);
    const frac = srcPos - srcInt;

    // 4-point Hermite interpolation (much better than linear)
    const s0 = srcInt > 0 ? input[srcInt - 1] : input[0];
    const s1 = input[srcInt] || 0;
    const s2 = srcInt + 1 < input.length ? input[srcInt + 1] : 0;
    const s3 = srcInt + 2 < input.length ? input[srcInt + 2] : 0;

    // Hermite interpolation coefficients
    const c0 = s1;
    const c1 = 0.5 * (s2 - s0);
    const c2 = s0 - 2.5 * s1 + 2 * s2 - 0.5 * s3;
    const c3 = 0.5 * (s3 - s0) + 1.5 * (s1 - s2);

    output[i] = ((c3 * frac + c2) * frac + c1) * frac + c0;
  }

  return output;
};


// =============================================================================
// PITCH DETECTION (autocorrelation — same algo but exposed for reuse)
// =============================================================================

/**
 * Detect pitch via autocorrelation
 * @returns {number} frequency in Hz, or -1 if no pitch detected
 */
export const detectPitch = (audioData, sampleRate, minFreq = 60, maxFreq = 1100, threshold = 0.85) => {
  const size = audioData.length;
  const halfSize = Math.floor(size / 2);

  // Check RMS — skip silence
  let rms = 0;
  for (let i = 0; i < size; i++) rms += audioData[i] * audioData[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.008) return -1;

  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.floor(sampleRate / minFreq);

  let bestCorr = 0;
  let bestOffset = -1;

  // Normalized autocorrelation
  for (let offset = minPeriod; offset < maxPeriod && offset < halfSize; offset++) {
    let correlation = 0;
    let norm1 = 0;
    let norm2 = 0;

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

    const shift = (rM - rP) / (2 * (rM - 2 * r0 + rP) || 1);
    if (Math.abs(shift) < 1) {
      return sampleRate / (bestOffset + shift);
    }
  }

  return sampleRate / bestOffset;
};


// =============================================================================
// VOCAL-SPECIFIC: Per-grain pitch correction
// =============================================================================

/**
 * Correct pitch of an audio buffer to a target scale.
 * Uses the phase vocoder for artifact-free pitch shifting per analysis window.
 *
 * @param {Float32Array} audioData - mono input
 * @param {number} sampleRate
 * @param {number} rootNote - 0-11 (C=0)
 * @param {number[]} scalePattern - array of 12 values (1=in scale, 0=not)
 * @param {number} correctionSpeed - 0.0 (instant/hard) to 1.0 (subtle/slow)
 * @param {number} humanize - 0.0-1.0, adds random variation
 * @param {boolean} preserveVibrato - if true, don't correct small pitch deviations
 * @param {number} vibratoThreshold - cents threshold for vibrato detection
 * @returns {{ correctedAudio: Float32Array, pitchData: Array }}
 */
export const correctPitch = (audioData, sampleRate, rootNote, scalePattern, options = {}) => {
  const {
    correctionSpeed = 0.25,
    humanize = 0.0,
    preserveVibrato = true,
    vibratoThreshold = 30,
    fftSize = 2048,
    hopSize = 512,
    bypassNotes = new Set(),
  } = options;

  const pitchData = [];
  const outputChunks = [];
  const grainSize = fftSize * 2;    // larger grains for smoother correction
  const grainHop = hopSize * 2;
  let prevCorrectedShift = 0;        // for smoothing

  for (let pos = 0; pos + grainSize <= audioData.length; pos += grainHop) {
    const grain = audioData.slice(pos, pos + grainSize);

    // Detect pitch of this grain
    const freq = detectPitch(grain, sampleRate);
    const time = pos / sampleRate;

    if (freq <= 0) {
      // No pitch — pass through unchanged
      outputChunks.push({ pos, data: grain, shift: 0 });
      pitchData.push({ time, origFreq: -1, origNote: -1, corrNote: -1, corrFreq: -1, cents: 0 });
      continue;
    }

    const origNote = 12 * Math.log2(freq / 440) + 69;
    const origNoteRound = Math.round(origNote);
    const cents = Math.round((origNote - origNoteRound) * 100);

    // Find nearest in-scale note
    const corrNote = snapToScale(origNoteRound, rootNote, scalePattern);
    const corrFreq = 440 * Math.pow(2, (corrNote - 69) / 12);

    // Check bypass
    if (bypassNotes.has(origNoteRound % 12)) {
      outputChunks.push({ pos, data: grain, shift: 0 });
      pitchData.push({ time, origFreq: freq, origNote, corrNote: origNoteRound, corrFreq: freq, cents });
      continue;
    }

    // Check vibrato threshold
    if (preserveVibrato && Math.abs(cents) < vibratoThreshold) {
      outputChunks.push({ pos, data: grain, shift: 0 });
      pitchData.push({ time, origFreq: freq, origNote, corrNote: origNoteRound, corrFreq: freq, cents });
      continue;
    }

    // Calculate required pitch shift in semitones
    const targetShift = corrNote - origNote;

    // Apply correction speed (0 = full correction, 1 = no correction)
    const speedFactor = correctionSpeed;
    let appliedShift = targetShift * (1.0 - speedFactor);

    // Add humanize (random variation)
    if (humanize > 0) {
      appliedShift += (Math.random() - 0.5) * humanize * 0.4; // max ±0.2 semitones
    }

    // Smooth the shift to avoid abrupt jumps
    appliedShift = prevCorrectedShift + (appliedShift - prevCorrectedShift) * 0.6;
    prevCorrectedShift = appliedShift;

    if (Math.abs(appliedShift) < 0.01) {
      outputChunks.push({ pos, data: grain, shift: 0 });
    } else {
      // Pitch-shift this grain using phase vocoder
      const ratio = Math.pow(2, appliedShift / 12);
      const shifted = pitchShift(grain, ratio, sampleRate, fftSize, hopSize);
      outputChunks.push({ pos, data: shifted, shift: appliedShift });
    }

    const finalFreq = freq * Math.pow(2, appliedShift / 12);
    pitchData.push({
      time,
      origFreq: freq,
      origNote,
      corrNote,
      corrFreq: finalFreq,
      cents,
      shift: appliedShift,
    });
  }

  // Overlap-add the output grains
  const output = new Float32Array(audioData.length);
  const windowSum = new Float32Array(audioData.length);
  const window = createHannWindow(grainSize);

  for (const chunk of outputChunks) {
    const data = chunk.data;
    for (let i = 0; i < data.length && (chunk.pos + i) < output.length; i++) {
      output[chunk.pos + i] += data[i] * window[i];
      windowSum[chunk.pos + i] += window[i] * window[i];
    }
  }

  // Normalize
  for (let i = 0; i < output.length; i++) {
    if (windowSum[i] > 1e-6) output[i] /= windowSum[i];
    else output[i] = audioData[i]; // fill gaps with original
  }

  return { correctedAudio: output, pitchData };
};


// ── Scale snap helper ──
const snapToScale = (noteNum, rootNote, scaleArr) => {
  const n = Math.round(noteNum);
  const pc = ((n % 12) - rootNote + 12) % 12;
  if (scaleArr[pc]) return n;
  for (let d = 1; d <= 6; d++) {
    if (scaleArr[((pc + d) % 12)]) return n + d;
    if (scaleArr[((pc - d + 12) % 12)]) return n - d;
  }
  return n;
};


// =============================================================================
// HARMONY: Generate pitched harmony voice from audio
// =============================================================================

/**
 * Generate a harmony voice at a given interval
 *
 * @param {Float32Array} audioData - mono vocal
 * @param {number} sampleRate
 * @param {number} interval - semitones to shift (positive = up, negative = down)
 * @param {Object} options
 * @returns {Float32Array} - harmony voice audio
 */
export const generateHarmonyVoice = (audioData, sampleRate, interval, options = {}) => {
  const {
    detuneCents = 5,   // random detune for natural feel
    delayMs = 10,      // slight timing offset
    volume = 0.8,
    fftSize = 2048,
    hopSize = 512,
  } = options;

  // Pitch-shift the entire buffer
  const ratio = Math.pow(2, interval / 12);
  const shifted = pitchShift(audioData, ratio, sampleRate, fftSize, hopSize);

  // Apply slight detune
  if (detuneCents > 0) {
    const detuneRatio = Math.pow(2, ((Math.random() - 0.5) * detuneCents * 2) / 1200);
    // Apply as very subtle secondary shift — just resample
    const detuned = resample(shifted, Math.round(shifted.length / detuneRatio));
    // Trim/pad to original length
    const result = new Float32Array(audioData.length);
    const copyLen = Math.min(detuned.length, result.length);
    for (let i = 0; i < copyLen; i++) result[i] = detuned[i] * volume;
    return result;
  }

  // Apply volume
  const result = new Float32Array(audioData.length);
  const copyLen = Math.min(shifted.length, result.length);
  for (let i = 0; i < copyLen; i++) result[i] = shifted[i] * volume;

  // Apply delay offset
  if (delayMs > 0) {
    const delaySamples = Math.round((delayMs / 1000) * sampleRate);
    const delayed = new Float32Array(audioData.length);
    for (let i = delaySamples; i < delayed.length; i++) {
      delayed[i] = result[i - delaySamples];
    }
    return delayed;
  }

  return result;
};


// =============================================================================
// SCALE-AWARE HARMONY: Shift by scale degrees instead of fixed semitones
// =============================================================================

/**
 * Generate a harmony that follows the scale (e.g., "a third above" means
 * different semitone shifts for different notes in the scale)
 *
 * @param {Float32Array} audioData
 * @param {number} sampleRate
 * @param {number} scaleDegreeShift - shift by this many scale degrees (e.g., 2 = third)
 * @param {number} rootNote - 0-11
 * @param {number[]} scaleDegrees - scale intervals [0,2,4,5,7,9,11] for major
 * @param {Object} options
 * @returns {Float32Array}
 */
export const generateScaleHarmony = (audioData, sampleRate, scaleDegreeShift, rootNote, scaleDegrees, options = {}) => {
  const {
    detuneCents = 5,
    delayMs = 10,
    volume = 0.8,
    fftSize = 2048,
    hopSize = 512,
  } = options;

  // For scale-aware harmony, we need to pitch-shift different sections differently
  // based on the detected pitch. Process in overlapping grains.
  const grainSize = fftSize * 4;
  const grainHop = fftSize;
  const output = new Float32Array(audioData.length);
  const windowSum = new Float32Array(audioData.length);
  const window = createHannWindow(grainSize);

  for (let pos = 0; pos + grainSize <= audioData.length; pos += grainHop) {
    const grain = audioData.slice(pos, pos + grainSize);

    // Detect pitch
    const freq = detectPitch(grain, sampleRate);

    let shiftSemitones;
    if (freq <= 0) {
      // No pitch detected — use a default shift
      shiftSemitones = getDefaultShift(scaleDegreeShift, scaleDegrees);
    } else {
      // Find the current note and compute scale-aware shift
      const noteNum = 12 * Math.log2(freq / 440) + 69;
      shiftSemitones = getScaleAwareShift(noteNum, scaleDegreeShift, rootNote, scaleDegrees);
    }

    // Pitch shift this grain
    const ratio = Math.pow(2, shiftSemitones / 12);
    let shifted;
    if (Math.abs(ratio - 1.0) < 0.001) {
      shifted = grain;
    } else {
      shifted = pitchShift(grain, ratio, sampleRate, fftSize, hopSize);
    }

    // Overlap-add
    for (let i = 0; i < grainSize && (pos + i) < output.length; i++) {
      const idx = pos + i;
      if (i < shifted.length) {
        output[idx] += shifted[i] * window[i] * volume;
      }
      windowSum[idx] += window[i] * window[i];
    }
  }

  // Normalize
  for (let i = 0; i < output.length; i++) {
    if (windowSum[i] > 1e-6) output[i] /= windowSum[i];
  }

  // Apply delay
  if (delayMs > 0) {
    const delaySamples = Math.round((delayMs / 1000) * sampleRate);
    const delayed = new Float32Array(audioData.length);
    for (let i = delaySamples; i < delayed.length; i++) {
      delayed[i] = output[i - delaySamples];
    }
    return delayed;
  }

  return output;
};

// Helper: compute scale-aware interval in semitones
const getScaleAwareShift = (noteNum, degreeShift, rootNote, scaleDegrees) => {
  const pc = ((Math.round(noteNum) % 12) - rootNote + 12) % 12;

  // Find nearest scale degree
  let currentDegree = 0;
  let minDist = 12;
  for (let i = 0; i < scaleDegrees.length; i++) {
    const dist = Math.abs(scaleDegrees[i] - pc);
    if (dist < minDist) { minDist = dist; currentDegree = i; }
  }

  // Target degree
  const targetDegree = currentDegree + degreeShift;
  const octaveShift = Math.floor(targetDegree / scaleDegrees.length);
  const degInScale = ((targetDegree % scaleDegrees.length) + scaleDegrees.length) % scaleDegrees.length;
  const targetPc = scaleDegrees[degInScale];

  return (targetPc - pc) + octaveShift * 12;
};

// Helper: default shift when no pitch detected
const getDefaultShift = (degreeShift, scaleDegrees) => {
  if (degreeShift >= 0 && degreeShift < scaleDegrees.length) {
    return scaleDegrees[degreeShift];
  }
  return degreeShift; // fallback to direct semitone
};


// =============================================================================
// TIME ALIGNMENT: Stretch segments between onsets to align timing
// =============================================================================

/**
 * Align onset timing by time-stretching segments between detected onsets.
 * Uses the phase vocoder for artifact-free stretching.
 *
 * @param {Float32Array} audioData
 * @param {number} sampleRate
 * @param {Array} alignments - [{ originalTime, targetTime }] in seconds
 * @returns {Float32Array}
 */
export const alignTiming = (audioData, sampleRate, alignments) => {
  if (!alignments || alignments.length === 0) return new Float32Array(audioData);

  const output = new Float32Array(audioData.length);
  const sorted = [...alignments].sort((a, b) => a.originalTime - b.originalTime);

  // Add boundaries
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

    // Extract segment
    const segment = audioData.slice(srcStart, srcEnd);

    let processed;
    const stretchRatio = dstLen / srcLen;

    if (Math.abs(stretchRatio - 1.0) < 0.02) {
      // Nearly 1:1 — just copy
      processed = segment;
    } else if (srcLen > 4096) {
      // Long enough for phase vocoder
      processed = timeStretch(segment, stretchRatio, sampleRate, 2048, 512);
    } else {
      // Too short for FFT — use simple resampling
      processed = resample(segment, dstLen);
    }

    // Write to output with crossfade at boundaries
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
// Default export: all functions
// =============================================================================
export default {
  pitchShift,
  pitchShiftSemitones,
  timeStretch,
  resample,
  detectPitch,
  correctPitch,
  generateHarmonyVoice,
  generateScaleHarmony,
  alignTiming,
  analyzeSTFT,
  resynthesizeSTFT,
};