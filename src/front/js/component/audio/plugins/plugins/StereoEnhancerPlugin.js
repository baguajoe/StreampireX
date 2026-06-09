// =============================================================================
// StereoEnhancerPlugin.js — StreamPireX Audio Plugin
// =============================================================================
// UI emits `width` on a 0..200 scale (100 = unity). Divide by 100 → 0..2 linear.

export const createStereoEnhancerPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const splitter=context.createChannelSplitter(2), merger=context.createChannelMerger(2);
  const lGain=context.createGain(), rGain=context.createGain();
  const lDelay=context.createDelay(0.02), rDelay=context.createDelay(0.02);
  lDelay.delayTime.value=0.001; rDelay.delayTime.value=0.0013;
  // Map 0..200 UI scale to 0..2 linear gain.
  const widthToGain = (v) => {
    const n = Number.isFinite(v) ? v : 100;
    return Math.max(0, Math.min(2, n / 100));
  };
  lGain.gain.value = widthToGain(p.width);
  rGain.gain.value = widthToGain(p.width);
  input.connect(splitter);
  splitter.connect(lDelay,0); lDelay.connect(lGain); lGain.connect(merger,0,0);
  splitter.connect(rDelay,1); rDelay.connect(rGain); rGain.connect(merger,0,1);
  merger.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='width'){const g=widthToGain(v); lGain.gain.setTargetAtTime(g,0,.01); rGain.gain.setTargetAtTime(g,0,.01);} },
    getState:()=>({width:lGain.gain.value*100}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
