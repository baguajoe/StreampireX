// =============================================================================
// PhonePlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createPhonePlugin = (context, p = {}) => {
  const input = context.createGain();
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const hpf = context.createBiquadFilter();
  const lpf = context.createBiquadFilter();
  const dist = context.createWaveShaper();

  // Registry params: preset (0-4), mix (0-100%), drive (0-1)
  // Presets define HPF/LPF cutoff pairs evoking different telephonic eras.
  const PRESETS = [
    { hpf: 300,  lpf: 3400 },  // 0: classic landline
    { hpf: 500,  lpf: 2800 },  // 1: AM radio / cell
    { hpf: 200,  lpf: 4000 },  // 2: walkie-talkie wide
    { hpf: 600,  lpf: 2400 },  // 3: heavy bandlimit
    { hpf: 150,  lpf: 5000 },  // 4: lo-fi wide
  ];

  const initPreset = Number.isFinite(p.preset) ? Math.max(0, Math.min(4, Math.round(p.preset))) : 0;
  const initMix = Number.isFinite(p.mix) ? Math.max(0, Math.min(100, p.mix)) : 0;
  const initDrive = Number.isFinite(p.drive) ? Math.max(0, Math.min(1, p.drive)) : 0;

  hpf.type = 'highpass'; hpf.Q.value = 0.7;
  lpf.type = 'lowpass';  lpf.Q.value = 0.7;
  hpf.frequency.value = PRESETS[initPreset].hpf;
  lpf.frequency.value = PRESETS[initPreset].lpf;

  const buildDriveCurve = (drive) => {
    const n = 256, c = new Float32Array(n);
    const d = Math.max(0, Math.min(1, drive));
    const k = 1 + d * 9; // 1..10
    for (let i = 0; i < n; i++) {
      const x = (2 * i / n) - 1;
      c[i] = Math.tanh(x * k) * 0.5;
    }
    return c;
  };
  dist.curve = buildDriveCurve(initDrive);

  const mix01 = initMix / 100;
  dryGain.gain.value = 1 - mix01;
  wetGain.gain.value = mix01;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(hpf); hpf.connect(lpf); lpf.connect(dist); dist.connect(wetGain); wetGain.connect(output);

  let curPreset = initPreset;
  let curDrive = initDrive;

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      const val = Number.isFinite(v) ? v : 0;
      if (k === 'preset') {
        const idx = Math.max(0, Math.min(4, Math.round(val)));
        curPreset = idx;
        hpf.frequency.setTargetAtTime(PRESETS[idx].hpf, 0, 0.05);
        lpf.frequency.setTargetAtTime(PRESETS[idx].lpf, 0, 0.05);
      }
      if (k === 'mix') {
        const m = Math.max(0, Math.min(1, val / 100));
        dryGain.gain.setTargetAtTime(1 - m, 0, 0.05);
        wetGain.gain.setTargetAtTime(m, 0, 0.05);
      }
      if (k === 'drive') {
        curDrive = Math.max(0, Math.min(1, val));
        dist.curve = buildDriveCurve(curDrive);
      }
    },
    getState: () => ({
      preset: curPreset,
      mix: wetGain.gain.value * 100,
      drive: curDrive,
    }),
    connect: d => output.connect(d),
    disconnect: () => {
      try { output.disconnect(); } catch (e) {}
      try { input.disconnect(); } catch (e) {}
      try { hpf.disconnect(); lpf.disconnect(); dist.disconnect(); } catch (e) {}
      try { dryGain.disconnect(); wetGain.disconnect(); } catch (e) {}
    },
  };
};
