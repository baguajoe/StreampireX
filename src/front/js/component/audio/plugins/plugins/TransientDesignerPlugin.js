// =============================================================================
// TransientDesignerPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createTransientDesignerPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const detector=context.createAnalyser(); detector.fftSize=256;
  const attackGain=context.createGain(), sustainGain=context.createGain();
  attackGain.gain.value=p.attack??1; sustainGain.gain.value=p.sustain??1;
  const buf=new Uint8Array(detector.frequencyBinCount);
  let prevRMS=0;
  const tick=setInterval(()=>{
    detector.getByteFrequencyData(buf);
    const rms=Math.sqrt(buf.reduce((a,v)=>a+v*v,0)/buf.length)/128;
    const isAttack=rms>prevRMS*1.2;
    if(isAttack) output.gain.setTargetAtTime(p.attack??1,context.currentTime,0.005);
    else output.gain.setTargetAtTime(p.sustain??1,context.currentTime,0.05);
    prevRMS=rms;
  },25);
  input.connect(detector); input.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='attack')attackGain.gain.value=v; if(k==='sustain')sustainGain.gain.value=v; },
    getState:()=>({attack:attackGain.gain.value,sustain:sustainGain.gain.value}), connect:d=>output.connect(d), disconnect:()=>{clearInterval(tick);output.disconnect();} };
};

// ── FILTERS ────────────────────────────────────────────────────────────────
