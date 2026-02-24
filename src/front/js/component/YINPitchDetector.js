// =============================================================================
// YINPitchDetector.js v2 — Enhanced Pitch & Voice Analysis Engine
// =============================================================================
// Location: src/front/js/component/YINPitchDetector.js
// Features:
//   - YIN monophonic pitch detection (optimized, lower latency)
//   - Polyphonic pitch detection via harmonic product spectrum
//   - Vibrato analysis (depth, rate, center pitch)
//   - Spectral centroid (voice brightness)
//   - Formant analysis (vowel detection via LPC-style peak picking)
//   - RMS amplitude tracking
//   - Zero-crossing rate
//   - Onset detection (transient trigger)
// =============================================================================

// ── YIN Constants ──
const YIN_THRESHOLD = 0.15;
const YIN_PROB_THRESHOLD = 0.3;

// ── Note helpers ──
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
export function freqToMidi(freq) { return 69 + 12 * Math.log2(freq / 440); }
export function midiToNoteName(midi) {
  const note = Math.round(midi);
  return `${NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`;
}
export function freqToNoteName(freq) { return midiToNoteName(freqToMidi(freq)); }

// =============================================================================
// 1. YIN Monophonic Pitch Detector (Optimized)
// =============================================================================

export class YINDetector {
  constructor(sampleRate = 48000, bufferSize = 2048) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;
    this.halfBuffer = Math.floor(bufferSize / 2);
    this.yinBuffer = new Float32Array(this.halfBuffer);
    this.probability = 0;
    this.lastFreq = 0;
    this.lastConfidence = 0;
  }

  /**
   * Detect pitch from time-domain float32 audio buffer.
   * Returns { freq, midi, confidence, noteName } or null if no pitch.
   */
  detect(audioBuffer) {
    const buf = audioBuffer;
    const len = this.halfBuffer;
    const yin = this.yinBuffer;

    // Step 1: Difference function
    let running = 0;
    yin[0] = 1;
    for (let tau = 1; tau < len; tau++) {
      let sum = 0;
      for (let i = 0; i < len; i++) {
        const d = buf[i] - buf[i + tau];
        sum += d * d;
      }
      yin[tau] = sum;
      running += sum;
      // Step 2: Cumulative mean normalized difference
      yin[tau] = running === 0 ? 1 : yin[tau] * tau / running;
    }

    // Step 3: Absolute threshold
    let tauEstimate = -1;
    for (let tau = 2; tau < len; tau++) {
      if (yin[tau] < YIN_THRESHOLD) {
        while (tau + 1 < len && yin[tau + 1] < yin[tau]) tau++;
        tauEstimate = tau;
        this.probability = 1 - yin[tau];
        break;
      }
    }

    if (tauEstimate === -1 || this.probability < YIN_PROB_THRESHOLD) {
      this.lastConfidence = 0;
      return null;
    }

    // Step 4: Parabolic interpolation for sub-sample accuracy
    let betterTau = tauEstimate;
    if (tauEstimate > 0 && tauEstimate < len - 1) {
      const s0 = yin[tauEstimate - 1];
      const s1 = yin[tauEstimate];
      const s2 = yin[tauEstimate + 1];
      const denom = 2 * s1 - s2 - s0;
      if (denom !== 0) {
        betterTau = tauEstimate + (s0 - s2) / (2 * denom);
      }
    }

    const freq = this.sampleRate / betterTau;

    // Sanity check: human voice range 60Hz - 2000Hz
    if (freq < 60 || freq > 2000) {
      this.lastConfidence = 0;
      return null;
    }

    const midi = freqToMidi(freq);
    this.lastFreq = freq;
    this.lastConfidence = this.probability;

    return {
      freq,
      midi,
      midiRounded: Math.round(midi),
      confidence: this.probability,
      noteName: midiToNoteName(midi),
      cents: Math.round((midi - Math.round(midi)) * 100),
    };
  }
}

// =============================================================================
// 2. Polyphonic Pitch Detector (Harmonic Product Spectrum)
// =============================================================================

export class PolyphonicDetector {
  constructor(sampleRate = 48000, fftSize = 4096) {
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this.maxHarmonics = 5;
    this.minFreq = 60;
    this.maxFreq = 2000;
    this.peakThreshold = 0.15; // relative to max
    this.maxPitches = 4;
  }

  /**
   * Detect multiple pitches from frequency-domain data.
   * @param {Float32Array} magnitudes - FFT magnitude spectrum
   * Returns array of { freq, midi, noteName, amplitude }
   */
  detect(magnitudes) {
    const binCount = magnitudes.length;
    const freqResolution = this.sampleRate / (binCount * 2);
    const minBin = Math.floor(this.minFreq / freqResolution);
    const maxBin = Math.min(binCount - 1, Math.ceil(this.maxFreq / freqResolution));

    // Harmonic Product Spectrum
    const hps = new Float32Array(binCount);
    for (let i = minBin; i <= maxBin; i++) {
      let product = magnitudes[i];
      for (let h = 2; h <= this.maxHarmonics; h++) {
        const hBin = i * h;
        if (hBin < binCount) {
          product *= magnitudes[hBin] + 0.001; // avoid zero
        }
      }
      hps[i] = product;
    }

    // Find peaks
    const peaks = [];
    const maxVal = Math.max(...hps.slice(minBin, maxBin + 1));
    if (maxVal <= 0) return [];

    for (let i = minBin + 1; i < maxBin; i++) {
      if (hps[i] > hps[i - 1] && hps[i] > hps[i + 1] && hps[i] > maxVal * this.peakThreshold) {
        // Parabolic interpolation
        const alpha = hps[i - 1];
        const beta = hps[i];
        const gamma = hps[i + 1];
        const denom = 2 * beta - alpha - gamma;
        const p = denom !== 0 ? 0.5 * (alpha - gamma) / denom : 0;
        const interpBin = i + p;
        const freq = interpBin * freqResolution;

        if (freq >= this.minFreq && freq <= this.maxFreq) {
          peaks.push({
            freq,
            midi: freqToMidi(freq),
            midiRounded: Math.round(freqToMidi(freq)),
            noteName: freqToNoteName(freq),
            amplitude: hps[i] / maxVal,
          });
        }
      }
    }

    // Sort by amplitude, take top N, filter harmonics
    peaks.sort((a, b) => b.amplitude - a.amplitude);
    const filtered = [];
    for (const peak of peaks) {
      if (filtered.length >= this.maxPitches) break;
      // Skip if this is a harmonic of an existing detected pitch
      const isHarmonic = filtered.some(existing => {
        const ratio = peak.freq / existing.freq;
        for (let h = 2; h <= 4; h++) {
          if (Math.abs(ratio - h) < 0.08) return true;
        }
        return false;
      });
      if (!isHarmonic) filtered.push(peak);
    }

    return filtered;
  }
}

// =============================================================================
// 3. Vibrato Analyzer
// =============================================================================

export class VibratoAnalyzer {
  constructor(historySize = 60) {
    this.history = []; // { freq, time }
    this.historySize = historySize;
    this.minVibratoRate = 3;  // Hz (typical vibrato 4-7 Hz)
    this.maxVibratoRate = 10;
    this.minDepthCents = 15;  // minimum cents deviation to count as vibrato
  }

  push(freq, time) {
    this.history.push({ freq, time });
    if (this.history.length > this.historySize) this.history.shift();
  }

  /**
   * Analyze recent pitch history for vibrato.
   * Returns { detected, rate, depthCents, centerFreq } or null
   */
  analyze() {
    if (this.history.length < 20) return null;

    const freqs = this.history.map(h => h.freq);
    const times = this.history.map(h => h.time);

    // Center frequency (median)
    const sorted = [...freqs].sort((a, b) => a - b);
    const centerFreq = sorted[Math.floor(sorted.length / 2)];

    if (centerFreq <= 0) return null;

    // Convert to cents deviation from center
    const cents = freqs.map(f => 1200 * Math.log2(f / centerFreq));

    // Find zero crossings to estimate rate
    let crossings = 0;
    for (let i = 1; i < cents.length; i++) {
      if ((cents[i - 1] >= 0 && cents[i] < 0) || (cents[i - 1] < 0 && cents[i] >= 0)) {
        crossings++;
      }
    }

    const duration = times[times.length - 1] - times[0];
    if (duration <= 0) return null;

    const rate = (crossings / 2) / duration; // full cycles per second

    // Depth: max deviation in cents
    const maxCents = Math.max(...cents.map(Math.abs));

    const detected = rate >= this.minVibratoRate &&
                     rate <= this.maxVibratoRate &&
                     maxCents >= this.minDepthCents;

    return {
      detected,
      rate: Math.round(rate * 10) / 10,
      depthCents: Math.round(maxCents),
      centerFreq: Math.round(centerFreq * 10) / 10,
      centerMidi: freqToMidi(centerFreq),
      // Pitch bend value: -8192 to 8191 (14-bit), ±2 semitones default
      pitchBend: detected ? Math.round((cents[cents.length - 1] / 200) * 8192) : 0,
    };
  }

  clear() { this.history = []; }
}

// =============================================================================
// 4. Spectral Analyzer (Centroid, Brightness, Formants)
// =============================================================================

export class SpectralAnalyzer {
  constructor(sampleRate = 48000, fftSize = 2048) {
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this.freqResolution = sampleRate / fftSize;
  }

  /**
   * Compute spectral centroid (brightness) from magnitude spectrum.
   * Returns frequency in Hz — higher = brighter voice.
   */
  centroid(magnitudes) {
    let weightedSum = 0;
    let totalMag = 0;
    for (let i = 1; i < magnitudes.length; i++) {
      const freq = i * this.freqResolution;
      const mag = magnitudes[i];
      weightedSum += freq * mag;
      totalMag += mag;
    }
    return totalMag > 0 ? weightedSum / totalMag : 0;
  }

  /**
   * Compute spectral flatness (0 = tonal, 1 = noisy).
   */
  flatness(magnitudes) {
    const len = magnitudes.length;
    let logSum = 0;
    let linSum = 0;
    let count = 0;
    for (let i = 1; i < len; i++) {
      const m = magnitudes[i] + 1e-10;
      logSum += Math.log(m);
      linSum += m;
      count++;
    }
    if (count === 0 || linSum === 0) return 0;
    const geoMean = Math.exp(logSum / count);
    const ariMean = linSum / count;
    return geoMean / ariMean;
  }

  /**
   * Detect formant peaks (vowel detection).
   * Finds spectral peaks in formant frequency ranges.
   * Returns { f1, f2, f3, vowel }
   *
   * Vowel mapping (approximate):
   *   /a/ (father): F1~800, F2~1200
   *   /e/ (bet):    F1~600, F2~1800
   *   /i/ (beat):   F1~300, F2~2300
   *   /o/ (boat):   F1~500, F2~900
   *   /u/ (boot):   F1~350, F2~800
   */
  detectFormants(magnitudes) {
    const peaks = this._findSpectralPeaks(magnitudes, 200, 4000, 5);

    if (peaks.length < 2) return { f1: 0, f2: 0, f3: 0, vowel: null, confidence: 0 };

    const f1 = peaks[0]?.freq || 0;
    const f2 = peaks[1]?.freq || 0;
    const f3 = peaks[2]?.freq || 0;

    // Vowel classification by F1/F2
    const vowel = this._classifyVowel(f1, f2);

    return { f1: Math.round(f1), f2: Math.round(f2), f3: Math.round(f3), vowel, confidence: peaks[0]?.amplitude || 0 };
  }

  _classifyVowel(f1, f2) {
    if (f1 === 0 || f2 === 0) return null;

    // Distance-based vowel classification
    const vowels = [
      { vowel: 'a', f1: 800, f2: 1200 },  // father
      { vowel: 'e', f1: 600, f2: 1800 },  // bet
      { vowel: 'i', f1: 300, f2: 2300 },  // beat
      { vowel: 'o', f1: 500, f2: 900 },   // boat
      { vowel: 'u', f1: 350, f2: 800 },   // boot
    ];

    let best = null;
    let bestDist = Infinity;
    for (const v of vowels) {
      const d = Math.sqrt(Math.pow((f1 - v.f1) / 300, 2) + Math.pow((f2 - v.f2) / 500, 2));
      if (d < bestDist) { bestDist = d; best = v.vowel; }
    }

    return bestDist < 2 ? best : null;
  }

  _findSpectralPeaks(magnitudes, minFreq, maxFreq, maxPeaks) {
    const minBin = Math.floor(minFreq / this.freqResolution);
    const maxBin = Math.min(magnitudes.length - 1, Math.ceil(maxFreq / this.freqResolution));

    // Smooth spectrum to find formant envelope
    const smoothed = new Float32Array(magnitudes.length);
    const window = 5;
    for (let i = minBin; i <= maxBin; i++) {
      let sum = 0, count = 0;
      for (let j = -window; j <= window; j++) {
        const idx = i + j;
        if (idx >= 0 && idx < magnitudes.length) { sum += magnitudes[idx]; count++; }
      }
      smoothed[i] = sum / count;
    }

    // Find peaks in smoothed spectrum
    const peaks = [];
    for (let i = minBin + 1; i < maxBin; i++) {
      if (smoothed[i] > smoothed[i - 1] && smoothed[i] > smoothed[i + 1]) {
        peaks.push({ freq: i * this.freqResolution, amplitude: smoothed[i], bin: i });
      }
    }

    peaks.sort((a, b) => b.amplitude - a.amplitude);
    // Return top peaks sorted by frequency (formant order)
    return peaks.slice(0, maxPeaks).sort((a, b) => a.freq - b.freq);
  }
}

// =============================================================================
// 5. RMS & Dynamics Analyzer
// =============================================================================

export class DynamicsAnalyzer {
  constructor() {
    this.rmsHistory = [];
    this.historySize = 30;
    this.prevRms = 0;
    this.onsetThreshold = 0.08;
    this.onsetCooldown = 0;
    this.cooldownFrames = 5;
  }

  /**
   * Compute RMS amplitude from time-domain buffer.
   */
  rms(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
    return Math.sqrt(sum / buffer.length);
  }

  /**
   * Compute zero-crossing rate.
   */
  zeroCrossingRate(buffer) {
    let crossings = 0;
    for (let i = 1; i < buffer.length; i++) {
      if ((buffer[i - 1] >= 0 && buffer[i] < 0) || (buffer[i - 1] < 0 && buffer[i] >= 0)) {
        crossings++;
      }
    }
    return crossings / buffer.length;
  }

  /**
   * Detect onset (transient / new sound).
   */
  detectOnset(rmsValue) {
    if (this.onsetCooldown > 0) {
      this.onsetCooldown--;
      this.prevRms = rmsValue;
      return false;
    }

    const delta = rmsValue - this.prevRms;
    this.prevRms = rmsValue;

    if (delta > this.onsetThreshold) {
      this.onsetCooldown = this.cooldownFrames;
      return true;
    }
    return false;
  }

  /**
   * Track dynamics over time — returns { rms, peak, dynamics }
   * dynamics: 0-1 range representing current loudness relative to recent max
   */
  track(buffer) {
    const rmsVal = this.rms(buffer);
    this.rmsHistory.push(rmsVal);
    if (this.rmsHistory.length > this.historySize) this.rmsHistory.shift();

    const peak = Math.max(...this.rmsHistory);
    const dynamics = peak > 0 ? rmsVal / peak : 0;

    return {
      rms: rmsVal,
      rmsDb: rmsVal > 0 ? 20 * Math.log10(rmsVal) : -100,
      peak,
      dynamics, // 0-1
      onset: this.detectOnset(rmsVal),
    };
  }
}

// =============================================================================
// 6. Spectral Fingerprint (for trigger training)
// =============================================================================

export class SpectralFingerprint {
  constructor(bandCount = 24) {
    this.bandCount = bandCount;
  }

  /**
   * Create a fingerprint from frequency magnitudes.
   * Divides spectrum into bands and captures energy distribution.
   */
  create(magnitudes, sampleRate = 48000) {
    const fftSize = magnitudes.length * 2;
    const freqRes = sampleRate / fftSize;
    const bands = new Float32Array(this.bandCount);

    // Mel-scale-ish band edges (log spacing from 80Hz to 8000Hz)
    const minFreq = 80;
    const maxFreq = 8000;
    const edges = [];
    for (let i = 0; i <= this.bandCount; i++) {
      edges.push(minFreq * Math.pow(maxFreq / minFreq, i / this.bandCount));
    }

    for (let b = 0; b < this.bandCount; b++) {
      const lo = Math.floor(edges[b] / freqRes);
      const hi = Math.min(magnitudes.length - 1, Math.ceil(edges[b + 1] / freqRes));
      let sum = 0, count = 0;
      for (let i = lo; i <= hi; i++) {
        sum += magnitudes[i];
        count++;
      }
      bands[b] = count > 0 ? sum / count : 0;
    }

    // Normalize
    const max = Math.max(...bands);
    if (max > 0) for (let i = 0; i < bands.length; i++) bands[i] /= max;

    return bands;
  }

  /**
   * Compare two fingerprints. Returns 0-1 similarity (1 = identical).
   */
  compare(fp1, fp2) {
    if (!fp1 || !fp2 || fp1.length !== fp2.length) return 0;
    let dot = 0, mag1 = 0, mag2 = 0;
    for (let i = 0; i < fp1.length; i++) {
      dot += fp1[i] * fp2[i];
      mag1 += fp1[i] * fp1[i];
      mag2 += fp2[i] * fp2[i];
    }
    const denom = Math.sqrt(mag1) * Math.sqrt(mag2);
    return denom > 0 ? dot / denom : 0;
  }
}

// =============================================================================
// Default export: all analyzers bundled
// =============================================================================

export default {
  YINDetector,
  PolyphonicDetector,
  VibratoAnalyzer,
  SpectralAnalyzer,
  DynamicsAnalyzer,
  SpectralFingerprint,
  midiToFreq,
  freqToMidi,
  midiToNoteName,
  freqToNoteName,
};