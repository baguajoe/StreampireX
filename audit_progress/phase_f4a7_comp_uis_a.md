# Phase F4-A.7 — Compressor UIs (Agent A)

Branch: `claude/fix-recording-studio`
Working dir: `src/front/js/component/audio/PluginUIs/`

Targets:
- CompressorUI.js — basic compressor (modern flat, teal)
- FETStrikeUI2.js — 1176 hardware (blue/silver)
- OptoPressUI2.js — LA-2A (vintage cream/gold)
- GlueBusUI2.js — SSL G-Bus (black rack)

---

## CompressorUI — DONE
- File: src/front/js/component/audio/PluginUIs/CompressorUI.js
- Lines: ~225
- HardwareUI components used: HardwarePanel (brushed-metal), AnalogKnob (modern, size 48), LEDLadder (vertical, teal, reverse)
- Build status: not-checked-yet
- Notes: attack/release stored in seconds (native DynamicsCompressor convention), displayed as ms. GR ladder driven by approximate grNorm derived from threshold/ratio (decorative).

## FETStrikeUI2 — DONE
- File: src/front/js/component/audio/PluginUIs/FETStrikeUI2.js
- Lines: ~330
- HardwareUI components used: HardwarePanel (blue-bezel), VUMeter (240x120), ButtonBank (All-In hardware), AnalogKnob (vintage, size 56)
- Build status: not-checked-yet
- Notes: Custom ratio bank renders all four buttons depressed when allButtonRatio=true. Attack/Release knobs are stepped 1..7 with internal lookup tables (ATTACK_STEPS / RELEASE_STEPS) — store ms in state but knob displays the step number. Threshold uses a slider (1176 originally derived threshold from input gain, this is an explicit hybrid).

## OptoPressUI2 — DONE
- File: src/front/js/component/audio/PluginUIs/OptoPressUI2.js
- Lines: ~360
- HardwareUI components used: HardwarePanel (vintage-cream), VUMeter (260x140), ButtonBank (Comp/Limit), AnalogKnob (vintage 80px + 44px), ProgramBank (4 slots)
- Build status: not-checked-yet
- Notes: 4 factory programs (DEFAULT/VOX/BASS/DRUMS) loadable via ProgramBank. Save button persists current state to localStorage under "spx.optoPress.programs.v1". Comp/Limit toggle synthesizes ratio (3 or 10) into setParam.

## GlueBusUI2 — DONE
- File: src/front/js/component/audio/PluginUIs/GlueBusUI2.js
- Lines: ~310
- HardwareUI components used: HardwarePanel (black-rack), LEDLadder (horizontal red, 16-segment, reverse), ButtonBank (ratio + auto-release), AnalogKnob (modern, size 44)
- Build status: not-checked-yet
- Notes: 4-band SSL channel-strip ribbon at top edge (red/yellow/green/blue) is decorative. Auto Release toggle wired to `autoGain`. Sidechain HPF knob accent uses blue band color for visual reference.

## Build Verification — DONE
- Command: `npx webpack --config webpack.prod.js`
- Result: `webpack 5.99.9 compiled with 9 warnings in 285800 ms`
- No errors. The 9 warnings are all pre-existing asset-size / precache-size advisories (large PNG assets and bundle.js). Matches the expected baseline.
- All 4 new UI files compiled cleanly.

## Summary
All 4 compressor UIs built and verified:
1. `CompressorUI.js` — modern flat / teal / GR LED ladder
2. `FETStrikeUI2.js` — 1176 hardware / blue-bezel / VU + ratio bank + All-In toggle
3. `OptoPressUI2.js` — LA-2A vintage cream / gold / large VU + Comp/Limit + ProgramBank
4. `GlueBusUI2.js` — SSL black-rack / 4-band ribbon / horizontal red GR ladder / Auto Release

SPXPlugins.js, RecordingStudio.js, ConsoleFXPanel.js untouched. Orchestrator handles import swap.
