# Phase F4-A.7 Compressor UIs — Batch B

Builds 5 hardware-styled compressor UIs in `src/front/js/component/audio/PluginUIs/`:
- TubeCompUI (Manley/Fairchild Vari-Mu)
- WarmPressUI2 (Hybrid FET+Tube)
- VocalCompUI (Vocal Strip)
- MultiPressUI2 (Mastering 4-Band)
- ParallelCrushUI2 (Parallel NY-style)

Each follows the `{ params, onChange, onClose }` contract used by `SPXPluginHost`.
Per spec, this batch does **not** modify SPXPlugins.js — orchestrator wires keys after.

## Status: COMPLETE — all 5 UIs built, prod build clean (9 size warnings only)

## Verification command
```
npx webpack --config webpack.prod.js
# → "compiled with 9 warnings in 266600 ms"
```

## Notes for orchestrator
- Files placed in `src/front/js/component/audio/PluginUIs/`.
- Suffixed `2` files (WarmPressUI2, MultiPressUI2, ParallelCrushUI2) require import-swap in SPXPlugins.js to replace existing UIs.
- New keys (TubeCompUI, VocalCompUI) need fresh `COMPONENT_MAP` registrations — corresponding `tubeComp` / `vocalComp` PLUGIN_DEFAULTS already specified in task brief.
- All 5 follow `({ params, onChange, onClose })` contract used by `SPXPluginHost`.
- All meters/visualizations are decorative — values synthesized from knob params, no live audio analysis path. Real-time hookup happens later in F4-A.5 batch 4.

## TubeCompUI — DONE
- File: src/front/js/component/audio/PluginUIs/TubeCompUI.js
- Lines: 322
- HardwareUI components used: HardwarePanel (wood), AnalogKnob (chickenhead x7), VUMeter (x2 — Input + GR), ButtonBank (Stereo Link)
- Custom visualizations: TubeGlow CSS bar (drive-driven), warm orange radial overlay
- Build status: clean (compiled with 9 warnings — all size warnings only)

## WarmPressUI2 — DONE
- File: src/front/js/component/audio/PluginUIs/WarmPressUI2.js
- Lines: 304
- HardwareUI components used: HardwarePanel (brushed-metal), AnalogKnob (vintage x7), LEDLadder (x2 — GR cyan reversed + SAT orange), ButtonBank (mode selector)
- Custom visualizations: warm-cool diagonal gradient overlay, gradient-text header
- Build status: clean (compiled with 9 warnings — all size warnings only)

## VocalCompUI — DONE
- File: src/front/js/component/audio/PluginUIs/VocalCompUI.js
- Lines: 286
- HardwareUI components used: HardwarePanel (vintage-cream), AnalogKnob (vintage x8), LEDLadder (sibilance, horizontal)
- Custom visualizations: U87/SM7-style microphone SVG with grille mesh + body, 30/70 split layout
- Build status: clean (compiled with 9 warnings — all size warnings only)

## MultiPressUI2 — DONE
- File: src/front/js/component/audio/PluginUIs/MultiPressUI2.js
- Lines: 372
- HardwareUI components used: HardwarePanel (black-rack), AnalogKnob (modern x15 — 3 xover + 4*3 band), LEDLadder (4 GR meters per band, color-coded)
- Custom visualizations: SVG 4-band crossover graph (log Hz scale, color-coded regions, dashed crossover dividers, kHz/Hz labels)
- Width: 540px (per spec, wider than other UIs)
- Build status: clean (compiled with 9 warnings — all size warnings only)

## ParallelCrushUI2 — DONE
- File: src/front/js/component/audio/PluginUIs/ParallelCrushUI2.js
- Lines: 380
- HardwareUI components used: HardwarePanel (black-rack), AnalogKnob (modern x8, CRUSH highlighted at size 64), LEDLadder (DRY green + WET red split visualization)
- Custom visualizations: parallel-path background stripes (dry green left, wet red right), CRUSH knob with red glow bezel and ★ CRUSH ★ Impact-font label, dry/wet center divider with ⇄ arrow
- Build status: clean (compiled with 9 warnings — all size warnings only)

