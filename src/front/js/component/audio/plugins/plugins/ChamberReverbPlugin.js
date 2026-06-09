// =============================================================================
// ChamberReverbPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createChamberReverbPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const convolver=context.createConvolver();
  const dryGain=context.createGain(), wetGain=context.createGain();
  const preDelayNode=context.createDelay(0.5);
  const dampingFilter=context.createBiquadFilter(); dampingFilter.type='lowpass';

  let decayS=Math.max(0.5,Math.min(8,Number.isFinite(p.decay)?p.decay:2.0));
  let diffusion=Math.max(0,Math.min(1,Number.isFinite(p.diffusion)?p.diffusion:0.8));

  const buildIR=()=>{
    const sr=context.sampleRate, len=Math.max(1,Math.floor(sr*decayS));
    const ir=context.createBuffer(2,len,sr);
    for(let ch=0;ch<2;ch++){
      const d=ir.getChannelData(ch);
      // diffusion controls early-vs-tail balance: higher = smoother decay
      const env=decayS*(0.3+0.7*diffusion);
      for(let i=0;i<len;i++){
        const t=i/sr;
        const head=t<0.01?t/0.01:1;
        d[i]=(Math.random()*2-1)*head*Math.exp(-(t)/env);
      }
    }
    convolver.buffer=ir;
  };
  buildIR();

  const preDelayMs=Math.max(0,Math.min(100,Number.isFinite(p.preDelay)?p.preDelay:15));
  preDelayNode.delayTime.value=preDelayMs/1000;
  dampingFilter.frequency.value=Math.max(1000,Math.min(20000,Number.isFinite(p.damping)?p.damping:6000));

  const mixDef=Math.max(0,Math.min(100,Number.isFinite(p.mix)?p.mix:0))/100;
  dryGain.gain.value=1-mixDef;
  wetGain.gain.value=mixDef;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(preDelayNode); preDelayNode.connect(dampingFilter); dampingFilter.connect(convolver); convolver.connect(wetGain); wetGain.connect(output);

  let rebuildTimer=null;
  const scheduleRebuild=()=>{
    if(rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer=setTimeout(()=>{ rebuildTimer=null; try{buildIR();}catch(e){} },120);
  };

  return {
    inputNode:input, node:input,
    setParam(k,v){
      if(!Number.isFinite(v)) return;
      const t=context.currentTime;
      if(k==='mix'){ const c=Math.max(0,Math.min(100,v))/100; dryGain.gain.setTargetAtTime(1-c,t,0.05); wetGain.gain.setTargetAtTime(c,t,0.05); }
      else if(k==='preDelay'){ preDelayNode.delayTime.setTargetAtTime(Math.max(0,Math.min(100,v))/1000,t,0.01); }
      else if(k==='damping'){ dampingFilter.frequency.setTargetAtTime(Math.max(1000,Math.min(20000,v)),t,0.01); }
      else if(k==='decay'){ decayS=Math.max(0.5,Math.min(8,v)); scheduleRebuild(); }
      else if(k==='diffusion'){ diffusion=Math.max(0,Math.min(1,v)); scheduleRebuild(); }
    },
    getState:()=>({mix:wetGain.gain.value*100,preDelay:preDelayNode.delayTime.value*1000,damping:dampingFilter.frequency.value,decay:decayS,diffusion}),
    connect:d=>output.connect(d),
    disconnect:()=>{ if(rebuildTimer){clearTimeout(rebuildTimer);rebuildTimer=null;} try{output.disconnect();}catch(e){} },
    destroy:()=>{ if(rebuildTimer){clearTimeout(rebuildTimer);rebuildTimer=null;} [input,dryGain,wetGain,preDelayNode,dampingFilter,convolver,output].forEach(n=>{try{n.disconnect();}catch(e){}});}
  };
};
