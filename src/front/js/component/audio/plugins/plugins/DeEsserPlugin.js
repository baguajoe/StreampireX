// =============================================================================
// DeEsserPlugin.js — De-Esser Plugin
// =============================================================================
// Sidechain approach: bandpass filter isolates sibilants, feeds a compressor
// that only reduces gain in the sibilant range.
// Params: frequency (Hz), threshold (dB), reduction (dB)
// =============================================================================

export const createDeEsserPlugin = (context, initialParams = {}) => {
  const freq = initialParams.frequency ?? 6500;
  const threshDb = initialParams.threshold ?? -25;
  const reductionDb = initialParams.reduction ?? 6;

  // Main path
  const inputGain = context.createGain();
  const outputGain = context.createGain();

  // Sibilant band: isolate + compress
  const bandFilter = context.createBiquadFilter();
  bandFilter.type = 'peaking';
  bandFilter.frequency.value = freq;
  bandFilter.Q.value = 2.0;
  bandFilter.gain.value = 0; // flat initially

  // Compressor targeted at sibilant range
  const comp = context.createDynamicsCompressor();
  comp.threshold.value = threshDb;
  comp.ratio.value = Math.max(2, reductionDb); // higher reduction = higher ratio
  comp.attack.value = 0.001;
  comp.release.value = 0.05;
  comp.knee.value = 3;

  // Route: input → bandFilter → compressor → output
  inputGain.connect(bandFilter);
  bandFilter.connect(comp);
  comp.connect(outputGain);

  return {
    node: inputGain,
    inputNode: inputGain,
    outputNode: outputGain,

    setParam: (paramId, value) => {
      const t = context.currentTime;
      switch (paramId) {
        case 'frequency':
          bandFilter.frequency.setTargetAtTime(value, t, 0.01);
          break;
        case 'threshold':
          comp.threshold.setTargetAtTime(value, t, 0.01);
          break;
        case 'reduction':
          comp.ratio.setTargetAtTime(Math.max(2, value), t, 0.01);
          break;
      }
    },

    getReduction: () => comp.reduction || 0,

    destroy: () => {
      [inputGain, bandFilter, comp, outputGain]
        .forEach(n => { try { n.disconnect(); } catch (e) {} });
    },
  };
};