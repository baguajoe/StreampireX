// =============================================================================
// BrickwallLimiterPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createBrickwallLimiterPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const comp=context.createDynamicsCompressor();
  comp.threshold.value=p.ceiling??-0.3; comp.knee.value=0; comp.ratio.value=20;
  comp.attack.value=0.001; comp.release.value=0.05;
  const makeup=context.createGain(); makeup.gain.value=Math.pow(10,(p.makeup??0)/20);
  input.connect(comp); comp.connect(makeup); makeup.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='ceiling')comp.threshold.setTargetAtTime(v,0,.01); if(k==='makeup')makeup.gain.setTargetAtTime(Math.pow(10,v/20),0,.01); },
    getState:()=>({ceiling:comp.threshold.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
