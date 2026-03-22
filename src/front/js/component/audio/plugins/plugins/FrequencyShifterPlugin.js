// =============================================================================
// FrequencyShifterPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createFrequencyShifterPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const carrier=context.createOscillator(), cGain=context.createGain();
  carrier.frequency.value=p.shift??0; carrier.type='sine';
  cGain.gain.value=1; carrier.start();
  const ring=context.createGain(); ring.gain.value=0;
  carrier.connect(ring.gain);
  const mix=(p.mix??100)/100;
  const dryGain=context.createGain(), wetGain=context.createGain();
  dryGain.gain.value=1-mix; wetGain.gain.value=mix;
  input.connect(dryGain); dryGain.connect(output);
  input.connect(ring); ring.connect(wetGain); wetGain.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='shift')carrier.frequency.setTargetAtTime(v,0,.05); if(k==='mix'){dryGain.gain.setTargetAtTime(1-v/100,0,.05);wetGain.gain.setTargetAtTime(v/100,0,.05);} },
    getState:()=>({shift:carrier.frequency.value}), connect:d=>output.connect(d), disconnect:()=>{carrier.stop();output.disconnect();} };
};
