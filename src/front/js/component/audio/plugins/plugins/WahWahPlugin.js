// =============================================================================
// WahWahPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createWahWahPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const filter=context.createBiquadFilter(), lfo=context.createOscillator(), lfoGain=context.createGain();
  filter.type='bandpass'; filter.frequency.value=p.freq??1200; filter.Q.value=p.q??5;
  lfo.frequency.value=p.rate??2; lfoGain.gain.value=p.depth??800;
  lfo.connect(lfoGain); lfoGain.connect(filter.frequency); lfo.start();
  input.connect(filter); filter.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='rate')lfo.frequency.setTargetAtTime(v,0,.05); if(k==='depth')lfoGain.gain.setTargetAtTime(v,0,.01); if(k==='freq')filter.frequency.setTargetAtTime(v,0,.01); if(k==='q')filter.Q.setTargetAtTime(v,0,.01); },
    getState:()=>({rate:lfo.frequency.value,freq:filter.frequency.value,q:filter.Q.value}), connect:d=>output.connect(d), disconnect:()=>{lfo.stop();output.disconnect();} };
};

// ── MORE VOCAL ─────────────────────────────────────────────────────────────
