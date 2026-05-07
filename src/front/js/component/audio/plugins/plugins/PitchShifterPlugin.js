// =============================================================================
// PitchShifterPlugin.js — StreamPireX Audio Plugin (Phase C4 — real pitch shift)
// =============================================================================
// Real-time pitch shifter using Tone.js v15 PitchShift (delay-line / grain
// crossfade — Doppler method). Quality:
//   ±5 semitones: clean
//   ±5..±8 semitones: mild artifacts (slight modulation/comb)
//   beyond ±8: noticeable graininess (windowSize tradeoff)
//
// UI keys: pitch (semitones, -12..+12), windowSize (s, 0.03..0.2),
//          feedback (0..0.95), mix (0..1).
// =============================================================================

import * as Tone from 'tone';

const safe = (v, def, lo, hi) => {
  const n = Number.isFinite(v) ? v : def;
  return Math.max(lo, Math.min(hi, n));
};

export const createPitchShifterPlugin = (context, p = {}) => {
  // Bind Tone.js to the host AudioContext (idempotent — sharing one ctx is fine).
  try { Tone.setContext(context); } catch (e) { /* already bound */ }

  const input = context.createGain();
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();

  const pitch0 = safe(p.pitch != null ? p.pitch : (p.semitones != null ? p.semitones : 0), 0, -24, 24);
  const window0 = safe(p.windowSize, 0.1, 0.03, 0.5);
  const fb0 = safe(p.feedback, 0, 0, 0.95);
  const mix0 = safe(p.mix != null ? p.mix : 1.0, 1.0, 0, 1);

  const ps = new Tone.PitchShift({
    pitch: pitch0,
    windowSize: window0,
    feedback: fb0,
    delayTime: 0,
  });

  // Tone exposes .input and .output as native AudioNodes (or thin wrappers).
  input.connect(ps.input);
  ps.connect(wetGain);
  wetGain.connect(output);

  // Parallel dry path so mix knob works without touching Tone internals.
  input.connect(dryGain);
  dryGain.connect(output);

  wetGain.gain.value = mix0;
  dryGain.gain.value = 1 - mix0;

  return {
    inputNode: input,
    outputNode: output,
    node: input,
    setParam(k, v) {
      const t = context.currentTime;
      if (k === 'pitch' || k === 'semitones') {
        ps.pitch = safe(v, 0, -24, 24);
      } else if (k === 'windowSize') {
        ps.windowSize = safe(v, 0.1, 0.03, 0.5);
      } else if (k === 'feedback') {
        // Tone exposes feedback via .feedback (Param).
        if (ps.feedback && ps.feedback.value !== undefined) {
          ps.feedback.value = safe(v, 0, 0, 0.95);
        }
      } else if (k === 'mix') {
        const m = safe(v > 1 ? v / 100 : v, 1, 0, 1);
        wetGain.gain.setTargetAtTime(m, t, 0.02);
        dryGain.gain.setTargetAtTime(1 - m, t, 0.02);
      }
    },
    getState: () => ({
      pitch: ps.pitch,
      windowSize: ps.windowSize,
      mix: wetGain.gain.value,
    }),
    connect: d => output.connect(d),
    disconnect: () => { try { output.disconnect(); } catch (e) {} },
    destroy() {
      try { input.disconnect(); } catch (e) {}
      try { dryGain.disconnect(); } catch (e) {}
      try { wetGain.disconnect(); } catch (e) {}
      try { output.disconnect(); } catch (e) {}
      try { ps.dispose(); } catch (e) {}
    },
  };
};
