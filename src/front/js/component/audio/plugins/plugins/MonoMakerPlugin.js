// =============================================================================
// MonoMakerPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createMonoMakerPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const splitter=context.createChannelSplitter(2), merger=context.createChannelMerger(2);
  const mixGain=context.createGain(); mixGain.gain.value=0.5;
  input.connect(splitter);
  splitter.connect(mixGain,0); splitter.connect(mixGain,1);
  mixGain.connect(merger,0,0); mixGain.connect(merger,0,1);
  merger.connect(output);
  return { inputNode:input, node:input, setParam:()=>{}, getState:()=>({}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
