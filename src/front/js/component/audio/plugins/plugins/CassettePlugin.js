// =============================================================================
// CassettePlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createCassettePlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const driveGain=context.createGain();
  const ws=context.createWaveShaper();
  const lpf=context.createBiquadFilter(); lpf.type='lowpass';
  const dryGain=context.createGain(), wetGain=context.createGain();
  const noiseGain=context.createGain();

  const driveDef=Math.max(0,Math.min(1,Number.isFinite(p.drive)?p.drive:0));
  const noiseDef=Math.max(0,Math.min(0.2,Number.isFinite(p.noise)?p.noise:0));
  const hfLossDef=Math.max(0,Math.min(1,Number.isFinite(p.hfLoss)?p.hfLoss:0));
  const mixDef=Math.max(0,Math.min(100,Number.isFinite(p.mix)?p.mix:0))/100;

  // Build waveshaper curve once; intensity scaled via driveGain
  const n=512,c=new Float32Array(n);
  for(let i=0;i<n;i++){const x=(2*i/n)-1; c[i]=Math.tanh(x*3)*0.85;}
  ws.curve=c;
  driveGain.gain.value=1+driveDef*4; // 1x..5x pre-gain into shaper

  // hfLoss 0 -> 18kHz (transparent), 1 -> 3kHz (heavy loss)
  lpf.frequency.value=18000-hfLossDef*15000;
  dryGain.gain.value=1-mixDef;
  wetGain.gain.value=mixDef;

  // Noise via short looped white-noise buffer source
  const noiseBuf=context.createBuffer(1,context.sampleRate*0.5,context.sampleRate);
  const nd=noiseBuf.getChannelData(0);
  for(let i=0;i<nd.length;i++) nd[i]=(Math.random()*2-1)*0.4;
  const noiseSrc=context.createBufferSource();
  noiseSrc.buffer=noiseBuf; noiseSrc.loop=true;
  const noiseHpf=context.createBiquadFilter(); noiseHpf.type='highpass'; noiseHpf.frequency.value=2000;
  noiseGain.gain.value=noiseDef;
  noiseSrc.connect(noiseHpf); noiseHpf.connect(noiseGain); noiseGain.connect(wetGain);
  noiseSrc.start();

  // Routing: dry + (drive→ws→lpf) wet path; both summed at output
  input.connect(dryGain); dryGain.connect(output);
  input.connect(driveGain); driveGain.connect(ws); ws.connect(lpf); lpf.connect(wetGain); wetGain.connect(output);

  return {
    inputNode:input, node:input,
    setParam(k,v){
      if(!Number.isFinite(v)) return;
      const t=context.currentTime;
      if(k==='drive'){ const c=Math.max(0,Math.min(1,v)); driveGain.gain.setTargetAtTime(1+c*4,t,0.01); }
      else if(k==='noise'){ const c=Math.max(0,Math.min(0.2,v)); noiseGain.gain.setTargetAtTime(c,t,0.01); }
      else if(k==='hfLoss'){ const c=Math.max(0,Math.min(1,v)); lpf.frequency.setTargetAtTime(18000-c*15000,t,0.01); }
      else if(k==='mix'){ const c=Math.max(0,Math.min(100,v))/100; dryGain.gain.setTargetAtTime(1-c,t,0.05); wetGain.gain.setTargetAtTime(c,t,0.05); }
    },
    getState:()=>({drive:(driveGain.gain.value-1)/4,noise:noiseGain.gain.value,hfLoss:(18000-lpf.frequency.value)/15000,mix:wetGain.gain.value*100}),
    connect:d=>output.connect(d),
    disconnect:()=>{try{noiseSrc.stop();}catch(e){}try{output.disconnect();}catch(e){}},
    destroy:()=>{try{noiseSrc.stop();}catch(e){}[input,driveGain,ws,lpf,dryGain,wetGain,noiseSrc,noiseHpf,noiseGain,output].forEach(n=>{try{n.disconnect();}catch(e){}});}
  };
};
