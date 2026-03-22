// =============================================================================
// WowFlutterPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createWowFlutterPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const delay=context.createDelay(0.05);
  const wowLFO=context.createOscillator(), wowGain=context.createGain();
  const flutterLFO=context.createOscillator(), flutterGain=context.createGain();
  delay.delayTime.value=0.02;
  wowLFO.frequency.value=0.5; wowGain.gain.value=p.wow??0.005;
  flutterLFO.frequency.value=8; flutterGain.gain.value=p.flutter??0.001;
  wowLFO.connect(wowGain); wowGain.connect(delay.delayTime);
  flutterLFO.connect(flutterGain); flutterGain.connect(delay.delayTime);
  wowLFO.start(); flutterLFO.start();
  input.connect(delay); delay.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='wow')wowGain.gain.setTargetAtTime(v,0,.01); if(k==='flutter')flutterGain.gain.setTargetAtTime(v,0,.01); },
    getState:()=>({wow:wowGain.gain.value,flutter:flutterGain.gain.value}), connect:d=>output.connect(d), disconnect:()=>{wowLFO.stop();flutterLFO.stop();output.disconnect();} };
};
