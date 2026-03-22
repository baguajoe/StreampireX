// =============================================================================
// ChoirPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createChoirPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const voices=Array.from({length:p.voices??4},(_,i)=>{
    const d=context.createDelay(0.1), lfo=context.createOscillator(), lg=context.createGain(), g=context.createGain();
    d.delayTime.value=0.015+i*0.007;
    lfo.frequency.value=2+i*0.3; lg.gain.value=0.004+i*0.001;
    g.gain.value=(p.blend??0.5)/4;
    lfo.connect(lg); lg.connect(d.delayTime); lfo.start();
    input.connect(d); d.connect(g); g.connect(output);
    return {d,lfo};
  });
  input.connect(output);
  return { inputNode:input, node:input,
    setParam:()=>{}, getState:()=>({voices:voices.length}), connect:d=>output.connect(d), disconnect:()=>{voices.forEach(v=>v.lfo.stop());output.disconnect();} };
};
