// =============================================================================
// ConvolutionShaperPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createConvolutionShaperPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const driveGain=context.createGain();
  const ws=context.createWaveShaper();
  const toneFilter=context.createBiquadFilter(); toneFilter.type='lowpass';
  const convolver=context.createConvolver();
  const dryGain=context.createGain(), wetGain=context.createGain();

  const sr=context.sampleRate, len=Math.floor(sr*0.05);
  const ir=context.createBuffer(1,len,sr);
  const d=ir.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.exp(-i/len*5);
  convolver.buffer=ir;

  // Build tanh waveshaper curve once; intensity controlled by driveGain.
  const n=512,c=new Float32Array(n);
  for(let i=0;i<n;i++){const x=(2*i/n)-1; c[i]=Math.tanh(x*4);}
  ws.curve=c;

  const driveDef=Math.max(0,Math.min(1,Number.isFinite(p.drive)?p.drive:0));
  const toneDef=Math.max(200,Math.min(8000,Number.isFinite(p.tone)?p.tone:2000));
  const mixDef=Math.max(0,Math.min(100,Number.isFinite(p.mix)?p.mix:0))/100;

  driveGain.gain.value=1+driveDef*4;
  toneFilter.frequency.value=toneDef;
  dryGain.gain.value=1-mixDef;
  wetGain.gain.value=mixDef;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(driveGain); driveGain.connect(ws); ws.connect(convolver); convolver.connect(toneFilter); toneFilter.connect(wetGain); wetGain.connect(output);

  return {
    inputNode:input, node:input,
    setParam(k,v){
      if(!Number.isFinite(v)) return;
      const t=context.currentTime;
      if(k==='drive'){ const c=Math.max(0,Math.min(1,v)); driveGain.gain.setTargetAtTime(1+c*4,t,0.01); }
      else if(k==='tone') toneFilter.frequency.setTargetAtTime(Math.max(200,Math.min(8000,v)),t,0.01);
      else if(k==='mix'){ const c=Math.max(0,Math.min(100,v))/100; dryGain.gain.setTargetAtTime(1-c,t,0.05); wetGain.gain.setTargetAtTime(c,t,0.05); }
    },
    getState:()=>({drive:(driveGain.gain.value-1)/4,tone:toneFilter.frequency.value,mix:wetGain.gain.value*100}),
    connect:d=>output.connect(d),
    disconnect:()=>{try{output.disconnect();}catch(e){}},
    destroy:()=>{[input,driveGain,ws,toneFilter,convolver,dryGain,wetGain,output].forEach(n=>{try{n.disconnect();}catch(e){}});}
  };
};
