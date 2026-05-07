# Batch 05 — SPX additional / creative (22 plugins)

Scope: ALL_FX_EXTENDED §A8 (lines 1575–1596 of `src/front/js/component/SPXPlugins.js`).
Source files for UIs:
- `SPXPlugins_EQ.js` — pultecForge, graphicEQ, tiltEQ, baxandallEQ
- `SPXPlugins_Creative.js` — vocoderSPX, granularFreeze, noiseReduction, ringMod, formantFilter, spectrumAnalyzer
- `SPXPlugins_SPX100.js` — tapeStop, transientShaper, enhancer808, infiniteReverb, reverseDelay, subOctaver, tempoDelay, pitchRandomizer, autoWah, drumEnhancer, vocalSaturator, gainStager

Engine handlers in `src/front/js/pages/RecordingStudio.js` `buildFxChain` (lines 1300–3139).

CRITICAL — confirmed via inspection of `COMPONENT_MAP` (SPXPlugins.js:1755–1768):
**ALL 22 of these UI components are MISSING from COMPONENT_MAP.** The 43 registered names do not include any of `PultecForgeUI, GraphicEQUI, TiltEQUI, BaxandallEQUI, VocoderSPXUI, GranularFreezeUI, NoiseReductionUI, RingModUI, FormantFilterUI, SpectrumAnalyzerUI, TapeStopUI, TransientShaperUI, EnhancerSPX808UI, InfiniteReverbUI, ReverseDelayUI, SubOctaverUI, TempoDelayUI, PitchRandomizerUI, AutoWahUI, DrumEnhancerUI, VocalSaturatorUI, GainStagerUI`. SPXPluginHost (line 1949–1950) returns `null` when `Comp` is undefined → user opens an empty plugin window.

Engine handlers DO exist for most plugins via `buildFxChain`, so audio still mutates when the user inserts the plugin (defaults from `PLUGIN_DEFAULTS` at SPXPlugins.js:1637 are seeded). The user simply has no way to live-tweak knobs.

---

### 1. pultecForge (`pultecForge`)
- **UI file:** `SPXPlugins_EQ.js:14` (PultecForgeUI)
- **Factory:** native — RecordingStudio.js:2838 (`buildFxChain` `pultecForge` branch)
- **1. Param names:** ✅ — UI emits `lowFreq, lowBoost, lowAtten, highFreq, highBoost, highAtten, highBW, outputGain`; engine cases match all 8 (RS:2854–2862).
- **2. Units:** ⚠️ — UI `highFreq` is in kHz (range 3–16); engine multiplies by 1000 at build (line 2843) and on setParam (line 2857) — internally consistent. UI `highBW` 0–1 maps to `Q = 0.5 + bw` (engine line 2846). Boost/Atten 0–10 dB; engine treats as straight dB.
- **3. Missing cases:** ✅ — every UI knob has a case.
- **4. Worklets:** N/A — pure BiquadFilter chain.
- **5. Topology:** ✅ — `lo → hi → og`; output = `og`.
- **6. Dispose:** ✅ — `disposeNodes(lo, hi, og)`.
- **7. Defaults:** ✅ — `lowBoost=0, highBoost=0, outputGain=0` → neutral on insert.
- **8. COMPONENT_MAP:** ❌ MISSING — UI never reachable.
- **Severity:** P0
- **Demo-blocker?:** yes — UI is dead, but engine works post-insert with defaults; user can't tweak.

### 2. graphicEQ (`graphicEQ`)
- **UI file:** `SPXPlugins_EQ.js:197` (GraphicEQUI)
- **Factory:** native — RecordingStudio.js:2867
- **1. Param names:** ✅ — UI emits `bands` (object keyed by Hz) and `preAmp`; engine handles both (RS:2883–2889).
- **2. Units:** ✅ — bands {freq:dB} object passed through; preAmp dB.
- **3. Missing cases:** ✅ — only 2 distinct param names.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — 31 peaking filters serialized → og.
- **6. Dispose:** ✅ — `disposeNodes(og, ...filters)`.
- **7. Defaults:** ✅ — all bands at 0 dB; preAmp 0 dB → neutral.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead).

### 3. tiltEQ (`tiltEQ`)
- **UI file:** `SPXPlugins_EQ.js:285`
- **Factory:** native — RecordingStudio.js:2805
- **1. Param names:** ✅ — UI: `tilt, tiltFreq, air, airFreq, presence, presenceFreq, outputGain`; all 7 cases present (RS:2826–2832).
- **2. Units:** ✅ — dB / Hz consistent.
- **3. Missing cases:** ✅
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — `lo → hi → pr → air → og`.
- **6. Dispose:** ✅ — `disposeNodes(lo, hi, pr, air, og)`.
- **7. Defaults:** ✅ — all at 0 → neutral.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead).

### 4. baxandallEQ (`baxandallEQ`)
- **UI file:** `SPXPlugins_EQ.js:345`
- **Factory:** native — RecordingStudio.js:2783
- **1. Param names:** ⚠️ — UI emits `bass, bassFreq, treble, trebleFreq, mid, midFreq, midQ, outputGain, monoBelow`; engine handles all except `monoBelow` (no case) — silent dead knob.
- **2. Units:** ✅ — dB/Hz consistent.
- **3. Missing cases:** ⚠️ — `monoBelow` knob in defaults (PLUGIN_DEFAULTS line 1683) but UI doesn't expose it; not user-facing, low priority.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — `lo → mi → hi → og`.
- **6. Dispose:** ✅
- **7. Defaults:** ✅ — all gains 0.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead).

### 5. vocoderSPX (`vocoderSPX`)
- **UI file:** `SPXPlugins_Creative.js:13`
- **Factory:** native — RecordingStudio.js:3064
- **1. Param names:** ⚠️ — UI emits `bands, carrierType, carrierFreq, attack, release, formantShift, mix, unvoiced, breathiness, outputGain, freeze`; engine handles only 5: `bands, carrierFreq, unvoiced, mix, outputGain` (RS:3098–3105). DEAD KNOBS: `carrierType, attack, release, formantShift, breathiness, freeze`.
- **2. Units:** ✅ — `mix` UI 0–100% divided by 100 in engine (line 3103).
- **3. Missing cases:** ❌ — 6 of 11 UI controls have no engine case.
- **4. Worklets:** N/A — peaking filter approximation; true vocoder lives in PluginHost.
- **5. Topology:** ✅ — 16 filters serial → og.
- **6. Dispose:** ✅
- **7. Defaults:** ✅ — band gains 6 dB (audible), but it IS a vocoder so 6 dB peak filters are intended.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead AND 6 knobs would be dead even if UI worked).

### 6. granularFreeze (`granularFreeze`)
- **UI file:** `SPXPlugins_Creative.js:97`
- **Factory:** native — RecordingStudio.js:2990
- **1. Param names:** ⚠️ — UI emits `freeze, grainSize, density, pitch, spread, position, randomize, attack, release, mix, outputGain`; engine handles only `grainSize, freeze, density, mix, outputGain` (RS:3002–3008). DEAD: `pitch, spread, position, randomize, attack, release` (6 knobs).
- **2. Units:** ✅ — `grainSize` ms → s (÷1000); `mix` 0–100% → 0–1.
- **3. Missing cases:** ❌ — 6/11.
- **4. Worklets:** N/A — delay-with-feedback approximation.
- **5. Topology:** ✅ — `d → fb → d` self-loop; `d → wet → og`.
- **6. Dispose:** ✅ — `disposeNodes(d, fb, wet, og)`.
- **7. Defaults:** ⚠️ — `mix=80` (line 1715) is high; on insert audio routes 80% wet through a 0.95-feedback freeze loop if `freeze=true`. UI default `freeze:false` → density-based fb=0.42 (still moderately resonant but acceptable).
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead, and high default mix).

### 7. noiseReduction (`noiseReduction`)
- **UI file:** `SPXPlugins_Creative.js:148`
- **Factory:** native — RecordingStudio.js:3013
- **1. Param names:** ⚠️ — UI: `reduction, threshold, attack, release, smoothing, learn, learnDone, preserveTransients, outputGain`; engine handles `threshold, reduction, attack, release, outputGain`. DEAD: `smoothing, learn, learnDone, preserveTransients`.
- **2. Units:** ✅ — ms→s for attack/release; dB pass-through.
- **3. Missing cases:** ⚠️ — 4 of 9 are UI-only state (learn workflow + flags).
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — `hp → c → og`.
- **6. Dispose:** ✅
- **7. Defaults:** ✅ — `reduction=0.6, threshold=-40` → ratio≈4.6 expander, mostly transparent on clean signal.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead).

### 8. ringMod (`ringMod`)
- **UI file:** `SPXPlugins_Creative.js:207`
- **Factory:** native — RecordingStudio.js:3037
- **1. Param names:** ⚠️ — UI: `mode, carrierFreq, carrierType, mix, lfoRate, lfoDepth, sidebandBalance, outputGain`; engine handles `carrierType, carrierFreq, mode, mix, outputGain`. DEAD: `lfoRate, lfoDepth, sidebandBalance`.
- **2. Units:** ✅ — `mix` /100; carrierFreq Hz.
- **3. Missing cases:** ❌ — 3 dead knobs.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠️ — `ampMod → wet → og`. `dc` GainNode is created but never connected to output graph — orphaned (RS:3041, never .connect()'d). `carrier → ampMod.gain` is the only path for carrier modulation; the input AudioNode connects into `ampMod` (gain=0), so DRY signal is silenced. The amp-modulation product through the carrier-modulated-gain is the only output. This may be intentional for ringmod (since AM math = input × carrier), but `dc.gain` for AM mode is a no-op. Edge: when `mode=am`, dc 0.5 should be added to carrier — never wired. AM mode produces ringmod output regardless.
- **6. Dispose:** ✅ — stops carrier; disposes all (RS:3059).
- **7. Defaults:** ⚠️ — `mix=50` (50% wet) on insert; carrierFreq=440Hz. Inserting introduces AM at 440Hz at 50% wet — VERY audible, not neutral.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead, audible mod on insert, orphan node, dead knobs).

---

*Save checkpoint: 8 plugins audited.*

---

### 9. formantFilter (`formantFilter`)
- **UI file:** `SPXPlugins_Creative.js:268`
- **Factory:** native — RecordingStudio.js:2940
- **1. Param names:** ⚠️ — UI: `vowelA, vowelB, morph, autoWah, wahRate, wahDepth, q, outputGain, mix`; engine handles `vowelA, vowelB, morph, q, outputGain`. DEAD: `autoWah, wahRate, wahDepth, mix`.
- **2. Units:** ✅ — vowel strings indexed into FORMANTS map (engine RS:2942 has its own table — duplicates UI table at SPXPlugins_Creative.js:260; values DIFFER: UI A={f1:800,f2:1200,f3:2500}, engine A=[700,1220,2600]). MISMATCH but visualization-only on UI side; engine drives audio.
- **3. Missing cases:** ❌ — 4 dead knobs.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — `f1 → f2 → f3 → og`.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — three peaking filters at +18, +14, +10 dB at vowel formant freqs — inserts are AUDIBLE (vowel-colored), not neutral. Acceptable for a formant filter but not "off by default".
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead, dead `mix` knob = no way to back off the +18dB).

### 10. spectrumAnalyzer (`spectrumAnalyzer`)
- **UI file:** `SPXPlugins_Creative.js:332`
- **Factory:** native — RecordingStudio.js:3062 (`makePassthrough()`)
- **1. Param names:** N/A — engine is passthrough; UI emits `mode, scale, peakHold, decay, resolution, range` but ALL are visualization-only (canvas drawing in UI useEffect).
- **2. Units:** N/A.
- **3. Missing cases:** N/A — passthrough by design.
- **4. Worklets:** N/A — UI's analyser is simulated with `Math.random()` (line 386), not connected to the actual track AnalyserNode. Cosmetic only.
- **5. Topology:** ✅ — passthrough gain.
- **6. Dispose:** ✅ — passthrough disposes its gain node.
- **7. Defaults:** ✅ — passthrough is neutral.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P1 (cosmetic — even if UI were registered, it shows fake data)
- **Demo-blocker?:** no (silent meter is not user-blocking; it just doesn't show real audio).

### 11. tapeStop (`tapeStop`)
- **UI file:** `SPXPlugins_SPX100.js:23`
- **Factory:** native — RecordingStudio.js:2653
- **1. Param names:** ❌ — UI: `active, stopTime, startTime, curve`; engine has NO setParam cases (RS:2658 `setParam() {}`) — ALL knobs dead.
- **2. Units:** N/A — no params honored.
- **3. Missing cases:** ❌ — 4 dead knobs.
- **4. Worklets:** N/A — engine is "Static dim+darken effect" (LP@4kHz + 0.8 gain).
- **5. Topology:** ✅ — `lp → g`.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — Engine ALWAYS audible: lowpass at 4kHz with gain 0.8 inserted regardless of `active` flag. Even with `active=false` the user gets darkening + 2dB attenuation on insert. Bug.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (always-audible coloration on insert; UI dead; no params honored).

### 12. transientShaper (`transientShaper`)
- **UI file:** `SPXPlugins_SPX100.js:49`
- **Factory:** native — RecordingStudio.js:2089
- **1. Param names:** ⚠️ — UI: `attack, sustain, speed, outputGain`; engine handles `attack, sustain`. DEAD: `speed, outputGain`.
- **2. Units:** ⚠️ — UI knob ranges `attack/sustain` are -24..+24 dB (SPXPlugins_SPX100.js:58, 63). Engine treats `attack` as 0..1 (RS:2100 `safe(v, 0.5, 0, 1) * 4`). MAJOR UNIT MISMATCH: UI sends -24..+24 → engine clamps to 0..1 immediately, so any knob position above 1 dB just maxes the ratio at 6, and negatives clamp to 0 (min ratio 2). Effective range: ~0..1 dB → ratio 2..6.
- **3. Missing cases:** ❌ — `speed`, `outputGain` dead.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — `c → g`.
- **6. Dispose:** ✅
- **7. Defaults:** ✅ — attack=0, sustain=0 → ratio=2 baseline (mild compression on insert; should be neutral).
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead + unit mismatch makes engine unusable + always-on compression).

### 13. enhancer808 (`enhancer808`)
- **UI file:** `SPXPlugins_SPX100.js:133`
- **Factory:** native — RecordingStudio.js:2918
- **1. Param names:** ✅ — UI: `freq, punch, sub, harmonic, outputGain`; engine handles all 5 (RS:2929–2934).
- **2. Units:** ✅ — Hz/0-1 consistent; `outputGain` 0–4 linear.
- **3. Missing cases:** ✅
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — `sub → punch → ws → og`.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — `sub=0.6` (line 1734) → +7.2 dB lowshelf at 60Hz on insert; `punch=0.5` → +3 dB peak; `harmonic=0.3` → moderate tanh saturation. NOT neutral — track gets sub-boost + saturation immediately. Default `outputGain=1.0` is unity though.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead + audible bass boost + sat on insert).

### 14. infiniteReverb (`infiniteReverb`)
- **UI file:** `SPXPlugins_SPX100.js:173`
- **Factory:** native — RecordingStudio.js:2434
- **1. Param names:** ⚠️ — UI: `freeze, roomSize, damping, mix, shimmer`; engine handles only `mix`. DEAD: `freeze, roomSize, damping, shimmer`.
- **2. Units:** ✅ — mix 0–1 direct.
- **3. Missing cases:** ❌ — 4 dead knobs.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — `conv → g`.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — `mix=0.5` → 50% wet 8-second reverb on insert. NOT neutral; very audible.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead + heavy reverb on insert + dead freeze knob).

### 15. reverseDelay (`reverseDelay`)
- **UI file:** `SPXPlugins_SPX100.js:200`
- **Factory:** native — RecordingStudio.js:2493
- **1. Param names:** ⚠️ — UI: `time, feedback, mix, filter`; engine handles `time, feedback, mix`. DEAD: `filter`.
- **2. Units:** ⚠️ — UI `time` is in ms (50–2000); engine reads as seconds via `setTime(d.delayTime, p.time || 0.3)` (RS:2496). UNIT MISMATCH: UI default 500 (ms intent) sets delay to 500 SECONDS — clamped to 2 by `safe()`. Even at the 50ms minimum, value is interpreted as 50 seconds → clamped. setParam(time, v) at RS:2503 also reads `v` as seconds. Engine effectively always at delay = 2s (max).
- **3. Missing cases:** ❌
- **4. Worklets:** N/A — true reverse needs worklet.
- **5. Topology:** ✅ — `d → fb → d` loop, `d → g`.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — `mix=0.4` → 40% wet on insert with `feedback=0.4` running for 2s — washy delay tail audible.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead + ms/s unit bug + audible delay on insert).

### 16. subOctaver (`subOctaver`)
- **UI file:** `SPXPlugins_SPX100.js:298`
- **Factory:** native — RecordingStudio.js:2570
- **1. Param names:** ❌ — UI: `oct1Level, oct2Level, dryLevel, filter, trackSpeed`; engine handles only `mix` (which the UI doesn't even emit). UI emits 5 knobs; ALL 5 are dead at engine level. (Engine has a hardcoded `mix=0.4` from `p.mix || 0.4` but UI never sets `mix`.)
- **2. Units:** N/A — none honored.
- **3. Missing cases:** ❌ — 5 dead knobs; engine listens for non-existent `mix`.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — `lp → ws → g`.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — Engine inserts an absolute-value waveshaper rectifier at 200Hz LP with mix gain 0.4 (PLUGIN_DEFAULTS doesn't set `mix` so engine uses its own 0.4). Audible squarewave-like sub on insert; level is fixed.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead + every UI knob dead at engine + audible sub on insert).

---

*Save checkpoint: 16 plugins audited.*

---

### 17. tempoDelay (`tempoDelay`)
- **UI file:** `SPXPlugins_SPX100.js:348`
- **Factory:** native — RecordingStudio.js:2511
- **1. Param names:** ⚠️ — UI: `bpm, division, feedback, filterHP, filterLP, mix, pingPong`; engine handles `division, feedback, mix`. DEAD: `bpm, filterHP, filterLP, pingPong`. Note: BPM comes from a separate global `bpm` ref in build (RS:2513) so the UI bpm knob has no effect — global tempo controls the timing.
- **2. Units:** ⚠️ — `division` is a beat divisor; UI uses {1,2,4,8,16} as denominators (1/1, 1/2, etc.). Engine `(60/bpm) * (p.division || 1)` — when UI sends `4` (meaning 1/4), engine builds delay of `1 second` (60/120 * 4) instead of 0.5s (1 beat ÷ 4). MAJOR LOGIC BUG: should be `/ division` not `* division` to map UI semantic to seconds.
- **3. Missing cases:** ❌
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — `d → fb → d`, `d → g`.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — `mix=0.3` (30% wet) on insert; with division=4 → 1s delay (intended 0.5s). Audible delay echo on insert.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead + division math inverted + 4 dead knobs + audible delay).

### 18. pitchRandomizer (`pitchRandomizer`)
- **UI file:** `SPXPlugins_SPX100.js:388`
- **Factory:** native — RecordingStudio.js:2563
- **1. Param names:** ❌ — UI: `amount, rate, smooth, mix`; engine has NO setParam cases (RS:2568 `setParam() {}`). All 4 knobs dead.
- **2. Units:** N/A.
- **3. Missing cases:** ❌
- **4. Worklets:** N/A — true pitch random needs grain worklet.
- **5. Topology:** ✅ — single allpass.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — Engine inserts an allpass at random freq (500–1000 Hz, Q=3) on insert. Allpass = phase-only so amplitude is identical, but transient phase coloration is audible on percussive content. Acceptable as "neutral-ish".
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead + no engine knobs).

### 19. autoWah (`autoWah`)
- **UI file:** `SPXPlugins_SPX100.js:408`
- **Factory:** native — RecordingStudio.js:2585
- **1. Param names:** ⚠️ — UI: `sensitivity, minFreq, maxFreq, resonance, attack, release, mix`; engine handles `sensitivity, resonance, rate`. DEAD: `minFreq, maxFreq, attack, release, mix`. Engine listens for `rate` which UI doesn't emit.
- **2. Units:** ⚠️ — `sensitivity` UI is 0–1; engine maps to `800 + sens*1200` Hz (line 2588). `resonance` UI is 1–20, engine clamps to Q range. `rate` is engine-side LFO rate (defaulted to 2 Hz in engine, never changed by UI).
- **3. Missing cases:** ❌ — 5/7 dead.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — bandpass with LFO modulating frequency.
- **6. Dispose:** ✅ — stops LFO oscillator, disposes filter and lfoG.
- **7. Defaults:** ⚠️ — `sensitivity=0.6` → bandpass center 1520Hz; `resonance=8` → fairly resonant; LFO @ 2Hz with depth 500 Hz (engine fixed). Audible wah modulation on insert.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead + 5 dead knobs + wah modulation always on).

### 20. drumEnhancer (`drumEnhancer`)
- **UI file:** `SPXPlugins_SPX100.js:432`
- **Factory:** native — RecordingStudio.js:2131
- **1. Param names:** ⚠️ — UI: `punch, snap, glue, sub, air, outputGain`; engine handles `punch, snap`. DEAD: `glue, sub, air, outputGain`.
- **2. Units:** ✅ — 0–1 → dB scaling.
- **3. Missing cases:** ❌ — 4 dead knobs.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — `c → lo → hi`. Engine builds a hardcoded compressor (thresh=-20, ratio=4, atk=1ms, rel=50ms) regardless of UI.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — `punch=0.5` → +3 dB @ 80Hz; `snap=0.4` → +1.6 dB @ 6kHz; plus always-on 4:1 compression. Audible coloration + compression on insert.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead + 4 dead knobs + always-on comp).

### 21. vocalSaturator (`vocalSaturator`)
- **UI file:** `SPXPlugins_SPX100.js:454`
- **Factory:** native — RecordingStudio.js:1865
- **1. Param names:** ❌ — UI: `drive, warmth, presence, air, mix, outputGain`; engine handles `amount, presence` (RS:1877–1879). UI emits NEITHER `amount`. DEAD: ALL 6 UI knobs (engine listens for `amount` which UI never sends; the engine reads `p.amount || 0.4` at build, but UI emits `drive`).
- **2. Units:** N/A — wrong key names.
- **3. Missing cases:** ❌ — 6 of 6 mismatched. Engine is unreachable from UI.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — `ws → pres`.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — Engine builds with `amount=0.4` and `presence=0.5*5=+2.5dB` since UI never sends correct keys. Audible saturation + presence on insert.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead + every UI knob name mismatches engine).

### 22. gainStager (`gainStager`)
- **UI file:** `SPXPlugins_SPX100.js:476`
- **Factory:** native — RecordingStudio.js:2216
- **1. Param names:** ⚠️ — UI: `gain, targetDb, trim, phase, rmsDb, peakDb`; engine handles `gain` (interpreted as dB). DEAD: `targetDb, trim, phase, rmsDb, peakDb`.
- **2. Units:** ❌ — UI `gain` knob is linear 0–4 (SPXPlugins_SPX100.js:505 `min:0, max:4, step:0.01`); engine treats it as dB via `Math.pow(10, gain/20)` (RS:2217). UI default 1 → engine `10^(1/20) = 1.122` (+1.12 dB). UI gain=4 → engine `10^(4/20) = 1.585` (+4 dB). UI semantic "1.0 = unity" but engine renders as +1 dB. UNIT MISMATCH.
- **3. Missing cases:** ❌ — 5 dead knobs.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — single GainNode.
- **6. Dispose:** ✅
- **7. Defaults:** ⚠️ — UI default `gain=1` → engine sets +1 dB; not unity. Slight gain bump on insert.
- **8. COMPONENT_MAP:** ❌ MISSING.
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead + lin/dB mismatch + 5 dead knobs).

---

## Batch 05 Summary

- Total audited: 22
- Clean: 0
- P2: 0
- P1: 1 (spectrumAnalyzer — passthrough by design)
- P0 (demo-blocker): 21
- Top 3 worst: vocalSaturator (UI dead, every knob name mismatched), tapeStop (UI dead, no setParam cases, always-audible coloration), reverseDelay (UI dead, ms/s unit bug clamps delay to 2s max).

### Common patterns

1. **COMPONENT_MAP gap is universal**: 22/22 UI components are missing from `COMPONENT_MAP` (SPXPlugins.js:1755–1768). Inserting any of these plugins opens an empty floating window. SPXPluginHost returns `null` (line 1950).

2. **Audio engine works for most despite UI gap**: 17/22 have a `buildFxChain` handler that produces audible output using PLUGIN_DEFAULTS-seeded params at insert time. So the demo can hear what the plugin "does" — they just can't tweak it live.

3. **Param-name mismatches between UI and engine**: ~13 plugins have at least one UI knob whose name has no matching `case` in the engine's `setParam` switch. Worst offender is `vocalSaturator` where UI keys (`drive, warmth, presence, air, mix, outputGain`) and engine keys (`amount, presence`) overlap on only one name (`presence`). Engine factories were written first as approximations; UIs added later with richer knob sets that the engine never learned to read.

4. **No-op `setParam() {}` engines**: `tapeStop`, `pitchRandomizer` literally ignore every param (`setParam() {}`). Live knob turns do nothing. Default-only DSP.

5. **Unit mismatches**:
   - `reverseDelay.time` — UI ms, engine s (delay clamps to 2s ceiling).
   - `tempoDelay.division` — engine multiplies instead of dividing (1/4 note → 1s instead of 0.5s).
   - `transientShaper.attack/sustain` — UI ±24 dB, engine 0–1.
   - `gainStager.gain` — UI linear 0–4, engine treats as dB (10^(v/20)).

6. **Audible defaults on insert**: `granularFreeze` (mix=80%), `infiniteReverb` (50% 8s reverb), `enhancer808` (+7dB sub boost), `tempoDelay` (30% wet 1s delay), `autoWah` (always-on wah), `formantFilter` (+18 dB peaking filters), `ringMod` (50% AM at 440Hz), `tapeStop` (always darken+attenuate). These violate "neutral on insert" guidance.

7. **Engines that work despite UI gap (defaults render correctly, knobs would tweak something if UI were registered)**: pultecForge, graphicEQ, tiltEQ, baxandallEQ, enhancer808 (8 cases match cleanly).

8. **Engines that are wholly broken** (UI keys don't reach engine, OR engine has no params): tapeStop, pitchRandomizer, vocalSaturator, subOctaver, gainStager (lin/dB mismatch).

### Recommended fixes (priority order)
1. **Add all 22 names to `COMPONENT_MAP`** (one-line per import; ~22 line change in SPXPlugins.js:1755–1768). This alone unblocks 17 plugins from "totally inert" → "knobs work".
2. Fix unit bugs in `reverseDelay.time`, `tempoDelay.division`, `transientShaper.attack/sustain`, `gainStager.gain`.
3. Rename `vocalSaturator` engine cases to match UI (`drive`/`warmth`/`mix`/`outputGain`) or rewrite UI to emit `amount`.
4. Fix `tapeStop` and `pitchRandomizer` engine `setParam` to honor knobs (or accept that they're "fire-and-forget" effects and remove the live UI).
5. Tone down audible defaults: granularFreeze.mix → 0.3, infiniteReverb.mix → 0.25, formantFilter peak gains → 6/4/2 dB.
