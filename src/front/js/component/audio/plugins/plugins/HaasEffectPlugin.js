// =============================================================================
// HaasEffectPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createHaasEffectPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const splitter=context.createChannelSplitter(2), merger=context.createChannelMerger(2);
  const delay=context.createDelay(0.04);
  delay.delayTime.value=(p.delay??20)/1000;
  input.connect(splitter);
  splitter.connect(merger,0,0); // left direct
  splitter.connect(delay,0); delay.connect(merger,0,1); // right delayed
  merger.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='delay')delay.delayTime.setTargetAtTime(v/1000,0,.01); },
    getState:()=>({delay:delay.delayTime.value*1000}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
