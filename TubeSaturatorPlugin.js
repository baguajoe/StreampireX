// =============================================================================
// TubeSaturatorPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createTubeSaturatorPlugin = (context, p = {}) => {
  const input = context.createGain(), output = context.createGain();
  const ws = context.createWaveShaper();
  const tone = context.createBiquadFilter();
  const makeup = context.createGain();
  let drive = p.drive ?? 0.5;
  const makeCurve = (d) => {
    const n = 512, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (2*i/n)-1; c[i] = (1+d)*x/(1+d*Math.abs(x)); }
    return c;
  };
  ws.curve = makeCurve(drive); ws.oversample = '4x';
  tone.type = 'lowshelf'; tone.frequency.value = 200; tone.gain.value = p.warmth ?? 2;
  makeup.gain.value = Math.pow(10, (p.makeup??0)/20);
  input.connect(ws); ws.connect(tone); tone.connect(makeup); makeup.connect(output);
  return { inputNode:input, node:input,
    setParam(k,v){ if(k==='drive'){drive=v;ws.curve=makeCurve(v);} if(k==='warmth')tone.gain.setTargetAtTime(v,0,.01); if(k==='makeup')makeup.gain.setTargetAtTime(Math.pow(10,v/20),0,.01); },
    getState:()=>({drive,warmth:tone.gain.value}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
