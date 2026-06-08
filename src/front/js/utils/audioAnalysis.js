// =============================================================================
// audioAnalysis.js — BPM + Key + Loudness detection for any AudioBuffer.
// =============================================================================
// Self-contained, no external dependencies, Web Audio AudioBuffer in / plain
// objects out. Reused by SPX Recording Studio (Part 10) and intended for SPX
// DJ Pro / SPX Cast / SPX Beat Lab — keep it independent of any UI module.
//
// Algorithms:
//   BPM      — kick-band-biased spectral-flux autocorrelation with multi-peak
//              0.5×/1×/2× candidate scoring (port of Part 9b detectBpmAutocorr
//              with the same correctness fixes).
//   Key      — STFT chromagram (radix-2 FFT, Hann-windowed, bass-weighted) →
//              Krumhansl-Schmuckler Pearson correlation against all 24 major
//              and minor profiles → Camelot wheel mapping.
//   Loudness — peak / RMS / approx LUFS (single high-shelf K-weighting stage
//              + 0.691 ITU offset; not a certified meter but in the right
//              ballpark for normalization decisions).
//
// All detectors handle very short or silent buffers by returning null instead
// of throwing. analyzeAll() shares the mono mixdown across all three so a
// 4-minute file analyzes in one O(N) sweep instead of three.
//
// Accuracy expectations (rule of thumb, validated on a small internal set):
//   BPM: ~85% within ±1 BPM on pop / EDM / hip-hop with a strong beat. Drops
//        to ~60% on sparse acoustic material, free-tempo classical, or vocal-
//        only takes — those will often return low confidence (< 1.15).
//   Key: ~80% on tonal pop / EDM / hip-hop. Drops on modal jazz, atonal /
//        ambient / heavily-processed material, key changes mid-song (we only
//        report the dominant key over the central 80% of the file), or
//        bass-less mixes.
//
// Known limitations:
//   - No within-song key change detection — single dominant key per file.
//   - No time-varying / variable BPM — single dominant tempo per file.
//   - Loudness is integrated over the whole file, not gated like ITU LUFS.
// =============================================================================

// Set true while iterating on key detection; logs each pipeline stage so a
// "wrong key" report can be debugged without recompiling. Cheap (one console
// group per detect) but keep it off in shipped builds.
const DEBUG_KEY = true;

// ── Pitch class names + Camelot wheel codes ─────────────────────────────────
// Indexed 0=C, 1=C#, 2=D, 3=D#, 4=E, 5=F, 6=F#, 7=G, 8=G#, 9=A, 10=A#, 11=B.
export const NOTE_NAMES   = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
export const CAMELOT_MAJOR = ["8B","3B","10B","5B","12B","7B","2B","9B","4B","11B","6B","1B"];
export const CAMELOT_MINOR = ["5A","12A","7A","2A","9A","4A","11A","6A","1A","8A","3A","10A"];

// Producer-friendly minor key spellings — minor keys conventionally use
// flats. "A♭ minor" reads better than "G# minor" even though they're the
// same notes. Major keys keep the standard sharp spelling in NOTE_NAMES.
const NOTE_NAMES_MINOR_DISPLAY = ["C","C#","D","E♭","E","F","F#","G","A♭","A","B♭","B"];

// Part 14: four key-profile templates, run in parallel and fused via voting.
// No single profile wins on all genres — Krumhansl is classical-leaning,
// Temperley adapts it for popular music, Edma is EDM-tuned (Faraldo et al
// 2016), Sha'ath comes from MIREX pop/rock evaluation.
const KEY_PROFILES = {
  krumhansl: {
    major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
    minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
  },
  temperley: {
    major: [5.0, 2.0, 3.5, 2.0, 4.5, 4.0, 2.0, 4.5, 2.0, 3.5, 1.5, 4.0],
    minor: [5.0, 2.0, 3.5, 4.5, 2.0, 4.0, 2.0, 4.5, 3.5, 2.0, 1.5, 4.0],
  },
  edma: {
    major: [0.16, 0.07, 0.10, 0.07, 0.10, 0.10, 0.07, 0.13, 0.07, 0.10, 0.06, 0.07],
    minor: [0.16, 0.07, 0.10, 0.10, 0.07, 0.10, 0.07, 0.13, 0.10, 0.07, 0.07, 0.06],
  },
  shaath: {
    major: [6.6, 2.0, 3.5, 2.3, 4.6, 4.0, 2.5, 5.2, 2.4, 3.7, 2.3, 3.4],
    minor: [6.5, 2.7, 3.5, 5.4, 2.6, 3.5, 2.5, 5.2, 4.0, 2.7, 4.3, 3.2],
  },
};
const PROFILE_NAMES = ["krumhansl", "temperley", "edma", "shaath"];

// Producer-facing key string. Major uses sharps; minor uses the flat-favored
// table. Used for both the displayed `key` field and console diagnostics.
const formatKey = (root, scale) =>
  scale === "minor"
    ? `${NOTE_NAMES_MINOR_DISPLAY[root]} minor`
    : `${NOTE_NAMES[root]} major`;

// ── Internal helpers ────────────────────────────────────────────────────────
const monoMix = (buf) => {
  const len = buf.length, nch = buf.numberOfChannels;
  const out = new Float32Array(len);
  for (let c = 0; c < nch; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < len; i++) out[i] += ch[i] / nch;
  }
  return out;
};

const onePoleHP = (src, sr, cutoff) => {
  const dt = 1 / sr, RC = 1 / (2 * Math.PI * cutoff), a = RC / (RC + dt);
  const out = new Float32Array(src.length);
  let pi = src[0], po = 0;
  for (let i = 1; i < src.length; i++) { const v = a * (po + src[i] - pi); pi = src[i]; po = v; out[i] = v; }
  return out;
};
const onePoleLP = (src, sr, cutoff) => {
  const dt = 1 / sr, RC = 1 / (2 * Math.PI * cutoff), a = dt / (RC + dt);
  const out = new Float32Array(src.length);
  let prev = 0;
  for (let i = 0; i < src.length; i++) { prev = prev + a * (src[i] - prev); out[i] = prev; }
  return out;
};

// Part 14b: JavaScript's `%` preserves the sign of the dividend, so a naive
// `(i + n) % len` with negative `n` produces negative indices and `arr[-1] ===
// undefined`. That undefined poisons pearson() to NaN, which it returns as 0,
// which made every non-r=0 candidate score exactly 0 and locked detection to a
// single (wrong) key. Normalize n into [0, len) before indexing.
const rotate = (arr, n) => {
  const len = arr.length;
  const k = ((n % len) + len) % len;
  const out = new Array(len);
  for (let i = 0; i < len; i++) out[i] = arr[(i + k) % len];
  return out;
};

const pearson = (a, b) => {
  const n = a.length;
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const xa = a[i] - ma, xb = b[i] - mb; num += xa * xb; da += xa * xa; db += xb * xb; }
  const denom = Math.sqrt(da * db);
  return denom > 0 ? num / denom : 0;
};

// In-place radix-2 Cooley-Tukey FFT. real/imag must have length = power of 2.
// Tiny + fast — for our 4096-point chroma frames this runs in ~0.5 ms each.
const fft = (real, imag) => {
  const N = real.length;
  // Bit-reversal permutation.
  let j = 0;
  for (let i = 1; i < N; i++) {
    let bit = N >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) {
      let tr = real[i]; real[i] = real[j]; real[j] = tr;
      let ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
    }
  }
  // Cooley-Tukey butterfly.
  for (let size = 2; size <= N; size <<= 1) {
    const half = size >> 1;
    const step = -2 * Math.PI / size;
    for (let i = 0; i < N; i += size) {
      for (let k = 0; k < half; k++) {
        const angle = step * k;
        const cs = Math.cos(angle), sn = Math.sin(angle);
        const tre = cs * real[i + k + half] - sn * imag[i + k + half];
        const tim = sn * real[i + k + half] + cs * imag[i + k + half];
        real[i + k + half] = real[i + k] - tre;
        imag[i + k + half] = imag[i + k] - tim;
        real[i + k] += tre;
        imag[i + k] += tim;
      }
    }
  }
};

// ── BPM ─────────────────────────────────────────────────────────────────────
// Port of ArrangerView.js detectBpmAutocorr (Part 9b) — kept here so the
// inline copy can be removed. See file header for accuracy notes.
const _detectBpm = (mono, sr) => {
  if (!mono || mono.length < sr * 2) return null;  // need at least 2 s.
  const fullBand = onePoleHP(mono, sr, 100);
  const kickBand = onePoleLP(onePoleHP(mono, sr, 40), sr, 150);
  const W = 1024, H = 512, hopTime = H / sr;
  const numHops = Math.max(0, Math.floor((mono.length - W) / H));
  if (numHops < 16) return null;
  const buildFlux = (sig) => {
    const env = new Float32Array(numHops);
    for (let h = 0; h < numHops; h++) {
      const start = h * H; let s = 0;
      for (let j = 0; j < W; j++) { const v = sig[start + j]; s += v * v; }
      env[h] = Math.sqrt(s / W);
    }
    const fx = new Float32Array(numHops);
    for (let i = 1; i < numHops; i++) fx[i] = Math.max(0, env[i] - env[i - 1]);
    return fx;
  };
  const fF = buildFlux(fullBand), fK = buildFlux(kickBand);
  const minLag = Math.max(1, Math.floor((60 / 300) / hopTime));
  const maxLag = Math.min(numHops - 1, Math.floor((60 / 60) / hopTime));
  if (maxLag <= minLag) return null;
  const acScore = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sf = 0, sk = 0;
    for (let i = 0; i + lag < numHops; i++) { sf += fF[i] * fF[i + lag]; sk += fK[i] * fK[i + lag]; }
    acScore[lag] = sf + 1.5 * sk;
  }
  // Part 13 (#13-3): parabolic peak interpolation. Without this the winning
  // lag is integer-quantized; e.g. 130 BPM at 44.1 kHz / 512-hop sits between
  // lag 39 and 40, so it always rounds to 129 or 132 — never the true 130.
  // Fitting a parabola through (lag-1, lag, lag+1) recovers a fractional lag
  // accurate to ~0.05 BPM at typical tempos.
  const peaks = [];
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    const y0 = acScore[lag];
    if (y0 > acScore[lag - 1] && y0 > acScore[lag + 1] && y0 > 0) {
      const ym1 = acScore[lag - 1], yp1 = acScore[lag + 1];
      const denom = ym1 - 2 * y0 + yp1;
      let delta = denom !== 0 ? 0.5 * (ym1 - yp1) / denom : 0;
      if (delta > 0.5) delta = 0.5;
      else if (delta < -0.5) delta = -0.5;
      peaks.push({ lag: lag + delta, score: y0 });
    }
  }
  if (!peaks.length) return null;
  peaks.sort((a, b) => b.score - a.score);
  const top = peaks.slice(0, 5);
  const maxScore = top[0].score;
  // Prior widened (σ 40 → 90) so the Gaussian no longer dominates the actual
  // autocorrelation strength. The narrower σ used to flip a 96-BPM track to
  // 128 BPM when a dotted-eighth (96 × 4/3 = 128) gave a real peak alongside
  // the quarter-note peak — sweet(128) = 0.96 vs sweet(96) = 0.70 was enough
  // to win on prior alone. σ=90 leaves a gentle preference around 120 without
  // overriding clearly stronger peaks elsewhere.
  const sweet = (b) => Math.exp(-Math.pow((b - 120) / 90, 2));
  const cands = [];
  for (const p of top) {
    const baseBpm = 60 / (p.lag * hopTime);
    // Multipliers now include 2/3, 3/4, 4/3, 3/2 so the candidate generator
    // can evaluate metrical relationships (dotted-eighth, triplet, etc.) and
    // demote the wrong sub-level back to the true base tempo.
    for (const mul of [0.5, 2/3, 0.75, 1, 4/3, 1.5, 2]) {
      const b = baseBpm * mul;
      if (b < 60 || b > 200) continue;
      const tLag = Math.round((60 / b) / hopTime);
      const acAt = (tLag >= minLag && tLag <= maxLag) ? acScore[tLag] : p.score * 0.5;
      cands.push({ bpm: b, score: (acAt / maxScore) * sweet(b) });
    }
  }
  if (!cands.length) return null;
  cands.sort((a, b) => b.score - a.score);
  const winner = cands[0];
  const ru = cands[1] || { bpm: winner.bpm, score: 0.0001 };
  const confidence = Math.max(0, winner.score / Math.max(0.0001, ru.score) - 1);
  const bpm = Math.round(winner.bpm);
  if (!isFinite(bpm) || bpm < 60 || bpm > 200) return null;
  return { bpm, confidence: +confidence.toFixed(2), runnerUp: Math.round(ru.bpm) };
};

export const detectBpm = (audioBuffer) => audioBuffer ? _detectBpm(monoMix(audioBuffer), audioBuffer.sampleRate) : null;

// ── CQT / HPCP / bass-validation helpers (Part 14 key pipeline) ─────────────
// Standard FFT has linear frequency resolution: ~5 Hz per bin at 44.1 kHz /
// 8192-pt. That smears the bass octaves where C1 (32.7 Hz) and B1 (61.7 Hz)
// fall a handful of bins apart. CQT gives every octave the same number of
// bins, so the bass region is properly resolved into semitones.
const CQT_NUM_BINS = 84;       // 7 octaves × 12 semitones (C1 → B7).
const CQT_MIN_FREQ = 32.70;    // C1 — anything lower is sub-bass noise.

// Per-(sampleRate, fftSize) kernel cache — one FFT-magnitude → CQT mapping
// reused across every frame in the song.
const _cqtKernelCache = new Map();
const buildCQTKernel = (sampleRate, fftSize) => {
  const cacheKey = `${sampleRate}_${fftSize}`;
  const cached = _cqtKernelCache.get(cacheKey);
  if (cached) return cached;
  const Q = 1 / (Math.pow(2, 1 / 12) - 1);  // ≈17 for 12 bins/octave
  const halfFft = fftSize >> 1;
  const kernel = new Array(CQT_NUM_BINS);
  for (let k = 0; k < CQT_NUM_BINS; k++) {
    const freq = CQT_MIN_FREQ * Math.pow(2, k / 12);
    const bandwidth = freq / Q;
    const center = Math.round(freq * fftSize / sampleRate);
    const halfWidth = Math.max(1, Math.round(bandwidth * fftSize / sampleRate));
    const w = new Float32Array(halfFft);
    const lo = Math.max(0, center - halfWidth);
    const hi = Math.min(halfFft, center + halfWidth);
    for (let i = lo; i < hi; i++) {
      const offset = (i - center) / halfWidth;
      w[i] = 0.5 * (1 + Math.cos(Math.PI * offset));  // Hann around center.
    }
    kernel[k] = w;
  }
  _cqtKernelCache.set(cacheKey, kernel);
  return kernel;
};

// Map an FFT magnitude spectrum onto 84 log-spaced CQT bins.
const applyCQT = (fftMag, kernel) => {
  const out = new Float32Array(kernel.length);
  for (let k = 0; k < kernel.length; k++) {
    let s = 0;
    const w = kernel[k];
    for (let i = 0; i < w.length; i++) s += fftMag[i] * w[i];
    out[k] = s;
  }
  return out;
};

// HPCP — collapse 84 CQT bins to a 12-element pitch class profile. Part 14
// also added a harmonic-deconvolution step that reattributed 30% of each bin
// to its perfect-5th and major-3rd neighbours; in practice that just blurred
// the chromagram toward uniformity. This direct-accumulation form matches the
// Tier 1 (Part 10) chromagram that worked. Multi-profile + bass validation
// now do the heavy lifting that the deconvolution was supposed to do.
const buildHPCP = (cqtFrame) => {
  const hpcp = new Float32Array(12);
  for (let k = 0; k < cqtFrame.length; k++) {
    const m = cqtFrame[k];
    if (m < 1e-6) continue;
    hpcp[k % 12] += m;
  }
  return hpcp;
};

// Bass note: count the strongest pitch class in the bottom two CQT octaves
// (C1–B2, bins 0–23) per frame, then pick the pitch class that "wins" the
// most frames. Part 14b averaged raw magnitudes, which let kick-drum
// transients dominate (kicks are loud broadband impulses centred near C/D);
// frame-wins voting drops their influence because a kick only wins the one
// frame it transients in, while a sustained 808 wins every frame it rings
// through. Returns -1 when bass content is too sparse for confidence.
const detectBassNote = (cqtFrames) => {
  if (!cqtFrames.length) return -1;
  const pitchClassWins = new Int32Array(12);
  let validFrames = 0;
  for (const frame of cqtFrames) {
    const framePc = new Float32Array(12);
    let frameTotal = 0;
    for (let k = 0; k < 24; k++) {
      framePc[k % 12] += frame[k];
      frameTotal += frame[k];
    }
    if (frameTotal < 1e-6) continue;
    validFrames++;
    let mi = 0, mv = framePc[0];
    for (let i = 1; i < 12; i++) if (framePc[i] > mv) { mv = framePc[i]; mi = i; }
    pitchClassWins[mi]++;
  }
  if (validFrames === 0) return -1;
  let maxIdx = 0, maxWins = pitchClassWins[0];
  for (let i = 1; i < 12; i++) if (pitchClassWins[i] > maxWins) { maxWins = pitchClassWins[i]; maxIdx = i; }
  if (DEBUG_KEY) {
    console.log(`[KEY DEBUG] Bass pitch-class wins:`, NOTE_NAMES.map((n, i) => `${n}=${pitchClassWins[i]}`).join(' '));
    console.log(`[KEY DEBUG] Bass winner: ${NOTE_NAMES[maxIdx]} (${maxWins}/${validFrames} frames)`);
  }
  // Need at least 10% of valid frames agreeing — otherwise the bass is too
  // diffuse to trust as a tonic signal and we let the chromagram decide alone.
  return maxWins > validFrames * 0.1 ? maxIdx : -1;
};

// Multiplier applied to a candidate's score based on whether the dominant
// bass pitch class supports the (root, scale) hypothesis. Catches the
// classic "chromagram says C major, bass clearly plays A♭" failure mode that
// flipped the prior detector to the wrong key.
const validateKeyAgainstBass = (root, scale, bassNote) => {
  if (bassNote < 0) return 1.0;
  if (bassNote === root) return 1.5;                          // tonic hit
  if (bassNote === (root + 7) % 12) return 1.2;               // dominant
  if (bassNote === (root + 5) % 12) return 1.1;               // subdominant
  // Bass on relative major (of detected minor) or relative minor (of detected
  // major) is a strong signal we picked the wrong scale.
  const relativeRoot = scale === "minor" ? (root + 3) % 12 : (root + 9) % 12;
  if (bassNote === relativeRoot) return 0.8;
  return 0.6;  // Bass note doesn't fit detected key — likely wrong.
};

// ── KEY (Part 14: production-grade six-stage pipeline) ──────────────────────
// 1. CQT (log-frequency, 84 bins)  →  2. HPCP (harmonic-aware chroma)  →
// 3. central-90% split into 4 segments  →  4. four profile templates score
// each segment independently (16 candidates)  →  5. bass tonic validation
// adjusts each candidate's score  →  6. group by (root, scale) and sum
// weighted scores; the group with highest sum wins.
//
// Targets ~88-92% accuracy on tonal music vs the prior single-profile FFT
// chromagram (~80%). Trades ~80 ms → ~600 ms per analysis; analyzeAll is
// WeakMap-cached so the cost is paid once per AudioBuffer.
const FFT_SIZE_KEY = 8192;  // 50% overlap below — bigger window resolves bass.
const HOP_SIZE_KEY = 4096;

const _detectKey = (mono, sr) => {
  if (!mono || mono.length < sr * 1) return null;  // Need at least 1 s.
  const numFrames = Math.floor((mono.length - FFT_SIZE_KEY) / HOP_SIZE_KEY);
  if (numFrames < 4) return null;

  // Part 14b: one-shot Pearson sanity test. If this prints anything other
  // than ~0.7+ for the C-major scale against the Krumhansl C-major template,
  // the correlator itself is broken — investigate before reading any other
  // diagnostics below.
  if (DEBUG_KEY) {
    const a = [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0];  // C major triad
    const b = KEY_PROFILES.krumhansl.major;
    console.log(`[KEY DEBUG] Pearson sanity (C major triad vs Krumhansl C maj) = ${pearson(a, b).toFixed(4)} (expect > 0.5)`);
    console.log(`[KEY DEBUG] rotate test (-1) = ${rotate([0,1,2,3,4,5,6,7,8,9,10,11], -1).join(",")} (expect 11,0,1,...,10)`);
  }

  // Hann window for FFT framing.
  const win = new Float32Array(FFT_SIZE_KEY);
  for (let i = 0; i < FFT_SIZE_KEY; i++) {
    win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (FFT_SIZE_KEY - 1)));
  }

  const kernel = buildCQTKernel(sr, FFT_SIZE_KEY);
  const halfFft = FFT_SIZE_KEY >> 1;
  const real = new Float32Array(FFT_SIZE_KEY);
  const imag = new Float32Array(FFT_SIZE_KEY);
  const fftMag = new Float32Array(halfFft);

  // ── STAGE 1+2: per-frame CQT and HPCP. ──
  const cqtFrames = new Array(numFrames);
  const hpcpFrames = new Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    const start = f * HOP_SIZE_KEY;
    for (let i = 0; i < FFT_SIZE_KEY; i++) { real[i] = mono[start + i] * win[i]; imag[i] = 0; }
    fft(real, imag);
    for (let i = 0; i < halfFft; i++) fftMag[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    cqtFrames[f] = applyCQT(fftMag, kernel);
    hpcpFrames[f] = buildHPCP(cqtFrames[f]);
  }

  if (DEBUG_KEY && cqtFrames.length > 0) {
    const f = cqtFrames[Math.floor(cqtFrames.length / 2)];
    let cmin = Infinity, cmax = 0, csum = 0, nz = 0;
    for (let i = 0; i < f.length; i++) {
      if (f[i] < cmin) cmin = f[i];
      if (f[i] > cmax) cmax = f[i];
      csum += f[i];
      if (f[i] > 1e-6) nz++;
    }
    console.log(`[KEY DEBUG] CQT mid-frame: min=${cmin.toExponential(2)} max=${cmax.toExponential(2)} avg=${(csum / f.length).toExponential(2)} nonzero=${nz}/${f.length}`);
    const h = hpcpFrames[Math.floor(hpcpFrames.length / 2)];
    let hmin = Infinity, hmax = 0, hsum = 0;
    for (let i = 0; i < 12; i++) {
      if (h[i] < hmin) hmin = h[i];
      if (h[i] > hmax) hmax = h[i];
      hsum += h[i];
    }
    console.log(`[KEY DEBUG] HPCP mid-frame: [${Array.from(h).map(v => v.toExponential(2)).join(", ")}]`);
    console.log(`[KEY DEBUG] HPCP stats: min=${hmin.toExponential(2)} max=${hmax.toExponential(2)} sum=${hsum.toExponential(2)}`);
  }

  // ── STAGE 3: split central 90% into 4 equal segments. ──
  // Skipping the first/last 5% drops intros (often atonal or percussive)
  // and outro fades that confuse a whole-song chroma average. Silent
  // segments (e.g. mid-song breakdown) are dropped entirely — they would
  // otherwise produce a constant HPCP, which makes Pearson degenerate to 0
  // for every key and pollutes the group-vote tally.
  const skip = Math.floor(numFrames * 0.05);
  const usable = numFrames - 2 * skip;
  if (usable < 4) return null;
  const segLen = Math.floor(usable / 4);
  const segHpcp = [];        // surviving (non-silent) segment HPCPs
  const segIndex = [];       // original [0..3] index for diagnostics
  for (let s = 0; s < 4; s++) {
    const lo = skip + s * segLen;
    const hi = s === 3 ? numFrames - skip : skip + (s + 1) * segLen;
    const acc = new Float64Array(12);
    let n = 0;
    for (let f = lo; f < hi; f++) {
      for (let i = 0; i < 12; i++) acc[i] += hpcpFrames[f][i];
      n++;
    }
    if (n === 0) continue;
    let total = 0; for (let i = 0; i < 12; i++) total += acc[i];
    if (total < 1e-9) {
      if (DEBUG_KEY) console.log(`[KEY DEBUG] Segment ${s + 1} silent (total=${total.toExponential(2)}) — skipping`);
      continue;
    }
    const norm = new Array(12);
    for (let i = 0; i < 12; i++) norm[i] = acc[i] / total;
    segHpcp.push(norm);
    segIndex.push(s);
  }
  if (segHpcp.length === 0) return null;

  if (DEBUG_KEY) {
    segHpcp.forEach((seg, i) => {
      console.log(`[KEY DEBUG] Segment ${segIndex[i] + 1} HPCP normed: [${seg.map(v => v.toFixed(4)).join(", ")}]`);
    });
    console.log(`[KEY DEBUG] Profile names:`, PROFILE_NAMES);
    console.log(`[KEY DEBUG] Krumhansl major template:`, KEY_PROFILES.krumhansl.major);
    console.log(`[KEY DEBUG] rotate(krumhansl.major, -3) =`, rotate(KEY_PROFILES.krumhansl.major, -3));
  }

  // ── STAGE 4: N segments × 4 profiles = 4N candidates. ──
  // For each (segment, profile) we keep ONE candidate — the best (root, scale)
  // pair under that profile. The candidate's `.score` is the Pearson
  // correlation of the segment's HPCP against the rotated profile.
  const candidates = [];
  const segmentSummary = [];  // segmentSummary[i][profileName] = best candidate
  for (let s = 0; s < segHpcp.length; s++) {
    const profile = segHpcp[s];
    const perProfileBest = {};
    for (const profName of PROFILE_NAMES) {
      const tmpl = KEY_PROFILES[profName];
      let best = null;
      for (let r = 0; r < 12; r++) {
        const sMaj = pearson(profile, rotate(tmpl.major, -r));
        const sMin = pearson(profile, rotate(tmpl.minor, -r));
        if (DEBUG_KEY && s === 0 && profName === 'krumhansl' && r === 0) {
          console.log(`[KEY DEBUG] seg=${segIndex[s]} root=0 maj/min vs ${profName} = ${sMaj.toFixed(4)} / ${sMin.toFixed(4)}`);
        }
        if (!best || sMaj > best.score) best = { root: r, scale: "major", score: sMaj, profile: profName, segment: segIndex[s] };
        if (sMin > best.score)         best = { root: r, scale: "minor", score: sMin, profile: profName, segment: segIndex[s] };
      }
      candidates.push(best);
      perProfileBest[profName] = best;
    }
    segmentSummary.push(perProfileBest);
  }

  // ── STAGE 5: bass note + per-candidate bass-validation multiplier. ──
  const bassNote = detectBassNote(cqtFrames);

  // Part 14c: profile-dominance boost. Each (segment × profile) pair produces
  // one candidate, so 4 profiles always cast 4 votes per segment. Without
  // weighting that means a single profile that nails a genre (e.g. Edma on
  // EDM/hip-hop) gets outvoted 3-1 by profiles that consistently disagree
  // among themselves. We tally which profile wins each segment outright; a
  // profile that wins ≥50% of segments has demonstrated genre fit and gets
  // a 1.6× boost on every candidate it produced.
  const profileWinCount = { krumhansl: 0, temperley: 0, edma: 0, shaath: 0 };
  for (let s = 0; s < segmentSummary.length; s++) {
    const sb = segmentSummary[s];
    const top = PROFILE_NAMES.map(p => sb[p]).sort((a, b) => b.score - a.score)[0];
    profileWinCount[top.profile]++;
  }
  const dominantProfile = Object.entries(profileWinCount).sort((a, b) => b[1] - a[1])[0][0];
  const dominantWins = profileWinCount[dominantProfile];
  const profileBoost = (profile) =>
    (dominantWins >= segmentSummary.length / 2 && profile === dominantProfile) ? 1.6 : 1.0;

  if (DEBUG_KEY) {
    console.log(`[KEY DEBUG] Profile wins per segment:`, profileWinCount);
    console.log(`[KEY DEBUG] Dominant profile: ${dominantProfile} (${dominantWins}/${segmentSummary.length} segments) → ${profileBoost(dominantProfile).toFixed(2)}× boost`);
  }

  // ── STAGE 6: group candidates by (root, scale), sum bass-weighted scores. ──
  const groups = new Map();
  for (const c of candidates) {
    if (!c) continue;
    const k = `${c.root}_${c.scale}`;
    const mult = validateKeyAgainstBass(c.root, c.scale, bassNote);
    const w = Math.max(0.0001, c.score) * mult * profileBoost(c.profile);
    let g = groups.get(k);
    if (!g) {
      g = { root: c.root, scale: c.scale, weighted: 0, raw: 0, hits: 0, profiles: new Set() };
      groups.set(k, g);
    }
    g.weighted += w;
    if (c.score > g.raw) g.raw = c.score;
    g.hits += 1;
    g.profiles.add(c.profile);
  }
  if (!groups.size) return null;

  const ranked = Array.from(groups.values()).sort((a, b) => b.weighted - a.weighted);
  const winner = ranked[0];
  const ru     = ranked[1] || { ...winner, weighted: 0.0001 };
  const confidence = +(winner.weighted / Math.max(0.0001, ru.weighted)).toFixed(2);

  // How many of the 16 candidates picked each profile as their best?
  const profileVotes = { krumhansl: 0, temperley: 0, edma: 0, shaath: 0 };
  for (const c of candidates) if (c) profileVotes[c.profile]++;

  const winnerKey = formatKey(winner.root, winner.scale);
  const ruKey     = formatKey(ru.root,     ru.scale);
  const camelot   = winner.scale === "major" ? CAMELOT_MAJOR[winner.root] : CAMELOT_MINOR[winner.root];
  const ruCamelot = ru.scale     === "major" ? CAMELOT_MAJOR[ru.root]     : CAMELOT_MINOR[ru.root];

  // ── Diagnostic logging — invaluable when users report a wrong detection. ──
  try {
    console.groupCollapsed(`[SPX Key] ${winnerKey} (${camelot}) confidence ${confidence}`);
    console.log(`Bass note: ${bassNote >= 0 ? NOTE_NAMES[bassNote] : "—"}`);
    for (let s = 0; s < segmentSummary.length; s++) {
      const sb = segmentSummary[s];
      const top = PROFILE_NAMES.map(p => ({ name: p, c: sb[p] }))
        .sort((a, b) => b.c.score - a.c.score)[0];
      console.log(`Segment ${(top.c.segment ?? s) + 1}: ${formatKey(top.c.root, top.c.scale)} (${top.name}, score ${top.c.score.toFixed(3)})`);
    }
    console.log("Profile votes:", profileVotes);
    console.log(`Bass validation: ${validateKeyAgainstBass(winner.root, winner.scale, bassNote).toFixed(2)}× winner, ${validateKeyAgainstBass(ru.root, ru.scale, bassNote).toFixed(2)}× runner-up`);
    console.log(`Runner-up: ${ruKey} (${ruCamelot})`);
    console.groupEnd();
  } catch { /* no console — fine */ }

  return {
    key: winnerKey,
    scale: winner.scale,
    root: winner.root,
    camelot,
    confidence,
    runnerUp: `${ruKey} (${ruCamelot})`,
    score: +winner.raw.toFixed(3),
    // Diagnostics — optional, existing callers ignore.
    bassNote,
    profileVotes,
    segments: segmentSummary.map((sb, i) => {
      const top = PROFILE_NAMES.map(p => sb[p]).sort((a, b) => b.score - a.score)[0];
      return { index: top.segment ?? i, key: formatKey(top.root, top.scale), profile: top.profile, score: +top.score.toFixed(3) };
    }),
  };
};

export const detectKey = (audioBuffer) => audioBuffer ? _detectKey(monoMix(audioBuffer), audioBuffer.sampleRate) : null;

// ── LOUDNESS ────────────────────────────────────────────────────────────────
// Peak + integrated RMS + approximate LUFS. Real LUFS needs the full ITU-R
// BS.1770-4 K-weighting + 400 ms gating; this is a single high-shelf stage
// which is close enough for "is this clip 6 dB louder than that one" decisions.
const _detectLoudness = (mono, sr) => {
  if (!mono || mono.length === 0) return null;
  let peak = 0, sumSq = 0;
  for (let i = 0; i < mono.length; i++) {
    const v = mono[i]; const a = v < 0 ? -v : v;
    if (a > peak) peak = a;
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / mono.length);
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
  const rmsDb  = rms  > 0 ? 20 * Math.log10(rms)  : -Infinity;
  // Approx K-weighting: high-shelf at ~1.5 kHz +4 dB, then HPF @ 38 Hz, then
  // RMS, then -0.691 dB ITU offset. Implementation: apply biquad-equivalent
  // one-pole shelving in the time domain over a downsampled copy (cheap).
  const stride = Math.max(1, Math.floor(sr / 8000));
  let kSumSq = 0, kCount = 0;
  // Simple high-shelf approximation: y[n] = x[n] + 0.585·(x[n] - x[n-1]) ≈ +4 dB above ~1.5 kHz at 8 kHz sample rate.
  let prev = 0;
  for (let i = 0; i < mono.length; i += stride) {
    const x = mono[i];
    const y = x + 0.585 * (x - prev);
    prev = x;
    kSumSq += y * y; kCount++;
  }
  const kRms = kCount > 0 ? Math.sqrt(kSumSq / kCount) : 0;
  const lufs = kRms > 0 ? 20 * Math.log10(kRms) - 0.691 : -Infinity;
  return {
    peak, peakDb: +peakDb.toFixed(2),
    rms,  rmsDb:  +rmsDb.toFixed(2),
    lufs: isFinite(lufs) ? +lufs.toFixed(2) : null,
  };
};

export const detectLoudness = (audioBuffer) => audioBuffer ? _detectLoudness(monoMix(audioBuffer), audioBuffer.sampleRate) : null;

// ── analyzeAll: one mono mix shared by all three detectors. ─────────────────
const _cache = new WeakMap();  // AudioBuffer → result, so re-imports skip work.

export const analyzeAll = (audioBuffer) => {
  if (!audioBuffer) return null;
  const cached = _cache.get(audioBuffer); if (cached) return cached;
  const mono = monoMix(audioBuffer);
  const sr = audioBuffer.sampleRate;
  const out = {
    bpm:      _detectBpm(mono, sr),
    key:      _detectKey(mono, sr),
    loudness: _detectLoudness(mono, sr),
    duration: audioBuffer.duration,
    sampleRate: sr,
  };
  _cache.set(audioBuffer, out);
  return out;
};

// ── Camelot wheel display colors ────────────────────────────────────────────
// Distinct hue per Camelot number (1–12). 'A' = inner ring (minor),
// 'B' = outer ring (major) — same hue, different lightness. UI can use this
// for the per-region color badge so harmonically-mixable keys are visually
// adjacent. Indexed 1-based to match Camelot convention.
export const CAMELOT_COLORS = {
  "1A":  "#8b5fbf", "1B":  "#a47cd6",   // 1  — purple
  "2A":  "#5f7fbf", "2B":  "#7c9cd6",   // 2  — indigo
  "3A":  "#4f9fbf", "3B":  "#6cbcd6",   // 3  — sky blue
  "4A":  "#3fbfa0", "4B":  "#5cd6bd",   // 4  — teal
  "5A":  "#3fbf5f", "5B":  "#5cd67c",   // 5  — green
  "6A":  "#7fbf3f", "6B":  "#9cd65c",   // 6  — lime
  "7A":  "#bfbf3f", "7B":  "#d6d65c",   // 7  — yellow
  "8A":  "#bf9f3f", "8B":  "#d6bc5c",   // 8  — gold
  "9A":  "#bf7f3f", "9B":  "#d69c5c",   // 9  — orange
  "10A": "#bf5f3f", "10B": "#d67c5c",   // 10 — red-orange
  "11A": "#bf3f5f", "11B": "#d65c7c",   // 11 — pink
  "12A": "#bf3f9f", "12B": "#d65cbc",   // 12 — magenta
};

// Convenience: given a Camelot code, return its display color (or a default).
export const camelotColor = (code) => CAMELOT_COLORS[code] || "#7a8aaa";
