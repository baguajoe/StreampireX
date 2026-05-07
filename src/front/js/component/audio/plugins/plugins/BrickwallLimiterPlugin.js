// =============================================================================
// BrickwallLimiterPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createBrickwallLimiterPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const lookaheadDelay=context.createDelay(0.05);
  const comp=context.createDynamicsCompressor();
  const outGain=context.createGain();

  const ceilingDef=Number.isFinite(p.ceiling)?p.ceiling:-0.3;
  const lookaheadDef=Number.isFinite(p.lookahead)?p.lookahead:5;
  const releaseDef=Number.isFinite(p.release)?p.release:100;
  const outputGainDef=Number.isFinite(p.outputGain)?p.outputGain:0;

  comp.threshold.value=Math.max(-6,Math.min(0,ceilingDef));
  comp.knee.value=0;
  comp.ratio.value=20;
  comp.attack.value=0.001;
  comp.release.value=Math.max(10,Math.min(2000,releaseDef))/1000;
  lookaheadDelay.delayTime.value=Math.max(0,Math.min(20,lookaheadDef))/1000;
  outGain.gain.value=Math.pow(10,Math.max(-12,Math.min(0,outputGainDef))/20);

  input.connect(lookaheadDelay); lookaheadDelay.connect(comp); comp.connect(outGain); outGain.connect(output);
  return {
    inputNode:input, node:input,
    setParam(k,v){
      if(!Number.isFinite(v)) return;
      const t=context.currentTime;
      if(k==='ceiling') comp.threshold.setTargetAtTime(Math.max(-6,Math.min(0,v)),t,0.01);
      else if(k==='lookahead') lookaheadDelay.delayTime.setTargetAtTime(Math.max(0,Math.min(20,v))/1000,t,0.01);
      else if(k==='release') comp.release.setTargetAtTime(Math.max(10,Math.min(2000,v))/1000,t,0.01);
      else if(k==='outputGain') outGain.gain.setTargetAtTime(Math.pow(10,Math.max(-12,Math.min(0,v))/20),t,0.01);
    },
    getState:()=>({ceiling:comp.threshold.value,lookahead:lookaheadDelay.delayTime.value*1000,release:comp.release.value*1000,outputGain:20*Math.log10(outGain.gain.value||1e-6)}),
    connect:d=>output.connect(d),
    disconnect:()=>{try{output.disconnect();}catch(e){}},
    destroy:()=>{[input,lookaheadDelay,comp,outGain,output].forEach(n=>{try{n.disconnect();}catch(e){}});}
  };
};
