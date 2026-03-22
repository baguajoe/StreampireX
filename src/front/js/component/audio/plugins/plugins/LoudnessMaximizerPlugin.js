// =============================================================================
// LoudnessMaximizerPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createLoudnessMaximizerPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const comp=context.createDynamicsCompressor();
  comp.threshold.value=p.threshold??-12; comp.ratio.value=10; comp.knee.value=6;
  comp.attack.value=0.003; comp.release.value=0.08;
  const makeup=context.createGain(); makeup.gain.value=Math.pow(10,(p.gain??6)/20);
  const ceiling=context.createDynamicsCompressor();
  ceiling.threshold.value=-0.3; ceiling.ratio.value=20; ceiling.knee.value=0; ceiling.attack.value=0.001;
  input.connect(comp); comp.connect(makeup); makeup.connect(ceiling); ceiling.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='threshold')comp.threshold.setTargetAtTime(v,0,.01); if(k==='gain')makeup.gain.setTargetAtTime(Math.pow(10,v/20),0,.01); },
    getState:()=>({threshold:comp.threshold.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
