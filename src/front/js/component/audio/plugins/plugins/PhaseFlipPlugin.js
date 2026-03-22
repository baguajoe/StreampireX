// =============================================================================
// PhaseFlipPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createPhaseFlipPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const invert=context.createGain(); invert.gain.value=p.flipped??false?-1:1;
  input.connect(invert); invert.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='flip')invert.gain.setTargetAtTime(v?-1:1,0,.001); },
    getState:()=>({flipped:invert.gain.value<0}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
