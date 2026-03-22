// =============================================================================
// RoomReverbPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createRoomReverbPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const convolver=context.createConvolver();
  const dryGain=context.createGain(), wetGain=context.createGain();
  const sr=context.sampleRate, decay=p.decay??0.8, len=Math.floor(sr*decay);
  const ir=context.createBuffer(2,len,sr);
  for(let ch=0;ch<2;ch++){ const d=ir.getChannelData(ch); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.exp(-i/(len*0.3)); }
  convolver.buffer=ir;
  const mix=(p.mix??20)/100;
  dryGain.gain.value=1-mix; wetGain.gain.value=mix;
  input.connect(dryGain); dryGain.connect(output);
  input.connect(convolver); convolver.connect(wetGain); wetGain.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='mix'){dryGain.gain.setTargetAtTime(1-v/100,0,.05);wetGain.gain.setTargetAtTime(v/100,0,.05);} },
    getState:()=>({mix:wetGain.gain.value*100}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
