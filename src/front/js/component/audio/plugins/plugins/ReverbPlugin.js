// =============================================================================
// ReverbPlugin.js — Convolution Reverb Plugin
// =============================================================================
// Uses ConvolverNode with algorithmically generated impulse responses.
// Dry/wet mix via parallel routing. Pre-delay via DelayNode.
// Damping via lowpass filter on wet signal.
// Params: mix (%), decay (s), preDelay (ms), damping (Hz)
// =============================================================================

export const createReverbPlugin = (context, initialParams = {}) => {
  const mix = (initialParams.mix ?? 25) / 100;
  const decay = initialParams.decay ?? 2.0;
  const preDelayMs = initialParams.preDelay ?? 10;
  const dampingFreq = initialParams.damping ?? 8000;

  // Nodes
  const inputGain = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const outputGain = context.createGain();
  const preDelay = context.createDelay(0.5);
  const convolver = context.createConvolver();
  const dampingFilter = context.createBiquadFilter();
  const merger = context.createGain(); // sum dry + wet

  // Config
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;
  preDelay.delayTime.value = preDelayMs / 1000;
  dampingFilter.type = 'lowpass';
  dampingFilter.frequency.value = dampingFreq;

  // Generate IR
  const generateIR = (decayTime) => {
    const sr = context.sampleRate;
    const len = Math.ceil(sr * Math.max(0.2, Math.min(8, decayTime)));
    const buf = context.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decayTime * 0.8);
      }
    }
    return buf;
  };

  convolver.buffer = generateIR(decay);

  // Routing: input → dry → merger → output
  //          input → preDelay → convolver → damping → wet → merger
  inputGain.connect(dryGain);
  dryGain.connect(merger);

  inputGain.connect(preDelay);
  preDelay.connect(convolver);
  convolver.connect(dampingFilter);
  dampingFilter.connect(wetGain);
  wetGain.connect(merger);

  merger.connect(outputGain);

  // State for regeneration
  let currentDecay = decay;

  return {
    node: inputGain,
    inputNode: inputGain,
    outputNode: outputGain,

    setParam: (paramId, value) => {
      const t = context.currentTime;
      switch (paramId) {
        case 'mix': {
          const m = Math.max(0, Math.min(1, value / 100));
          dryGain.gain.setTargetAtTime(1 - m, t, 0.02);
          wetGain.gain.setTargetAtTime(m, t, 0.02);
          break;
        }
        case 'decay': {
          currentDecay = value;
          try { convolver.buffer = generateIR(value); } catch (e) {}
          break;
        }
        case 'preDelay':
          preDelay.delayTime.setTargetAtTime(value / 1000, t, 0.01);
          break;
        case 'damping':
          dampingFilter.frequency.setTargetAtTime(value, t, 0.01);
          break;
      }
    },

    destroy: () => {
      try { inputGain.disconnect(); } catch (e) {}
      try { dryGain.disconnect(); } catch (e) {}
      try { wetGain.disconnect(); } catch (e) {}
      try { preDelay.disconnect(); } catch (e) {}
      try { convolver.disconnect(); } catch (e) {}
      try { dampingFilter.disconnect(); } catch (e) {}
      try { merger.disconnect(); } catch (e) {}
      try { outputGain.disconnect(); } catch (e) {}
    },
  };
};