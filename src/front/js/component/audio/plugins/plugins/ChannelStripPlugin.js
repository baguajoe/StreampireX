// =============================================================================
// ChannelStripPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createChannelStripPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const inGain=context.createGain();
  const phaseGain=context.createGain();
  const hpf=context.createBiquadFilter(); hpf.type='highpass';
  const lpf=context.createBiquadFilter(); lpf.type='lowpass';
  const outGain=context.createGain();

  const inputGainDb=Math.max(-24,Math.min(24,Number.isFinite(p.inputGain)?p.inputGain:0));
  const hpfHz=Math.max(0,Math.min(500,Number.isFinite(p.hpf)?p.hpf:0));
  const lpfHz=Math.max(2000,Math.min(20000,Number.isFinite(p.lpf)?p.lpf:20000));
  const phaseFlip=Number.isFinite(p.phase)?p.phase:0;
  const outputGainDb=Math.max(-24,Math.min(24,Number.isFinite(p.outputGain)?p.outputGain:0));

  inGain.gain.value=Math.pow(10,inputGainDb/20);
  hpf.frequency.value=hpfHz<=0?20:hpfHz;
  lpf.frequency.value=lpfHz;
  phaseGain.gain.value=phaseFlip>=0.5?-1:1;
  outGain.gain.value=Math.pow(10,outputGainDb/20);

  input.connect(inGain); inGain.connect(phaseGain); phaseGain.connect(hpf); hpf.connect(lpf); lpf.connect(outGain); outGain.connect(output);
  return {
    inputNode:input, node:input,
    setParam(k,v){
      if(!Number.isFinite(v)) return;
      const t=context.currentTime;
      if(k==='inputGain') inGain.gain.setTargetAtTime(Math.pow(10,Math.max(-24,Math.min(24,v))/20),t,0.01);
      else if(k==='hpf'){ const c=Math.max(0,Math.min(500,v)); hpf.frequency.setTargetAtTime(c<=0?20:c,t,0.01); }
      else if(k==='lpf') lpf.frequency.setTargetAtTime(Math.max(2000,Math.min(20000,v)),t,0.01);
      else if(k==='phase') phaseGain.gain.setTargetAtTime(v>=0.5?-1:1,t,0.01);
      else if(k==='outputGain') outGain.gain.setTargetAtTime(Math.pow(10,Math.max(-24,Math.min(24,v))/20),t,0.01);
    },
    getState:()=>({inputGain:20*Math.log10(inGain.gain.value||1e-6),hpf:hpf.frequency.value,lpf:lpf.frequency.value,phase:phaseGain.gain.value<0?1:0,outputGain:20*Math.log10(outGain.gain.value||1e-6)}),
    connect:d=>output.connect(d),
    disconnect:()=>{try{output.disconnect();}catch(e){}},
    destroy:()=>{[input,inGain,phaseGain,hpf,lpf,outGain,output].forEach(n=>{try{n.disconnect();}catch(e){}});}
  };
};
