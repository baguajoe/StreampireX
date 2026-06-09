// =============================================================================
// LooperPlugin.js — StreamPireX Audio Plugin
// Phase C3: Migrated from ScriptProcessorNode to AudioWorkletNode.
// Record/play/overdub state is set via port.postMessage; mix/speed/feedback
// are AudioParams. Falls back to a passthrough GainNode while the worklet
// module loads.
// =============================================================================

const LOOPER_WORKLET_NAME = 'spx-looper';

const getLooperWorkletSource = () => `
class LooperProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'mix',      defaultValue: 1.0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'speed',    defaultValue: 1.0, minValue: 0.25, maxValue: 4, automationRate: 'k-rate' },
      { name: 'feedback', defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }
  constructor() {
    super();
    this._maxLen = sampleRate * 30; // 30s max loop
    this._buf = new Float32Array(this._maxLen);
    this._writeIdx = 0;     // record write position
    this._loopLen = 0;      // committed loop length in samples
    this._playPos = 0;      // float playhead for resampling
    this._mode = 'idle';    // 'idle' | 'record' | 'play' | 'overdub'

    this.port.onmessage = (e) => {
      const msg = e.data || {};
      switch (msg.cmd) {
        case 'record':
          this._mode = 'record';
          this._writeIdx = 0;
          this._loopLen = 0;
          break;
        case 'stopRecord':
          this._loopLen = this._writeIdx;
          this._mode = 'idle';
          break;
        case 'play':
          if (this._loopLen > 0) {
            this._mode = 'play';
            this._playPos = 0;
          }
          break;
        case 'stop':
          this._mode = 'idle';
          break;
        case 'overdub':
          if (this._loopLen > 0) {
            this._mode = 'overdub';
            this._playPos = 0;
          }
          break;
        case 'clear':
          this._loopLen = 0;
          this._writeIdx = 0;
          this._playPos = 0;
          this._mode = 'idle';
          this._buf.fill(0);
          break;
      }
    };
  }
  process(inputs, outputs, parameters) {
    const inp = inputs[0];
    const out = outputs[0];
    if (!out || !out[0]) return true;
    const inpCh = (inp && inp[0]) ? inp[0] : null;
    const outCh = out[0];
    const N = outCh.length;
    const mix = parameters.mix[0];
    const speed = parameters.speed[0];
    const feedback = parameters.feedback[0];

    for (let i = 0; i < N; i++) {
      const dry = inpCh ? inpCh[i] : 0;
      let wet = 0;

      if (this._mode === 'record') {
        if (this._writeIdx < this._maxLen) {
          this._buf[this._writeIdx++] = dry;
        } else {
          // auto-stop at max
          this._loopLen = this._writeIdx;
          this._mode = 'idle';
        }
        wet = dry; // monitor dry while recording
      } else if (this._mode === 'play' || this._mode === 'overdub') {
        if (this._loopLen > 0) {
          // Linear-interpolated read at speed
          const idx = this._playPos;
          const i0 = Math.floor(idx) % this._loopLen;
          const i1 = (i0 + 1) % this._loopLen;
          const f = idx - Math.floor(idx);
          wet = this._buf[i0] * (1 - f) + this._buf[i1] * f;

          if (this._mode === 'overdub') {
            // mix incoming with existing buffer scaled by feedback
            this._buf[i0] = this._buf[i0] * feedback + dry;
          }
          this._playPos += speed;
          if (this._playPos >= this._loopLen) this._playPos -= this._loopLen;
          if (this._playPos < 0) this._playPos += this._loopLen;
        }
      }

      outCh[i] = dry + wet * mix;
    }

    for (let c = 1; c < out.length; c++) out[c].set(outCh);
    return true;
  }
}
registerProcessor('${LOOPER_WORKLET_NAME}', LooperProcessor);
`;

const ensureLooperWorklet = (context) => {
  if (!context._spxWorkletPromises) context._spxWorkletPromises = new Map();
  if (context._spxWorkletPromises.has(LOOPER_WORKLET_NAME)) {
    return context._spxWorkletPromises.get(LOOPER_WORKLET_NAME);
  }
  const promise = (async () => {
    try {
      const blob = new Blob([getLooperWorkletSource()], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      try { await context.audioWorklet.addModule(url); }
      finally { URL.revokeObjectURL(url); }
      return true;
    } catch (e) {
      if (String(e && e.message || e).includes('already')) return true;
      console.warn('[Looper] worklet load failed:', e);
      return false;
    }
  })();
  context._spxWorkletPromises.set(LOOPER_WORKLET_NAME, promise);
  return promise;
};

export const createLooperPlugin = (context, p = {}) => {
  const input  = context.createGain();
  const output = context.createGain();

  let workletNode = null;
  let pending = {
    mix: 1.0,
    speed: Number.isFinite(p.speed) ? p.speed : 1.0,
    feedback: Number.isFinite(p.feedback) ? p.feedback : 0.5,
  };
  let pendingCmds = [];
  let recording = false, playing = false;

  // Bypass: input -> output until worklet ready
  input.connect(output);

  ensureLooperWorklet(context).then((ok) => {
    if (!ok) return;
    try {
      const node = new AudioWorkletNode(context, LOOPER_WORKLET_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      // apply pending params
      ['mix', 'speed', 'feedback'].forEach(name => {
        const ap = node.parameters.get(name);
        if (ap) ap.setTargetAtTime(pending[name], context.currentTime, 0.01);
      });
      // flush queued cmds
      pendingCmds.forEach(cmd => { try { node.port.postMessage(cmd); } catch {} });
      pendingCmds = [];

      // Replace bypass: input -> worklet -> output
      try { input.disconnect(); } catch {}
      input.connect(node);
      node.connect(output);
      workletNode = node;
    } catch (e) {
      console.warn('[Looper] worklet instantiation failed, staying passthrough:', e);
    }
  }).catch(() => {});

  const sendCmd = (cmd) => {
    if (workletNode) {
      try { workletNode.port.postMessage(cmd); } catch {}
    } else {
      pendingCmds.push(cmd);
    }
  };

  const setAP = (name, val) => {
    pending[name] = val;
    if (workletNode) {
      const ap = workletNode.parameters.get(name);
      if (ap) ap.setTargetAtTime(val, context.currentTime, 0.01);
    }
  };

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (k === 'record') {
        if (v) { recording = true;  sendCmd({ cmd: 'record' }); }
        else   { recording = false; sendCmd({ cmd: 'stopRecord' }); }
      }
      else if (k === 'play') {
        if (v) { playing = true;  sendCmd({ cmd: 'play' }); }
        else   { playing = false; sendCmd({ cmd: 'stop' }); }
      }
      else if (k === 'overdub') {
        if (v) sendCmd({ cmd: 'overdub' });
        else   sendCmd({ cmd: 'play' });
      }
      else if (k === 'clear') {
        recording = false; playing = false;
        sendCmd({ cmd: 'clear' });
      }
      else if (k === 'mix' || k === 'speed' || k === 'feedback') {
        const safe = Number.isFinite(v) ? v : pending[k];
        setAP(k, safe);
      }
    },
    getState: () => ({ recording, playing, ...pending }),
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
