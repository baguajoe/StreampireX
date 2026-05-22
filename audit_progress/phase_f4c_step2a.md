# Phase F4-C — Step 2a: Easy compressors (4 UIs, .reduction-based)

## Summary

All 4 UIs now read **live** GR via the native `DynamicsCompressorNode.reduction` property. Each install factory exposes its compressor node via `meters: { comp }`. UIs use `useGRMeter` against `getInstance()?.meters?.comp`.

| UI | Synthetic value removed | Live source | targetDb |
|---|---|---|---|
| CompressorUI | `(fakeDrive=-10) - threshold / ratio` | `comp.reduction` | 12 (default) |
| FETStrikeUI2 | `fakeProgramRMS - threshold / effectiveRatio` | `comp.reduction` | 15 (1176 ceiling) |
| OptoPressUI2 | `peakReduction / 100` | `comp.reduction` | 12 (LA-2A ceiling) |
| GlueBusUI2 | `fakeProgramRMS - threshold / ratio` | `comp.reduction` | 12 |

## Changes per file

### `src/front/js/pages/RecordingStudio.js`
4 install factories now attach `meters: { comp }` to their returned PluginInstance:
- `compressor` (line ~1683): native DynComp
- `glueBus` (line ~2497): SSL G-Bus internal `c`
- `fetStrike` (line ~2557): 1176 internal `c` (knee=2)
- `optoPress` (line ~2651): LA-2A internal `c` with program-dependent release tracker

No DSP changes — meters field is purely informational. `dispose()` already covers the comp node via `disposeNodes(c, ...)`.

### Plugin UIs (4 files)

**CompressorUI.js**:
- Added `import useGRMeter`
- Added `getInstance` prop
- Removed 8-line synthetic GR computation
- `grNorm = useGRMeter(() => getInstance && getInstance()?.meters?.comp)`

**FETStrikeUI2.js**:
- Added `import useGRMeter`
- Added `getInstance` prop
- Removed 6-line synthetic VU computation
- `vuValue = useGRMeter(..., { targetDb: 15 })`

**OptoPressUI2.js**:
- Added `import useGRMeter`
- Added `getInstance` prop
- Removed `vuValue = peakReduction / 100`
- `vuValue = useGRMeter(..., { targetDb: 12 })`

**GlueBusUI2.js**:
- Added `import useGRMeter`
- Added `getInstance` prop
- Removed 4-line synthetic computation
- `grNorm = useGRMeter(..., { targetDb: 12 })`
- `grDB = grNorm * 12` (preserves the existing dB readout next to the meter — now reflects live reduction)

## Build

`webpack 5.99.9 compiled with 9 warnings in 180810 ms` — 0 errors. No bundle regression.

## What to expect (smoke test deferred to end of Step 2c)

With audio playing through any of these compressors:
- Crank the threshold down → meter should show GR climbing (more reduction = needle/LEDs deeper)
- Pull threshold up to 0 → meter should snap to 0 (no compression)
- Raise the ratio with audio above threshold → more GR = deeper needle
- All 4 meters should track input dynamics (transients spike, sustained sections steady)

## Status

Step 2a complete. Moving to Step 2b (medium meters: TubeCompUI, WarmPressUI2, VintageAirUI2, GateVerbUI2).
