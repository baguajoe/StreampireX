## Bug #2: Can't delete plugin inserts (right-click + hover-X)
**User-visible symptom:** User wants to remove an insert from a track's effects chain. Right-click on the insert tile/label should show a delete option, OR hovering should show an "X" button. In the Arranger view (split-screen), the inserts have no context menu or hover-X. Only the Console view has the hover-X button and right-click context menu wired up.

**Code location:** 
- Insert tile rendering (Arranger): `/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js:6882-6885` — missing `onContextMenu` and "X" button handlers
- Insert tile rendering (Console): `/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js:7094-7101` — has both context menu and hover-X
- Context menu handler: `:7058-7066`
- removeInsert function: `:5697-5706` (wired correctly)
- CSS for hover-X: `/workspaces/SpectraSphere/src/front/styles/RecordingStudio.css:127-128` (opacity:0 until hover)

**Root cause:** The Arranger view insert slots (line 6882-6885) are missing the `onContextMenu` event handler and the visual "X" button element. The Console view (7094-7101) has both implemented and working. This is an incomplete feature rollout across two view modes.

**Category:** UI (missing event handlers + button element in one view mode)

**Difficulty:** Tiny (<30min)

**Shared with:** none

**Dependencies:** none

**Fix approach:** Add `onContextMenu` handler and `<button className="daw-ch-insert-x">×</button>` element to the Arranger view insert slot (line 6882-6885), matching the Console view implementation at lines 7094-7101. The handler and button are already proven to work in Console view; copy-paste the pattern with the same `setInsertCtxMenu` call and `removeInsert` onClick binding.

---

## Bug #3: Playback loop ignored when browser tab loses focus
**User-visible symptom:** Cycle/loop is enabled. User switches tabs (blur event). Audio drifts past loop end and never wraps back to loop start. When tab regains focus, playback may be stuck or way past where it should be.

**Code location:**
- Loop check logic: `/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js:5276-5295` — uses `requestAnimationFrame(check)` to drive loop wrapping
- setInterval driving currentTime updates: `:5448-5454` (50ms ticks, but throttled to ~1000ms in background tabs)
- useEffect wiring: `:5297-5300`
- No visibility change listener found in grep

**Root cause:** The loop wrap is driven by `requestAnimationFrame` (line 5292), which fires in the main thread — but browsers severely throttle or pause RAF in background tabs. Concurrently, the playback time is updated by `setInterval(..., 50)` at line 5448, which also gets throttled to ~1000ms+ in background tabs. When the tab loses focus, `rAF` pauses and the loop check stops running. Audio context continues to advance in the background, so `audioCtxRef.current.currentTime` keeps growing. When the tab is visible again, the next `rAF` fires and detects that `beatNow >= cycleEnd`, but by then the playback has drifted past the loop point and the wrap is late. The 50ms UI timer also misses updates, so `currentTime` display freezes or jumps.

**Category:** Architectural (RAF + setInterval both freeze in background tabs; loop wrap depends on these)

**Difficulty:** Small (30-60min)

**Shared with:** none

**Dependencies:** none

**Fix approach:** Replace `requestAnimationFrame` in `startLoopCheck` with a `setInterval(..., 50)` running on a separate ref, so the loop check survives background tab throttling (same 50ms cadence as the UI timer, coupled). Alternatively, use AudioContext's `scheduled` events (OfflineAudioContext or a custom timing reference) if precise audio-thread timing is required, but a 50ms CPU-side interval will be "good enough" for cycle wrap. Test: enable cycle, start playback, switch tabs for 5+ seconds, switch back — audio should still be looping, not drifted. Also verify that `playOffsetRef` and `playStartRef` are consistent after tab return.

---

## Bug #5: Transport "Rewind" jumps to 0; Fast Forward missing
**User-visible symptom:** User expects rewind = ±1 bar per click, hold = scrub continuously. Currently rewind just jumps to position 0 (no bar-step); Fast Forward button doesn't exist.

**Code location:**
- rewind() function (legacy): `/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js:5467` — hard-codes jump to 0
- New scrub helpers (startScrub, stopScrub, seekBy, projectMaxDuration): `:5473-5511`
- Keyboard shortcut still using old rewind(): `:6591` — `case "transport:rewind": rewind(); break;`
- New transport buttons (Rewind + FF): `:7747-7765` — wired to `startScrub(±1)` with `onMouseDown/Up/Leave` and touch handlers
- Disabled during recording: `disabled={isRecording}`
- useEffect cleanup for scrub state: `:5511` — `useEffect(() => () => stopScrub(), [])`

**Root cause:** A partial fix has been applied to the transport buttons (Rewind uses `startScrub(-1)`, FF uses `startScrub(1)`), and the helpers are correctly implemented. However, the keyboard shortcut for "transport:rewind" still calls the old `rewind()` function which unconditionally jumps to 0, bypassing the new 1-bar logic. This creates an inconsistency: mouse button and touch gestures use the new bar-step behavior, but keyboard shortcut uses the old jump-to-0 behavior.

**Category:** UI (inconsistent behavior across input modalities)

**Difficulty:** Tiny (<30min)

**Shared with:** none

**Dependencies:** none

**Fix approach:** Verify and lock in the implementation. The new helpers (`seekBy`, `startScrub`, `stopScrub`, `projectMaxDuration`) are correctly implemented (lines 5473-5510): `seekBy` clamps to [0, max], immediate ±1 bar click works, hold >250ms triggers 50ms scrub at 1/4 bar per tick. The cleanup useEffect (5511) correctly stops timers on unmount. Transport buttons (7747-7765) are properly wired and disabled during recording. **Only gap:** Update the keyboard shortcut handler at line 6591 to call `startScrub(-1)` instead of `rewind()`, or create a new legacy-free `rewindByBar()` helper that both the shortcut and button call. Also verify: Does fast-forward need a keyboard shortcut too (e.g., "transport:ff")? Check if there's an existing keyboard map expecting it. After fix, test all three input modes (button click, keyboard, touch hold) to confirm ±1 bar movement and continuous scrub on hold >250ms.

