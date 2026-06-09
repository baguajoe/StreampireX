// =============================================================================
// BreathGatePlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createBreathGatePlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const detector=context.createAnalyser(); detector.fftSize=256;
  const buf=new Uint8Array(detector.frequencyBinCount);
  let threshold=Number.isFinite(p.threshold)?p.threshold:-40;
  let reductionDb=Number.isFinite(p.reduction)?p.reduction:-20;
  let attackS=(Number.isFinite(p.attack)?p.attack:2)/1000;
  let releaseS=(Number.isFinite(p.release)?p.release:100)/1000;
  let open=false;
  const tick=setInterval(()=>{
    detector.getByteFrequencyData(buf);
    const rms=buf.reduce((a,v)=>a+v*v,0)/buf.length;
    const db=20*Math.log10(Math.sqrt(rms)/128+1e-6);
    const floor=Math.pow(10,reductionDb/20);
    if(db>threshold&&!open){open=true;output.gain.setTargetAtTime(1,context.currentTime,attackS);}
    else if(db<=threshold&&open){open=false;output.gain.setTargetAtTime(floor,context.currentTime,releaseS);}
  },25);
  input.connect(detector); input.connect(output);
  const api={
    inputNode:input, node:input,
    setParam(k,v){
      if(!Number.isFinite(v)) return;
      if(k==='threshold') threshold=Math.max(-80,Math.min(0,v));
      else if(k==='reduction') reductionDb=Math.max(-40,Math.min(0,v));
      else if(k==='attack') attackS=Math.max(0.1,Math.min(20,v))/1000;
      else if(k==='release') releaseS=Math.max(10,Math.min(500,v))/1000;
    },
    getState:()=>({threshold,reduction:reductionDb,attack:attackS*1000,release:releaseS*1000}),
    connect:d=>output.connect(d),
    disconnect:()=>{clearInterval(tick);try{output.disconnect();}catch(e){}},
    destroy:()=>{clearInterval(tick);try{input.disconnect();}catch(e){}try{output.disconnect();}catch(e){}try{detector.disconnect();}catch(e){}}
  };
  return api;
};
