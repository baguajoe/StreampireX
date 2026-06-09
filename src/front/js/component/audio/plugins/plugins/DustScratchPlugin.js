// =============================================================================
// DustScratchPlugin.js — StreamPireX Audio Plugin
// =============================================================================
// Two independent noise sources so dust and crackle are mutable separately.

export const createDustScratchPlugin = (context, p = {}) => {
  const input = context.createGain(), output = context.createGain();

  // Build two independent noise buffers so dust/crackle are decorrelated.
  const makeNoiseBuf = () => {
    const buf = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  };

  // Dust: bandpassed @ 8 kHz → noiseGain.
  const dustNoise = context.createBufferSource(); dustNoise.buffer = makeNoiseBuf(); dustNoise.loop = true;
  const dustFilter = context.createBiquadFilter(); dustFilter.type = 'bandpass'; dustFilter.frequency.value = 8000; dustFilter.Q.value = 0.2;
  const dustGain = context.createGain(); dustGain.gain.value = p.dust ?? 0;
  dustNoise.connect(dustFilter); dustFilter.connect(dustGain); dustGain.connect(output);

  // Crackle: separate noise source, slight HP shaping for clicky character.
  const crackleNoise = context.createBufferSource(); crackleNoise.buffer = makeNoiseBuf(); crackleNoise.loop = true;
  const crackleFilter = context.createBiquadFilter(); crackleFilter.type = 'highpass'; crackleFilter.frequency.value = 2000;
  const crackleGain = context.createGain(); crackleGain.gain.value = p.crackle ?? 0;
  crackleNoise.connect(crackleFilter); crackleFilter.connect(crackleGain); crackleGain.connect(output);

  dustNoise.start(); crackleNoise.start();
  input.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (k === 'dust')    dustGain.gain.setTargetAtTime(v, 0, .01);
      if (k === 'crackle') crackleGain.gain.setTargetAtTime(v, 0, .01);
    },
    getState: () => ({ dust: dustGain.gain.value, crackle: crackleGain.gain.value }),
    connect: d => output.connect(d),
    disconnect: () => { try { dustNoise.stop(); } catch (e) {} try { crackleNoise.stop(); } catch (e) {} output.disconnect(); },
  };
};
