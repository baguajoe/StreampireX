// =============================================================================
// VowelFilterPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createVowelFilterPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const VOWELS={a:[800,1200,2500],e:[400,2200,2900],i:[250,2500,3200],o:[450,800,2700],u:[325,700,2500]};
  const formants=[0,1,2].map(()=>{ const f=context.createBiquadFilter(); f.type='peaking'; f.Q.value=8; f.gain.value=12; return f; });
  formants.reduce((a,b)=>{a.connect(b);return b;},input.connect(formants[0])&&formants[0]);
  formants[formants.length-1].connect(output);
  const setVowel=(v)=>{ const freqs=VOWELS[v]??VOWELS.a; formants.forEach((f,i)=>f.frequency.setTargetAtTime(freqs[i],0,.02)); };
  setVowel(p.vowel??'a');
  const lfo=context.createOscillator(); lfo.frequency.value=p.rate??0;
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='vowel')setVowel(v); if(k==='rate')lfo.frequency.setTargetAtTime(v,0,.05); },
    getState:()=>({vowel:p.vowel??'a'}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
