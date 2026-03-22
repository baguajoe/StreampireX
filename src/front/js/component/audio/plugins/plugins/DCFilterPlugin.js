// =============================================================================
// DCFilterPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createDCFilterPlugin = (context, p = {}) => {
  const input=context.createGain(), output=context.createGain();
  const hpf=context.createBiquadFilter();
  hpf.type='highpass'; hpf.frequency.value=5; hpf.Q.value=0.7;
  input.connect(hpf); hpf.connect(output);
  return { inputNode:input, node:input, setParam:()=>{}, getState:()=>({}), connect:d=>output.connect(d), disconnect:()=>output.disconnect() };
};
