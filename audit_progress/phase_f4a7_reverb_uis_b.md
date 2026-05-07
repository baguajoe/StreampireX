# Phase F4-A.7 — Reverb UIs (Batch B)

Building 5 hardware-styled reverb UIs in `src/front/js/component/audio/PluginUIs/`:
- `ChamberReverbUI.js` — echo chamber, dark slate/silver
- `GateVerbUI2.js` — 80s rack gate, red LED threshold meter (suffix `2` to avoid collision)
- `ShimmerReverbUI.js` — ethereal, purple/magenta, shimmer particles
- `VintageAirUI2.js` — tape machine, beige/orange, VU meter, reels
- `InfiniteReverbUI2.js` — cosmic, deep purple/black, infinity visualization

Contract (per file):
- `export default function XxxReverbUI({ params, onChange, onClose })`
- Internal `useState({ ...params })` + `useEffect(() => onChange(s), [s])`.
- Fixed-position window: `top:80, right:24, width:360, position:fixed, zIndex:1000`.

Shared HardwareUI primitives:
- `HardwarePanel` (skin, accentColor, screws)
- `AnalogKnob` (style: vintage|chickenhead|modern)
- `ButtonBank` (options, value, onChange, style)
- `VUMeter`, `LEDLadder` as needed

DSP keys (matching PLUGIN_DEFAULTS in SPXPlugins.js):
- chamber: decay, damping, color, mix
- gateVerb: preDelay, decay, diffusion, damping, earlyLevel, lateLevel, hpf, lpf, mix, gateThresh, gateDecay
- shimmer: decay, shimmer, octave, damping, mix
- vintageAir: preDelay, decay, diffusion, damping, earlyLevel, lateLevel, hpf, lpf, mix, tapeWow, flutter, bias
- infiniteReverb: freeze, roomSize, damping, mix, shimmer

(progress entries appended as each file ships)

## Final Build Verification
Ran `npx webpack --config webpack.prod.js` after all 5 files. Result:
- `webpack 5.99.9 compiled with 9 warnings in 284854 ms`
- All 9 warnings are asset/entrypoint size warnings (PNGs and bundle.js >244 KiB) plus precache size — no compile/lint errors from the new UI files.

## Files shipped (5)
- src/front/js/component/audio/PluginUIs/ChamberReverbUI.js (323 lines)
- src/front/js/component/audio/PluginUIs/GateVerbUI2.js (427 lines)
- src/front/js/component/audio/PluginUIs/ShimmerReverbUI.js (353 lines)
- src/front/js/component/audio/PluginUIs/VintageAirUI2.js (413 lines)
- src/front/js/component/audio/PluginUIs/InfiniteReverbUI2.js (416 lines)

Total: 1932 lines added.

Orchestrator next steps:
- Update SPXPlugins.js COMPONENT_MAP / imports to wire the 5 default exports.
- For GateVerbUI / VintageAirUI / InfiniteReverbUI swaps, replace the existing ReverbBase wrapper (`GateVerbUI`, `VintageAirUI`) and any `InfiniteReverbUI` reference with imports from the `2`-suffixed PluginUIs files.

## ChamberReverbUI — DONE
- File: src/front/js/component/audio/PluginUIs/ChamberReverbUI.js
- Lines: ~280
- HardwareUI components used: HardwarePanel (skin="black-rack"), AnalogKnob (style="modern" x4)
- Custom visualizations: SVG room diagram with concrete-pattern fill, dashed echo lines (opacity tied to damping), absorption hatching density tied to damping, two speaker icons, room dimensions label scaled by decay
- Layout: header CHAMBER (silver letter-spaced), room diagram, 3-knob row (Decay/Damping/Color), hero MIX knob (size 84) center-front
- Accent: silver/slate #a0aab0
- Build status: clean (compiled with 9 warnings — size warnings only)

## GateVerbUI2 — DONE
- File: src/front/js/component/audio/PluginUIs/GateVerbUI2.js
- Lines: ~340
- HardwareUI components used: HardwarePanel (skin="black-rack"), AnalogKnob (style="modern" x11), LEDLadder (vertical reverse, red)
- Custom visualizations: 80s-style red glowing "GATE VERB" header, big "GATE" label with scanline overlay, three READY/GATE/WET status LEDs, vertical LED threshold ladder, dot-matrix DigitalReadout boxes for thresh/decay/reverb
- Layout: header, status row (LEDs + GATE + LED ladder), gate-specific knob row with digital readouts, two reverb-base knob rows (preDelay/damp/diff/early then late/hpf/lpf/mix)
- Accent: red LED #ff3030, square corners (no border-radius), Courier New
- Build status: clean (compiled with 9 warnings — size warnings only)

## ShimmerReverbUI — DONE
- File: src/front/js/component/audio/PluginUIs/ShimmerReverbUI.js
- Lines: ~280
- HardwareUI components used: HardwarePanel (skin="vintage-cream" with overlay), AnalogKnob (style="vintage" x4), ButtonBank (octave selector)
- Custom visualizations: Canvas-based shimmer particles (12 drifting upward) with rAF loop, intensity-driven velocity scaling, hsla radial gradient halos with bright core, mix-blend-mode "screen" overlay
- Layout: cursive "Shimmer" header with white glow + purple bloom, ETHEREAL VERB subtitle, octave button bank (0/+1/+2), 4-knob frosted-glass row, italic "infinite skies" tag
- Accent: purple/magenta #a040ff, diagonal gradient #2a0040 -> #6020a0 -> #a040ff
- Build status: clean (compiled with 9 warnings — size warnings only)

## VintageAirUI2 — DONE
- File: src/front/js/component/audio/PluginUIs/VintageAirUI2.js
- Lines: ~340
- HardwareUI components used: HardwarePanel (skin="wood"), AnalogKnob (style="chickenhead" x7), VUMeter (cream face, 140x86)
- Custom visualizations: Two SVG TapeReel components with rAF spinning animation (speed proportional to tapeWow), brass center hub via radialGradient, three rotating spokes with holes, dark wood-grain via wood skin, MODEL 224 subtitle, brass corner footer
- Layout: header VINTAGE AIR, top row [supply reel + VU meter + take-up reel] in dark inset, 4-knob tape character row (Decay/Wow/Flutter/Bias chickenhead), 3-knob reverb base row (PreDly/Damp/Mix)
- Accent: orange/amber #cc6611, cream face VU meter
- VU value driven by mix*0.6 + lateLevel*0.4 (visual proxy)
- Build status: clean (compiled with 9 warnings — size warnings only)

## InfiniteReverbUI2 — DONE
- File: src/front/js/component/audio/PluginUIs/InfiniteReverbUI2.js
- Lines: ~330
- HardwareUI components used: HardwarePanel (skin="black-rack" + cosmic radial overlay), AnalogKnob (style="modern" x4), ButtonBank (FREE/FREEZE toggle)
- Custom visualizations: SVG infinity figure-8 path with feGaussianBlur glow filter and linearGradient stroke; CSS-keyframe pulse animation tied to roomSize speed; pauses solid when frozen; 40-star StarField with twinkle keyframes; tiny scattered dots SVG behind INFINITE label
- Layout: header INFINITE (white with purple bloom + scattered stars), infinity vis box (radial cosmic gradient + stars + pulsing/frozen ∞), FREE/FREEZE button bank, 4-knob row (Size/Damping/Shimmer/Mix), status footer toggling between "ETERNAL ECHO" / "TAIL HELD"
- Accent: deep purple #a040ff with #80c0ff frozen variant
- Build status: clean (compiled with 9 warnings — size warnings only)
