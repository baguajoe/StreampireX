# Phase C2 Batch 4 — DSP Rebuilds

Plugins targeted: transientShaper, infiniteReverb, harmonicSum, voiceForge, masterWall.
Branch: claude/fix-recording-studio (no commit/push).

## Plan summary
- transientShaper: dual-DynamicsCompressor (fast vs slow) + main fast comp gain ride.
- infiniteReverb: ConvolverNode + DelayNode feedback loop with `freeze` toggle and shimmer high-shelf.
- harmonicSum: Parameterized WaveShaper curve regenerated on drive/even2nd/odd3rd/odd5th/crosstalk.
- voiceForge: 4 parallel detuned DelayNodes with LFO modulation (Haas chorus-fake of harmony).
- masterWall: 5 ms DelayNode lookahead → DynamicsCompressor (ratio 20) → output gain.

## Per-plugin progress

### masterWall — DONE
- Files: src/front/js/pages/RecordingStudio.js (1 edit).
- DelayNode (lookahead, 0..10 ms) → DynamicsCompressor (ratio 20, knee 0, attack 1 ms, release ramps with knob, threshold = ceiling) → outputGain.
- Phase C5 placeholders (no-op cases): `truePeak` (needs lookahead-worklet for inter-sample peak), `dither` (needs noise-shaping worklet), `clipMargin` (decorative — no separate node).
- Real ramps: ceiling, threshold, lookahead, release, outputGain, gain.

### transientShaper — DONE (parallel-blend honest fake)
- Files: src/front/js/pages/RecordingStudio.js (1 edit).
- Two parallel DynamicsCompressors (fast 1..6 ms attack / 20..70 ms release; slow 20..70 ms attack / 200..600 ms release) blended through per-branch gains driven by attack/sustain knobs (-1..+1 → ±6 dB). speed knob rescales both comps' attack/release.
- Honest-fake limitation flagged inline: without an audio worklet the two envelope outputs cannot be subtracted, so this is parallel-blend rather than true difference shaping. Phase C5 candidate for true env-follower difference.
- Real ramps: attack, sustain, speed, outputGain.

### infiniteReverb — DONE
- Files: src/front/js/pages/RecordingStudio.js (1 edit).
- ConvolverNode (IR length 0.5..6 s, scales with roomSize) → wetSum → DelayNode 1.5 s feedback loop → damping LP (1k..16k inverse of damping knob) → shimmer high-shelf (+0..12 dB) → fbGain (0.6 default, 0.99 when freeze=true) → wetSum. wetSum → mix gain → out.
- Phase C4 placeholder: shimmer is a high-shelf-only fake; true shimmer would need a Phase C4 pitch shifter feeding the feedback path.
- Real ramps: mix, freeze, damping, shimmer, roomSize.

### voiceForge — DONE (Haas-style honest fake)
- Files: src/front/js/pages/RecordingStudio.js (1 edit).
- 4 parallel DelayNodes (7/13/21/29 ms) modulated by independent slow OscillatorNodes (0.13..0.27 Hz) with ±1.5..2.2 ms depth. Per-voice gains driven by v1Vol..v4Vol; voices knob (1..4) gates voices beyond the active count to zero. Wet bus feeds a peaking biquad (formant centre) → dry/wet crossfade → out.
- Phase C4 placeholders (no-op cases): `key`, `scale`, `v1Shift`/`v2Shift`/`v3Shift`/`v4Shift` — all need a true pitch shifter (granular/PSOLA worklet) to function. `formant` is decorative (shifts the wet-bus peaking filter centre instead of true formant scaling).
- Real ramps: voices (gating), v1Vol..v4Vol, mix, formant (decorative), legacy `amount`/`air`.

### harmonicSum — DONE
- Files: src/front/js/pages/RecordingStudio.js (1 edit).
- WaveShaper (2× oversample) with curve dynamically regenerated on drive/even2nd/odd3rd/odd5th/crosstalk knob changes; downstream highpass (30 Hz) avoids low-end mud and outputGain (linear from dB) trims output.
- Curve formula: `c[i] = x + drive * (even2nd*sin(2πx) + odd3rd*sin(3πx) + odd5th*sin(5πx)) + crosstalk * x * |x|` (asymmetry adds even-order tube crosstalk).
- Phase C5 placeholder: `noiseFloor` (no-op — true noise-floor handling needs a sidechained gate / noise generator).
- Real ramps: drive, even2nd, odd3rd, odd5th, crosstalk, outputGain.

## C2.4 Summary
- Fixed: 5/5
- Partial: 0
- Phase C4/C5 placeholders accepted: 12 — masterWall (`truePeak`, `dither`, `clipMargin`); voiceForge (`key`, `scale`, `v1Shift`, `v2Shift`, `v3Shift`, `v4Shift`, `formant` decorative); harmonicSum (`noiseFloor`); infiniteReverb (shimmer high-shelf-only fake — pitch-up shimmer is Phase C4); transientShaper (parallel-blend instead of envelope-difference — true diff is Phase C5).
- Files touched: src/front/js/pages/RecordingStudio.js (5 edits).
