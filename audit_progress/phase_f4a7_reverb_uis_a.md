# Phase F4-A.7 — Reverb UIs (Batch A)

Building 4 hardware-styled reverb UIs in `src/front/js/component/audio/PluginUIs/`
to replace the GenericPlaceholderUI wrappers in `SPXPlugins.js` for: hall, plate,
spring, room.

Contract (per file):
- `export default function XxxReverbUI({ params, onChange, onClose })`
- `onChange(fullMergedParamsObject)` — host diffs to `setParam` AudioParam updates.
- Internal `useState({ ...params })` + `useEffect(() => onChange(s), [s])`.
- Fixed-position window: `top:80, right:24, width:360, position:fixed, zIndex:1000`.

Shared HardwareUI primitives:
- `HardwarePanel` (skin, accentColor, screws)
- `AnalogKnob` (style: vintage|chickenhead|modern)
- `ButtonBank` (options, value, onChange, style)
- (`VUMeter`, `LEDLadder`, `ProgramBank` available but not all are needed here)

DSP keys (matching PLUGIN_DEFAULTS):
- hall:    decay, preDelay, damping, hfDamping, width, mix
- plate:   decay, preDelay, diffusion, damping, brightness, mix
- spring:  decay, springs, tone, boing, mix
- room:    size, damping, brightness, mix

## HallReverbUI — DONE
- File: src/front/js/component/audio/PluginUIs/HallReverbUI.js
- Lines: 162
- HardwareUI components used: HardwarePanel (skin="black-rack"), AnalogKnob (style="vintage" x 6)
- Custom visualizations: IRWaveform — SVG exponential envelope with seeded noise tail, blue/gold theme
- Header: "HALL" in serif (Georgia) gold w/ glow; subtitle "cathedral"
- Knobs: 5x size-56 vintage (decay/preDelay/damping/hfDamping/width) + 1x size-72 mix knob in gold-bordered well
- Build status: not-checked-yet (4 files pending)

## PlateReverbUI — DONE
- File: src/front/js/component/audio/PluginUIs/PlateReverbUI.js
- Lines: 186
- HardwareUI components used: HardwarePanel (skin="brushed-metal"), AnalogKnob (style="modern" x 6)
- Custom visualizations: PlateShimmer — rAF-driven vibrating brushed-steel rectangle with radial highlight overlay; intensity = mix*decay
- Header: "PLATE" in chrome gradient with linear-gradient text-clip + reflection
- Knobs: 5x size-52 modern (decay/preDelay/diffusion/damping/brightness) + 1x size-72 mix knob in chrome-gradient well
- Build status: not-checked-yet (3 files pending)

## SpringReverbUI — DONE
- File: src/front/js/component/audio/PluginUIs/SpringReverbUI.js
- Lines: 196
- HardwareUI components used: HardwarePanel (skin="vintage-cream"), AnalogKnob (style="chickenhead" x 4), ButtonBank (springs 1/2/3)
- Custom visualizations: SpringTank — 3x SVG coiled-spring polylines, phase animated via rAF, amplitude tied to `boing`, extras dimmed when `springs` count < 3
- Header: "SPRING" in Impact/Arial Black, deep orange + double-shadow retro
- Knobs: 4x size-56 chickenhead (decay/tone/boing/mix); ButtonBank for spring count (1/2/3)
- Build status: not-checked-yet (2 files pending)

## RoomReverbUI — DONE
- File: src/front/js/component/audio/PluginUIs/RoomReverbUI.js
- Lines: 168
- HardwareUI components used: HardwarePanel (skin="vintage-cream"), AnalogKnob (style="vintage" x 4)
- Custom visualizations: RoomFootprint — top-down SVG floor plan with grid pattern, dimensions readout in feet (size→2..18ft × 1.5..14ft), seeded diffuser-tile dots whose density scales with `damping`, SRC/MIC markers
- Header: "ROOM" in Georgia serif, warm-brown
- Knobs: 4x size-52 vintage (size/damping/brightness/mix)
- Build status: clean (after batch build)

## Build verification — DONE
- Command: `npx webpack --config webpack.prod.js`
- Result: `webpack 5.99.9 compiled with 9 warnings in 250580 ms`
- All 9 warnings are pre-existing asset/bundle size limits (PNG assets + bundle.js
  > 244 KiB recommended; sw.js precache warnings). No code/import errors.

## Summary
- 4 UIs created at: src/front/js/component/audio/PluginUIs/{Hall,Plate,Spring,Room}ReverbUI.js
- Total lines: 162 + 186 + 196 + 168 = 712
- All exports default-functional React components, props-shape:
  `{ params, onChange, onClose }` matching SPXPluginHost contract.
- Each fixed-position window (top:80, right:24, width:360, zIndex:1000),
  inline styles only, distinct hardware aesthetic per design spec.
- No SPXPlugins.js / RecordingStudio.js modifications (orchestrator-only step).
- No imports between UI files, no cross-batch coupling.

