// =============================================================================
// MonoMakerPlugin.js — StreamPireX Audio Plugin
// =============================================================================
// "Mono below X Hz" topology:
//   input → splitter
//     low band:  L through LPF + R through LPF → summed (mono) → merger L & R
//     high band: L through HPF → merger L
//                R through HPF → merger R
//   merger → output
// =============================================================================

export const createMonoMakerPlugin = (context, p = {}) => {
  const input = context.createGain();
  const output = context.createGain();
  const splitter = context.createChannelSplitter(2);
  const merger = context.createChannelMerger(2);

  const initFreq = Number.isFinite(p.freq) ? p.freq : 120;

  // Low-pass on each channel; sum to mono with -6 dB compensation.
  const lLp = context.createBiquadFilter(); lLp.type = 'lowpass'; lLp.frequency.value = initFreq;
  const rLp = context.createBiquadFilter(); rLp.type = 'lowpass'; rLp.frequency.value = initFreq;
  const lowSum = context.createGain(); lowSum.gain.value = 0.5; // sum-to-mono comp

  // High-pass per channel; preserve stereo.
  const lHp = context.createBiquadFilter(); lHp.type = 'highpass'; lHp.frequency.value = initFreq;
  const rHp = context.createBiquadFilter(); rHp.type = 'highpass'; rHp.frequency.value = initFreq;

  input.connect(splitter);
  splitter.connect(lLp, 0); splitter.connect(rLp, 1);
  lLp.connect(lowSum); rLp.connect(lowSum);
  // Mono low band into both output channels.
  lowSum.connect(merger, 0, 0); lowSum.connect(merger, 0, 1);

  splitter.connect(lHp, 0); splitter.connect(rHp, 1);
  lHp.connect(merger, 0, 0); rHp.connect(merger, 0, 1);

  merger.connect(output);

  return {
    inputNode: input,
    node: input,
    outputNode: output,
    setParam: (k, v) => {
      const t = context.currentTime;
      if (k === 'freq' || k === 'frequency' || k === 'cutoff') {
        const f = Number.isFinite(v) ? v : 120;
        lLp.frequency.setTargetAtTime(f, t, 0.01);
        rLp.frequency.setTargetAtTime(f, t, 0.01);
        lHp.frequency.setTargetAtTime(f, t, 0.01);
        rHp.frequency.setTargetAtTime(f, t, 0.01);
      }
    },
    getState: () => ({ freq: lLp.frequency.value }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
    destroy: () => {
      try { input.disconnect(); splitter.disconnect(); lLp.disconnect(); rLp.disconnect(); lowSum.disconnect(); lHp.disconnect(); rHp.disconnect(); merger.disconnect(); output.disconnect(); } catch (e) {}
    },
  };
};
