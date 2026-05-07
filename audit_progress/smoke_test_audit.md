# Recording Studio — Smoke Test Audit (8 bugs)

Read-only audit of 8 bugs reported in browser smoke test. No source files modified.
Source-of-truth batch files: `smoke_audit_batch_1.md`, `smoke_audit_batch_2.md`, `smoke_audit_batch_3.md` (this is the consolidation).

---

## Bug #1: Compressors don't audibly compress

**User-visible symptom:** User cranks threshold/ratio (e.g., -40 dB / 20:1) on the basic `compressor` plugin. Makeup gain knobs make audio louder, but no dynamic reduction is heard. Native `DynamicsCompressorNode` works in isolation. Tested with extreme settings — still no compression.

**Code location:** `src/front/js/pages/RecordingStudio.js:5681` (updateEffect dispatch), `:6631` (afx calculation), `:7651` (SPXPluginHost dispatch). Build-time registration: `:1376`.

**Root cause:** Registry key mismatch between build-time and dispatch-time. `registerInstance(track.id, ...)` stores under `${track.id}:${pluginKey}` at build time. `updateEffect` looks up `${tracks[ti]?.id}:${fx}` (fresh state lookup); SPXPluginHost dispatch uses `afx.id` where `afx = tracks[activeEffectsTrack]`. If a track is deleted/reordered, or if `track.id` is not stable across state updates, the registered key and the lookup key diverge → `inst.setParam` silently no-ops → AudioParam stays at build-time value while the UI knob position changes locally.

**Category:** Architectural

**Difficulty:** Medium (1-3h)

**Shared with:** none

**Dependencies:** Verify `track.id` is generated once at creation and immutable through state updates.

**Fix approach:** Instrument first (one console.warn in `updateEffect` when `inst` is undefined, one in `registerInstance` logging the trackId+pluginKey) — confirm whether the lookup actually misses in practice. If yes, audit `track.id` stability; replace array-index dispatch with explicit trackId pass-through; consider a closure-captured trackId at build time. Avoid blind refactor without confirming the miss is real — earlier audit could not rule out factory-side issues entirely.

---

## Bug #2: Can't delete plugin inserts (right-click + hover-X)

**User-visible symptom:** In the Arranger view, right-clicking an insert tile or hovering for an X button does nothing. Console view works.

**Code location:**
- Arranger insert tile (broken): `src/front/js/pages/RecordingStudio.js:6882–6885` — no `onContextMenu`, no X button
- Console insert tile (works): `:7094–7101` — has both
- `removeInsert` function (already correct): `:5697–5706`
- Context menu handler: `:7058–7066`
- Hover-X CSS: `src/front/styles/RecordingStudio.css:127–128`

**Root cause:** Incomplete feature rollout — the Arranger view's insert slot was rendered without the same handlers and X-button element that exist on the Console view. `removeInsert` itself works correctly.

**Category:** UI

**Difficulty:** Tiny (<30min)

**Shared with:** none

**Dependencies:** none

**Fix approach:** Copy the `onContextMenu` handler and `<button className="daw-ch-insert-x">×</button>` element from the Console view (`:7094–7101`) into the Arranger view tile (`:6882–6885`), preserving the same `setInsertCtxMenu` and `removeInsert` bindings.

---

## Bug #3: Playback loop ignored when browser tab loses focus

**User-visible symptom:** Cycle/loop is enabled. User switches tabs. Audio drifts past loop end and never wraps. When tab regains focus, playback may be stuck or far past the loop point.

**Code location:**
- Loop check (uses `requestAnimationFrame`): `src/front/js/pages/RecordingStudio.js:5276–5295`
- UI timer (50ms `setInterval`): `:5448–5454`
- useEffect wiring: `:5297–5300`
- No `visibilitychange` listener exists

**Root cause:** Loop wrap is driven by `requestAnimationFrame`, which is paused/severely throttled in background tabs. AudioContext clock keeps advancing in the background, so the playhead drifts past `cycleEnd`. When the tab returns, `rAF` resumes but the wrap is already late; the 50ms `setInterval` is also throttled to ~1000ms, so currentTime jumps.

**Category:** Architectural

**Difficulty:** Small (30-60min)

**Shared with:** none

**Dependencies:** none

**Fix approach:** Replace `requestAnimationFrame` in `startLoopCheck` with `setInterval(..., 50)` — this is also throttled in background but to ~1s, which is good enough for cycle wrap correctness. For tighter timing, use `AudioContext.suspend/resume` semantics or schedule wrap as a one-shot at `cycleEnd - cycleStart` seconds ahead via `setTimeout` re-armed each cycle (audio-clock based, immune to tab visibility). Test by enabling cycle, switching tabs for 5+ seconds, switching back — playback should still be cycling.

---

## Bug #4: Click-drag track selection in arrange view broken

**User-visible symptom:** User drags in empty area of arrange view to make a marquee selection. No selection box appears, no clips selected.

**Code location:** `src/front/js/component/ArrangerView.js:1431–1458` (track lanes render regions, no marquee handler), `:893` (single `selectedRegion` state), `:1207–1209` (deletion uses single selection only). Region click handlers at `:294, 339, 348, 374`.

**Root cause:** Marquee selection has not been implemented. Each region individually calls `onSelect(region.id)` on click. There's no `onMouseDown` handler on the empty timeline/lane container, no selection box overlay, and no bounding-box filter on release. The state model is single-selection (`selectedRegion: id`), not multi-selection.

**Category:** Pre-existing (never built)

**Difficulty:** Medium (1-3h)

**Shared with:** none

**Dependencies:** Decide whether to extend `selectedRegion` to a `Set<id>` or add a new `selectedRegions` array. This decision rules subsequent multi-region operations (delete, drag-move).

**Fix approach:** Add `onMouseDown` to a parent overlay or `.arr-timeline-content`, capture start coords, render a semi-transparent selection box on `onMouseMove`, and on `onMouseUp` filter regions whose bounding boxes intersect the box and set them as selected. Migrate single-`selectedRegion` state to `Set<id>` so multi-select works for delete/copy/move. Watch for click-vs-drag threshold (≥4px movement before treating as drag) so single clicks on regions don't trigger marquee.

---

## Bug #5: Transport "Rewind" jumps to 0; Fast Forward missing

**User-visible symptom:** User expects rewind = ±1 bar per click, hold = scrub continuously. Currently rewind just jumps to 0; FF doesn't exist.

**Code location:**
- `rewind()` (legacy, jumps to 0): `src/front/js/pages/RecordingStudio.js:5467`
- New scrub helpers (`seekBy`, `startScrub`, `stopScrub`, `projectMaxDuration`): `:5469–5511` (already added this session, uncommitted)
- New transport buttons (Rewind + FF): `:7702–7724` (already added this session, uncommitted)
- Keyboard shortcut (still calls legacy `rewind()`): `:6547`
- useEffect cleanup: `useEffect(() => () => stopScrub(), [])` at the helper block

**Root cause:** Partial fix is already in place — the buttons and helpers correctly handle ±1-bar click and 50ms hold-to-scrub. The keyboard shortcut at `:6547` (`case "transport:rewind"`) still calls the legacy `rewind()` which jumps to 0. Inconsistency between mouse/touch and keyboard.

**Category:** UI

**Difficulty:** Tiny (<30min)

**Shared with:** none

**Dependencies:** none

**Fix approach:** Verify and lock in. Decide whether `transport:rewind` keyboard shortcut should match the new bar-step behavior (call `startScrub(-1)`) or keep "go to start" semantics (Cubase has both — `R` for rewind, `Home` for goToZero). Add a corresponding `transport:fastForward` shortcut. After choice: one-line edit at `:6547`. If keeping the legacy `rewind()` available as "go to zero," consider renaming it `goToStart()` for clarity.

---

## Bug #6: Toolbar in arrange view missing tools

**User-visible symptom:** Standard DAW arrange toolbar is missing object selection, range selection, split, glue, eraser, mute, draw/pencil tool-mode buttons.

**Code location:** `src/front/js/component/ArrangerView.js:1234–1323` (toolbar render).

**Root cause:** The toolbar renders only transport, BPM, time signature, snap, zoom, cycle, master volume, bounce, save, track height. No tool-mode buttons exist; no `toolMode` state. The Region component's right-click context menu (`:1449`, `handleRegionContextMenu`) provides some equivalents, but there's no toolbar mode selector that switches click semantics.

**Category:** Pre-existing

**Difficulty:** Small (30-60min) for buttons + state; Medium if all tool behaviors are wired up

**Shared with:** Partial overlap with Bug #4 — adding a "range" tool and a marquee handler are conceptually paired; doing them together avoids double-touching the same area.

**Dependencies:** Bug #4 (range selection tool needs marquee implementation).

**Fix approach:** Add a `toolMode` state and a button group in the toolbar (between snap and zoom). Render buttons for select / range / split / glue / eraser / mute. On click, set the mode. In Region's onClick, branch on the active tool (split: call existing `splitRegion`; eraser: delete; mute: toggle `region.muted`). For "range" mode, defer to Bug #4's marquee implementation. Visually highlight the active tool and adjust the cursor.

---

## Bug #7: Microphone records mono in one ear only

**User-visible symptom:** Mic records but plays back in only one channel. Should be centered in both.

**Code location:** `src/front/js/pages/RecordingStudio.js`:
- Recording setup: `:5545–5656` (`startRecording`)
- Decode + workaround (mono→stereo materialization): `:5607–5635`
- Playback chain: `:5304–5347` (`buildPlaybackSources`)
- ChannelSplitter (analyser only): `:5314`
- StereoPanner (no explicit channel config): `:5313`

**Root cause:** Mono `MediaRecorder` output decodes to a 1-channel AudioBuffer. Standard Web Audio behavior is to upmix mono → stereo when feeding a `StereoPanner`, but only if `channelCountMode: "max"` is preserved through the chain. Some effect nodes in the FX chain have `channelCountMode: "explicit"` which pins channel count and prevents upmixing → mono routes to L only.

**Current state:** A workaround exists at `:5623–5635` that materializes a 2-channel buffer at decode by copying mono → both L/R. This solves the symptom but the underlying upmixing is still broken for any future mono source.

**Category:** Pre-existing / Architectural (workaround in place)

**Difficulty:** Small (30-60min) if proper fix; Tiny if we accept the workaround is "good enough."

**Shared with:** none

**Dependencies:** Need to identify which exact effect node sets `channelCountMode: "explicit"` and why. If it's intentional (e.g., for M/S processing), the workaround is the right answer.

**Fix approach:** **Option A (proper):** find the offending node and either drop the explicit channel mode or wrap the source with a `ChannelMerger`/`ChannelSplitter` pair to force speakers-mode upmix; remove the materialization workaround. **Option B (pragmatic):** keep the workaround but add a comment at `:5623–5635` documenting it's a duct-tape fix and pointing to the right architectural fix. Verify the workaround actually executes for ALL mono sources (re-record, re-load from project, drag-and-drop import).

---

## Bug #8: Recording meters don't show levels during recording

**User-visible symptom:** During recording, the armed track's meter stays dark. After stopping, the waveform appears with retroactive levels. Expected: real-time meter movement during recording.

**Code location:** `src/front/js/pages/RecordingStudio.js`:
- Recording start: `:5545–5656` (`startRecording`)
- Meter animation loop: `:5179–5204` (`startMeterAnimation`)
- Track analysers populated only for tracks with audioBuffer: `:5310` (`if (!t.audioBuffer) { trackAnalysersRef.current[i] = null; return; }`)
- Input analyser (works during recording): `inputAnalyserRef` attached to mic stream at `:5576`
- Top input monitor uses inputAnalyserRef: `:6728`

**Root cause:** `buildPlaybackSources` creates per-track analysers only for tracks with an existing `audioBuffer`. The armed track has none yet → `trackAnalysersRef.current[i] = null` → meter loop returns zeros for that index. The mic-side `inputAnalyserRef` is alive and feeds the *top* monitor, but isn't piped into the per-track meter renderer.

**Category:** Pre-existing / Architectural

**Difficulty:** Tiny (<30min)

**Shared with:** none

**Dependencies:** none

**Fix approach:** Wire `inputAnalyserRef` into `trackAnalysersRef.current[armedTrackIndex]` at recording start (and clear on stop), OR teach the meter loop at `:5184–5191` to fall back to `inputAnalyserRef` when the per-track entry is null and the track is armed and recording. The first option is cleaner — just one assignment in `startRecording` after the analyser is created, paired with a cleanup in `stopRecording`.

---

# SUMMARY

## Shared root causes

- **Bugs #4 and #6** both live in `ArrangerView.js` and both require touching the same toolbar/timeline area. Bug #6's "range" tool requires Bug #4's marquee. **Tackle these together** to avoid double-editing the same render path.
- **Bugs #1 and #5** both involve `RecordingStudio.js` transport/dispatch logic but are otherwise unrelated. No shared root cause.
- **Bugs #7 and #8** both relate to the recording path but address different stages (signal channels vs. metering analyser). No shared fix.

No single change resolves multiple bugs at once.

## Free / near-free fixes (high value, low effort)

| Bug | Effort | One-liner? | Notes |
|---|---|---|---|
| #5 (transport keyboard shortcut consistency) | Tiny | ~1 line | Partial fix already in place; just sync the keyboard shortcut |
| #2 (insert delete in Arranger) | Tiny | ~5 lines | Copy-paste from Console view |
| #8 (recording meter) | Tiny | ~3 lines | Wire `inputAnalyserRef` into armed track entry |

These three together = ~30 min of work; clear three bugs.

## Recommended fix order

1. **Bug #5** — verify and lock keyboard shortcut (Tiny). Already 90% done.
2. **Bug #2** — copy hover-X handlers into Arranger (Tiny). Self-contained.
3. **Bug #8** — wire `inputAnalyserRef` into armed track meter (Tiny). Self-contained.
4. **Bug #3** — swap RAF for setInterval / audio-clock setTimeout for loop wrap (Small). Self-contained, no UI ripple.
5. **Bug #7** — decide accept-workaround vs. proper fix (Small/Tiny). Document the choice in code.
6. **Bug #1** — instrument the dispatch path first; only refactor if logs confirm registry miss (Medium). Don't blind-refactor.
7. **Bug #4 + Bug #6 together** — design multi-select state model, then implement marquee + toolbar tools in one pass (Medium combined). These touch the same files.

This order front-loads three Tiny wins, defers the riskiest (compressor — which is suspected but not confirmed), and groups the two ArrangerView bugs.

## Bugs to defer (if session time-constrained)

- **Bug #4 + #6** — Medium combined; benefits from careful design pass on multi-selection state model. Defer if other bugs are higher user-visible priority.
- **Bug #1** — Medium AND uncertain. The earlier audit could not pin the root cause; instrument-first is mandatory. If logs come back inconclusive, defer for a focused investigation session rather than spending hours guessing.

## Outstanding pre-fix work

- Bug #1: add console instrumentation to confirm the registry-miss hypothesis before any refactor.
- Bug #4: choose `Set<id>` vs. array for multi-select state.
- Bug #5: choose whether `transport:rewind` shortcut goes to bar-step or keeps "go to zero" semantics.
- Bug #7: decide accept-workaround vs. proper fix.
