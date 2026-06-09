// =============================================================================
// BitcrusherPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createBitcrusherPlugin = (context, p = {}) => {
  const input = context.createGain(), output = context.createGain();
  const dryGain = context.createGain(), wetGain = context.createGain();
  const proc = context.createScriptProcessor(1024, 1, 1);

  const clamp = (v, lo, hi, dflt) => {
    const n = Number.isFinite(v) ? v : dflt;
    return Math.max(lo, Math.min(hi, n));
  };

  // rate: 1.0 = no decimation, 0.01 = heavy decimation. sampleReduction = round(1/rate).
  const rateToSR = (r) => Math.max(1, Math.round(1 / Math.max(0.01, clamp(r, 0.01, 1, 1))));

  let bits = clamp(p.bits, 1, 16, 16) | 0;       // default 16 = clean
  let sampleReduction = rateToSR(p.rate ?? 1);   // default rate 1 = no decimation
  let lastSample = 0, counter = 0;

  proc.onaudioprocess = (e) => {
    const inp = e.inputBuffer.getChannelData(0);
    const out = e.outputBuffer.getChannelData(0);
    const step = Math.pow(0.5, bits - 1);
    for (let i = 0; i < inp.length; i++) {
      counter++;
      if (counter >= sampleReduction) {
        lastSample = step * Math.floor(inp[i] / step + 0.5);
        counter = 0;
      }
      out[i] = lastSample;
    }
  };

  const mix0 = clamp(p.mix, 0, 100, 100) / 100;
  dryGain.gain.value = 1 - mix0;
  wetGain.gain.value = mix0;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(proc); proc.connect(wetGain); wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      switch (k) {
        case 'bits': bits = clamp(v, 1, 16, 16) | 0; break;
        case 'rate': sampleReduction = rateToSR(v); break;
        case 'sampleReduction': sampleReduction = Math.max(1, Math.round(clamp(v, 1, 100, 1))); break;
        case 'mix': {
          const m = clamp(v, 0, 100, 100) / 100;
          dryGain.gain.setTargetAtTime(1 - m, 0, 0.05);
          wetGain.gain.setTargetAtTime(m, 0, 0.05);
          break;
        }
      }
    },
    getState: () => ({ bits, rate: 1 / sampleReduction, mix: wetGain.gain.value * 100 }),
    connect: d => output.connect(d),
    disconnect: () => { try { proc.disconnect(); } catch(_){} output.disconnect(); },
    destroy: () => {
      try { proc.onaudioprocess = null; } catch(_){}
      try { input.disconnect(); proc.disconnect(); dryGain.disconnect(); wetGain.disconnect(); output.disconnect(); } catch(_){}
    },
  };
};
