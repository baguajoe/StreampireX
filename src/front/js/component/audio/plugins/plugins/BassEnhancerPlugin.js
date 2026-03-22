// =============================================================================
// BassEnhancerPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createBassEnhancerPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const sub=context.createBiquadFilter(), punch=context.createBiquadFilter(), lpf=context.createBiquadFilter();
  sub.type='lowshelf'; sub.frequency.value=80; sub.gain.value=p.sub??4;
  punch.type='peaking'; punch.frequency.value=120; punch.gain.value=p.punch??3; punch.Q.value=1.5;
  lpf.type='lowpass'; lpf.frequency.value=p.lpf??200;
  const subGen=context.createOscillator(), subGain=context.createGain();
  subGen.frequency.value=60; subGen.type='sine';
  subGain.gain.value=p.subAmount??0;
  subGen.start(); subGen.connect(subGain); subGain.connect(output);
  input.connect(sub); sub.connect(punch); punch.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='sub')sub.gain.setTargetAtTime(v,0,.01); if(k==='punch')punch.gain.setTargetAtTime(v,0,.01); if(k==='subAmount')subGain.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({sub:sub.gain.value,punch:punch.gain.value}), connect:d=>output.connect(d), disconnect:()=>{subGen.stop();output.disconnect();} };
};
