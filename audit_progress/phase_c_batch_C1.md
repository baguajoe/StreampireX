# Phase C1 — UI builds for working engines

Scope: 7 plugins where the audio factory in `RecordingStudio.buildFxChain` already works but no React UI existed. Each got a small SPX-style window matching the factory's exact `setParam` keys.

All UIs were added to `src/front/js/component/SPXPlugins.js` between the existing `HarmonicSumUI` and the `ALL_FX_EXTENDED` registry block (around line 1503 of the original file).

## Plugins

### 1. matchEQ → MatchEQUI — FIXED
- Factory: RecordingStudio.js:2951 — `low` & `high` shelves.
- UI: 2 knobs (Low 200 Hz, High 8 kHz) + SpectrumAnalyzer.
- PLUGIN_DEFAULTS: `{ low: 0, high: 0 }`.

### 2. lowEndFocus → LowEndFocusUI — FIXED
- Factory: RecordingStudio.js:2965 — `sub` (60 Hz peak) & `kick` (100 Hz peak).
- UI: 2 knobs + SpectrumAnalyzer with HPF + 2 peaks.
- PLUGIN_DEFAULTS: `{ sub: 3, kick: 2 }`.

### 3. spectralRecovery → SpectralRecoveryUI — FIXED
- Factory: RecordingStudio.js:3003 — `amount` (10 kHz high-shelf) & `presence` (8 kHz peak).
- UI: 2 knobs + SpectrumAnalyzer.
- PLUGIN_DEFAULTS: `{ amount: 4, presence: 2 }`.

### 4. loudnessTarget → LoudnessTargetUI — FIXED
- Factory: RecordingStudio.js:2980 — `ceiling` (limiter threshold) & `target` (makeup dB).
- UI: 2 knobs + descriptive footer.
- PLUGIN_DEFAULTS: `{ ceiling: -1, target: 0 }`.

### 5. msImager → MSImagerUI — FIXED
- Factory: RecordingStudio.js:2995 — single `width` gain.
- UI: 1 knob + descriptive footer (0=mono, 1=original, 2=double-wide).
- PLUGIN_DEFAULTS: `{ width: 1 }`.

### 6. codecPreview → CodecPreviewUI — FIXED
- Factory: RecordingStudio.js:3017 — passthrough HPF 40 Hz + LPF 16 kHz, no params.
- UI: info-only window with frequency labels + SpectrumAnalyzer showing the brick walls.
- PLUGIN_DEFAULTS: `{}` (no params).

### 7. loudnessMeter2 → LoudnessMeter2UI — FIXED
- Factory: RecordingStudio.js:3391 — passthrough.
- UI: LUFS meter readout (5 bars: integrated/short-term/momentary/LRA/true-peak) + 5 streaming targets. Mirrors LoudnessMeterUI structure with green color theme. Values are static (engine is passthrough — no live metering yet).
- PLUGIN_DEFAULTS: `{ target: "streaming", integrated: -14, lra: 8, truePeak: -1, momentary: -14, shortTerm: -14 }`.

## C1 Summary
- Fixed: 7/7
- Files touched: `src/front/js/component/SPXPlugins.js` (3 edits — UIs added, PLUGIN_DEFAULTS updated, COMPONENT_MAP updated)
- COMPONENT_MAP additions: MatchEQUI, LowEndFocusUI, SpectralRecoveryUI, LoudnessTargetUI, MSImagerUI, CodecPreviewUI, LoudnessMeter2UI
- Build: pending verification at end of phase.
