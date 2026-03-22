// =============================================================================
// ParallelCompPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createParallelCompPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const dryGain=context.createGain(), compGain=context.createGain();
  const comp=context.createDynamicsCompressor();
  comp.threshold.value=p.threshold??-30; comp.ratio.value=p.ratio??10; comp.knee.value=3; comp.attack.value=0.005; comp.release.value=0.1;
  const mix=(p.blend??50)/100;
  dryGain.gain.value=1-mix; compGain.gain.value=mix;
  input.connect(dryGain); dryGain.connect(output);
  input.connect(comp); comp.connect(compGain); compGain.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='blend'){dryGain.gain.setTargetAtTime(1-v/100,0,.05);compGain.gain.setTargetAtTime(v/100,0,.05);} if(k==='threshold')comp.threshold.setTargetAtTime(v,0,.01); if(k==='ratio')comp.ratio.setTargetAtTime(v,0,.01); },
    getState:()=>({blend:compGain.gain.value*100,threshold:comp.threshold.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};

// ── MORE DELAY / REVERB ────────────────────────────────────────────────────
