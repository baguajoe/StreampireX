# Phase F4-A.7B — Console Simulator UI

Branch: `claude/fix-recording-studio`. Build verification via `npx webpack --config webpack.prod.js`.

## Plan
1. Promote `applyConsoleCharacter` to PluginInstance shape with 11 live AudioParams.
2. Build `ConsolePanel.js` UI component (knobs, family theming).
3. Family-themed aesthetics (ssl, neve, api, trident, vintage).
4. Wire dropdown → ConsolePanel display state + onParamChange.
5. Display location for per-track and master.
6. Visual feedback for active console (border tint + ACTIVE badge).
7. Save/Load presets in localStorage `spx-console-presets-v1`.

---

## Step 1: Promote 11 hard-coded params to live AudioParams — DONE
- Files: `src/front/js/pages/RecordingStudio.js`
- Lines added: ~140
- Build status: clean (size warnings only)
- Changes:
  - Added top-level `CONSOLE_FACTORY_PARAMS` map (named-key shape, replaces inline `configs` array).
  - Added top-level `CONSOLE_FAMILY` map (boardId → "ssl" | "neve" | "api" | "trident" | "vintage").
  - Refactored `applyConsoleCharacter` to (1) read from the named-param map, (2) accept
    optional `opts.params` override, (3) accept `opts.trackId` and register a PluginInstance
    under `${trackId}:console` (or `master:console`) via existing `registerInstance`.
  - Live setParam covers all 11 params: HPF freq/Q, sat-in drive/asym, low-shelf freq/gain,
    high-shelf freq/gain, sat-out drive/asym, output gain. Drive/asym rebuild WaveShaper
    curves; the rest ramp via setTargetAtTime (TAU=10ms).
  - Added state: `trackConsoleParams` (per-track), `masterConsoleParams`, `openConsolePanel`
    (which panel is visible), `consoleABSlot` (A/B compare slots).
  - Added helpers: `selectTrackConsole`, `selectMasterConsole`, `updateTrackConsoleParam`,
    `updateMasterConsoleParam`, `resetTrackConsole`, `resetMasterConsole`. `_board` field
    in params object tags which factory baseline is loaded so re-selecting the same board
    preserves user tweaks.
  - All 4 dropdown onChange handlers + analog-subview rapid-set buttons + SPXMonitorSelector
    onConsoleChange now route through wrappers so params get seeded automatically.
  - All 4 wiring sites (live mixer track, live mixer bus, master useEffect, master
    initial setup, playback per-track) pass `{ trackId, params }` to applyConsoleCharacter.
  - Project save/load now persists `track_console_params` and `master_console_params`.
  - Added "EDIT" button next to non-`none` console dropdowns (track + master) to open
    the ConsolePanel. Clicking again toggles closed.

## Step 2: Build ConsolePanel.js — DONE
- Files: `src/front/js/component/audio/ConsolePanel.js` (new file, ~280 lines)
- Build status: clean
- Layout: header (color dot + name + family tag + target subtitle + A/B + RESET + close ×),
  6 rows (HPF, SAT IN, LOW SHELF, HI SHELF, SAT OUT, OUTPUT), preset menu footer.
- Each row has a left vertical accent bar in the family-themed `rowAccent` color.
- ParamKnob wrapper reads min/max/label/format from a top-level `PARAM_SPECS` map.
- AsymToggle is a 2-button ButtonBank (LIN / ASYM) for the two saturation stages.
- OUTPUT row's level meter switches between `LEDLadder` (ssl/api families) and
  `VUMeter` (neve/trident/vintage families) based on `theme.meter`.
- VU meter is fed by an optional `postOutputAnalyser` prop. When the parent
  doesn't supply one, the meter just sits at 0 — no error.

## Step 3: Per-family aesthetic theming — DONE
- ssl: `black-rack` skin, modern square knobs, LED ladder meter.
- neve: `vintage-cream` skin with red trim, vintage chunky knobs, VU needle.
- api: `blue-bezel` skin, modern silver knobs, LED ladder.
- trident: `vintage-cream` with green accent, vintage knobs, VU needle.
- vintage: `wood` skin, chickenhead knobs, VU needle (Studer/MCI/EMI/Helios/
  Amek/Harrison/Sony/Calrec).
- All themes use `consoleColor` from `CONSOLE_BOARDS` as the panel border accent
  + header dot, so each board is still visually distinct within its family.

## Step 4 + 5: Wire dropdown → ConsolePanel display — DONE
- Files: `src/front/js/pages/RecordingStudio.js`
- Added `import ConsolePanel from '../component/audio/ConsolePanel'`.
- Added "EDIT" button next to non-`none` console dropdowns (per-track + master).
  Clicking it sets `openConsolePanel` to the track id (or "master"); clicking
  again toggles closed. The button is colored by the active console.
- Render uses an existing `<DraggablePanel>` (floating window pattern, matches
  the FX panel UX) — opens at `window.innerWidth - 580, 120`.
- Bound props:
  - `params` ← `trackConsoleParams[trackId]` (or `masterConsoleParams`),
    falling back to `CONSOLE_FACTORY_PARAMS[boardId]` so a freshly-selected
    board shows factory values even before the user tweaks anything.
  - `onParamChange` ← `updateTrackConsoleParam` / `updateMasterConsoleParam`
    which update state AND ramp the live AudioParam via the registered
    PluginInstance setParam.
  - `onReset` ← `resetTrackConsole` / `resetMasterConsole` (state + setParam ramp).
  - `onAB` ← caller-managed slot in `consoleABSlot` keyed by `master` or
    `track:${id}`; first click stores B snapshot, subsequent clicks swap.
  - `onLoadPreset` ← reads from localStorage `spx-console-presets-v1`,
    applies via setState + setParam ramps.
  - `onClose` ← clears `openConsolePanel` (DOES NOT change dropdown selection
    or stop DSP).

## Step 6: Visual feedback for active console — DONE
- Per-track: when `trackConsoleChar[t.id]` is non-`none`, the channel strip's
  `<div className="daw-channel">` gets an inline `borderLeft: 3px solid <color>`,
  and the header shows a small "● ACTIVE" badge in the console color (with glow).
- Master channel: same treatment.
- Bypass / `none` → no border tint, no badge (graceful fallback).
- Color is `CONSOLE_BOARDS[boardId].color` — matches the existing per-board
  accent palette so users build pattern recognition.

## Build status — final
- `npx webpack --config webpack.prod.js` → clean (only pre-existing size warnings).
- No ESLint errors introduced.

## Save/Load presets
- localStorage key: `spx-console-presets-v1`
- Storage shape: `{ [consoleId]: { [presetName]: paramsObj } }`
- Implemented inline in ConsolePanel (`PresetMenu` sub-component): name input
  + SAVE button, "load" dropdown (existing names), "delete" dropdown (with
  confirm prompt). Presets are scoped per-console — saving "warm" on Neve 1073
  doesn't pollute the SSL 4000E preset list.
- Factory baseline accessed via the RESET button (no separate "factory" entry
  in the preset list).

## Wiring sites updated to pass `{ trackId, params }` to applyConsoleCharacter
- `:1217` master useEffect rebuild
- `:6019`-equivalent — initial master setup in `getCtx()` (now ~6022)
- `:5937`-equivalent — `ensureTrackGraph` (now ~5940)
- `:5964`-equivalent — `ensureBusGraph` (now ~5967)
- `:6213`-equivalent — `buildPlaybackSources` per-track playback (now ~6216)

## Files changed
- `src/front/js/pages/RecordingStudio.js` (state, helpers, refactored DSP,
  dropdown rewires, EDIT buttons, ConsolePanel render block, ACTIVE badges)
- `src/front/js/component/audio/ConsolePanel.js` (new)
- `audit_progress/phase_f4a7b_console.md` (this file)

