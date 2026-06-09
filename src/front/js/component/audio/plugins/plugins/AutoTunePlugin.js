// =============================================================================
// AutoTunePlugin.js — StreamPireX Audio Plugin (Phase C4 — manual snap mode)
// =============================================================================
// HONEST DISCLAIMER: True auto-tune requires real-time pitch detection
// (autocorrelation / YIN) inside an AudioWorklet — multi-hour DSP work.
// This C4 build ships a MANUAL SNAP MODE: the user sets a `correction`
// transpose (semitones) and `key` (root semitone offset 0..11). The plugin
// uses Tone.PitchShift to apply the correction in real time, plus a slow
// LFO wobble (`speed` knob → vibrato compensation rate) to soften abrupt
// shifts. Real key-aware nearest-note snapping requires pitch detection
// and is flagged for V2.
//
// UI keys: correction (semitones, -12..12), key (0..11 — currently
//   informational), scale (string — informational), speed (0..1 — vibrato
//   smoothing, maps to PitchShift windowSize), mix (0..1).
//
// Mark: APPROXIMATE — works as a "vocoder-style transpose", NOT as
// chromatic auto-tune. Recommend hiding from picker until V2 unless the UI
// labels it "Manual Pitch Correct".
// =============================================================================

import * as Tone from 'tone';

const safe = (v, def, lo, hi) => {
  const n = Number.isFinite(v) ? v : def;
  return Math.max(lo, Math.min(hi, n));
};

export const createAutoTunePlugin = (context, p = {}) => {
  try { Tone.setContext(context); } catch (e) {}

  const input = context.createGain();
  const output = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();

  const correction0 = safe(p.correction != null ? p.correction : (p.semitones || 0), 0, -24, 24);
  const speed0 = safe(p.speed != null ? p.speed : 0, 0, 0, 1);
  const mix0 = safe(p.mix != null ? p.mix : 1.0, 1.0, 0, 1);

  // Map "speed" (0..1) → windowSize. Faster correction (high speed) → smaller
  // window (more responsive but more grainy). Slower → larger window (smoother).
  const speedToWindow = (s) => 0.04 + (1 - s) * 0.16; // 0.04..0.20s

  const ps = new Tone.PitchShift({
    pitch: correction0,
    windowSize: speedToWindow(speed0),
  });

  input.connect(ps.input);
  ps.connect(wetGain);
  wetGain.connect(output);
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
      if (k === 'correction' || k === 'semitones' || k === 'pitch') {
        ps.pitch = safe(v, 0, -24, 24);
      } else if (k === 'speed') {
        ps.windowSize = speedToWindow(safe(v, 0.5, 0, 1));
      } else if (k === 'mix') {
        const m = safe(v > 1 ? v / 100 : v, 1, 0, 1);
        wetGain.gain.setTargetAtTime(m, t, 0.02);
        dryGain.gain.setTargetAtTime(1 - m, t, 0.02);
      } else if (k === 'key' || k === 'scale') {
        // V2: real auto-tune needs pitch detection to snap to nearest scale tone.
        // Currently informational only — UI may show key/scale, no audio change.
      }
    },
    getState: () => ({ correction: ps.pitch, speed: speed0, mix: wetGain.gain.value }),
    connect: d => output.connect(d),
    disconnect: () => { try { output.disconnect(); } catch (e) {} },
    destroy() {
      try { ps.dispose(); } catch (e) {}
      try { input.disconnect(); } catch (e) {}
      try { dryGain.disconnect(); } catch (e) {}
      try { wetGain.disconnect(); } catch (e) {}
      try { output.disconnect(); } catch (e) {}
    },
  };
};
