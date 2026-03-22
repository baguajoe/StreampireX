// =============================================================================
// DottedEighthDelayPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createDottedEighthDelayPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const bpm=p.bpm??120;
  const dotted8th=(60/bpm)*0.75;
  const delay=context.createDelay(2), feedback=context.createGain(), dryGain=context.createGain(), wetGain=context.createGain();
  delay.delayTime.value=dotted8th; feedback.gain.value=p.feedback??0.4;
  const mix=(p.mix??30)/100;
  dryGain.gain.value=1-mix; wetGain.gain.value=mix;
  input.connect(dryGain); dryGain.connect(output);
  input.connect(delay); delay.connect(feedback); feedback.connect(delay); delay.connect(wetGain); wetGain.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='bpm')delay.delayTime.setTargetAtTime((60/v)*0.75,0,.05); if(k==='feedback')feedback.gain.setTargetAtTime(Math.min(0.95,v),0,.01); if(k==='mix'){dryGain.gain.setTargetAtTime(1-v/100,0,.05);wetGain.gain.setTargetAtTime(v/100,0,.05);} },
    getState:()=>({delay:delay.delayTime.value,feedback:feedback.gain.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};

// ── CREATIVE / SPECIAL ────────────────────────────────────────────────────
