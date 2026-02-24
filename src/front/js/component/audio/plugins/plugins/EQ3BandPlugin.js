// =============================================================================
// EQ3BandPlugin.js — 3-Band EQ Plugin
// =============================================================================
// Uses 3 BiquadFilterNodes: lowshelf, peaking (mid), highshelf
// Params: lowFreq, lowGain, midFreq, midGain, midQ, highFreq, highGain
// =============================================================================

export const createEQ3BandPlugin = (context, initialParams = {}) => {
  const low = context.createBiquadFilter();
  low.type = 'lowshelf';
  low.frequency.value = initialParams.lowFreq ?? 150;
  low.gain.value = initialParams.lowGain ?? 0;

  const mid = context.createBiquadFilter();
  mid.type = 'peaking';
  mid.frequency.value = initialParams.midFreq ?? 1000;
  mid.gain.value = initialParams.midGain ?? 0;
  mid.Q.value = initialParams.midQ ?? 1.4;

  const high = context.createBiquadFilter();
  high.type = 'highshelf';
  high.frequency.value = initialParams.highFreq ?? 8000;
  high.gain.value = initialParams.highGain ?? 0;

  low.connect(mid);
  mid.connect(high);

  return {
    node: low,
    inputNode: low,
    outputNode: high,

    setParam: (paramId, value) => {
      const t = context.currentTime;
      switch (paramId) {
        case 'lowFreq':  low.frequency.setTargetAtTime(value, t, 0.01); break;
        case 'lowGain':  low.gain.setTargetAtTime(value, t, 0.01); break;
        case 'midFreq':  mid.frequency.setTargetAtTime(value, t, 0.01); break;
        case 'midGain':  mid.gain.setTargetAtTime(value, t, 0.01); break;
        case 'midQ':     mid.Q.setTargetAtTime(value, t, 0.01); break;
        case 'highFreq': high.frequency.setTargetAtTime(value, t, 0.01); break;
        case 'highGain': high.gain.setTargetAtTime(value, t, 0.01); break;
      }
    },

    // Expose nodes for EQ graph visualization
    getNodes: () => ({ low, mid, high }),

    destroy: () => {
      try { low.disconnect(); } catch (e) {}
      try { mid.disconnect(); } catch (e) {}
      try { high.disconnect(); } catch (e) {}
    },
  };
};