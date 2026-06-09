# Phase F1 — Three Tinies Applied

## Bug #5: Transport keyboard shortcuts (bar-step + go-to-start)
**File:** `src/front/js/pages/RecordingStudio.js:6591`
**Change:** Replaced `case "transport:rewind": rewind(); break;` with three cases:
- `transport:rewind` → `seekBy(-(60/bpm) * timeSig[0])` — single bar back
- `transport:fastForward` → `seekBy(+(60/bpm) * timeSig[0])` — single bar forward
- `transport:goToStart` → `rewind()` — legacy "jump to 0" preserved under explicit name

**Decision applied:** Keyboard `transport:rewind` matches button bar-step. Keyboard auto-repeat (key held) gives multi-bar steps natively — no need for explicit hold-to-scrub on keyboard. The legacy `rewind()` function is intact, just now reachable via `transport:goToStart` if any UI/binding wants jump-to-zero behavior.

**Note:** The keymap → command binding (where `transport:fastForward` should appear) lives in whatever component sends these strings. Audit found no existing `transport:fastForward` cases, so the case is wired but no key is bound to it yet — that's a separate UI hookup if/when desired.

## Bug #2: Insert delete in Arranger view
**File:** `src/front/js/pages/RecordingStudio.js:6881–6890`
**Change:** Added `onContextMenu` handler and `<button className="daw-ch-insert-x">` element to the Arranger view insert tile, mirroring the Console view tile at `:7094–7101`. Both handlers use the existing `setInsertCtxMenu` and `removeInsert` — no new state/functions needed.

## Bug #8: Recording meter wiring
**File:** `src/front/js/pages/RecordingStudio.js:5654` (after `startPlayback(true)` in `startRecording`)
**Change:** After `startPlayback(true)` runs (which nulls the armed track's analyser slot because the track has no audioBuffer yet), write the live mic `inputAnalyserRef.current` into `trackAnalysersRef.current[ai]` as both left and right (mic is mono). Cleanup is automatic — `stopRecording` calls `stopPlayback` which clears `trackAnalysersRef.current = []` wholesale.

**Race window:** ~16ms between `startPlayback` returning and the assignment. The next meter-loop frame picks up the new entry. Acceptable.

## Build
`npx webpack --config webpack.prod.js` — clean (9 size warnings only, 0 errors).

## What user should smoke-test
- **Bug #5:** Bind a key to `transport:rewind` and `transport:fastForward` if not already bound; press → playhead moves ±1 bar (during play AND when stopped). Hold → multi-bar via OS auto-repeat.
- **Bug #2:** In Arranger view, right-click an insert tile → context menu (existing handler already wired). Hover over insert tile → "×" button visible → click removes the insert.
- **Bug #8:** Arm a track, press Record. The armed track's meter should now move during recording, not just after.

## Status: F1 complete. Ready for F2.
