// =============================================================================
// VocalCompPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createVocalCompPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const comp=context.createDynamicsCompressor(), makeup=context.createGain(), presence=context.createBiquadFilter();
  comp.threshold.value=p.threshold??-20; comp.ratio.value=p.ratio??4; comp.knee.value=8; comp.attack.value=0.005; comp.release.value=0.08;
  makeup.gain.value=Math.pow(10,(p.makeup??3)/20);
  presence.type='peaking'; presence.frequency.value=3000; presence.gain.value=p.presence??1.5; presence.Q.value=1;
  input.connect(comp); comp.connect(makeup); makeup.connect(presence); presence.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='threshold')comp.threshold.setTargetAtTime(v,0,.01); if(k==='ratio')comp.ratio.setTargetAtTime(v,0,.01); if(k==='makeup')makeup.gain.setTargetAtTime(Math.pow(10,v/20),0,.01); if(k==='presence')presence.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({threshold:comp.threshold.value,ratio:comp.ratio.value,presence:presence.gain.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
