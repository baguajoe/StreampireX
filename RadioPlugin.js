// =============================================================================
// RadioPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createRadioPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const hpf=context.createBiquadFilter(), lpf=context.createBiquadFilter(), mid=context.createBiquadFilter();
  hpf.type='highpass'; hpf.frequency.value=p.hpf??300;
  lpf.type='lowpass'; lpf.frequency.value=p.lpf??3400;
  mid.type='peaking'; mid.frequency.value=1200; mid.gain.value=p.presence??4; mid.Q.value=1;
  const ws=context.createWaveShaper();
  const n=256,c=new Float32Array(n);
  for(let i=0;i<n;i++){const x=(2*i/n)-1; c[i]=Math.tanh(x*3)*0.6;}
  ws.curve=c;
  input.connect(hpf); hpf.connect(lpf); lpf.connect(mid); mid.connect(ws); ws.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='hpf')hpf.frequency.setTargetAtTime(v,0,.01); if(k==='lpf')lpf.frequency.setTargetAtTime(v,0,.01); if(k==='presence')mid.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({hpf:hpf.frequency.value,lpf:lpf.frequency.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
