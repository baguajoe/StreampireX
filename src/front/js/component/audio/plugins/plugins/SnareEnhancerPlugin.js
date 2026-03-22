// =============================================================================
// SnareEnhancerPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createSnareEnhancerPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const body=context.createBiquadFilter(), snap=context.createBiquadFilter(), air=context.createBiquadFilter();
  body.type='peaking'; body.frequency.value=200; body.gain.value=p.body??2; body.Q.value=1;
  snap.type='peaking'; snap.frequency.value=1000; snap.gain.value=p.snap??3; snap.Q.value=2;
  air.type='highshelf'; air.frequency.value=8000; air.gain.value=p.air??2;
  input.connect(body); body.connect(snap); snap.connect(air); air.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='body')body.gain.setTargetAtTime(v,0,.01); if(k==='snap')snap.gain.setTargetAtTime(v,0,.01); if(k==='air')air.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({body:body.gain.value,snap:snap.gain.value,air:air.gain.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
