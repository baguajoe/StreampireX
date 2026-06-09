// =============================================================================
// HaasEffectPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createHaasEffectPlugin = (context, p = {}) => {
  const input = context.createGain();
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const splitter = context.createChannelSplitter(2);
  const merger = context.createChannelMerger(2);
  const delay = context.createDelay(0.05);
  const leftGain = context.createGain();   // left channel level (width)
  const rightGain = context.createGain();  // right (delayed) channel level (width)

  // Registry: delay 1..40 ms (default 15), width 0..1 (default 0.8), mix 0..100% (default 50)
  const delayMs0 = Number.isFinite(p.delay) ? p.delay : 15;
  const width0 = Number.isFinite(p.width) ? p.width : 0.8;
  const mixPct0 = Number.isFinite(p.mix) ? p.mix : 50;

  delay.delayTime.value = Math.max(0, Math.min(0.04, delayMs0 / 1000));

  // Width controls how much of the dry signal vs delayed appears on each side.
  // width=0 → full mono (both sides identical), width=1 → max stereo split.
  const applyWidth = (w) => {
    const c = Math.max(0, Math.min(1, w));
    leftGain.gain.value = 1;          // left always full
    rightGain.gain.value = c;         // right = width * delayed
  };
  applyWidth(width0);

  // Topology: input → splitter
  //   ch0(L) → leftGain → merger ch0
  //   ch0(L) → delay → rightGain → merger ch1
  // Mix wet path with dry input.
  input.connect(dryGain); dryGain.connect(output);
  input.connect(splitter);
  splitter.connect(leftGain, 0);
  leftGain.connect(merger, 0, 0);
  splitter.connect(delay, 0);
  delay.connect(rightGain);
  rightGain.connect(merger, 0, 1);
  merger.connect(wetGain); wetGain.connect(output);

  const m = Math.max(0, Math.min(100, mixPct0)) / 100;
  dryGain.gain.value = 1 - m;
  wetGain.gain.value = m;

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      const safe = Number.isFinite(v) ? v : 0;
      if (k === 'delay') delay.delayTime.setTargetAtTime(Math.max(0, Math.min(0.04, safe / 1000)), 0, 0.01);
      if (k === 'width') {
        const c = Math.max(0, Math.min(1, safe));
        rightGain.gain.setTargetAtTime(c, 0, 0.05);
      }
      if (k === 'mix') {
        const c = Math.max(0, Math.min(100, safe)) / 100;
        dryGain.gain.setTargetAtTime(1 - c, 0, 0.05);
        wetGain.gain.setTargetAtTime(c, 0, 0.05);
      }
    },
    getState: () => ({
      delay: delay.delayTime.value * 1000,
      width: rightGain.gain.value,
      mix: wetGain.gain.value * 100,
    }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
    destroy: () => {
      try { output.disconnect(); } catch {}
      try { input.disconnect(); } catch {}
      try { splitter.disconnect(); } catch {}
      try { merger.disconnect(); } catch {}
      try { delay.disconnect(); } catch {}
      try { leftGain.disconnect(); } catch {}
      try { rightGain.disconnect(); } catch {}
      try { dryGain.disconnect(); } catch {}
      try { wetGain.disconnect(); } catch {}
    },
  };
};
