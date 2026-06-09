// =============================================================================
// OverdrivePlugin.js — StreamPireX Audio Plugin
// Phase C2.3 rebuild: proper drive curve + LPF tone + level + dry/wet mix.
// Topology: in → preGain (drive boost) → WaveShaper (tanh soft-clip)
//             → toneLPF → postGain (level) → wetGain ─┐
//           in → dryGain ───────────────────────────────┴→ output
// UI/registry keys: drive (0..1), tone (Hz LPF), level (0..1 linear),
//                   mix (0..1 — registry uses 0..100, normalized internally).
// =============================================================================

export const createOverdrivePlugin = (context, p = {}) => {
  const clamp = (v, min, max, fallback = 0) => {
    if (!Number.isFinite(v)) return fallback;
    if (v < min) return min;
    if (v > max) return max;
    return v;
  };
  const ramp = (param, v) => {
    try { param.setTargetAtTime(v, 0, 0.01); } catch (e) { /* noop */ }
  };

  const input  = context.createGain();
  const output = context.createGain();
  const preGain = context.createGain();
  const ws = context.createWaveShaper();
  const tone = context.createBiquadFilter();
  const postGain = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();

  // Drive curve: tanh soft-clip, drive 0..1 maps to k 1..21.
  const N = 2048;
  const buildCurve = (driveAmt) => {
    const c = new Float32Array(N);
    const k = 1 + clamp(driveAmt, 0, 1, 0) * 20;
    for (let i = 0; i < N; i++) {
      const x = (i * 2) / N - 1;
      c[i] = Math.tanh(x * k);
    }
    return c;
  };

  // Initial values
  const initDrive = clamp(p.drive ?? 0, 0, 1, 0);
  const initTone  = clamp(p.tone ?? 8000, 200, 8000, 8000);
  const initLevel = clamp(p.level ?? 1, 0, 1, 1);
  // mix: registry default is 0 (percent). Accept either 0..1 or 0..100.
  const rawMix = p.mix ?? 0;
  const initMix = rawMix > 1 ? clamp(rawMix / 100, 0, 1, 0) : clamp(rawMix, 0, 1, 0);

  // PreGain: also boosts level into the clipper as drive rises (1..3x).
  preGain.gain.value = 1 + initDrive * 2;
  ws.curve = buildCurve(initDrive);
  ws.oversample = '2x';
  tone.type = 'lowpass';
  tone.frequency.value = initTone;
  tone.Q.value = 0.707;
  postGain.gain.value = initLevel;
  wetGain.gain.value = initMix;
  dryGain.gain.value = 1 - initMix;

  // Wet path: in → preGain → ws → tone → postGain → wetGain → output
  input.connect(preGain);
  preGain.connect(ws);
  ws.connect(tone);
  tone.connect(postGain);
  postGain.connect(wetGain);
  wetGain.connect(output);
  // Dry path
  input.connect(dryGain);
  dryGain.connect(output);

  let driveCache = initDrive;
  let mixCache = initMix;

  return {
    inputNode: input,
    node: input,
    setParam(k, v) {
      switch (k) {
        case 'drive': {
          const d = clamp(v, 0, 1, 0);
          driveCache = d;
          ws.curve = buildCurve(d);
          ramp(preGain.gain, 1 + d * 2);
          break;
        }
        case 'tone':
          ramp(tone.frequency, clamp(v, 20, 20000, 8000));
          break;
        case 'level':
          ramp(postGain.gain, clamp(v, 0, 4, 1));
          break;
        case 'mix': {
          const raw = v > 1 ? v / 100 : v;
          const m = clamp(raw, 0, 1, 0);
          mixCache = m;
          ramp(wetGain.gain, m);
          ramp(dryGain.gain, 1 - m);
          break;
        }
        default: break;
      }
    },
    getState: () => ({
      drive: driveCache,
      tone: tone.frequency.value,
      level: postGain.gain.value,
      mix: mixCache,
    }),
    connect: (d) => output.connect(d),
    disconnect: () => {
      try { output.disconnect(); } catch (e) { /* noop */ }
      try { input.disconnect(); } catch (e) { /* noop */ }
      try { preGain.disconnect(); } catch (e) { /* noop */ }
      try { ws.disconnect(); } catch (e) { /* noop */ }
      try { tone.disconnect(); } catch (e) { /* noop */ }
      try { postGain.disconnect(); } catch (e) { /* noop */ }
      try { wetGain.disconnect(); } catch (e) { /* noop */ }
      try { dryGain.disconnect(); } catch (e) { /* noop */ }
    },
  };
};
