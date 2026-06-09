# Phase F1.4 — Mic Live Monitor Fix (Bug #7)

## Changes in `src/front/js/pages/RecordingStudio.js`

### 1. New refs at `:1072–1073`
```js
const micSplitterRef = useRef(null);
const micMergerRef = useRef(null);
```

### 2. Live monitor wiring at `:5575–5594` — splitter+merger forces mono→stereo upmix
Before:
```
src → analyser
src → recMon → ctx.destination
```
After:
```
src → splitter(2)
splitter[0] → merger[0]
splitter[0] → merger[1]
merger → analyser
merger → recMon → ctx.destination
```
Splitter takes channel 0 from the source (the mic). Merger writes that channel into BOTH outputs. Handles three input shapes uniformly:
- True mono (1-channel source) — ch.0 mirrored to L+R, centered.
- 2-channel-silent-R (USB/aggregate interfaces) — ch.0 mirrored to L+R, no silent-R artifact.
- True stereo — ch.0 (L) mirrored to L+R; the R input is dropped. Acceptable for a single-mic input; the audit explicitly didn't ask for true-stereo capture.

### 3. Cleanup at `stopRecording` (`:5673`)
Disconnect splitter and merger; null both refs.

### 4. Honest comment at `:5623–5635` on the post-decode 1-channel workaround
Replaced the misleading "playback chain SHOULD upmix" comment with a precise note: workaround only fires for 1-ch buffers, does NOT cover 2-ch-with-silent-R, live monitoring is now handled upstream by the splitter+merger, and the capture-side proper fix is tracked as Phase E post-beta cleanup.

## What's still unfixed
- **Recording capture path:** `MediaRecorder` reads the raw `MediaStream`, not the AudioNode graph. So the recorded blob may still arrive as 2-ch-with-silent-R from the OS/browser. Listed in the new comment as Phase E. Fix path: route the upmixed graph through a `MediaStreamDestination` and pass that stream to `MediaRecorder` instead of the original.

## Build
`webpack 5.99.9 compiled with 9 warnings in 188135 ms` — size warnings only, 0 errors.

## Status: F1.4 complete. Proceeding to F2.
