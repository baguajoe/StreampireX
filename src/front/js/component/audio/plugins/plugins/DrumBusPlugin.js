// =============================================================================
// DrumBusPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createDrumBusPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const hpf=context.createBiquadFilter(), comp=context.createDynamicsCompressor(), transient=context.createGain(), body=context.createBiquadFilter();
  hpf.type='highpass'; hpf.frequency.value=p.hpf??60;
  comp.threshold.value=p.threshold??-15; comp.ratio.value=4; comp.knee.value=3; comp.attack.value=0.003; comp.release.value=0.08;
  body.type='peaking'; body.frequency.value=200; body.gain.value=p.body??2; body.Q.value=0.8;
  const makeup=context.createGain(); makeup.gain.value=Math.pow(10,(p.makeup??3)/20);
  input.connect(hpf); hpf.connect(body); body.connect(comp); comp.connect(makeup); makeup.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='threshold')comp.threshold.setTargetAtTime(v,0,.01); if(k==='body')body.gain.setTargetAtTime(v,0,.01); if(k==='makeup')makeup.gain.setTargetAtTime(Math.pow(10,v/20),0,.01); },
    getState:()=>({threshold:comp.threshold.value,body:body.gain.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
