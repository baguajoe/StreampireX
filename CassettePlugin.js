// =============================================================================
// CassettePlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createCassettePlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const lpf=context.createBiquadFilter(), hiss=context.createGain();
  const ws=context.createWaveShaper();
  lpf.type='lowpass'; lpf.frequency.value=p.tone??8000;
  const n=256,c=new Float32Array(n);
  for(let i=0;i<n;i++){const x=(2*i/n)-1; c[i]=Math.tanh(x*2)*0.7;}
  ws.curve=c;
  const hissOsc=context.createOscillator(); hissOsc.type='sawtooth'; hissOsc.frequency.value=8000;
  const hissFilter=context.createBiquadFilter(); hissFilter.type='bandpass'; hissFilter.frequency.value=8000; hissFilter.Q.value=0.3;
  hiss.gain.value=p.hiss??0.005;
  hissOsc.connect(hissFilter); hissFilter.connect(hiss); hiss.connect(output); hissOsc.start();
  input.connect(ws); ws.connect(lpf); lpf.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='tone')lpf.frequency.setTargetAtTime(v,0,.01); if(k==='hiss')hiss.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({tone:lpf.frequency.value,hiss:hiss.gain.value}), connect:d=>output.connect(d), disconnect:()=>{hissOsc.stop();output.disconnect();} };
};
