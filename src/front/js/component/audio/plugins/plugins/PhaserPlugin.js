// =============================================================================
// PhaserPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createPhaserPlugin = (context, p = {}) => {
  const input   = context.createGain();
  const output  = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const lfo     = context.createOscillator();
  const lfoGain = context.createGain();

  // 6 all-pass stages
  const stages = Array.from({ length: 6 }, () => {
    const f = context.createBiquadFilter();
    f.type = 'allpass'; f.frequency.value = p.freq ?? 1000; f.Q.value = p.resonance ?? 3;
    return f;
  });

  lfo.frequency.value = p.rate ?? 0.5;
  lfoGain.gain.value  = p.depth ?? 500;
  lfo.connect(lfoGain);
  stages.forEach(s => lfoGain.connect(s.frequency));
  lfo.start();

  stages.reduce((a, b) => { a.connect(b); return b; }, input.connect(stages[0]) && stages[0]);

  const mix = (p.mix ?? 50) / 100;
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;

  input.connect(dryGain); dryGain.connect(output);
  stages[stages.length-1].connect(wetGain); wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (k === 'rate')      lfo.frequency.setTargetAtTime(v, 0, 0.05);
      if (k === 'depth')     lfoGain.gain.setTargetAtTime(v, 0, 0.01);
      if (k === 'resonance') stages.forEach(s => s.Q.setTargetAtTime(v, 0, 0.01));
      if (k === 'mix')       { dryGain.gain.setTargetAtTime(1-v/100, 0, 0.05); wetGain.gain.setTargetAtTime(v/100, 0, 0.05); }
    },
    getState: () => ({ rate: lfo.frequency.value, mix: wetGain.gain.value * 100 }),
    connect: d => output.connect(d),
    disconnect: () => { lfo.stop(); output.disconnect(); },
  };
};
