// =============================================================================
// HarmonicExciterPlugin.js — StreamPireX Audio Plugin
// Approximates separate even/odd harmonic generation by mixing two waveshapers
// (one anti-symmetric for odd harmonics, one symmetric for even harmonics).
// =============================================================================

export const createHarmonicExciterPlugin = (context, p = {}) => {
  const input = context.createGain();
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const hpf = context.createBiquadFilter();
  const wsOdd = context.createWaveShaper();
  const wsEven = context.createWaveShaper();
  const oddGain = context.createGain();
  const evenGain = context.createGain();
  const driveGain = context.createGain();
  const wetSum = context.createGain();

  hpf.type = 'highpass';
  hpf.frequency.value = Math.max(20, Math.min(20000, Number.isFinite(p.freq) ? p.freq : 3000));

  // Build curves
  const N = 256;
  const oddCurve = new Float32Array(N);
  const evenCurve = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = (2 * i / (N - 1)) - 1;
    // Odd: tanh (anti-symmetric)
    oddCurve[i] = Math.tanh(x * 3);
    // Even: |x|*x or x^2*sign(x)? Want symmetric; use x*x*sign(x) gives odd. Use abs(x)-0.5 anti-symmetric? For even harmonics, use x^2 - 0.5 ish.
    // Use absolute-value rectifier minus DC bias to get only even harmonics
    evenCurve[i] = (Math.abs(x) * 2 - 1);
  }
  wsOdd.curve = oddCurve;
  wsOdd.oversample = '2x';
  wsEven.curve = evenCurve;
  wsEven.oversample = '2x';

  // Registry params
  const drive0 = Math.max(0, Math.min(1, Number.isFinite(p.drive) ? p.drive : 0));
  const even0  = Math.max(0, Math.min(1, Number.isFinite(p.even)  ? p.even  : 0));
  const odd0   = Math.max(0, Math.min(1, Number.isFinite(p.odd)   ? p.odd   : 0));
  const mix0   = Math.max(0, Math.min(100, Number.isFinite(p.mix) ? p.mix : 0));

  driveGain.gain.value = 0.5 + drive0 * 4; // 0..1 → 0.5..4.5 pre-gain
  oddGain.gain.value = odd0;
  evenGain.gain.value = even0;

  // Topology
  // dry path
  input.connect(dryGain); dryGain.connect(output);
  // wet path: input → hpf → driveGain → (wsOdd→oddGain, wsEven→evenGain) → wetSum → wetGain
  input.connect(hpf);
  hpf.connect(driveGain);
  driveGain.connect(wsOdd); wsOdd.connect(oddGain); oddGain.connect(wetSum);
  driveGain.connect(wsEven); wsEven.connect(evenGain); evenGain.connect(wetSum);
  wetSum.connect(wetGain); wetGain.connect(output);

  const m = mix0 / 100;
  dryGain.gain.value = 1 - m;
  wetGain.gain.value = m;

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      const safe = Number.isFinite(v) ? v : 0;
      if (k === 'freq') hpf.frequency.setTargetAtTime(Math.max(500, Math.min(12000, safe)), 0, 0.01);
      if (k === 'drive') {
        const c = Math.max(0, Math.min(1, safe));
        driveGain.gain.setTargetAtTime(0.5 + c * 4, 0, 0.01);
      }
      if (k === 'even') evenGain.gain.setTargetAtTime(Math.max(0, Math.min(1, safe)), 0, 0.01);
      if (k === 'odd')  oddGain.gain.setTargetAtTime(Math.max(0, Math.min(1, safe)), 0, 0.01);
      if (k === 'mix') {
        const c = Math.max(0, Math.min(100, safe)) / 100;
        dryGain.gain.setTargetAtTime(1 - c, 0, 0.05);
        wetGain.gain.setTargetAtTime(c, 0, 0.05);
      }
      // Legacy
      if (k === 'amount') {
        const c = Math.max(0, Math.min(1, safe));
        oddGain.gain.setTargetAtTime(c, 0, 0.01);
        evenGain.gain.setTargetAtTime(c, 0, 0.01);
      }
    },
    getState: () => ({
      freq: hpf.frequency.value,
      even: evenGain.gain.value,
      odd: oddGain.gain.value,
      mix: wetGain.gain.value * 100,
    }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
    destroy: () => {
      try { output.disconnect(); } catch {}
      try { input.disconnect(); } catch {}
      try { hpf.disconnect(); } catch {}
      try { driveGain.disconnect(); } catch {}
      try { wsOdd.disconnect(); } catch {}
      try { wsEven.disconnect(); } catch {}
      try { oddGain.disconnect(); } catch {}
      try { evenGain.disconnect(); } catch {}
      try { wetSum.disconnect(); } catch {}
      try { dryGain.disconnect(); } catch {}
      try { wetGain.disconnect(); } catch {}
    },
  };
};
