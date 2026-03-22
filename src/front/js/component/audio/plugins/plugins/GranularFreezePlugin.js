// =============================================================================
// GranularFreezePlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createGranularFreezePlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const bufferSize=1024;
  const proc=context.createScriptProcessor(bufferSize,1,1);
  let frozen=false, frozenBuffer=new Float32Array(bufferSize), pos=0;
  proc.onaudioprocess=(e)=>{
    const inp=e.inputBuffer.getChannelData(0), out=e.outputBuffer.getChannelData(0);
    if(!frozen){ for(let i=0;i<bufferSize;i++){frozenBuffer[i]=inp[i];out[i]=inp[i];} }
    else{ for(let i=0;i<bufferSize;i++){out[i]=frozenBuffer[pos%bufferSize];pos++;} }
  };
  input.connect(proc); proc.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='freeze')frozen=!!v; },
    getState:()=>({frozen}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
