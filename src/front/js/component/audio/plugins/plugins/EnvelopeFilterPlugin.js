// =============================================================================
// EnvelopeFilterPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createEnvelopeFilterPlugin = (context, p = {}) => {
  const input = context.createGain();
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const filter = context.createBiquadFilter();
  const detector = context.createAnalyser();

  filter.type = 'lowpass';
  filter.Q.value = 6;
  detector.fftSize = 256;

  // Registry params
  let attackMs = Number.isFinite(p.attack) ? p.attack : 10;       // 0.1..200 ms
  let releaseMs = Number.isFinite(p.release) ? p.release : 100;   // 10..1000 ms
  let centerFreq = Number.isFinite(p.freq) ? p.freq : 800;        // 200..8000 Hz
  let depth = Number.isFinite(p.depth) ? p.depth : 0;             // 0..1
  let mix = Number.isFinite(p.mix) ? p.mix : 0;                   // 0..100 %

  const buf = new Uint8Array(detector.frequencyBinCount);

  // Smoothed envelope follower
  let env = 0;

  const tick = setInterval(() => {
    detector.getByteFrequencyData(buf);
    const rms = Math.sqrt(buf.reduce((a, v) => a + v * v, 0) / buf.length) / 128;
    // Use attack/release time-constants
    const a = Math.exp(-1 / Math.max(0.001, attackMs / 1000) / 40);
    const r = Math.exp(-1 / Math.max(0.001, releaseMs / 1000) / 40);
    if (rms > env) env = a * env + (1 - a) * rms;
    else env = r * env + (1 - r) * rms;
    // Sweep filter from centerFreq downward to centerFreq*(1+depth*4)
    const sweep = Math.max(20, Math.min(20000, centerFreq * (1 + env * depth * 4)));
    filter.frequency.setTargetAtTime(sweep, 0, 0.02);
  }, 25);

  // Topology: dry path + wet path through filter
  input.connect(detector);
  input.connect(dryGain); dryGain.connect(output);
  input.connect(filter); filter.connect(wetGain); wetGain.connect(output);

  const m = Math.max(0, Math.min(100, mix)) / 100;
  dryGain.gain.value = 1 - m;
  wetGain.gain.value = m;
  filter.frequency.value = centerFreq;

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      const safe = Number.isFinite(v) ? v : 0;
      if (k === 'attack')  attackMs = Math.max(0.1, Math.min(200, safe));
      if (k === 'release') releaseMs = Math.max(10, Math.min(1000, safe));
      if (k === 'freq')    { centerFreq = Math.max(200, Math.min(8000, safe)); filter.frequency.setTargetAtTime(centerFreq, 0, 0.01); }
      if (k === 'depth')   depth = Math.max(0, Math.min(1, safe));
      if (k === 'mix') {
        const c = Math.max(0, Math.min(100, safe)) / 100;
        dryGain.gain.setTargetAtTime(1 - c, 0, 0.05);
        wetGain.gain.setTargetAtTime(c, 0, 0.05);
        mix = safe;
      }
      if (k === 'q') filter.Q.setTargetAtTime(Math.max(0.1, Math.min(20, safe)), 0, 0.01);
    },
    getState: () => ({ attack: attackMs, release: releaseMs, freq: centerFreq, depth, mix, q: filter.Q.value }),
    connect: d => output.connect(d),
    disconnect: () => { clearInterval(tick); output.disconnect(); },
    destroy: () => {
      try { clearInterval(tick); } catch {}
      try { output.disconnect(); } catch {}
      try { input.disconnect(); } catch {}
      try { filter.disconnect(); } catch {}
      try { detector.disconnect(); } catch {}
      try { dryGain.disconnect(); } catch {}
      try { wetGain.disconnect(); } catch {}
    },
  };
};

// ── AI-POWERED ────────────────────────────────────────────────────────────
