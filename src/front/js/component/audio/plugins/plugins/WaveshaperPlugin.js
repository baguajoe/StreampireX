// =============================================================================
// WaveshaperPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createWaveshaperPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const ws=context.createWaveShaper();
  let shape=p.shape??'soft', amount=p.amount??0.5;
  const makeCurve=(s,a)=>{ const n=256,c=new Float32Array(n);
    for(let i=0;i<n;i++){const x=(2*i/n)-1;
      if(s==='soft')c[i]=(Math.PI+a)*x/(Math.PI+a*Math.abs(x));
      else if(s==='hard')c[i]=Math.max(-a,Math.min(a,x*3))/a;
      else if(s==='sine')c[i]=Math.sin(x*Math.PI*a);
      else c[i]=x;} return c; };
  ws.curve=makeCurve(shape,amount); ws.oversample='2x';
  input.connect(ws); ws.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='shape')shape=v; if(k==='amount')amount=v; ws.curve=makeCurve(shape,amount); },
    getState:()=>({shape,amount}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
