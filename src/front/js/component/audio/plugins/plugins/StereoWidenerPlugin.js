// =============================================================================
// StereoWidenerPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createStereoWidenerPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const splitter=context.createChannelSplitter(2), merger=context.createChannelMerger(2);
  const midGain=context.createGain(), sideGain=context.createGain();
  let width=p.width??1;
  midGain.gain.value=1; sideGain.gain.value=width;
  input.connect(splitter);
  splitter.connect(midGain,0); splitter.connect(midGain,1);
  splitter.connect(sideGain,0); splitter.connect(sideGain,1);
  midGain.connect(merger,0,0); midGain.connect(merger,0,1);
  sideGain.connect(merger,0,0); sideGain.connect(merger,0,1);
  merger.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='width')sideGain.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({width:sideGain.gain.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
