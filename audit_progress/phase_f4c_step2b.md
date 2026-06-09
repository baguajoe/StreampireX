# Phase F4-C — Step 2b: Medium meters (4 UIs)

## Summary

| UI | Meter(s) | Live source(s) |
|---|---|---|
| TubeCompUI | Input VU + GR VU | `meters.analyserIn` (RMS) + `meters.comp` (.reduction, targetDb=12) |
| WarmPressUI2 | GR LEDLadder + SAT LEDLadder | `meters.comp` (.reduction) + `meters.analyserOut` (post-makeup RMS) |
| VintageAirUI2 | Output VU | `meters.analyserOut` (post-mix-gain RMS) |
| GateVerbUI2 | Threshold LEDLadder | `meters.analyserIn` (input RMS, read against threshold knob) |

## Factory changes (`src/front/js/pages/RecordingStudio.js`)

**warmPress** (line ~2417):
- Added `satAn` analyser, fftSize 256, smoothingTimeConstant 0.85
- Tap: `mk.connect(satAn)` (post-makeup, on the wet path — reflects how hard the saturation is being driven)
- Exposed `meters: { comp: c, analyserOut: satAn }`
- `dispose()` extended to disconnect satAn

**tubeComp** (line ~2762):
- Added `inGain` (passthrough Gain) BEFORE `c` so we can tap a true pre-comp signal (previously `inputNode: c` directly)
- Added `inAn` analyser, tapped from `inGain`
- Topology: `inGain → c → ws → warmth → mk` (was `c → ws → ...`)
- Returned `inputNode: inGain` (was `inputNode: c`)
- Exposed `meters: { comp: c, analyserIn: inAn }`

**gateVerb** (line ~3829):
- Added `inAn` analyser
- Tap: `pre.connect(inAn)` (pre-gate input level)
- Exposed `meters: { analyserIn: inAn }`
- `dispose()` extended

**vintageAir** (line ~3892):
- Added `outAn` analyser
- Tap: `g.connect(outAn)` (post-mix-gain output level)
- Exposed `meters: { analyserOut: outAn }`
- `dispose()` extended

## UI changes

**TubeCompUI.js**:
- Imported `useGRMeter` + `useAnalyserValue`
- Added `getInstance` prop
- Replaced `inputLevel = (s.threshold + 30) / 30` → `useAnalyserValue(meters.analyserIn)`
- Replaced `grTarget = (-threshold/30) * (ratio/10) + drive*0.2` → `useGRMeter(meters.comp, {targetDb:12})`

**WarmPressUI2.js**:
- Imported both hooks, added `getInstance` prop
- Replaced GR synthetic with `useGRMeter(meters.comp, {targetDb:12})`
- Replaced SAT (modelSat + makeup/24) with `useAnalyserValue(meters.analyserOut)`

**VintageAirUI2.js**:
- Imported `useAnalyserValue`, added `getInstance` prop
- Replaced `vu = mix*0.6 + lateLevel*0.4` with `useAnalyserValue(meters.analyserOut)`

**GateVerbUI2.js**:
- Imported `useAnalyserValue`, added `getInstance` prop
- Replaced `threshNorm = (gateThresh+80)/80` with `useAnalyserValue(meters.analyserIn)`
- Now the LED ladder shows live input level — user can visually compare to the threshold knob to anticipate gate trigger

## Topology safety

All analysers are sinks (their output is unused). Connecting `g.connect(outAn)` does NOT alter audio flow — AnalyserNode does not pass through. The wet path continues to drive the master via `g`'s existing connection in `buildPlaybackSources`.

The only audio-graph topology change is `tubeComp`: a single Gain node was inserted before the existing compressor. Gain default is unity (1.0) so it's a true passthrough. No level or character change.

## Build

`webpack 5.99.9 compiled with 9 warnings in 179190 ms` — 0 errors. No bundle regression.

## Status

Step 2b complete. Moving to Step 2c (4 hard meters: VocalCompUI sibilance, MultiPressUI2 4-band, ParallelCrushUI2 dry/wet, ShimmerReverbUI particles).
