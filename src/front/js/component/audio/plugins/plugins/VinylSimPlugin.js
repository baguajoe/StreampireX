// =============================================================================
// VinylSimPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createVinylSimPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const lpf=context.createBiquadFilter(), hpf=context.createBiquadFilter();
  const rumble=context.createOscillator(), rumbleGain=context.createGain();
  lpf.type='lowpass'; lpf.frequency.value=p.warmth??12000;
  hpf.type='highpass'; hpf.frequency.value=30;
  rumble.frequency.value=0.5; rumble.type='sawtooth';
  rumbleGain.gain.value=p.rumble??0.002;
  rumble.connect(rumbleGain); rumbleGain.connect(lpf.frequency); rumble.start();
  input.connect(hpf); hpf.connect(lpf); lpf.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='warmth')lpf.frequency.setTargetAtTime(v,0,.01); if(k==='rumble')rumbleGain.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({warmth:lpf.frequency.value}), connect:d=>output.connect(d), disconnect:()=>{rumble.stop();output.disconnect();} };
};
