// =============================================================================
// AIDeRoomPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createAIDeRoomPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const comp=context.createDynamicsCompressor(), filter=context.createBiquadFilter();
  comp.threshold.value=p.threshold??-30; comp.ratio.value=4; comp.knee.value=6; comp.attack.value=0.001; comp.release.value=0.05;
  filter.type='peaking'; filter.frequency.value=400; filter.gain.value=p.reduction??-3; filter.Q.value=0.5;
  input.connect(filter); filter.connect(comp); comp.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='reduction')filter.gain.setTargetAtTime(-Math.abs(v),0,.01); if(k==='threshold')comp.threshold.setTargetAtTime(v,0,.01); },
    getState:()=>({reduction:filter.gain.value,threshold:comp.threshold.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
