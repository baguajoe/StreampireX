// =============================================================================
// DrumBusPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createDrumBusPlugin = (context, p = {}) => {
  const input = context.createGain();
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const hpf = context.createBiquadFilter();
  const comp = context.createDynamicsCompressor();
  const transient = context.createGain(); // pre-comp emphasis (punch)
  const body = context.createBiquadFilter();
  const makeup = context.createGain();

  hpf.type = 'highpass'; hpf.frequency.value = 40;
  body.type = 'peaking'; body.frequency.value = 200; body.gain.value = 0; body.Q.value = 0.8;

  // Initial defaults from registry: punch dB(0..12), compress 0..1, transient 0..1, mix %
  const punch0 = Number.isFinite(p.punch) ? p.punch : 0;       // dB pre-emphasis
  const compress0 = Number.isFinite(p.compress) ? p.compress : 0.5;
  const transient0 = Number.isFinite(p.transient) ? p.transient : 0.5;
  const mix0 = Number.isFinite(p.mix) ? p.mix : 100;

  // Map compress 0..1 → threshold(-30..-5 dB) and ratio(2..10)
  const threshFromCompress = (v) => -30 + Math.max(0, Math.min(1, v)) * 25;
  const ratioFromCompress = (v) => 2 + Math.max(0, Math.min(1, v)) * 8;
  // Map transient 0..1 → attack ms(20..1) and release(50..200)
  const attackFromTransient = (v) => (20 - Math.max(0, Math.min(1, v)) * 19) / 1000;
  const releaseFromTransient = (v) => (50 + Math.max(0, Math.min(1, v)) * 150) / 1000;

  comp.threshold.value = threshFromCompress(compress0);
  comp.ratio.value = ratioFromCompress(compress0);
  comp.knee.value = 3;
  comp.attack.value = attackFromTransient(transient0);
  comp.release.value = releaseFromTransient(transient0);

  // Punch is a pre-comp gain in dB feeding emphasis; we use makeup at end as well
  transient.gain.value = Math.pow(10, Math.max(0, Math.min(12, punch0)) / 20);
  makeup.gain.value = 1;

  // Topology: input → hpf → body → transient(punch) → comp → makeup → wetGain
  // Dry path for mix
  input.connect(dryGain); dryGain.connect(output);
  input.connect(hpf); hpf.connect(body); body.connect(transient);
  transient.connect(comp); comp.connect(makeup); makeup.connect(wetGain); wetGain.connect(output);

  // Apply mix
  const m = Math.max(0, Math.min(100, mix0)) / 100;
  dryGain.gain.value = 1 - m;
  wetGain.gain.value = m;

  return {
    inputNode: input,
    node: input,
    setParam(k, v) {
      const safe = (Number.isFinite(v) ? v : 0);
      if (k === 'punch') {
        const c = Math.max(0, Math.min(12, safe));
        transient.gain.setTargetAtTime(Math.pow(10, c / 20), 0, 0.01);
      }
      if (k === 'compress') {
        const c = Math.max(0, Math.min(1, safe));
        comp.threshold.setTargetAtTime(threshFromCompress(c), 0, 0.01);
        comp.ratio.setTargetAtTime(ratioFromCompress(c), 0, 0.01);
      }
      if (k === 'transient') {
        const c = Math.max(0, Math.min(1, safe));
        comp.attack.setTargetAtTime(attackFromTransient(c), 0, 0.01);
        comp.release.setTargetAtTime(releaseFromTransient(c), 0, 0.01);
      }
      if (k === 'mix') {
        const c = Math.max(0, Math.min(100, safe)) / 100;
        dryGain.gain.setTargetAtTime(1 - c, 0, 0.05);
        wetGain.gain.setTargetAtTime(c, 0, 0.05);
      }
    },
    getState: () => ({
      threshold: comp.threshold.value,
      ratio: comp.ratio.value,
      mix: wetGain.gain.value * 100,
    }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
    destroy: () => {
      try { output.disconnect(); } catch {}
      try { input.disconnect(); } catch {}
      try { hpf.disconnect(); } catch {}
      try { body.disconnect(); } catch {}
      try { transient.disconnect(); } catch {}
      try { comp.disconnect(); } catch {}
      try { makeup.disconnect(); } catch {}
      try { dryGain.disconnect(); } catch {}
      try { wetGain.disconnect(); } catch {}
    },
  };
};
