// =============================================================================
// LooperPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createLooperPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  let recording=false, playing=false;
  let recordedBuffer=null, source=null;
  const rec=[];
  const proc=context.createScriptProcessor(1024,1,1);
  proc.onaudioprocess=(e)=>{ if(recording)rec.push(...e.inputBuffer.getChannelData(0)); };
  input.connect(proc); proc.connect(output); input.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){
      if(k==='record'&&v){recording=true;rec.length=0;}
      if(k==='record'&&!v){ recording=false; const buf=context.createBuffer(1,rec.length,context.sampleRate); buf.getChannelData(0).set(rec); recordedBuffer=buf; }
      if(k==='play'&&v&&recordedBuffer){ source=context.createBufferSource(); source.buffer=recordedBuffer; source.loop=true; source.connect(output); source.start(); playing=true; }
      if(k==='play'&&!v&&source){ source.stop(); playing=false; }
    },
    getState:()=>({recording,playing}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
