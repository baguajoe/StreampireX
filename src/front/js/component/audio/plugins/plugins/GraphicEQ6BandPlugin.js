// =============================================================================
// GraphicEQ6BandPlugin.js — StreamPireX 6-Band Graphic EQ
// Bands: 60, 250, 500, 2000, 6000, 16000 Hz
// =============================================================================

export const createGraphicEQ6BandPlugin = (context, p = {}) => {
  const input  = context.createGain();
  const output = context.createGain();
  const FREQS  = [60, 250, 500, 2000, 6000, 16000];

  const filters = FREQS.map((freq, i) => {
    const f = context.createBiquadFilter();
    f.type = 'peaking';
    f.frequency.value = freq;
    f.Q.value = 2.87;
    f.gain.value = p[`band${i}`] ?? 0;
    return f;
  });

  input.connect(filters[0]);
  for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);
  filters[filters.length - 1].connect(output);

  output.gain.value = Math.pow(10, (p.outputGain ?? 0) / 20);

  return {
    inputNode: input,
    node: input,
    setParam(k, v) {
      const m = k.match(/^band(\d+)$/);
      if (m) filters[+m[1]]?.gain.setTargetAtTime(v, context.currentTime, 0.02);
      if (k === 'outputGain') output.gain.setTargetAtTime(Math.pow(10, v / 20), context.currentTime, 0.02);
      if (k === 'mix') output.gain.setTargetAtTime(v / 100, context.currentTime, 0.02);
    },
    getState: () => ({ gains: filters.map(f => f.gain.value) }),
    connect:    (dest) => output.connect(dest),
    disconnect: ()     => output.disconnect(),
  };
};
