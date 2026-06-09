// =============================================================================
// BitDepthPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createBitDepthPlugin = (context, p = {}) => {
  const input = context.createGain(), output = context.createGain();
  const dryGain = context.createGain(), wetGain = context.createGain();
  const proc = context.createScriptProcessor(512, 1, 1);

  const clamp = (v, lo, hi, dflt) => {
    const n = Number.isFinite(v) ? v : dflt;
    return Math.max(lo, Math.min(hi, n));
  };

  let bits = clamp(p.bits, 1, 24, 24) | 0;        // default 24 = transparent
  let dither = clamp(p.dither, 0, 1, 0);

  proc.onaudioprocess = (e) => {
    const inp = e.inputBuffer.getChannelData(0);
    const out = e.outputBuffer.getChannelData(0);
    const levels = Math.pow(2, bits);
    const ditherAmt = dither / levels;
    for (let i = 0; i < inp.length; i++) {
      const noise = ditherAmt > 0 ? (Math.random() - 0.5) * ditherAmt : 0;
      out[i] = Math.round((inp[i] + noise) * levels) / levels;
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
        case 'bits':   bits = clamp(v, 1, 24, 24) | 0; break;
        case 'dither': dither = clamp(v, 0, 1, 0); break;
        case 'mix': {
          const m = clamp(v, 0, 100, 100) / 100;
          dryGain.gain.setTargetAtTime(1 - m, 0, 0.05);
          wetGain.gain.setTargetAtTime(m, 0, 0.05);
          break;
        }
      }
    },
    getState: () => ({ bits, dither, mix: wetGain.gain.value * 100 }),
    connect: d => output.connect(d),
    disconnect: () => { try { proc.disconnect(); } catch(_){} output.disconnect(); },
    destroy: () => {
      try { proc.onaudioprocess = null; } catch(_){}
      try { input.disconnect(); proc.disconnect(); dryGain.disconnect(); wetGain.disconnect(); output.disconnect(); } catch(_){}
    },
  };
};
