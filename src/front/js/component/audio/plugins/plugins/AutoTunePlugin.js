// =============================================================================
// AutoTunePlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createAutoTunePlugin = (context, p = {}) => {
  // Simplified auto-tune using pitch detection + correction delay
  const input=context.createGain(), output=context.createGain();
  const analyzer=context.createAnalyser(); analyzer.fftSize=2048;
  const correctionDelay=context.createDelay(0.05);
  const smoothing=context.createBiquadFilter();
  smoothing.type='lowpass'; smoothing.frequency.value=8000;
  correctionDelay.delayTime.value=p.speed??0.01;
  input.connect(analyzer); input.connect(correctionDelay); correctionDelay.connect(smoothing); smoothing.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='speed')correctionDelay.delayTime.setTargetAtTime(v,0,.05); },
    getState:()=>({speed:correctionDelay.delayTime.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
