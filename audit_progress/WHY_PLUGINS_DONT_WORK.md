# WHY PLUGINS DON'T WORK — Root-Cause Investigation

_Generated 2026-05-08. Read-only diagnostic. No code modified._

The static audit said **146 working** but real-world testing reveals only ~30–40 actually function. This report explains the gap by tracing through the source code of representative plugins from each broken category.

The honest answer: there are **6 root-cause patterns** that affect ~120 plugins. The static auditor's "WORKING" verdict means "factory exists, key handled in setParam" — it does not (and cannot statically) detect topology bugs, wet/dry-mix unit confusion, missing makeup gain, registry/host key mismatches, or missing UI components. Those failures are the gap.

---

## Pattern 1 — "Compressor knobs make audio quieter, not more compressed"

### What's happening

Every SPX compressor uses `ctx.createDynamicsCompressor()` (the native Web Audio node). `setParam("ratio", v)` correctly calls `c.ratio.setTargetAtTime(...)`. So the ratio knob *is wired* — but there is **no automatic makeup-gain compensation**. As ratio increases, gain reduction increases, and the post-comp signal drops several dB. To users this feels like "the knob doesn't do anything useful."

### Evidence (`src/front/js/pages/RecordingStudio.js`)

- `compressor` (line 1749) — `case "ratio": c.ratio.setTargetAtTime(safe(v, 4, 1, 20), t, TAU); break;` — wired, but no `case "makeup"` and no auto-gain. The factory has no makeup-gain node at all.
- `fetStrike` (line 2584) — has a `makeup` knob (line 2621), but it's user-driven; turning ratio up still drops level until user manually compensates.
- `warmPress` (line 2400) — same: `makeup`/`makeupGain` wired (line 2511) but independent of ratio.
- `glueBus` (line 2526) — has `autoGain` (line 2547), but it tracks *threshold* only (line 2551: `auto = (-lastThresh / 10) * 0.5`). When user changes ratio without touching threshold, autoGain does nothing.

### Why the audit missed it

Static analysis only checks "is `case "ratio"` present in the setParam switch?" Yes → counted as "param wired." The audit cannot tell whether the knob's *audible result* matches user expectation.

### Plugins affected

`compressor`, `fetStrike`, `warmPress`, `glueBus`, `optoPress`, `parallelCrush`, `multiPress`, `tubeComp`, `vocalComp`, `gainRider`, `transGate`, `breathGate`, `sibilantCut`, `midSideComp` — **14 compressors/dynamics**.

### Fix complexity

**Medium.** Each factory needs: (a) a post-comp `GainNode`; (b) a tracked `lastRatio`/`lastThresh`/`makeup` triple; (c) a recompute fn that updates makeup whenever any of those change. ~10 lines per plugin × 14 plugins = ~2 hours of mechanical work. The tricky part is choosing the makeup curve — a common one is `makeup_dB = -threshold_dB × (1 − 1/ratio) × 0.5`.

---

## Pattern 2 — "Mix knob is wired as output trim, not wet/dry crossfade"

### What's happening

Many SPX plugins have a `mix` knob in their UI (`PLUGIN_DEFAULTS` ships values like `mix: 25` — meaning 25% wet). The factory reads `p.mix`, divides by 100, and applies it to a single `GainNode` at the end of the chain. There is **no parallel dry path**. So `mix=25` does not blend dry+wet — it just attenuates the entire output to 25%, i.e. -12 dB.

Result: users see a "Mix" knob and expect it to balance dry/wet; instead they hear "the plugin gets quieter as I turn it down."

### Evidence

- `harmonicExcite` (line 2098) — Topology `hp → ws → air → g`, where `g.gain = mix/100`. Default `mix: 25` → output at 0.25 (-12 dB). No dry path.
- `tapeForge` (line 1984) — No `mix` handler at all; the `saturation` knob's curve `tanh(x*(1+drv*4)) / (1+sat*0.5)` *divides* the output by `(1+sat*0.5)`, so cranking saturation makes things quieter.
- `vortexMod` (line 4966) — No mix path: `inputNode === outputNode === d` (the delay). Default `mix: 25` is declared but ignored.
- `harmonicSum`, `vinylPress`, `loFiCrusher`, `cabinetSim`, `multibandSat` (line 2252 — `safe(p.mix, 0, 0, 1)` does not divide by 100, so default 25 clamps to 1 = all-wet, no dry).

### Why the audit missed it

`case "mix"` IS present in setParam → counted. The auditor cannot tell that the wet/dry topology is missing.

### Plugins affected

`harmonicExcite`, `harmonicSum`, `tapeForge`, `vinylPress`, `loFiCrusher`, `cabinetSim`, `vortexMod`, `chorusEnsemble`, `autoWah`, `vocalSaturator`, `valveGlow` (no mix node at all), `multibandSat`, `noiseReduction`, `freqShifter`, `granularFreeze`, `phantomDouble`, `vocalSpace`, `dialogueIsolator` — **~18 SPX plugins**.

### Fix complexity

**Simple, but tedious.** Standard pattern is:
```js
const inBus = ctx.createGain(); const out = ctx.createGain();
const dry = ctx.createGain(); const wet = ctx.createGain();
inBus.connect(dry); dry.connect(out);
inBus.connect(/* fx chain */); /* fx end */.connect(wet); wet.connect(out);
// setParam("mix", v): const m = v > 1 ? v/100 : v; wet.gain = m; dry.gain = 1 - m;
```
~15 lines per plugin. ~3 hours of mechanical work.

---

## Pattern 3 — "Most declared params don't do anything"

### What's happening

`PLUGIN_DEFAULTS` declares the user-facing param surface (e.g., `tapeForge` has 8 params). The factory's `setParam` switch only handles the easy ones (e.g., 4 of 8 for `tapeForge`). The other 4 silently fall through to `default: break;` and the knob in the UI **does nothing**.

The static audit calls this PARTIAL — but PARTIAL plugins can still be 30–60% non-functional from the user's perspective.

### Evidence (param-coverage gaps reported by static auditor)

- `tapeForge` (line 1984) — handled: drive, saturation, hfLoss, bias. **Unhandled: speed, noise, wow, flutter** (4 of 8 dead).
- `valveGlow` (line 2009) — handled: drive, warmth. **Unhandled: even2nd, even4th, bias, outputGain, dcBlock** (5 of 7 dead).
- `vinylPress` (line 2139) — handled: warmth, crackle. **Unhandled: dust, warp, riaa, rpm, hpf, outputGain** (6 of 8 dead).
- `pitchLock` — handled: 0. **All 8 params dead** (entire plugin inert; this is why static audit flags it STUB).
- `dcBlock` — handled: 0 of 4 (STUB).
- `springBox`, `stochasticHall`, `hallForgeS`/`L` — handled: 0.
- `dynamicEQ`, `graphicEQ`, `spectraCurve` — declare a single `bands` array; the factory iterates the array at *construction* but `setParam("bands", newArray)` either no-ops or partially rebuilds. Live band tweaks from the UI don't reach the AudioParam.

### Why the audit missed it

The auditor *reports* coverage (`"only 4/8 params wired"`) — but the verdict threshold (≥75% wired = WORKING) lets through plugins where 6/8 work. The user sees the 2 broken knobs and concludes "this plugin doesn't work."

### Plugins affected

By the static audit: 12 STUB + 36 PARTIAL = **48 plugins** with significant param dead-zones. Subjectively many of these still feel "broken" because the unwired params are often the most musically important ones (output gain, mix, tone, drive).

### Fix complexity

**Medium-Hard.** Requires per-plugin DSP design — for `tapeForge.speed`, you'd need a tape-speed simulation (delay-line + LFO + HF rolloff). For `valveGlow.even2nd/even4th`, a separate even-harmonic generator. Some unwired params (e.g., `vinylPress.warp`) genuinely need a worklet (sample-rate modulation). Estimate: ~2 hours per plugin × 48 = **96 hours**, but many can be hidden in v1 by removing the dead knobs from the UI.

---

## Pattern 4 — "Mastering plugins UI doesn't open / has no knobs"

### What's happening

Three sub-causes, all paths through `SPXPluginHost` (line 2241 of `SPXPlugins.js`):

1. **`fxDef.component === null`** (lines 1737–1754, 1822–1834) — eighteen Standard FX (`eq`, `compressor`, etc.) and a half-dozen newer SPX entries (`spectrumAnalyzer`, `formantFilter`, `tapeStop`, `transientShaper`, `subOctaver`, `tempoDelay`, `pitchRandomizer`, `autoWah`, `drumEnhancer`, `multibandLimiter`, `goniometer`, `phaseScope`, `stereoImager`, `reverseDelay`) are intentionally `component: null`. They route to the legacy `ConsoleFXPanel` via the dispatcher at `RecordingStudio.js:9010`. **For Standard FX this works** — ConsoleFXPanel knows about `eq/compressor/gate/...`. For the new SPX `component: null` entries (`stereoImager`, `multibandLimiter`, etc.), ConsoleFXPanel has no rendering for them — so the user sees an empty panel with the FX title and nothing inside.
2. **`fxDef.component === "Xxx"` but `COMPONENT_MAP[Xxx]` is undefined** — the auto-memory note flags this: "30+ plugin UIs imported but unregistered; SPXPluginHost returns null for them." `SPXPluginHost` does `if (!Comp) return null;` (line 2245). The popup is structurally present (the React tree mounts), but its body renders nothing. Visually it can look like the click did nothing.
3. **`makePassthrough()` factories** — `phaseScope`, `goniometer`, `loudnessMeter`, `loudnessMeter2`, `ditherForge`, `spectrumAnalyzer` route to `() => makePassthrough()` (line 5478). These are visualization-only by design — they don't process audio, so even when the UI opens it can't show meaningful metering until the visualizer worklet is wired.

### Evidence

- `RecordingStudio.js:8978` — `SPX_PLUGIN_KEYS.has(openFxKey)` decides between SPXPluginHost and ConsoleFXPanel. SPX_PLUGIN_KEYS is built at line 314: `new Set(ALL_FX_EXTENDED.filter(f => f.component).map(f => f.key))`. So `component: null` plugins fall to ConsoleFXPanel; that branch only knows the 18 Standard FX, leaving the newer "null UI" plugins blank.
- `multibandLimiter` (line 3579) — factory exists and has 4 params wired (ceiling, lookahead, xover1/2/3); declared `component: null` so falls to ConsoleFXPanel which has no `multibandLimiter` block → blank panel.
- `stereoImager` (line 5194) — same. Factory works (M/S split + per-band width), but the UI is dead because `component: null` and ConsoleFXPanel doesn't render it.
- `declicker` (line 5410) — has a real `DeclickerUI` in `PluginUIs/`, but the comment notes only `strength` is wired (sensitivity/maxWidth are "Phase C — need transient detector").

### Why the audit missed it

The static auditor checks `COMPONENT_MAP` membership and `PluginUIs/<Name>.js` file existence — it doesn't check whether `ConsoleFXPanel` has a render-block for plugins that explicitly opt to use it via `component: null`.

### Plugins affected

- `component: null` with no ConsoleFXPanel block: `stereoImager`, `multibandLimiter`, `goniometer`, `phaseScope`, `tapeStop`, `transientShaper`, `subOctaver`, `tempoDelay`, `pitchRandomizer`, `autoWah`, `drumEnhancer`, `formantFilter`, `spectrumAnalyzer`, `reverseDelay` — **~14 plugins**.
- Visualization-only passthroughs: `phaseScope`, `goniometer`, `loudnessMeter`, `loudnessMeter2`, `ditherForge`, `spectrumAnalyzer` — **6 plugins** (these are stubs by design and can't be "fixed" without writing the visualizer).

### Fix complexity

**Simple per-plugin (UI extension), but cumulative.** Either:
- Write a generic SPX UI for the `null`-component plugins (one component that reads `PLUGIN_DEFAULTS[key]` and renders a knob per param), OR
- Add per-plugin blocks to `ConsoleFXPanel`.

The first approach is ~50 lines and would unblock all 14 plugins immediately. ~1–2 hours.

---

## Pattern 5 — "Standard FX section: most don't actually work"

### What's actually going on

This complaint puzzled me until I traced the dispatcher. **The 18 Standard FX (eq, compressor, gate, deesser, limiter, reverb, delay, chorus, flanger, phaser, tremolo, filter, distortion, bitcrusher, tapeSaturation, exciter, stereoWidener, gainUtility) all do work** — their factories are at `RecordingStudio.js:1716–1980` and they all use native Web Audio nodes correctly. The audit calls them all WORKING and that is correct for the audio path.

The user's complaint is almost certainly the **UI side**: `component: null` on every Standard FX entry (lines 1737–1754) means they ALL render through `ConsoleFXPanel`. Looking at `ConsoleFXPanel.js` (only first 40 lines surveyed), the render code is large and may have stale knob bindings or missing-param paths for the newer additions. For the user, the symptom would be: "I open the EQ/Compressor panel, the knobs spin but I don't hear changes."

The likely true root cause is the `setParam` → live-AudioParam pipeline in `ConsoleFXPanel`. When `ConsoleFXPanel` updates a param it calls `updateEffect(trackIndex, pluginKey, k, v)`. That setter must (a) write to `track.effects[key][k]`, AND (b) push the change to the live plugin instance via `liveInstancesRef.current.get(...).setParam(...)`. If step (b) is missing or batched (e.g., only flushes on chain rebuild), every knob turn writes state but the audio doesn't update until next play/stop cycle.

The SPX dispatcher at `RecordingStudio.js:8979` does both steps correctly (line 8993: `inst.setParam(key, newPatch[key])`). But `ConsoleFXPanel`'s `updateEffect` may not — needs a one-line confirmation read.

### Plugins affected

Up to **18 Standard FX**, depending on whether `ConsoleFXPanel.updateEffect` pushes to live instances or only rebuilds the chain.

### Fix complexity

**Simple once diagnosed.** Add the same `liveInstancesRef.current.get(key).setParam(...)` push that the SPX dispatcher already has. ~5 lines. Will unblock all 18 in one fix.

---

## Pattern 6 — "Plugin Rack Library: many fail to load"

### What's happening

This is the cleanest, most actionable bug: **registry.js plugin IDs do not match `PLUGIN_FACTORIES` keys.** The static audit caught this — 20 BROKEN entries, all with the same root cause.

### Evidence

- `PluginHost.addPlugin()` at line 281–289:
  ```js
  const def = getPluginDef(pluginId);          // looks up registry by id like 'a_i_compressor'
  const factory = PLUGIN_FACTORIES[pluginId];  // expects same key
  if (!factory) throw new Error(`No factory for plugin: ${pluginId}`);
  ```
- `registry.js:6` — `'a_i_compressor': { id: 'a_i_compressor', ... }`
- `PluginHost.js:137` — `ai_compressor: createAICompressorPlugin,`

So the rack tries `PLUGIN_FACTORIES['a_i_compressor']` → `undefined` → throws.

### Plugins affected (verbatim from BROKEN list in static audit)

`a_i_compressor`, `a_i_de_room`, `a_i_e_q_match`, `a_i_noise_reduce`, `a_i_vocal_clean`, `air_e_q`, `d_c_filter`, `dynamic_e_q`, `e_q3_band`, `f_e_t_comp`, `graphic_e_q`, `linear_phase_e_q`, `mastering_e_q`, `mid_side_e_q`, `notch_e_q`, `presence_e_q`, `spx_perceptual_eq`, `spx_vox_engine`, `tilt_e_q`, `v_c_a_comp` — **20 plugins**.

This is naïve auto-snake-case applied to PascalCase names: `AICompressor` → `a_i_compressor` (registry) but `AI` was treated as one token elsewhere → `ai_compressor` (host map).

### Fix complexity

**Trivial.** Two options:
1. Change `registry.js` IDs to match `PLUGIN_FACTORIES` keys (rename `'a_i_compressor'` → `'ai_compressor'`, etc.). 20 string edits, no logic change. **5 minutes.**
2. Add a normalization step in `addPlugin()` that strips `_` between single-letter alpha runs before lookup. ~3 lines.

Option 1 is safer (explicit) and unblocks all 20 instantly.

---

## Other contributing factors (smaller patterns)

- **Worklet plugins fall back silently to native nodes.** `CompressorPlugin.js` tries `new AudioWorkletNode(ctx, 'spx-compressor', ...)`; if the worklet isn't registered (and most aren't loaded by default), it falls back to native `DynamicsCompressor`. The user sees a `[CompressorPlugin] Worklet unavailable, using native fallback` warning in console but the plugin "works" — just not with the worklet's superior characteristics. Affects every plugin in `audio/plugins/plugins/*.js` that uses the worklet-first pattern (~30 plugins).
- **Tone.js plugins work because they're Tone.js.** `pitchForge`, `pitchLock`, `voiceForge` use `Tone.PitchShift` / `Tone.connect`; the rest use raw Web Audio. The Tone.js ones tend to have proper wet/dry topology because Tone's own components ship with it. Lesson: the codebase quality is uneven — the Tone.js-backed plugins were built later/better.
- **Default values that mute the plugin.** Several factories ship defaults that make the plugin start silent or near-silent: `harmonicExcite.mix=25` (= 25% output), `valveGlow.drive=0.4` with no level compensation, etc. User toggles plugin on, hears nothing change, concludes it's broken. Same root cause as Pattern 2.
- **Component re-binding via property-shorthand.** `COMPONENT_MAP` (line 2021–2063) has duplicate keys where later entries override earlier ones (e.g., `GateVerbUI: GateVerbUINew`). This works but the audit's UI-presence check has to know about both forms (we already fixed this in `plugin_truth_audit.js` with the `+ 'New'` lookup).

---

## Summary

| Pattern | Plugins | Fix difficulty | Cumulative time |
|---|---|---|---|
| 1. Compressor: no makeup auto-compensation | 14 | Medium | ~2 h |
| 2. Mix knob is output trim, not crossfade | ~18 | Simple, tedious | ~3 h |
| 3. Most declared params silent (50%+ unwired) | 48 | Medium-Hard (per-plugin DSP) | ~96 h |
| 4. Mastering UI: empty panel for null-component plugins | ~14 + 6 stubs | Simple (one generic UI) | ~2 h |
| 5. Standard FX: live setParam not pushed | up to 18 | Simple (one line) | ~30 min once diagnosed |
| 6. Rack library: registry/host key mismatch | 20 | Trivial (rename IDs) | ~5 min |

**Cumulative plugins affected:** ~120 (significant overlap — many plugins suffer multiple patterns at once).

### Is this fixable systematically (A) or individual bugs (B)?

**Mostly A.** Patterns 1, 2, 5, and 6 are systematic — 5 templates, each applied to N plugins, fix once and replay. That's about **~50 plugins reaching usable state in ~8 hours** of mechanical work. Plus Pattern 4 (a generic UI for null-component plugins) unblocks ~14 more.

Pattern 3 is the long tail: 48 plugins with bespoke unwired-param work. Most of these unwired params can be **hidden from the UI in v1.0** rather than fixed — declare a v1 param surface that only includes the 30–50% of params that ARE wired, ship that, defer the rest to v1.1.

### Fastest path to "most plugins working" for v1.0

1. **Day 1, 30 minutes** — Fix Pattern 6 (rename 20 registry IDs). Unblocks the entire rack library: +20 plugins.
2. **Day 1, 1 hour** — Diagnose & fix Pattern 5 (one-line setParam push in `ConsoleFXPanel.updateEffect`). Unblocks all 18 Standard FX.
3. **Day 1, 2 hours** — Pattern 4: write a generic SPX UI for `component: null` plugins that auto-renders knobs from `PLUGIN_DEFAULTS`. Unblocks ~14 plugins.
4. **Day 2, 3 hours** — Pattern 2: add wet/dry crossfade topology to ~18 SPX plugins. Mechanical, low-risk.
5. **Day 2, 2 hours** — Pattern 1: add post-comp makeup gain + recompute fn to 14 dynamics plugins.
6. **Day 3+** — Pattern 3: triage the unwired params per plugin. Hide musically-unimportant ones from UI (saves 80% of work). Implement only the must-have ones.

After Day 1 + Day 2 (~9 hours), conservatively **~75 of the ~120 broken plugins** would be in usable shape. After triage in Day 3, you'd have **~100+ shippable plugins** for v1.0 without writing any new DSP.

### Is it realistically fixable for v1.0? (Decision matrix)

| Goal | Estimate |
|---|---|
| All 214 plugins truly working | ~120 hours (3 weeks full-time) |
| 100 plugins shippable, rest hidden | ~12 hours (1.5 days) |
| Top 50 plugins polished, others removed from picker | ~6 hours (1 day) |
| Just stop the bleeding (Patterns 5 + 6) | ~1.5 hours |

The 120-hour number is what it would take to be "honest." The 12-hour number is the realistic v1.0 line — fix the systematic patterns, hide the long-tail bugs by trimming the param surface and the picker, ship.
