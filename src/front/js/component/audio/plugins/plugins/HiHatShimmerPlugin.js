// =============================================================================
// HiHatShimmerPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createHiHatShimmerPlugin = (context, p = {}) => {
  const input = context.createGain();
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const hpf = context.createBiquadFilter();
  const shimmer = context.createBiquadFilter();
  const air = context.createBiquadFilter();

  // Registry params: freq (8000-20000), drive (0-1), mix (0-100)
  const initFreq = Number.isFinite(p.freq) ? p.freq : 12000;
  const initDrive = Number.isFinite(p.drive) ? p.drive : 0;
  const initMix = Number.isFinite(p.mix) ? p.mix : 0;

  hpf.type = 'highpass'; hpf.frequency.value = Math.max(8000, Math.min(20000, initFreq));
  shimmer.type = 'peaking'; shimmer.frequency.value = Math.max(8000, Math.min(20000, initFreq));
  shimmer.gain.value = Math.max(0, Math.min(12, initDrive * 12));
  shimmer.Q.value = 1;
  air.type = 'highshelf'; air.frequency.value = 14000; air.gain.value = 2;

  const mix01 = Math.max(0, Math.min(1, initMix / 100));
  dryGain.gain.value = 1 - mix01;
  wetGain.gain.value = mix01;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(hpf); hpf.connect(shimmer); shimmer.connect(air); air.connect(wetGain); wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      const val = Number.isFinite(v) ? v : 0;
      if (k === 'freq') {
        const c = Math.max(8000, Math.min(20000, val));
        hpf.frequency.setTargetAtTime(c, 0, 0.01);
        shimmer.frequency.setTargetAtTime(c, 0, 0.01);
      }
      if (k === 'drive') {
        const c = Math.max(0, Math.min(1, val));
        shimmer.gain.setTargetAtTime(c * 12, 0, 0.01);
      }
      if (k === 'mix') {
        const m = Math.max(0, Math.min(1, val / 100));
        dryGain.gain.setTargetAtTime(1 - m, 0, 0.05);
        wetGain.gain.setTargetAtTime(m, 0, 0.05);
      }
    },
    getState: () => ({
      freq: shimmer.frequency.value,
      drive: shimmer.gain.value / 12,
      mix: wetGain.gain.value * 100,
    }),
    connect: d => output.connect(d),
    disconnect: () => {
      try { output.disconnect(); } catch (e) {}
      try { input.disconnect(); } catch (e) {}
      try { hpf.disconnect(); } catch (e) {}
      try { shimmer.disconnect(); } catch (e) {}
      try { air.disconnect(); } catch (e) {}
      try { dryGain.disconnect(); } catch (e) {}
      try { wetGain.disconnect(); } catch (e) {}
    },
  };
};

// ── BASS / LOW END ────────────────────────────────────────────────────────
