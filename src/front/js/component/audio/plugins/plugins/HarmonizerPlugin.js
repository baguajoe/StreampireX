// =============================================================================
// HarmonizerPlugin.js — StreamPireX Audio Plugin (Phase C4 — real harmonizer)
// =============================================================================
// 4 parallel Tone.PitchShift voices at fixed musical intervals. Default
// intervals: -12 (octave down), +3 (minor 3rd), +5 (perfect 4th), +7 (5th).
// Each voice has its own gain knob (voice0..voice3). Mix knob blends dry vs
// wet. v0Shift..v3Shift override per-voice interval if provided.
//
// Quality: same as Tone.PitchShift — clean within ±5 semitones, mild
// artifacts beyond. Voices stack so harmonic density covers some artifacts.
// =============================================================================

import * as Tone from 'tone';

const safe = (v, def, lo, hi) => {
  const n = Number.isFinite(v) ? v : def;
  return Math.max(lo, Math.min(hi, n));
};

export const createHarmonizerPlugin = (context, p = {}) => {
  try { Tone.setContext(context); } catch (e) {}

  const input = context.createGain();
  const output = context.createGain();
  const wetBus = context.createGain();
  const dryGain = context.createGain();

  const defaultShifts = [-12, 3, 5, 7];
  const defaultVols = [0.4, 0.4, 0.4, 0.4];

  const voices = defaultShifts.map((semi, i) => {
    const initSemi = Number.isFinite(p[`v${i}Shift`]) ? p[`v${i}Shift`]
                   : Number.isFinite(p[`voice${i}Shift`]) ? p[`voice${i}Shift`]
                   : semi;
    const initVol = safe(
      p[`voice${i}`] != null ? p[`voice${i}`]
      : p[`v${i}Vol`] != null ? p[`v${i}Vol`]
      : defaultVols[i],
      defaultVols[i], 0, 1
    );
    const ps = new Tone.PitchShift({ pitch: safe(initSemi, semi, -24, 24), windowSize: 0.1 });
    const g = context.createGain();
    g.gain.value = initVol;
    input.connect(ps.input);
    g.connect(wetBus);
    // Connect ps→g only when audible to save CPU. Reconnects on vol > 0.
    const voice = { ps, g, connected: false };
    if (initVol > 0) { try { ps.connect(g); voice.connected = true; } catch (e) {} }
    return voice;
  });

  const setVoiceConnected = (voice, shouldConnect) => {
    if (shouldConnect && !voice.connected) { try { voice.ps.connect(voice.g); voice.connected = true; } catch (e) {} }
    else if (!shouldConnect && voice.connected) { try { voice.ps.disconnect(voice.g); voice.connected = false; } catch (e) {} }
  };

  const mix0 = safe(p.mix != null ? p.mix : 0, 0, 0, 1);
  const wetMix = context.createGain();
  wetMix.gain.value = mix0;
  wetBus.connect(wetMix); wetMix.connect(output);
  input.connect(dryGain); dryGain.connect(output);
  dryGain.gain.value = 1 - mix0;

  return {
    inputNode: input,
    outputNode: output,
    node: input,
    setParam(k, v) {
      const t = context.currentTime;
      let m = k.match(/^voice(\d+)$/) || k.match(/^v(\d+)Vol$/);
      if (m) {
        const idx = +m[1];
        if (voices[idx]) {
          const newVol = safe(v, 0.4, 0, 1);
          voices[idx].g.gain.setTargetAtTime(newVol, t, 0.02);
          setVoiceConnected(voices[idx], newVol > 0);
        }
        return;
      }
      m = k.match(/^v(\d+)Shift$/) || k.match(/^voice(\d+)Shift$/);
      if (m) {
        const idx = +m[1];
        if (voices[idx]) voices[idx].ps.pitch = safe(v, 0, -24, 24);
        return;
      }
      if (k === 'mix') {
        const mm = safe(v > 1 ? v / 100 : v, 0.5, 0, 1);
        wetMix.gain.setTargetAtTime(mm, t, 0.02);
        dryGain.gain.setTargetAtTime(1 - mm, t, 0.02);
      }
    },
    getState: () => ({
      voices: voices.map(v => ({ pitch: v.ps.pitch, vol: v.g.gain.value })),
      mix: wetMix.gain.value,
    }),
    connect: d => output.connect(d),
    disconnect: () => { try { output.disconnect(); } catch (e) {} },
    destroy() {
      voices.forEach(v => {
        try { v.ps.dispose(); } catch (e) {}
        try { v.g.disconnect(); } catch (e) {}
      });
      try { input.disconnect(); } catch (e) {}
      try { wetBus.disconnect(); } catch (e) {}
      try { wetMix.disconnect(); } catch (e) {}
      try { dryGain.disconnect(); } catch (e) {}
      try { output.disconnect(); } catch (e) {}
    },
  };
};
