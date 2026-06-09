// =============================================================================
// BassEnhancerPlugin.js — StreamPireX Audio Plugin
// =============================================================================
// drive (0..1) → tanh saturation curve via WaveShaper inserted in the chain.

const N_CURVE = 1024;
const buildDriveCurve = (drive) => {
  const d = Math.max(0, Math.min(1, Number.isFinite(drive) ? drive : 0));
  const k = 1 + d * 5; // 0 → ~unity (no shape); 1 → tanh-clip
  const c = new Float32Array(N_CURVE);
  for (let i = 0; i < N_CURVE; i++) {
    const x = (2 * i / N_CURVE) - 1;
    c[i] = Math.tanh(x * k) / Math.tanh(k);
  }
  return c;
};

export const createBassEnhancerPlugin = (context, p = {}) => {
  const input = context.createGain(), output = context.createGain();
  const sub = context.createBiquadFilter(), punch = context.createBiquadFilter(), lpf = context.createBiquadFilter();
  const driveShaper = context.createWaveShaper();
  driveShaper.curve = buildDriveCurve(p.drive ?? 0);
  sub.type = 'lowshelf'; sub.frequency.value = 80; sub.gain.value = p.sub ?? 0;
  punch.type = 'peaking'; punch.frequency.value = 120; punch.gain.value = p.punch ?? 0; punch.Q.value = 1.5;
  lpf.type = 'lowpass'; lpf.frequency.value = p.lpf ?? 200;
  const subGen = context.createOscillator(), subGain = context.createGain();
  subGen.frequency.value = 60; subGen.type = 'sine';
  subGain.gain.value = p.subAmount ?? 0;
  subGen.start(); subGen.connect(subGain); subGain.connect(output);
  // Chain: input → sub → punch → driveShaper → output
  input.connect(sub); sub.connect(punch); punch.connect(driveShaper); driveShaper.connect(output);
  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (k === 'sub')       sub.gain.setTargetAtTime(v, 0, .01);
      if (k === 'punch')     punch.gain.setTargetAtTime(v, 0, .01);
      if (k === 'subAmount') subGain.gain.setTargetAtTime(v, 0, .01);
      if (k === 'drive')     driveShaper.curve = buildDriveCurve(v);
    },
    getState: () => ({ sub: sub.gain.value, punch: punch.gain.value }),
    connect: d => output.connect(d),
    disconnect: () => { subGen.stop(); output.disconnect(); },
  };
};
