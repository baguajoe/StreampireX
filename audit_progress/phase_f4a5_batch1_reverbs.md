# Phase F4-A.5 Batch 1 Reverbs

Implements 4 differentiated reverb DSP factories in `buildFxChain` of
`src/front/js/pages/RecordingStudio.js`. Targets:

- `hall` — Schroeder FDN (Web Audio: 6 parallel combs + 2 serial allpass)
- `plate` — Simplified Dattorro tank (4 serial allpass diffusers + 2 cross-fed delay lines)
- `spring` — Spring tank (3 parallel comb springs + cascaded allpass + LFO-modulated delay for boing)
- `room` — Short-decay convolver (synthesized IR with `(1 - i/len)^4` envelope)

All factories use the wet-only insert pattern that matches existing SPX reverb factories
(hallForgeS, plateForge, springBox): `mix=0` mutes this insert; user dials `mix` up to taste.
Default mix=0 in factory init means the FX path is silent until the user opens the plugin
window and sets a wet level (consistent with sibling factories).

## hall — DONE
- File: src/front/js/pages/RecordingStudio.js:3347-3425
- Engine: Schroeder-style FDN — 6 parallel comb filters (delay + lowpass + feedback)
  summed into 2 serial allpass diffusers + post-bank HF damping LP + wet gain.
- PLUGIN_DEFAULTS keys wired: decay, preDelay, damping, hfDamping, width, mix
- Notes:
  - Uses Web Audio nodes (DelayNode/BiquadFilter/Gain) — true network, not pre-rendered IR.
    No click on decay/damping changes (smooth setTargetAtTime ramps).
  - Decay → comb feedback gain via `Math.exp(-3*ln10*delay/decay)` (RT60 mapping).
  - Damping → comb LP cutoff (800 Hz at damping=1, 18 kHz at damping=0).
  - hfDamping → second post-bank LP (independent control of late-tail darkness).
  - Width → small stereo spread on comb delay times (0..1.5 multiplier on 2.3 ms base).
  - Stereo: nodes are stereo-by-default in Web Audio, so the bank produces stereo output
    even though we use one Delay per comb (vs. doubling to per-channel).

## plate — DONE
- File: src/front/js/pages/RecordingStudio.js:3427-3498
- Engine: Simplified Dattorro tank — 4 serial allpass diffusers (prime-time spaced via
  freq = 1/period) → 2 cross-fed delay lines (the "tank") with damping LP per line +
  brightness peaking EQ at 3 kHz + wet gain.
- PLUGIN_DEFAULTS keys wired: decay, preDelay, diffusion, damping, brightness, mix
- Notes:
  - SIMPLIFICATION: full Dattorro figure-of-eight has bigger diffusers + secondary
    modulated allpass + tank tap-out network. We use 4 serial biquad allpass + 2 cross-fed
    delay lines + shared damping LP. Preserves the dense metallic plate character while
    keeping node count reasonable (15 nodes vs ~30+ for the full).
  - AP_TIMES use prime sample counts (149/211/263/311 at 48kHz reference) → frequency
    biquad allpass approximation (`freq = 1/period`) with Q tied to diffusion (0.5..5.5).
  - Tank delays 83.2 ms / 118.7 ms cross-fed (LP_A → fb_A → dB; LP_B → fb_B → dA).
    Cross-fed gain = `exp(-3*ln10*avg_tank_delay/decay)` for RT60-tracking.
  - Damping → tank-LP cutoff (800 Hz..12 kHz).
  - Brightness 0..1 → -6..+6 dB peaking at 3 kHz (matches plateForge legacy style).

## spring — DONE
- File: src/front/js/pages/RecordingStudio.js:3500-3572
- Engine: Spring tank — 3 parallel comb-springs (delay + LP + feedback, base 30/34/38 ms),
  gated by per-comb wet gain so springs knob (1..3) controls active count → cascaded
  4-stage allpass chain (600/1100/1700/2400 Hz, Q=4) → LFO-modulated short delay
  (1.6 Hz LFO, depth ∝ boing) → tilt EQ (low/high shelf) → wet gain.
- PLUGIN_DEFAULTS keys wired: decay, springs, tone, boing, mix
- Notes:
  - The "boing": LFO at 1.6 Hz on a 12 ms base delay, with mod depth = `boing × 8 ms` swing.
    Combined with the cascaded resonant allpass chain, this produces the metallic
    twang/dispersion characteristic of physical spring tanks.
  - springs (1..3) gates each comb via setTargetAtTime on a per-comb output gain.
    1 spring = small tank (30 ms only), 2 = medium, 3 = full tank.
  - tone is tilt EQ: (tone-0.5)×-10 dB low shelf + (tone-0.5)×+10 dB high shelf at
    400 Hz / 4 kHz centers. tone=0 → dark, 0.5 → neutral, 1 → bright.
  - Decay → comb feedback gain (RT60 mapping per spring time).

## room — DONE
- File: src/front/js/pages/RecordingStudio.js:3574-3611
- Engine: Short-decay convolver with locally synthesized IR + post-conv damping LP +
  brightness highshelf + wet gain.
- PLUGIN_DEFAULTS keys wired: size, damping, brightness, mix
- Notes:
  - IR generation: `noise × (1 - i/len)^4` envelope at the short end — short-room curve
    that decays fast and naturally (vs. the longer-tail `pow(1-i/len, decay)` of
    `getReverbBuf`). Length = `size × sampleRate` seconds. size=0.45 → 450 ms IR.
  - Stereo decorrelation: every 7th sample inverted on R channel.
  - size knob change rebuilds IR (audible click acceptable, mirrors existing reverbs).
  - damping 0..1 → 8 kHz..800 Hz post-conv lowpass cutoff.
  - brightness 0..1 → -6..+6 dB highshelf at 6 kHz.

## Build status
- npx webpack --config webpack.prod.js: clean
- Output: `webpack 5.99.9 compiled with 9 warnings in 187447 ms` (size warnings only, no errors)
- All 4 install("hall"|"plate"|"spring"|"room", ...) blocks added immediately after the
  existing `install("springBox", ...)` block (line 3331), preserving the legacy reverb
  factories untouched. New block ranges:
  - hall:   3347-3425
  - plate:  3427-3498
  - spring: 3500-3572
  - room:   3574-3611
