# Phase F4-A — DIFFERENTIATION MILESTONE COMPLETE

Spans F4-A.1 (audits) through F4-A.7B (console UI). 17 plugins + 20 console boards + 6 hardware UI components + scaffolding all delivered. All work on branch `claude/fix-recording-studio`. **No commits, no push.**

---

## What shipped

### F4-A.1–4 — Audits + design proposal + approval
- `audit_progress/reverb_family_audit.md` (382 lines)
- `audit_progress/compressor_family_audit.md` (~400 lines)
- `audit_progress/phase_f4a3_design_proposal.md` (decision matrix, scope options)
- User approved Option A (full scope, ~48 h)

### F4-A.5 — DSP differentiation (4 batches)
9 reverb DSP factories + 9 compressor DSP factories. Total ~80% of `RecordingStudio.js:1300–4000` is differentiated DSP now.

| Batch | Plugins | DSP highlight |
|---|---|---|
| 1 reverbs | hall, plate, spring, room | Schroeder FDN, simplified Dattorro, 3-comb+allpass+modulated delay, short-IR convolver |
| 2 reverbs | chamber, gateVerb (rebuilt), shimmer, vintageAir (upgraded), infiniteReverb (refined) | Topology fix on gateVerb (gate now BEFORE convolver), tape sat + wow + flutter on vintageAir, shimmer-loop feedback, freeze mode on infinite |
| 3 compressors | compressor (unchanged), fetStrike, optoPress, glueBus | 1176 FET sat curve, program-dependent release, SSL slew + HF lift + autoGain |
| 4 compressors | tubeComp (new), warmPress (rewritten), vocalComp (new), multiPress (unchanged), parallelCrush (unchanged) | Even-harmonic asymmetric tanh, mode-swap (optical/vca/vari-mu), de-esser combo |

### F4-A.6 — HardwareUI shared components (6 files)
`src/front/js/component/audio/HardwareUI/`: VUMeter (~7.6 KB), LEDLadder (~5.6 KB), ButtonBank (~3.6 KB), HardwarePanel with 5 skins (~4.7 KB), AnalogKnob with 3 styles (~7.6 KB), ProgramBank (~3.7 KB). Inline-style React functional components, no CSS files.

### F4-A.7 — Per-plugin UIs (17 files)
`src/front/js/component/audio/PluginUIs/`:

**Reverbs** (9): HallReverbUI, PlateReverbUI, SpringReverbUI, RoomReverbUI, ChamberReverbUI, GateVerbUI2, ShimmerReverbUI, VintageAirUI2, InfiniteReverbUI2.

**Compressors** (8): CompressorUI, FETStrikeUI2, OptoPressUI2, GlueBusUI2, TubeCompUI, WarmPressUI2, VocalCompUI, MultiPressUI2, ParallelCrushUI2 — that's 9 actually.

Total 17 keepers. Each ~150–430 lines. Each uses HardwareUI shared components plus its own custom visualizations (IR waveforms, plate shimmer, animated tape reels, infinity glyph, microphone SVG, 4-band crossover graph, etc).

### F4-A.7B — Console simulator UI (Option B-Full)
- `src/front/js/component/audio/ConsolePanel.js` (414 lines)
- `RecordingStudio.js` extensions:
  - `applyConsoleCharacter` refactored to PluginInstance contract with live `setParam` for all 11 params
  - New state: `trackConsoleParams: Map<trackId, paramsObj>`, `masterConsoleParams`, `openConsolePanel`, `consoleABSlot`
  - 5 family themes: ssl/neve/api/trident/vintage (mapped per-board via `CONSOLE_FAMILY`)
  - EDIT button next to each non-`none` dropdown opens the panel as a `DraggablePanel`
  - Track strip border accent + `● ACTIVE` badge when a console is engaged
  - localStorage presets at key `spx-console-presets-v1`
  - Project save/load extended with `track_console_params` and `master_console_params`
  - A/B compare via live `setParam` ramps (no graph rebuild)

### Scaffolding
- 9 deprecated reverb clones flagged `comingSoon: true` (factory code preserved per user spec — Phase E may revisit)
- `transGate` reclassified `type: "comp" → "gate"`
- Picker filter for `comingSoon` items
- 8 new keys added to `ALL_FX_EXTENDED` + `PLUGIN_DEFAULTS`
- Basic `compressor` promoted from ConsoleFXPanel dispatch to SPXPluginHost dispatch

---

## Build
**`webpack 5.99.9 compiled with 9 warnings in 191944 ms`** — bundle 10.9 MiB, asset-size warnings only, **0 errors**.

---

## What's NOT in this milestone (deferred)

- 9 deprecated reverbs are dormant (factory code preserved, registry tagged comingSoon). Phase E if you want them back.
- ConsoleFXPanel's compressor section is now dead code (compressor routes to new CompressorUI via SPXPluginHost). Cleanup deferred.
- F4 (marquee multi-select + arranger toolbar tools — bugs #4 + #6 from the smoke audit) — original F4 scope, postponed when F4-A took priority.

---

## User smoke-test recipe

### 17 plugin UIs
1. Add a track. Open inserts picker.
2. For each of the 17 keepers (hall, plate, spring, room, chamber, gateVerb, shimmer, vintageAir, infiniteReverb, compressor, fetStrike, optoPress, glueBus, tubeComp, warmPress, vocalComp, multiPress, parallelCrush):
   - Verify it appears in the picker (no longer hidden by `comingSoon`)
   - Click to enable; the SPXPluginHost panel should open with the per-plugin custom UI (NOT the generic placeholder)
   - Verify the aesthetic matches the F4-A.3 design spec (cathedral / plate / amp / room / chamber / 80s rack / ethereal / tape / cosmic / 1176 / LA-2A / SSL / Vari-Mu / hybrid / vocal-strip / mastering 4-band / NY parallel)
   - Tweak a knob; verify audible DSP change
3. Verify the 9 deprecated reverbs (hallForgeS, hallForgeL, stochasticHall, greatHall, plateForge, springBox, spaceForge, vocalSpace, phantomDouble) are NO LONGER in the picker

### 20 console boards
1. On a track, pick a console from the dropdown (e.g., SSL 4000E).
2. EDIT button should appear; clicking it opens ConsolePanel as a draggable floating window.
3. Panel should be themed for the SSL family (black-rack, modern knobs, LED ladder).
4. Track strip should show left-border in console color + `● ACTIVE` badge.
5. Tweak a knob (e.g., HPF freq); verify audible change.
6. Click A/B; tweak again; click again to compare.
7. Click RESET; values return to factory.
8. Save a preset via the preset menu; pick a different console; load the preset back.
9. Reload the project file; verify the console + tweaked params persist.
10. Switch to Neve, API, Trident, vintage families — verify each has a distinct family aesthetic.
11. Test master console at master fader.
12. Pick `none`/Bypass; verify panel hides and DSP is bypassed (border + badge gone).

---

## Status

**F4-A milestone complete.** All five agents reported clean. Final integrated build passes. Awaiting user smoke test before any commit/push.

Next phase candidates (when ready):
- Original F4 (marquee multi-select + arranger toolbar) — bugs #4 + #6
- Cleanup of dead ConsoleFXPanel compressor branch
- Phase E: differentiate the 9 deprecated reverbs OR delete their factories
