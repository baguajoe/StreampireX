# Batch 04 — SPX Vocal Suite + Mastering (15 plugins)

Auditor #4. Branch `claude/fix-recording-studio`. Source files:
- UI: `src/front/js/component/SPXPlugins.js` (lines 970–1500)
- Engine: `src/front/js/pages/RecordingStudio.js::buildFxChain` (lines 1300–2700)
- COMPONENT_MAP: `src/front/js/component/SPXPlugins.js:1755–1768` (all 15 confirmed registered)

Note: NONE of the 15 SPX-native handlers in buildFxChain use AudioWorkletNode
(`spx-limiter`/`spx-meter` etc. do not exist in the active engine). Worklet
checks therefore N/A across the batch. masterWall is a plain
DynamicsCompressor; loudnessMeter is a `makePassthrough()`. The UI surface
massively outpaces the engine surface — the dominant failure mode in this
batch is **dead knobs** (UI emits a value, engine has no `case` for it, so the
knob silently no-ops). Audio still passes through; the studio doesn't crash;
the *plugin doesn't actually do anything close to what its UI implies*.

---

## VOCAL SUITE

### 1. PitchLock (`pitchLock`)
- **UI file:** `SPXPlugins.js:970`
- **Factory:** native — `RecordingStudio.js:2558` (static allpass @440Hz, Q=10, no setParam)
- **1. Param names:** ❌ — UI emits `key, scale, speed, retune, humanize, formant, detune, bypass`; engine setParam is empty, ignores all.
- **2. Units:** N/A — engine has no params.
- **3. Missing cases:** ❌ — every one of the 7 UI knobs/buttons has no `case`. RecordingStudio.js:2559 admits "Static allpass — no user params yet, real pitch-lock lives in PluginHost."
- **4. Worklets:** N/A — none used.
- **5. Topology:** ✅ — 1-node allpass connected as input==output.
- **6. Dispose:** ✅ — disposeNodes(ap).
- **7. Defaults:** ✅ — neutral allpass, inaudible at unity input.
- **8. COMPONENT_MAP:** ✅ registered (line 1763).
- **Severity:** P0 — entire UI is decorative; this is a "fake" plugin. Demo risk: user assumes it tunes vocals.
- **Demo-blocker?:** **yes** if any demo script touches PitchLock knobs.

### 2. VoiceForge (`voiceForge`)
- **UI file:** `SPXPlugins.js:1014`
- **Factory:** native — `RecordingStudio.js:2638` (peak EQ + highshelf, no actual harmonizer)
- **1. Param names:** ❌ — UI emits `voices, key, scale, v1Shift..v4Shift, v1Vol..v4Vol, formant, mix`; engine `case`s are `formant, amount, air` (none of which the UI emits).
- **2. Units:** ⚠️ — UI `formant` is semitones (-6..6) but engine treats it as Hz (`f.frequency.setTargetAtTime(safe(v, 1000, 20, 20000))`). Knob value 0..6 will set filter freq to 0..6 Hz → safe() clamps to 20 Hz. Formant knob = brutal lowpass-cancel.
- **3. Missing cases:** ❌ — 12+ UI knobs have no engine case (voices, key, scale, all v#Shift/Vol, mix).
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — peak → highshelf, both connected.
- **6. Dispose:** ✅ — disposeNodes(f, pres).
- **7. Defaults:** ⚠️ — engine uses `p.amount || 4` (i.e. +4 dB peak at 1 kHz) and `p.air || 2` (+2 dB highshelf 5 kHz) on insert — UI never emits `amount`/`air`, so these *fixed* boosts are always on. Slight tonal change on insert.
- **8. COMPONENT_MAP:** ✅ registered (1763).
- **Severity:** P0 — labeled as "Vocal harmonizer w/ up to 4 voices"; ships only static peak EQ.
- **Demo-blocker?:** **yes** — promised harmony will not be heard.

### 3. BreathGate (`breathGate`)
- **UI file:** `SPXPlugins.js:1053`
- **Factory:** native — `RecordingStudio.js:2108` (DynamicsCompressor as gate)
- **1. Param names:** ⚠️ — UI emits `threshold, sensitivity, attack, release, breathReduction, noiseFloor, learn`; engine handles only `threshold` (matches).
- **2. Units:** ⚠️ — `threshold` UI is dB (-80..0), engine clamps to (-100..0) — OK. `attack`/`release` UI is ms but engine ignores them (would have been wrong unit anyway).
- **3. Missing cases:** ❌ — 6 dead knobs: `sensitivity, attack, release, breathReduction, noiseFloor, learn`.
- **4. Worklets:** N/A.
- **5. Topology:** ✅.
- **6. Dispose:** ✅.
- **7. Defaults:** ✅ — threshold=-45 dB, ratio=20, fast attack/release. Will gate quiet content on insert but this is the documented behavior of a gate; mild risk if vocal sub-`-45dB` content gets clipped on insert.
- **8. COMPONENT_MAP:** ✅ registered (1763).
- **Severity:** P1 — gate basically works on threshold; rest of UI is cosmetic.
- **Demo-blocker?:** no.

### 4. SibilantCut (`sibilantCut`)
- **UI file:** `SPXPlugins.js:1078`
- **Factory:** native — `RecordingStudio.js:2118` (single peaking notch)
- **1. Param names:** ❌ — UI emits `freq, bandwidth, threshold, ratio, attackSpeed, mode, listenSC`; engine cases are `frequency, amount`. Mismatch: UI `freq` ≠ engine `frequency`. Knob is dead.
- **2. Units:** N/A — knob doesn't reach engine.
- **3. Missing cases:** ❌ — 7/7 knobs/buttons have no matching case. (`amount` exists in engine but UI never emits it.)
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — single biquad.
- **6. Dispose:** ✅.
- **7. Defaults:** ⚠️ — engine builds with `p.frequency || 7000` & `gain = -(p.amount || 6)` → fixed -6 dB peak at 7 kHz on insert. Audible darkening on every insert because the UI never changes those values.
- **8. COMPONENT_MAP:** ✅ registered (1763).
- **Severity:** P0 — name mismatch (`freq`↔`frequency`) means knob is non-functional, and the static -6 dB cut at 7 kHz is not what users expect from a de-esser at default.
- **Demo-blocker?:** **yes** if demo turns the freq knob and expects audible change.

### 5. PhantomDouble (`phantomDouble`)
- **UI file:** `SPXPlugins.js:1112`
- **Factory:** native — `RecordingStudio.js:2381` (single delay + wet gain)
- **1. Param names:** ❌ — UI emits `delay, spread, pitchVarL, pitchVarR, modRate, modDepth, mix`; engine cases are `time, mix`. UI `delay` ≠ engine `time` → main control dead. `mix` matches.
- **2. Units:** ❌ — UI `delay` is ms (5..50); engine `time` expects seconds (0..0.05). Even if names matched, UI value 18 would clamp to 0.05s = 50 ms (60× off).
- **3. Missing cases:** ❌ — 5 dead: `spread, pitchVarL, pitchVarR, modRate, modDepth`.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — delay→wetGain, but no parallel dry path; UI mix=50% means engine outputs 50% wet only — no dry sum (dry path comes from upstream chain mix? No, there's no chain-level dry sum either). The engine output is wet-only. **Topology bug.**
- **6. Dispose:** ✅.
- **7. Defaults:** ⚠️ — `p.time || 0.023` → 23 ms slap. Mix 50% on insert → audible doubling. Not neutral on insert.
- **8. COMPONENT_MAP:** ✅ registered (1764).
- **Severity:** P0 — name mismatch on the primary control + audible default + dry/wet broken.
- **Demo-blocker?:** **yes** — sounds nothing like ADT.

### 6. VocalSpace (`vocalSpace`)
- **UI file:** `SPXPlugins.js:1135`
- **Factory:** native — `RecordingStudio.js:2396` (preDelay → lowshelf → conv → highshelf → wetGain)
- **1. Param names:** ✅ — UI: `preDelay, decay, brightness, warmth, size, earlyMix, lateMix, mix`; engine cases: `preDelay, decay, size, warmth, brightness, mix, earlyMix, lateMix`. All match.
- **2. Units:** ✅ — preDelay UI ms ÷1000 → s; decay s; warmth/brightness 0–1 scaled to dB; mix normalized via `normalizeMix`.
- **3. Missing cases:** ⚠️ — `earlyMix`/`lateMix` are explicitly no-op TODO (line 2428). Acceptable per code comment; they don't crash, but they don't *do* anything either.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠️ — wet-only output (no parallel dry). UI `mix=20%` controls only wet gain; dry is whatever the upstream chain provides. Because most chains feed the plugin serially, mix knob effectively becomes "wet level".
- **6. Dispose:** ✅ — disposeNodes(pre, warmth, conv, bri, g).
- **7. Defaults:** ⚠️ — mix=20% with conv on insert → audible reverb tail (not neutral). Documented: this is a vocal reverb so "audible on insert" might be intentional.
- **8. COMPONENT_MAP:** ✅ registered (1764).
- **Severity:** P1 — best-implemented plugin in the batch; main gap is no dry/wet sum.
- **Demo-blocker?:** no.

---

## MASTERING SUITE

### 7. MasterWall (`masterWall`)
- **UI file:** `SPXPlugins.js:1165`
- **Factory:** native — `RecordingStudio.js:2063` (DynamicsCompressor + makeup gain)
- **1. Param names:** ❌ — UI emits `ceiling, threshold, lookahead, release, dither, truePeak, outputGain, clipMargin`; engine cases are `ceiling, gain`. UI `outputGain` ≠ engine `gain`.
- **2. Units:** ⚠️ — UI `ceiling` -3..0 dBTP, engine treats as `setCompThresh` (-100..0 dB). Acceptable mapping within range. UI default ceiling=-0.1 dBTP → -0.1 dB threshold; OK.
- **3. Missing cases:** ❌ — 6 dead: `threshold, lookahead, release, dither, truePeak, outputGain` (note UI emits `outputGain` not `gain`).
- **4. Worklets:** N/A — no `spx-limiter` worklet; the engine uses native `DynamicsCompressor` set to ratio=20, attack=0.0001s, release=0.005s. Not true-peak.
- **5. Topology:** ✅ — comp→makeup gain.
- **6. Dispose:** ✅.
- **7. Defaults:** ✅ — ceiling=-0.1 dB acts only on overs; transparent on quiet material.
- **8. COMPONENT_MAP:** ✅ registered (1765).
- **Severity:** P0 — labeled "True peak limiter w/ ISP and dithering"; ships generic compressor with one live knob and zero ISP/dither.
- **Demo-blocker?:** **yes** for any "mastering" demo claim.

### 8. StereoForge (`stereoForge`)
- **UI file:** `SPXPlugins.js:1198`
- **Factory:** native — `RecordingStudio.js:2208` (single GainNode)
- **1. Param names:** ⚠️ — UI emits `width, midGain, sideGain, balance, monoBelow, phase, mono`; engine handles only `width`.
- **2. Units:** ❌ — UI `width` is 0..200% (default 100). Engine `g.gain.setTargetAtTime(safe(v, 1, 0, 4))` treats it as a linear gain multiplier 0..4. So UI=100 sets gain to safe(100, 1, 0, 4) → clamped to 4 (12 dB boost!). Width knob acts as a *master volume* boost, not a stereo widener.
- **3. Missing cases:** ❌ — 6 dead knobs/toggles. **`phase` (flip phase) toggle is NOT wired** — the engine has no negative-gain path or phase-invert node. Same for `mono` sum.
- **4. Worklets:** N/A.
- **5. Topology:** ❌ — a single GainNode is not a stereo width processor (no MS matrix, no channel splitter). Mid/Side knobs do nothing. Phase flip does nothing. monoBelow does nothing.
- **6. Dispose:** ✅.
- **7. Defaults:** ❌ — width=100 (UI default) → engine clamps to 4 → +12 dB volume boost on insert. **Audibly louder on insert.**
- **8. COMPONENT_MAP:** ✅ registered (1765).
- **Severity:** P0 — wrong topology, wrong units, dangerous default. Inserting StereoForge at default makes the track 12 dB louder.
- **Demo-blocker?:** **YES** — likely to clip or trip limiters in any demo flow.

### 9. LoudnessMeter (`loudnessMeter`)
- **UI file:** `SPXPlugins.js:1223`
- **Factory:** native — `RecordingStudio.js:2670` (`makePassthrough()`)
- **1. Param names:** N/A — meter, no audio params.
- **2. Units:** N/A.
- **3. Missing cases:** N/A — passthrough has empty setParam.
- **4. Worklets:** N/A — uses simple Gain passthrough; **no analyser node, no streaming meter values fed back to UI**. UI shows static defaults forever.
- **5. Topology:** ✅ — Gain pass.
- **6. Dispose:** ✅ — disposeNodes(g).
- **7. Defaults:** ✅ — unity gain, transparent.
- **8. COMPONENT_MAP:** ✅ registered (1765).
- **Severity:** P1 — meter is decorative; bars never move. Audio passes cleanly so safe to insert.
- **Demo-blocker?:** maybe — if demo says "watch the loudness meter", it never updates.

### 10. HarmonicExcite (`harmonicExcite`)
- **UI file:** `SPXPlugins.js:1271`
- **Factory:** native — `RecordingStudio.js:1808` (HPF → WaveShaper → Gain)
- **1. Param names:** ❌ — UI emits `freq, drive, even, odd, mix, airBoost`; engine cases are `frequency, amount`. UI `freq` ≠ engine `frequency`. UI never emits `amount`. Both engine cases dead.
- **2. Units:** N/A — params don't reach engine.
- **3. Missing cases:** ❌ — 6 dead knobs.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — HPF → WS → Gain.
- **6. Dispose:** ✅.
- **7. Defaults:** ⚠️ — built with `p.amount || 0.5` → curve has 30% sine harmonic + gain at 0.2 on insert. **Audible on insert**, even before user touches a knob.
- **8. COMPONENT_MAP:** ✅ registered (1765).
- **Severity:** P0 — name mismatch + audible default coloration.
- **Demo-blocker?:** **yes** — knobs do nothing.

### 11. VinylPress (`vinylPress`)
- **UI file:** `SPXPlugins.js:1293`
- **Factory:** native — `RecordingStudio.js:1829` (WS → LP → HP)
- **1. Param names:** ⚠️ — UI emits `warmth, crackle, dust, warp, riaa, rpm, hpf, outputGain`; engine cases are `warmth, crackle`. 6 dead.
- **2. Units:** ⚠️ — `crackle` UI 0..1, engine maps to HPF freq 30..50 Hz (`30 + crackle*20`). That's a sub-rumble HPF, not crackle noise. Misleading.
- **3. Missing cases:** ❌ — 6 dead: `dust, warp, riaa, rpm, hpf, outputGain`. No crackle noise generator. No RIAA EQ. No RPM speed effect.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — serial WS→LP→HP.
- **6. Dispose:** ✅ — disposeNodes(ws, lp, hp).
- **7. Defaults:** ⚠️ — warmth=0.5 builds tanh curve + lowpass at 12kHz on insert. Subtle tone change.
- **8. COMPONENT_MAP:** ✅ registered (1766).
- **Severity:** P1 — warmth knob works; rest is cosmetic. No actual vinyl character.
- **Demo-blocker?:** no.

### 12. SpaceForge (`spaceForge`)
- **UI file:** `SPXPlugins.js:1388`
- **Factory:** native — `RecordingStudio.js:2445` (Convolver + wet Gain)
- **1. Param names:** ❌ — UI emits `ir, preDelay, stretch, trim, earlyGain, lateGain, mix`; engine cases are `size, mix`. UI never emits `size` (it has `stretch`). `mix` matches.
- **2. Units:** ✅ — `mix` normalized via `normalizeMix`.
- **3. Missing cases:** ❌ — 6 dead. Most importantly **the IR-selection buttons (concert_hall, cathedral, ...) do not switch IR**. The engine builds `getReverbBuf(ctx, p.size || 2.0)` once at insert and never responds to UI changes other than `mix` and `size` (which UI never sends).
- **4. Worklets:** N/A.
- **5. Topology:** ⚠️ — wet-only (no dry parallel).
- **6. Dispose:** ✅.
- **7. Defaults:** ⚠️ — mix=25% on insert → audible reverb on insert.
- **8. COMPONENT_MAP:** ✅ registered (1766).
- **Severity:** P0 — IR buttons are decorative; UI implies a CONV reverb engine, ships a single fixed 2-second exponential noise IR.
- **Demo-blocker?:** **yes** if demo selects different IRs.

### 13. VortexMod (`vortexMod`)
- **UI file:** `SPXPlugins.js:1423`
- **Factory:** native — `RecordingStudio.js:2623` (Delay + LFO)
- **1. Param names:** ⚠️ — UI emits `mode, rate, depth, feedback, stages, center, mix, stereo`; engine cases are `rate, depth`. Both match.
- **2. Units:** ⚠️ — UI `rate` 0.01..20 Hz, engine clamps to 0..20 — OK. UI `depth` 0..1, engine clamps to 0..4 — OK.
- **3. Missing cases:** ❌ — 5 dead: `mode, feedback, stages, center, mix, stereo`. Mode buttons (flanger/phaser/tremolo) don't change topology.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠️ — single delay through LFO modulation = chorus/flanger only. Phaser mode (allpass cascade) and tremolo mode (gain LFO) are not implemented; mode button is cosmetic.
- **6. Dispose:** ✅ — `stopOscs(lfo); disposeNodes(d, lfoG)` — proper.
- **7. Defaults:** ⚠️ — depth=0.7, rate=0.5 Hz → 700 ms swing on a 30 ms delay → audible flanger sweep on insert. Not neutral.
- **8. COMPONENT_MAP:** ✅ registered (1766).
- **Severity:** P1 — works as a flanger; "mode" button is a lie.
- **Demo-blocker?:** no (still produces modulation audio).

### 14. GainRider (`gainRider`)
- **UI file:** `SPXPlugins.js:1458`
- **Factory:** native — `RecordingStudio.js:2079` (DynamicsCompressor as auto-rider)
- **1. Param names:** ❌ — UI emits `targetLevel, speed, maxGain, minGain, lookahead, smooth, gateThresh`; engine cases are `target`. UI `targetLevel` ≠ engine `target`. **Sole knob is dead.**
- **2. Units:** N/A — knob doesn't reach engine.
- **3. Missing cases:** ❌ — all 7 UI knobs have no engine handler.
- **4. Worklets:** N/A — uses native `DynamicsCompressor`. **No `OscillatorNode`, no `AnalyserNode` involved** (per audit special-check). It's a soft-knee compressor at ratio 2, not a true gain-rider with ducking.
- **5. Topology:** ✅ — single compressor node.
- **6. Dispose:** ✅ — disposeNodes(c). No oscillators to stop.
- **7. Defaults:** ⚠️ — threshold=-18 dB, ratio=2, soft knee=20 dB, slow attack=100 ms, release=500 ms. On insert this *audibly compresses* anything above -28 dB. Not neutral.
- **8. COMPONENT_MAP:** ✅ registered (1766).
- **Severity:** P0 — name mismatch (`targetLevel`↔`target`) makes it a fixed-threshold compressor disguised as a rider.
- **Demo-blocker?:** **yes** if demo turns the target/speed knobs.

### 15. HarmonicSum (`harmonicSum`)
- **UI file:** `SPXPlugins.js:1481`
- **Factory:** native — `RecordingStudio.js:2677` (static WaveShaper, empty setParam)
- **1. Param names:** ❌ — UI emits `drive, even2nd, odd3rd, odd5th, crosstalk, noiseFloor, outputGain`; engine has no setParam cases.
- **2. Units:** N/A — engine has no params.
- **3. Missing cases:** ❌ — all 7 knobs are dead. Per `RecordingStudio.js:2678`: "Static harmonic-additive shaper — no user params today."
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — single WaveShaper node.
- **6. Dispose:** ✅.
- **7. Defaults:** ⚠️ — fixed harmonic injection (`x + 0.1*sin(x*2π) + 0.05*sin(x*3π)`). **Always-on coloration** on insert; user can't turn it down. Subtle but audible.
- **8. COMPONENT_MAP:** ✅ registered (1766).
- **Severity:** P0 — entire UI is decorative; static, immutable saturation.
- **Demo-blocker?:** **yes** for any "analog summing" demo claim.

---

## Batch 04 Summary
- **Total audited:** 15
- **Clean (✅):** 0
- **P2 (cosmetic):** 0
- **P1 (polish):** 4 — breathGate, vocalSpace, loudnessMeter, vinylPress, vortexMod *(actually 5; reclassify vortexMod up if mode-button matters)*
- **P0 (demo-blocker):** 10 — pitchLock, voiceForge, sibilantCut, phantomDouble, masterWall, stereoForge, harmonicExcite, spaceForge, gainRider, harmonicSum
- **Top 3 worst:** **stereoForge** (audible +12 dB volume boost on insert from unit mismatch), **phantomDouble** (UI `delay`-key never reaches engine + wet-only output), **harmonicSum / pitchLock** (tied — entire UIs decorative, zero engine wiring).
- **Common patterns:**
  1. **Param-name spelling mismatches** (4 cases): `freq↔frequency` (sibilantCut, harmonicExcite), `delay↔time` (phantomDouble), `targetLevel↔target` (gainRider), `outputGain↔gain` (masterWall). All trivially fixable by aliasing in the engine `case` block or renaming the UI key.
  2. **Engine surface ≪ UI surface**: most plugins implement 0–2 of the 5–8 advertised knobs. Many handlers carry a code comment admitting "no user params today" (pitchLock, harmonicSum, tapeStop). These are *placeholders* shipping as production UIs.
  3. **Unit confusion**: stereoForge `width` (0–200% vs 0–4 multiplier), phantomDouble `delay` (ms vs s), voiceForge `formant` (semitones vs Hz). All produce dramatic mis-mappings.
  4. **No dry/wet sum** in any reverb/delay handler in this batch (vocalSpace, spaceForge, phantomDouble) — `mix` ramps wet gain only, dry signal must come from chain-level wiring.
  5. **Audible-on-insert defaults**: harmonicExcite, harmonicSum, vortexMod, sibilantCut, stereoForge, voiceForge all alter tone before any user knob movement.
  6. **All 15 are registered in COMPONENT_MAP** — no UI-routing gap. The break is between UI emit and engine receive.
  7. **Worklets unused**: there is no `spx-limiter` or `spx-meter` worklet in the active engine — the audit flag in the spec is N/A for this batch. masterWall uses native compressor; loudnessMeter is a passthrough.
  8. **Dispose hygiene is uniformly good** across all 15 — every handler disposes its nodes, and the one factory using an oscillator (vortexMod) calls `stopOscs(lfo)`.

**P0 demo-blockers (10):** any demo script touching a knob on these plugins
will produce no audible change (param-name mismatch / missing case) or a
dangerous audible default (stereoForge +12 dB on insert is the single worst
finding — it can clip the master bus the moment the plugin is inserted).
