// =============================================================================
// SPXWorklets.js — All AudioWorklet Processor Sources
// =============================================================================
// Each function returns a source string that can be loaded as a Blob URL.
// Usage:
//   const src  = getCompressorWorkletSource();
//   const blob = new Blob([src], { type: 'application/javascript' });
//   const url  = URL.createObjectURL(blob);
//   await audioContext.audioWorklet.addModule(url);
//   URL.revokeObjectURL(url);
// =============================================================================

// ── Compressor Worklet ────────────────────────────────────────────────────
export const getCompressorWorkletSource = (processorName = 'spx-compressor') => `
class ${processorName.replace(/-/g,'_')}Processor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: -18, minValue: -60, maxValue: 0 },
      { name: 'ratio',     defaultValue: 4,   minValue: 1,   maxValue: 20 },
      { name: 'attack',    defaultValue: 10,  minValue: 0.1, maxValue: 200 },
      { name: 'release',   defaultValue: 150, minValue: 10,  maxValue: 2000 },
      { name: 'knee',      defaultValue: 6,   minValue: 0,   maxValue: 30 },
      { name: 'makeup',    defaultValue: 0,   minValue: 0,   maxValue: 24 },
    ];
  }
  constructor() {
    super();
    this._envDb = -100;
    this._rmsWindow = new Float32Array(512);
    this._rmsIdx = 0;
    this._rmsSum = 0;
  }
  _computeGainDb(inputDb, threshold, ratio, knee) {
    if (knee > 0 && inputDb > threshold - knee/2 && inputDb < threshold + knee/2) {
      const kneeDiff = inputDb - threshold + knee/2;
      return (1/ratio - 1) * kneeDiff * kneeDiff / (2 * knee);
    }
    if (inputDb <= threshold) return 0;
    return (threshold - inputDb) * (1 - 1/ratio);
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0], output = outputs[0];
    if (!input || !input[0]) return true;
    const threshold = parameters.threshold[0] ?? -18;
    const ratio     = parameters.ratio[0] ?? 4;
    const attackMs  = parameters.attack[0] ?? 10;
    const releaseMs = parameters.release[0] ?? 150;
    const knee      = parameters.knee[0] ?? 6;
    const makeup    = parameters.makeup[0] ?? 0;
    const attackCoeff  = Math.exp(-1 / (sampleRate * attackMs  / 1000));
    const releaseCoeff = Math.exp(-1 / (sampleRate * releaseMs / 1000));
    const makeupLin = Math.pow(10, makeup / 20);
    const numChannels = Math.min(input.length, output.length);
    const blockSize   = input[0].length;
    for (let i = 0; i < blockSize; i++) {
      // RMS detection across all channels
      let sumSq = 0;
      for (let c = 0; c < numChannels; c++) {
        const s = input[c][i];
        this._rmsSum -= this._rmsWindow[this._rmsIdx] * this._rmsWindow[this._rmsIdx];
        this._rmsWindow[this._rmsIdx] = s;
        this._rmsSum += s * s;
        this._rmsIdx = (this._rmsIdx + 1) % this._rmsWindow.length;
        sumSq += s * s;
      }
      const rms    = Math.sqrt(Math.max(0, this._rmsSum) / this._rmsWindow.length);
      const inputDb = rms > 1e-6 ? 20 * Math.log10(rms) : -100;
      const targetDb = inputDb + this._computeGainDb(inputDb, threshold, ratio, knee);
      if (targetDb < this._envDb) {
        this._envDb = attackCoeff * this._envDb + (1 - attackCoeff) * targetDb;
      } else {
        this._envDb = releaseCoeff * this._envDb + (1 - releaseCoeff) * targetDb;
      }
      const gainLin = rms > 1e-6
        ? Math.pow(10, (this._envDb - inputDb) / 20) * makeupLin
        : makeupLin;
      for (let c = 0; c < numChannels; c++) {
        output[c][i] = input[c][i] * gainLin;
      }
    }
    return true;
  }
}
registerProcessor('${processorName}', ${processorName.replace(/-/g,'_')}Processor);
`;

// ── Limiter Worklet ────────────────────────────────────────────────────────
export const getLimiterWorkletSource = () => `
class SPXLimiterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'ceiling', defaultValue: -0.3, minValue: -12, maxValue: 0 },
      { name: 'release', defaultValue: 50,   minValue: 1,   maxValue: 500 },
      { name: 'lookahead', defaultValue: 5,  minValue: 0,   maxValue: 20 },
    ];
  }
  constructor() {
    super();
    this._gain = 1.0;
    this._lookaheadBuffer = null;
    this._lookaheadPos = 0;
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0], output = outputs[0];
    if (!input || !input[0]) return true;
    const ceiling     = Math.pow(10, (parameters.ceiling[0] ?? -0.3) / 20);
    const releaseCoeff = Math.exp(-1 / (sampleRate * (parameters.release[0] ?? 50) / 1000));
    const numCh = Math.min(input.length, output.length);
    for (let i = 0; i < input[0].length; i++) {
      let maxAbs = 0;
      for (let c = 0; c < numCh; c++) {
        const abs = Math.abs(input[c][i]);
        if (abs > maxAbs) maxAbs = abs;
      }
      if (maxAbs * this._gain > ceiling) {
        this._gain = ceiling / (maxAbs + 1e-9);
      } else {
        this._gain = Math.min(1.0, this._gain / releaseCoeff);
      }
      for (let c = 0; c < numCh; c++) {
        output[c][i] = input[c][i] * this._gain;
      }
    }
    return true;
  }
}
registerProcessor('spx-limiter', SPXLimiterProcessor);
`;

// ── Meter Worklet ─────────────────────────────────────────────────────────
export const getMeterWorkletSource = () => `
class SPXMeterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() { return []; }
  constructor() {
    super();
    this._peak     = 0;
    this._holdCount = 0;
    this._rmsBuffer = new Float32Array(4096);
    this._rmsIdx   = 0;
    this._rmsSum   = 0;
    this._frameCount = 0;
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const ch = input[0];
    let peak = 0;
    for (let i = 0; i < ch.length; i++) {
      const abs = Math.abs(ch[i]);
      if (abs > peak) peak = abs;
      // Running RMS
      this._rmsSum -= this._rmsBuffer[this._rmsIdx] * this._rmsBuffer[this._rmsIdx];
      this._rmsBuffer[this._rmsIdx] = ch[i];
      this._rmsSum += ch[i] * ch[i];
      this._rmsIdx = (this._rmsIdx + 1) % this._rmsBuffer.length;
    }
    const rms = Math.sqrt(Math.max(0, this._rmsSum) / this._rmsBuffer.length);
    // Peak hold
    if (peak > this._peak) { this._peak = peak; this._holdCount = 150; }
    else if (this._holdCount > 0) { this._holdCount--; }
    else { this._peak *= 0.9998; }
    // Post to main thread every ~10ms
    this._frameCount++;
    if (this._frameCount % 4 === 0) {
      this.port.postMessage({
        peak:     20 * Math.log10(this._peak + 1e-6),
        peakHold: 20 * Math.log10(this._peak + 1e-6),
        rms:      20 * Math.log10(rms + 1e-6),
      });
    }
    // Pass through
    const output = outputs[0];
    for (let c = 0; c < Math.min(input.length, output.length); c++) {
      if (output[c]) output[c].set(input[c]);
    }
    return true;
  }
}
registerProcessor('spx-meter', SPXMeterProcessor);
`;

// ── Gain Worklet (ultra-precise gain with smoothing) ──────────────────────
export const getGainWorkletSource = () => `
class SPXGainProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'gain', defaultValue: 1.0, minValue: 0, maxValue: 4 }];
  }
  constructor() { super(); this._smoothGain = 1.0; }
  process(inputs, outputs, parameters) {
    const input = inputs[0], output = outputs[0];
    if (!input || !input[0]) return true;
    const targetGain = parameters.gain[0] ?? 1.0;
    const coeff = 0.9995; // smoothing
    const numCh = Math.min(input.length, output.length);
    for (let i = 0; i < input[0].length; i++) {
      this._smoothGain = coeff * this._smoothGain + (1 - coeff) * targetGain;
      for (let c = 0; c < numCh; c++) {
        output[c][i] = input[c][i] * this._smoothGain;
      }
    }
    return true;
  }
}
registerProcessor('spx-gain', SPXGainProcessor);
`;

// ── Clip Detector Worklet ─────────────────────────────────────────────────
export const getClipDetectorWorkletSource = () => `
class SPXClipDetectorProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'threshold', defaultValue: 0.99, minValue: 0.5, maxValue: 1.0 }];
  }
  constructor() {
    super();
    this._clipping = false;
    this._clipCount = 0;
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0], output = outputs[0];
    if (!input || !input[0]) return true;
    const threshold = parameters.threshold[0] ?? 0.99;
    let clipping = false;
    for (let c = 0; c < input.length; c++) {
      const ch = input[c];
      for (let i = 0; i < ch.length; i++) {
        if (Math.abs(ch[i]) >= threshold) { clipping = true; this._clipCount++; }
        if (output[c]) output[c][i] = ch[i];
      }
    }
    if (clipping !== this._clipping) {
      this._clipping = clipping;
      this.port.postMessage({ clipping, clipCount: this._clipCount });
    }
    return true;
  }
}
registerProcessor('spx-clip-detector', SPXClipDetectorProcessor);
`;

// ── Loader utility ────────────────────────────────────────────────────────
export async function loadAllWorklets(audioContext) {
  const worklets = [
    { name: 'compressor',    src: getCompressorWorkletSource()    },
    { name: 'limiter',       src: getLimiterWorkletSource()       },
    { name: 'meter',         src: getMeterWorkletSource()         },
    { name: 'gain',          src: getGainWorkletSource()          },
    { name: 'clip-detector', src: getClipDetectorWorkletSource()  },
  ];

  const results = { loaded: [], failed: [] };

  for (const w of worklets) {
    try {
      const blob = new Blob([w.src], { type: 'application/javascript' });
      const url  = URL.createObjectURL(blob);
      await audioContext.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      results.loaded.push(w.name);
    } catch(e) {
      results.failed.push(w.name);
      console.warn(`[SPXWorklets] Failed to load ${w.name}:`, e);
    }
  }

  return results;
}
