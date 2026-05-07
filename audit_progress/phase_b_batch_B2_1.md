# Phase B Batch 2.1 — ph_* registry/factory reconciliation (P0)

Scope: AICompressor, AIDeRoom, AIEQMatch, AINoiseReduce, AIVocalClean,
AirEQ, AmpSim, AutoFilter, BitDepth, Bitcrusher.

Each factory now reconciles every registry-declared param with a `case` in
`setParam`, applies inline clamps + finite-guards, converts units (ms→s,
%→0..1, dB→linear) where required, and exposes a real `destroy()` for
PluginHost cleanup. None of these required `registry.js` edits.

---

### 1. AICompressor — FIXED
- File: `src/front/js/component/audio/plugins/plugins/AICompressorPlugin.js`
- Added cases: `attack` (ms/1000), `release` (ms/1000), `style` (0–3 → knee preset).
- Init now reads p.attack/release as ms (clamped, /1000). Makeup default 0 dB (registry-aligned, was 3 dB).
- Added `destroy()`. All 6 knobs live.

### 2. AIDeRoom — FIXED
- File: `AIDeRoomPlugin.js`
- Added cases: `reduction` (0–1 → -24..0 dB peaking cut), `sensitivity` (0–1 → -60..-10 dB threshold), `freq` (peaking center 200–2000 Hz), `mix` (wet/dry blend via new dryGain/wetGain nodes).
- Topology updated: `input→dry→output` AND `input→filter→comp→wet→output`.
- Added `destroy()`. All 4 knobs live.

### 3. AIEQMatch — FIXED (rebuilt)
- File: `AIEQMatchPlugin.js`
- Replaced regex `bandN` scheme with the registry's 4-knob model: `match` (0–1 scales preset smile profile), `smoothing` (0–1 → 10..510 ms time-constant), `lowEnd`/`highEnd` (0–1 each → ±6 dB tilt across 8 fixed bands).
- Kept legacy `bandN` accepted for back-compat.
- Added `destroy()`. All 4 knobs live.

### 4. AINoiseReduce — FIXED
- File: `AINoiseReducePlugin.js`
- Added cases: `threshold` (dB → gate threshold), `reduction` (0–1 → ratio 1..20), `smoothing` (0–1 → release 50..550 ms), `mix` (wet/dry).
- Kept legacy `floor`/`hpf` aliases.
- Added `destroy()`. All 4 knobs live.

### 5. AIVocalClean — FIXED
- File: `AIVocalCleanPlugin.js`
- Added cases: `denoise` (0–1 → comp threshold/ratio), `debreath` (0–1 → hpf 60..200 Hz), `declick` (0–1 → deess 0..-9 dB at 8 kHz), `mix` (wet/dry).
- Defaults made neutral on insert (presence 0 dB, deess matches declick=0.3).
- Kept legacy `deess`/`presence` aliases.
- Added `destroy()`. All 4 knobs live.

### 6. AirEQ — FIXED
- File: `AirEQPlugin.js` (only the `createAirEQPlugin` function — the rest of the multi-plugin file is untouched).
- Added cases: `air` (alias to airGain, 0–12 dB), `presence` (0–6 dB), `mix` (wet/dry path).
- Kept `airGain`, `airFreq`, `presenceGain`, `presenceFreq`, `hpf` cases.
- Added `destroy()`. All 4 knobs live.

### 7. AmpSim — FIXED
- File: `AmpSimPlugin.js`
- Drive scaling fixed: `drive` is registry % (0–100), now mapped to `1+(d/100)*9` curve gain (was `1+v*10` with raw 0–100 → catastrophic).
- Added cases: `cabinet` (0–5 → cabinet preset bandpass freq+Q table), `tone` (200–8000 Hz → presence freq), `mix` (wet/dry), `outputGain` (-12..12 dB → linear gain node).
- Kept `presence` case for back-compat.
- Added `destroy()`. All 5 knobs live.

### 8. AutoFilter — FIXED
- File: `AutoFilterPlugin.js`
- Added cases: `res` (alias to filter Q), `mix` (wet/dry path).
- Depth scaling fixed: 0–1 input now scales to 0..5000 Hz LFO deviation (was raw → 1 Hz at full depth, inaudible).
- Added `destroy()` that stops the LFO and disconnects nodes. All 5 knobs live.

### 9. BitDepth — FIXED
- File: `BitDepthPlugin.js`
- Default bits 16 (transparent) instead of 8 (audible quantization on insert).
- Added cases: `dither` (0–1 → noise amplitude added before quantize), `mix` (wet/dry path).
- Added `destroy()` that nulls onaudioprocess and disconnects. All 3 knobs live. (ScriptProcessor still in use — flagged for Phase C migration to AudioWorklet.)

### 10. Bitcrusher — FIXED
- File: `BitcrusherPlugin.js`
- Default bits 16 + rate 1 (transparent on insert).
- Added cases: `rate` (0.01–1 fraction → sampleReduction = round(1/rate)), `mix` (wet/dry path).
- Kept legacy `sampleReduction` case.
- Added `destroy()`. All 3 knobs live. (ScriptProcessor — Phase C worklet candidate.)

---

## B2.1 Summary
- Fixed: 10/10
- Partial: 0
- Skipped (Phase C): 0
- Registry params pruned: none
- Factory cases added: ~31 new `setParam` cases plus `destroy()` on all 10 factories.
- Files touched (Edit/Write counts):
  - AICompressorPlugin.js (1 Write)
  - AIDeRoomPlugin.js (1 Write)
  - AIEQMatchPlugin.js (1 Write)
  - AINoiseReducePlugin.js (1 Write)
  - AIVocalCleanPlugin.js (1 Write)
  - AirEQPlugin.js (1 Edit, scoped to createAirEQPlugin only — multi-plugin file)
  - AmpSimPlugin.js (1 Write)
  - AutoFilterPlugin.js (1 Write)
  - BitDepthPlugin.js (1 Write)
  - BitcrusherPlugin.js (1 Write)
- registry.js: untouched (no edits required).

## Phase C candidates flagged
- BitDepth and Bitcrusher use deprecated `createScriptProcessor` — should be migrated to AudioWorkletNode.
- AIEQMatch matchProfile is currently a hard-coded "smile". A real implementation would learn it from a reference signal.
- AutoTune (different batch) noted as fake — out of scope here.
