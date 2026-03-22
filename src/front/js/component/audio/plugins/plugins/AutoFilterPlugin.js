// =============================================================================
// AutoFilterPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createAutoFilterPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const filter=context.createBiquadFilter(), lfo=context.createOscillator(), lfoGain=context.createGain();
  filter.type=p.type??'lowpass'; filter.frequency.value=p.freq??1000; filter.Q.value=p.q??2;
  lfo.frequency.value=p.rate??1; lfoGain.gain.value=p.depth??500;
  lfo.connect(lfoGain); lfoGain.connect(filter.frequency); lfo.start();
  input.connect(filter); filter.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='rate')lfo.frequency.setTargetAtTime(v,0,.05); if(k==='depth')lfoGain.gain.setTargetAtTime(v,0,.01); if(k==='freq')filter.frequency.setTargetAtTime(v,0,.01); if(k==='q')filter.Q.setTargetAtTime(v,0,.01); if(k==='type')filter.type=v; },
    getState:()=>({rate:lfo.frequency.value,depth:lfoGain.gain.value,freq:filter.frequency.value}), connect:d=>output.connect(d), disconnect:()=>{lfo.stop();output.disconnect();} };
};
