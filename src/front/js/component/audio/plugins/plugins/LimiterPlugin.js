// =============================================================================
// LimiterPlugin.js — Limiter Plugin
// =============================================================================
// Uses DynamicsCompressorNode with very high ratio for brick-wall limiting.
// Drive gain pushes signal into the limiter for loudness.
// Params: ceiling (dB), release (ms), drive (dB)
// =============================================================================

export const createLimiterPlugin = (context, initialParams = {}) => {
  const ceilingDb = initialParams.ceiling ?? -0.3;
  const releaseMs = initialParams.release ?? 50;
  const driveDb = initialParams.drive ?? 0;

  const dbToLin = (db) => Math.pow(10, db / 20);

  const driveGain = context.createGain();
  driveGain.gain.value = dbToLin(driveDb);

  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = ceilingDb;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = releaseMs / 1000;

  driveGain.connect(limiter);

  return {
    node: driveGain,
    inputNode: driveGain,
    outputNode: limiter,

    setParam: (paramId, value) => {
      const t = context.currentTime;
      switch (paramId) {
        case 'ceiling':
          limiter.threshold.setTargetAtTime(value, t, 0.01);
          break;
        case 'release':
          limiter.release.setTargetAtTime(value / 1000, t, 0.01);
          break;
        case 'drive':
          driveGain.gain.setTargetAtTime(dbToLin(value), t, 0.01);
          break;
      }
    },

    getReduction: () => limiter.reduction || 0,

    destroy: () => {
      try { driveGain.disconnect(); } catch (e) {}
      try { limiter.disconnect(); } catch (e) {}
    },
  };
};