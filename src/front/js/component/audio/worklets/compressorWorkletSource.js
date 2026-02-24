// =============================================================================
// compressorWorkletSource.js — Compressor AudioWorkletProcessor Source
// =============================================================================
// Returns the source code string for the compressor worklet.
// This is loaded as a Blob URL by PluginHost.
// RMS-based level detection → gain computer → smooth envelope → apply gain
// =============================================================================

export const getCompressorWorkletSource = (processorName = 'spx-compressor') => `
class ${processorName.replace(/-/g, '_')}Processor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: -18, minValue: -60, maxValue: 0 },
      { name: 'ratio',     defaultValue: 4,   minValue: 1,   maxValue: 20 },
      { name: 'attack',    defaultValue: 10,  minValue: 0.1, maxValue: 200 },  // ms
      { name: 'release',   defaultValue: 150, minValue: 10,  maxValue: 2000 }, // ms
      { name: 'knee',      defaultValue: 6,   minValue: 0,   maxValue: 30 },   // dB
      { name: 'makeup',    defaultValue: 0,   minValue: 0,   maxValue: 24 },   // dB
    ];
  }

  constructor() {
    super();
    this._envDb = -100; // envelope state in dB
    this._rmsWindow = new Float32Array(512);
    this._rmsIdx = 0;
    this._rmsSum = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input[0]) return true;

    const numChannels = Math.min(input.length, output.length);
    const blockSize = input[0].length;

    const threshold = parameters.threshold[0] ?? -18;
    const ratio     = parameters.ratio[0] ?? 4;
    const attackMs  = parameters.attack[0] ?? 10;
    const releaseMs = parameters.release[0] ?? 150;
    const kneeDb    = parameters.knee[0] ?? 6;
    const makeupDb  = parameters.makeup[0] ?? 0;

    const attackCoeff  = Math.exp(-1.0 / (attackMs * 0.001 * sampleRate));
    const releaseCoeff = Math.exp(-1.0 / (releaseMs * 0.001 * sampleRate));
    const makeupLin    = Math.pow(10, makeupDb / 20);
    const halfKnee     = kneeDb / 2;

    for (let i = 0; i < blockSize; i++) {
      // Sum channels for detection (mono sum)
      let sum = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        sum += input[ch][i];
      }
      const mono = sum / numChannels;

      // RMS
      const old = this._rmsWindow[this._rmsIdx];
      this._rmsSum -= old * old;
      this._rmsWindow[this._rmsIdx] = mono;
      this._rmsSum += mono * mono;
      this._rmsIdx = (this._rmsIdx + 1) % this._rmsWindow.length;
      const rms = Math.sqrt(Math.max(0, this._rmsSum / this._rmsWindow.length));

      // Convert to dB
      const inputDb = rms > 1e-10 ? 20 * Math.log10(rms) : -100;

      // Gain computer with soft knee
      let gainReductionDb = 0;
      if (kneeDb <= 0) {
        // Hard knee
        if (inputDb > threshold) {
          gainReductionDb = (inputDb - threshold) * (1 - 1 / ratio);
        }
      } else {
        // Soft knee
        if (inputDb > threshold + halfKnee) {
          gainReductionDb = (inputDb - threshold) * (1 - 1 / ratio);
        } else if (inputDb > threshold - halfKnee) {
          const x = inputDb - threshold + halfKnee;
          gainReductionDb = (x * x) / (2 * kneeDb) * (1 - 1 / ratio);
        }
      }

      // Envelope follower (attack/release)
      const targetDb = -gainReductionDb;
      const coeff = targetDb < this._envDb ? attackCoeff : releaseCoeff;
      this._envDb = coeff * this._envDb + (1 - coeff) * targetDb;

      // Apply gain
      const gainLin = Math.pow(10, this._envDb / 20) * makeupLin;
      for (let ch = 0; ch < numChannels; ch++) {
        output[ch][i] = input[ch][i] * gainLin;
      }
    }

    return true;
  }
}

registerProcessor('${processorName}', ${processorName.replace(/-/g, '_')}Processor);
`;

export default getCompressorWorkletSource;