// =============================================================================
// VocalEnhancerPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createVocalEnhancerPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const presence=context.createBiquadFilter(), air=context.createBiquadFilter(), body=context.createBiquadFilter();
  presence.type='peaking'; presence.frequency.value=3500; presence.gain.value=p.presence??2; presence.Q.value=1;
  air.type='highshelf'; air.frequency.value=12000; air.gain.value=p.air??1.5;
  body.type='peaking'; body.frequency.value=250; body.gain.value=p.body??-1; body.Q.value=0.8;
  input.connect(body); body.connect(presence); presence.connect(air); air.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='presence')presence.gain.setTargetAtTime(v,0,.01); if(k==='air')air.gain.setTargetAtTime(v,0,.01); if(k==='body')body.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({presence:presence.gain.value,air:air.gain.value,body:body.gain.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
