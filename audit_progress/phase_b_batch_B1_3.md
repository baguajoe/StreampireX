# Phase B Batch B1.3 — UI/factory param mismatches (SPX, 8 plugins)

Branch: `claude/fix-recording-studio`
Plugins: loFiCrusher, chorusEnsemble, declicker, dialogueIsolator, cabinetSim, midSideEQ, dynamicEQ, freqShifter

Reference: `audit_progress/batch_06_missing_ozone.md`

## Per-plugin progress

### 1. loFiCrusher — FIXED (partial)
- Files: `src/front/js/pages/RecordingStudio.js` (factory rewritten), `src/front/js/component/SPXPlugins.js` (COMPONENT_MAP).
- Bound: `bits` (waveshaper curve), `rate` (lowpass cutoff via rateToFreq mapping), `filter` (lowpass cutoff). Kept legacy `downsample` case for back-compat.
- Phase C candidates: `noise` (needs noise generator + sum), `wobble` (LFO on lp.frequency), `mix` (dry/wet split).
- COMPONENT_MAP: added LoFiCrusherUI.

### 2. chorusEnsemble — FIXED (partial)
- File: `RecordingStudio.js` (factory rewritten), `SPXPlugins.js` (COMPONENT_MAP).
- Bound: `mode` (1–4 → LFO rate via modeToRate), `depth` (lfoG1.gain + lfoG2.gain). Kept legacy `rate` case.
- Phase C: `mix` — chorus output is currently 100% wet; needs dry/wet split.
- COMPONENT_MAP: added ChorusEnsembleUI.

### 3. declicker — FIXED (partial)
- File: `RecordingStudio.js` (factory rewritten), `SPXPlugins.js` (COMPONENT_MAP).
- Bound: `strength` → gain attenuation (0..0.2 reduction). Default neutralized (was 0.98 audible attenuation; now strength=0 → unity).
- Phase C: `sensitivity`, `maxWidth` need a transient detector / worklet.
- COMPONENT_MAP: added DeclickerUI.

### 4. dialogueIsolator — FIXED (partial)
- File: `RecordingStudio.js` (factory rewritten), `SPXPlugins.js` (COMPONENT_MAP).
- Bound: `isolation` (HP & LP cutoffs narrow toward 2.5kHz), `sensitivity` (presence peak gain 0–6 dB).
- Phase C: `smoothing` (envelope follower), `mix` (dry/wet split).
- COMPONENT_MAP: added DialogueIsolatorUI.

### 5. cabinetSim — FIXED (partial)
- File: `RecordingStudio.js` (factory rewritten), `SPXPlugins.js` (COMPONENT_MAP).
- Bound: `cabinet` (mid + lp cutoffs), `distance` (LP darkens), `angle` (mid.gain off-axis cut). Kept legacy `type` alias.
- Phase C: `mic` (needs separate mic-emulation peak node), `mix` (dry/wet split).
- COMPONENT_MAP: added CabinetSimUI.

### 6. midSideEQ — SKIPPED (Phase C)
- Reason: UI does NOT exist (`MidSideEQUI` is referenced in ALL_FX_EXTENDED at SPXPlugins.js:1619 but the component is never exported). No UI knobs to bind. Engine factory is fine; cases `midFreq/midGain/sideFreq/sideGain` are present but no UI emits them. Per audit_progress/batch_06 §A10.4, this is bucket (b) — "UI does not exist, engine exists" — Phase C work to author the UI.
- COMPONENT_MAP: not added (no component to register).

### 7. dynamicEQ — FIXED (structural compromise)
- File: `RecordingStudio.js` (factory rewritten), `SPXPlugins.js` (COMPONENT_MAP).
- UI emits `bands[]` array + `selectedBand`. Engine is single-band (one compressor + one peaking filter). Compromise: track `curBand` index and apply `bands[curBand]` to the single engine band on every `bands` array push or `selectedBand` change.
- Bound: `bands` (whole array, dispatches to `applyBand` for current index), `selectedBand` (re-points the active band). Legacy single-value cases kept.
- Phase C candidate: build a real 5-band parallel topology (5x compressor+filter merged) when this becomes a release blocker.
- COMPONENT_MAP: added DynamicEQUI.

### 8. freqShifter — FIXED (partial)
- File: `RecordingStudio.js` (factory comments + dead-case additions), `SPXPlugins.js` (COMPONENT_MAP).
- Already-working: `shift` (carrier.frequency), `mix` (wet.gain).
- Added dead `lfoRate`/`lfoDepth` cases per "leave dead setParam cases" guidance.
- Phase C: `lfoRate`, `lfoDepth` need a second LFO osc + gain modulating carrier.frequency (new node tree).
- COMPONENT_MAP: added FreqShifterUI.

## B1.3 Summary
- Fixed: 7/8 — loFiCrusher, chorusEnsemble, declicker, dialogueIsolator, cabinetSim, dynamicEQ, freqShifter (all partial — see Phase C lists per-plugin).
- Partial: 7 (same list as Fixed; "partial" here means some UI knobs reach DSP, others remain Phase C).
- Skipped (Phase C): 1 — midSideEQ (UI does not exist; nothing to bind to).
- COMPONENT_MAP additions: LoFiCrusherUI, ChorusEnsembleUI, DeclickerUI, DialogueIsolatorUI, CabinetSimUI, DynamicEQUI, FreqShifterUI (7).
- Files touched: RecordingStudio.js (7 factory edits), SPXPlugins.js (1 COMPONENT_MAP edit).
