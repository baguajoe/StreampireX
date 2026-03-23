// =============================================================================
// BitcrusherPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createBitcrusherPlugin = (context, p = {}) => {
  const input = context.createGain(), output = context.createGain();
  const proc = context.createScriptProcessor(1024, 1, 1);
  let bits = p.bits??8, sampleReduction = p.sampleReduction??1;
  let step = 0, lastSample = 0, counter = 0;
  proc.onaudioprocess = (e) => {
    const inp = e.inputBuffer.getChannelData(0);
    const out = e.outputBuffer.getChannelData(0);
    step = Math.pow(0.5, bits-1);
    for(let i=0;i<inp.length;i++){
      counter++;
      if(counter>=sampleReduction){ lastSample=step*Math.floor(inp[i]/step+0.5); counter=0; }
      out[i]=lastSample;
    }
  };
  input.connect(proc); proc.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='bits')bits=Math.max(1,Math.min(16,v)); if(k==='sampleReduction')sampleReduction=Math.max(1,Math.round(v)); },
    getState:()=>({bits,sampleReduction}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
