// =============================================================================
// ChannelStripPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createChannelStripPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const hpf=context.createBiquadFilter(), eq=context.createBiquadFilter(), comp=context.createDynamicsCompressor(), level=context.createGain();
  hpf.type='highpass'; hpf.frequency.value=p.hpf??80;
  eq.type='peaking'; eq.frequency.value=p.eqFreq??1000; eq.gain.value=p.eqGain??0; eq.Q.value=1;
  comp.threshold.value=p.threshold??-18; comp.ratio.value=p.ratio??4; comp.knee.value=6; comp.attack.value=0.01; comp.release.value=0.1;
  level.gain.value=Math.pow(10,(p.gain??0)/20);
  input.connect(hpf); hpf.connect(eq); eq.connect(comp); comp.connect(level); level.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='hpf')hpf.frequency.setTargetAtTime(v,0,.01); if(k==='eqGain')eq.gain.setTargetAtTime(v,0,.01); if(k==='threshold')comp.threshold.setTargetAtTime(v,0,.01); if(k==='gain')level.gain.setTargetAtTime(Math.pow(10,v/20),0,.01); },
    getState:()=>({hpf:hpf.frequency.value,eqGain:eq.gain.value,threshold:comp.threshold.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
