// =============================================================================
// AmpSimPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createAmpSimPlugin = (context, p = {}) => {
  const input = context.createGain(), output = context.createGain();
  const dryGain = context.createGain(), wetGain = context.createGain();
  const pre = context.createBiquadFilter();
  const ws = context.createWaveShaper();
  const cab = context.createBiquadFilter();
  const presence = context.createBiquadFilter();
  const outGain = context.createGain();

  const clamp = (v, lo, hi, dflt) => {
    const n = Number.isFinite(v) ? v : dflt;
    return Math.max(lo, Math.min(hi, n));
  };

  pre.type = 'highpass'; pre.frequency.value = 80;

  // Drive curve generator: drive 0..1 fraction → tanh curve.
  const N = 512;
  const buildCurve = (drive01) => {
    const c = new Float32Array(N);
    const k = 1 + clamp(drive01, 0, 1, 0) * 9; // 1..10 (was 1..1001 — way too hot)
    for (let i = 0; i < N; i++) {
      const x = (2 * i / N) - 1;
      c[i] = Math.tanh(x * k) * 0.8;
    }
    return c;
  };

  // Cabinet presets: center frequency for bandpass
  const CABINETS = [
    { freq: 800, q: 0.5 },   // 0 = generic
    { freq: 1200, q: 0.6 },  // 1 = 1x12
    { freq: 700, q: 0.5 },   // 2 = 2x12
    { freq: 500, q: 0.4 },   // 3 = 4x12
    { freq: 1500, q: 0.7 },  // 4 = bright
    { freq: 400, q: 0.4 },   // 5 = dark
  ];

  const drive01 = clamp(p.drive, 0, 100, 0) / 100;
  ws.curve = buildCurve(drive01);
  ws.oversample = '4x';

  const cabIdx = clamp(p.cabinet, 0, 5, 0) | 0;
  cab.type = 'bandpass';
  cab.frequency.value = CABINETS[cabIdx].freq;
  cab.Q.value = CABINETS[cabIdx].q;

  presence.type = 'peaking';
  presence.frequency.value = clamp(p.tone, 200, 8000, 3000);
  presence.gain.value = 0; // neutral; tone is freq sweep, not boost
  presence.Q.value = 1;

  outGain.gain.value = Math.pow(10, clamp(p.outputGain, -12, 12, 0) / 20);

  const mix0 = clamp(p.mix, 0, 100, 0) / 100;
  dryGain.gain.value = 1 - mix0;
  wetGain.gain.value = mix0;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(pre); pre.connect(ws); ws.connect(cab); cab.connect(presence); presence.connect(outGain); outGain.connect(wetGain); wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      switch (k) {
        case 'drive':   ws.curve = buildCurve(clamp(v, 0, 100, 0) / 100); break;
        case 'cabinet': {
          const idx = clamp(v, 0, 5, 0) | 0;
          cab.frequency.setTargetAtTime(CABINETS[idx].freq, 0, 0.05);
          cab.Q.setTargetAtTime(CABINETS[idx].q, 0, 0.05);
          break;
        }
        case 'tone':       presence.frequency.setTargetAtTime(clamp(v, 200, 8000, 3000), 0, 0.05); break;
        case 'outputGain': outGain.gain.setTargetAtTime(Math.pow(10, clamp(v, -12, 12, 0) / 20), 0, 0.01); break;
        case 'mix': {
          const m = clamp(v, 0, 100, 0) / 100;
          dryGain.gain.setTargetAtTime(1 - m, 0, 0.05);
          wetGain.gain.setTargetAtTime(m, 0, 0.05);
          break;
        }
        case 'presence': presence.gain.setTargetAtTime(clamp(v, -12, 12, 0), 0, 0.01); break;
      }
    },
    getState: () => ({
      tone: presence.frequency.value,
      cabinet: cabIdx,
      mix: wetGain.gain.value * 100,
      outputGain: 20 * Math.log10(Math.max(1e-6, outGain.gain.value)),
    }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
    destroy: () => { try { input.disconnect(); pre.disconnect(); ws.disconnect(); cab.disconnect(); presence.disconnect(); outGain.disconnect(); dryGain.disconnect(); wetGain.disconnect(); output.disconnect(); } catch(_){} },
  };
};
