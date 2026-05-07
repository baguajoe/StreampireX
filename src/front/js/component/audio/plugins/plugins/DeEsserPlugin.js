// =============================================================================
// DeEsserPlugin.js — De-Esser Plugin
// =============================================================================
// Registry params: freq (Hz), threshold (dB), ratio (:1), speed (0..1).
// Approach: peaking-emphasis on sibilant band → DynamicsCompressor → output.
// Speed maps to attack/release time-constants (fast..slow).
// =============================================================================

export const createDeEsserPlugin = (context, initialParams = {}) => {
  const freqDef = Math.max(2000, Math.min(16000, Number.isFinite(initialParams.freq) ? initialParams.freq : (Number.isFinite(initialParams.frequency) ? initialParams.frequency : 7000)));
  const threshDb = Math.max(-40, Math.min(0, Number.isFinite(initialParams.threshold) ? initialParams.threshold : -20));
  const ratioDef = Math.max(1, Math.min(20, Number.isFinite(initialParams.ratio) ? initialParams.ratio : 3));
  const speedDef = Math.max(0, Math.min(1, Number.isFinite(initialParams.speed) ? initialParams.speed : 0.3));

  const inputGain = context.createGain();
  const outputGain = context.createGain();

  // Sibilant emphasis: +6 dB peaking at sibilant band makes comp trigger primarily on sibilants
  const bandFilter = context.createBiquadFilter();
  bandFilter.type = 'peaking';
  bandFilter.frequency.value = freqDef;
  bandFilter.Q.value = 2.0;
  bandFilter.gain.value = 6;

  const comp = context.createDynamicsCompressor();
  comp.threshold.value = threshDb;
  comp.ratio.value = ratioDef;
  // speed: 0 → slow (attack 20 ms, release 200 ms); 1 → fast (attack 0.1 ms, release 10 ms)
  comp.attack.value = (1 - speedDef) * 0.02 + 0.0001;
  comp.release.value = (1 - speedDef) * 0.2 + 0.01;
  comp.knee.value = 3;

  // Reverse-emphasis: attenuate band post-comp to compensate the +6 dB pre-emphasis
  const postCut = context.createBiquadFilter();
  postCut.type = 'peaking';
  postCut.frequency.value = freqDef;
  postCut.Q.value = 2.0;
  postCut.gain.value = -6;

  inputGain.connect(bandFilter);
  bandFilter.connect(comp);
  comp.connect(postCut);
  postCut.connect(outputGain);

  return {
    node: inputGain,
    inputNode: inputGain,
    outputNode: outputGain,

    setParam: (paramId, value) => {
      if (!Number.isFinite(value)) return;
      const t = context.currentTime;
      switch (paramId) {
        case 'freq':
        case 'frequency': {
          const c = Math.max(2000, Math.min(16000, value));
          bandFilter.frequency.setTargetAtTime(c, t, 0.01);
          postCut.frequency.setTargetAtTime(c, t, 0.01);
          break;
        }
        case 'threshold':
          comp.threshold.setTargetAtTime(Math.max(-40, Math.min(0, value)), t, 0.01);
          break;
        case 'ratio':
        case 'reduction':
          comp.ratio.setTargetAtTime(Math.max(1, Math.min(20, value)), t, 0.01);
          break;
        case 'speed': {
          const s = Math.max(0, Math.min(1, value));
          comp.attack.setTargetAtTime((1 - s) * 0.02 + 0.0001, t, 0.05);
          comp.release.setTargetAtTime((1 - s) * 0.2 + 0.01, t, 0.05);
          break;
        }
      }
    },

    getReduction: () => comp.reduction || 0,

    connect: d => outputGain.connect(d),
    disconnect: () => { try { outputGain.disconnect(); } catch(e){} },

    destroy: () => {
      [inputGain, bandFilter, comp, postCut, outputGain]
        .forEach(n => { try { n.disconnect(); } catch (e) {} });
    },
  };
};
