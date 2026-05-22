# Phase F4-C-FIX — Task 4 Analog Rack / Channel Strip audit

## Where the Analog Rack lives

`src/front/js/component/ConsoleFXPanel.js` — header at line 8 calls itself
"StreamPireX Pro Analog Rack / Channel Strip". It's a per-track FX panel
opened from the FX modal at `RecordingStudio.js:8977` (the non-SPX
branch). Sections include EQ, Compressor, Reverb, Delay, Filter, Gate,
De-esser, Stereo Widener, Bitcrusher, Exciter, **Tape Saturation**,
**Gain Utility**.

There's no top-level "crackle" knob in the Analog Rack. The user's
"crackling" reference is most likely the `vinylPress` plugin (an SPX
plugin opened separately — not part of the Analog Rack panel proper).

## How Analog Rack writes to the audio graph

Every slider in `ConsoleFXPanel.js` calls `u(plugin, key, value)` →
`updateEffect(trackIndex, plugin, key, value)` in `RecordingStudio.js:6917`:

```js
const updateEffect = (ti, fx, param, val) => {
  const key = `${tracks[ti]?.id}:${fx}`;
  const inst = liveInstancesRef.current.get(key);
  if (inst?.setParam && param !== "enabled") inst.setParam(param, val);
  setTracks(p => p.map(...));
};
```

That dispatches to the live PluginInstance's `setParam` and then mirrors
into React state.

## The bug — toggle doesn't rebuild the live-mixer graph

When the user clicks a section's enable toggle (e.g. "Tape Saturation"
at `ConsoleFXPanel.js:1291`):

```jsx
onClick={() => u("tapeSaturation", "enabled", !fx.tapeSaturation?.enabled)}
```

This produces `updateEffect(ti, "tapeSaturation", "enabled", true)`. The
`if (param !== "enabled")` guard at line 6921 means `inst.setParam` is
**never** called for the enabled toggle. State flips → `useEffect
[tracks]` at line 6217 fires → `ensureTrackGraph(track)` runs but
**returns early on cache hit** (line 6141: `if (trackNodesRef.current.has(track.id))
return ...`). Net effect: live-mixer graph stays frozen with the
plugin uninstalled.

The `fxSignature` useEffect at `RecordingStudio.js:6570` *would* rebuild
the graph — but only during playback (`if (!isPlaying) { ... ; return; }`).
During live monitoring (instrument input, mic monitor, no playback)
toggling Tape Saturation produces zero audible difference.

After playback starts, `buildPlaybackSources` rebuilds and the plugin
installs, so subsequent slider moves work. That matches the
"sometimes Drive/Warmth do nothing" pattern the user described.

## Why moving Drive/Warmth specifically doesn't seem to do anything

Two layered reasons:

1. **Live-mixer graph not rebuilt** (above). If `tapeSaturation` was
   toggled on while not playing, the live instance was never created
   and `inst?.setParam` is undefined → silent no-op when dragging.
2. **Default drive=0** in `tapeSaturation` (`DEFAULT_EFFECTS()` in
   `trackFactory.js:43`: `tapeSaturation: { drive: 0.3, warmth: 0.5, ...
   enabled: false }`). Drive=0.3 is mild; user expects a more dramatic
   effect when they move from 0 → 1 but the perceived change between
   0.3 and 0.5 is subtle. `makeTanhCurve(0.3)` is `tanh(x * 2.5)` —
   audible but easy to miss on quiet program material.

## The crackle bug (vinylPress factory, line 2148)

The `vinylPress` factory (`RecordingStudio.js:2139-2159`) implements
"crackle" as **a high-pass filter cutoff shift, not a noise generator**:

```js
const hp = ctx.createBiquadFilter(); hp.type = "highpass";
setFreq(hp.frequency, 30 + ((p.crackle || 0) * 20));   // 30 Hz → 50 Hz
...
case "crackle": hp.frequency.setTargetAtTime(safe(30 + safe(v, 0.1, 0, 1) * 20, 30, 20, 20000), t, TAU); break;
```

That's a 20 Hz frequency shift — inaudible on most material. There is
**no actual crackle / pop / vinyl-noise source**: no
`createBufferSource` with noise data, no random impulse train. Backups
in `RecordingStudio.js.bak_*` confirm the bug is pre-existing — not an
F4-C regression.

## Other "Drive: 0 default = clean" saturation plugins

Cross-reference with `phase_f4c_saturation_audit.md`. Per
`PLUGIN_DEFAULTS` in `SPXPlugins.js:1876+`:

| Plugin | Default drive / saturation | Effect at default |
|---|---|---|
| `tapeForge` | drive=0, saturation=0 | identity (clean signal) |
| `valveGlow` | drive=0 | identity — `(1+0/2)*x/(1+0*\|x\|) = x` |
| `ironCore` | slewRate=0, coreSize=0 | identity — `x*pow(1, 0) = x` |
| `consoleSoul` | crosstalk=0, sumSaturation=0 | clean |
| `vinylPress` | warmth=0, crackle=0 | unity-tanh + tiny HPF shift |
| `harmonicExcite` | drive=0, even=0, odd=0, mix=0 | silent (mix=0 + drive=0) |
| `multibandSat` | drive1..4=0, mix=0 | silent (mix=0 + flat) |
| `loFiCrusher` | bits=24, rate=1.0 | near-identity (24-bit / no rate redux) |
| `cabinetSim` | cabinet=0, mic=0 | clean |

When the user adds these expecting "tape" / "tube" / "valve" /
"vinyl" character, the default knob positions produce barely-audible
output. Compounds with the live-mixer-not-rebuilt bug above.

## Recommended fixes

### Critical (real bug)

**A. Make the per-track Analog Rack toggle rebuild the live-mixer
graph.** In `ConsoleFXPanel.js`, after `u(plugin, "enabled", value)` is
called, force a track-graph rebuild. Easiest: pass `rebuildTrackGraph`
into ConsoleFXPanel and call it after the toggle, or change
`updateEffect` to detect `param === "enabled"` and call
`rebuildTrackGraph(tracks[ti].id)` inside.

The toggle handler at `RecordingStudio.js:8546` for the *top-level*
Tape Saturation already does this manually (delete cache + ensure).
Per-track toggles in ConsoleFXPanel skip that step.

**B. Add a real crackle generator to `vinylPress`.** Replace the HPF-only
implementation at line 2148 with a noise BufferSource gated by
`p.crackle` (exponential-decay random impulses, 1-2 ms each, density
proportional to crackle 0..1). Mirrors how vintage-vinyl plugins
typically work.

### UX fixes

**C. Bump default `drive` / `saturation` / `crackle` values** in
`PLUGIN_DEFAULTS` so users hear character on insert. Suggested:

```js
tapeForge:    { ...drive: 0.5, saturation: 0.4, ... }
valveGlow:    { ...drive: 0.4, warmth: 0.3, ... }
ironCore:     { ...slewRate: 0.4, coreSize: 0.5, ... }
consoleSoul:  { ...crosstalk: 0.2, sumSaturation: 0.3, ... }
vinylPress:   { ...warmth: 0.3, crackle: 0.2, ... }
loFiCrusher:  { ...bits: 12, rate: 0.7, ... }
cabinetSim:   { ...cabinet: 0.5, mic: 0.5, ... }
```

These are **deliberate UX choices**, not correctness fixes.

### Out of scope (deferred)

- The Analog Rack's *own* compressor section is dead code per user's
  prior memory note. Not investigated this round.

## Critical files

- `src/front/js/component/ConsoleFXPanel.js` — the Analog Rack UI,
  toggles at lines 1264, 1287 etc.
- `src/front/js/pages/RecordingStudio.js`:
  - `updateEffect` at line 6917 (handles per-param dispatch)
  - `ensureTrackGraph` at line 6138 (early-return cache that masks toggle)
  - `rebuildTrackGraph` at line 6185 (does the actual cache-bust + rewire)
  - `vinylPress` factory at line 2139 (no real crackle source)
- `src/front/js/component/SPXPlugins.js:1876+` — PLUGIN_DEFAULTS
- `src/front/js/utils/trackFactory.js:43` — DEFAULT_EFFECTS for native
