# Phase C3 — ScriptProcessor → AudioWorklet migration

Branch: claude/fix-recording-studio  
Date: 2026-05-06

Worklet loading approach: **B (per-factory lazy load)** — each factory caches a
load promise on `context._spxWorkletPromises` (Map keyed by worklet name). The
factory returns synchronously with a passthrough Gain wiring; once the worklet
module loads, the factory swaps in an `AudioWorkletNode` between the input and
output Gains. Pending parameter writes and port commands are buffered and
flushed on swap. If `addModule()` rejects, the plugin stays in passthrough mode
and a console warning is emitted (no audio regression).

---

## GranularFreezePlugin — MIGRATED
- File: `src/front/js/component/audio/plugins/plugins/GranularFreezePlugin.js`
- Worklet name: `spx-granular-freeze`
- AudioParams: `grainSize, density, pitch, spread, mix, freeze`
- Replaced ScriptProcessorNode (4096-sample buffer) with sample-accurate
  AudioWorkletProcessor. Granular scheduling (Hann-windowed grains, linear
  interpolation playback at pitched rate, density-gated triggers) preserved.
  `freeze` AudioParam now stops capture in the worklet itself, removing the
  legacy density==1 hack while still honoring the legacy code path.

## LooperPlugin — MIGRATED
- File: `src/front/js/component/audio/plugins/plugins/LooperPlugin.js`
- Worklet name: `spx-looper`
- AudioParams: `mix, speed, feedback`
- Port commands: `record, stopRecord, play, stop, overdub, clear`
- Replaced ScriptProcessorNode (1024-sample buffer pushing into a JS array)
  with a 30s pre-allocated Float32Array inside the worklet. Adds:
  - Variable-speed playback with linear interpolation (was fixed at 1.0×).
  - Overdub mode with feedback-controlled tape-style decay.
  - Clear command.
  Pending port commands buffered until worklet ready.

## SampleRateReducerPlugin — MIGRATED
- File: `src/front/js/component/audio/plugins/plugins/SampleRateReducerPlugin.js`
- Worklet name: `spx-sample-rate-reducer`
- AudioParams: `reduction, bits`
- Replaced ScriptProcessorNode (512-sample buffer, mono only) with
  multichannel sample-and-hold worklet. Adds optional bit-depth quantization
  (`bits` param, default 16 = effectively bypass).

## AICompressorPlugin — KEPT_AS_IS
- File: `src/front/js/component/audio/plugins/plugins/AICompressorPlugin.js`
- Reason: Implementation uses the native `DynamicsCompressor` + makeup `Gain`,
  with style presets remapping knee. No true-peak / oversampling requirement
  flagged in the audit — the native compressor already runs at sample rate
  inside the audio thread. Worklet migration would require a custom
  feed-forward compressor implementation with no clear quality win.

## DynamicEQPlugin — KEPT_AS_IS
- File: `src/front/js/component/audio/plugins/plugins/DynamicEQPlugin.js`
- Reason: Uses native `BiquadFilter` (sample-rate processing) plus an
  `AnalyserNode` polled by `setInterval` at 20 Hz to ride the filter gain.
  Polling is intentionally low-rate so dynamic gain rides smoothly without
  zipper artifacts; sample-accurate detection isn't necessary for a single-
  band program-dependent EQ. A full worklet replacement would touch a 1000-
  line shared file (24 other plugin factories) for marginal quality gain.
  TODO marker not added — current behavior matches design intent.

## StepFilterPlugin — KEPT_AS_IS
- File: `src/front/js/component/audio/plugins/plugins/StepFilterPlugin.js`
- Reason: Bandpass `BiquadFilter` whose center frequency is stepped by a
  setInterval timer aligned to BPM. The audible behavior is intentionally
  quantized to step boundaries (musical, not sample-accurate), so a worklet
  migration would not improve quality. Skipped.

## SPXPerceptualEQPlugin — KEPT_AS_IS
- File: `src/front/js/component/audio/plugins/plugins/SPXPerceptualEQPlugin.js`
- Reason: 16-band Bark-scale `BiquadFilter` chain with a slow psychoacoustic
  gain rider driven by `AnalyserNode` + `requestAnimationFrame`. The 60 Hz
  RAF cadence is the intended slew rate for "Gullfoss-style" micro
  corrections — running it sample-accurate would create zipper noise without
  changing the perceptual character. Static EQ topology already runs at
  sample rate via native biquads. Skipped.

---

## C3 Summary
- Migrated: 3/7 (GranularFreeze, Looper, SampleRateReducer)
- Kept-as-is (no migration needed): 4 — AICompressor (native DynamicsCompressor sufficient), DynamicEQ (intentional 20Hz gain-ride cadence), StepFilter (musical step quantization), SPXPerceptualEQ (intentional slow psychoacoustic slew)
- Skipped (Phase C5+): 0
- Files touched:
  - `GranularFreezePlugin.js` (full rewrite)
  - `LooperPlugin.js` (full rewrite)
  - `SampleRateReducerPlugin.js` (full rewrite)
- Worklet loading approach: B (per-factory lazy load with passthrough fallback)
- Build: pending (orchestrator runs final build)
