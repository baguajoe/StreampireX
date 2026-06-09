# Phase F4-C-FIX — Bug Audit (Read-Only Findings)

## Bug 1 — `Failed to execute 'connect' on 'AudioNode': Overload resolution failed.`

### Audit scope

I traced every analyser tap added in the F4-C diff (`git diff HEAD --
src/front/js/pages/RecordingStudio.js`) and verified each `connect()`
target is a defined AudioNode created earlier in the same factory closure.

| Factory | Line | Tap | Source | Sink | Verdict |
|---|---|---|---|---|---|
| warmPress | 2419-2421 | `mk.connect(satAn)` | `mk` = createGain @ 2339 | `satAn` = createAnalyser | ✅ valid |
| optoPress (fetStrike-orig) | 2605/2634 | `c.connect(an)` | `c` = createDynamicsCompressor @ 2581 | `an` = createAnalyser | ✅ valid (pre-F4-C) |
| parallelCrush | 2701-2703 | `dryTrim.connect(dryAn)`, `wetTrim.connect(wetAn)` | both = createGain @ 2689-2690 | both Analysers | ✅ valid |
| tubeComp | 2768-2770 | `inGain.connect(c)`, `inGain.connect(inAn)` | `inGain` = createGain @ 2768 | `c`/`inAn` | ✅ valid |
| vocalComp | 2850-2853 | `inNode.connect(sibBP); sibBP.connect(sibAn)` | `inNode` = createGain @ 2807 | BiquadFilter → Analyser | ✅ valid |
| gateVerb | 3846-3847 | `pre.connect(inAn)` | `pre` = createDelay @ 3830 | Analyser | ✅ valid |
| vintageAir | 3909-3910 | `g.connect(outAn)` | `g` = createGain @ 3904 | Analyser | ✅ valid |
| shimmer | 4370-4371 | `wet.connect(outAn)` | `wet` = createGain @ 4354 | Analyser | ✅ valid |

`compressor`, `glueBus`, `fetStrike`, `optoPress`, `multiPress` only
EXPOSE existing nodes via `meters: { ... }`. No new `connect()` calls.

### Track-strip splitter relocation (`buildPlaybackSources` lines 6410-6430)

Before:
```js
last.connect(g); g.connect(p); p.connect(splitter);
splitter.connect(analyserL, 0); splitter.connect(analyserR, 1);
// ...console code...
masterIn.connect(masterGainRef.current);
```

After:
```js
last.connect(g); g.connect(p);
// ...console code: masterIn = p OR consoleOut...
masterIn.connect(splitter); splitter.connect(analyserL, 0); splitter.connect(analyserR, 1);
masterIn.connect(masterGainRef.current);
```

`masterIn` is always a real AudioNode (`p` = StereoPanner or
`consoleOut` = Gain). `splitter` is a ChannelSplitter. Connections valid.

### Factory return-shape sweep

Scanned all 106 `return { ... setParam ... }` blocks in
`RecordingStudio.js`. Every factory returns both `inputNode` and
`outputNode`. The chainer's `n.inputNode || n` fallback never triggers.

### Plugin-UI side

Every modified UI in `src/front/js/component/audio/PluginUIs/*.js` is a
**read-only consumer** via `useAnalyserValue` / `useGRMeter` (rAF poll
of `getFloatTimeDomainData` / `.reduction`). No UI calls `connect()`.

### What the audit did NOT find

I cannot identify a connect() call in the F4-C diff that would target
an undefined AudioNode. Every analyser tap, every wiring change, every
factory return shape checks out as syntactically correct.

### Possible causes outside the F4-C diff

Hypotheses worth checking (not confirmed):

1. **Pre-existing factory hit by a different track config.** The error
   stack (`install → buildFxChain → buildPlaybackSources`) doesn't tell
   us *which* plugin's factory threw. A user track with a plugin
   combination not previously exercised could be hitting an old bug.

2. **Tone.js wrapper connect.** `pitchForge` / `pitchLock` do
   `inGain.connect(ps.input)` where `ps` is `Tone.PitchShift`. In some
   Tone versions `ps.input` is a Tone wrapper, not a native AudioNode —
   `nativeNode.connect(toneWrapper)` then throws Overload resolution.
   Pre-existing, but could have surfaced now if the user enabled a
   pitch plugin.

3. **Disposed-node reuse.** `registerInstance` (line 1038) disposes the
   previous instance on rebuild. If a UI's ref to the old analyser is
   still held and re-passed, that's a *read* from a disposed node —
   benign for Analyser, but could matter if a knob ramp tried to
   `setTargetAtTime` on a disposed param. Stack trace would name
   `setParam`, not `install`, so this is unlikely.

### Information I need to pinpoint Bug 1

To localize the failing factory, I need one of:

- A console screenshot with the **full** stack frame (the frame above
  `install` will be the anonymous factory, often labeled with the
  plugin key in dev-mode bundles).
- The track's `effects` object at the moment of failure (DevTools
  → React DevTools → `tracks` state → effects map). Tells me which
  factories ran.
- Repro steps: "load track X, hit Play" — so I can run the same path.

Without this, my fix would be guesswork.

## Bug 2 — Meter scale calibration

`useAnalyserValue.js` default scale = 6. Typical music RMS sits at
0.05–0.15 (-26 to -16 dBFS). 0.10 × 6 = 0.6 → 6 of 10 LEDs lit on a
LEDLadder at "loud" levels. Narrow-band sources (vocalComp's 6 kHz
bandpass tap, ParallelCrush dry post-trim) are 3-5× quieter still.

Recommended fix per user prompt:

```js
const rms = Math.sqrt(buf.reduce((s, x) => s + x*x, 0) / buf.length);
const dbfs = 20 * Math.log10(Math.max(1e-6, rms));
const normalized = Math.max(0, Math.min(1, (dbfs + 60) / 60));
setV(normalized);
```

Maps -60 dBFS → 0, 0 dBFS → 1. Linear-in-dB matches how meters look
on real hardware. -20 dBFS (typical music level) → 0.67 → 6-7 LEDs.

`useGRMeter.js` `targetDb` defaults to 12. User reports real GR
"rarely exceeds 6 dB on typical signals" — drop default to 6 so the
ladder fills more readily on vocal/bus material. Plugin UIs that
explicitly pass `{ targetDb: 12 }` (FETStrikeUI2 = 15, GlueBusUI2 = 12,
etc.) keep their current values; only callers that omit the option
get the new default.

## Status

- Bug 1 audit complete; **no concrete fix candidate found in F4-C diff alone**.
- Bug 2 fix is a clean refactor of the two hook files.

**Awaiting user diagnostic info before applying any Bug 1 change.**
