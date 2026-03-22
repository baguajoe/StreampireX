// =============================================================================
// FuzzPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createFuzzPlugin = (context, p = {}) => {
  const input = context.createGain(), output = context.createGain();
  const gain = context.createGain(), ws = context.createWaveShaper(), lpf = context.createBiquadFilter();
  gain.gain.value = p.fuzz??50;
  const n=256, c=new Float32Array(n);
  for(let i=0;i<n;i++){const x=(2*i/n)-1; c[i]=x>0?1:-1;} // hard clip = fuzz
  ws.curve=c;
  lpf.type='lowpass'; lpf.frequency.value=p.tone??3000;
  const out=context.createGain(); out.gain.value=p.level??0.3;
  input.connect(gain); gain.connect(ws); ws.connect(lpf); lpf.connect(out); out.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='fuzz')gain.gain.setTargetAtTime(v,0,.01); if(k==='tone')lpf.frequency.setTargetAtTime(v,0,.01); if(k==='level')out.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({fuzz:gain.gain.value,tone:lpf.frequency.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
