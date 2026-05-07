# Batch 02 — SPX Analog Suite + Dynamics (12 plugins)

Auditor: #2  
Repo: `/workspaces/SpectraSphere`  Branch: `claude/fix-recording-studio`  
Scope: tapeForge, valveGlow, ironCore, consoleSoul, brickWall, warmPress, glueBus, fetStrike, optoPress, parallelCrush, multiPress, transGate

UI components for all 12 plugins live in `src/front/js/component/SPXPlugins.js`
(lines 188–579). Audio engines for all 12 are SPX-native — defined inline in
`src/front/js/pages/RecordingStudio.js` `buildFxChain()` (lines 1721–2062).
None of these plugins use AudioWorkletNode (verified: zero hits for
`AudioWorkletNode`, `spx-limiter`, `spx-meter`, `audioWorklet` in either file).
`brickWall` uses `ctx.createDynamicsCompressor()` with ratio 20 — not a
worklet — so bug class 4 is N/A for the entire batch.

All 12 UI components are present in `COMPONENT_MAP` at lines 1755–1768,
confirming no class-8 gaps.

---

### 1. TapeForge (`tapeForge`)
- **UI file:** `src/front/js/component/SPXPlugins.js:188`
- **Factory:** native — `src/front/js/pages/RecordingStudio.js:1721`
- **1. Param names:** ⚠️ — UI emits 8 keys (`drive,bias,saturation,hfLoss,speed,noise,wow,flutter`); engine `setParam` only handles `drive,bias,saturation,hfLoss` (RecordingStudio.js:1737-1740). The other 4 (`speed`, `noise`, `wow`, `flutter`) are decorative; values pass through `setParam` and hit the `default: break` no-op.
- **2. Units:** ✅ — UI `bias` is 0–1, engine maps to 20–50 Hz HPF (line 1740); UI `hfLoss` 0–1 maps to 8000–18000 Hz LPF (line 1739). Internally consistent.
- **3. Missing cases:** ⚠️ — `speed/noise/wow/flutter` (4 knobs) have no engine effect. Cosmetic-only; not a crash.
- **4. Worklets:** N/A — pure WaveShaper + Biquad path.
- **5. Topology:** ✅ — `ws → lp → hp`, input=ws, output=hp (line 1735).
- **6. Dispose:** ✅ — `disposeNodes(ws, lp, hp)` (line 1743).
- **7. Defaults:** ⚠️ — `drive: 0.5, saturation: 0.6` produce immediate audible saturation on insert. Not silent-on-insert. Per spec class 7, this is a flagged dangerous default for a coloring plugin (user expects neutral).
- **8. COMPONENT_MAP:** ✅ registered (line 1756).
- **Severity:** P1 — 4 dead knobs + non-neutral insert. Not a demo blocker (audio works, knobs just don't all bite).
- **Demo-blocker?:** no

### 2. ValveGlow (`valveGlow`)
- **UI file:** `src/front/js/component/SPXPlugins.js:227`
- **Factory:** native — `src/front/js/pages/RecordingStudio.js:1746`
- **1. Param names:** ❌ — UI emits 7 keys (`drive,warmth,even2nd,even4th,bias,outputGain,dcBlock`); engine handles only `drive,warmth` (lines 1759-1760). Five UI controls (`even2nd, even4th, bias, outputGain, dcBlock`) are silent dead knobs.
- **2. Units:** ✅ — `warmth` 0–1 → 0–3 dB lowshelf gain (line 1760).
- **3. Missing cases:** ❌ — 5 missing engine cases (`even2nd, even4th, bias, outputGain, dcBlock`).
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — `lo → ws`, input=lo, output=ws (line 1757).
- **6. Dispose:** ✅ — `disposeNodes(lo, ws)` (line 1763).
- **7. Defaults:** ⚠️ — `drive: 0.4, warmth: 0.6` audible on insert.
- **8. COMPONENT_MAP:** ✅ registered.
- **Severity:** P1 — 5 dead knobs, 2/7 functional.
- **Demo-blocker?:** no (drive + warmth do work)

### 3. IronCore (`ironCore`)
- **UI file:** `src/front/js/component/SPXPlugins.js:266`
- **Factory:** native — `src/front/js/pages/RecordingStudio.js:1766`
- **1. Param names:** ❌ — TOTAL NAME MISMATCH. UI emits `slewRate,coreSize,dcMag,resonance,outputGain` (lines 268-281). Engine `setParam` handles `saturation,punch` (lines 1781-1782). UI never sends those names. Every knob in the UI is a dead knob.
- **2. Units:** N/A — no overlapping params to compare.
- **3. Missing cases:** ❌ — 5 of 5 UI knobs unhandled (`slewRate, coreSize, dcMag, resonance, outputGain`).
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — `ws → xfmr`, input=ws, output=xfmr (line 1779).
- **6. Dispose:** ✅ — `disposeNodes(ws, xfmr)` (line 1785).
- **7. Defaults:** ⚠️ — Engine reads `p.saturation || 0.5, p.punch || 0.5` for initial curve build (line 1774). UI's defaults object has neither key, so both fall back to 0.5 → curve has audible coloration on insert, but knob turns never affect it after that.
- **8. COMPONENT_MAP:** ✅ registered.
- **Severity:** P0 — every UI knob silently dead; the plugin presents 5 controls, none work post-insert.
- **Demo-blocker?:** yes — UI/engine contract fully broken.

### 4. ConsoleSoul (`consoleSoul`)
- **UI file:** `src/front/js/component/SPXPlugins.js:300`
- **Factory:** native — `src/front/js/pages/RecordingStudio.js:1788`
- **1. Param names:** ❌ — TOTAL NAME MISMATCH. UI emits `crosstalk,noiseFloor,tolerance,channelColor,sumSaturation` (lines 309-314). Engine handles `color,air` (lines 1801-1802). No overlap.
- **2. Units:** N/A — no overlapping params.
- **3. Missing cases:** ❌ — 5 of 5 UI knobs unhandled.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — `ws → hi`, input=ws, output=hi (line 1799).
- **6. Dispose:** ✅ — `disposeNodes(ws, hi)` (line 1805).
- **7. Defaults:** ⚠️ — Engine fallback `p.color || 0.5, p.air || 0.3` not in UI defaults — uses fallback 0.5/0.3 → audible saturation + air shelf on insert with no way to back off (knobs don't touch them).
- **8. COMPONENT_MAP:** ✅ registered.
- **Severity:** P0 — total UI/engine disconnect.
- **Demo-blocker?:** yes.

### 5. BrickWall (`brickWall`)
- **UI file:** `src/front/js/component/SPXPlugins.js:328`
- **Factory:** native — `src/front/js/pages/RecordingStudio.js:2053`
- **1. Param names:** ⚠️ — UI emits `ceiling,lookahead,release,outputGain,truePeak,ispDetect`; engine handles only `ceiling` (line 2059). Five knobs/toggles silent.
- **2. Units:** ✅ — `ceiling` is dB in both (line 2055/2059).
- **3. Missing cases:** ❌ — `lookahead, release, outputGain, truePeak, ispDetect` (5 missing).
- **4. Worklets:** N/A — uses `ctx.createDynamicsCompressor()` with ratio=20, attack=0.001, release=0.01 as a brick-wall approximation. No worklet, no fallback path needed.
- **5. Topology:** ✅ — single node, in=out=lim (line 2058).
- **6. Dispose:** ✅ — `disposeNodes(lim)` (line 2060).
- **7. Defaults:** ✅ — ceiling -0.3 dB is intentional (limiter is meant to clip near 0); only kicks in when audio reaches it.
- **8. COMPONENT_MAP:** ✅ registered (line 1757).
- **Severity:** P1 — ceiling works (the only knob users typically need); release/lookahead/outputGain dead.
- **Demo-blocker?:** no — primary control works.

### 6. WarmPress (`warmPress`)
- **UI file:** `src/front/js/component/SPXPlugins.js:356`
- **Factory:** native — `src/front/js/pages/RecordingStudio.js:1928`
- **1. Param names:** ⚠️ — UI emits `threshold,ratio,attack,release,knee,makeupGain,mix,model`; engine handles `threshold,ratio,attack,release` only (lines 1941-1944). `knee, makeupGain, mix, model` ignored.
- **2. Units:** ✅ — UI ms / engine ÷1000 to seconds (lines 1943-1944).
- **3. Missing cases:** ❌ — `knee, makeupGain, mix, model` (4 missing). Particularly `makeupGain` is glaring: there's no makeup-gain node in the chain at all (line 1937 connects `c → ws` and that's the output).
- **4. Worklets:** N/A.
- **5. Topology:** ⚠️ — input=c, output=ws (line 1939). Static warmth tanh shaper appended after compressor, but UI says it's a comp with optical/vca/vari-mu model selector — the model never changes the curve or attack/release behavior.
- **6. Dispose:** ✅ — `disposeNodes(c, ws)` (line 1947).
- **7. Defaults:** ✅ — threshold -18 with ratio 4 is gentle; mostly inactive on quiet material.
- **8. COMPONENT_MAP:** ✅ registered.
- **Severity:** P1 — 4 dead knobs incl. makeup which most users will reach for.
- **Demo-blocker?:** no.

---

### Auditor checkpoint — first 6 saved.

---

### 7. GlueBus (`glueBus`)
- **UI file:** `src/front/js/component/SPXPlugins.js:395`
- **Factory:** native — `src/front/js/pages/RecordingStudio.js:1950`
- **1. Param names:** ❌ — PARAM NAME MISMATCH on makeup gain. UI emits `makeupGain` (line 411); engine listens for `makeup` (line 1963). Knob is dead.
- **2. Units:** ✅ — threshold dB matches; attack/release ms→s correct (lines 1961-1962).
- **3. Missing cases:** ❌ — `makeupGain` (mismatch), `mix`, `sidechainHPF`, `autoGain` — 4 unhandled. Also no makeup node would even reach the dial since the case label is wrong.  
  Note: a makeup gain node *does* exist (line 1954, `g`) — it just never receives messages from the UI.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — `c → g`, input=c, output=g (line 1957).
- **6. Dispose:** ✅ — `disposeNodes(c, g)` (line 1966).
- **7. Defaults:** ⚠️ — `makeupGain: 2` dB applied at build time (line 1954) → +2 dB louder on insert. Combined with threshold -10 / ratio 4, audible compression typical of bus-comp behavior.
- **8. COMPONENT_MAP:** ✅ registered.
- **Severity:** P1 — name-mismatch on makeup is the worst single bug here; 4 controls dead. Knob users cannot adjust makeup gain at all.
- **Demo-blocker?:** no — comp action still works.

### 8. FETStrike (`fetStrike`)
- **UI file:** `src/front/js/component/SPXPlugins.js:427`
- **Factory:** native — `src/front/js/pages/RecordingStudio.js:1969`
- **1. Param names:** ❌ — UI emits `threshold,ratio,attack,release,inputGain,outputGain,saturation,allButtonRatio`. Engine handles `threshold,ratio,attack,release,makeup` (lines 1978-1982). `makeup` is never sent by UI; `inputGain,outputGain,saturation,allButtonRatio` are unhandled.
- **2. Units:** ✅ — ms→s scaling correct.
- **3. Missing cases:** ❌ — `inputGain, outputGain, saturation, allButtonRatio` (4 missing). Engine has a `makeup` case that no UI knob targets — orphan case, dead code.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠️ — `c → g`, input=c, output=g (line 1976). The "saturation" knob is decorative — there's no waveshaper in the chain despite the plugin's name promising FET-style harmonic distortion.
- **6. Dispose:** ✅ — `disposeNodes(c, g)` (line 1985).
- **7. Defaults:** ⚠️ — Build-time `Math.pow(10, (p.makeup || 4) / 20)` (line 1973) — but UI default has no `makeup` field, so falls back to 4 dB → +4 dB louder on insert. UI's defaults are `inputGain: 0, outputGain: 0` which never reach the engine; user thinks they have unity gain but actually has +4 dB.
- **8. COMPONENT_MAP:** ✅ registered.
- **Severity:** P1 — wrong-by-default loudness + 4 dead knobs. The "FET" sound (saturation) doesn't exist in the engine.
- **Demo-blocker?:** no — basic comp works, but +4 dB-on-insert can surprise users.

### 9. OptoPress (`optoPress`)
- **UI file:** `src/front/js/component/SPXPlugins.js:460`
- **Factory:** native — `src/front/js/pages/RecordingStudio.js:1988`
- **1. Param names:** ❌ — TOTAL NAME MISMATCH. UI emits `peakReduction, gainControl, hfEmphasis, tubeSaturation, outputGain` (lines 470-474). Engine handles `threshold, ratio, attack, release` (lines 1995-1998) — none of those names match. Every UI knob is dead.
- **2. Units:** N/A — no overlapping params.
- **3. Missing cases:** ❌ — 5 of 5 UI knobs unhandled.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — single compressor, in=out=c (line 1993).
- **6. Dispose:** ✅ — `disposeNodes(c)` (line 2001).
- **7. Defaults:** ⚠️ — Build-time uses `p.threshold || -20, p.ratio || 3, p.attack || 50, p.release || 300` — UI's defaults object has none of these keys, so fallbacks fire → engine immediately compresses at -20 dB / 3:1, but the UI's controls show `peakReduction: 50, gainControl: 0` which has no relation. User has zero way to read or change actual compression.
- **8. COMPONENT_MAP:** ✅ registered.
- **Severity:** P0 — total UI/engine disconnect; user sees one set of knobs, hears compression governed by entirely different (invisible) values.
- **Demo-blocker?:** yes.

### 10. ParallelCrush (`parallelCrush`)
- **UI file:** `src/front/js/component/SPXPlugins.js:484`
- **Factory:** native — `src/front/js/pages/RecordingStudio.js:2004`
- **1. Param names:** ⚠️ — UI emits `threshold,ratio,crush,attack,wetGain,dryGain,mix`. Engine handles `threshold,ratio,mix` (lines 2015-2017). `crush,attack,wetGain,dryGain` unhandled.
- **2. Units:** ❌ — UI default `mix: 50` (percent, range 0–100, line 487/502); engine treats mix as 0–1 linear gain (line 2010, `setGainLinear(g.gain, p.mix || 0.5)`, and line 2017 ramps 0–1). Sending `mix=50` to setParam will clamp to 1 (full wet) via `safe(v, 0.5, 0, 1)`. UNIT MISMATCH — user sets mix to "50%" expecting half-blend but gets full wet.
- **3. Missing cases:** ❌ — `crush, attack, wetGain, dryGain` (4 missing).
- **4. Worklets:** N/A.
- **5. Topology:** ⚠️ — comment in code admits "Parallel is approximated as serial here" (line 2005). True parallel needs split+sum; this is a serial wet-only crusher with the gain stage labeled "mix".
- **6. Dispose:** ✅ — `disposeNodes(c, g)` (line 2020).
- **7. Defaults:** ❌ — UI default mix=50 → engine receives 50, clamps to 1 → 100% wet on insert. Dangerous + wrong unit.
- **8. COMPONENT_MAP:** ✅ registered.
- **Severity:** P0 — mix unit mismatch causes user-visible loudness error on insert; not a parallel comp at all topologically.
- **Demo-blocker?:** yes — broken mix knob is the headline control.

### 11. MultiPress (`multiPress`)
- **UI file:** `src/front/js/component/SPXPlugins.js:513`
- **Factory:** native — `src/front/js/pages/RecordingStudio.js:2023`
- **1. Param names:** ❌ — TOTAL NAME MISMATCH. UI emits 15 keys (`xover1/2/3, b1/2/3/4Thresh/Ratio/Gain`). Engine handles `lowThreshold, highThreshold` (lines 2031-2032) — names UI never sends. ALL 15 UI knobs are dead.
- **2. Units:** N/A — no overlapping params.
- **3. Missing cases:** ❌ — 15 of 15 UI knobs unhandled.
- **4. Worklets:** N/A.
- **5. Topology:** ❌ — Engine builds **two** compressors in series (`lo → hi`, line 2027). UI shows a 4-band MB-comp with 3 crossover points and 4 separate threshold/ratio/gain rows. Engine is not multiband at all — no Linkwitz-Riley split, no 4 parallel bands. The UI's design is unimplemented.
- **6. Dispose:** ✅ — `disposeNodes(lo, hi)` (line 2035).
- **7. Defaults:** ⚠️ — Engine reads `p.lowThreshold || -18, p.highThreshold || -12` — UI defaults have no such keys, fallbacks fire. User sees 4 bands at thresholds -20/-18/-16/-14 in the UI; engine actually uses -18 and -12 (decoupled).
- **8. COMPONENT_MAP:** ✅ registered.
- **Severity:** P0 — UI promises 4-band MB-comp; engine is a 2-comp serial chain; every UI knob is dead.
- **Demo-blocker?:** yes — flagship plugin, fundamentally not what it claims.

### 12. TransGate (`transGate`)
- **UI file:** `src/front/js/component/SPXPlugins.js:552`
- **Factory:** native — `src/front/js/pages/RecordingStudio.js:2038`
- **1. Param names:** ⚠️ — UI emits `threshold,attack,hold,release,range,hysteresis,scHPF,scLPF,lookahead,flip`. Engine handles `threshold,attack,release` (lines 2045-2047). 7 knobs/toggles unhandled.
- **2. Units:** ✅ — ms→s scaling correct for what's wired.
- **3. Missing cases:** ❌ — `hold, range, hysteresis, scHPF, scLPF, lookahead, flip` (7 missing).
- **4. Worklets:** N/A.
- **5. Topology:** ❌ — Engine uses `ctx.createDynamicsCompressor()` with ratio=20, knee=0 (lines 2039-2040). A compressor reduces gain when ABOVE threshold — a gate reduces gain when BELOW threshold. This is a hard-knee high-ratio limiter, not a gate. Operates inverted from UI's stated semantics. The "Flip (Ducker)" toggle is unhandled, so users can't repurpose it as the ducker the UI promises.
- **6. Dispose:** ✅ — `disposeNodes(g)` (line 2050).
- **7. Defaults:** ✅ — threshold -40 with ratio 20 is so far below typical signal that on most material it does nothing audible (passes through), masking the inverted-behavior bug.
- **8. COMPONENT_MAP:** ✅ registered.
- **Severity:** P0 — semantically wrong: this is a limiter, not a gate. Most signals will pass through unaltered (so it appears to "work"), but loud signals get squashed instead of opening the gate. 7 controls dead.
- **Demo-blocker?:** yes — the plugin name is `transGate` and its core function is gating; the engine doesn't gate.

---

## Batch 02 Summary
- **Total audited:** 12
- **Clean (no issues):** 0
- **P2 (cosmetic):** 0
- **P1 (polish):** 5 — tapeForge, valveGlow, brickWall, warmPress, glueBus, fetStrike (6 actually)
- **P0 (demo-blocker):** 6 — ironCore, consoleSoul, optoPress, parallelCrush, multiPress, transGate
- **Top 3 worst plugins:**
  1. **multiPress** — UI shows 4-band MB-comp; engine is 2-band serial; 15/15 knobs dead.
  2. **transGate** — engine is a limiter (compress-above-threshold), not a gate; semantics inverted; 7/10 knobs dead.
  3. **ironCore** / **consoleSoul** / **optoPress** (tied) — total UI/engine name mismatch; every knob silently dead.

### Common patterns
- **Pattern A — Total name mismatch (4 plugins: ironCore, consoleSoul, optoPress, multiPress):** UI shipped with one parameter vocabulary, engine implemented with a different, simpler vocabulary. Looks like the UIs were built later and never reconciled with the inline RecordingStudio.js handlers. Fix path: either rename engine cases to UI names (and add real implementations for missing controls) or rename UI knobs to engine names (and accept the reduced feature set).
- **Pattern B — Partial name mismatch (1 plugin: glueBus):** UI emits `makeupGain`, engine listens for `makeup`. One-character fix in the case label.
- **Pattern C — Unit mismatch (parallelCrush):** UI mix in 0–100 percent, engine treats as 0–1 linear, `safe()` clamps `50` to `1` → full-wet on insert. Either divide by 100 in the case handler or change the UI to 0–1.
- **Pattern D — Topology stub admitted in comments (parallelCrush, multiPress):** code comments openly say "approximated as serial." UI advertises features (parallel comp, multiband) that the engine doesn't implement. These should either be marked "Beta" in the UI or the engine should be upgraded with proper topology.
- **Pattern E — Semantic inversion (transGate):** A `DynamicsCompressor` with ratio=20 is a limiter, not a gate. A real gate needs an envelope follower + threshold-comparator + VCA gain — none exist. This is the most fundamentally broken plugin in the batch.
- **Pattern F — Missing cases for ALL plugins:** Every plugin in this batch has at least 1 missing setParam case (median: 4–5 missing). The pattern is consistent enough that it suggests a single audit/refactor pass to add the missing cases — most need only a single AudioParam ramp or no-op for booleans/selects.
- **All 12 UIs are correctly registered in `COMPONENT_MAP` (lines 1755-1768 of SPXPlugins.js).** Class 8 is clean for the entire batch.
- **No worklet usage anywhere in this batch.** brickWall/masterWall use the native `DynamicsCompressor`, not `spx-limiter` worklet. Class 4 is N/A across the board.
- **All dispose() implementations are clean** — every factory calls `disposeNodes(...)` on exactly the nodes it created. No memory-leak class 6 issues.
