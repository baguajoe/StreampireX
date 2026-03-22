// =============================================================================
// PingPongDelayPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createPingPongDelayPlugin = (context, p = {}) => {
  const input    = context.createGain();
  const output   = context.createGain();
  const dryGain  = context.createGain();
  const wetGain  = context.createGain();
  const delayL   = context.createDelay(2.0);
  const delayR   = context.createDelay(2.0);
  const feedbackL = context.createGain();
  const feedbackR = context.createGain();
  const merger   = context.createChannelMerger(2);
  const splitter = context.createChannelSplitter(2);

  const time = (p.time ?? 375) / 1000;
  delayL.delayTime.value = time;
  delayR.delayTime.value = time * 2;
  feedbackL.gain.value   = p.feedback ?? 0.4;
  feedbackR.gain.value   = p.feedback ?? 0.4;

  const mix = (p.mix ?? 30) / 100;
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(splitter);
  splitter.connect(delayL, 0); delayL.connect(feedbackL); feedbackL.connect(delayR);
  splitter.connect(delayR, 1); delayR.connect(feedbackR); feedbackR.connect(delayL);
  delayL.connect(merger, 0, 0);
  delayR.connect(merger, 0, 1);
  merger.connect(wetGain); wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (k === 'time')     { delayL.delayTime.setTargetAtTime(v/1000, 0, 0.05); delayR.delayTime.setTargetAtTime(v/500, 0, 0.05); }
      if (k === 'feedback') { feedbackL.gain.setTargetAtTime(Math.min(0.9,v), 0, 0.01); feedbackR.gain.setTargetAtTime(Math.min(0.9,v), 0, 0.01); }
      if (k === 'mix')      { dryGain.gain.setTargetAtTime(1-v/100, 0, 0.05); wetGain.gain.setTargetAtTime(v/100, 0, 0.05); }
    },
    getState: () => ({ time: delayL.delayTime.value * 1000, feedback: feedbackL.gain.value, mix: wetGain.gain.value * 100 }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 23. ChorusPlugin.js — Classic stereo chorus
// ─────────────────────────────────────────────────────────────────────────────
export const createChorusPlugin = (context, p = {}) => {
  const input   = context.createGain();
  const output  = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();

  const voices = [0, 1, 2].map(i => {
    const delay = context.createDelay(0.05);
    const lfo   = context.createOscillator();
    const lfoGain = context.createGain();
    delay.delayTime.value = 0.02 + i * 0.005;
    lfo.frequency.value   = (p.rate ?? 1.5) + i * 0.3;
    lfoGain.gain.value    = (p.depth ?? 0.003);
    lfo.connect(lfoGain); lfoGain.connect(delay.delayTime);
    lfo.start();
    return { delay };
  });

  const mix = (p.mix ?? 50) / 100;
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix / voices.length;

  input.connect(dryGain); dryGain.connect(output);
  voices.forEach(v => { input.connect(v.delay); v.delay.connect(wetGain); });
  wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (k === 'mix') { dryGain.gain.setTargetAtTime(1-v/100, 0, 0.05); wetGain.gain.setTargetAtTime(v/100/voices.length, 0, 0.05); }
    },
    getState: () => ({ mix: wetGain.gain.value * voices.length * 100 }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 24. FlangerPlugin.js — Sweeping flanger with comb filter effect
// ─────────────────────────────────────────────────────────────────────────────
export const createFlangerPlugin = (context, p = {}) => {
  const input    = context.createGain();
  const output   = context.createGain();
  const dryGain  = context.createGain();
  const wetGain  = context.createGain();
  const delay    = context.createDelay(0.02);
  const feedback = context.createGain();
  const lfo      = context.createOscillator();
  const lfoGain  = context.createGain();

  delay.delayTime.value = 0.005;
  feedback.gain.value   = p.feedback ?? 0.5;
  lfo.frequency.value   = p.rate ?? 0.3;
  lfoGain.gain.value    = p.depth ?? 0.003;

  lfo.connect(lfoGain); lfoGain.connect(delay.delayTime);
  lfo.start();

  const mix = (p.mix ?? 50) / 100;
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(delay);
  delay.connect(feedback); feedback.connect(delay);
  delay.connect(wetGain); wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (k === 'rate')     lfo.frequency.setTargetAtTime(v, 0, 0.05);
      if (k === 'depth')    lfoGain.gain.setTargetAtTime(v, 0, 0.01);
      if (k === 'feedback') feedback.gain.setTargetAtTime(Math.min(0.95, v), 0, 0.01);
      if (k === 'mix')      { dryGain.gain.setTargetAtTime(1-v/100, 0, 0.05); wetGain.gain.setTargetAtTime(v/100, 0, 0.05); }
    },
    getState: () => ({ rate: lfo.frequency.value, feedback: feedback.gain.value, mix: wetGain.gain.value * 100 }),
    connect: d => output.connect(d),
    disconnect: () => { lfo.stop(); output.disconnect(); },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 25. PhaserPlugin.js — All-pass phaser with resonance
// ─────────────────────────────────────────────────────────────────────────────
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
