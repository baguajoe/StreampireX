// =============================================================================
// VibratoPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createVibratoPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const delay=context.createDelay(0.05), lfo=context.createOscillator(), lfoGain=context.createGain();
  delay.delayTime.value=0.01;
  lfo.frequency.value=p.rate??5; lfoGain.gain.value=p.depth??0.005;
  lfo.connect(lfoGain); lfoGain.connect(delay.delayTime); lfo.start();
  input.connect(delay); delay.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='rate')lfo.frequency.setTargetAtTime(v,0,.05); if(k==='depth')lfoGain.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({rate:lfo.frequency.value,depth:lfoGain.gain.value}), connect:d=>output.connect(d), disconnect:()=>{lfo.stop();output.disconnect();} };
};
