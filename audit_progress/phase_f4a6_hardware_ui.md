# Phase F4-A.6 — Hardware-Aesthetic Shared UI Components

Building 6 reusable hardware-aesthetic UI primitives in
`src/front/js/component/audio/HardwareUI/` for use by per-plugin UIs in F4-A.7.

Convention: functional React, hooks only, inline styles, default exports,
JSDoc-style header on each file. No external state / no shared CSS.

## VUMeter.js — DONE
- File: src/front/js/component/audio/HardwareUI/VUMeter.js
- Lines: ~190
- Props: value (0..1), min (default -20), max (default +3), width (200),
  height (120), color ("#222"), bezelColor ("#1a1a1a"),
  faceColor ("#f7e9c8"), label ("")
- Notes:
  - Cream VU face with red zone above 0 dB.
  - Ticks: -20, -10, -5, -3, -1, 0, +1, +3 dB.
  - Needle pivot at bottom-center, sweeps -60deg..+60deg around vertical.
  - Spring damping ~30% per frame via requestAnimationFrame, with
    delta-snap when |delta| < 0.0005 to avoid endless tiny updates.
  - Caller is expected to convert dBFS -> 0..1 normalized using its own
    min/max; component just renders normalized 0..1.
  - SVG-based; no canvas.

## LEDLadder.js — DONE
- File: src/front/js/component/audio/HardwareUI/LEDLadder.js
- Lines: ~165
- Props: value (0..1), orientation ("vertical"|"horizontal", default
  "vertical"), segments (12), color ("#ff5544"), dimColor ("#3a1a1a"),
  width, height, reverse (false)
- Notes:
  - SVG rect strip with rounded corners, dark inset frame.
  - `reverse=true` makes the strip fill from the opposite end (used
    for GR meters that "fill DOWN" from the top).
  - Top 3 segments (in both reverse and normal mode the visual top)
    are flagged as "danger" and rendered with brighter glow + larger
    drop-shadow filter for attention.
  - Spring damping ~30% per frame (matches VUMeter).
  - Lighten() helper does white-mix on hex colors for danger-zone hue.

## ButtonBank.js — DONE
- File: src/front/js/component/audio/HardwareUI/ButtonBank.js
- Lines: ~115
- Props: options ([{value,label,color?}]), value, onChange,
  orientation ("horizontal"|"vertical"), style ("hardware"|"modern"),
  size (30), accentColor ("#00ffc8")
- Notes:
  - Stateless / controlled: parent owns selected `value`.
  - hardware style: dark gradient buttons, sunken inset shadow + accent
    glow when active; raised gradient with subtle highlight when inactive.
  - modern style: flat tabs with accent fill when active.
  - Per-option `color` overrides accentColor for that button (e.g. red
    for "All buttons" mode).
  - Click on already-active option is a no-op (avoids redundant onChange).

## HardwarePanel.js — DONE
- File: src/front/js/component/audio/HardwareUI/HardwarePanel.js
- Lines: ~140
- Props: skin ("brushed-metal"|"wood"|"vintage-cream"|"black-rack"
  |"blue-bezel"), children, width, height, screws (true), accentColor,
  padding (16)
- Notes:
  - Skin map drives background gradient + texture. Each skin defines
    its own screwColor and default text color.
  - 5 skins: brushed-metal (gradient + repeating vertical lines),
    wood (dark walnut radial + grain stripes), vintage-cream (cream
    + subtle radial blots), black-rack (dark gray gradient w/ subtle
    glow), blue-bezel (navy blue radial).
  - Screw component is internal; each corner gets a 10x10 round
    "slot screw" with a rotated dark slot line.
  - accentColor prop overrides default border for plugin theming.
  - Children wrapped in zIndex:1 so screws sit beneath them visually.

## AnalogKnob.js — DONE
- File: src/front/js/component/audio/HardwareUI/AnalogKnob.js
- Lines: ~210
- Props: value, min (0), max (1), onChange, style ("chickenhead"|
  "vintage"|"modern"), size (60), color ("#1a1a1a"),
  indicatorColor ("#fff"), label, valueLabel, step, accentColor
- Notes:
  - Drag UX: vertical pointer drag, sensitivity 200px = full range,
    up=increase / down=decrease (matches existing <Knob> in
    SPXPlugins.js but with a slightly larger pixel range since these
    knobs are bigger).
  - Sweep -140deg..+140deg (280deg total), same as existing <Knob>.
  - Vintage: bakelite radial gradient + thin notch line; uses unique
    SVG gradient ID per (size,color) so multiple instances don't
    collide on the same page.
  - Chickenhead: triangular pointer projecting beyond the body
    circle, with extra outer canvas room for the pointer overhang.
  - Modern: flat fill + simple line indicator.
  - `step` snapping respected when provided.
  - `valueLabel === false` suppresses the formatted value display
    (allows "knob with only label" usage).

## ProgramBank.js — DONE
- File: src/front/js/component/audio/HardwareUI/ProgramBank.js
- Lines: ~115
- Props: programs ([{id,name}]), currentId, onChange,
  orientation ("horizontal"|"vertical"), ledColor ("#ff8844"),
  buttonColor ("#2a2a2a"), accentColor ("#ff8844"), size (36)
- Notes:
  - Square button with small LED dot above the program name.
  - Active: sunken inset shadow, lit LED with glow filter, accent
    border + text shadow on label.
  - Inactive: raised gradient highlight, dark LED dot.
  - Name is ellipsis-truncated to fit `size`.
  - Used by OptoPress and other vintage-style plugins for preset
    memory recall (visual only — semantics owned by parent).

## Build verification — DONE
Command: `npx webpack --config webpack.prod.js`
Result:  webpack 5.99.9 compiled with 9 warnings in ~200s.
- All 9 warnings are pre-existing (large-image precache thresholds,
  bundle entrypoint size limit). None mention HardwareUI files or
  reference any of the 6 new components.
- No errors, no syntax issues, no missing imports.
- Components correctly tree-shaken out of bundle (none are imported
  anywhere yet — that wiring lands in F4-A.7 as instructed).

## Summary
6 hardware-aesthetic UI primitives shipped to
`src/front/js/component/audio/HardwareUI/`:
  - VUMeter.js          — analog VU needle, cream face, red zone
  - LEDLadder.js        — vertical/horizontal LED strip (GR meters)
  - ButtonBank.js       — chunky raised buttons (FET ratio, modes)
  - HardwarePanel.js    — 5 panel skins + corner screws
  - AnalogKnob.js       — vintage / chickenhead / modern knobs
  - ProgramBank.js      — preset memory buttons w/ LED indicator

Conventions followed:
  - Functional React, hooks only.
  - Inline styles, no CSS files.
  - Default exports, JSDoc-style header on each file.
  - No external state / no shared CSS classes — props in only.
  - No imports from these in any existing plugin (F4-A.7 will wire).
  - No edits to RecordingStudio.js, SPXPlugins.js, or any existing
    component.

Branch: `claude/fix-recording-studio` — no commit, no push.






