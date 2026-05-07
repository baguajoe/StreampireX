// =============================================================================
// AIEQMatchPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createAIEQMatchPlugin = (context, p = {}) => {
  const input = context.createGain(), output = context.createGain();

  const clamp = (v, lo, hi, dflt) => {
    const n = Number.isFinite(v) ? v : dflt;
    return Math.max(lo, Math.min(hi, n));
  };

  const FREQS = [60, 150, 400, 1000, 2500, 6000, 12000, 16000];
  const bands = FREQS.map(freq => {
    const f = context.createBiquadFilter();
    f.type = 'peaking';
    f.frequency.value = freq;
    f.gain.value = 0;
    f.Q.value = 2;
    return f;
  });

  // Synthetic "match curve" — gentle smile profile (low + high boost).
  // We'll scale this profile by `match` and tilt with lowEnd/highEnd.
  const matchProfile = [3, 2, 0.5, -1, -1, 0.5, 2, 3]; // dB

  // Smoothing controls the setTargetAtTime time-constant for live updates.
  let smoothingTC = 0.05; // seconds

  const state = {
    match:    clamp(p.match,    0, 1, 0),
    smoothing: clamp(p.smoothing, 0, 1, 0.7),
    lowEnd:   clamp(p.lowEnd,   0, 1, 0.5),
    highEnd:  clamp(p.highEnd,  0, 1, 0.5),
  };

  const apply = (immediate = false) => {
    smoothingTC = 0.01 + state.smoothing * 0.5; // 10ms..510ms
    // lowEnd/highEnd: 0..1 → -6..+6 dB at the extremes, fading to mid bands
    const loBoost = (state.lowEnd  - 0.5) * 12;
    const hiBoost = (state.highEnd - 0.5) * 12;
    bands.forEach((b, i) => {
      const t = i / (bands.length - 1); // 0..1 across bands
      const tilt = loBoost * (1 - t) + hiBoost * t;
      const gainDb = matchProfile[i] * state.match + tilt;
      if (immediate) b.gain.value = gainDb;
      else b.gain.setTargetAtTime(gainDb, 0, smoothingTC);
    });
  };

  // Wire chain: input → b0 → b1 → ... → output
  input.connect(bands[0]);
  for (let i = 0; i < bands.length - 1; i++) bands[i].connect(bands[i + 1]);
  bands[bands.length - 1].connect(output);

  apply(true);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      const c = (lo, hi, d) => clamp(v, lo, hi, d);
      switch (k) {
        case 'match':     state.match    = c(0, 1, 0); apply(); break;
        case 'smoothing': state.smoothing = c(0, 1, 0.7); apply(); break;
        case 'lowEnd':    state.lowEnd   = c(0, 1, 0.5); apply(); break;
        case 'highEnd':   state.highEnd  = c(0, 1, 0.5); apply(); break;
        default: {
          // Back-compat: still accept bandN if any caller uses it
          const m = String(k).match(/^band(\d+)$/);
          if (m) bands[+m[1]]?.gain.setTargetAtTime(clamp(v, -24, 24, 0), 0, 0.05);
        }
      }
    },
    getState: () => ({ ...state, bands: bands.map(b => b.gain.value) }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
    destroy: () => { try { input.disconnect(); bands.forEach(b => b.disconnect()); output.disconnect(); } catch(_){} },
  };
};
