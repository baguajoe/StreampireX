// =============================================================================
// ChoirPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createChoirPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const dryGain=context.createGain(), wetGain=context.createGain();

  const voicesCount=Math.max(2,Math.min(8,Math.round(Number.isFinite(p.voices)?p.voices:4)));
  let spread=Math.max(0,Math.min(1,Number.isFinite(p.spread)?p.spread:0.5));
  let detuneCents=Math.max(0,Math.min(50,Number.isFinite(p.detune)?p.detune:15));
  const mixDef=Math.max(0,Math.min(100,Number.isFinite(p.mix)?p.mix:0))/100;

  // Build N voices: each = delay + LFO modulating delayTime
  const voices=Array.from({length:voicesCount},(_,i)=>{
    const d=context.createDelay(0.1);
    const lfo=context.createOscillator();
    const lg=context.createGain();
    const g=context.createGain();
    const baseDelay=0.015+i*0.007*spread;
    d.delayTime.value=baseDelay;
    lfo.frequency.value=2+i*0.3;
    // LFO depth in seconds derived from cents: cents → fraction × baseDelay
    lg.gain.value=(detuneCents/1200)*baseDelay;
    g.gain.value=1/voicesCount;
    lfo.connect(lg); lg.connect(d.delayTime); lfo.start();
    input.connect(d); d.connect(g); g.connect(wetGain);
    return {d,lfo,lg,baseDelay:i};
  });

  dryGain.gain.value=1-mixDef;
  wetGain.gain.value=mixDef;
  input.connect(dryGain); dryGain.connect(output);
  wetGain.connect(output);

  const applySpread=()=>{
    voices.forEach((v,i)=>{
      const baseDelay=0.015+i*0.007*spread;
      v.d.delayTime.setTargetAtTime(baseDelay,context.currentTime,0.05);
      v.lg.gain.setTargetAtTime((detuneCents/1200)*baseDelay,context.currentTime,0.05);
    });
  };

  return {
    inputNode:input, node:input,
    setParam(k,v){
      if(!Number.isFinite(v)) return;
      const t=context.currentTime;
      if(k==='spread'){ spread=Math.max(0,Math.min(1,v)); applySpread(); }
      else if(k==='detune'){ detuneCents=Math.max(0,Math.min(50,v)); applySpread(); }
      else if(k==='mix'){ const c=Math.max(0,Math.min(100,v))/100; dryGain.gain.setTargetAtTime(1-c,t,0.05); wetGain.gain.setTargetAtTime(c,t,0.05); }
      // 'voices' is structural (count of LFO/delay graph) — would require rebuild.
      // Phase C: rebuild voice graph on count change. For now, registry default applied at construction.
    },
    getState:()=>({voices:voices.length,spread,detune:detuneCents,mix:wetGain.gain.value*100}),
    connect:d=>output.connect(d),
    disconnect:()=>{ voices.forEach(v=>{try{v.lfo.stop();}catch(e){}}); try{output.disconnect();}catch(e){} },
    destroy:()=>{ voices.forEach(v=>{try{v.lfo.stop();}catch(e){}try{v.lfo.disconnect();}catch(e){}try{v.lg.disconnect();}catch(e){}try{v.d.disconnect();}catch(e){}}); [input,dryGain,wetGain,output].forEach(n=>{try{n.disconnect();}catch(e){}}); }
  };
};
