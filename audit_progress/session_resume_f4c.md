# Session Resume — Where We Are (Pause: 2026-05-07 evening)

## Current status

**F4-C (live meter wiring) — COMPLETE on disk, NOT committed.**
- Awaiting user smoke test before any commit/push (per user rule).
- Last commit on branch is `d7ec7648 feat(RecordingStudio): F4-A plugin differentiation milestone` (already pushed to origin/claude/fix-recording-studio).

## What changed in this session

### Part 1 — Track strip meter post-console
- `RecordingStudio.js` `buildPlaybackSources` (line ~6375-6391): splitter moved from post-pan to post-console so the dB ladder reflects audible signal including SSL/Neve etc. saturation/EQ.
- Audit: `audit_progress/track_meter_audit.md`

### Part 2.0 — Hook scaffolding + prop refactor
- NEW: `src/front/js/component/audio/HardwareUI/useAnalyserValue.js` (RMS/peak hook)
- NEW: `src/front/js/component/audio/HardwareUI/useGRMeter.js` (DynamicsCompressorNode.reduction hook)
- Both ref-stabilize source so inline getters don't restart rAF on parent re-render.
- `SPXPlugins.js` SPXPluginHost (line ~2233) accepts `getInstance` prop, threads to UIs.
- `RecordingStudio.js` render site (line ~8821) passes `getInstance={() => liveInstancesRef.current.get(spxKey)}`.
- Audit: `audit_progress/phase_f4c_step2_0.md`

### Part 2a — 4 simple compressors (.reduction-driven)
- compressor, glueBus, fetStrike, optoPress factories in RecordingStudio.js now expose `meters: { comp }`.
- 4 UIs (CompressorUI, FETStrikeUI2, OptoPressUI2, GlueBusUI2) replaced synthetic GR with `useGRMeter`.
- Audit: `audit_progress/phase_f4c_step2a.md`

### Part 2b — 4 medium meters
- warmPress: added `analyserOut` post-makeup (SAT meter) + exposed `comp`.
- tubeComp: added `inGain` passthrough wrapper for true pre-comp tap; exposed `comp + analyserIn`.
- gateVerb: added `analyserIn` pre-gate.
- vintageAir: added `analyserOut` post-mix.
- 4 UIs (TubeCompUI, WarmPressUI2, VintageAirUI2, GateVerbUI2) updated.
- Audit: `audit_progress/phase_f4c_step2b.md`

### Part 2c — 4 hard meters + ShimmerReverbUI
- parallelCrush: added `analyserDry` + `analyserWet` (both pre-mix).
- vocalComp: added 6 kHz BiquadFilter bandpass + analyser → `analyserSibilance`.
- multiPress: exposed existing 4 internal compressors as `comps[]`.
- shimmer: added `analyserOut` post-mix.
- 5 UIs (VocalCompUI, MultiPressUI2 + BandColumn, ParallelCrushUI2, ShimmerReverbUI) updated.
- Audit: `audit_progress/phase_f4c_step2c.md`

## On-disk state (uncommitted)

```
M  src/front/js/component/SPXPlugins.js
M  src/front/js/component/audio/PluginUIs/CompressorUI.js
M  src/front/js/component/audio/PluginUIs/FETStrikeUI2.js
M  src/front/js/component/audio/PluginUIs/OptoPressUI2.js
M  src/front/js/component/audio/PluginUIs/GlueBusUI2.js
M  src/front/js/component/audio/PluginUIs/TubeCompUI.js
M  src/front/js/component/audio/PluginUIs/WarmPressUI2.js
M  src/front/js/component/audio/PluginUIs/VintageAirUI2.js
M  src/front/js/component/audio/PluginUIs/GateVerbUI2.js
M  src/front/js/component/audio/PluginUIs/MultiPressUI2.js
M  src/front/js/component/audio/PluginUIs/ParallelCrushUI2.js
M  src/front/js/component/audio/PluginUIs/ShimmerReverbUI.js
M  src/front/js/component/audio/PluginUIs/VocalCompUI.js
M  src/front/js/pages/RecordingStudio.js
?? src/front/js/component/audio/HardwareUI/useAnalyserValue.js
?? src/front/js/component/audio/HardwareUI/useGRMeter.js
?? audit_progress/track_meter_audit.md
?? audit_progress/phase_f4c_step2_0.md
?? audit_progress/phase_f4c_step2a.md
?? audit_progress/phase_f4c_step2b.md
?? audit_progress/phase_f4c_step2c.md
?? audit_progress/session_resume_f4c.md  (this file)
   m spx-studio  (submodule, untouched per user rule)
```

## Last verified build

`webpack 5.99.9 compiled with 9 warnings in 180849 ms` — 0 errors, asset-size warnings only. Verified at 06:49 after Part 2c. Only markdown files written since, so build state unchanged.

## Tomorrow morning's first action (per user)

1. **User smoke test of F4-C in browser.** Full recipe in `audit_progress/phase_f4c_step2c.md` lines 91-118 (12 numbered checks across all hard/medium/easy meters + bonus track strip console A/B test).
2. Based on smoke-test outcome, user decides on the queued mega-prompt for **Priorities 1-4** (F4-B hardware UIs for ~34 plugins, marquee+toolbar, mic mono fix, pre-beta polish).

## Mega-prompt status

The full Priorities-1-through-4 instructions are in the conversation transcript above. User's explicit instruction: "wait for user 'go' before starting Priority 1." DO NOT auto-start.

## Recovery instructions for next session

Run these to verify state:
```sh
git status --short              # should match list above
git log -1 --oneline            # should show d7ec7648 F4-A
ls -la audit_progress/phase_f4c_*.md  # 5 files (2_0, 2a, 2b, 2c, this resume)
ls -la src/front/js/component/audio/HardwareUI/use*.js  # 2 hook files
```

If all match: F4-C state is intact, proceed to user smoke test.

If anything missing: codespace volume issue — check for backup, do not regenerate without user confirmation.
