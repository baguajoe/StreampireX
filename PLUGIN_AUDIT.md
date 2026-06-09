# StreamPireX — Recording Studio Plugin Engine Audit

Read-only audit. No code modified. Generated 2026-05-06 from working tree
on branch `claude/fix-recording-studio`.

Methodology: 9 parallel auditors covered 216 plugins (105 SPX-native +
111 ph_* PluginHost factories). Each plugin was scored against 8 bug
classes — param-name matching, unit mismatches, missing setParam cases,
worklet dependencies, topology, dispose cleanup, default-value danger,
and COMPONENT_MAP gaps.

Per-plugin detail lives in `audit_progress/batch_NN_*.md`. This file is
the consolidated summary + cross-cutting findings + fix plan.

---

## Top-line summary

| Bucket | Count | Percent |
|---|---:|---:|
| Total plugins audited | 216 | 100% |
| Clean | 11 | 5% |
| P2 (cosmetic) | 13 | 6% |
| P1 (polish) | 72 | 33% |
| **P0 (demo-blocker)** | **120** | **56%** |

| Engine family | Total | Clean | P2 | P1 | P0 |
|---|---:|---:|---:|---:|---:|
| Native effects (component=null) | 18 | 6 | 2 | 9 | 1 |
| SPX Analog + Dynamics | 12 | 0 | 0 | 6 | 6 |
| SPX EQ + Spatial | 14 | 1 | 0 | 11 | 2 |
| SPX Vocal + Mastering | 15 | 0 | 0 | 5 | 10 |
| SPX additional / creative | 22 | 0 | 0 | 1 | 21 |
| SPX missing-from-COMPONENT_MAP + Ozone | 24 | 0 | 0 | 5 | 19 |
| ph_* A through G | 45 | 3 | 1 | 8 | 33 |
| ph_* H through P | 29 | 0 | 3 | 7 | 19 |
| ph_* R through W | 37 | 1 | 7 | 20 | 9 |

**56% of plugins are demo-blockers. The Recording Studio's plugin
catalogue is structurally broken at scale.**

---

## Critical structural findings

These are not per-plugin bugs — these are systemic faults that broke
many plugins at once. Fixing them at the structural level is the
highest-leverage path back to a working studio.

### 1. ConsoleFXPanel.updateEffect never calls inst.setParam
**Affects: all 18 native effects.**
`src/front/js/pages/RecordingStudio.js:3944` (`ConsoleFXPanel.updateEffect`)
sets `track.effects[key].params[paramName] = value` but never calls
`inst.setParam(name, value)` on the live PluginInstance. The SPX plugin
window does call it (`RecordingStudio.js:5915`); ConsoleFXPanel does
not. **Result: every native-effect knob is silent during playback** —
even though the factories have valid setParam cases. Knobs only "take"
on the next play start. Estimated fix: **2 lines**.

### 2. Reverb and Delay are SENDS, not inserts
`buildSends` (`RecordingStudio.js:3141–3148`) wires `reverb` and `delay`
through send/return buses without creating a PluginInstance — there is
no `setParam` to call at all on either. Live updates are dead by
construction. The factories support `setParam`; the chain doesn't.
Either route them as inserts (preferred) or rebuild the send wiring to
expose live params.

### 3. COMPONENT_MAP gap — 38–44 SPX UIs unregistered
`src/front/js/component/SPXPlugins.js:1755–1768` (`COMPONENT_MAP`) lists
43 UI components. `ALL_FX_EXTENDED` (line 1508+) declares ~87 plugins
with non-null `component` names. `SPXPluginHost` (line 1947–1950) does
`COMPONENT_MAP[fxDef.component]`; if not registered, it returns `null`.
**Result: clicking these plugins in the FX picker opens a window with
no UI controls.** Confirmed gaps:

- All 22 §A8 "additional/creative" UIs (Batch 05): PultecForgeUI,
  GraphicEQUI, TiltEQUI, BaxandallEQUI, VocoderSPXUI, GranularFreezeUI,
  NoiseReductionUI, RingModUI, FormantFilterUI, SpectrumAnalyzerUI,
  TapeStopUI, TransientShaperUI, EnhancerSPX808UI, InfiniteReverbUI,
  ReverseDelayUI, SubOctaverUI, TempoDelayUI, PitchRandomizerUI,
  AutoWahUI, DrumEnhancerUI, VocalSaturatorUI, GainStagerUI
- 13 §A9 UIs (Batch 06; ditherForge + dcBlock are actually registered —
  inventory was wrong on those): StereoImagerUI, MidSideCompUI,
  MultibandLimiterUI, MultibandSatUI, GoniometerUI, PhaseScopeUI,
  LoFiCrusherUI, ChorusEnsembleUI, DeclickerUI, DialogueIsolatorUI,
  CabinetSimUI, plus DehummerUI (typo'd export — see #4 below)
- §A10 Ozone gap (8): MatchEQUI, LowEndFocusUI, CodecPreviewUI,
  MidSideEQUI, SpectralRecoveryUI, LoudnessTargetUI, MSImagerUI,
  LoudnessMeter2UI — these UIs **do not exist as exports anywhere**.
  `dynamicEQ` and `freqShifter` UIs do exist but are unregistered.

This was already in memory as "30+ plugin UIs imported but
unregistered — audit confirmed it's actually 36 unregistered + 8
that have no UI export at all".

### 4. `DehummmerUI` typo blocks COMPONENT_MAP fix
The Dehummer UI is exported under a misspelled name with three m's
(`DehummmerUI`). Adding `DehummerUI` to COMPONENT_MAP would not work —
the export name needs to be fixed first. Single-character rename, but
worth flagging because a "just register all the missing UIs" PR would
fail on this one plugin.

### 5. PluginHost factories have no destroy() — Web Audio leak per insert
`PluginHost.removePlugin` (`PluginHost.js:334`) calls
`inst.destroy()`. **~100 of 111 ph_* factories return `disconnect()`
only.** OscillatorNodes keep running, ScriptProcessors keep firing,
setIntervals never clear, AudioBufferSourceNodes don't release. Adding
+removing plugins repeatedly leaks Web Audio resources until the page
locks up. Affects every ph_* plugin except Compressor, Gain, EQ3Band
(the three reference implementations) and a handful of others.

### 6. `registry.js` and factory `setParam` switches diverged
**Affects: ~70% of ph_* plugins.** `registry.js` declares parameter
schemas (used to render PluginHost UI knobs); each factory has its own
`setParam(name, value) { switch(name) { … } }`. The two were written
in different sessions and never reconciled. Many plugins have UI knobs
mapped to non-existent factory cases — every knob spins, nothing
happens. Most extreme: **multiPress** (15/15 dead), **transGate**
(7/10 dead), **vocalSaturator**, **tapeStop** (literal `setParam() {}`
no-op), **pitchRandomizer** (same).

### 7. ms-vs-s unit mismatch is endemic in delay/reverb
**Affects: ~15 plugins.** UI sends `time: 250` meaning 250 ms; engine
calls `delayNode.delayTime.value = 250` treating it as 250 seconds and
clamping to the 2-second buffer max. Confirmed in: echoField, dualDelay,
reverseDelay, tempoDelay, vocalSpace, hallForgeS/L, gateVerb, vintageAir,
stochasticHall, greatHall, plateForge, springBox. Standard correction
is `safeNum(v) / 1000` at the engine boundary — single helper, ~15
call sites.

### 8. Audible-on-insert defaults
**Affects: 25+ plugins.** Inserting a plugin with default values should
be a no-op until the user touches a knob. Many plugins audibly color
the signal on insert — most dangerous: **stereoForge** (+12 dB on
insert from width 0–200% UI vs gain 0–4 engine), **fuzz** (default
gain=50× into hard-clip = catastrophic distortion), **overdrive**
(writes UI Hz into a dB AudioParam), **vowelFilter** (+36 dB cumulative
formant boost), **VocalComp** (always-on +3 dB make-up gain — bus
clip), **infiniteReverb** (50% wet, 8-second reverb), **enhancer808**
(+7 dB sub boost), **shimmerReverb** (40% wet + 0.7 feedback), plus
~17 others.

### 9. Several "engines" are placeholders
Plugins where the audio code does not implement the advertised
function:
- **AutoTune** (ph_*) — single delay+lowpass; no pitch correction.
- **PitchShifter** (ph_*) — single 10 ms delay; no pitch shift at all.
- **Harmonizer** (ph_*) — delays + allpass with hardcoded semitones.
- **PitchForge** (SPX) — UI promises pitch shift; engine is a filter.
- **PitchLock** (SPX) — entire UI decorative; factory is a passthrough.
- **HarmonicSum** (SPX) — UI decorative; static immutable saturation.
- **VoiceForge** (SPX) — labeled "4-voice harmonizer"; ships a peak EQ.
- **MasterWall** (SPX) — labeled "true peak limiter w/ ISP/dither";
  ships a generic compressor with one live knob.
- **SpectralGate** (ph_*) — analyser node is dead code; engine is just
  a hard-knee DynamicsCompressor.
- **StereoWidener** (ph_*) — M/S math broken; both mid and side paths
  sum L+R, never compute the difference.
- **MidSideEQ / MidSideBalance / MidSideProcessor** (ph_* trio) — share
  broken M/S routing with no encode/decode.
- **TransientDesigner** (ph_*) — knobs write to orphan GainNodes;
  setInterval re-reads constructor defaults each tick. UI dead.
- **TapeStop / PitchRandomizer** (SPX) — `setParam() {}` no-op.

### 10. GraphicEQ4Band / 5Band / 6Band — factories never imported
`PluginHost.js` does not import `GraphicEQ4BandPlugin.js`,
`GraphicEQ5BandPlugin.js`, or `GraphicEQ6BandPlugin.js`. Calling
`addPlugin('graphic_e_q4_band')` throws `No factory for plugin`. The
three factory files exist and are well-written; the registry advertises
them; the host can't load them.

### 11. goniometer / phaseScope show fake data
Both meter visualizations use `Math.random()` instead of real audio
analysis (`AnalyserNode.getFloatTimeDomainData`). They render visibly
but the data has no relationship to the audio bus.

### 12. Stale duplicate factory exports — bundle bloat
Many ph_* plugin files contain 5–25 redundant `createXyzPlugin` exports
copied from neighboring files (probably by an earlier code-gen pass).
PluginHost imports each plugin from its own dedicated file, so all the
duplicates are dead. Conservative estimate: **~5,000 LOC of cargo**
in `DynamicEQPlugin.js`, `AirEQPlugin.js`, `FETCompPlugin.js`,
`GatePlugin.js`, `HallReverbPlugin.js`, `MidSideEQPlugin.js`,
`NotchEQPlugin.js`, `OpticalCompPlugin.js`, etc.

---

## Demo-blockers (P0) — full list, grouped by failure mode

### A. UI knobs do not reach the engine (param name divergence) — 60+
The plugin makes sound, but the UI lies — most or all knobs are dead.
Fix is per-plugin: rename engine cases to match UI knob keys, or vice
versa. Examples (full list across batch files):

**SPX:** ironCore, consoleSoul, optoPress, multiPress, transGate,
sibilantCut, phantomDouble, harmonicExcite, gainRider, harmonicSum,
voiceForge, vocalSaturator, subOctaver, vocoderSPX, granularFreeze,
noiseReduction, ringMod, formantFilter, transientShaper, infiniteReverb,
tempoDelay, pitchRandomizer, autoWah, drumEnhancer, gainStager,
midSideComp, multibandLimiter, multibandSat, loFiCrusher,
chorusEnsemble, declicker, dehummer, dialogueIsolator, cabinetSim.

**ph_*:** AICompressor, AIDeRoom, AIEQMatch, AINoiseReduce, AIVocalClean,
AirEQ, AmpSim, AutoFilter, BitDepth, Bitcrusher, BreathGate,
BrickwallLimiter, Cassette, ChamberReverb, ChannelStrip, Choir, Chorus,
ConvolutionShaper, DeEsser, DottedEighthDelay, DrumBus, DynamicEQ,
EnvelopeFilter, FETComp, FrequencyShifter, GatedReverb, GranularFreeze,
GraphicEQ, HaasEffect, HarmonicExciter, HiHatShimmer, LinearPhaseEQ,
LoudnessMaximizer, MidSideBalance, MultibandComp, MultitapDelay,
Octaver, OpticalComp, Phone, PresenceEQ.

### B. UI window is empty (COMPONENT_MAP gap) — 36 plugins
Engine may work fine; UI returns null on click. See structural
finding #3 for the full list. Note: 5 of these would be ✅ working
just by adding to COMPONENT_MAP — see "Highest-leverage fixes" #2.

### C. Wrong unit handling — 15+ plugins
- ms vs s: echoField, dualDelay, reverseDelay, tempoDelay, vocalSpace,
  most reverb pre-delays
- 0–100% vs 0–1 multiplier: parallelCrush mix, several creative plugins
- Hz vs dB: **Overdrive** writes UI Hz into a dB AudioParam — clipping
  on insert
- linear vs dB: gainStager (UI 0–4 linear, engine `10^(v/20)`)
- semitones vs Hz: phantomDouble pitchVarL/R
- multiplied instead of divided: tempoDelay beat division

### D. Dangerous default values — 12 plugins
- **stereoForge**: +12 dB on insert (width 0–200% UI vs 0–4 engine)
- **fuzz**: default gain=50× into hard-clip, square-wave on insert
- **overdrive**: tone Hz into dB AudioParam, may crash audio
- **vowelFilter**: +36 dB cumulative formant boost
- **VocalComp**: always-on +3 dB make-up gain
- **shimmerReverb**: 40% wet + 0.7 feedback on insert
- **infiniteReverb**: 50% wet, 8-second reverb on insert
- **enhancer808**: +7 dB sub boost on insert
- **stepFilter** / **SPXPerceptualEQ**: enabled=true with RAF/setInterval
  modulating filter gain — audible coloration before user input
- **autoWah**: always-on wah
- **tapeStop**: always darken+attenuate even when `active=false`
- **deesser** (native): static -20 dB notch at 6 kHz on insert

### E. Placeholder / fake engines — 13 plugins
See structural finding #9.

### F. Catastrophic topology errors — 5 plugins
- **multiPress**: serial 2-comp chain advertised as 4-band MB-comp
- **transGate**: limiter dressed up as a gate (compresses ABOVE
  threshold)
- **dualDelay**: mono serial delay advertised as stereo with crossfeed
- **stereoWidener**: M/S math wrong (both paths L+R)
- **TransientDesigner**: knobs write to orphan nodes

### G. Deprecated / leaky APIs — 4 plugins
- **Looper**: deprecated ScriptProcessorNode + unbounded `rec[]` array
  during record + signal triple-summed during playback
- **SampleRateReducer**: deprecated `createScriptProcessor` with no
  AudioWorklet fallback + no cleanup of `onaudioprocess`
- **TransientDesigner**: setInterval re-reads constructor defaults
- **SPXPerceptualEQ / StepFilter**: RAF loop runs by default

### H. Plugin host can't load the factory — 3 plugins
GraphicEQ4Band, GraphicEQ5Band, GraphicEQ6Band — `addPlugin(...)` throws
`No factory for plugin`. Three additional `import` statements in
`PluginHost.js` would fix all three.

### I. Misc P0 (1)
- **exciter** (native): HPFs at 3 kHz on insert with dead mix knob —
  user hears the track go thin and can't recover.

---

## Highest-leverage fixes (in order of impact-per-hour)

These are structural fixes that move many plugins from broken to
working at low cost. **In priority order:**

| # | Fix | Plugins re-enabled | Estimated hours |
|--:|---|---:|---:|
| 1 | Add `inst.setParam` call to `ConsoleFXPanel.updateEffect` (RS:3944) | 18 native | 0.5 |
| 2 | Register the 22 §A8 + 13 §A9 + 2 §A10 UIs in COMPONENT_MAP | 37 SPX | 1 |
| 3 | Fix `DehummmerUI → DehummerUI` typo, then register | +1 SPX | 0.25 |
| 4 | Add `import` for GraphicEQ4Band/5Band/6Band in PluginHost.js | 3 ph_* | 0.5 |
| 5 | Helper `safeMs(v) → v/1000` at every engine `delayTime.value =` site (~15 plugins) | 15 SPX | 2 |
| 6 | Add a default `destroy()` in PluginHost wrapper that walks `nodes`/`oscs`/`intervals` arrays — opt-in per plugin | ~100 ph_* | 4–6 |
| 7 | Reconcile `registry.js` and factory `setParam` cases (rename engine cases to match UI keys) | ~60 plugins | 8–12 |
| 8 | Defang dangerous defaults (stereoForge, fuzz, overdrive, vowelFilter, VocalComp, shimmerReverb, infiniteReverb, enhancer808, stepFilter, SPXPerceptualEQ, autoWah, tapeStop) | 12 plugins | 2 |
| 9 | Replace Math.random() in goniometer / phaseScope with real AnalyserNode reads | 2 plugins | 1 |
| 10 | Wire reverb + delay as inserts (or expose live setParam through the send bus) | 2 native | 3–4 |
| 11 | Build a route-as-fake catalog or quarantine: AutoTune, PitchShifter, Harmonizer, PitchForge, PitchLock, HarmonicSum, VoiceForge, MasterWall, SpectralGate, StereoWidener, MidSide trio, TransientDesigner | 13 plugins | gate behind a feature flag (2h) or implement properly (weeks) |
| 12 | Delete ~5,000 LOC of duplicated factory exports across ph_* multi-files | 0 plugins (cleanup only) | 2 |

**Cumulative impact through fix #5:** ~74 plugins move from broken
to working in **~4 hours**.

**Cumulative impact through fix #8:** ~150 of the 216 plugins are no
longer demo-blockers in **~20 hours total**.

---

## Honest demo assessment (today, 2026-05-06)

**Plugins safe to demo on insert:** 11 plugins — eq, gate, limiter,
tremolo, filter, distortion (native); ironBand (SPX); Compressor,
EQ3Band, Gain, TiltEQ (ph_*).

**Plugins safe to demo if user does not touch any knob:** ~30 more
P1/P2 plugins where defaults are reasonable but live updates are
dead.

**Plugins NOT safe to demo:** ~150. Either the UI is empty
(COMPONENT_MAP gap), the knobs are silently dead, the defaults clip
the bus, or the engine is a placeholder.

**The single biggest demo risk:** **stereoForge** (+12 dB on insert,
guaranteed bus clipping). Second-biggest: **fuzz** (default gain=50×
into hard-clip, square-wave). Third: **multiPress** (the flagship
multiband compressor — 15/15 knobs dead, isn't multiband at all).

**Riskiest UX failure mode:** Clicking a plugin in the FX picker and
getting an empty floating window. This happens for 36 plugins today.
Users will conclude the studio is broken — and they are not wrong.

---

## Per-batch summaries (links to detail)

Each batch file has full per-plugin entries with file:line evidence
for every bug class call, plus per-batch "Common patterns" blocks.

| Batch | Range | Plugins | File |
|---|---|---:|---|
| 01 | 18 native effects | 18 | `audit_progress/batch_01_native.md` |
| 02 | SPX Analog + Dynamics | 12 | `audit_progress/batch_02_analog_dynamics.md` |
| 03 | SPX EQ + Spatial | 14 | `audit_progress/batch_03_eq_spatial.md` |
| 04 | SPX Vocal + Mastering | 15 | `audit_progress/batch_04_vocal_mastering.md` |
| 05 | SPX additional/creative | 22 | `audit_progress/batch_05_creative.md` |
| 06 | SPX missing + Ozone | 24 | `audit_progress/batch_06_missing_ozone.md` |
| 07 | ph_* A through G | 45 | `audit_progress/batch_07_ph_ag.md` |
| 08 | ph_* H through P | 29 | `audit_progress/batch_08_ph_hp.md` |
| 09 | ph_* R through W | 37 | `audit_progress/batch_09_ph_pw.md` |

### Batch headlines

- **Batch 01:** 1 P0 (exciter); 9 P1; 6 clean. Big finding: native
  knobs are dead at runtime due to a 2-line gap in `updateEffect`.
- **Batch 02:** 6 P0 of 12. multiPress is fake multiband; transGate
  is a limiter dressed as a gate.
- **Batch 03:** 2 P0 of 14 (echoField, dualDelay). All due to ms-vs-s
  unit bug. ReverbBase knob set universally unhandled.
- **Batch 04:** 10 P0 of 15. stereoForge is the worst single demo risk
  in the entire audit (+12 dB on insert).
- **Batch 05:** 21 P0 of 22 — but 5 (pultecForge, graphicEQ, tiltEQ,
  baxandallEQ, enhancer808) work cleanly behind the COMPONENT_MAP gap.
- **Batch 06:** 19 P0 of 24. 8 Ozone plugins have engines but no UI
  exports at all. dehummer typo blocks fix.
- **Batch 07:** 33 P0 of 45. AutoTune is fake. GraphicEQ band-variant
  factories never imported into PluginHost.
- **Batch 08:** 19 P0 of 29. PitchShifter and Harmonizer are fakes.
  Looper uses deprecated ScriptProcessor with unbounded memory growth.
  Mid-Side trio share broken routing.
- **Batch 09:** 9 P0 of 37 (lowest P0 ratio of any batch). StereoWidener
  M/S math broken; VowelFilter +36 dB on insert; SpectralGate is just
  a DynamicsCompressor with dead analyser code.

---

## Search strategy used (for reproducibility)

```
# Inventory
grep -n "ALL_FX_EXTENDED\|COMPONENT_MAP\|PLUGIN_DEFAULTS" \
  src/front/js/component/SPXPlugins.js
ls src/front/js/component/audio/plugins/plugins/*.js

# Per-plugin
for k in <key>; do
  grep -n "case '$k'" src/front/js/component/SPXPlugins.js \
    src/front/js/pages/RecordingStudio.js
  grep -n "$k:" src/front/js/component/SPXPlugins.js
  cat src/front/js/component/audio/plugins/plugins/<Name>Plugin.js
done

# Worklets
grep -rn "AudioWorkletNode\|registerProcessor\|spx-limiter\|spx-meter" \
  src/front/js
grep -rn "createScriptProcessor" src/front/js  # deprecated → flag

# Dispose hygiene
grep -A2 "destroy\|dispose" src/front/js/component/audio/plugins/plugins/
```

No code or configuration was modified during this audit. The single
file written is `PLUGIN_AUDIT.md` at the repo root, plus 11 files in
`audit_progress/` (1 spec, 1 inventory, 9 batch reports).
