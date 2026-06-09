// =============================================================================
// AIDeRoomPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createAIDeRoomPlugin = (context, p = {}) => {
  const input = context.createGain(), output = context.createGain();
  const dryGain = context.createGain(), wetGain = context.createGain();
  const comp = context.createDynamicsCompressor(), filter = context.createBiquadFilter();

  const clamp = (v, lo, hi, dflt) => {
    const n = Number.isFinite(v) ? v : dflt;
    return Math.max(lo, Math.min(hi, n));
  };

  // reduction 0..1 → -24..0 dB peaking cut (audibly meaningful)
  const reductionToDb = (v) => -clamp(v, 0, 1, 0) * 24;
  // sensitivity 0..1 → -60..-10 dB compressor threshold
  const sensitivityToThresh = (v) => -60 + clamp(v, 0, 1, 0) * 50;

  filter.type = 'peaking';
  filter.frequency.value = clamp(p.freq, 200, 2000, 400);
  filter.gain.value = reductionToDb(p.reduction ?? 0);
  filter.Q.value = 0.5;

  comp.threshold.value = sensitivityToThresh(p.sensitivity ?? 0);
  comp.ratio.value = 4;
  comp.knee.value = 6;
  comp.attack.value = 0.001;
  comp.release.value = 0.05;

  const mix0 = clamp(p.mix, 0, 100, 100) / 100;
  dryGain.gain.value = 1 - mix0;
  wetGain.gain.value = mix0;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(filter); filter.connect(comp); comp.connect(wetGain); wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      switch (k) {
        case 'reduction':   filter.gain.setTargetAtTime(reductionToDb(v), 0, 0.05); break;
        case 'sensitivity': comp.threshold.setTargetAtTime(sensitivityToThresh(v), 0, 0.05); break;
        case 'freq':        filter.frequency.setTargetAtTime(clamp(v, 200, 2000, 400), 0, 0.01); break;
        case 'mix': {
          const m = clamp(v, 0, 100, 100) / 100;
          dryGain.gain.setTargetAtTime(1 - m, 0, 0.05);
          wetGain.gain.setTargetAtTime(m, 0, 0.05);
          break;
        }
      }
    },
    getState: () => ({
      reduction: -filter.gain.value / 24,
      freq: filter.frequency.value,
      mix: wetGain.gain.value * 100,
    }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
    destroy: () => { try { input.disconnect(); filter.disconnect(); comp.disconnect(); dryGain.disconnect(); wetGain.disconnect(); output.disconnect(); } catch(_){} },
  };
};
