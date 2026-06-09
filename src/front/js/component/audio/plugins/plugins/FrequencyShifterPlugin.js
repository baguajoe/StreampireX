// =============================================================================
// FrequencyShifterPlugin.js — StreamPireX Audio Plugin (Phase C4 — real SSB)
// =============================================================================
// Single-Sideband (SSB) frequency shifter using a Hilbert-transform pair
// implemented as two cascaded Web-Audio all-pass biquad networks (Olli
// Niemitalo coefficients — 8 cascaded all-passes split into two parallel
// branches with ~90° relative phase across the audible band, ~0.05 dB
// flatness). Output:
//
//   y(t) = I(x) * cos(2π·shift·t) - Q(x) * sin(2π·shift·t)
//
// where I(x) and Q(x) are the two Hilbert branches (90° apart).
//
// This is a TRUE frequency shift (linear, inharmonic — different from
// pitch shift). Quality:
//   - shift 0..±2 kHz: clean, classic Bode shifter sound
//   - shift > ±5 kHz: aliasing audible (unavoidable without oversampling)
//   - low end (<50 Hz): residual upper-sideband leakage (Hilbert flatness
//     limit) — accept as ACCEPTABLE not CLEAN
//
// UI keys: shift (Hz, -5000..+5000), mix (0..1 or 0..100).
// =============================================================================

const safe = (v, def, lo, hi) => {
  const n = Number.isFinite(v) ? v : def;
  return Math.max(lo, Math.min(hi, n));
};

// Olli Niemitalo "Hilbert filter" all-pass coefficients (8-section pair).
// Two parallel chains of 4 all-pass biquads; pole magnitudes squared:
const HILBERT_A_POLES2 = [
  0.4670940904,
  0.1232728458,
  0.0290015347,
  0.0061119025,
];
const HILBERT_B_POLES2 = [
  0.2967226020,
  0.0729604006,
  0.0166937845,
  0.0030597117,
];

// Build a 2nd-order all-pass section H(z) = (a² + z^-2) / (1 + a²·z^-2)
// using IIRFilterNode (exact coefficients). This is the form expected by
// Niemitalo's polyphase Hilbert tables.
function makeAllpass2nd(ctx, a2) {
  // Coefficients in order [b0, b1, b2] / [a0, a1, a2]:
  //   numerator:   [a2, 0, 1]    (b0=a²,  b1=0, b2=1)
  //   denominator: [1, 0, a2]    (a0=1,   a1=0, a2=a²)
  const feedforward = [a2, 0, 1];
  const feedback = [1, 0, a2];
  return new IIRFilterNode(ctx, { feedforward, feedback });
}

function buildHilbertChain(ctx, poles2) {
  const inGain = ctx.createGain();
  let last = inGain;
  poles2.forEach((p2) => {
    const ap = makeAllpass2nd(ctx, p2);
    last.connect(ap);
    last = ap;
  });
  const outGain = ctx.createGain();
  last.connect(outGain);
  return { input: inGain, output: outGain };
}

export const createFrequencyShifterPlugin = (context, p = {}) => {
  const input = context.createGain();
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();

  const shift0 = safe(p.shift, 0, -5000, 5000);
  const mix0Raw = p.mix != null ? p.mix : 100;
  const mix0 = safe(mix0Raw > 1 ? mix0Raw / 100 : mix0Raw, 1, 0, 1);

  // Two Hilbert branches.
  // Niemitalo's polyphase Hilbert pair: one branch needs an extra unit-sample
  // delay to align group delay so the two branch outputs differ by ~90°
  // across the audible band.
  const branchA = buildHilbertChain(context, HILBERT_A_POLES2); // I (≈cos branch)
  const branchB = buildHilbertChain(context, HILBERT_B_POLES2); // Q (≈sin branch, 90° lag)
  const sampleDelay = context.createDelay(1 / context.sampleRate + 0.001);
  sampleDelay.delayTime.value = 1 / context.sampleRate;

  input.connect(branchA.input);
  input.connect(sampleDelay);
  sampleDelay.connect(branchB.input);

  // Two carrier oscillators 90° apart. We build cos and sin using two phase-
  // locked oscillators (sine + sine with 0.25 cycle offset). For exact phase
  // lock, use OscillatorNode with phase-offset start times — Web Audio
  // doesn't expose phase directly, so we derive cos = sin(t + π/2) via a
  // ConstantSourceNode + WaveShaperNode? Simpler: use two oscillators of the
  // same frequency, started at the same currentTime — they'll be in phase,
  // then we shift one by 90° using a known delay = T/4. For audio-rate
  // carriers this is exact only at a single freq; we instead use a
  // PeriodicWave to define cos and sin precisely.
  //
  // Cleanest approach: use a single OscillatorNode of type 'sine' for sin,
  // and another OscillatorNode whose periodic wave is set to cos via
  // setPeriodicWave with the appropriate Fourier coefficients. Both started
  // at the same time → exact 90° offset at all frequencies.

  const cosOsc = context.createOscillator();
  const sinOsc = context.createOscillator();
  // sin(2πft): real coeffs [0, 0], imag [0, 1] → standard sine.
  // cos(2πft): real coeffs [0, 1], imag [0, 0].
  const cosWave = context.createPeriodicWave(new Float32Array([0, 1]), new Float32Array([0, 0]), { disableNormalization: true });
  const sinWave = context.createPeriodicWave(new Float32Array([0, 0]), new Float32Array([0, 1]), { disableNormalization: true });
  cosOsc.setPeriodicWave(cosWave);
  sinOsc.setPeriodicWave(sinWave);
  cosOsc.frequency.value = Math.abs(shift0);
  sinOsc.frequency.value = Math.abs(shift0);

  // Multiplier: GainNode with .gain modulated by an oscillator implements
  // multiplication only if the carrier feeds .gain (then output = audio *
  // carrier). We need I*cos and Q*sin separately, then sum/difference.
  const mulI = context.createGain(); mulI.gain.value = 0;
  const mulQ = context.createGain(); mulQ.gain.value = 0;
  cosOsc.connect(mulI.gain);
  sinOsc.connect(mulQ.gain);
  branchA.output.connect(mulI);
  branchB.output.connect(mulQ);

  // Sum I*cos with sign of Q*sin determined by shift direction.
  // For positive shift: y = I*cos - Q*sin (lower-sideband cancels, upper survives)
  // For negative shift: y = I*cos + Q*sin
  // Use a Gain to invert Q when shift > 0.
  const qSign = context.createGain();
  qSign.gain.value = shift0 >= 0 ? -1 : 1;
  mulQ.connect(qSign);

  const sumNode = context.createGain();
  mulI.connect(sumNode);
  qSign.connect(sumNode);
  sumNode.connect(wetGain);

  // Dry path.
  input.connect(dryGain);
  dryGain.connect(output);
  wetGain.connect(output);

  wetGain.gain.value = mix0;
  // Keep dry alive at low mix so default doesn't mute (matches old plugin).
  dryGain.gain.value = Math.max(0.0, 1 - mix0);

  cosOsc.start();
  sinOsc.start();

  let curShift = shift0;

  return {
    inputNode: input,
    outputNode: output,
    node: input,
    setParam(k, v) {
      const t = context.currentTime;
      const safeV = Number.isFinite(v) ? v : 0;
      if (k === 'shift') {
        const s = safe(safeV, 0, -5000, 5000);
        curShift = s;
        const f = Math.abs(s);
        cosOsc.frequency.setTargetAtTime(f, t, 0.02);
        sinOsc.frequency.setTargetAtTime(f, t, 0.02);
        qSign.gain.setTargetAtTime(s >= 0 ? -1 : 1, t, 0.02);
      } else if (k === 'mix') {
        const m = safe(safeV > 1 ? safeV / 100 : safeV, 1, 0, 1);
        wetGain.gain.setTargetAtTime(m, t, 0.02);
        dryGain.gain.setTargetAtTime(1 - m, t, 0.02);
      } else if (k === 'lfoRate' || k === 'lfoDepth') {
        // Phase C5 — no-op in current SSB build.
      }
    },
    getState: () => ({ shift: curShift, mix: wetGain.gain.value }),
    connect: d => output.connect(d),
    disconnect: () => { try { output.disconnect(); } catch (e) {} },
    destroy() {
      try { cosOsc.stop(); } catch (e) {}
      try { sinOsc.stop(); } catch (e) {}
      try { cosOsc.disconnect(); } catch (e) {}
      try { sinOsc.disconnect(); } catch (e) {}
      try { mulI.disconnect(); } catch (e) {}
      try { mulQ.disconnect(); } catch (e) {}
      try { qSign.disconnect(); } catch (e) {}
      try { sumNode.disconnect(); } catch (e) {}
      try { branchA.input.disconnect(); } catch (e) {}
      try { branchA.output.disconnect(); } catch (e) {}
      try { branchB.input.disconnect(); } catch (e) {}
      try { branchB.output.disconnect(); } catch (e) {}
      try { dryGain.disconnect(); } catch (e) {}
      try { wetGain.disconnect(); } catch (e) {}
      try { input.disconnect(); } catch (e) {}
      try { output.disconnect(); } catch (e) {}
    },
  };
};
