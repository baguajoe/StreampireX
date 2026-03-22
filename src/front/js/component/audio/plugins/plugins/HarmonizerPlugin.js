// =============================================================================
// HarmonizerPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createHarmonizerPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const dryGain=context.createGain();
  dryGain.gain.value=1;
  // 3-voice harmonizer using pitch-shifted delays
  const voices=[-7,0,5].map((semi,i)=>{
    const d=context.createDelay(0.1), g=context.createGain(), f=context.createBiquadFilter();
    d.delayTime.value=0.01+i*0.003+Math.abs(semi)*0.002;
    g.gain.value=(p[`voice${i}`]??0.4);
    f.type='allpass'; f.frequency.value=1000;
    input.connect(d); d.connect(f); f.connect(g); g.connect(output);
    return {d,g};
  });
  input.connect(dryGain); dryGain.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ const m=k.match(/^voice(\d+)$/); if(m)voices[+m[1]]?.g.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({voices:voices.map(v=>v.g.gain.value)}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};

// ── MODULATION EXTRAS ─────────────────────────────────────────────────────
