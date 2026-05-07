// =============================================================================
// ChorusPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createChorusPlugin = (context, p = {}) => {
  const input   = context.createGain();
  const output  = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const fbGain  = context.createGain();

  const rateDef = Math.max(0.01, Math.min(10, Number.isFinite(p.rate) ? p.rate : 1));
  const depthDef = Math.max(0, Math.min(0.02, Number.isFinite(p.depth) ? p.depth : 0.003));
  const fbDef = Math.max(0, Math.min(0.9, Number.isFinite(p.feedback) ? p.feedback : 0.2));
  const mixDef = Math.max(0, Math.min(100, Number.isFinite(p.mix) ? p.mix : 0)) / 100;

  const voices = [0, 1, 2].map(i => {
    const delay = context.createDelay(0.05);
    const lfo   = context.createOscillator();
    const lfoGain = context.createGain();
    delay.delayTime.value = 0.02 + i * 0.005;
    lfo.frequency.value   = rateDef + i * 0.3;
    lfoGain.gain.value    = depthDef;
    lfo.connect(lfoGain); lfoGain.connect(delay.delayTime);
    lfo.start();
    return { delay, lfo, lfoGain };
  });

  dryGain.gain.value = 1 - mixDef;
  wetGain.gain.value = mixDef / voices.length;
  fbGain.gain.value = fbDef;

  input.connect(dryGain); dryGain.connect(output);
  voices.forEach(v => { input.connect(v.delay); v.delay.connect(wetGain); });
  // shared feedback: wet sum back into each voice's delay
  wetGain.connect(fbGain);
  voices.forEach(v => { fbGain.connect(v.delay); });
  wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (!Number.isFinite(v)) return;
      const t = context.currentTime;
      if (k === 'rate') {
        const c = Math.max(0.01, Math.min(10, v));
        voices.forEach((vc, i) => vc.lfo.frequency.setTargetAtTime(c + i * 0.3, t, 0.05));
      } else if (k === 'depth') {
        const c = Math.max(0, Math.min(0.02, v));
        voices.forEach(vc => vc.lfoGain.gain.setTargetAtTime(c, t, 0.01));
      } else if (k === 'feedback') {
        fbGain.gain.setTargetAtTime(Math.max(0, Math.min(0.9, v)), t, 0.01);
      } else if (k === 'mix') {
        const c = Math.max(0, Math.min(100, v)) / 100;
        dryGain.gain.setTargetAtTime(1 - c, t, 0.05);
        wetGain.gain.setTargetAtTime(c / voices.length, t, 0.05);
      }
    },
    getState: () => ({ rate: voices[0].lfo.frequency.value, depth: voices[0].lfoGain.gain.value, feedback: fbGain.gain.value, mix: wetGain.gain.value * voices.length * 100 }),
    connect: d => output.connect(d),
    disconnect: () => { voices.forEach(v => { try { v.lfo.stop(); } catch(e){} }); try { output.disconnect(); } catch(e){} },
    destroy: () => {
      voices.forEach(v => { try { v.lfo.stop(); } catch(e){} try { v.lfo.disconnect(); } catch(e){} try { v.lfoGain.disconnect(); } catch(e){} try { v.delay.disconnect(); } catch(e){} });
      [input, dryGain, wetGain, fbGain, output].forEach(n => { try { n.disconnect(); } catch(e){} });
    },
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
  feedback.gain.value   = p.feedback ?? 0.2;
  lfo.frequency.value   = p.rate ?? 0.5;
  lfoGain.gain.value    = p.depth ?? 0.003;

  lfo.connect(lfoGain); lfoGain.connect(delay.delayTime);
  lfo.start();

  const mix = (p.mix ?? 0) / 100;
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

  const mix = (p.mix ?? 0) / 100;
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
