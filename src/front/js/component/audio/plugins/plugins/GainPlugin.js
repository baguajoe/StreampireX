// =============================================================================
// GainPlugin.js — Gain / Trim Plugin
// =============================================================================
// Native GainNode. Simplest plugin — demonstrates the plugin interface.
// Params: gainDb (dB), phase (bool invert)
// =============================================================================

export const createGainPlugin = (context, initialParams = {}) => {
  const gainNode = context.createGain();
  const phaseNode = context.createGain();

  // Apply initial
  const dbToLinear = (db) => Math.pow(10, db / 20);
  gainNode.gain.value = dbToLinear(initialParams.gainDb ?? 0);
  phaseNode.gain.value = initialParams.phase ? -1 : 1;

  gainNode.connect(phaseNode);

  return {
    node: gainNode,
    inputNode: gainNode,
    outputNode: phaseNode,

    setParam: (paramId, value) => {
      switch (paramId) {
        case 'gainDb':
          gainNode.gain.setTargetAtTime(dbToLinear(value), context.currentTime, 0.01);
          break;
        case 'phase':
          phaseNode.gain.value = value ? -1 : 1;
          break;
      }
    },

    destroy: () => {
      try { gainNode.disconnect(); } catch (e) {}
      try { phaseNode.disconnect(); } catch (e) {}
    },
  };
};