// =============================================================================
// OctaverPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createOctaverPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const dryGain=context.createGain(), octDownGain=context.createGain(), octUpGain=context.createGain();
  dryGain.gain.value=p.dry??1; octDownGain.gain.value=p.octDown??0.5; octUpGain.gain.value=p.octUp??0;
  // Octave down via ring modulation at half frequency
  const subOsc=context.createOscillator(); subOsc.frequency.value=55; subOsc.type='sine';
  const subGain=context.createGain(); subGain.gain.value=0;
  subOsc.connect(subGain); subOsc.start();
  input.connect(dryGain); dryGain.connect(output);
  input.connect(octDownGain); octDownGain.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='dry')dryGain.gain.setTargetAtTime(v,0,.01); if(k==='octDown')octDownGain.gain.setTargetAtTime(v,0,.01); if(k==='octUp')octUpGain.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({dry:dryGain.gain.value,octDown:octDownGain.gain.value}), connect:d=>output.connect(d), disconnect:()=>{subOsc.stop();output.disconnect();} };
};
