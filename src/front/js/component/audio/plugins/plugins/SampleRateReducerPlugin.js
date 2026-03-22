// =============================================================================
// SampleRateReducerPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createSampleRateReducerPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const proc=context.createScriptProcessor(512,1,1);
  let reduction=p.reduction??4, counter=0, lastSample=0;
  proc.onaudioprocess=(e)=>{
    const inp=e.inputBuffer.getChannelData(0), out=e.outputBuffer.getChannelData(0);
    for(let i=0;i<inp.length;i++){
      counter++; if(counter>=reduction){lastSample=inp[i];counter=0;}
      out[i]=lastSample;
    }
  };
  input.connect(proc); proc.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='reduction')reduction=Math.max(1,Math.round(v)); },
    getState:()=>({reduction}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};

// ── SPECIAL TOOLS ──────────────────────────────────────────────────────────
