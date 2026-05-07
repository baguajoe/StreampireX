// =============================================================================
// AINoiseReducePlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createAINoiseReducePlugin = (context, p = {}) => {
  const input = context.createGain(), output = context.createGain();
  const dryGain = context.createGain(), wetGain = context.createGain();
  const lpf = context.createBiquadFilter(), hpf = context.createBiquadFilter();
  const gate = context.createDynamicsCompressor();

  const clamp = (v, lo, hi, dflt) => {
    const n = Number.isFinite(v) ? v : dflt;
    return Math.max(lo, Math.min(hi, n));
  };

  hpf.type = 'highpass'; hpf.frequency.value = 60;
  lpf.type = 'lowpass';  lpf.frequency.value = 18000;

  // gate (DynamicsCompressor as crude downward expander/gate)
  gate.threshold.value = clamp(p.threshold, -80, 0, -80);
  gate.knee.value      = 3;
  gate.ratio.value     = 1 + clamp(p.reduction, 0, 1, 0) * 19; // 1..20
  gate.attack.value    = 0.005;
  gate.release.value   = 0.05 + clamp(p.smoothing, 0, 1, 0.8) * 0.5; // 50..550 ms

  const mix0 = clamp(p.mix, 0, 100, 100) / 100;
  dryGain.gain.value = 1 - mix0;
  wetGain.gain.value = mix0;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(hpf); hpf.connect(lpf); lpf.connect(gate); gate.connect(wetGain); wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      switch (k) {
        case 'threshold': gate.threshold.setTargetAtTime(clamp(v, -80, 0, -80), 0, 0.05); break;
        case 'reduction': gate.ratio.setTargetAtTime(1 + clamp(v, 0, 1, 0) * 19, 0, 0.05); break;
        case 'smoothing': gate.release.setTargetAtTime(0.05 + clamp(v, 0, 1, 0.8) * 0.5, 0, 0.05); break;
        case 'mix': {
          const m = clamp(v, 0, 100, 100) / 100;
          dryGain.gain.setTargetAtTime(1 - m, 0, 0.05);
          wetGain.gain.setTargetAtTime(m, 0, 0.05);
          break;
        }
        // Back-compat
        case 'floor': gate.threshold.setTargetAtTime(clamp(v, -80, 0, -80), 0, 0.05); break;
        case 'hpf':   hpf.frequency.setTargetAtTime(clamp(v, 20, 1000, 60), 0, 0.01); break;
      }
    },
    getState: () => ({
      threshold: gate.threshold.value,
      reduction: (gate.ratio.value - 1) / 19,
      mix: wetGain.gain.value * 100,
    }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
    destroy: () => { try { input.disconnect(); hpf.disconnect(); lpf.disconnect(); gate.disconnect(); dryGain.disconnect(); wetGain.disconnect(); output.disconnect(); } catch(_){} },
  };
};
