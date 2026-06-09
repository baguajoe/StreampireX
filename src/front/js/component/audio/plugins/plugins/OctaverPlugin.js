// =============================================================================
// OctaverPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createOctaverPlugin = (context, p = {}) => {
  const input = context.createGain();
  const output = context.createGain();
  const dryGain = context.createGain();
  const voice1Gain = context.createGain();
  const voice2Gain = context.createGain();

  // Registry params:
  //   oct1 (-2..0 oct), oct2 (0..2 oct) — octave shift indicators (visual only — no pitch shift)
  //   mix1, mix2 (0..100%), dry (0..100%)
  const initOct1 = Number.isFinite(p.oct1) ? Math.max(-2, Math.min(0, p.oct1)) : -1;
  const initOct2 = Number.isFinite(p.oct2) ? Math.max(0, Math.min(2, p.oct2)) : 1;
  const initMix1 = Number.isFinite(p.mix1) ? Math.max(0, Math.min(100, p.mix1)) : 0;
  const initMix2 = Number.isFinite(p.mix2) ? Math.max(0, Math.min(100, p.mix2)) : 0;
  const initDry = Number.isFinite(p.dry) ? Math.max(0, Math.min(100, p.dry)) : 100;

  let curOct1 = initOct1;
  let curOct2 = initOct2;

  // Voice 1 path: octave-down via half-wave rectify on lowpassed signal.
  // Voice 2 path: octave-up via x^2 (full-wave rectify creates 2f content).
  const lpf1 = context.createBiquadFilter();
  lpf1.type = 'lowpass'; lpf1.frequency.value = 800;
  const downShaper = context.createWaveShaper();
  {
    const n = 256, c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (2 * i / (n - 1)) - 1;
      // Half-wave rectify; produces subharmonic-like content
      c[i] = x > 0 ? x : x * 0.2;
    }
    downShaper.curve = c;
  }

  const upShaper = context.createWaveShaper();
  {
    const n = 256, c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (2 * i / (n - 1)) - 1;
      // Full-wave rectify → emphasizes 2f
      c[i] = Math.abs(x) * Math.sign(x === 0 ? 1 : x) * 0.5 + (x * x - 0.5);
    }
    upShaper.curve = c;
  }
  const hpfUp = context.createBiquadFilter();
  hpfUp.type = 'highpass'; hpfUp.frequency.value = 200;

  voice1Gain.gain.value = initMix1 / 100;
  voice2Gain.gain.value = initMix2 / 100;
  dryGain.gain.value = initDry / 100;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(lpf1); lpf1.connect(downShaper); downShaper.connect(voice1Gain); voice1Gain.connect(output);
  input.connect(upShaper); upShaper.connect(hpfUp); hpfUp.connect(voice2Gain); voice2Gain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      const val = Number.isFinite(v) ? v : 0;
      if (k === 'oct1') curOct1 = Math.max(-2, Math.min(0, val));
      if (k === 'oct2') curOct2 = Math.max(0, Math.min(2, val));
      if (k === 'mix1') {
        const c = Math.max(0, Math.min(1, val / 100));
        voice1Gain.gain.setTargetAtTime(c, 0, 0.05);
      }
      if (k === 'mix2') {
        const c = Math.max(0, Math.min(1, val / 100));
        voice2Gain.gain.setTargetAtTime(c, 0, 0.05);
      }
      if (k === 'dry') {
        const c = Math.max(0, Math.min(1, val / 100));
        dryGain.gain.setTargetAtTime(c, 0, 0.05);
      }
    },
    getState: () => ({
      oct1: curOct1,
      oct2: curOct2,
      mix1: voice1Gain.gain.value * 100,
      mix2: voice2Gain.gain.value * 100,
      dry: dryGain.gain.value * 100,
    }),
    connect: d => output.connect(d),
    disconnect: () => {
      try { output.disconnect(); } catch (e) {}
      try { input.disconnect(); } catch (e) {}
      try { dryGain.disconnect(); voice1Gain.disconnect(); voice2Gain.disconnect(); } catch (e) {}
      try { lpf1.disconnect(); downShaper.disconnect(); } catch (e) {}
      try { upShaper.disconnect(); hpfUp.disconnect(); } catch (e) {}
    },
  };
};
