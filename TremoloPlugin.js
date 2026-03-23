// =============================================================================
// TremoloPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createTremoloPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const lfo=context.createOscillator(), lfoGain=context.createGain(), amp=context.createGain();
  lfo.frequency.value=p.rate??4; lfo.type='sine';
  lfoGain.gain.value=p.depth??0.5;
  amp.gain.value=0.5;
  lfo.connect(lfoGain); lfoGain.connect(amp.gain); lfo.start();
  input.connect(amp); amp.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='rate')lfo.frequency.setTargetAtTime(v,0,.05); if(k==='depth')lfoGain.gain.setTargetAtTime(v,0,.01); if(k==='waveform')lfo.type=v; },
    getState:()=>({rate:lfo.frequency.value,depth:lfoGain.gain.value}), connect:d=>output.connect(d), disconnect:()=>{lfo.stop();output.disconnect();} };
};
