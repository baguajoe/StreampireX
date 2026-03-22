// =============================================================================
// HiHatShimmerPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createHiHatShimmerPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const hpf=context.createBiquadFilter(), shimmer=context.createBiquadFilter(), air=context.createBiquadFilter();
  hpf.type='highpass'; hpf.frequency.value=p.hpf??3000;
  shimmer.type='peaking'; shimmer.frequency.value=10000; shimmer.gain.value=p.shimmer??3; shimmer.Q.value=1;
  air.type='highshelf'; air.frequency.value=14000; air.gain.value=p.air??2;
  input.connect(hpf); hpf.connect(shimmer); shimmer.connect(air); air.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='shimmer')shimmer.gain.setTargetAtTime(v,0,.01); if(k==='air')air.gain.setTargetAtTime(v,0,.01); if(k==='hpf')hpf.frequency.setTargetAtTime(v,0,.01); },
    getState:()=>({shimmer:shimmer.gain.value,air:air.gain.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};

// ── BASS / LOW END ────────────────────────────────────────────────────────
