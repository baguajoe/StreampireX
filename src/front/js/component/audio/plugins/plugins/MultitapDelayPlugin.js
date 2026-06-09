// =============================================================================
// MultitapDelayPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createMultitapDelayPlugin = (context, p = {}) => {
  const input = context.createGain();
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const feedbackGain = context.createGain();
  const wetSum = context.createGain();

  // Registry params: tap1 (50-500ms), tap2 (100-1000ms), tap3 (200-2000ms),
  // feedback (0..0.9), mix (0..100%)
  const initTap1 = Number.isFinite(p.tap1) ? Math.max(50, Math.min(500, p.tap1)) : 125;
  const initTap2 = Number.isFinite(p.tap2) ? Math.max(100, Math.min(1000, p.tap2)) : 250;
  const initTap3 = Number.isFinite(p.tap3) ? Math.max(200, Math.min(2000, p.tap3)) : 500;
  const initFb = Number.isFinite(p.feedback) ? Math.max(0, Math.min(0.9, p.feedback)) : 0.3;
  const initMix = Number.isFinite(p.mix) ? Math.max(0, Math.min(100, p.mix)) : 0;

  const tap1 = context.createDelay(2.5);
  const tap2 = context.createDelay(2.5);
  const tap3 = context.createDelay(2.5);
  tap1.delayTime.value = initTap1 / 1000;
  tap2.delayTime.value = initTap2 / 1000;
  tap3.delayTime.value = initTap3 / 1000;

  const tapGains = [
    context.createGain(),
    context.createGain(),
    context.createGain(),
  ];
  tapGains[0].gain.value = 0.7;
  tapGains[1].gain.value = 0.5;
  tapGains[2].gain.value = 0.35;

  feedbackGain.gain.value = initFb;
  const mix01 = initMix / 100;
  dryGain.gain.value = 1 - mix01;
  wetGain.gain.value = mix01;

  // Routing: input → dry → output. input + feedback → all taps → wetSum → wetGain → output.
  // Feedback path: wetSum → feedbackGain → back into all taps.
  input.connect(dryGain); dryGain.connect(output);

  input.connect(tap1); input.connect(tap2); input.connect(tap3);
  feedbackGain.connect(tap1); feedbackGain.connect(tap2); feedbackGain.connect(tap3);

  tap1.connect(tapGains[0]); tapGains[0].connect(wetSum);
  tap2.connect(tapGains[1]); tapGains[1].connect(wetSum);
  tap3.connect(tapGains[2]); tapGains[2].connect(wetSum);

  wetSum.connect(feedbackGain);
  wetSum.connect(wetGain);
  wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      const val = Number.isFinite(v) ? v : 0;
      if (k === 'tap1') {
        const c = Math.max(50, Math.min(500, val));
        tap1.delayTime.setTargetAtTime(c / 1000, 0, 0.05);
      }
      if (k === 'tap2') {
        const c = Math.max(100, Math.min(1000, val));
        tap2.delayTime.setTargetAtTime(c / 1000, 0, 0.05);
      }
      if (k === 'tap3') {
        const c = Math.max(200, Math.min(2000, val));
        tap3.delayTime.setTargetAtTime(c / 1000, 0, 0.05);
      }
      if (k === 'feedback') {
        const c = Math.max(0, Math.min(0.9, val));
        feedbackGain.gain.setTargetAtTime(c, 0, 0.01);
      }
      if (k === 'mix') {
        const c = Math.max(0, Math.min(1, val / 100));
        dryGain.gain.setTargetAtTime(1 - c, 0, 0.05);
        wetGain.gain.setTargetAtTime(c, 0, 0.05);
      }
    },
    getState: () => ({
      tap1: tap1.delayTime.value * 1000,
      tap2: tap2.delayTime.value * 1000,
      tap3: tap3.delayTime.value * 1000,
      feedback: feedbackGain.gain.value,
      mix: wetGain.gain.value * 100,
    }),
    connect: d => output.connect(d),
    disconnect: () => {
      try { output.disconnect(); } catch (e) {}
      try { input.disconnect(); } catch (e) {}
      try { tap1.disconnect(); tap2.disconnect(); tap3.disconnect(); } catch (e) {}
      try { tapGains.forEach(g => g.disconnect()); } catch (e) {}
      try { feedbackGain.disconnect(); wetSum.disconnect(); wetGain.disconnect(); dryGain.disconnect(); } catch (e) {}
    },
  };
};
