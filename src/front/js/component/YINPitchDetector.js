// =============================================================================
// YINPitchDetector.js — Real-Time Monophonic Pitch Detection (YIN Algorithm)
// =============================================================================
// Location: src/front/js/audio/dsp/YINPitchDetector.js
//
// The YIN algorithm (de Cheveigné & Kawahara, 2002) is the gold standard
// for monophonic pitch detection. It uses autocorrelation with a cumulative
// mean normalized difference function to find the fundamental frequency.
//
// Features:
//   - Real-time pitch detection from AudioContext analyser
//   - Configurable threshold (0.05–0.5, lower = stricter)
//   - Parabolic interpolation for sub-sample accuracy
//   - Note name + octave + cents deviation output
//   - Confidence score (0–1)
//   - Optional scale quantization (snap to nearest scale degree)
//   - Lightweight — runs in requestAnimationFrame loop
// =============================================================================

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Scale definitions (semitone intervals from root)
const SCALES = {
  chromatic:    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major:        [0, 2, 4, 5, 7, 9, 11],
  minor:        [0, 2, 3, 5, 7, 8, 10],
  dorian:       [0, 2, 3, 5, 7, 9, 10],
  mixolydian:   [0, 2, 4, 5, 7, 9, 10],
  pentatonic:   [0, 2, 4, 7, 9],
  minorPent:    [0, 3, 5, 7, 10],
  blues:        [0, 3, 5, 6, 7, 10],
  harmonicMin:  [0, 2, 3, 5, 7, 8, 11],
  melodicMin:   [0, 2, 3, 5, 7, 9, 11],
  wholeNote:    [0, 2, 4, 6, 8, 10],
  phrygian:     [0, 1, 3, 5, 7, 8, 10],
  lydian:       [0, 2, 4, 6, 7, 9, 11],
  locrian:      [0, 1, 3, 5, 6, 8, 10],
};

// Root note name → semitone offset
const ROOT_MAP = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

/**
 * Core YIN pitch detection on a Float32Array of audio samples.
 *
 * @param {Float32Array} buffer - Audio sample buffer
 * @param {number} sampleRate - Sample rate in Hz
 * @param {number} threshold - YIN threshold (0.05–0.5, default 0.15)
 * @returns {{ frequency: number, confidence: number } | null}
 */
export function yinDetect(buffer, sampleRate, threshold = 0.15) {
  const halfLen = Math.floor(buffer.length / 2);
  if (halfLen < 2) return null;

  // Step 1: Difference function d(τ)
  const diff = new Float32Array(halfLen);
  for (let tau = 0; tau < halfLen; tau++) {
    let sum = 0;
    for (let i = 0; i < halfLen; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  // Step 2: Cumulative mean normalized difference d'(τ)
  const cmndf = new Float32Array(halfLen);
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfLen; tau++) {
    runningSum += diff[tau];
    cmndf[tau] = diff[tau] / (runningSum / tau);
  }

  // Step 3: Absolute threshold — find first dip below threshold
  // Search range: ~50Hz to ~1500Hz (human vocal range + instruments)
  const minTau = Math.max(2, Math.floor(sampleRate / 1500));
  const maxTau = Math.min(halfLen - 1, Math.floor(sampleRate / 50));

  let bestTau = -1;
  for (let tau = minTau; tau < maxTau; tau++) {
    if (cmndf[tau] < threshold) {
      // Walk forward to find the actual minimum in this dip
      while (tau + 1 < maxTau && cmndf[tau + 1] < cmndf[tau]) {
        tau++;
      }
      bestTau = tau;
      break;
    }
  }

  // If no dip found below threshold, find global minimum as fallback
  if (bestTau < 0) {
    let minVal = Infinity;
    for (let tau = minTau; tau < maxTau; tau++) {
      if (cmndf[tau] < minVal) {
        minVal = cmndf[tau];
        bestTau = tau;
      }
    }
    // If global min is still too high, no pitch detected
    if (minVal > 0.5) return null;
  }

  // Step 4: Parabolic interpolation for sub-sample accuracy
  let betterTau = bestTau;
  if (bestTau > 0 && bestTau < halfLen - 1) {
    const s0 = cmndf[bestTau - 1];
    const s1 = cmndf[bestTau];
    const s2 = cmndf[bestTau + 1];
    const denom = 2 * s1 - s2 - s0;
    if (denom !== 0) {
      betterTau = bestTau + (s0 - s2) / (2 * denom);
    }
  }

  const frequency = sampleRate / betterTau;

  // Confidence: 1 - cmndf value at the detected period
  const confidence = 1 - (cmndf[bestTau] || 0);

  // Sanity check frequency range (20Hz – 5000Hz)
  if (frequency < 20 || frequency > 5000 || isNaN(frequency)) return null;

  return { frequency, confidence: Math.max(0, Math.min(1, confidence)) };
}

/**
 * Convert frequency to MIDI note number (float, for cents deviation).
 */
export function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

/**
 * Convert MIDI note number to frequency.
 */
export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Convert frequency to note name, octave, MIDI note, and cents deviation.
 */
export function freqToNote(freq) {
  if (!freq || freq <= 0) return null;

  const midiFloat = freqToMidi(freq);
  const midiRounded = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midiRounded) * 100);
  const noteIndex = ((midiRounded % 12) + 12) % 12;
  const octave = Math.floor(midiRounded / 12) - 1;

  return {
    note: NOTE_NAMES[noteIndex],
    octave,
    midi: midiRounded,
    cents,
    frequency: freq,
    noteName: `${NOTE_NAMES[noteIndex]}${octave}`,
  };
}

/**
 * Quantize a MIDI note to the nearest note in a given scale.
 *
 * @param {number} midiNote - MIDI note number (can be float)
 * @param {string} rootNote - Root note name (e.g. "C", "D#")
 * @param {string} scaleName - Scale name from SCALES
 * @returns {number} Quantized MIDI note number
 */
export function quantizeToScale(midiNote, rootNote = 'C', scaleName = 'chromatic') {
  const scale = SCALES[scaleName] || SCALES.chromatic;
  const rootOffset = ROOT_MAP[rootNote] || 0;

  const rounded = Math.round(midiNote);
  const noteInOctave = ((rounded % 12) - rootOffset + 12) % 12;
  const octaveBase = rounded - noteInOctave;

  // Find nearest scale degree
  let minDist = Infinity;
  let bestDegree = 0;
  for (const degree of scale) {
    const dist = Math.abs(noteInOctave - degree);
    const wrapDist = Math.min(dist, 12 - dist);
    if (wrapDist < minDist) {
      minDist = wrapDist;
      bestDegree = degree;
    }
  }

  // Handle wrapping (if quantized degree wraps to next/prev octave)
  let quantized = octaveBase + rootOffset + bestDegree;
  // Keep it closest to original
  if (Math.abs(quantized - rounded) > 6) {
    quantized += (quantized > rounded) ? -12 : 12;
  }

  return quantized;
}

/**
 * Suggest a key based on detected pitch histogram.
 * @param {number[]} midiNotes - Array of detected MIDI note numbers
 * @returns {{ key: string, scale: string, confidence: number }}
 */
export function suggestKey(midiNotes) {
  if (!midiNotes.length) return { key: 'C', scale: 'major', confidence: 0 };

  // Build pitch class histogram
  const histogram = new Float32Array(12);
  midiNotes.forEach(n => {
    const pc = ((Math.round(n) % 12) + 12) % 12;
    histogram[pc]++;
  });

  // Krumhansl-Kessler profiles
  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  let bestCorr = -Infinity;
  let bestKey = 0;
  let bestScale = 'major';

  for (let root = 0; root < 12; root++) {
    // Rotate histogram
    const rotated = new Float32Array(12);
    for (let i = 0; i < 12; i++) rotated[i] = histogram[(i + root) % 12];

    // Correlate with major
    const majCorr = pearsonCorrelation(rotated, majorProfile);
    if (majCorr > bestCorr) { bestCorr = majCorr; bestKey = root; bestScale = 'major'; }

    // Correlate with minor
    const minCorr = pearsonCorrelation(rotated, minorProfile);
    if (minCorr > bestCorr) { bestCorr = minCorr; bestKey = root; bestScale = 'minor'; }
  }

  return {
    key: NOTE_NAMES[bestKey],
    scale: bestScale,
    confidence: Math.max(0, Math.min(1, (bestCorr + 1) / 2)),
  };
}

function pearsonCorrelation(a, b) {
  const n = a.length;
  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i]; sumB += b[i];
    sumAB += a[i] * b[i];
    sumA2 += a[i] * a[i];
    sumB2 += b[i] * b[i];
  }
  const num = n * sumAB - sumA * sumB;
  const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
  return den === 0 ? 0 : num / den;
}

// =============================================================================
// YINPitchDetector Class — Wraps YIN for real-time use with AudioContext
// =============================================================================
export class YINPitchDetector {
  /**
   * @param {AudioContext} audioContext
   * @param {object} options
   * @param {number} options.bufferSize - FFT/analysis buffer size (default 2048)
   * @param {number} options.threshold - YIN threshold (default 0.15)
   * @param {number} options.minConfidence - Minimum confidence to report (default 0.7)
   * @param {string} options.rootNote - Scale root (default 'C')
   * @param {string} options.scale - Scale name (default 'chromatic')
   * @param {number} options.stickyMs - Note hold time in ms (default 80)
   */
  constructor(audioContext, options = {}) {
    this.ctx = audioContext;
    this.bufferSize = options.bufferSize || 2048;
    this.threshold = options.threshold || 0.15;
    this.minConfidence = options.minConfidence || 0.7;
    this.rootNote = options.rootNote || 'C';
    this.scale = options.scale || 'chromatic';
    this.stickyMs = options.stickyMs || 80; // "stickiness" like Dubler

    this.analyser = null;
    this.dataBuffer = null;
    this.isRunning = false;
    this.rafId = null;

    // State
    this.currentNote = null;
    this.currentFreq = 0;
    this.currentConfidence = 0;
    this.lastNoteTime = 0;
    this.noteHistory = [];     // for key suggestion
    this.onPitch = null;       // callback: ({ note, octave, midi, cents, frequency, confidence, quantizedMidi }) => void
    this.onNoteOn = null;      // callback: (midi, velocity) => void
    this.onNoteOff = null;     // callback: (midi) => void

    this._lastMidi = -1;
  }

  /**
   * Connect to an audio source node.
   */
  connectSource(sourceNode) {
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = this.bufferSize * 2;
    this.dataBuffer = new Float32Array(this.bufferSize);
    sourceNode.connect(this.analyser);
  }

  /**
   * Start pitch detection loop.
   */
  start() {
    if (!this.analyser) throw new Error('Call connectSource() first');
    this.isRunning = true;
    this._detect();
  }

  /**
   * Stop pitch detection loop.
   */
  stop() {
    this.isRunning = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    // Send noteOff for any held note
    if (this._lastMidi >= 0 && this.onNoteOff) {
      this.onNoteOff(this._lastMidi);
      this._lastMidi = -1;
    }
  }

  /**
   * Update settings on the fly.
   */
  setScale(rootNote, scaleName) {
    this.rootNote = rootNote;
    this.scale = scaleName;
  }

  setThreshold(t) { this.threshold = t; }
  setStickiness(ms) { this.stickyMs = ms; }
  setMinConfidence(c) { this.minConfidence = c; }

  /**
   * Get suggested key from detected note history.
   */
  getSuggestedKey() {
    return suggestKey(this.noteHistory);
  }

  /**
   * Clear note history.
   */
  clearHistory() {
    this.noteHistory = [];
  }

  // ── Internal detection loop ──
  _detect() {
    if (!this.isRunning) return;

    this.analyser.getFloatTimeDomainData(this.dataBuffer);

    // Check if there's any signal
    let maxAmp = 0;
    for (let i = 0; i < this.dataBuffer.length; i++) {
      const abs = Math.abs(this.dataBuffer[i]);
      if (abs > maxAmp) maxAmp = abs;
    }

    const now = performance.now();

    if (maxAmp < 0.01) {
      // Silence — release note after sticky period
      if (this._lastMidi >= 0 && (now - this.lastNoteTime) > this.stickyMs * 2) {
        if (this.onNoteOff) this.onNoteOff(this._lastMidi);
        this._lastMidi = -1;
        this.currentNote = null;
      }
    } else {
      const result = yinDetect(this.dataBuffer, this.ctx.sampleRate, this.threshold);

      if (result && result.confidence >= this.minConfidence) {
        const noteInfo = freqToNote(result.frequency);
        if (noteInfo) {
          // Quantize to scale
          const quantizedMidi = quantizeToScale(noteInfo.midi, this.rootNote, this.scale);

          const pitchData = {
            ...noteInfo,
            confidence: result.confidence,
            quantizedMidi,
            quantizedNote: NOTE_NAMES[((quantizedMidi % 12) + 12) % 12],
            quantizedOctave: Math.floor(quantizedMidi / 12) - 1,
          };

          // Fire pitch callback
          if (this.onPitch) this.onPitch(pitchData);

          // Note on/off logic with stickiness
          if (quantizedMidi !== this._lastMidi) {
            const elapsed = now - this.lastNoteTime;
            if (elapsed >= this.stickyMs || this._lastMidi < 0) {
              // Note change
              if (this._lastMidi >= 0 && this.onNoteOff) {
                this.onNoteOff(this._lastMidi);
              }
              if (this.onNoteOn) {
                const velocity = Math.round(Math.min(127, maxAmp * 200));
                this.onNoteOn(quantizedMidi, velocity);
              }
              this._lastMidi = quantizedMidi;
              this.lastNoteTime = now;

              // Add to history for key suggestion
              this.noteHistory.push(quantizedMidi);
              if (this.noteHistory.length > 500) this.noteHistory.shift();
            }
          } else {
            this.lastNoteTime = now;
          }

          this.currentNote = pitchData;
          this.currentFreq = result.frequency;
          this.currentConfidence = result.confidence;
        }
      } else {
        // Below confidence — release after sticky period
        if (this._lastMidi >= 0 && (now - this.lastNoteTime) > this.stickyMs) {
          if (this.onNoteOff) this.onNoteOff(this._lastMidi);
          this._lastMidi = -1;
        }
      }
    }

    this.rafId = requestAnimationFrame(() => this._detect());
  }

  /**
   * Disconnect and cleanup.
   */
  destroy() {
    this.stop();
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch (e) {}
      this.analyser = null;
    }
  }
}

export { NOTE_NAMES, SCALES, ROOT_MAP };
export default YINPitchDetector;