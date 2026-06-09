// =============================================================================
// FuzzPlugin.js — StreamPireX Audio Plugin
// =============================================================================
// Registry params: drive (0..1), tone (Hz), bias (0..1), mix (0..100%), outputGain (dB)

export const createFuzzPlugin = (context, p = {}) => {
  const input = context.createGain();
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const preGain = context.createGain();
  const ws = context.createWaveShaper();
  const lpf = context.createBiquadFilter();
  const outGain = context.createGain();

  const N = 1024;

  // bias 0..1 (0.5 = symmetric clip; below = negative-skewed; above = positive-skewed)
  const buildCurve = (drive, bias) => {
    const d = Math.max(0, Math.min(1, Number.isFinite(drive) ? drive : 0));
    const b = Math.max(0, Math.min(1, Number.isFinite(bias) ? bias : 0.5));
    const k = 1 + d * 9; // 1..10 — modulates clip threshold
    const offset = (b - 0.5) * 2 * 0.5; // -0.5..+0.5 DC shift
    const c = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = (2 * i / N) - 1 + offset;
      c[i] = x >= 0 ? Math.min(1, x * k) : Math.max(-1, x * k);
    }
    return c;
  };

  // Initial values
  preGain.gain.value = 1; // pre-shape gain stays 1; drive is in the curve
  ws.curve = buildCurve(p.drive ?? 0, p.bias ?? 0.5);
  lpf.type = 'lowpass';
  lpf.frequency.value = p.tone ?? 8000;
  outGain.gain.value = Math.pow(10, ((p.outputGain ?? 0)) / 20);

  const mix0 = Math.max(0, Math.min(1, (p.mix ?? 0) / 100));
  dryGain.gain.value = 1 - mix0;
  wetGain.gain.value = mix0;

  // Routing: input → dryGain → output
  //          input → preGain → ws → lpf → outGain → wetGain → output
  input.connect(dryGain);
  dryGain.connect(output);
  input.connect(preGain);
  preGain.connect(ws);
  ws.connect(lpf);
  lpf.connect(outGain);
  outGain.connect(wetGain);
  wetGain.connect(output);

  let curDrive = p.drive ?? 0;
  let curBias = p.bias ?? 0.5;

  return {
    inputNode: input,
    node: input,
    outputNode: output,
    setParam(k, v) {
      const t = context.currentTime;
      switch (k) {
        case 'drive':
          curDrive = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
          ws.curve = buildCurve(curDrive, curBias);
          break;
        case 'bias':
          curBias = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0.5));
          ws.curve = buildCurve(curDrive, curBias);
          break;
        case 'tone':
          lpf.frequency.setTargetAtTime(v, t, 0.01);
          break;
        case 'mix': {
          const m = Math.max(0, Math.min(1, (Number.isFinite(v) ? v : 0) / 100));
          dryGain.gain.setTargetAtTime(1 - m, t, 0.02);
          wetGain.gain.setTargetAtTime(m, t, 0.02);
          break;
        }
        case 'outputGain':
          outGain.gain.setTargetAtTime(Math.pow(10, (Number.isFinite(v) ? v : 0) / 20), t, 0.02);
          break;
        // Back-compat
        case 'fuzz':
          curDrive = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
          ws.curve = buildCurve(curDrive, curBias);
          break;
        case 'level':
          outGain.gain.setTargetAtTime(Number.isFinite(v) ? v : 1, t, 0.02);
          break;
      }
    },
    getState: () => ({ drive: curDrive, bias: curBias, tone: lpf.frequency.value, mix: wetGain.gain.value * 100, outputGain: 20 * Math.log10(Math.max(1e-6, outGain.gain.value)) }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
    destroy: () => {
      try { input.disconnect(); preGain.disconnect(); ws.disconnect(); lpf.disconnect(); outGain.disconnect(); wetGain.disconnect(); dryGain.disconnect(); output.disconnect(); } catch (e) {}
    },
  };
};
