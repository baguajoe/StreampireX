// =============================================================================
// RingModPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createRingModPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const carrier=context.createOscillator(), carrierGain=context.createGain();
  const dryGain=context.createGain(), wetGain=context.createGain();
  carrier.frequency.value=p.frequency??440; carrier.type='sine';
  carrierGain.gain.value=1;
  carrier.connect(carrierGain); carrier.start();
  const mix=(p.mix??50)/100;
  dryGain.gain.value=1-mix; wetGain.gain.value=mix;
  // Ring mod via gain multiplication
  const ringNode=context.createGain(); ringNode.gain.value=0;
  carrierGain.connect(ringNode.gain);
  input.connect(dryGain); dryGain.connect(output);
  input.connect(ringNode); ringNode.connect(wetGain); wetGain.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='frequency')carrier.frequency.setTargetAtTime(v,0,.01); if(k==='mix'){dryGain.gain.setTargetAtTime(1-v/100,0,.05);wetGain.gain.setTargetAtTime(v/100,0,.05);} },
    getState:()=>({frequency:carrier.frequency.value,mix:wetGain.gain.value*100}), connect:d=>output.connect(d), disconnect:()=>{carrier.stop();output.disconnect();} };
};
