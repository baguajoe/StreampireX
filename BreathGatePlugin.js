// =============================================================================
// BreathGatePlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createBreathGatePlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const detector=context.createAnalyser(); detector.fftSize=256;
  const buf=new Uint8Array(detector.frequencyBinCount);
  let threshold=p.threshold??-35, open=false;
  const tick=setInterval(()=>{
    detector.getByteFrequencyData(buf);
    const rms=buf.reduce((a,v)=>a+v*v,0)/buf.length;
    const db=20*Math.log10(Math.sqrt(rms)/128+1e-6);
    if(db>threshold&&!open){open=true;output.gain.setTargetAtTime(1,context.currentTime,0.005);}
    else if(db<=threshold&&open){open=false;output.gain.setTargetAtTime(0,context.currentTime,0.1);}
  },25);
  input.connect(detector); input.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='threshold')threshold=v; },
    getState:()=>({threshold}), connect:d=>output.connect(d), disconnect:()=>{clearInterval(tick);output.disconnect();} };
};
