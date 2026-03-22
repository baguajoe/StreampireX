// =============================================================================
// CombFilterPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createCombFilterPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const delay=context.createDelay(0.1), feedback=context.createGain(), dryGain=context.createGain(), wetGain=context.createGain();
  const freq=p.freq??100;
  delay.delayTime.value=1/freq;
  feedback.gain.value=p.feedback??0.8;
  const mix=(p.mix??50)/100;
  dryGain.gain.value=1-mix; wetGain.gain.value=mix;
  input.connect(dryGain); dryGain.connect(output);
  input.connect(delay); delay.connect(feedback); feedback.connect(delay); delay.connect(wetGain); wetGain.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='freq')delay.delayTime.setTargetAtTime(1/v,0,.01); if(k==='feedback')feedback.gain.setTargetAtTime(Math.min(0.95,v),0,.01); if(k==='mix'){dryGain.gain.setTargetAtTime(1-v/100,0,.05);wetGain.gain.setTargetAtTime(v/100,0,.05);} },
    getState:()=>({freq:1/delay.delayTime.value,feedback:feedback.gain.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
