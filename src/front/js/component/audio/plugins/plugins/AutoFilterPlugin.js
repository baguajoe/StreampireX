// =============================================================================
// AutoFilterPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createAutoFilterPlugin = (context, p = {}) => {
  const input = context.createGain(), output = context.createGain();
  const dryGain = context.createGain(), wetGain = context.createGain();
  const filter = context.createBiquadFilter();
  const lfo = context.createOscillator();
  const lfoGain = context.createGain();

  const clamp = (v, lo, hi, dflt) => {
    const n = Number.isFinite(v) ? v : dflt;
    return Math.max(lo, Math.min(hi, n));
  };

  // depth 0..1 → 0..5000 Hz peak deviation around freq
  const depthToHz = (v) => clamp(v, 0, 1, 0) * 5000;

  filter.type = p.type ?? 'lowpass';
  filter.frequency.value = clamp(p.freq, 200, 8000, 1000);
  filter.Q.value = clamp(p.res ?? p.q, 0, 20, 3);

  lfo.frequency.value = clamp(p.rate, 0.01, 10, 1);
  lfoGain.gain.value = depthToHz(p.depth ?? 0);
  lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
  lfo.start();

  const mix0 = clamp(p.mix, 0, 100, 0) / 100;
  dryGain.gain.value = 1 - mix0;
  wetGain.gain.value = mix0;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(filter); filter.connect(wetGain); wetGain.connect(output);

  let stopped = false;
  const stopLFO = () => { if (!stopped) { try { lfo.stop(); } catch(_){} stopped = true; } };

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      switch (k) {
        case 'rate':  lfo.frequency.setTargetAtTime(clamp(v, 0.01, 10, 1), 0, 0.05); break;
        case 'depth': lfoGain.gain.setTargetAtTime(depthToHz(v), 0, 0.05); break;
        case 'freq':  filter.frequency.setTargetAtTime(clamp(v, 200, 8000, 1000), 0, 0.01); break;
        case 'res':   filter.Q.setTargetAtTime(clamp(v, 0, 20, 3), 0, 0.01); break;
        case 'q':     filter.Q.setTargetAtTime(clamp(v, 0, 20, 3), 0, 0.01); break;
        case 'type':  if (typeof v === 'string') filter.type = v; break;
        case 'mix': {
          const m = clamp(v, 0, 100, 0) / 100;
          dryGain.gain.setTargetAtTime(1 - m, 0, 0.05);
          wetGain.gain.setTargetAtTime(m, 0, 0.05);
          break;
        }
      }
    },
    getState: () => ({
      rate: lfo.frequency.value,
      depth: lfoGain.gain.value / 5000,
      freq: filter.frequency.value,
      res: filter.Q.value,
      mix: wetGain.gain.value * 100,
    }),
    connect: d => output.connect(d),
    disconnect: () => { stopLFO(); output.disconnect(); },
    destroy: () => { stopLFO(); try { input.disconnect(); filter.disconnect(); lfoGain.disconnect(); dryGain.disconnect(); wetGain.disconnect(); output.disconnect(); } catch(_){} },
  };
};
