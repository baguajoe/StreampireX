// =============================================================================
// BitDepthPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createBitDepthPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const proc=context.createScriptProcessor(512,1,1);
  let bits=p.bits??8;
  proc.onaudioprocess=(e)=>{
    const inp=e.inputBuffer.getChannelData(0), out=e.outputBuffer.getChannelData(0);
    const levels=Math.pow(2,bits);
    for(let i=0;i<inp.length;i++) out[i]=Math.round(inp[i]*levels)/levels;
  };
  input.connect(proc); proc.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='bits')bits=Math.max(1,Math.min(24,Math.round(v))); },
    getState:()=>({bits}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
