// =============================================================================
// CompressorPlugin.js — Compressor Plugin (AudioWorklet)
// =============================================================================
// Uses custom AudioWorkletProcessor for proper RMS detection + gain computer.
// Falls back to native DynamicsCompressorNode if worklet fails to load.
// Params: threshold, ratio, attack, release, knee, makeup
// =============================================================================

export const createCompressorPlugin = (context, initialParams = {}) => {
  // Try AudioWorkletNode first, fall back to native
  let node, inputNode, outputNode;
  let useWorklet = false;

  try {
    // Check if worklet processor is registered (loaded by PluginHost)
    node = new AudioWorkletNode(context, 'spx-compressor', {
      parameterData: {
        threshold: initialParams.threshold ?? -18,
        ratio: initialParams.ratio ?? 4,
        attack: initialParams.attack ?? 10,
        release: initialParams.release ?? 150,
        knee: initialParams.knee ?? 6,
        makeup: initialParams.makeup ?? 0,
      },
    });
    inputNode = node;
    outputNode = node;
    useWorklet = true;
  } catch (e) {
    // Fallback to native DynamicsCompressorNode
    console.warn('[CompressorPlugin] Worklet unavailable, using native fallback:', e.message);
    const comp = context.createDynamicsCompressor();
    comp.threshold.value = initialParams.threshold ?? -18;
    comp.ratio.value = initialParams.ratio ?? 4;
    comp.attack.value = (initialParams.attack ?? 10) / 1000;
    comp.release.value = (initialParams.release ?? 150) / 1000;
    comp.knee.value = initialParams.knee ?? 6;

    const makeupGain = context.createGain();
    const dbToLin = (db) => Math.pow(10, db / 20);
    makeupGain.gain.value = dbToLin(initialParams.makeup ?? 0);

    comp.connect(makeupGain);

    node = comp;
    inputNode = comp;
    outputNode = makeupGain;

    // Store refs for setParam
    node._spxMakeup = makeupGain;
  }

  return {
    node,
    inputNode,
    outputNode,

    setParam: (paramId, value) => {
      if (useWorklet && node.parameters) {
        const param = node.parameters.get(paramId);
        if (param) param.setTargetAtTime(value, context.currentTime, 0.01);
      } else {
        // Native fallback
        const t = context.currentTime;
        switch (paramId) {
          case 'threshold': node.threshold.setTargetAtTime(value, t, 0.01); break;
          case 'ratio':     node.ratio.setTargetAtTime(value, t, 0.01); break;
          case 'attack':    node.attack.setTargetAtTime(value / 1000, t, 0.01); break;
          case 'release':   node.release.setTargetAtTime(value / 1000, t, 0.01); break;
          case 'knee':      node.knee.setTargetAtTime(value, t, 0.01); break;
          case 'makeup':    if (node._spxMakeup) node._spxMakeup.gain.setTargetAtTime(Math.pow(10, value / 20), t, 0.01); break;
        }
      }
    },

    // Get gain reduction (for metering)
    getReduction: () => {
      if (useWorklet) return 0; // TODO: message port for GR
      return node.reduction || 0;
    },

    destroy: () => {
      try { inputNode.disconnect(); } catch (e) {}
      try { outputNode.disconnect(); } catch (e) {}
    },
  };
};