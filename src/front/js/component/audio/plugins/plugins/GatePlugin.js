// =============================================================================
// GatePlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createGatePlugin = (context, p = {}) => {
  const input    = context.createGain();
  const output   = context.createGain();
  const detector = context.createAnalyser();
  detector.fftSize = 256;

  let threshold = p.threshold ?? -40;
  let attack    = p.attack ?? 5;
  let release   = p.release ?? 100;
  let hold      = p.hold ?? 50;
  let open      = false;
  let holdTimer = 0;

  const buf = new Uint8Array(detector.frequencyBinCount);

  const tick = setInterval(() => {
    detector.getByteFrequencyData(buf);
    const rms = buf.reduce((a, v) => a + v * v, 0) / buf.length;
    const db  = 20 * Math.log10(Math.sqrt(rms) / 128 + 1e-6);

    if (db > threshold) {
      open = true; holdTimer = hold;
      output.gain.setTargetAtTime(1, context.currentTime, attack / 1000);
    } else if (holdTimer > 0) {
      holdTimer -= 25;
    } else if (open) {
      open = false;
      output.gain.setTargetAtTime(0, context.currentTime, release / 1000);
    }
  }, 25);

  input.connect(detector);
  input.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (k === 'threshold') threshold = v;
      if (k === 'attack')    attack = v;
      if (k === 'release')   release = v;
      if (k === 'hold')      hold = v;
    },
    getState: () => ({ threshold, attack, release, hold }),
    connect: d => output.connect(d),
    disconnect: () => { clearInterval(tick); output.disconnect(); },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 15. ExpanderPlugin.js — Downward expander (gentler than gate)
// ─────────────────────────────────────────────────────────────────────────────
export const createExpanderPlugin = (context, p = {}) => {
  const input    = context.createGain();
  const output   = context.createGain();
  const detector = context.createAnalyser();
  detector.fftSize = 256;

  let threshold = p.threshold ?? -40;
  let ratio     = p.ratio ?? 2;
  const buf     = new Uint8Array(detector.frequencyBinCount);

  const tick = setInterval(() => {
    detector.getByteFrequencyData(buf);
    const rms = buf.reduce((a, v) => a + v * v, 0) / buf.length;
    const db  = 20 * Math.log10(Math.sqrt(rms) / 128 + 1e-6);
    if (db < threshold) {
      const reduction = (threshold - db) * (1 - 1 / ratio);
      output.gain.setTargetAtTime(Math.pow(10, -reduction / 20), context.currentTime, 0.01);
    } else {
      output.gain.setTargetAtTime(1, context.currentTime, 0.01);
    }
  }, 25);

  input.connect(detector);
  input.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (k === 'threshold') threshold = v;
      if (k === 'ratio')     ratio = v;
    },
    getState: () => ({ threshold, ratio }),
    connect: d => output.connect(d),
    disconnect: () => { clearInterval(tick); output.disconnect(); },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 16. HallReverbPlugin.js — Large hall reverb
// ─────────────────────────────────────────────────────────────────────────────
export const createHallReverbPlugin = (context, p = {}) => {
  const input    = context.createGain();
  const output   = context.createGain();
  const convolver = context.createConvolver();
  const dryGain  = context.createGain();
  const wetGain  = context.createGain();
  const preDelay = context.createDelay(0.1);
  const damping  = context.createBiquadFilter();

  const mix     = (p.mix ?? 30) / 100;
  const decay   = p.decay ?? 4.0;
  const sr      = context.sampleRate;
  const len     = Math.floor(sr * decay);
  const ir      = context.createBuffer(2, len, sr);

  // Generate hall impulse response
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      // Hall: longer initial build, smooth decay
      const env = i < sr * 0.05
        ? i / (sr * 0.05)
        : Math.pow(1 - (i - sr * 0.05) / (len - sr * 0.05), 1.5);
      data[i] = (Math.random() * 2 - 1) * env;
    }
  }
  convolver.buffer = ir;

  damping.type = 'lowpass'; damping.frequency.value = p.damping ?? 6000;
  preDelay.delayTime.value = (p.preDelay ?? 30) / 1000;
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(preDelay); preDelay.connect(convolver); convolver.connect(damping); damping.connect(wetGain); wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (k === 'mix')      { dryGain.gain.setTargetAtTime(1 - v/100, 0, 0.05); wetGain.gain.setTargetAtTime(v/100, 0, 0.05); }
      if (k === 'damping')  damping.frequency.setTargetAtTime(v, 0, 0.01);
      if (k === 'preDelay') preDelay.delayTime.setTargetAtTime(v/1000, 0, 0.01);
    },
    getState: () => ({ mix: wetGain.gain.value * 100, damping: damping.frequency.value }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 17. PlateReverbPlugin.js — Dense metallic plate reverb
// ─────────────────────────────────────────────────────────────────────────────
export const createPlateReverbPlugin = (context, p = {}) => {
  const input    = context.createGain();
  const output   = context.createGain();
  const convolver = context.createConvolver();
  const dryGain  = context.createGain();
  const wetGain  = context.createGain();
  const tone     = context.createBiquadFilter();

  const mix   = (p.mix ?? 25) / 100;
  const decay = p.decay ?? 2.0;
  const sr    = context.sampleRate;
  const len   = Math.floor(sr * decay);
  const ir    = context.createBuffer(2, len, sr);

  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    // Plate: immediate dense attack, fast early reflections
    for (let i = 0; i < len; i++) {
      const env = Math.exp(-i / (len * 0.4));
      const dense = Math.sin(i * 0.1) * 0.3; // plate resonance
      data[i] = ((Math.random() * 2 - 1) + dense) * env;
    }
  }
  convolver.buffer = ir;

  tone.type = 'peaking'; tone.frequency.value = 3000; tone.gain.value = p.brightness ?? 2; tone.Q.value = 0.5;
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(convolver); convolver.connect(tone); tone.connect(wetGain); wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (k === 'mix')        { dryGain.gain.setTargetAtTime(1-v/100, 0, 0.05); wetGain.gain.setTargetAtTime(v/100, 0, 0.05); }
      if (k === 'brightness') tone.gain.setTargetAtTime(v, 0, 0.01);
    },
    getState: () => ({ mix: wetGain.gain.value * 100, brightness: tone.gain.value }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 18. SpringReverbPlugin.js — Classic spring reverb (guitar amp style)
// ─────────────────────────────────────────────────────────────────────────────
export const createSpringReverbPlugin = (context, p = {}) => {
  const input    = context.createGain();
  const output   = context.createGain();
  const dryGain  = context.createGain();
  const wetGain  = context.createGain();

  // Spring reverb: multiple comb filters simulate spring behavior
  const springs = [0.030, 0.034, 0.038].map(t => {
    const delay = context.createDelay(0.1);
    const feedback = context.createGain();
    const filter = context.createBiquadFilter();
    delay.delayTime.value = t;
    feedback.gain.value = 0.6;
    filter.type = 'lowpass'; filter.frequency.value = 2000;
    delay.connect(filter); filter.connect(feedback); feedback.connect(delay);
    return { delay, feedback };
  });

  const mix = (p.mix ?? 30) / 100;
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;

  input.connect(dryGain); dryGain.connect(output);
  springs.forEach(s => { input.connect(s.delay); s.delay.connect(wetGain); });
  wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (k === 'mix') { dryGain.gain.setTargetAtTime(1-v/100, 0, 0.05); wetGain.gain.setTargetAtTime(v/100, 0, 0.05); }
      if (k === 'tension') springs.forEach((s,i) => s.delay.delayTime.setTargetAtTime(0.030 + i*0.004 + v*0.001, 0, 0.05));
    },
    getState: () => ({ mix: wetGain.gain.value * 100 }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 19. ShimmerReverbPlugin.js — Pitch-shifted reverb shimmer effect
// ─────────────────────────────────────────────────────────────────────────────
export const createShimmerReverbPlugin = (context, p = {}) => {
  const input    = context.createGain();
  const output   = context.createGain();
  const dryGain  = context.createGain();
  const wetGain  = context.createGain();
  const feedback = context.createGain();
  const delay    = context.createDelay(1.0);

  // Shimmer: long delay with feedback creates shimmer wash
  delay.delayTime.value = p.size ?? 0.5;
  feedback.gain.value   = p.feedback ?? 0.7;

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = p.tone ?? 4000;

  const mix = (p.mix ?? 40) / 100;
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(delay);
  delay.connect(filter); filter.connect(feedback); feedback.connect(delay);
  delay.connect(wetGain); wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (k === 'mix')      { dryGain.gain.setTargetAtTime(1-v/100, 0, 0.05); wetGain.gain.setTargetAtTime(v/100, 0, 0.05); }
      if (k === 'size')     delay.delayTime.setTargetAtTime(v, 0, 0.05);
      if (k === 'feedback') feedback.gain.setTargetAtTime(Math.min(0.95, v), 0, 0.01);
      if (k === 'tone')     filter.frequency.setTargetAtTime(v, 0, 0.01);
    },
    getState: () => ({ mix: wetGain.gain.value * 100, feedback: feedback.gain.value }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 20. GatedReverbPlugin.js — 80s gated reverb (Phil Collins style)
// ─────────────────────────────────────────────────────────────────────────────
export const createGatedReverbPlugin = (context, p = {}) => {
  const input    = context.createGain();
  const output   = context.createGain();
  const convolver = context.createConvolver();
  const gate     = context.createGain();
  const dryGain  = context.createGain();
  const wetGain  = context.createGain();

  const sr = context.sampleRate;
  const gateTime = (p.gateTime ?? 200) / 1000;
  const len = Math.floor(sr * 0.5);
  const ir  = context.createBuffer(2, len, sr);

  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      // Dense, flat then hard gate
      const t = i / sr;
      const env = t < gateTime ? 1 : Math.exp(-(t - gateTime) * 50);
      data[i] = (Math.random() * 2 - 1) * env;
    }
  }
  convolver.buffer = ir;

  const mix = (p.mix ?? 35) / 100;
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(convolver); convolver.connect(wetGain); wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (k === 'mix') { dryGain.gain.setTargetAtTime(1-v/100, 0, 0.05); wetGain.gain.setTargetAtTime(v/100, 0, 0.05); }
    },
    getState: () => ({ mix: wetGain.gain.value * 100 }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 21. TapeDelayPlugin.js — Warm tape-style delay with wow/flutter
// ─────────────────────────────────────────────────────────────────────────────
export const createTapeDelayPlugin = (context, p = {}) => {
  const input    = context.createGain();
  const output   = context.createGain();
  const delay    = context.createDelay(2.0);
  const feedback = context.createGain();
  const dryGain  = context.createGain();
  const wetGain  = context.createGain();
  const warmth   = context.createBiquadFilter();
  const wow      = context.createOscillator();
  const wowGain  = context.createGain();

  delay.delayTime.value = (p.time ?? 500) / 1000;
  feedback.gain.value   = p.feedback ?? 0.4;
  warmth.type = 'lowpass'; warmth.frequency.value = p.tone ?? 4000;

  // Wow/flutter modulation
  wow.frequency.value = 0.5;
  wowGain.gain.value  = 0.003;
  wow.connect(wowGain); wowGain.connect(delay.delayTime);
  wow.start();

  const mix = (p.mix ?? 30) / 100;
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(delay);
  delay.connect(warmth); warmth.connect(feedback); feedback.connect(delay);
  delay.connect(wetGain); wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (k === 'time')     delay.delayTime.setTargetAtTime(v/1000, 0, 0.05);
      if (k === 'feedback') feedback.gain.setTargetAtTime(Math.min(0.95, v), 0, 0.01);
      if (k === 'tone')     warmth.frequency.setTargetAtTime(v, 0, 0.01);
      if (k === 'mix')      { dryGain.gain.setTargetAtTime(1-v/100, 0, 0.05); wetGain.gain.setTargetAtTime(v/100, 0, 0.05); }
      if (k === 'flutter')  wowGain.gain.setTargetAtTime(v * 0.001, 0, 0.01);
    },
    getState: () => ({ time: delay.delayTime.value * 1000, feedback: feedback.gain.value, mix: wetGain.gain.value * 100 }),
    connect: d => output.connect(d),
    disconnect: () => { wow.stop(); output.disconnect(); },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 22. PingPongDelayPlugin.js — Stereo ping pong delay
// ─────────────────────────────────────────────────────────────────────────────
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
