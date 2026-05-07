// =============================================================================
// GranularFreezePlugin.js — StreamPireX Audio Plugin
// Phase C3: Migrated from ScriptProcessorNode to AudioWorkletNode for
// sample-accurate grain scheduling and lower latency. Falls back to a
// passthrough GainNode while the worklet module loads.
// =============================================================================

const GRANULAR_FREEZE_WORKLET_NAME = 'spx-granular-freeze';

const getGranularFreezeWorkletSource = () => `
class GranularFreezeProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'grainSize', defaultValue: 80,  minValue: 10,   maxValue: 500,  automationRate: 'k-rate' },
      { name: 'density',   defaultValue: 0.7, minValue: 0,    maxValue: 1,    automationRate: 'k-rate' },
      { name: 'pitch',     defaultValue: 0,   minValue: -24,  maxValue: 24,   automationRate: 'k-rate' },
      { name: 'spread',    defaultValue: 0.5, minValue: 0,    maxValue: 1,    automationRate: 'k-rate' },
      { name: 'mix',       defaultValue: 0.8, minValue: 0,    maxValue: 1,    automationRate: 'k-rate' },
      { name: 'freeze',    defaultValue: 0,   minValue: 0,    maxValue: 1,    automationRate: 'k-rate' },
    ];
  }
  constructor() {
    super();
    this._sr = sampleRate;
    this._captureLen = Math.floor(this._sr * 3);
    this._captureBuf = new Float32Array(this._captureLen);
    this._writePos = 0;
    this._grainPos = 0;
    this._grainStart = 0;
    this._grainLen = 0;
    this._grainIdx = 0;
    this._grainActive = false;
  }
  _startGrain(grainSizeMs, spread) {
    const grainLen = Math.max(64, Math.floor(this._sr * (grainSizeMs / 1000)));
    const spreadOffset = Math.floor((Math.random() - 0.5) * spread * this._captureLen);
    const start = ((this._writePos - grainLen + spreadOffset) % this._captureLen + this._captureLen) % this._captureLen;
    this._grainStart = start;
    this._grainPos = start;
    this._grainLen = grainLen;
    this._grainIdx = 0;
    this._grainActive = true;
  }
  process(inputs, outputs, parameters) {
    const inp = inputs[0];
    const out = outputs[0];
    if (!out || !out[0]) return true;

    const inpCh = (inp && inp[0]) ? inp[0] : null;
    const outCh = out[0];
    const N = outCh.length;

    const grainSizeMs = parameters.grainSize[0];
    const density     = parameters.density[0];
    const pitchSt     = parameters.pitch[0];
    const spread      = parameters.spread[0];
    const mix         = parameters.mix[0];
    const freeze      = parameters.freeze[0];

    const rate = Math.pow(2, pitchSt / 12);
    const triggerProb = Math.max(0, Math.min(1, density));

    for (let i = 0; i < N; i++) {
      // Always capture incoming audio (unless frozen we still capture, identical to legacy)
      const dry = inpCh ? inpCh[i] : 0;
      if (freeze < 0.5) {
        this._captureBuf[this._writePos] = dry;
      }
      this._writePos = (this._writePos + 1) % this._captureLen;

      if (!this._grainActive) {
        if (Math.random() < triggerProb / 64) {
          this._startGrain(grainSizeMs, spread);
        }
      }

      let wet = 0;
      if (this._grainActive) {
        const idx = this._grainPos;
        const i0 = Math.floor(idx) % this._captureLen;
        const i1 = (i0 + 1) % this._captureLen;
        const f = idx - Math.floor(idx);
        const s = this._captureBuf[i0] * (1 - f) + this._captureBuf[i1] * f;
        const env = 0.5 * (1 - Math.cos(2 * Math.PI * this._grainIdx / Math.max(1, this._grainLen)));
        wet = s * env;
        this._grainPos += rate;
        if (this._grainPos >= this._captureLen) this._grainPos -= this._captureLen;
        if (this._grainPos < 0) this._grainPos += this._captureLen;
        this._grainIdx++;
        if (this._grainIdx >= this._grainLen) this._grainActive = false;
      }

      outCh[i] = dry * (1 - mix) + wet * mix;
    }

    // mirror to additional channels (mono->multi)
    for (let c = 1; c < out.length; c++) {
      out[c].set(outCh);
    }
    return true;
  }
}
registerProcessor('${GRANULAR_FREEZE_WORKLET_NAME}', GranularFreezeProcessor);
`;

// Per-context cache of pending/loaded worklet registrations
const ensureGranularFreezeWorklet = (context) => {
  if (!context._spxWorkletPromises) context._spxWorkletPromises = new Map();
  if (context._spxWorkletPromises.has(GRANULAR_FREEZE_WORKLET_NAME)) {
    return context._spxWorkletPromises.get(GRANULAR_FREEZE_WORKLET_NAME);
  }
  const p = (async () => {
    try {
      const blob = new Blob([getGranularFreezeWorkletSource()], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      try {
        await context.audioWorklet.addModule(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      return true;
    } catch (e) {
      // Already-registered errors are benign; other errors mean we'll fall back to passthrough
      if (String(e && e.message || e).includes('already')) return true;
      console.warn('[GranularFreeze] worklet load failed:', e);
      return false;
    }
  })();
  context._spxWorkletPromises.set(GRANULAR_FREEZE_WORKLET_NAME, p);
  return p;
};

export const createGranularFreezePlugin = (context, p = {}) => {
  const input  = context.createGain();
  const output = context.createGain();

  // Initial state
  let grainSizeMs = Number.isFinite(p.grainSize) ? p.grainSize : 80;
  let density     = Number.isFinite(p.density)   ? p.density   : 0.7;
  let pitchSt     = Number.isFinite(p.pitch)     ? p.pitch     : 0;
  let spread      = Number.isFinite(p.spread)    ? p.spread    : 0.5;
  let mixPct      = Number.isFinite(p.mix)       ? p.mix       : 80;

  let workletNode = null;
  let pendingParams = {
    grainSize: grainSizeMs, density, pitch: pitchSt, spread,
    mix: Math.max(0, Math.min(100, mixPct)) / 100, freeze: 0,
  };

  // Initial passthrough wiring (input -> output) until worklet loads
  let bypassConnected = false;
  const connectBypass = () => {
    try { input.disconnect(); } catch {}
    input.connect(output);
    bypassConnected = true;
  };
  connectBypass();

  ensureGranularFreezeWorklet(context).then((ok) => {
    if (!ok) return; // stay in passthrough mode
    try {
      const node = new AudioWorkletNode(context, GRANULAR_FREEZE_WORKLET_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      // Apply pending params
      const applyAP = (name, val) => {
        const ap = node.parameters.get(name);
        if (ap) ap.setTargetAtTime(val, context.currentTime, 0.01);
      };
      applyAP('grainSize', pendingParams.grainSize);
      applyAP('density',   pendingParams.density);
      applyAP('pitch',     pendingParams.pitch);
      applyAP('spread',    pendingParams.spread);
      applyAP('mix',       pendingParams.mix);
      applyAP('freeze',    pendingParams.freeze);

      // Swap: input -> worklet -> output
      try { input.disconnect(); } catch {}
      input.connect(node);
      node.connect(output);
      bypassConnected = false;
      workletNode = node;
    } catch (e) {
      console.warn('[GranularFreeze] worklet instantiation failed, staying passthrough:', e);
    }
  }).catch(() => {});

  const setAudioParam = (name, value) => {
    pendingParams[name] = value;
    if (workletNode) {
      const ap = workletNode.parameters.get(name);
      if (ap) ap.setTargetAtTime(value, context.currentTime, 0.01);
    }
  };

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      const safe = Number.isFinite(v) ? v : 0;
      if (k === 'grainSize') { grainSizeMs = Math.max(10, Math.min(500, safe)); setAudioParam('grainSize', grainSizeMs); }
      else if (k === 'density') { density = Math.max(0.1, Math.min(1, safe)); setAudioParam('density', density); }
      else if (k === 'pitch') { pitchSt = Math.max(-24, Math.min(24, safe)); setAudioParam('pitch', pitchSt); }
      else if (k === 'spread') { spread = Math.max(0, Math.min(1, safe)); setAudioParam('spread', spread); }
      else if (k === 'mix') {
        const c = Math.max(0, Math.min(100, safe));
        mixPct = c;
        setAudioParam('mix', c / 100);
      }
      else if (k === 'freeze') {
        // Legacy: freeze gates capture; also pin density to 1 when frozen
        setAudioParam('freeze', v ? 1 : 0);
        if (v) { density = 1; setAudioParam('density', 1); }
      }
    },
    getState: () => ({ grainSize: grainSizeMs, density, pitch: pitchSt, spread, mix: mixPct }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
    destroy: () => {
      try { if (workletNode) workletNode.disconnect(); } catch {}
      try { input.disconnect(); } catch {}
      try { output.disconnect(); } catch {}
      workletNode = null;
    },
  };
};
