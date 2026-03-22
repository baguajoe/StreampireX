// =============================================================================
// AIVocalCleanPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createAIVocalCleanPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const hpf=context.createBiquadFilter(), deess=context.createBiquadFilter(), comp=context.createDynamicsCompressor(), presence=context.createBiquadFilter();
  hpf.type='highpass'; hpf.frequency.value=100;
  deess.type='peaking'; deess.frequency.value=8000; deess.gain.value=p.deess??-3; deess.Q.value=3;
  comp.threshold.value=-18; comp.ratio.value=3; comp.knee.value=6; comp.attack.value=0.005; comp.release.value=0.1;
  presence.type='peaking'; presence.frequency.value=3500; presence.gain.value=p.presence??1.5; presence.Q.value=1;
  input.connect(hpf); hpf.connect(deess); deess.connect(comp); comp.connect(presence); presence.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='deess')deess.gain.setTargetAtTime(-Math.abs(v),0,.01); if(k==='presence')presence.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({deess:deess.gain.value,presence:presence.gain.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
