// =============================================================================
// VocalDoublerPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createVocalDoublerPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const dryGain=context.createGain(), wetGain=context.createGain();
  const delays=[0.018,0.025,0.031].map(t=>{ const d=context.createDelay(0.1); d.delayTime.value=t+(Math.random()-0.5)*0.005; return d; });
  const mix=(p.mix??50)/100;
  dryGain.gain.value=1-mix; wetGain.gain.value=mix/delays.length;
  input.connect(dryGain); dryGain.connect(output);
  delays.forEach(d=>{ input.connect(d); d.connect(wetGain); });
  wetGain.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='mix'){dryGain.gain.setTargetAtTime(1-v/100,0,.05);wetGain.gain.setTargetAtTime(v/100/delays.length,0,.05);} },
    getState:()=>({mix:wetGain.gain.value*delays.length*100}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
