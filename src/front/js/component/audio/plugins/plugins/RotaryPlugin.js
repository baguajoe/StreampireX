// =============================================================================
// RotaryPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createRotaryPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const lfo=context.createOscillator(), lfoGain=context.createGain();
  const splitter=context.createChannelSplitter(2), merger=context.createChannelMerger(2);
  const dL=context.createDelay(0.02), dR=context.createDelay(0.02);
  lfo.frequency.value=p.speed??5; lfoGain.gain.value=0.005;
  lfo.connect(lfoGain); lfoGain.connect(dL.delayTime);
  const lfoInv=context.createGain(); lfoInv.gain.value=-0.005;
  lfo.connect(lfoInv); lfoInv.connect(dR.delayTime);
  lfo.start();
  input.connect(splitter);
  splitter.connect(dL,0); dL.connect(merger,0,0);
  splitter.connect(dR,1); dR.connect(merger,0,1);
  merger.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='speed')lfo.frequency.setTargetAtTime(v,0,.1); },
    getState:()=>({speed:lfo.frequency.value}), connect:d=>output.connect(d), disconnect:()=>{lfo.stop();output.disconnect();} };
};
