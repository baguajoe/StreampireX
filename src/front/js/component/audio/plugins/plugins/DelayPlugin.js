// =============================================================================
// DelayPlugin.js — Delay Plugin (Native Nodes)
// =============================================================================
// DelayNode + feedback GainNode + BiquadFilter on feedback path.
// Dry/wet parallel routing.
// Params: time (ms), feedback (%), mix (%), filterCutoff (Hz)
// =============================================================================

export const createDelayPlugin = (context, initialParams = {}) => {
  const timeMs = initialParams.time ?? 375;
  const feedbackPct = initialParams.feedback ?? 40;
  const mixPct = initialParams.mix ?? 25;
  const cutoff = initialParams.filterCutoff ?? 8000;

  const inputGain = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const outputGain = context.createGain();
  const delayNode = context.createDelay(5.0);
  const feedbackGain = context.createGain();
  const filter = context.createBiquadFilter();

  dryGain.gain.value = 1 - mixPct / 100;
  wetGain.gain.value = mixPct / 100;
  delayNode.delayTime.value = timeMs / 1000;
  feedbackGain.gain.value = feedbackPct / 100;
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;

  // Routing: input → dry → output
  //          input → delay → filter → wet → output
  //                    ↑      ↓
  //                  feedback ←
  inputGain.connect(dryGain);
  dryGain.connect(outputGain);

  inputGain.connect(delayNode);
  delayNode.connect(filter);
  filter.connect(feedbackGain);
  feedbackGain.connect(delayNode); // feedback loop
  filter.connect(wetGain);
  wetGain.connect(outputGain);

  return {
    node: inputGain,
    inputNode: inputGain,
    outputNode: outputGain,

    setParam: (paramId, value) => {
      const t = context.currentTime;
      switch (paramId) {
        case 'time':
          delayNode.delayTime.setTargetAtTime(value / 1000, t, 0.02);
          break;
        case 'feedback':
          feedbackGain.gain.setTargetAtTime(Math.min(0.95, value / 100), t, 0.01);
          break;
        case 'mix': {
          const m = Math.max(0, Math.min(1, value / 100));
          dryGain.gain.setTargetAtTime(1 - m, t, 0.02);
          wetGain.gain.setTargetAtTime(m, t, 0.02);
          break;
        }
        case 'filterCutoff':
          filter.frequency.setTargetAtTime(value, t, 0.01);
          break;
      }
    },

    destroy: () => {
      [inputGain, dryGain, wetGain, delayNode, feedbackGain, filter, outputGain]
        .forEach(n => { try { n.disconnect(); } catch (e) {} });
    },
  };
};