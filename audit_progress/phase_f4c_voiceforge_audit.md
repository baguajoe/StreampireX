# Phase F4-C-FIX — voiceForge / pitchShift Tone.js connect bug

## Root cause

Three plugin factories in `src/front/js/pages/RecordingStudio.js` mix native
WebAudio nodes with `Tone.PitchShift` instances. Each does:

```js
nativeGainNode.connect(ps.input);
```

In **Tone.js v15** (installed: `tone@^15.1.22` per `package.json:173`),
`ps.input` is a **`Tone.Gain` wrapper**, not a native AudioNode. The
WebAudio API's `AudioNode.connect()` only accepts `AudioNode` or
`AudioParam` — passing a Tone wrapper throws:

> Failed to execute 'connect' on 'AudioNode': Overload resolution failed.

This is the exact error in the user's stack trace at `bundle.js:708800`
inside the voiceForge `[0,1,2,3].map(...)` loop.

The reverse direction — `ps.connect(nativeNode)` — works because
`Tone.PitchShift` inherits a `connect` method from `Tone.ToneAudioNode`
that handles both Tone and native targets transparently. The native
side has no equivalent bridge.

## Affected factories (3 confirmed, all use `new Tone.PitchShift`)

| Plugin | Line | Failing call |
|---|---|---|
| `pitchForge` | 4723 | `inGain.connect(ps.input);` |
| `pitchLock`  | 4769 | `inGain.connect(ps.input);` |
| `voiceForge` | 5020 | `inBus.connect(ps.input);` (inside `.map`, run 4× per install) |

`grep "new Tone\." RecordingStudio.js` returns exactly these three
locations. No other Tone.js classes are instantiated, so this exact
bug is scoped to these three plugins.

## Other "SPX Modulation" plugins (NOT this bug)

The "SPX Modulation" category (`type==="filter" && SPX_KEYS.has(f.key)`)
also contains: `vortexMod`, `vocoderSPX`, `noiseReduction`, `formantFilter`,
`subOctaver`, `pitchRandomizer`, `autoWah`, `chorusEnsemble`, `freqShifter`.
None of these use Tone.js. If any are still failing after this fix, they
are a separate root cause — the user will see fresh `[F4-C-FIX]` console
entries naming them, and we patch surgically.

`pitchRandomizer` is in the modulation list but its factory at line 4702
uses pure Web Audio (DelayNode + Oscillator LFO) — no Tone.js. Safe.

## Fix

Use `Tone.connect(srcNative, dst)` (exported from Tone.js v15:
`node_modules/tone/build/esm/core/context/ToneAudioNode.js:268`) instead
of `srcNative.connect(ps.input)`. Tone.connect accepts native + Tone
on both sides and bridges correctly.

### Patches (3 one-liners)

`src/front/js/pages/RecordingStudio.js` line 4723 (pitchForge):
```diff
-      inGain.connect(ps.input);
+      Tone.connect(inGain, ps);
```

Line 4769 (pitchLock):
```diff
-      inGain.connect(ps.input);
+      Tone.connect(inGain, ps);
```

Line 5020 (voiceForge):
```diff
-        inBus.connect(ps.input);
+        Tone.connect(inBus, ps);
```

The reverse-direction calls (`ps.connect(formant)`, `ps.connect(peak)`,
`ps.connect(g)` at lines 4724, 4770, 5023, 5028, 5029) are unchanged —
they go through Tone's own `connect` which handles native targets fine.

## Why F4-C exposed it (not F4-C's fault)

Pre-F4-C, the chainer's silent `n.inputNode || n` fallback masked
errors: when the factory threw mid-execution, install threw, the chain
half-built without inserting the broken plugin. The track *appeared* to
work because one bad plugin was silently dropped. F4-C-FIX added explicit
error logging that surfaced this pre-existing Tone.js v15 incompatibility.

The Tone.PitchShift code likely worked under Tone.js v14.x where the
prototype patching of `AudioNode.connect` was still in place. The
package.json `^15.1.22` upgrade (date unknown — predates this branch
per the lockfile) silently broke the three factories.

## Verification plan

1. Apply the 3 one-line patches.
2. `npm run build` — confirm 0 errors.
3. User cache-clear, hard refresh.
4. Add **VoiceForge** to a track, press Play.
   - Expected: no `[F4-C-FIX] factory threw for "voiceForge"` in console.
   - Expected: `[F4-C-FIX] OK "voiceForge" — inDb=... outDb=... diff=...`
     with non-trivial diff (pitch shift modifies signal).
5. Repeat with **PitchForge** and **PitchLock**.
6. Sweep the rest of "SPX Modulation": vortexMod, vocoderSPX,
   noiseReduction, formantFilter, subOctaver, pitchRandomizer, autoWah,
   chorusEnsemble, freqShifter. If any still log `[F4-C-FIX] factory
   threw` or `PASSTHROUGH WARN`, capture the stack and we patch them
   individually.

## Out of scope

- F4-C-FIX defensive guards (install try/catch, chainer guards) stay
  in place. They're useful infrastructure regardless of this fix and
  will catch the next Tone.js / worklet / dependency surprise.
- `verifyPluginProcessesAudio` stays in place as a long-term smoke-test
  helper. (Can be downgraded to dev-only via env flag later.)
