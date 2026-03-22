// =============================================================================
// SpectralGatePlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createSpectralGatePlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const analyser=context.createAnalyser(), gate=context.createDynamicsCompressor();
  analyser.fftSize=2048;
  gate.threshold.value=p.threshold??-50; gate.knee.value=3; gate.ratio.value=12; gate.attack.value=0.001; gate.release.value=0.1;
  input.connect(analyser); input.connect(gate); gate.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='threshold')gate.threshold.setTargetAtTime(v,0,.01); },
    getState:()=>({threshold:gate.threshold.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
