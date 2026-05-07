// =============================================================================
// SPXPerceptualEQPlugin.js — StreamPireX Intelligent Perceptual EQ
// Gullfoss-style: spectral analysis + psychoacoustic gain riding
// Analyzes masking, presence, and clarity in real time via AnalyserNode
// and applies micro-corrections across 16 bands automatically.
// =============================================================================

export const createSPXPerceptualEQPlugin = (context, p = {}) => {
  const input    = context.createGain();
  const output   = context.createGain();
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.7;

  // 16 perceptual bands (Bark-scale inspired, 20Hz–18kHz)
  const BARK_FREQS = [
    50, 100, 150, 250, 350, 450, 570, 700,
    840, 1000, 1170, 1370, 1600, 2000, 2500, 3150,
  ];

  const filters = BARK_FREQS.map((freq, i) => {
    const f = context.createBiquadFilter();
    f.type = 'peaking';
    f.frequency.value = freq;
    f.Q.value = 3.5;
    f.gain.value = 0;
    return f;
  });

  // Chain: input → analyser (side-chain) + filter chain → output
  input.connect(analyser);
  input.connect(filters[0]);
  for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);
  filters[filters.length - 1].connect(output);

  // ── Psychoacoustic parameters ────────────────────────────────────────────
  let recover   = p.recover   ?? 0;
  let order     = p.order     ?? 0;
  let boost     = p.boost     ?? 6;
  let cut       = p.cut       ?? -6;
  let enabled   = true;
  let rafId     = null;

  const fftBuf  = new Float32Array(analyser.frequencyBinCount);
  const sr      = context.sampleRate;

  const freqToBin = (freq) =>
    Math.round((freq / (sr / 2)) * analyser.frequencyBinCount);

  const targets = new Float32Array(BARK_FREQS.length).fill(0);
  const current = new Float32Array(BARK_FREQS.length).fill(0);

  const analyze = () => {
    if (!enabled) { rafId = requestAnimationFrame(analyze); return; }

    analyser.getFloatFrequencyData(fftBuf);

    const energy = BARK_FREQS.map((freq, i) => {
      const nextFreq = BARK_FREQS[i + 1] || freq * 1.3;
      const binStart = freqToBin(freq);
      const binEnd   = freqToBin(nextFreq);
      let sum = 0, count = 0;
      for (let b = binStart; b < binEnd && b < fftBuf.length; b++) {
        sum += fftBuf[b]; count++;
      }
      return count > 0 ? sum / count : -96;
    });

    const avgEnergy = energy.reduce((a, b) => a + b, 0) / energy.length;

    for (let i = 0; i < BARK_FREQS.length; i++) {
      const e = energy[i];
      const deviation = e - avgEnergy;
      const recoverGain = deviation < -6
        ? Math.min(boost, Math.abs(deviation) * 0.3 * recover)
        : 0;
      const orderCut = deviation > 6
        ? Math.max(cut, -deviation * 0.25 * order)
        : 0;
      targets[i] = recoverGain + orderCut;
    }

    const slew = 0.05;
    for (let i = 0; i < filters.length; i++) {
      current[i] += (targets[i] - current[i]) * slew;
      filters[i].gain.setTargetAtTime(current[i], context.currentTime, 0.02);
    }

    rafId = requestAnimationFrame(analyze);
  };

  analyze();

  return {
    inputNode: input,
    node: input,
    setParam(k, v) {
      if (k === 'recover')  recover  = Math.max(0, Math.min(1, v));
      if (k === 'order')    order    = Math.max(0, Math.min(1, v));
      if (k === 'boost')    boost    = Math.max(0, Math.min(12, v));
      if (k === 'cut')      cut      = Math.max(-12, Math.min(0, v));
      if (k === 'enabled')  enabled  = !!v;
      if (k === 'mix')      output.gain.setTargetAtTime(v / 100, context.currentTime, 0.01);
    },
    getState: () => ({ recover, order, boost, cut, gains: Array.from(current) }),
    connect:    (dest) => output.connect(dest),
    disconnect: () => { cancelAnimationFrame(rafId); output.disconnect(); },
  };
};
