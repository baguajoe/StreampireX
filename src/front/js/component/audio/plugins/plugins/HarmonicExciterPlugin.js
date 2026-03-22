// =============================================================================
// HarmonicExciterPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createHarmonicExciterPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const hpf=context.createBiquadFilter(), ws=context.createWaveShaper(), exciteGain=context.createGain(), dryGain=context.createGain();
  hpf.type='highpass'; hpf.frequency.value=p.freq??3000;
  const n=256,c=new Float32Array(n);
  for(let i=0;i<n;i++){const x=(2*i/n)-1; c[i]=Math.tanh(x*3)*0.5+x*0.5;}
  ws.curve=c;
  exciteGain.gain.value=p.amount??0.3; dryGain.gain.value=1;
  input.connect(dryGain); dryGain.connect(output);
  input.connect(hpf); hpf.connect(ws); ws.connect(exciteGain); exciteGain.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='amount')exciteGain.gain.setTargetAtTime(v,0,.01); if(k==='freq')hpf.frequency.setTargetAtTime(v,0,.01); },
    getState:()=>({amount:exciteGain.gain.value,freq:hpf.frequency.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
