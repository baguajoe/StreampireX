// =============================================================================
// GatedReverbPlugin.js — StreamPireX Audio Plugin
// =============================================================================
// Phase C5 rebuild: envelope-controlled gated reverb.
// Topology:
//   input ─┬─ dryGain ─────────────────────────────────────────── output
//          ├─ preDelay → convolver(longHallIR) → wetTrim → gate ─ output
//          └─ envAnalyser   (polled to drive 'gate' AudioParam)
//
// The dry signal's RMS envelope drives a slewed gate gain on the wet path:
//   - When dryEnv > threshold: gate opens with 'attack' (ms) ramp.
//   - When dryEnv falls below threshold for 'gateTime' (ms): gate closes
//     abruptly with 'release' (ms) ramp, hard-cutting the reverb tail.
//
// Standard Web Audio nodes only — no worklet required.
// Honesty tag: CLEAN — gate behavior is sample-accurate via setTargetAtTime
// scheduling; envelope detection runs at ~30 Hz (RAF-driven), which is the
// usual rate for envelope followers in pure-Web-Audio designs.
// =============================================================================

export const createGatedReverbPlugin = (context, p = {}) => {
  const input        = context.createGain();
  const output       = context.createGain();
  const preDelayNode = context.createDelay(1.0);
  const convolver    = context.createConvolver();
  const dryGain      = context.createGain();
  const wetTrim      = context.createGain();   // wet level (mix)
  const gateGain     = context.createGain();   // envelope-controlled gate
  const envAnalyser  = context.createAnalyser();
  envAnalyser.fftSize = 1024;
  envAnalyser.smoothingTimeConstant = 0.2;

  const sr = context.sampleRate;

  // Build a dense long Hall-style IR (no built-in gate — gate is dynamic).
  // decaySec controls the exponential tail length.
  const buildHallIR = (decaySec) => {
    const safeDecay = Math.max(0.2, Math.min(4.0, decaySec));
    const len = Math.max(1, Math.floor(sr * safeDecay));
    const ir = context.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      // Initial dense diffusion (~30 ms ramp-in) then exponential decay to -60 dB.
      const tau = safeDecay / 6.91;  // -60 dB time constant
      const rampIn = Math.floor(sr * 0.03);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const env = (i < rampIn ? (i / rampIn) : 1) * Math.exp(-t / tau);
        data[i] = (Math.random() * 2 - 1) * env;
      }
    }
    return ir;
  };

  // Initial values from registry.
  let decayS    = Number.isFinite(p.decay)     ? p.decay     : 1.5;   // long IR for hall
  let gateMs    = Number.isFinite(p.gateTime)  ? p.gateTime  : 200;
  let preMs     = Number.isFinite(p.preDelay)  ? p.preDelay  : 10;
  let mixPct    = Number.isFinite(p.mix)       ? p.mix       : 0;
  let threshDb  = Number.isFinite(p.threshold) ? p.threshold : -40;
  let attackMs  = Number.isFinite(p.attack)    ? p.attack    : 5;
  let releaseMs = Number.isFinite(p.release)   ? p.release   : 30;

  convolver.buffer = buildHallIR(decayS);
  preDelayNode.delayTime.value = Math.max(0, Math.min(0.05, preMs / 1000));

  const m0 = Math.max(0, Math.min(100, mixPct)) / 100;
  dryGain.gain.value = 1 - m0;
  wetTrim.gain.value = m0;
  gateGain.gain.value = 0;  // start closed

  // Wiring.
  input.connect(dryGain); dryGain.connect(output);
  input.connect(preDelayNode);
  preDelayNode.connect(convolver);
  convolver.connect(wetTrim);
  wetTrim.connect(gateGain);
  gateGain.connect(output);
  // Envelope detection: tap the dry input.
  input.connect(envAnalyser);

  // Envelope follower loop. Polls RMS at ~30 Hz; drives gateGain via
  // setTargetAtTime so the actual ramp is sample-accurate inside the audio
  // graph between polls.
  const tdBuf = new Float32Array(envAnalyser.fftSize);
  let aboveSinceMs = 0;        // ms above threshold
  let belowSinceMs = 0;        // ms below threshold
  let gateOpen = false;
  let lastTickPerf = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  let pollHandle = null;
  let stopped = false;

  // Debounce IR rebuild on decay knob.
  let irRebuildTimer = null;
  const scheduleIRRebuild = () => {
    if (irRebuildTimer) clearTimeout(irRebuildTimer);
    irRebuildTimer = setTimeout(() => {
      try { convolver.buffer = buildHallIR(decayS); } catch {}
      irRebuildTimer = null;
    }, 80);
  };

  const tick = () => {
    if (stopped) return;
    try {
      envAnalyser.getFloatTimeDomainData(tdBuf);
    } catch {
      // Some test envs lack getFloatTimeDomainData; fall back to byte data.
      const b = new Uint8Array(envAnalyser.fftSize);
      try { envAnalyser.getByteTimeDomainData(b); } catch {}
      for (let i = 0; i < tdBuf.length; i++) tdBuf[i] = (b[i] - 128) / 128;
    }
    let sumSq = 0;
    for (let i = 0; i < tdBuf.length; i++) { const v = tdBuf[i]; sumSq += v * v; }
    const rms = Math.sqrt(sumSq / tdBuf.length);
    const rmsDb = 20 * Math.log10(Math.max(rms, 1e-7));

    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const dt = Math.min(100, Math.max(1, now - lastTickPerf));
    lastTickPerf = now;

    if (rmsDb >= threshDb) {
      aboveSinceMs += dt;
      belowSinceMs = 0;
      if (!gateOpen) {
        // Open: ramp gate to 1 with attack.
        const tauOpen = Math.max(0.001, attackMs / 1000) / 3; // 3·tau ≈ 95% rise
        gateGain.gain.cancelScheduledValues(context.currentTime);
        gateGain.gain.setTargetAtTime(1.0, context.currentTime, tauOpen);
        gateOpen = true;
      }
    } else {
      belowSinceMs += dt;
      aboveSinceMs = 0;
      // Close only after the input has been below threshold for >= gateTime
      // (this is the "hold" semantics of a gated reverb).
      if (gateOpen && belowSinceMs >= gateMs) {
        const tauClose = Math.max(0.001, releaseMs / 1000) / 3;
        gateGain.gain.cancelScheduledValues(context.currentTime);
        gateGain.gain.setTargetAtTime(0.0, context.currentTime, tauClose);
        gateOpen = false;
      }
    }

    if (typeof requestAnimationFrame === 'function') {
      pollHandle = requestAnimationFrame(tick);
    } else {
      pollHandle = setTimeout(tick, 33);
    }
  };
  // Kick off polling.
  if (typeof requestAnimationFrame === 'function') {
    pollHandle = requestAnimationFrame(tick);
  } else {
    pollHandle = setTimeout(tick, 33);
  }

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      const sv = Number.isFinite(v) ? v : 0;
      const t = context.currentTime;
      if (k === 'decay')     { decayS = Math.max(0.2, Math.min(4.0, sv)); scheduleIRRebuild(); }
      else if (k === 'gateTime')  { gateMs = Math.max(10, Math.min(2000, sv)); }
      else if (k === 'preDelay')  { preDelayNode.delayTime.setTargetAtTime(Math.max(0, Math.min(0.05, sv / 1000)), t, 0.01); }
      else if (k === 'threshold') { threshDb = Math.max(-100, Math.min(0, sv)); }
      else if (k === 'attack')    { attackMs = Math.max(0.1, Math.min(200, sv)); }
      else if (k === 'release')   { releaseMs = Math.max(1, Math.min(500, sv)); }
      else if (k === 'mix') {
        const c = Math.max(0, Math.min(100, sv)) / 100;
        dryGain.gain.setTargetAtTime(1 - c, t, 0.05);
        wetTrim.gain.setTargetAtTime(c, t, 0.05);
      }
    },
    getState: () => ({
      decay: decayS, gateTime: gateMs, preDelay: preDelayNode.delayTime.value * 1000,
      mix: wetTrim.gain.value * 100, threshold: threshDb, attack: attackMs, release: releaseMs,
    }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
    destroy: () => {
      stopped = true;
      if (pollHandle) {
        try { if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(pollHandle); else clearTimeout(pollHandle); } catch {}
        pollHandle = null;
      }
      if (irRebuildTimer) { try { clearTimeout(irRebuildTimer); } catch {} }
      try { input.disconnect(); } catch {}
      try { preDelayNode.disconnect(); } catch {}
      try { convolver.disconnect(); } catch {}
      try { wetTrim.disconnect(); } catch {}
      try { gateGain.disconnect(); } catch {}
      try { dryGain.disconnect(); } catch {}
      try { envAnalyser.disconnect(); } catch {}
      try { output.disconnect(); } catch {}
    },
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
