// =============================================================================
// MasteringEQPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createMasteringEQPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const sub=context.createBiquadFilter(), low=context.createBiquadFilter(),
        lowMid=context.createBiquadFilter(), highMid=context.createBiquadFilter(),
        high=context.createBiquadFilter(), air=context.createBiquadFilter();
  sub.type='highpass'; sub.frequency.value=20; sub.Q.value=0.7;
  low.type='lowshelf'; low.frequency.value=120; low.gain.value=p.low??0;
  lowMid.type='peaking'; lowMid.frequency.value=400; lowMid.gain.value=p.lowMid??0; lowMid.Q.value=1;
  highMid.type='peaking'; highMid.frequency.value=2500; highMid.gain.value=p.highMid??0; highMid.Q.value=1;
  high.type='highshelf'; high.frequency.value=8000; high.gain.value=p.high??0;
  air.type='highshelf'; air.frequency.value=16000; air.gain.value=p.air??0;
  input.connect(sub); sub.connect(low); low.connect(lowMid); lowMid.connect(highMid); highMid.connect(high); high.connect(air); air.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='low')low.gain.setTargetAtTime(v,0,.01); if(k==='lowMid')lowMid.gain.setTargetAtTime(v,0,.01); if(k==='highMid')highMid.gain.setTargetAtTime(v,0,.01); if(k==='high')high.gain.setTargetAtTime(v,0,.01); if(k==='air')air.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({low:low.gain.value,lowMid:lowMid.gain.value,highMid:highMid.gain.value,high:high.gain.value,air:air.gain.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
