// =============================================================================
// AINoiseReducePlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createAINoiseReducePlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const lpf=context.createBiquadFilter(), hpf=context.createBiquadFilter();
  const gate=context.createDynamicsCompressor();
  hpf.type='highpass'; hpf.frequency.value=p.hpf??60;
  lpf.type='lowpass'; lpf.frequency.value=p.lpf??18000;
  gate.threshold.value=p.floor??-60; gate.knee.value=3; gate.ratio.value=10; gate.attack.value=0.01; gate.release.value=0.2;
  input.connect(hpf); hpf.connect(lpf); lpf.connect(gate); gate.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='floor')gate.threshold.setTargetAtTime(v,0,.01); if(k==='hpf')hpf.frequency.setTargetAtTime(v,0,.01); },
    getState:()=>({floor:gate.threshold.value,hpf:hpf.frequency.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
