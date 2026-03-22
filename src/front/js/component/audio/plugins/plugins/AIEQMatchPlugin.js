// =============================================================================
// AIEQMatchPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createAIEQMatchPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const bands=[60,150,400,1000,2500,6000,12000,16000].map(freq=>{
    const f=context.createBiquadFilter(); f.type='peaking'; f.frequency.value=freq; f.gain.value=0; f.Q.value=2; return f;
  });
  bands.reduce((a,b)=>{a.connect(b);return b;},input.connect(bands[0])&&bands[0]);
  bands[bands.length-1].connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ const m=k.match(/^band(\d+)$/); if(m)bands[+m[1]]?.gain.setTargetAtTime(v,0,.05); },
    getState:()=>({bands:bands.map(b=>b.gain.value)}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
