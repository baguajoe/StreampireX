// =============================================================================
// SlapbackDelayPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createSlapbackDelayPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const delay=context.createDelay(0.2), dryGain=context.createGain(), wetGain=context.createGain();
  delay.delayTime.value=(p.time??75)/1000;
  const mix=(p.mix??40)/100;
  dryGain.gain.value=1-mix; wetGain.gain.value=mix;
  input.connect(dryGain); dryGain.connect(output);
  input.connect(delay); delay.connect(wetGain); wetGain.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='time')delay.delayTime.setTargetAtTime(v/1000,0,.05); if(k==='mix'){dryGain.gain.setTargetAtTime(1-v/100,0,.05);wetGain.gain.setTargetAtTime(v/100,0,.05);} },
    getState:()=>({time:delay.delayTime.value*1000,mix:wetGain.gain.value*100}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
