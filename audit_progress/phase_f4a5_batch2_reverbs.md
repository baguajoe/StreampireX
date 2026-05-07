# Phase F4-A.5 Batch 2 Reverbs

Implements 5 differentiated reverb DSP changes in `buildFxChain` of
`src/front/js/pages/RecordingStudio.js`:

- `chamber` — NEW. Mid-decay convolver + diffusion modulation.
- `gateVerb` — REBUILD. Gate-before-convolver topology so reverb input is silenced
   when the source dips below threshold (was: gate-after-convolver, never engaged).
- `shimmer` — NEW. Hall convolver + pitch-shifted feedback ("poor man's shimmer"
   via delay-loop grain re-trigger).
- `vintageAir` — UPGRADE. Plate-conv + tape saturation + wow/flutter modulated
   short delay (was: plate-conv + 8 kHz +3 dB shelf only).
- `infiniteReverb` — UPGRADE. Verify all 5 PLUGIN_DEFAULTS keys wired in setParam.

Wet-only insert pattern matches Batch 1.

## gateVerb — DONE
- File: src/front/js/pages/RecordingStudio.js:3249-3300 (REBUILD in place)
- Engine: dry-side gate BEFORE convolver. Topology:
  ```
  in → preDelay → DynamicsCompressor(ratio=20, knee=0, attack=1ms,
       release=gateDecay/1000) → Convolver(IR ~0.4 s) → damping LP → wetGain
  ```
- Why this works: the old factory put the gate AFTER the convolver, so the
  gate's detector input was the wet signal — the convolver tail kept the wet
  level above threshold even after the source went silent, so the gate could
  never close. By placing the compressor on the convolver's INPUT (the dry
  source), silent input means silent reverb input means the existing tail
  decays naturally and no new wet energy is added. This is the "honest
  fallback" path the spec called acceptable.
- Knobs wired: decay, preDelay, gateThresh (dB), gateDecay (ms → s release),
  damping, mix.
- Notes:
  - `gate.knee.value = 0` for near-brickwall gating above threshold.
  - Defaults from PLUGIN_DEFAULTS: gateThresh=0 (full open), gateDecay=0
    (instant release). I clamp gateThresh to [-100, 0] dB and gateDecay to
    [1, 1000] ms with `safe(v, fallback, min, max)`. With factory defaults
    (gateThresh=0, gateDecay=0 → clamped to 1 ms) the gate fully opens at
    any positive signal and slams shut instantly when the source goes silent
    — useful starting point for "plate-with-gate" tracking.
  - Honors REVERB_BASE_DEFAULTS keys (preDelay/decay/diffusion/damping/etc.);
    diffusion/earlyLevel/lateLevel/hpf/lpf are not yet wired (no-op extras
    that future polish can add — outer if-wrapper still triggers install).
- Build status (last check): clean (9 size warnings, no errors).

## vintageAir — DONE
- File: src/front/js/pages/RecordingStudio.js:3336-3399 (UPGRADE in place)
- File: src/front/js/component/SPXPlugins.js:1914 (PLUGIN_DEFAULTS updated)
- Engine: plate-conv → tape-saturation WaveShaper (tanh curve, bias-controlled
  density k=1..3) → wow-modulated short delay (0.3 Hz LFO, up to 1.6 ms swing) →
  flutter-modulated short delay (7 Hz LFO, up to 0.7 ms swing) → 8 kHz +3 dB
  highshelf "air" → wet gain.
- PLUGIN_DEFAULTS update:
  ```
  vintageAir: { ...REVERB_BASE_DEFAULTS, decay: 1.8, tapeWow: 0.3, flutter: 0.2, bias: 0.5 }
  ```
  (replaced unused `density: 0`)
- Knobs wired: decay, air (preserved), tapeWow, flutter, bias, mix.
  - tapeWow knob → 0.3 Hz LFO depth on a 2 ms base delay (sine on delay.delayTime).
  - flutter knob → 7 Hz LFO depth on a 1.5 ms base delay.
  - bias knob → reshapes tanh curve drive (k = 1 + bias*2, 1..3).
- Notes:
  - All param changes use setTargetAtTime (TAU = 0.01) on AudioParams.
  - Bias change rebuilds the WaveShaper curve in place (4096 samples, cheap).
  - LFOs auto-start; stopped + disposed in dispose().
  - Existing `air` knob (highshelf gain dB) kept working for back-compat.
- Build status (last check): clean (9 size warnings, no errors).

## infiniteReverb — DONE (refined)
- File: src/front/js/pages/RecordingStudio.js:3799-3859 (UPGRADE in place)
- Engine: convolver + feedback delay loop (1.5 s) + damping LP + shimmer
  highshelf (cheap fake — true pitch-up moved to dedicated `shimmer` factory).
- Refinement: TRUE freeze mode now disables input feed AND drives feedback to
  unity (1.0), so the tail loops indefinitely with zero new input. Old factory
  only bumped feedback to 0.99 — input audio kept feeding and decay still
  occurred over time. New `inFeed` gain node sits between conv and wetSum:
  freeze=true → inFeed=0, fbGain=1.0; freeze=false → inFeed=1, fbGain=0.6.
- All 5 PLUGIN_DEFAULTS keys verified wired in setParam:
  - `freeze` (bool) — toggles inFeed + fbGain together (single switch
    flips both ramps)
  - `roomSize` (0..1) — IR length scaling (0.5..6 s)
  - `damping` (0..1) — feedback LP cutoff (16k bright .. 1k dark)
  - `mix` (0..1) — output mix gain (use of `setMix` not `setReverbMix` here
    is intentional — this is mix-internal, not a wet-only insert)
  - `shimmer` (0..1) — feedback path highshelf gain (0..+12 dB)
- Build status (last check): clean (9 size warnings, no errors).

## Build status (final)
- `npx webpack --config webpack.prod.js`:
  `webpack 5.99.9 compiled with 9 warnings in 201420 ms`
- 9 warnings = file size warnings only (asset size limits + service-worker
  precache size). No code errors. Matches the expected post-Batch-1 build
  signature.

## chamber — DONE
- File: src/front/js/pages/RecordingStudio.js:3739-3786 (NEW factory after Batch 1 room)
- Engine: in → preDelay (12 ms) → AP1 (allpass @ 600 Hz, LFO ±80 Hz @ 0.7 Hz)
  → AP2 (allpass @ 1700 Hz, LFO ±220 Hz @ 0.4 Hz) → conv (decay-length IR) →
  dampingLP → color tilt (peaking @ 1.5 kHz, ±6 dB) → wet gain.
- Why this satisfies "chamber" character: spec called for "mid-decay convolver
  with modulated allpass for diffusion". The two slow LFOs on the allpass
  chirped center frequencies provide the slowly-evolving smear that
  chamber-style reverbs (smaller than hall, larger than room, with reflective
  but not metallic walls) need to keep from sounding static.
- Knobs wired (PLUGIN_DEFAULTS keys): decay (IR), damping (post-conv LP),
  color (peaking @ 1.5 kHz tilt), mix.
- Notes:
  - LFOs auto-start; stopped + disposed in dispose().
  - getReverbBuf rebuild on decay change → audible click acceptable
    (mirrors Batch 1 / legacy reverbs).
  - color knob 0..1 → -6..+6 dB peaking gain at 1.5 kHz: 0 = warm/wood,
    1 = bright/marble, 0.5 = neutral.
- Build status (last check): clean (9 size warnings, no errors).

## shimmer — DONE
- File: src/front/js/pages/RecordingStudio.js:3805-3860 (NEW factory)
- Engine: hall convolver + shimmer-loop feedback. Topology:
  ```
  in → preDelay (20 ms) → conv (decay-length IR) → dampingLP → wetGain → out
                                      └→ delayHi (12..24 ms) →
                                          shimmerHS (highshelf @ 4 kHz) →
                                          shimmerFb (feedback gain) →
                                          shimmerInput → conv  (re-inject)
  ```
- APPROACH (HONEST FALLBACK, documented per spec):
  - There is no inline Web Audio pitch-shift primitive cheap enough for a
    setParam-style live insert (true pitch-shift would need PCM grain
    re-trigger via AudioWorklet — Phase C4 territory).
  - Spec called this an acceptable fallback: short-delay feedback loop
    (12..24 ms) with a high-shelf accent that gives the bright "octave-up"
    perceptual character without re-pitching. The metallic shimmer halo
    comes from the comb-filtering of the very-short delay tap re-injected
    into the convolver input.
- Knobs wired (PLUGIN_DEFAULTS keys): decay (IR), shimmer (loop feedback,
  0..0.85), octave (0/1/2 → time + HS-gain table), damping (post-conv LP),
  mix.
- Notes:
  - octave knob: 0 → 24 ms / +3 dB shelf, 1 → 18 ms / +9 dB, 2 → 12 ms /
    +15 dB. Higher octave = shorter loop = brighter halo, with progressively
    more high-shelf bias. Approximation that scales perceptual brightness
    with the shimmer "octaves up" without true re-pitch.
  - Feedback caps at 0.85 (safe stability ceiling for the inner loop —
    keeps the conv-feedback path from runaway when shimmer=1).
- Build status (last check): clean (9 size warnings, no errors).
