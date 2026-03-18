// =============================================================================
// SaturationPlugin.js — Saturation / Tape Warmth Plugin
// =============================================================================
// WaveShaperNode with soft-clip (tanh) curve.
// Drive controls curve intensity, tone filters post-saturation.
// Params: drive (%), mix (%), tone (Hz)
// =============================================================================

export const createSaturationPlugin = (context, initialParams = {}) => {
  const drivePct = initialParams.drive ?? 20;
  const mixPct = initialParams.mix ?? 50;
  const toneHz = initialParams.tone ?? 8000;

  const inputGain = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const outputGain = context.createGain();
  const waveshaper = context.createWaveShaper();
  const toneFilter = context.createBiquadFilter();

  waveshaper.oversample = '4x';
  toneFilter.type = 'lowpass';
  toneFilter.frequency.value = toneHz;

  // Generate tanh saturation curve
  const generateCurve = (drive) => {
    const amount = Math.max(0.01, drive / 100) * 5;
    const samples = 8192;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * amount);
    }
    return curve;
  };

  waveshaper.curve = generateCurve(drivePct);

  const mix = mixPct / 100;
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;

  // Routing
  inputGain.connect(dryGain);
  dryGain.connect(outputGain);

  inputGain.connect(waveshaper);
  waveshaper.connect(toneFilter);
  toneFilter.connect(wetGain);
  wetGain.connect(outputGain);

  return {
    node: inputGain,
    inputNode: inputGain,
    outputNode: outputGain,

    setParam: (paramId, value) => {
      const t = context.currentTime;
      switch (paramId) {
        case 'drive':
          waveshaper.curve = generateCurve(value);
          break;
        case 'mix': {
          const m = Math.max(0, Math.min(1, value / 100));
          dryGain.gain.setTargetAtTime(1 - m, t, 0.02);
          wetGain.gain.setTargetAtTime(m, t, 0.02);
          break;
        }
        case 'tone':
          toneFilter.frequency.setTargetAtTime(value, t, 0.01);
          break;
      }
    },

    destroy: () => {
      [inputGain, dryGain, wetGain, waveshaper, toneFilter, outputGain]
        .forEach(n => { try { n.disconnect(); } catch (e) {} });
    },
  };
};