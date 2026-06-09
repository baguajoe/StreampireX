// =============================================================================
// AIVocalCleanPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createAIVocalCleanPlugin = (context, p = {}) => {
  const input = context.createGain(), output = context.createGain();
  const dryGain = context.createGain(), wetGain = context.createGain();
  const hpf = context.createBiquadFilter();
  const deess = context.createBiquadFilter();
  const comp = context.createDynamicsCompressor();
  const presence = context.createBiquadFilter();

  const clamp = (v, lo, hi, dflt) => {
    const n = Number.isFinite(v) ? v : dflt;
    return Math.max(lo, Math.min(hi, n));
  };

  // denoise 0..1 → comp threshold -10..-30 dB. Ratio 1..6 so denoise=0 leaves
  // ratio=1 (no compression). Avoids unwanted dynamics squashing at zero denoise.
  const denoiseToThresh = (v) => -10 - clamp(v, 0, 1, 0) * 20;
  const denoiseToRatio  = (v) => 1 + clamp(v, 0, 1, 0) * 5;
  // debreath 0..1 → hpf 60..200 Hz
  const debreathToHpf  = (v) => 60 + clamp(v, 0, 1, 0) * 140;
  // declick 0..1 → deess peaking gain 0..-9 dB at 8 kHz
  const declickToDeessDb = (v) => -clamp(v, 0, 1, 0) * 9;

  hpf.type = 'highpass';
  hpf.frequency.value = debreathToHpf(p.debreath ?? 0);

  deess.type = 'peaking';
  deess.frequency.value = 8000;
  deess.gain.value = declickToDeessDb(p.declick ?? 0);
  deess.Q.value = 3;

  comp.threshold.value = denoiseToThresh(p.denoise ?? 0);
  comp.ratio.value     = denoiseToRatio(p.denoise ?? 0);
  comp.knee.value      = 6;
  comp.attack.value    = 0.005;
  comp.release.value   = 0.1;

  presence.type = 'peaking'; presence.frequency.value = 3500; presence.gain.value = 0; presence.Q.value = 1;

  const mix0 = clamp(p.mix, 0, 100, 100) / 100;
  dryGain.gain.value = 1 - mix0;
  wetGain.gain.value = mix0;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(hpf); hpf.connect(deess); deess.connect(comp); comp.connect(presence); presence.connect(wetGain); wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      switch (k) {
        case 'denoise':
          comp.threshold.setTargetAtTime(denoiseToThresh(v), 0, 0.05);
          comp.ratio.setTargetAtTime(denoiseToRatio(v), 0, 0.05);
          break;
        case 'debreath': hpf.frequency.setTargetAtTime(debreathToHpf(v), 0, 0.05); break;
        case 'declick':  deess.gain.setTargetAtTime(declickToDeessDb(v), 0, 0.05); break;
        case 'mix': {
          const m = clamp(v, 0, 100, 100) / 100;
          dryGain.gain.setTargetAtTime(1 - m, 0, 0.05);
          wetGain.gain.setTargetAtTime(m, 0, 0.05);
          break;
        }
        // Back-compat
        case 'deess':    deess.gain.setTargetAtTime(-Math.abs(clamp(v, -24, 24, 0)), 0, 0.01); break;
        case 'presence': presence.gain.setTargetAtTime(clamp(v, -12, 12, 0), 0, 0.01); break;
      }
    },
    getState: () => ({
      denoise: (comp.threshold.value + 10) / -20,
      debreath: (hpf.frequency.value - 60) / 140,
      declick: -deess.gain.value / 9,
      mix: wetGain.gain.value * 100,
    }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
    destroy: () => { try { input.disconnect(); hpf.disconnect(); deess.disconnect(); comp.disconnect(); presence.disconnect(); dryGain.disconnect(); wetGain.disconnect(); output.disconnect(); } catch(_){} },
  };
};
