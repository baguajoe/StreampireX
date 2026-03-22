// =============================================================================
// DustScratchPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createDustScratchPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const noiseBuffer=context.createBuffer(1,context.sampleRate,context.sampleRate);
  const data=noiseBuffer.getChannelData(0);
  for(let i=0;i<data.length;i++) data[i]=Math.random()*2-1;
  const noise=context.createBufferSource(); noise.buffer=noiseBuffer; noise.loop=true;
  const noiseFilter=context.createBiquadFilter(); noiseFilter.type='bandpass'; noiseFilter.frequency.value=8000; noiseFilter.Q.value=0.2;
  const noiseGain=context.createGain(); noiseGain.gain.value=p.dust??0.01;
  const crackleGain=context.createGain(); crackleGain.gain.value=p.crackle??0.003;
  noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(output);
  noise.connect(crackleGain); crackleGain.connect(output);
  noise.start(); input.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='dust')noiseGain.gain.setTargetAtTime(v,0,.01); if(k==='crackle')crackleGain.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({dust:noiseGain.gain.value,crackle:crackleGain.gain.value}), connect:d=>output.connect(d), disconnect:()=>{noise.stop();output.disconnect();} };
};
