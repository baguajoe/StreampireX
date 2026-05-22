# Phase F4-C — Part 1: Track Strip Meter Audit + Fix

## Diagnosis (pre-fix)

**Audio graph map** (per track, from `RecordingStudio.js`):

There are **two** parallel graph constructions per track:

### A. Recording graph (`ensureTrackGraph` line 6100, `ensureBusGraph` line 6126)
```
input → preGain → [fxNodes] → panNode → fader → meter → consoleNodes(via consoleOut) → dest
```
- `meter` AnalyserNode created at line 6106 / 6132 sits between `fader` and `consoleOut`
- `applyConsoleCharacter(ctx, meter, consoleOut, ...)` (line 6113 / 6138) means `meter` is the *input* to the console — meter is post-fader pre-console
- **Used for: bus routing only.** This graph carries signal when one track's `consoleOut` feeds another track's `input` (bus target).
- **`meter` is NEVER consumed by the UI.** No grep hit for any code reading from `trackNodesRef.current.[id].meter`.

### B. Playback graph (`buildPlaybackSources` line 6356)
```
source → [fxNodes] → g(gain) → p(pan) → splitter → analyserL/R   [TAP — pre-fix]
                                     p → consoleOut → master
```
- `splitter` taps from `p` (line 6376 pre-fix) — **before** console
- `analyserL` / `analyserR` stored in `trackAnalysersRef.current[i]` (line 6395)
- `meterLevels` rAF loop (line 6219-6245) reads from `trackAnalysersRef.current` and feeds the track strip dB UI

## The bug

The track strip dB meter taps the playback graph **post-pan but pre-console**. When the user picks an SSL 4000E (or any of the 20 console boards) on a track and tweaks console drive/HF lift/saturation, the UI dB meter does **not** respond to that audible level change. Master meter does (it's downstream of console at `masterPan` → `splitter` line 6196-6197), so meter mismatch was visible: track strip flat, master moves.

User-visible symptom: "Track strip dB meters don't reflect post-plugin level" (was a known issue documented in commit `d7ec7648`'s message).

## Out-of-scope graph artifacts (left alone)

- **Recording graph `meter` analyser** (line 6106 / 6132) — created but never read by UI. Dead code in terms of metering. Could be removed in a future cleanup; not touched here because it sits in the audio path (`fader → meter → console`) and removing it requires re-wiring the console input to `fader` directly.
- **`inputAnalyserRef`** (line 6643) — live mic analyser used during arming/recording. Already correct for its purpose.
- **Master meter** (line 6196-6197) — already taps post-`masterPan` post-`masterConsoleOut`. Already correct.

## Fix

`RecordingStudio.js` `buildPlaybackSources` (line 6375-6391):

**Before:**
```js
last.connect(g); g.connect(p); p.connect(splitter);
splitter.connect(analyserL, 0); splitter.connect(analyserR, 1);
// ... console block ...
const consoleId = trackConsoleChar[t.id] || "none";
let masterIn = p;
if (consoleId && consoleId !== "none") {
  const consoleOut = ctx.createGain();
  applyConsoleCharacter(ctx, p, consoleOut, consoleId, { trackId: t.id, params: trackConsoleParams[t.id] });
  masterIn = consoleOut;
}
masterIn.connect(masterGainRef.current); ...
```

**After:**
```js
last.connect(g); g.connect(p);
// ... console block (unchanged) ...
const consoleId = trackConsoleChar[t.id] || "none";
let masterIn = p;
if (consoleId && consoleId !== "none") {
  const consoleOut = ctx.createGain();
  applyConsoleCharacter(ctx, p, consoleOut, consoleId, { trackId: t.id, params: trackConsoleParams[t.id] });
  masterIn = consoleOut;
}
// F4-C: meter tap is post-console
masterIn.connect(splitter); splitter.connect(analyserL, 0); splitter.connect(analyserR, 1);
masterIn.connect(masterGainRef.current); if (t.effects) buildSends(ctx, t, p, masterGainRef.current);
```

**What changed:** `splitter` now taps `masterIn` (= `p` if no console, `consoleOut` if console is engaged) instead of `p` directly. Single moved-line refactor inside `buildPlaybackSources`.

**What did NOT change:**
- Send path still taps from `p` (pre-console) — matches analog studio aux-send convention.
- Mute, solo, volume slider all still affect the meter (they modify `trackGainsRef.current[i].gain`, which is upstream of pan, splitter, and console).
- Bus routing graph (`trackNodesRef`) — completely untouched.

## Build

`webpack 5.99.9 compiled with 9 warnings in 179848 ms` — bundle 10.9 MiB. **0 errors.** Asset-size warnings only.

## Smoke-test recipe (user)

1. Add a track, drop an audio loop, hit play. Meter should move with audio (regression check).
2. Mute the track — meter should drop to zero.
3. Pull the volume fader down — meter should follow.
4. Pan to L/R extremes — left/right segments should show asymmetric levels.
5. **The actual fix:** With audio playing, pick "SSL 4000E" from the track's console dropdown. Open the console panel (EDIT button) and crank "Drive" or "HF Lift". **Meter should now respond to the console boost** (was static before).
6. Toggle console back to "none" — meter should snap back to pre-console reading.
7. Repeat #5 with Neve, API, Trident, Vintage families to confirm all 20 boards work.
8. Master meter should always match or exceed the track meter sum (master is post-everything).

## Status

Part 1 complete. Awaiting user smoke test before starting Part 2.
