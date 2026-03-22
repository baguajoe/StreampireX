// =============================================================================
// PhonePlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createPhonePlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const hpf=context.createBiquadFilter(), lpf=context.createBiquadFilter();
  hpf.type='highpass'; hpf.frequency.value=300; hpf.Q.value=0.7;
  lpf.type='lowpass'; lpf.frequency.value=3400; lpf.Q.value=0.7;
  const dist=context.createWaveShaper();
  const n=256,c=new Float32Array(n);
  for(let i=0;i<n;i++){const x=(2*i/n)-1; c[i]=Math.tanh(x*5)*0.5;}
  dist.curve=c;
  input.connect(hpf); hpf.connect(lpf); lpf.connect(dist); dist.connect(output);
  return { inputNode:input, node:input, setParam:()=>{},
    getState:()=>({}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
