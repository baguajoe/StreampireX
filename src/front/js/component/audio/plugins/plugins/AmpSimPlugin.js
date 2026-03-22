// =============================================================================
// AmpSimPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createAmpSimPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const pre=context.createBiquadFilter(), ws=context.createWaveShaper(), cab=context.createBiquadFilter(), presence=context.createBiquadFilter();
  pre.type='highpass'; pre.frequency.value=80;
  const n=512,c=new Float32Array(n); const drive=p.drive??0.7;
  for(let i=0;i<n;i++){const x=(2*i/n)-1; c[i]=Math.tanh(x*(1+drive*10))*0.8;}
  ws.curve=c; ws.oversample='4x';
  cab.type='bandpass'; cab.frequency.value=800; cab.Q.value=0.5; // cabinet sim
  presence.type='peaking'; presence.frequency.value=3000; presence.gain.value=p.presence??3; presence.Q.value=1;
  input.connect(pre); pre.connect(ws); ws.connect(cab); cab.connect(presence); presence.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='drive'){const c2=new Float32Array(n);for(let i=0;i<n;i++){const x=(2*i/n)-1;c2[i]=Math.tanh(x*(1+v*10))*0.8;}ws.curve=c2;} if(k==='presence')presence.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({presence:presence.gain.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
