// =============================================================================
// KickEnhancerPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createKickEnhancerPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const sub=context.createBiquadFilter(), click=context.createBiquadFilter(), comp=context.createDynamicsCompressor();
  sub.type='lowshelf'; sub.frequency.value=80; sub.gain.value=p.sub??4;
  click.type='peaking'; click.frequency.value=3000; click.gain.value=p.click??3; click.Q.value=2;
  comp.threshold.value=-12; comp.ratio.value=4; comp.knee.value=3; comp.attack.value=0.001; comp.release.value=0.05;
  input.connect(sub); sub.connect(click); click.connect(comp); comp.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='sub')sub.gain.setTargetAtTime(v,0,.01); if(k==='click')click.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({sub:sub.gain.value,click:click.gain.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
