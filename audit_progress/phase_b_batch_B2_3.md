# Phase B Batch 2.3 — ph_* Param Reconciliation (D–H)

Scope: 10 plugins. Reconciled registry param names with factory `setParam`.

---

## DrumBus (`drum_bus`)
- Status: Fixed
- Files: `src/front/js/component/audio/plugins/plugins/DrumBusPlugin.js`
- Fixes:
  - Mapped registry params `punch` (dB), `compress` (0..1), `transient` (0..1), `mix` (%) to underlying compressor + emphasis gain.
  - `compress` now drives threshold(-30..-5 dB) and ratio(2..10).
  - `transient` controls comp attack/release (1..20 ms / 50..200 ms).
  - `punch` is dB pre-comp emphasis through dedicated transient gain (was previously orphan node).
  - Added wet/dry mix path.
  - Added `destroy()` for proper cleanup.

## DynamicEQ (`dynamic_e_q`)
- Status: Fixed
- Files: `src/front/js/component/audio/plugins/plugins/DynamicEQPlugin.js`
- Fixes:
  - Rebuilt as single-band dynamic peaking EQ matching registry params: `freq`, `gain`, `q`, `threshold`, `ratio`.
  - Detector setInterval (50 ms) drives dynamic gain offset around the static target gain.
  - Removed mismatched 3-band (lowFreq/midFreq/highFreq/lowGain/midGain/highGain/depth) topology.
  - Added `destroy()`.

## EnvelopeFilter (`envelope_filter`)
- Status: Fixed
- Files: `src/front/js/component/audio/plugins/plugins/EnvelopeFilterPlugin.js`
- Fixes:
  - Rebuilt with all 5 registry params: `attack` (ms), `release` (ms), `freq` (Hz), `depth` (0..1), `mix` (%).
  - Envelope follower uses attack/release time-constants instead of fixed coefficients.
  - Added wet/dry mix.
  - Added `destroy()`.

## FETComp (`f_e_t_comp`)
- Status: Fixed
- Files: `src/front/js/component/audio/plugins/plugins/FETCompPlugin.js`
- Fixes:
  - Added `inputGain`, `outputGain` (linear 0..4) cases with dedicated nodes.
  - Inline-clamped threshold/ratio/attack/release; ms→s conversion preserved.
  - Removed reliance on `makeup` param (registry doesn't have it).
  - Defaults realigned to registry (attack=0.5 ms, release=50 ms).
  - Added `destroy()`.

## FrequencyShifter (`frequency_shifter`)
- Status: Partial — engine remains a ring-mod approximation; param surface (`shift`, `mix`) now correctly wired and default no longer mutes audio.
- Files: `src/front/js/component/audio/plugins/plugins/FrequencyShifterPlugin.js`
- Fixes:
  - Both registry params (`shift`, `mix`) handled with clamping.
  - Dry path now floors at 0.5 to prevent default-mute when carrier=0 Hz.
  - Added `destroy()` and proper carrier teardown.
- Phase C candidate: replace ring-mod with true SSB (Hilbert) frequency shifter.

## GatedReverb (`gated_reverb`)
- Status: Fixed
- Files: `src/front/js/component/audio/plugins/plugins/GatedReverbPlugin.js`
- Fixes:
  - Added `decay`, `gateTime`, `preDelay` cases (was `mix` only).
  - `decay`/`gateTime` rebuild IR through debounced (60 ms) timer to avoid clicks.
  - `preDelay` ms→s on AudioParam.
  - Inline-clamped all values.
  - Added `destroy()` (clears IR rebuild timer).

## GranularFreeze (`granular_freeze`)
- Status: Partial — registry params now wired but engine is a single-grain ScriptProcessor approximation (still deprecated API).
- Files: `src/front/js/component/audio/plugins/plugins/GranularFreezePlugin.js`
- Fixes:
  - All 5 registry params handled: `grainSize` (ms), `density` (0.1..1), `pitch` (st), `spread` (0..1), `mix` (%).
  - Real grain windowing (Hann), pitch via resample, spread randomizes grain start in 3 s capture buffer.
  - Added wet/dry path.
  - Added `destroy()`.
- Phase C candidate: migrate from ScriptProcessor to AudioWorklet, multi-grain scheduler.

## GraphicEQ (`graphic_e_q`)
- Status: Fixed
- Files: `src/front/js/component/audio/plugins/plugins/GraphicEQPlugin.js`
- Fixes:
  - Replaced internal 10-band ISO array with 9-band (63..16 kHz) to match registry exactly.
  - Added id→index map handling registry's `b63..b16k` ids; legacy `bandN` still recognized.
  - Inline clamp -12..+12 dB.
  - Added `destroy()`.

## HaasEffect (`haas_effect`)
- Status: Fixed
- Files: `src/front/js/component/audio/plugins/plugins/HaasEffectPlugin.js`
- Fixes:
  - Added `width` (controls right-channel level on delayed path) and `mix` (wet/dry).
  - `delay` now clamped 0..40 ms, ms→s conversion fixed.
  - Added wet/dry mix path.
  - Added `destroy()`.
  - Default delay realigned to registry (15 ms, was 20 ms).

## HarmonicExciter (`harmonic_exciter`)
- Status: Fixed
- Files: `src/front/js/component/audio/plugins/plugins/HarmonicExciterPlugin.js`
- Fixes:
  - Rebuilt with 5 registry params: `freq`, `drive`, `even`, `odd`, `mix`.
  - Two parallel waveshapers (anti-symmetric for odd, abs-rectifier for even harmonics).
  - `drive` maps 0..1 → 0.5..4.5 pre-gain.
  - Added wet/dry mix.
  - Legacy `amount` param still respected.
  - Added `destroy()`.

---

## B2.3 Summary
- Fixed: 8/10
- Partial: 2 — FrequencyShifter (engine remains ring-mod), GranularFreeze (engine remains ScriptProcessor approximation)
- Skipped (Phase C): 0
- Registry params pruned: none (added cases instead)
- Factory cases added: ~30 across 10 files
- Files touched:
  - DrumBusPlugin.js (rewrite)
  - DynamicEQPlugin.js (rewrite of `createDynamicEQPlugin` only; sibling factories untouched)
  - EnvelopeFilterPlugin.js (rewrite)
  - FETCompPlugin.js (rewrite of `createFETCompPlugin` only; sibling factories untouched)
  - FrequencyShifterPlugin.js (rewrite)
  - GatedReverbPlugin.js (rewrite of `createGatedReverbPlugin` only; sibling factories untouched)
  - GranularFreezePlugin.js (rewrite)
  - GraphicEQPlugin.js (rewrite of `createGraphicEQPlugin` only; sibling factories untouched)
  - HaasEffectPlugin.js (rewrite)
  - HarmonicExciterPlugin.js (rewrite)
- Phase C candidates:
  - FrequencyShifter: replace with SSB Hilbert-transform frequency shifter
  - GranularFreeze: migrate to AudioWorklet, multi-grain scheduler
  - DynamicEQ: setInterval(50 ms) detector → AudioWorklet for click-free dynamics
  - GatedReverb: convolver IR rebuild on decay/gateTime change is debounced but still gritty; consider Schroeder/FDN with continuously variable decay
- Note: Registry id `dynamic_e_q` is mapped to PluginHost key `dynamic_eq` — confirmed working (PluginHost.js line 165). Same shim for `f_e_t_comp` → `fet_comp` and `graphic_e_q` → `graphic_eq` already in PLUGIN_FACTORIES.
