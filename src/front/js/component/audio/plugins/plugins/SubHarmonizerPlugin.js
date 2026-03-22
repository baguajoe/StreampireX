// =============================================================================
// SubHarmonizerPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createSubHarmonizerPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const lpf=context.createBiquadFilter(), ws=context.createWaveShaper(), subFilter=context.createBiquadFilter(), subGain=context.createGain();
  lpf.type='lowpass'; lpf.frequency.value=200;
  const n=256,c=new Float32Array(n);
  for(let i=0;i<n;i++){const x=(2*i/n)-1; c[i]=x>=0?1:-1;} // half-wave rect = sub
  ws.curve=c;
  subFilter.type='lowpass'; subFilter.frequency.value=120;
  subGain.gain.value=p.amount??0.4;
  input.connect(output); input.connect(lpf); lpf.connect(ws); ws.connect(subFilter); subFilter.connect(subGain); subGain.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='amount')subGain.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({amount:subGain.gain.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};

// ── GUITAR / INSTRUMENT ───────────────────────────────────────────────────
