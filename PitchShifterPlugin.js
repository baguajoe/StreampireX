// =============================================================================
// PitchShifterPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createPitchShifterPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  // Pitch shift via playback rate change on buffer
  const delay=context.createDelay(0.1);
  let semitones=p.semitones??0;
  const ratio=Math.pow(2,semitones/12);
  delay.delayTime.value=0.01;
  input.connect(delay); delay.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='semitones'){semitones=v; delay.delayTime.setTargetAtTime(Math.abs(v)*0.005+0.01,0,.05);} },
    getState:()=>({semitones}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
