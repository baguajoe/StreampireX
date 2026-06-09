// =============================================================================
// OpticalCompPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createOpticalCompPlugin = (context, p = {}) => {
  const input  = context.createGain();
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const comp   = context.createDynamicsCompressor();

  // Registry params: peakReduction (0-100%), gainControl (0-40 dB),
  // tubeSat (0-1), mix (0-100%).
  // Map peakReduction% → threshold dB: 0 → 0dB (none), 100 → -40dB (max).
  const initPR = Number.isFinite(p.peakReduction) ? Math.max(0, Math.min(100, p.peakReduction)) : 25;
  const initGC = Number.isFinite(p.gainControl) ? Math.max(0, Math.min(40, p.gainControl)) : 0;
  const initSat = Number.isFinite(p.tubeSat) ? Math.max(0, Math.min(1, p.tubeSat)) : 0;
  const initMix = Number.isFinite(p.mix) ? Math.max(0, Math.min(100, p.mix)) : 100;

  const prToThreshold = (pr) => -40 * (pr / 100);

  comp.threshold.value = prToThreshold(initPR);
  comp.knee.value      = 10; // soft knee — optical style
  comp.ratio.value     = 2;
  comp.attack.value    = 0.01;  // 10ms — neutrality default
  comp.release.value   = 0.1;   // 100ms — neutrality default

  const makeup = context.createGain();
  makeup.gain.value = Math.pow(10, initGC / 20);

  // Tube saturation waveshaper
  const sat = context.createWaveShaper();
  const buildSatCurve = (drive) => {
    const n = 512, c = new Float32Array(n);
    const d = Math.max(0, Math.min(1, drive));
    for (let i = 0; i < n; i++) {
      const x = (2 * i / (n - 1)) - 1;
      c[i] = (1 + d * 4) * x / (1 + d * 4 * Math.abs(x));
    }
    return c;
  };
  sat.curve = buildSatCurve(initSat);
  sat.oversample = '2x';

  const mix01 = initMix / 100;
  dryGain.gain.value = 1 - mix01;
  wetGain.gain.value = mix01;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(comp); comp.connect(makeup); makeup.connect(sat); sat.connect(wetGain); wetGain.connect(output);

  let curSat = initSat;

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      const val = Number.isFinite(v) ? v : 0;
      // Registry params
      if (k === 'peakReduction') {
        const c = Math.max(0, Math.min(100, val));
        comp.threshold.setTargetAtTime(prToThreshold(c), 0, 0.01);
      }
      if (k === 'gainControl') {
        const c = Math.max(0, Math.min(40, val));
        makeup.gain.setTargetAtTime(Math.pow(10, c / 20), 0, 0.01);
      }
      if (k === 'tubeSat') {
        curSat = Math.max(0, Math.min(1, val));
        sat.curve = buildSatCurve(curSat);
      }
      if (k === 'mix') {
        const m = Math.max(0, Math.min(1, val / 100));
        dryGain.gain.setTargetAtTime(1 - m, 0, 0.05);
        wetGain.gain.setTargetAtTime(m, 0, 0.05);
      }
      // Legacy direct controls (kept for backward compat)
      if (k === 'threshold') comp.threshold.setTargetAtTime(val, 0, 0.01);
      if (k === 'ratio')     comp.ratio.setTargetAtTime(val, 0, 0.01);
      if (k === 'attack')    comp.attack.setTargetAtTime(val / 1000, 0, 0.01);
      if (k === 'release')   comp.release.setTargetAtTime(val / 1000, 0, 0.01);
      if (k === 'makeup')    makeup.gain.setTargetAtTime(Math.pow(10, val / 20), 0, 0.01);
    },
    getState: () => ({
      peakReduction: -comp.threshold.value / 40 * 100,
      gainControl: 20 * Math.log10(Math.max(1e-6, makeup.gain.value)),
      tubeSat: curSat,
      mix: wetGain.gain.value * 100,
    }),
    connect: d => output.connect(d),
    disconnect: () => {
      try { output.disconnect(); } catch (e) {}
      try { input.disconnect(); } catch (e) {}
      try { comp.disconnect(); } catch (e) {}
      try { makeup.disconnect(); sat.disconnect(); } catch (e) {}
      try { dryGain.disconnect(); wetGain.disconnect(); } catch (e) {}
    },
  };
};
