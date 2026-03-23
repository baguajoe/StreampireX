// =============================================================================
// OverdrivePlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createOverdrivePlugin = (context, p = {}) => {
  const input = context.createGain(), output = context.createGain();
  const pre = context.createBiquadFilter(), ws = context.createWaveShaper(), post = context.createBiquadFilter();
  pre.type='highpass'; pre.frequency.value=100;
  post.type='peaking'; post.frequency.value=1000; post.gain.value=p.tone??0; post.Q.value=1;
  let drive = p.drive??0.6;
  const makeCurve = (d) => { const n=256,c=new Float32Array(n); for(let i=0;i<n;i++){const x=(2*i/n)-1; c[i]=Math.tanh(x*(1+d*10));} return c; };
  ws.curve=makeCurve(drive); ws.oversample='2x';
  input.connect(pre); pre.connect(ws); ws.connect(post); post.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='drive'){drive=v;ws.curve=makeCurve(v);} if(k==='tone')post.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({drive}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
