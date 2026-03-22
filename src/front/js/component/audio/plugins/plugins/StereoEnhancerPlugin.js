// =============================================================================
// StereoEnhancerPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createStereoEnhancerPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const splitter=context.createChannelSplitter(2), merger=context.createChannelMerger(2);
  const lGain=context.createGain(), rGain=context.createGain();
  const lDelay=context.createDelay(0.02), rDelay=context.createDelay(0.02);
  lDelay.delayTime.value=0.001; rDelay.delayTime.value=0.0013;
  lGain.gain.value=p.width??1.2; rGain.gain.value=p.width??1.2;
  input.connect(splitter);
  splitter.connect(lDelay,0); lDelay.connect(lGain); lGain.connect(merger,0,0);
  splitter.connect(rDelay,1); rDelay.connect(rGain); rGain.connect(merger,0,1);
  merger.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='width'){lGain.gain.setTargetAtTime(v,0,.01);rGain.gain.setTargetAtTime(v,0,.01);} },
    getState:()=>({width:lGain.gain.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
