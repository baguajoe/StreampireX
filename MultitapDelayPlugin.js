// =============================================================================
// MultitapDelayPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createMultitapDelayPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const dryGain=context.createGain(); dryGain.gain.value=0.7;
  const taps=[125,250,375,500].map((t,i)=>{
    const d=context.createDelay(1); d.delayTime.value=t/1000;
    const g=context.createGain(); g.gain.value=0.5*Math.pow(0.7,i);
    d.connect(g); g.connect(output);
    return d;
  });
  input.connect(dryGain); dryGain.connect(output);
  taps.forEach(t=>input.connect(t));
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='feedback')taps.forEach((t,i)=>{}); },
    getState:()=>({}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
