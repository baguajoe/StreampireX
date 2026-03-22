// =============================================================================
// EnvelopeFilterPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createEnvelopeFilterPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const filter=context.createBiquadFilter(), detector=context.createAnalyser();
  filter.type=p.type??'lowpass'; filter.Q.value=p.q??8;
  detector.fftSize=256;
  const buf=new Uint8Array(detector.frequencyBinCount);
  const minFreq=p.minFreq??200, maxFreq=p.maxFreq??4000, sensitivity=p.sensitivity??1;
  const tick=setInterval(()=>{
    detector.getByteFrequencyData(buf);
    const rms=Math.sqrt(buf.reduce((a,v)=>a+v*v,0)/buf.length)/128;
    const freq=minFreq+rms*sensitivity*(maxFreq-minFreq);
    filter.frequency.setTargetAtTime(Math.min(maxFreq,freq),context.currentTime,0.02);
  },25);
  input.connect(detector); input.connect(filter); filter.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='sensitivity')p.sensitivity=v; if(k==='minFreq')p.minFreq=v; if(k==='maxFreq')p.maxFreq=v; if(k==='q')filter.Q.setTargetAtTime(v,0,.01); },
    getState:()=>({minFreq,maxFreq,sensitivity,q:filter.Q.value}), connect:d=>output.connect(d), disconnect:()=>{clearInterval(tick);output.disconnect();} };
};

// ── AI-POWERED ────────────────────────────────────────────────────────────
