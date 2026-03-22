// =============================================================================
// TapeWarmthPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createTapeWarmthPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const ws=context.createWaveShaper(), warmth=context.createBiquadFilter(), air=context.createBiquadFilter();
  const n=512,c=new Float32Array(n); const d=p.drive??0.2;
  for(let i=0;i<n;i++){const x=(2*i/n)-1; c[i]=(1+d)*x/(1+d*Math.abs(x));}
  ws.curve=c; ws.oversample='4x';
  warmth.type='lowshelf'; warmth.frequency.value=200; warmth.gain.value=p.warmth??1.5;
  air.type='highshelf'; air.frequency.value=14000; air.gain.value=p.air??-0.5;
  input.connect(ws); ws.connect(warmth); warmth.connect(air); air.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='warmth')warmth.gain.setTargetAtTime(v,0,.01); if(k==='air')air.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({warmth:warmth.gain.value,air:air.gain.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
