// =============================================================================
// ResonatorPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createResonatorPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const filters=[p.freq1??200,p.freq2??500,p.freq3??1200].map(f=>{ const bq=context.createBiquadFilter(); bq.type='bandpass'; bq.frequency.value=f; bq.Q.value=p.q??20; return bq; });
  const mixer=context.createGain();
  filters.forEach(f=>{input.connect(f);f.connect(mixer);});
  const dryGain=context.createGain(), wetGain=context.createGain();
  const mix=(p.mix??50)/100;
  dryGain.gain.value=1-mix; wetGain.gain.value=mix/filters.length;
  input.connect(dryGain); dryGain.connect(output);
  mixer.connect(wetGain); wetGain.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='q')filters.forEach(f=>f.Q.setTargetAtTime(v,0,.01)); if(k==='mix'){dryGain.gain.setTargetAtTime(1-v/100,0,.05);wetGain.gain.setTargetAtTime(v/100/filters.length,0,.05);} },
    getState:()=>({q:filters[0].Q.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};

// ── UTILITY ────────────────────────────────────────────────────────────────
