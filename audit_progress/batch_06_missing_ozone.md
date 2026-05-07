# Batch 06 — §A9 "Missing from COMPONENT_MAP" + §A10 Ozone-level

Auditor: #6 (parallel batch)
Branch: `claude/fix-recording-studio`
Scope: 24 plugins — 15 §A9 + 9 §A10.

Reference notes:
- `ALL_FX_EXTENDED` lines 1599–1624 of SPXPlugins.js declare these.
- `COMPONENT_MAP` (lines 1755–1768) does NOT register ANY of them.
- Comment at lines 1745–1747 admits 7 §A10 keys (`matchEQ`, `lowEndFocus`, `codecPreview`, `midSideEQ`, `spectralRecovery`, `loudnessTarget`, `msImager`) "have no UI export found".
- Several §A9 UIs DO exist as exports but are unregistered.
- Almost every plugin here HAS engine code in `RecordingStudio.js buildFxChain` (lines 1850–3063).
- "Engine" = ConsoleFX/SPX-native handler in `RecordingStudio.js`. None of these are ph_* PluginHost factories.
- Bug class 4 (worklets) is N/A everywhere — none of these handlers use AudioWorkletNode.

---

## §A9 — Missing from COMPONENT_MAP (15 plugins)

### 1. ditherForge (`ditherForge`)
- **UI file:** `src/front/js/component/SPXPlugins.js:1327` (`DitherForgeUI`)
- **Factory:** native — `RecordingStudio.js:2671` `install("ditherForge", () => makePassthrough())`
- **1. Param names:** ❌ — UI emits `bitDepth`, `type`, `noiseShaping`, `highPass`, `level`. Engine is passthrough. ZERO knobs do anything.
- **2. Units:** N/A — engine ignores all knobs.
- **3. Missing cases:** ❌ — every UI knob has no engine case (passthrough has no `setParam`).
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — passthrough is correct topology but no DSP at all.
- **6. Dispose:** ✅ (passthrough)
- **7. Defaults:** ✅ — passthrough is neutral.
- **8. COMPONENT_MAP:** ❌ MISSING — `DitherForgeUI` is in line 1766 of COMPONENT_MAP! Wait — recheck: line 1766 includes `DitherForgeUI, DCBlockUI`. Actually **REGISTERED** but ALL_FX_EXTENDED still lists in §A9.
- **Severity:** P1 — UI registered but engine is no-op. Inventory header is wrong; UI window opens fine.
- **Demo-blocker?:** no — opens UI window (registered), plugin label says "DITH" but ear hears nothing. Cosmetic mastering placeholder.

### 2. dcBlock (`dcBlock`)
- **UI file:** `src/front/js/component/SPXPlugins.js:1367` (`DCBlockUI`)
- **Factory:** native — `RecordingStudio.js:2672` (fixed 10Hz HPF, no setParam)
- **1. Param names:** ❌ — UI emits `hpfFreq`, `hpfSlope`, `subCut`, `dcRemove`. Engine has no setParam.
- **2. Units:** ❌ — Engine hardcodes 10Hz; UI offers 1–30Hz range.
- **3. Missing cases:** ❌ — all 4 UI knobs are dead.
- **4. Worklets:** N/A
- **5. Topology:** ✅
- **6. Dispose:** ✅
- **7. Defaults:** ✅
- **8. COMPONENT_MAP:** ✅ REGISTERED — line 1766 includes `DCBlockUI`.
- **Severity:** P1 — UI shows but knobs don't bind.
- **Demo-blocker?:** no — passes audio fine with neutral effect.

### 3. stereoImager (`stereoImager`)
- **UI file:** `src/front/js/component/SPXPlugins_SPX100.js:104` (`StereoImagerUI`)
- **Factory:** native — `RecordingStudio.js:2662`
- **1. Param names:** ❌ — UI emits `lowWidth`, `midWidth`, `highWidth`, `xover1`, `xover2`. Engine only reads `width` (which UI never sends).
- **2. Units:** ❌ — UI per-band 0–2 widths; engine 0–4 stereo gain.
- **3. Missing cases:** ❌ — engine only handles `"width"`; all 5 UI knobs orphan.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — single mono gain claims to be a "stereo imager"; can't actually image.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — engine starts at width=1.2 (audible boost) before any user interaction.
- **8. COMPONENT_MAP:** ❌ MISSING — `StereoImagerUI` not in COMPONENT_MAP (line 1755–1768).
- **Severity:** P0 — UI window renders as null per `SPXPluginHost`, audible default applied.
- **Demo-blocker?:** yes — clicking plugin opens empty/null window.

### 4. midSideComp (`midSideComp`)
- **UI file:** `src/front/js/component/SPXPlugins_SPX100.js:266` (`MidSideCompUI`)
- **Factory:** native — `RecordingStudio.js:2147`
- **1. Param names:** ❌ — UI emits `midThresh`, `midRatio`, `sideThresh`, `sideRatio`, `attack`, `release`, `makeup`. Engine cases are `threshold`, `ratio` only.
- **2. Units:** ❌ — UI attack ms; engine uses raw ms in compressor (browser API expects sec).
- **3. Missing cases:** ❌ — 6/7 knobs have no engine case.
- **4. Worklets:** N/A
- **5. Topology:** ❌ — single dynamics compressor; no actual M/S split.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — threshold=-15, ratio=3 active on insert.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0 — null window + misnamed engine.
- **Demo-blocker?:** yes.

### 5. multibandLimiter (`multibandLimiter`)
- **UI file:** `src/front/js/component/SPXPlugins_SPX100.js:517` (`MultibandLimiterUI`)
- **Factory:** native — `RecordingStudio.js:2161` (static dual-stage limiter, no params)
- **1. Param names:** ❌ — UI emits `ceiling`, `lookahead`, `xover1/2/3`. Engine has empty `setParam(){}`.
- **2. Units:** N/A
- **3. Missing cases:** ❌ — every UI knob orphan.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — dual-stage compressor isn't multiband.
- **6. Dispose:** ✅
- **7. Defaults:** ❌ — fixed -0.5dB threshold, ratio 20 limiting from insert. AUDIBLE on bypass.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0 — null window + audible-on-insert + dead knobs.
- **Demo-blocker?:** yes.

### 6. multibandSat (`multibandSat`)
- **UI file:** `src/front/js/component/SPXPlugins_SPX100.js:79` (`MultibandSatUI`)
- **Factory:** native — `RecordingStudio.js:1885`
- **1. Param names:** ❌ — UI emits `xover1/2/3`, `drive1/2/3/4`, `mix`. Engine cases `low`, `mid`, `high`.
- **2. Units:** ❌
- **3. Missing cases:** ❌ — 7/8 UI knobs orphan; engine reads `p.low/p.mid/p.high` which UI never emits, so saturation is permanently locked to default curves.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — Engine comment admits "serial 3-band", not parallel multiband.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — drive curves applied immediately.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0 — null window; audible default; param mismatch.
- **Demo-blocker?:** yes.

### 7. goniometer (`goniometer`)
- **UI file:** `src/front/js/component/SPXPlugins_SPX100.js:536` (`GoniometerUI`)
- **Factory:** native — `RecordingStudio.js:2776` `() => makePassthrough()`
- **1. Param names:** N/A — UI is meter-only (`decay`).
- **2. Units:** N/A
- **3. Missing cases:** N/A — passthrough.
- **4. Worklets:** N/A
- **5. Topology:** ✅
- **6. Dispose:** ⚠️ — UI starts a `requestAnimationFrame` loop but uses fake `Math.random()` data — NOT bound to actual audio. Cleanup OK.
- **7. Defaults:** ✅
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P1 — meter is fake (random numbers); window itself null per host.
- **Demo-blocker?:** partial — opens null window when clicked.

### 8. phaseScope (`phaseScope`)
- **UI file:** `src/front/js/component/SPXPlugins_SPX100.js:579` (`PhaseScopeUI`)
- **Factory:** native — `RecordingStudio.js:2775` passthrough.
- **1. Param names:** N/A
- **2. Units:** N/A
- **3. Missing cases:** N/A
- **4. Worklets:** N/A
- **5. Topology:** ✅
- **6. Dispose:** ⚠️ — same fake `Math.random()` correlation; rAF cleanup OK.
- **7. Defaults:** ✅
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P1 — null window + fake meter.
- **Demo-blocker?:** partial.

### 9. loudnessMeter2 (`loudnessMeter2`)
- **UI file:** **NONE** — no `LoudnessMeter2UI` export found anywhere in src/.
- **Factory:** native — `RecordingStudio.js:3063` passthrough.
- **1. Param names:** N/A
- **2. Units:** N/A
- **3. Missing cases:** N/A
- **4. Worklets:** N/A
- **5. Topology:** ✅
- **6. Dispose:** ✅
- **7. Defaults:** ✅
- **8. COMPONENT_MAP:** ❌ MISSING (and UI does not exist).
- **Severity:** P1 — wholly phantom UI, but engine is benign passthrough.
- **Demo-blocker?:** partial — opens null window.

### 10. loFiCrusher (`loFiCrusher`)
- **UI file:** `src/front/js/component/SPXPlugins_SPX100.js:154` (`LoFiCrusherUI`)
- **Factory:** native — `RecordingStudio.js:1850`
- **1. Param names:** ❌ — UI emits `bits`, `rate`, `filter`, `noise`, `wobble`, `mix`. Engine cases `bits`, `downsample`. So `bits` works but `rate/filter/noise/wobble/mix` orphan.
- **2. Units:** ⚠️ — UI `bits` 4–24, engine treats it as raw integer for bitcrush curve (compatible). UI `rate` 0.1–1, engine reads `p.downsample` from defaults that map differently.
- **3. Missing cases:** ❌ — 5/6 knobs orphan.
- **4. Worklets:** N/A
- **5. Topology:** ✅
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — bits=12, downsample=0.5 audible bitcrush from insert.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0 — null window + dead knobs + audible default.
- **Demo-blocker?:** yes.

### 11. chorusEnsemble (`chorusEnsemble`)
- **UI file:** `src/front/js/component/SPXPlugins_SPX100.js:316` (`ChorusEnsembleUI`)
- **Factory:** native — `RecordingStudio.js:2603`
- **1. Param names:** ❌ — UI emits `mode`, `mix`, `depth`. Engine reads `p.rate` (UI never emits) and case `"rate"`. So no UI knobs are bound.
- **2. Units:** ❌
- **3. Missing cases:** ❌ — `mode`, `mix`, `depth` all orphan.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — two delays + two LFOs serialized; chorus topology fine for one pass.
- **6. Dispose:** ✅ — `stopOscs(lfo1, lfo2); disposeNodes(d1, d2, lfoG1, lfoG2)` good.
- **7. Defaults:** ⚠️ — LFOs running + delays active before any UI interaction; modulation audible.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0 — null window + total knob/engine mismatch.
- **Demo-blocker?:** yes.

### 12. declicker (`declicker`)
- **UI file:** `src/front/js/component/SPXPlugins_SPX100.js:222` (`DeclickerUI`)
- **Factory:** native — `RecordingStudio.js:2757` (gain=0.98 only)
- **1. Param names:** ❌ — UI emits `sensitivity`, `strength`, `maxWidth`. Engine has empty setParam.
- **2. Units:** N/A
- **3. Missing cases:** ❌ — all 3 knobs orphan.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — fixed -0.176dB attenuation, no actual click detection.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — gain=0.98 cuts every signal slightly even on insert.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0 — null window + dead knobs.
- **Demo-blocker?:** yes.

### 13. dehummer (`dehummer`)
- **UI file:** `src/front/js/component/SPXPlugins_SPX100.js:241` (`DehummmerUI` — **TYPO: 3 m's**)
- **Factory:** native — `RecordingStudio.js:2761` (hardcoded 50/60/100Hz notches)
- **1. Param names:** ❌ — UI emits `freq` (50 or 60), `harmonics`, `depth`, `learn`. Engine has empty setParam and ignores all.
- **2. Units:** N/A
- **3. Missing cases:** ❌ — every UI knob orphan.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — three fixed notches, can't switch between 50/60.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — notches active by default; all hum bands attenuated.
- **8. COMPONENT_MAP:** ❌ MISSING — and ALL_FX_EXTENDED line 1611 references `DehummerUI` (correct spelling) but the actual export is `DehummmerUI` (3 m's). Even if added to COMPONENT_MAP, the lookup would fail.
- **Severity:** P0 — null window + name-typo at export site means COMPONENT_MAP fix would fail unless the typo is also fixed.
- **Demo-blocker?:** yes.

### 14. dialogueIsolator (`dialogueIsolator`)
- **UI file:** `src/front/js/component/SPXPlugins_SPX100.js:616` (`DialogueIsolatorUI`)
- **Factory:** native — `RecordingStudio.js:2768`
- **1. Param names:** ❌ — UI emits `isolation`, `sensitivity`, `smoothing`, `mix`. Engine has empty setParam.
- **2. Units:** N/A
- **3. Missing cases:** ❌ — all 4 orphan.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — fixed HP100→LP8000→peak2.5kHz; no actual dialogue isolation.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — bandpass + presence active immediately.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0 — null window + dead knobs.
- **Demo-blocker?:** yes.

### 15. cabinetSim (`cabinetSim`)
- **UI file:** `src/front/js/component/SPXPlugins_SPX100.js:635` (`CabinetSimUI`)
- **Factory:** native — `RecordingStudio.js:1910`
- **1. Param names:** ❌ — UI emits `cabinet`, `mic`, `distance`, `angle`, `mix`. Engine reads `p.type` and case `"type"`. UI never sends `type`.
- **2. Units:** ❌
- **3. Missing cases:** ❌ — all 5 UI knobs orphan; engine's only case is `"type"` which UI never emits.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — single fixed HP+peak+LP chain, not impulse-response convolution.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — full filter chain active on insert (audible HP at 80Hz, peak +3dB at 800Hz, LP at 6kHz).
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0 — null window + dead knobs + audible default.
- **Demo-blocker?:** yes.

---

[CHECKPOINT — first 8 plugins audited at this point. Continuing.]

## §A10 — Ozone-level mastering (9 plugins)

### 16. matchEQ (`matchEQ`)
- **UI file:** **NONE** — `MatchEQUI` does not exist in src/.
- **Factory:** native — `RecordingStudio.js:2685` (lo lowshelf @200, hi highshelf @8000)
- **1. Param names:** N/A — no UI to compare.
- **2. Units:** N/A
- **3. Missing cases:** ❌ — engine handles `low`, `high` only — but no UI to drive them.
- **4. Worklets:** N/A
- **5. Topology:** ✅ engine-side
- **6. Dispose:** ✅
- **7. Defaults:** ✅ — `low=0, high=0` → neutral.
- **8. COMPONENT_MAP:** ❌ MISSING — and UI does not exist.
- **Severity:** P0 — clicking plugin opens null window. PLUGIN_DEFAULTS line 1747 says `matchEQ: {}` — picker writes only `{enabled:true}`, engine works (neutral).
- **Demo-blocker?:** yes — null window.

### 17. lowEndFocus (`lowEndFocus`)
- **UI file:** **NONE** — `LowEndFocusUI` does not exist.
- **Factory:** native — `RecordingStudio.js:2699` (HP30 + peak60 + peak100)
- **1. Param names:** N/A — no UI.
- **2. Units:** N/A
- **3. Missing cases:** ❌ — engine cases `sub`, `kick` orphan with no UI.
- **4. Worklets:** N/A
- **5. Topology:** ✅
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — sub=+3dB at 60Hz, kick=+2dB at 100Hz active on insert (audible boost).
- **8. COMPONENT_MAP:** ❌ MISSING (no UI to register).
- **Severity:** P0 — null window + audible default applied.
- **Demo-blocker?:** yes.

### 18. codecPreview (`codecPreview`)
- **UI file:** **NONE** — `CodecPreviewUI` does not exist.
- **Factory:** native — `RecordingStudio.js:2751` (HP40+LP16k, no params)
- **1. Param names:** N/A
- **2. Units:** N/A
- **3. Missing cases:** N/A
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — fixed bandpass; no codec emulation.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — HP40+LP16k always on; cuts subs and supersonic content.
- **8. COMPONENT_MAP:** ❌ MISSING (no UI).
- **Severity:** P0 — null window + audible filter on insert.
- **Demo-blocker?:** yes.

### 19. midSideEQ (`midSideEQ`)
- **UI file:** **NONE** — `MidSideEQUI` does not exist.
- **Factory:** native — `RecordingStudio.js:2243` (mf peak@1k + sf peak@5k)
- **1. Param names:** N/A — no UI.
- **2. Units:** N/A
- **3. Missing cases:** ❌ — engine cases `midFreq/midGain/sideFreq/sideGain` all orphan.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — engine comment admits "serial mid/side filters" — not real M/S processing.
- **6. Dispose:** ✅
- **7. Defaults:** ✅ — gain=0 each → neutral.
- **8. COMPONENT_MAP:** ❌ MISSING (no UI).
- **Severity:** P0 — null window. Audio is neutral.
- **Demo-blocker?:** yes.

### 20. dynamicEQ (`dynamicEQ`)
- **UI file:** `src/front/js/component/SPXPlugins_EQ.js:93` (`DynamicEQUI`) — **EXISTS**.
- **Factory:** native — `RecordingStudio.js:2224`
- **1. Param names:** ❌ — UI emits `bands` ARRAY (each band has `freq`, `gain`, `q`, `threshold`, `ratio`, `attack`, `release`, `dynamic`, `type`) plus `selectedBand`. Engine cases `frequency`, `q`, `gain`, `threshold` (single-value, NOT band array).
- **2. Units:** ❌ — UI per-band ms attack/release; engine compressor expects seconds.
- **3. Missing cases:** ❌ — UI's `bands` array is never read; engine reads `p.frequency`/`p.q`/`p.gain` which UI never sends. **Total binding failure.**
- **4. Worklets:** N/A
- **5. Topology:** ❌ — engine is single compressor + single peak filter; UI promises 5-band dynamic EQ.
- **6. Dispose:** ✅
- **7. Defaults:** ✅ — engine reads `p.threshold`/`p.gain` defaulting to safe values.
- **8. COMPONENT_MAP:** ❌ MISSING — `DynamicEQUI` is NOT in COMPONENT_MAP.
- **Severity:** P0 — null window + structural mismatch.
- **Demo-blocker?:** yes.

### 21. spectralRecovery (`spectralRecovery`)
- **UI file:** **NONE** — `SpectralRecoveryUI` does not exist.
- **Factory:** native — `RecordingStudio.js:2737` (highshelf@10k + peak@8k)
- **1. Param names:** N/A — no UI.
- **2. Units:** N/A
- **3. Missing cases:** ❌ — engine cases `amount`, `presence` orphan.
- **4. Worklets:** N/A
- **5. Topology:** ✅
- **6. Dispose:** ✅
- **7. Defaults:** ❌ — `amount=4dB` at 10kHz + `presence=2dB` at 8kHz active on insert. AUDIBLE high-frequency boost.
- **8. COMPONENT_MAP:** ❌ MISSING (no UI).
- **Severity:** P0 — null window + audible HF boost on insert.
- **Demo-blocker?:** yes.

### 22. loudnessTarget (`loudnessTarget`)
- **UI file:** **NONE** — `LoudnessTargetUI` does not exist.
- **Factory:** native — `RecordingStudio.js:2714` (limiter @-1dB + makeup gain)
- **1. Param names:** N/A — no UI.
- **2. Units:** N/A
- **3. Missing cases:** ❌ — `ceiling`, `target` orphan.
- **4. Worklets:** N/A
- **5. Topology:** ✅
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — ceiling=-1dB, ratio 20 limiting active on insert. Limits any signal touching -1dB.
- **8. COMPONENT_MAP:** ❌ MISSING (no UI).
- **Severity:** P0 — null window + audible-on-insert.
- **Demo-blocker?:** yes.

### 23. msImager (`msImager`)
- **UI file:** **NONE** — `MSImagerUI` does not exist.
- **Factory:** native — `RecordingStudio.js:2729` (single gain stage)
- **1. Param names:** N/A — no UI.
- **2. Units:** N/A
- **3. Missing cases:** ❌ — engine case `width` orphan.
- **4. Worklets:** N/A
- **5. Topology:** ❌ — claims to be M/S imager, is mono gain.
- **6. Dispose:** ✅
- **7. Defaults:** ✅ — width=1 → unity.
- **8. COMPONENT_MAP:** ❌ MISSING (no UI).
- **Severity:** P0 — null window. Audio passes neutral.
- **Demo-blocker?:** yes.

### 24. freqShifter (`freqShifter`)
- **UI file:** `src/front/js/component/SPXPlugins_SPX100.js:670` (`FreqShifterUI`) — **EXISTS**.
- **Factory:** native — `RecordingStudio.js:2972`
- **1. Param names:** ⚠️ — UI emits `shift`, `lfoRate`, `lfoDepth`, `mix`. Engine cases `shift`, `mix`. `lfoRate`/`lfoDepth` orphan.
- **2. Units:** ⚠️ — UI mix 0–100%; engine `(v||0)/100` mapping ok. shift Hz ok.
- **3. Missing cases:** ❌ — `lfoRate`, `lfoDepth` orphan (no LFO node built either).
- **4. Worklets:** N/A
- **5. Topology:** ❌ — Engine wires `carrier → carrierGain → modGain.gain`, then `modGain → wet`. The `modGain.gain` is being driven by the carrier oscillator instead of the audio input. The `inputNode: modGain` accepts audio, but the gain modulation produces ring-modulation, NOT a true SSB freq shift. Not strictly broken topology, but mislabeled.
- **6. Dispose:** ✅ — `stopOscs(carrier); disposeNodes(carrierGain, modGain, wet)`.
- **7. Defaults:** ⚠️ — carrier oscillator running at 0Hz on insert; `mix=100%` means output is 100% wet (= 100% silence since shift=0 multiplied by audio modulated by 0Hz oscillator gives DC). Audible glitch likely.
- **8. COMPONENT_MAP:** ❌ MISSING — `FreqShifterUI` not registered.
- **Severity:** P0 — null window + 2 orphan knobs + topology questionable.
- **Demo-blocker?:** yes.

---

## Batch 06 Summary

- **Total audited:** 24
- **Clean:** 0
- **P2 (cosmetic):** 0
- **P1 (polish):** 4 — ditherForge, dcBlock (both registered, knobs dead), goniometer, phaseScope, loudnessMeter2 (UIs that fake their meters but engine is benign passthrough)
- **P0 (demo-blocker):** 19 — every other plugin in this batch
- **Top 3 worst plugins:**
  1. `dehummer` — UI export name typo (`DehummmerUI` 3 m's) means even fixing COMPONENT_MAP wouldn't resolve it; engine ignores all 4 UI knobs.
  2. `dynamicEQ` — UI promises 5-band dynamic EQ with per-band threshold/ratio/attack/release/type, engine is single-band single-compressor with mismatched param names. Total structural mismatch.
  3. `cabinetSim` / `multibandSat` / `chorusEnsemble` — three-way tie. UI emits a coherent set of parameter names; engine reads completely different names; no knob is bound to anything; defaults are audible.

### Three-bucket verdict (per task brief)

**(a) UI exists, just unregistered (12)** — engine code exists, UI exists, COMPONENT_MAP entry missing:
- §A9: `stereoImager`, `midSideComp`, `multibandLimiter`, `multibandSat`, `goniometer`, `phaseScope`, `loFiCrusher`, `chorusEnsemble`, `declicker`, `dialogueIsolator`, `cabinetSim`
- §A9 sub-case: `dehummer` — UI exists but exported under typo'd name (`DehummmerUI`); structurally an "exists-but-unregistered" with an extra rename required.
- §A10: `dynamicEQ`, `freqShifter`

**(b) UI does not exist, engine exists (9)** — engine code in buildFxChain but UI was never written:
- §A9: `loudnessMeter2`
- §A10: `matchEQ`, `lowEndFocus`, `codecPreview`, `midSideEQ`, `spectralRecovery`, `loudnessTarget`, `msImager`

**(c) Wholly phantom (UI + engine both missing) (0)** — none. Every key in §A9/§A10 has at least an engine handler in `RecordingStudio.js`.

**Note on §A9 partial registration:** `DitherForgeUI` and `DCBlockUI` ARE present in COMPONENT_MAP at SPXPlugins.js line 1766, contradicting the inventory's claim that all 15 §A9 are unregistered. The inventory is wrong on those two — but they're still P1 because their engines are no-ops/static-HPF that ignore every UI knob.

### Common patterns

- **Engine/UI param-name divergence** is universal in this batch. UIs were written in `SPXPlugins_SPX100.js` (likely by the SPX-100 expansion), and the buildFxChain handlers in `RecordingStudio.js` were sketched without cross-checking the UI knob keys. Result: dozens of dead knobs.
- **Audible-on-insert defaults** are widespread (multibandLimiter, lowEndFocus, codecPreview, spectralRecovery, loudnessTarget, declicker, chorusEnsemble, cabinetSim, multibandSat, dialogueIsolator). These all alter the signal before the user touches anything; they should be neutral on insert (mix=0, drive=0, etc.) per the audit-spec policy.
- **All §A10 plugins except dynamicEQ + freqShifter** have NO UI export. The inline comment at SPXPlugins.js:1745–1747 acknowledges this explicitly; nothing has been done since.
- **Dispose hygiene is good** across the batch — every handler returns a `dispose()` that disconnects/stops oscillators (chorusEnsemble, freqShifter both correctly use `stopOscs()`).
- **`goniometer` and `phaseScope` UIs draw from `Math.random()`**, not from real audio analysis. Even if registered, they'd be aesthetic-only.
- **Recommended fix order:** (1) add the 12 §A9 UIs to COMPONENT_MAP and rename `DehummmerUI`→`DehummerUI`. (2) Reconcile param-name mismatches in the 12 engines. (3) Build the 7 missing §A10 UIs OR remove those entries from `ALL_FX_EXTENDED` to stop the picker from listing phantom plugins. (4) Set audible-on-insert engines to start neutral.
