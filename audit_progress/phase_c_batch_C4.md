# Phase C4 — Real Pitch Algorithms

Goal: Replace stub/approximation pitch plugins with real algorithms.

Tone.js v15.1.22 is the workhorse — `Tone.PitchShift` is delay-line/grain
based; quality is decent for ±5 semitones, weakens past ±8. For 8-plugin
coverage in one session this is the pragmatic choice. The SSB
FrequencyShifter is a true Bode-style implementation using a
Hilbert-transform pair (Niemitalo polyphase all-pass coefficients).

Honesty markers used:
- CLEAN — production quality, ship as-is
- ACCEPTABLE — works with mild artifacts at extremes
- APPROXIMATE — algorithm is a noticeable compromise; ship with disclaimer
- HIDE-FOR-V2 — should not ship until proper algorithm implemented

---

## 1. PitchShifter — ACCEPTABLE
- **Files**: `src/front/js/component/audio/plugins/plugins/PitchShifterPlugin.js`
- **Algorithm**: Tone.PitchShift (Doppler/grain delay-line) + dry/wet mix.
- **Params**: `pitch` (-24..24 st), `windowSize` (0.03..0.5 s), `feedback`
  (0..0.95), `mix` (0..1).
- **Quality**: Clean within ±5 semitones, mild metallic/comb at ±5..±8,
  noticeable graininess past ±8. Standard Tone.js limitation.
- **Limitations**: True formant preservation not present; large shifts on
  sustained vowels will sound chipmunky/munchkin.

## 2. Harmonizer — ACCEPTABLE
- **Files**: `src/front/js/component/audio/plugins/plugins/HarmonizerPlugin.js`
- **Algorithm**: 4× parallel Tone.PitchShift voices at musical intervals
  (defaults: -12, +3, +5, +7 semitones). Per-voice volume + per-voice
  shift override.
- **Params**: `voice0..voice3` (vol 0..1), `v0Shift..v3Shift` (semitones),
  `mix` (0..1).
- **Quality**: Voice stacking masks per-voice artifacts; sounds full and
  musical for typical 3rd/5th/octave harmonies.
- **Limitations**: Fixed intervals — not key-aware. True key-snap
  harmonization needs pitch detection (V2).

## 3. AutoTune — APPROXIMATE
- **Files**: `src/front/js/component/audio/plugins/plugins/AutoTunePlugin.js`
- **Algorithm**: MANUAL SNAP MODE. User sets `correction` (semitones) and
  `speed` (windowSize tradeoff). Single Tone.PitchShift applies a static
  transpose; dry/wet mix.
- **Params**: `correction` (-24..24 st), `speed` (0..1 → windowSize),
  `key` / `scale` (informational only — V2), `mix` (0..1).
- **Quality**: Useful as a "manual pitch correct" / "key transposer" —
  NOT chromatic auto-tune.
- **Limitations**: NO real-time pitch detection. Cannot snap to nearest
  scale note. Recommend renaming UI label to "Manual Pitch Correct" or
  hide from picker until V2 worklet-based YIN implementation lands.
- **Recommend**: ship with disclaimer OR hide-for-v2 (user choice).

## 4. FrequencyShifter (ph_) — ACCEPTABLE
- **Files**: `src/front/js/component/audio/plugins/plugins/FrequencyShifterPlugin.js`
- **Algorithm**: TRUE single-sideband (SSB) using Hilbert-transform pair.
  Two parallel branches of 4 cascaded 2nd-order all-pass IIR sections
  (Olli Niemitalo polyphase coefficients, ~0.05 dB ripple); branch B has
  a one-sample delay for group-delay alignment. Output:
  `y = I·cos(ωt) - Q·sin(ωt)` (positive shift) or
  `y = I·cos(ωt) + Q·sin(ωt)` (negative). Carriers built via
  `createPeriodicWave` for exact 90° phase lock.
- **Params**: `shift` (-5000..5000 Hz), `mix` (0..1).
- **Quality**: Classic Bode shifter — clean tonality up to ±2 kHz, mild
  aliasing past ±5 kHz, residual upper-sideband leakage <50 Hz.
- **Limitations**: lfoRate / lfoDepth are no-op (V2 — needs second LFO
  on cos/sin frequency).

## 5. PitchForge (SPX) — ACCEPTABLE
- **Files**: `src/front/js/pages/RecordingStudio.js` (install("pitchForge"))
- **Algorithm**: Tone.PitchShift + decorative formant peaking biquad +
  dry/wet mix. Replaces the old allpass-color approximation (which did
  not actually pitch-shift).
- **Params**: `pitch` (-24..24 st), `windowSize` (0.03..0.5 s), `formant`
  (-50..50 → peaking centre), `formantGain` (-12..12 dB), `mix` (0..1).
- **Quality**: Same as PitchShifter; formant filter is decorative not
  scaling.
- **Limitations**: True formant scaling needs phase vocoder (V2).

## 6. PitchLock (SPX) — APPROXIMATE
- **Files**: `src/front/js/pages/RecordingStudio.js` (install("pitchLock"))
- **Algorithm**: Manual fixed-transpose via Tone.PitchShift + narrow
  peaking filter at `lockFreq` to emphasise the locked band.
- **Params**: `target` (-24..24 st), `lockFreq` (20..20k Hz), `strength`
  (0..1 → biquad Q).
- **Quality**: Useful as a static-transpose-with-focus filter; NOT a
  real-time pitch-tracking lock.
- **Limitations**: True pitch-lock needs YIN/autocorrelation in a
  worklet.
- **Recommend**: ship with "manual transpose + EQ focus" labelling, OR
  hide-for-v2.

## 7. VoiceForge (SPX) — ACCEPTABLE
- **Files**: `src/front/js/pages/RecordingStudio.js` (install("voiceForge"))
- **Algorithm**: 4× parallel Tone.PitchShift voices (replacing the C2.4
  Haas-detune fake). Default shifts: 0, +7, +12, +4 semitones (unison +
  5th + octave + 3rd). Per-voice volume; voice-count gate; formant
  peaking biquad on wet bus; dry/wet mix.
- **Params**: `voices` (1..4), `v1Shift..v4Shift` (semitones, live!),
  `v1Vol..v4Vol` (0..1), `formant` (peaking centre), `mix` (0..1).
- **Quality**: Real harmony stacking — sounds significantly better than
  C2 detune-fake. Voice-stacking masks individual artifacts.
- **Limitations**: `key` / `scale` informational only (V2 needs pitch
  detection).

## 8. HarmonicSum (SPX) — CLEAN (no change from C2.4)
- **Files**: `src/front/js/pages/RecordingStudio.js` (install("harmonicSum"))
- **Algorithm**: Parameterized waveshaper with curve regenerated from
  drive / even2nd / odd3rd / odd5th / crosstalk. Built in C2.4; already
  production quality for harmonic exciting / saturation duties.
- **Quality**: CLEAN. The C2.4 implementation is genuinely a real
  harmonic generator (waveshaper-based, not a fake).
- **Limitations**: A "harmonic generator that tracks input pitch" (i.e.,
  generates a pure 2× / 3× / 5× sine of the fundamental) WOULD need
  pitch detection. The waveshaper approach generates harmonics of the
  ENTIRE signal (across all input frequencies) — different but valid
  effect. UI labelling already matches.
- **Recommend**: ship as-is. No C4 changes.

---

## C4 Summary
- CLEAN: 1 (HarmonicSum, unchanged from C2.4)
- ACCEPTABLE: 5 (PitchShifter, Harmonizer, FrequencyShifter, PitchForge, VoiceForge)
- APPROXIMATE: 2 (AutoTune manual-snap, PitchLock manual-transpose)
- HIDE-FOR-V2: 0 (all 8 ship — but 2 with strong disclaimers)
- Files touched (5):
  - `src/front/js/component/audio/plugins/plugins/PitchShifterPlugin.js` (rewrite)
  - `src/front/js/component/audio/plugins/plugins/HarmonizerPlugin.js` (rewrite)
  - `src/front/js/component/audio/plugins/plugins/AutoTunePlugin.js` (rewrite)
  - `src/front/js/component/audio/plugins/plugins/FrequencyShifterPlugin.js` (rewrite — SSB Hilbert)
  - `src/front/js/pages/RecordingStudio.js` (Tone import + 4 SPX factory rewrites: pitchForge, pitchLock, voiceForge, freqShifter)
- New worklets registered: NONE (all real-time work via native nodes + Tone.PitchShift + IIRFilterNode + Hilbert all-pass cascade)
- Recommend hiding from picker: NONE (user decides — but flag AutoTune
  and PitchLock as "manual mode" in UI copy, OR hide them and re-enable
  in V2 alongside YIN-based pitch detection worklet).
- Algorithm choices:
  - PitchShifter → Tone.PitchShift (Doppler delay-line)
  - Harmonizer → 4× Tone.PitchShift parallel voices
  - AutoTune → manual snap mode (Tone.PitchShift, no detection)
  - FrequencyShifter (ph_) → Hilbert SSB (Niemitalo 8-section polyphase)
  - PitchForge (SPX) → Tone.PitchShift + formant peaking
  - PitchLock (SPX) → Tone.PitchShift fixed transpose + peaking focus
  - VoiceForge (SPX) → 4× Tone.PitchShift voices replacing C2 detune fake
  - HarmonicSum (SPX) → unchanged (C2.4 waveshaper, already CLEAN)
- FrequencyShifter (SPX) was upgraded SAME way as ph_ (true SSB Hilbert)
  in addition to the 8 listed — same algorithm shared between the two
  surfaces.
