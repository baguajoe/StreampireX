// =============================================================================
// AutoPanPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createAutoPanPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const splitter=context.createChannelSplitter(2), merger=context.createChannelMerger(2);
  const lfo=context.createOscillator(), lfoGainL=context.createGain(), lfoGainR=context.createGain();
  const gainL=context.createGain(), gainR=context.createGain();
  lfo.frequency.value=p.rate??0.5; gainL.gain.value=0.5; gainR.gain.value=0.5;
  lfoGainL.gain.value=p.depth??0.4; lfoGainR.gain.value=-(p.depth??0.4);
  lfo.connect(lfoGainL); lfoGainL.connect(gainL.gain);
  lfo.connect(lfoGainR); lfoGainR.connect(gainR.gain);
  lfo.start();
  input.connect(gainL); input.connect(gainR);
  gainL.connect(merger,0,0); gainR.connect(merger,0,1); merger.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='rate')lfo.frequency.setTargetAtTime(v,0,.05); if(k==='depth'){lfoGainL.gain.setTargetAtTime(v,0,.01);lfoGainR.gain.setTargetAtTime(-v,0,.01);} },
    getState:()=>({rate:lfo.frequency.value,depth:lfoGainL.gain.value}), connect:d=>output.connect(d), disconnect:()=>{lfo.stop();output.disconnect();} };
};
