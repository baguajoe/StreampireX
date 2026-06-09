# Phase F4-C — Step 2.0: Hook scaffolding + SPXPluginHost prop refactor

## Files added

### `src/front/js/component/audio/HardwareUI/useAnalyserValue.js`
- `useAnalyserValue(source, opts={mode, scale})` → number 0..1
- `source`: AnalyserNode OR getter `() => AnalyserNode | null`
- Modes: "rms" (default) or "peak"
- `scale` default 6 (matches existing meterAnimation rAF convention in RecordingStudio.js)
- Ref-stabilized `source` — inline getters don't restart the rAF on parent re-renders
- rAF cleanup on unmount
- Bails to 0 when source is null/missing

### `src/front/js/component/audio/HardwareUI/useGRMeter.js`
- `useGRMeter(source, opts={targetDb})` → number 0..1
- `source`: DynamicsCompressorNode OR getter
- Reads `.reduction` (handles both number and AudioParam shape)
- `targetDb` default 12 (typical hardware GR ceiling)
- Same ref-stabilization + cleanup pattern as useAnalyserValue

### Why no smoothing in either hook
LEDLadder.js (line 63-78) and VUMeter.js (line 49-68) already do 30%-per-frame spring damping internally. Pre-smoothing would compound and lag. Hooks emit raw RMS / peak / GR values; primitives smooth.

## Files modified

### `src/front/js/component/SPXPlugins.js` (line 2233)
Added optional `getInstance` prop to `SPXPluginHost`. Threaded transparently to the dispatched `Comp` so plugin UIs that need it can read it; UIs that don't simply ignore it. Backwards compatible — existing UIs (TapeForgeUI, ValveGlowUI, etc.) destructure only `{params, onChange, onClose}` and the extra prop is dropped.

### `src/front/js/pages/RecordingStudio.js` (line 8821)
Render site of SPXPluginHost (popup at `afx && openFxKey && SPX_PLUGIN_KEYS.has(openFxKey)`) now passes:
```jsx
getInstance={() => liveInstancesRef.current.get(`${afx.id}:${openFxKey}`)}
```
Inline getter — recreated each render, but ref-stabilization inside the hooks means useEffect runs once. Mount-race tolerant: if the audio graph build registers the instance after the UI mounts, the hook's rAF tick re-fetches each frame and self-heals.

## PluginInstance contract (additive extension)

Plugin factories MAY (optionally) attach a `meters` field to the returned instance:
```js
{ inputNode, outputNode, setParam, dispose, meters?: { comp?, analyserIn?, analyserOut?, ... } }
```
- Backwards compatible: factories that don't touch `meters` keep working.
- `dispose()` MUST disconnect any analyser nodes the factory created (covered by existing `disposeNodes(...)` helper at RecordingStudio.js:1560).
- Field naming is per-factory — a multiband comp might expose `meters.comps: [comp1, comp2, comp3, comp4]`; a sibilance UI might use `meters.analyserSibilance`.

## Build

`webpack 5.99.9 compiled with 9 warnings in 179880 ms` — 0 errors. No bundle size regression.

## Status

Scaffolding done. Ready for Step 2a (4 simple compressors using `useGRMeter` against `.reduction`).
