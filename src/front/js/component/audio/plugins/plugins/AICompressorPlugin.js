// =============================================================================
// AICompressorPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createAICompressorPlugin = (context, p = {}) => {
  const input = context.createGain(), output = context.createGain();
  const comp = context.createDynamicsCompressor(), makeup = context.createGain();

  const clamp = (v, lo, hi, dflt) => {
    const n = Number.isFinite(v) ? v : dflt;
    return Math.max(lo, Math.min(hi, n));
  };

  // Init from registry-default-style params (attack/release in ms; makeup in dB)
  comp.threshold.value = clamp(p.threshold, -40, 0, -18);
  comp.ratio.value     = clamp(p.ratio, 1, 20, 2);
  comp.knee.value      = 6;
  comp.attack.value    = clamp(p.attack, 0.1, 200, 10) / 1000;     // ms → s
  comp.release.value   = clamp(p.release, 10, 2000, 100) / 1000;   // ms → s
  makeup.gain.value    = Math.pow(10, clamp(p.makeup, 0, 24, 0) / 20);

  input.connect(comp); comp.connect(makeup); makeup.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      switch (k) {
        case 'threshold': comp.threshold.setTargetAtTime(clamp(v, -40, 0, -18), 0, 0.01); break;
        case 'ratio':     comp.ratio.setTargetAtTime(clamp(v, 1, 20, 2), 0, 0.01); break;
        case 'attack':    comp.attack.setTargetAtTime(clamp(v, 0.1, 200, 10) / 1000, 0, 0.01); break;
        case 'release':   comp.release.setTargetAtTime(clamp(v, 10, 2000, 100) / 1000, 0, 0.01); break;
        case 'makeup':    makeup.gain.setTargetAtTime(Math.pow(10, clamp(v, 0, 24, 0) / 20), 0, 0.01); break;
        case 'style': {
          // 0=clean 1=warm 2=punch 3=vintage — map to knee/ratio character
          const s = clamp(v, 0, 3, 0) | 0;
          const knees = [6, 12, 4, 14];
          comp.knee.setTargetAtTime(knees[s] ?? 6, 0, 0.05);
          break;
        }
      }
    },
    getState: () => ({
      threshold: comp.threshold.value,
      ratio: comp.ratio.value,
      attack: comp.attack.value * 1000,
      release: comp.release.value * 1000,
      makeup: 20 * Math.log10(Math.max(1e-6, makeup.gain.value)),
    }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
    destroy: () => { try { input.disconnect(); comp.disconnect(); makeup.disconnect(); output.disconnect(); } catch(_){} },
  };
};

// ── DRUM / PERCUSSION ─────────────────────────────────────────────────────
