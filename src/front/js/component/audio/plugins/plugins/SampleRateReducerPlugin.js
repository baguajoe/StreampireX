// =============================================================================
// SampleRateReducerPlugin.js — StreamPireX Audio Plugin
// Phase C3: Migrated from ScriptProcessorNode to AudioWorkletNode for
// sample-and-hold downsampling and optional bit-depth quantization. Falls
// back to a passthrough GainNode while the worklet module loads.
// =============================================================================

const SR_REDUCER_WORKLET_NAME = 'spx-sample-rate-reducer';

const getSampleRateReducerWorkletSource = () => `
class SampleRateReducerProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      // reduction = N samples held per output (1 = no reduction).
      { name: 'reduction', defaultValue: 4,  minValue: 1,  maxValue: 64, automationRate: 'k-rate' },
      // bits: target bit-depth (16 = effectively bypass for normal audio)
      { name: 'bits',      defaultValue: 16, minValue: 1,  maxValue: 16, automationRate: 'k-rate' },
    ];
  }
  constructor() {
    super();
    this._counter = 0;
    this._held = new Float32Array(32); // up to 32 channels
  }
  process(inputs, outputs, parameters) {
    const inp = inputs[0];
    const out = outputs[0];
    if (!out || !out[0]) return true;
    const reduction = Math.max(1, Math.round(parameters.reduction[0]));
    const bits = Math.max(1, Math.min(16, parameters.bits[0]));
    const levels = Math.pow(2, bits) - 1;
    const half = (levels - 1) / 2;

    const channels = out.length;
    const N = out[0].length;

    for (let i = 0; i < N; i++) {
      this._counter++;
      const refresh = this._counter >= reduction;
      if (refresh) this._counter = 0;
      for (let c = 0; c < channels; c++) {
        const inSample = (inp && inp[c]) ? inp[c][i] : 0;
        if (refresh) {
          // sample-and-hold + bit-quantize
          let q = inSample;
          if (bits < 16) {
            q = Math.round(q * half) / half;
          }
          this._held[c] = q;
        }
        out[c][i] = this._held[c] || 0;
      }
    }
    return true;
  }
}
registerProcessor('${SR_REDUCER_WORKLET_NAME}', SampleRateReducerProcessor);
`;

const ensureSrReducerWorklet = (context) => {
  if (!context._spxWorkletPromises) context._spxWorkletPromises = new Map();
  if (context._spxWorkletPromises.has(SR_REDUCER_WORKLET_NAME)) {
    return context._spxWorkletPromises.get(SR_REDUCER_WORKLET_NAME);
  }
  const promise = (async () => {
    try {
      const blob = new Blob([getSampleRateReducerWorkletSource()], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      try { await context.audioWorklet.addModule(url); }
      finally { URL.revokeObjectURL(url); }
      return true;
    } catch (e) {
      if (String(e && e.message || e).includes('already')) return true;
      console.warn('[SampleRateReducer] worklet load failed:', e);
      return false;
    }
  })();
  context._spxWorkletPromises.set(SR_REDUCER_WORKLET_NAME, promise);
  return promise;
};

export const createSampleRateReducerPlugin = (context, p = {}) => {
  const input  = context.createGain();
  const output = context.createGain();

  let reduction = Number.isFinite(p.reduction) ? Math.max(1, Math.round(p.reduction)) : 4;
  let bits      = Number.isFinite(p.bits) ? Math.max(1, Math.min(16, p.bits)) : 16;
  let workletNode = null;

  input.connect(output); // initial passthrough

  ensureSrReducerWorklet(context).then((ok) => {
    if (!ok) return;
    try {
      const node = new AudioWorkletNode(context, SR_REDUCER_WORKLET_NAME, {
        numberOfInputs: 1, numberOfOutputs: 1,
      });
      const apR = node.parameters.get('reduction'); if (apR) apR.value = reduction;
      const apB = node.parameters.get('bits');      if (apB) apB.value = bits;
      try { input.disconnect(); } catch {}
      input.connect(node);
      node.connect(output);
      workletNode = node;
    } catch (e) {
      console.warn('[SampleRateReducer] worklet instantiation failed, staying passthrough:', e);
    }
  }).catch(() => {});

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (k === 'reduction') {
        reduction = Math.max(1, Math.round(Number.isFinite(v) ? v : 4));
        if (workletNode) {
          const ap = workletNode.parameters.get('reduction');
          if (ap) ap.setTargetAtTime(reduction, context.currentTime, 0.005);
        }
      } else if (k === 'bits') {
        bits = Math.max(1, Math.min(16, Number.isFinite(v) ? v : 16));
        if (workletNode) {
          const ap = workletNode.parameters.get('bits');
          if (ap) ap.setTargetAtTime(bits, context.currentTime, 0.005);
        }
      }
    },
    getState: () => ({ reduction, bits }),
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

// ── SPECIAL TOOLS ──────────────────────────────────────────────────────────
