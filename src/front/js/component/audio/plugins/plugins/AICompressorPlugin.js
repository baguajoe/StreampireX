// =============================================================================
// AICompressorPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createAICompressorPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const comp=context.createDynamicsCompressor(), makeup=context.createGain();
  comp.threshold.value=p.threshold??-18; comp.ratio.value=p.ratio??4; comp.knee.value=8;
  comp.attack.value=p.attack??0.003; comp.release.value=p.release??0.1;
  makeup.gain.value=Math.pow(10,(p.makeup??3)/20);
  input.connect(comp); comp.connect(makeup); makeup.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='threshold')comp.threshold.setTargetAtTime(v,0,.01); if(k==='ratio')comp.ratio.setTargetAtTime(v,0,.01); if(k==='makeup')makeup.gain.setTargetAtTime(Math.pow(10,v/20),0,.01); },
    getState:()=>({threshold:comp.threshold.value,ratio:comp.ratio.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};

// ── DRUM / PERCUSSION ─────────────────────────────────────────────────────
