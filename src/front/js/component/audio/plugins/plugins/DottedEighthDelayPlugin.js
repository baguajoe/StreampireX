// =============================================================================
// DottedEighthDelayPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createDottedEighthDelayPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const bpmDef=Math.max(60,Math.min(200,Number.isFinite(p.bpm)?p.bpm:120));
  const dotted8th=(60/bpmDef)*0.75;
  const delay=context.createDelay(2);
  const feedback=context.createGain();
  const filterNode=context.createBiquadFilter(); filterNode.type='lowpass';
  const dryGain=context.createGain(), wetGain=context.createGain();

  delay.delayTime.value=dotted8th;
  // registry feedback is 0..95 (%), convert to 0..0.95 linear
  const fbDef=Math.max(0,Math.min(95,Number.isFinite(p.feedback)?p.feedback:30))/100;
  feedback.gain.value=fbDef;
  filterNode.frequency.value=Math.max(200,Math.min(20000,Number.isFinite(p.filter)?p.filter:8000));
  const mixDef=Math.max(0,Math.min(100,Number.isFinite(p.mix)?p.mix:0))/100;
  dryGain.gain.value=1-mixDef;
  wetGain.gain.value=mixDef;

  input.connect(dryGain); dryGain.connect(output);
  // feedback path: delay → filter → feedback gain → back into delay
  input.connect(delay);
  delay.connect(filterNode);
  filterNode.connect(feedback);
  feedback.connect(delay);
  delay.connect(wetGain);
  wetGain.connect(output);

  return {
    inputNode:input, node:input,
    setParam(k,v){
      if(!Number.isFinite(v)) return;
      const t=context.currentTime;
      if(k==='bpm'){ const c=Math.max(60,Math.min(200,v)); delay.delayTime.setTargetAtTime((60/c)*0.75,t,0.05); }
      else if(k==='feedback'){ const c=Math.max(0,Math.min(95,v))/100; feedback.gain.setTargetAtTime(c,t,0.01); }
      else if(k==='filter') filterNode.frequency.setTargetAtTime(Math.max(200,Math.min(20000,v)),t,0.01);
      else if(k==='mix'){ const c=Math.max(0,Math.min(100,v))/100; dryGain.gain.setTargetAtTime(1-c,t,0.05); wetGain.gain.setTargetAtTime(c,t,0.05); }
    },
    getState:()=>({bpm:60/(delay.delayTime.value/0.75),feedback:feedback.gain.value*100,filter:filterNode.frequency.value,mix:wetGain.gain.value*100}),
    connect:d=>output.connect(d),
    disconnect:()=>{try{output.disconnect();}catch(e){}},
    destroy:()=>{[input,delay,feedback,filterNode,dryGain,wetGain,output].forEach(n=>{try{n.disconnect();}catch(e){}});}
  };
};

// ── CREATIVE / SPECIAL ────────────────────────────────────────────────────
