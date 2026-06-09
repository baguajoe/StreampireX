# Phase F2 — Loop Tab Blur Fix (Bug #3)

## Change in `src/front/js/pages/RecordingStudio.js:5278–5313`

`startLoopCheck` rewritten:
- `requestAnimationFrame` → `setInterval(check, 50)` for the per-tick wrap detector
- `cancelAnimationFrame` → `clearInterval` everywhere `loopCheckRef.current` is cleared
- Cleanup useEffect now returns a teardown function that clears the interval on unmount

### Why
- `rAF` is paused/throttled in background tabs while `AudioContext.currentTime` keeps advancing. The playhead drifts past `cycleEnd` and the wrap either fires very late or not at all.
- `setInterval` is also throttled in background tabs (typically ≥1000ms), but the callback still **fires**. Wrap engages within ~1s of `cycleEnd` instead of waiting for the tab to regain focus.

### Tradeoff
- 50ms cadence instead of ~16ms (rAF). Loop wraps that hit between two ticks may miss `cycleEnd` by up to 50ms in foreground (still imperceptible — the source rebuild happens at exactly `cycleStartSec`, the wrap-detection is just a few ms late).
- For sample-accurate looping we'd need to schedule wrap as a one-shot `setTimeout` re-armed at each cycle, computing the wakeup from `cycleEnd - cycleStart` against the audio clock. Out of scope for beta.

## Build
`webpack 5.99.9 compiled with 9 warnings in 189647 ms` — size warnings only, 0 errors.

## What user should smoke-test
1. Set cycle markers (e.g., bars 0–4).
2. Start playback.
3. Switch to another browser tab for 10+ seconds.
4. Switch back. Playback should still be cycling within `[cycleStart, cycleEnd]`, not drifted past.

## Status: F2 complete. Proceeding to F3 (instrumentation, then PAUSE).
