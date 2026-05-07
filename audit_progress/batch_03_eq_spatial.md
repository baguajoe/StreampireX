# Batch 03 — SPX EQ + Spatial (14 plugins)

Auditor #3. All 14 plugins are SPX-native (engine lives in
`RecordingStudio.js buildFxChain`, UIs in `SPXPlugins.js`). All 14 are
confirmed registered in `COMPONENT_MAP` (SPXPlugins.js:1759–1762).
No AudioWorklets used by any plugin in this batch — Class 4 is N/A
across the board. Defaults check: PLUGIN_DEFAULTS seeds these on insert;
UI `useState({...defaults, ...params})` re-establishes neutral on
re-open. ReverbBase default has `mix: 30` (= 30%) → audible-on-insert
for hallForgeS/L/gateVerb/vintageAir/stochasticHall/greatHall.

The dispatch path is: UI `onChange(s)` ships the entire merged state
object → RecordingStudio (line 5906) diffs vs old patch → calls
`inst.setParam(key, newValue)` for each changed key. Param names must
match the engine's `case` labels exactly.

---

### 1. IronBand (`ironBand`)
- **UI file:** `src/front/js/component/SPXPlugins.js:586`
- **Factory:** native — `RecordingStudio.js:1411` (`makeIronBand`)
- **1. Param names:** ✅ — `lowGain/lowFreq/lowMidGain/lowMidFreq/hiMidGain/hiMidFreq/hiGain/hiFreq/hpf/lpf/inputGain` all map (RS:1432–1442).
- **2. Units:** ✅ — UI dB→engine dB→linear via `Math.pow(10, x/20)` for inputGain; freqs Hz both sides.
- **3. Missing cases:** ✅ — every UI knob has a case.
- **4. Worklets:** N/A — pure BiquadFilter chain.
- **5. Topology:** ✅ — ig→hpf→low→lowMid→hiMid→hi→lpf, neutral pass-through at defaults (RS:1426).
- **6. Dispose:** ✅ — disconnects all 7 nodes (RS:1446).
- **7. Defaults:** ✅ — all 0 dB / inputGain 0 / hpf 0 (passes neutral via `>20` guard) / lpf 20000.
- **8. COMPONENT_MAP:** ✅ registered (SPXPlugins.js:1759).
- **Severity:** clean
- **Demo-blocker?:** no

### 2. SpectraCurve (`spectraCurve`)
- **UI file:** `src/front/js/component/SPXPlugins.js:646`
- **Factory:** native — `RecordingStudio.js:2171`
- **1. Param names:** ⚠️ — UI emits `bands` array as a whole (correct, engine reads `setParam("bands", arr)` RS:2194). UI also emits `mode` (stereo/mid/side/left/right) but engine has **no `mode` case** — M/S routing is silently ignored. UI ribbon lies.
- **2. Units:** ✅ — freq Hz, gain dB, q raw on both sides.
- **3. Missing cases:** ⚠️ — `mode` (RS:2192–2204 only handles `bands`). Selecting Mid/Side/L/R does nothing in audio.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — head→f1…fN→tail serial chain (RS:2188).
- **6. Dispose:** ✅ — disconnects head, tail, all filters (RS:2205).
- **7. Defaults:** ✅ — all gains 0, q 1, neutral.
- **8. COMPONENT_MAP:** ✅ registered (SPXPlugins.js:1759).
- **Severity:** P1 (mode knob deceptive — selectable but audibly does nothing)
- **Demo-blocker?:** no — band edits do work; but advertising "MID-SIDE MATRIX" in UI footer (line 697) is misleading.

### 3. HallForgeSmall (`hallForgeS`)
- **UI file:** `src/front/js/component/SPXPlugins.js:741` (ReverbBase wrapper)
- **Factory:** native — `RecordingStudio.js:2266`
- **1. Param names:** ⚠️ — UI/ReverbBase emits `preDelay/decay/diffusion/damping/earlyLevel/lateLevel/mix/hpf/lpf/roomSize`. Engine handles only `decay/preDelay/mix` (RS:2273–2278). 7 knobs dead: `diffusion, damping, earlyLevel, lateLevel, hpf, lpf, roomSize`.
- **2. Units:** ❌ — `preDelay` UI is **ms** (range 0–150, default 20), engine `setTime` treats it as **seconds** → 20→`pre.delayTime=20s` clamped to 0.1s buffer max → knob pegged at max regardless of value (RS:2267, 2275). Decay UI is seconds, engine seconds: ✅. Mix UI 0–100% normalized via `normalizeMix`: ✅.
- **3. Missing cases:** ❌ — 7 missing setParam cases (above).
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — pre→conv→g; wet-only (no dry sum). Mix knob is wet-gain not crossfade — at mix=0 still has dry through main chain because this is an insert that replaces dry — actually look closer: the chain has dry passing through `pre` delay and conv; there is no parallel dry. So at mix=0 audio is muted entirely until conv tail → effectively a 100% wet plugin with mix = output level. **Topology bug**: should be parallel dry+wet sum.
- **6. Dispose:** ✅ — disposes pre/conv/g (RS:2279).
- **7. Defaults:** ⚠️ — mix=30, decay=2.5, audible on insert.
- **8. COMPONENT_MAP:** ✅ registered (SPXPlugins.js:1760).
- **Severity:** P1 (preDelay broken; 7 dead knobs; no dry path)
- **Demo-blocker?:** no — base reverb is audible.

### 4. HallForgeLarge (`hallForgeL`)
- **UI file:** `src/front/js/component/SPXPlugins.js:744` (ReverbBase wrapper)
- **Factory:** native — `RecordingStudio.js:2282`
- **1. Param names:** ⚠️ — same as hallForgeS plus `surroundWidth` extraKnob — engine has no case for it. 8 knobs dead: `diffusion, damping, earlyLevel, lateLevel, hpf, lpf, surroundWidth`.
- **2. Units:** ❌ — same `preDelay` ms-vs-s bug as hallForgeS (default 20→clamped).
- **3. Missing cases:** ❌ — 7 ReverbBase + `surroundWidth` missing.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠️ — wet-only (no parallel dry path).
- **6. Dispose:** ✅.
- **7. Defaults:** ⚠️ — mix=30 audible on insert.
- **8. COMPONENT_MAP:** ✅ registered (SPXPlugins.js:1760).
- **Severity:** P1 (same dead-knob/preDelay set as hallForgeS)
- **Demo-blocker?:** no.

### 5. GateVerb (`gateVerb`)
- **UI file:** `src/front/js/component/SPXPlugins.js:747` (ReverbBase wrapper, extras gateThresh/gateDecay)
- **Factory:** native — `RecordingStudio.js:2298`
- **1. Param names:** ❌ — engine handles only `mix` (RS:2305). All ReverbBase knobs (preDelay/decay/diffusion/damping/earlyLevel/lateLevel/hpf/lpf) and both extras (gateThresh/gateDecay) are dead. Decay is hardcoded 0.3 in factory line 2299.
- **2. Units:** N/A — only `mix` works (normalized via `setReverbMix` ✅).
- **3. Missing cases:** ❌ — 10 dead knobs.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠️ — conv→gate→g; wet-only, no dry sum. Compressor is hardcoded -20 dB threshold, not user-tunable.
- **6. Dispose:** ✅ — conv/gate/g (RS:2306).
- **7. Defaults:** ⚠️ — mix=30 audible on insert; gateDecay=0 / gateThresh=0 in PLUGIN_DEFAULTS (line 1687) but engine ignores both.
- **8. COMPONENT_MAP:** ✅ registered (SPXPlugins.js:1760).
- **Severity:** P1 (10 dead knobs — only Mix works)
- **Demo-blocker?:** no — produces a short gated reverb, just non-tunable.

### 6. VintageAir (`vintageAir`)
- **UI file:** `src/front/js/component/SPXPlugins.js:753` (ReverbBase, extras `density`)
- **Factory:** native — `RecordingStudio.js:2309`
- **1. Param names:** ❌ — UI extra is `density`; engine handles `air` (highshelf gain). **Name mismatch — `density` knob is dead, and there is no UI knob to drive `air`** (RS:2316–2319). Engine handles `decay/air/mix`.
- **2. Units:** ❌ — preDelay UI ms vs no engine case (not handled at all here either). `air` not in UI.
- **3. Missing cases:** ❌ — `preDelay/diffusion/damping/earlyLevel/lateLevel/hpf/lpf/density` all missing.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠️ — conv→air→g; wet-only.
- **6. Dispose:** ✅ — conv/air/g.
- **7. Defaults:** ⚠️ — mix=30; air builds with `p.air||3` so highshelf +3dB on insert (no UI to change it).
- **8. COMPONENT_MAP:** ✅ registered (SPXPlugins.js:1760).
- **Severity:** P1 (UI/engine name mismatch — density vs air)
- **Demo-blocker?:** no.

### 7. StochasticHall (`stochasticHall`)
- **UI file:** `src/front/js/component/SPXPlugins.js:756` (ReverbBase, extras `randomness/spread`)
- **Factory:** native — `RecordingStudio.js:2325`
- **1. Param names:** ❌ — engine handles only `decay/mix` (RS:2331–2335). `randomness/spread` and all 7 ReverbBase extras dead.
- **2. Units:** N/A on dead knobs; decay s ✅, mix normalized ✅.
- **3. Missing cases:** ❌ — 9 missing.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠️ — conv→g; wet-only, no dry sum, no actual stochastic randomization (factory just wraps a single conv).
- **6. Dispose:** ✅ — conv/g.
- **7. Defaults:** ⚠️ — mix=30 audible.
- **8. COMPONENT_MAP:** ✅ registered (SPXPlugins.js:1761).
- **Severity:** P1 (mostly broken — only decay+mix live; the "stochastic" character is cosmetic)
- **Demo-blocker?:** no.

---

(Saving progress at 7/14 — checkpoint.)

### 8. GreatHall (`greatHall`)
- **UI file:** `src/front/js/component/SPXPlugins.js:762` (bare ReverbBase)
- **Factory:** native — `RecordingStudio.js:2339`
- **1. Param names:** ❌ — engine handles `decay/mix` (RS:2346–2350). Engine constructs a `pre` delay of fixed 0.06s and ignores the UI `preDelay` knob entirely. 7 ReverbBase knobs dead.
- **2. Units:** N/A on dead knobs; decay s ✅; mix normalized ✅.
- **3. Missing cases:** ❌ — `preDelay/diffusion/damping/earlyLevel/lateLevel/hpf/lpf` all missing.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠️ — pre→conv→g; wet-only.
- **6. Dispose:** ✅ — pre/conv/g (RS:2351).
- **7. Defaults:** ⚠️ — mix=30, decay=2.5, audible on insert.
- **8. COMPONENT_MAP:** ✅ registered (SPXPlugins.js:1761).
- **Severity:** P1 (7 dead knobs — only decay+mix live)
- **Demo-blocker?:** no.

### 9. PlateForge (`plateForge`)
- **UI file:** `src/front/js/component/SPXPlugins.js:765`
- **Factory:** native — `RecordingStudio.js:2354`
- **1. Param names:** ❌ — UI emits `decay/damping/diffusion/mix/bass/treble/width`; engine handles `decay/brightness/mix` (RS:2361–2365). `damping/diffusion/bass/treble/width` dead, and engine references `brightness` which the UI never emits → highshelf is pinned at default `p.brightness||2` = +2 dB always.
- **2. Units:** ✅ on the live ones. `bass/treble` UI is ±6 dB but no engine path.
- **3. Missing cases:** ❌ — 5 missing (damping/diffusion/bass/treble/width). `brightness` is a phantom knob in engine.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠️ — conv→bri→g; wet-only.
- **6. Dispose:** ✅ — conv/bri/g (RS:2367).
- **7. Defaults:** ⚠️ — mix=25 audible.
- **8. COMPONENT_MAP:** ✅ registered (SPXPlugins.js:1761).
- **Severity:** P1 (5 dead UI knobs + UI/engine name mismatch on bass↔brightness)
- **Demo-blocker?:** no.

### 10. SpringBox (`springBox`)
- **UI file:** `src/front/js/component/SPXPlugins.js:790`
- **Factory:** native — `RecordingStudio.js:2370`
- **1. Param names:** ❌ — UI emits `tanks/tension/damping/drip/mix/inputGain`; engine handles only `mix` (RS:2377). `tanks/tension/damping/drip/inputGain` all dead.
- **2. Units:** N/A on dead knobs; mix normalized ✅.
- **3. Missing cases:** ❌ — 5 missing.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠️ — conv→mid→g; wet-only. mid filter pinned 1200 Hz +3 dB (hardcoded RS:2372).
- **6. Dispose:** ✅ — conv/mid/g.
- **7. Defaults:** ⚠️ — mix=30 audible.
- **8. COMPONENT_MAP:** ✅ registered (SPXPlugins.js:1761).
- **Severity:** P1 (5 dead knobs; only Mix tunable)
- **Demo-blocker?:** no.

### 11. EchoField (`echoField`)
- **UI file:** `src/front/js/component/SPXPlugins.js:825`
- **Factory:** native — `RecordingStudio.js:2474`
- **1. Param names:** ❌ — UI emits `time/feedback/modRate/modDepth/hpf/lpf/stereoSpread/mix/sync`; engine handles `time/feedback/mix` (RS:2482–2486). `modRate/modDepth/hpf/lpf/stereoSpread/sync` dead.
- **2. Units:** ❌ — UI `time` is **ms** (range 10–2000, default 250), engine `setTime` treats as **seconds** at build (`setTime(d.delayTime, p.time||0.4)`) and on setParam (`safe(v, 0.4, 0, 2)`). Default 250 → engine writes 250 to delayTime (delay buffer max 2s) → silently clamped to 2s. Time knob effectively pegged. **Major bug.**
- **3. Missing cases:** ❌ — 6 missing.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠️ — d→fb→d feedback loop, d→g wet; wet-only (no dry sum). Feedback gain hits max 0.95 ✅. No HPF/LPF in feedback loop, so darkening/runaway not preventable.
- **6. Dispose:** ✅ — d/fb/g (RS:2488).
- **7. Defaults:** ⚠️ — mix=25 audible. **feedback default 0.4** is borderline OK.
- **8. COMPONENT_MAP:** ✅ registered (SPXPlugins.js:1762).
- **Severity:** **P0** — UI time=250 means "250 ms" but engine sets 2 s (clamped); plugin sounds wildly wrong vs UI label/visualizer. Visualizer (DelayTapVisualizer) draws 250 ms taps but audio plays 2-second taps. Demo will surface this.
- **Demo-blocker?:** **YES** — time knob is broken in a way users will hear and notice immediately.

### 12. StereoBloom (`stereoBloom`)
- **UI file:** `src/front/js/component/SPXPlugins.js:859`
- **Factory:** native — `RecordingStudio.js:2459`
- **1. Param names:** ❌ — UI emits `mode/rate/depth/feedback/detuneL/detuneR/mix`; engine handles `width/mix` (RS:2466–2469). UI never emits `width`. **All but `mix` dead.**
- **2. Units:** N/A on dead knobs; mix normalized ✅.
- **3. Missing cases:** ❌ — 6 missing; `width` is phantom.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠️ — conv→stereoPanner→g; convolver as chorus is the wrong primitive; wet-only.
- **6. Dispose:** ✅ — conv/wi/g (RS:2471).
- **7. Defaults:** ⚠️ — mix=50 audible.
- **8. COMPONENT_MAP:** ✅ registered (SPXPlugins.js:1762).
- **Severity:** P1 (chorus/flanger UI but reverb-style implementation; only mix live)
- **Demo-blocker?:** no — but plugin is essentially placeholder.

### 13. PitchForge (`pitchForge`)
- **UI file:** `src/front/js/component/SPXPlugins.js:895`
- **Factory:** native — `RecordingStudio.js:2548`
- **1. Param names:** ❌ — UI emits `shift/formant/grainSize/crossfade/mix/pitchA/pitchB/harmony`; engine handles `pitch` only (RS:2554). UI never emits `pitch`. **Every UI knob is dead.**
- **2. Units:** N/A — none connect.
- **3. Missing cases:** ❌ — all 8 missing; `pitch` is phantom.
- **4. Worklets:** N/A — but the comment explicitly notes "True pitch-shift requires a worklet" (RS:2549). The current engine is an allpass color filter, not pitch shift.
- **5. Topology:** ⚠️ — single allpass; not pitch-shift.
- **6. Dispose:** ✅ — disposeNodes(ap) (RS:2555).
- **7. Defaults:** ✅ — shift=0, mix=100 (UI mix max), but engine ignores so neutral by accident.
- **8. COMPONENT_MAP:** ✅ registered (SPXPlugins.js:1762).
- **Severity:** P1 (placeholder — UI promises pitch shifting, engine is a filter; no audible effect from any UI knob)
- **Demo-blocker?:** no — silent placeholder, but advertising as PitchForge is misleading.

### 14. DualDelay (`dualDelay`)
- **UI file:** `src/front/js/component/SPXPlugins.js:919`
- **Factory:** native — `RecordingStudio.js:2529`
- **1. Param names:** ❌ — UI emits `timeL/timeR/feedbackL/feedbackR/crossfeedL/crossfeedR/modRate/modDepth/hpf/lpf/mix`; engine handles `time1/time2/mix` (RS:2538–2541). UI never emits `time1/time2`. **All time/feedback/crossfeed knobs dead.**
- **2. Units:** ❌ — even if names matched, UI `timeL/timeR` are **ms** (range 10–2000) but engine `setTime` treats as seconds → 250 → clamped to 2s buffer max. Same ms-vs-s bug as EchoField.
- **3. Missing cases:** ❌ — 8 missing (timeL/timeR/feedbackL/feedbackR/crossfeedL/crossfeedR/modRate/modDepth/hpf/lpf); `time1/time2` are phantoms.
- **4. Worklets:** N/A.
- **5. Topology:** ❌ — engine is `d1→d2→g` (serial!). UI says "LEFT" / "RIGHT" with separate timing. There's no stereo split — both signals pass through both delays. **Topology fundamentally wrong vs. UI promise.**
- **6. Dispose:** ✅ — d1/d2/g (RS:2543).
- **7. Defaults:** ⚠️ — mix=30 audible. **No feedback in engine path** (no feedback gain) so the engine produces a single delayed tap with no echo, while UI shows feedback knob and a multi-tap visualizer.
- **8. COMPONENT_MAP:** ✅ registered (SPXPlugins.js:1762).
- **Severity:** **P0** — UI promises stereo dual-tap delay with feedback; engine is a mono serial 2-tap with no feedback. Visualizer shows L/R taps that don't exist. Time knobs all peg at 2s.
- **Demo-blocker?:** **YES** — DualDelay is a marquee plugin name; both topology and time-unit bugs surface immediately.

---

## Batch 03 Summary

- **Total audited:** 14 (all SPX-native EQ + Spatial)
- **Clean:** 1 (IronBand)
- **P2 (cosmetic):** 0
- **P1 (polish):** 11 (SpectraCurve, hallForgeS, hallForgeL, GateVerb, VintageAir, StochasticHall, GreatHall, PlateForge, SpringBox, StereoBloom, PitchForge)
- **P0 (demo-blocker):** 2 — **EchoField**, **DualDelay**
- **Top 3 worst:** DualDelay (topology + units + names all wrong), EchoField (time-ms vs delay-s clamps to 2s; 6 dead knobs), StochasticHall/SpringBox (tied — only 1 of 9 knobs live).
- **Common patterns:**
  1. **`preDelay` ms↔s units bug** on every ReverbBase user (hallForgeS, hallForgeL — and GateVerb/VintageAir/StochasticHall/GreatHall don't even handle preDelay). UI emits ms; engine `setTime` treats as seconds; createDelay(0.1) buffer clamps. Reproduces on every reverb in this batch.
  2. **`time` ms↔s units bug** identical pattern on EchoField + DualDelay (delay primitives) — UI ms, engine seconds, buffer clamp at 2s.
  3. **Wet-only topology** on every reverb/delay — no parallel dry sum, so `mix` knob is wet-gain only. Setting mix=0 cuts audio entirely (since wet replaces dry via inline insert).
  4. **ReverbBase extras almost universally unread**: `roomSize/surroundWidth/density/randomness/spread/gateThresh/gateDecay` — defined in UI extraKnobs and seeded in PLUGIN_DEFAULTS but no `case` exists in the engine factory.
  5. **`diffusion/damping/earlyLevel/lateLevel/hpf/lpf` from ReverbBase**: declared globally in UI base, never handled by any of the 6 reverbs that import it.
  6. **Phantom param names**: engine handles params the UI never emits (`brightness` on PlateForge, `air` on VintageAir, `width` on StereoBloom, `pitch` on PitchForge, `time1/time2` on DualDelay). Indicates the engine factories were drafted from a different UI version and never reconciled.
  7. **Audible-on-insert**: ReverbBase mix=30 default makes 6 reverbs sound on insert before the user touches anything — borderline; might be a feature, but EchoField mix=25 + feedback 0.4 is also live on insert.

**Recommended fixes (ordered by ROI):**
- (P0) Fix EchoField/DualDelay time units: divide UI value by 1000 before `setTime`/setTargetAtTime, OR change UI ranges to seconds.
- (P0) Fix DualDelay topology: use ChannelSplitter→2 delays→ChannelMerger; rename param keys to match UI (`timeL/timeR/...`).
- (P1) Add the missing setParam cases for ReverbBase common knobs (preDelay/diffusion/damping/earlyLevel/lateLevel/hpf/lpf) once topology supports them, OR drop them from ReverbBase to stop lying.
- (P1) Switch reverb topology from inline-wet to parallel dry+wet sum so `mix` is a true crossfade.
- (P1) Wire SpectraCurve `mode` to actual M/S routing (or hide UI mode buttons).
- (P1) Add UI knobs for PlateForge `bass/treble/width` to actual engine implementations or rename engine `brightness`→`treble`.
