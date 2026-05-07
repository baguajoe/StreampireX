// =============================================================================
// LoudnessMaximizerPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createLoudnessMaximizerPlugin = (context, p = {}) => {
  const input = context.createGain();
  const output = context.createGain();
  const comp = context.createDynamicsCompressor();
  const ceiling = context.createDynamicsCompressor();
  const makeup = context.createGain();

  // Registry params: ceiling (-3..0 dBTP), loudness (-24..0 LUFS), transient (0..1)
  const initCeiling = Number.isFinite(p.ceiling) ? p.ceiling : -0.3;
  const initLoudness = Number.isFinite(p.loudness) ? p.loudness : 0;
  const initTransient = Number.isFinite(p.transient) ? p.transient : 0.5;

  // "loudness" target acts as compressor threshold/makeup pair.
  // Lower (more negative) loudness = lower threshold + more makeup → louder.
  // Map: loudness=-24 → threshold=-24, makeup=+12dB; loudness=0 → threshold=0, makeup=0.
  comp.threshold.value = Math.max(-24, Math.min(0, initLoudness));
  comp.ratio.value = 10;
  comp.knee.value = 6;
  // transient knob → attack: 0 = fast (0.5ms preserves nothing), 1 = slow (50ms preserves transients)
  comp.attack.value = 0.0005 + Math.max(0, Math.min(1, initTransient)) * 0.05;
  comp.release.value = 0.08;

  // Makeup tied to loudness target
  const computeMakeup = (loudness) => {
    const c = Math.max(-24, Math.min(0, loudness));
    return Math.pow(10, (-c * 0.5) / 20); // half the threshold reduction as makeup
  };
  makeup.gain.value = computeMakeup(initLoudness);

  // Final ceiling/limiter
  ceiling.threshold.value = Math.max(-3, Math.min(0, initCeiling));
  ceiling.ratio.value = 20;
  ceiling.knee.value = 0;
  ceiling.attack.value = 0.001;
  ceiling.release.value = 0.1;

  input.connect(comp); comp.connect(makeup); makeup.connect(ceiling); ceiling.connect(output);

  let curLoudness = initLoudness;

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      const val = Number.isFinite(v) ? v : 0;
      if (k === 'ceiling') {
        const c = Math.max(-3, Math.min(0, val));
        ceiling.threshold.setTargetAtTime(c, 0, 0.01);
      }
      if (k === 'loudness') {
        const c = Math.max(-24, Math.min(0, val));
        curLoudness = c;
        comp.threshold.setTargetAtTime(c, 0, 0.01);
        makeup.gain.setTargetAtTime(computeMakeup(c), 0, 0.05);
      }
      if (k === 'transient') {
        const c = Math.max(0, Math.min(1, val));
        comp.attack.setTargetAtTime(0.0005 + c * 0.05, 0, 0.01);
      }
    },
    getState: () => ({
      ceiling: ceiling.threshold.value,
      loudness: curLoudness,
      transient: (comp.attack.value - 0.0005) / 0.05,
    }),
    connect: d => output.connect(d),
    disconnect: () => {
      try { output.disconnect(); } catch (e) {}
      try { input.disconnect(); } catch (e) {}
      try { comp.disconnect(); } catch (e) {}
      try { makeup.disconnect(); } catch (e) {}
      try { ceiling.disconnect(); } catch (e) {}
    },
  };
};
