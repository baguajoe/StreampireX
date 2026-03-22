// =============================================================================
// StepFilterPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createStepFilterPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const filter=context.createBiquadFilter();
  filter.type='bandpass'; filter.Q.value=p.q??3;
  const steps=p.steps??[200,400,800,1600,3200,800,400,200];
  let step=0;
  const bpm=p.bpm??120, stepsPerBeat=p.stepsPerBeat??2;
  const interval=(60/bpm/stepsPerBeat)*1000;
  const tick=setInterval(()=>{
    filter.frequency.setTargetAtTime(steps[step%steps.length],context.currentTime,0.01);
    step++;
  },interval);
  input.connect(filter); filter.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='q')filter.Q.setTargetAtTime(v,0,.01); },
    getState:()=>({step,q:filter.Q.value}), connect:d=>output.connect(d), disconnect:()=>{clearInterval(tick);output.disconnect();} };
};
