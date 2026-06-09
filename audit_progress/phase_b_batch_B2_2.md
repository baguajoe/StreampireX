# Phase B Batch B2.2 — ph_* P0 reconciliation (B–D)

Scope: 10 ph_* plugins. Goal: reconcile registry params with factory `setParam` switch.
Policy: prefer adding factory cases. Apply unit conversions. Inline-clamp + finite-guard.
Add `destroy()` where missing.

## 1. BreathGate (`breath_gate`) — FIXED
Files: `BreathGatePlugin.js`
Fix:
- Added `reduction` (dB; mapped to gate-closed floor = 10^(reduction/20)).
- Added `attack`/`release` (ms → s, /1000) feeding `setTargetAtTime` time-constant.
- Inline-clamped per registry ranges; finite-guarded.
- Added `destroy()` clearing interval and disconnecting nodes (was missing — fixed leak).

## 2. BrickwallLimiter (`brickwall_limiter`) — FIXED
Files: `BrickwallLimiterPlugin.js`
Fix:
- Added `lookahead` via DelayNode (ms→s, /1000) at front of chain.
- Added `release` mapping to `comp.release.value` (ms→s, /1000).
- Added `outputGain` (dB→linear via 10^(v/20)) on dedicated post-limiter gain node.
- Removed dead `makeup` orphan; added `destroy()`.

## 3. Cassette (`cassette`) — FIXED (rewrite)
Files: `CassettePlugin.js`
Fix:
- Param ids fully reconciled to registry: `drive`, `noise`, `hfLoss`, `mix`.
- Drive: pre-gain into tanh waveshaper (1x..5x).
- Noise: replaced sawtooth-pretending-to-be-hiss with white-noise BufferSource → bandpass → wet bus.
- hfLoss: maps 0..1 to 18 kHz..3 kHz LPF cutoff.
- mix: proper wet/dry split (was 100 % wet always).
- Added `destroy()` stopping noise source and disconnecting all nodes.

## 4. ChamberReverb (`chamber_reverb`) — FIXED
Files: `ChamberReverbPlugin.js`
Fix:
- Added `preDelay` via DelayNode in wet path (ms→s, /1000).
- Added `damping` lowpass filter in wet path.
- Added `decay` and `diffusion` with debounced IR rebuild (120 ms timeout coalesces rapid drag updates).
- Mix already worked.
- Added `destroy()` clearing rebuild timer and disconnecting nodes.

## 5. ChannelStrip (`channel_strip`) — FIXED (rewrite)
Files: `ChannelStripPlugin.js`
Fix:
- Schema fully reconciled: `inputGain`, `hpf`, `lpf`, `phase`, `outputGain`.
- Removed always-on EQ/compressor (was processing on insert silently).
- Phase implemented as gain sign flip (+1 / -1).
- HPF defaults to 20 Hz when registry value is 0 (transparent).
- Added `destroy()`.

## 6. Choir (`choir`) — FIXED (rewrite)
Files: `ChoirPlugin.js`
Fix:
- Replaced no-op `setParam: ()=>{}` with full handler.
- Added `spread` (delay-time spacing per voice) and `detune` (LFO depth in seconds derived from cents).
- Fixed double-mix bug: was dry-only `input.connect(output)` plus full wet — now proper wet/dry blend via `dryGain`/`wetGain`.
- `voices` count is structural; flagged as Phase C if live re-count needed (registry default applied at construction).
- Added `destroy()`.

## 7. Chorus (`chorus`) — FIXED
Files: `ChorusPlugin.js`
Fix:
- Added `rate`, `depth`, `feedback` cases (factory previously only handled `mix`).
- Added shared feedback gain node looped from wet sum back into each voice's delay.
- Fixed LFO leak: `disconnect()` now stops LFOs; `destroy()` added (was missing).

## 8. ConvolutionShaper (`convolution_shaper`) — FIXED
Files: `ConvolutionShaperPlugin.js`
Fix:
- Added `drive` (waveshaper pre-gain 1x..5x) and `tone` (LPF in wet path 200..8000 Hz).
- Mix already worked.
- Added `destroy()`.

## 9. DeEsser (`de_esser`) — FIXED
Files: `DeEsserPlugin.js`
Fix:
- Aliased `freq` (registry) to `frequency` (factory), kept `frequency` as legacy alias.
- Fixed broken topology: now uses +6 dB peaking pre-emphasis → comp → -6 dB peaking post-cut so comp is keyed on sibilants (was wideband comp).
- Added `ratio` (was named `reduction` only; both keys now accepted).
- Added `speed` mapping to comp attack/release time-constants.
- Already had `destroy()`.

## 10. DottedEighthDelay (`dotted_eighth_delay`) — FIXED
Files: `DottedEighthDelayPlugin.js`
Fix:
- Fixed feedback unit: registry is 0..95 (%) → factory now divides by 100 (was raw, causing 50 % UI = 95 % clamped = self-oscillation).
- Added `filter` (LPF in feedback path 200..20000 Hz) — wired `delay→filter→feedback→delay`.
- Added `destroy()`.

## B2.2 Summary
- Fixed: 10/10
- Partial: 0
- Skipped (Phase C): 0
- Registry params pruned: none (all reconcilable; `voices` on Choir flagged as Phase C if live re-count is desired but not pruned)
- Factory cases added: 26 (BreathGate +3, Brickwall +3, Cassette +4, Chamber +4, ChannelStrip +5, Choir +3, Chorus +3, ConvolutionShaper +2, DeEsser +3 add/alias, DottedEighth +1 + unit fix)
- Files touched: BreathGatePlugin.js, BrickwallLimiterPlugin.js, CassettePlugin.js, ChamberReverbPlugin.js, ChannelStripPlugin.js, ChoirPlugin.js, ChorusPlugin.js, ConvolutionShaperPlugin.js, DeEsserPlugin.js, DottedEighthDelayPlugin.js (10 factory files, 1 edit each)
