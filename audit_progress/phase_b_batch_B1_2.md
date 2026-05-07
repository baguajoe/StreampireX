# Phase B Batch 1.2 — UI↔factory param-name reconciliation (4 plugins)

Branch: `claude/fix-recording-studio`
Scope: 4 SPX plugins (reduced from 10). Other 6 deferred to Phase C per user.

---

## ringMod — FIXED-AS-IS
- Files touched: none (verified no-op)
- UI keys: `mode, carrierFreq, carrierType, mix, lfoRate, lfoDepth, sidebandBalance, outputGain`
- Factory cases (RecordingStudio.js:3037–3061): `carrierType, carrierFreq, mode, mix, outputGain` already correctly wired with proper unit conversion (mix/100, outputGain dB→linear via 10^(v/20), carrierType try/catch).
- `lfoRate, lfoDepth, sidebandBalance` require new LFO oscillator + balance-split nodes → Phase C.
- Verdict: 5/8 knobs functional, 3 deferred. No code change needed in scope.

---

## vocalSaturator — PARTIAL (drive added; warmth/air/mix/outputGain deferred)
- Files touched: `src/front/js/pages/RecordingStudio.js` (1 edit, ~lines 1877–1885)
- UI keys: `drive, warmth, presence, air, mix, outputGain`
- Factory previously: `amount, presence` only. UI never emits `amount`.
- Fix: added `case "drive":` that calls existing `buildCurve(safe(v, 0.4, 0, 1))` → curve rebuild on the existing waveshaper. Kept `case "amount"` for backward compat.
- `presence` already correctly mapped (0–1 → 0–5 dB peak gain).
- `warmth, air, mix, outputGain` left as no-op cases (prevents `default` warn-spam) — all four require new node tree (lowshelf @200Hz + highshelf @10kHz + dry/wet split + output gain) → Phase C.
- Verdict: 2/6 knobs functional (drive, presence). 4 deferred.

---

## gainStager — FIXED (with deferred meter/state knobs)
- Files touched: `src/front/js/pages/RecordingStudio.js` (1 edit, ~lines 2216–2235)
- UI keys: `gain (linear 0–4), trim (dB ±24), targetDb, phase, rmsDb, peakDb`
- Bug fixed: factory previously treated `gain` as dB via `Math.pow(10, gain/20)` — UI default `gain=1` rendered as +1 dB instead of unity.
- Now: `gain` applied as linear directly; `trim` converted dB→linear via `Math.pow(10, v/20)`; combined factor = `gain * trim` written to GainNode. Persistent `curGain`/`curTrim` closures so each knob updates independently.
- `targetDb, phase, rmsDb, peakDb` are meters/UI state — left as dead cases (no-op).
- Verdict: 2/6 knobs functional (gain, trim). 4 are non-audio (meters/visual).

---

## midSideComp — PARTIAL (mid-bus knobs working; side* + makeup deferred)
- Files touched: `src/front/js/pages/RecordingStudio.js` (1 edit, ~lines 2147–2168)
- UI keys: `midThresh, midRatio, sideThresh, sideRatio, attack, release, makeup`
- Factory previously: `threshold, ratio` (UI never emits those names).
- Fix: mapped `midThresh→c.threshold`, `midRatio→c.ratio`, `attack→c.attack` (ms→s ÷1000), `release→c.release` (ms→s ÷1000). Build-time defaults pulled from UI keys (`p.midThresh`, `p.midRatio`, `p.attack`, `p.release`).
- `sideThresh, sideRatio, makeup` left as no-op cases. True M/S processing requires `ChannelSplitter + matrix mixer + parallel compressor` → Phase C.
- Verdict: 4/7 knobs functional. 3 deferred.

---

## COMPONENT_MAP additions
Added to `src/front/js/component/SPXPlugins.js:1768–1771`:
- `RingModUI`
- `VocalSaturatorUI`
- `GainStagerUI`
- `MidSideCompUI`

All four UIs were already imported (lines 11–12) but never registered. Registering unblocks the floating plugin window so users can open and tweak knobs (previously SPXPluginHost returned `null` for these keys).

---

## Files touched
- `src/front/js/pages/RecordingStudio.js` — 3 edits (vocalSaturator, gainStager, midSideComp).
- `src/front/js/component/SPXPlugins.js` — 1 edit (COMPONENT_MAP additions).

---

## Deferred to Phase C (per user)
- **formantFilter** — needs autoWah LFO + wet/dry mix node tree.
- **subOctaver** — needs separate -1/-2 oct waveshapers + dry/oct gain mixer (not just a single rectifier).
- **drumEnhancer** — needs new lowshelf+highshelf+saturator nodes for `glue, sub, air, outputGain`.
- **stereoImager** — needs ChannelSplitter+per-band mid/side decode for `lowWidth/midWidth/highWidth + xover1/xover2`.
- **multibandLimiter** — needs 4-band split + per-band limiters for `ceiling, lookahead, xover1/2/3`.
- **multibandSat** — needs 3-band parallel split + per-band saturators for `xover1/2/3, drive1/2/3/4, mix`.

---

## B1.2 Summary
- Fixed: 2/4 (ringMod fixed-as-is, gainStager unit-mismatch resolved)
- Partial (some keys Phase C): 2 — vocalSaturator (drive added; warmth/air/mix/outputGain deferred), midSideComp (mid bus + ms attack/release working; sideThresh/sideRatio/makeup deferred)
- COMPONENT_MAP additions: RingModUI, VocalSaturatorUI, GainStagerUI, MidSideCompUI
- Files touched: src/front/js/pages/RecordingStudio.js (3 edits), src/front/js/component/SPXPlugins.js (1 edit)
- Phase C deferred (per user): formantFilter, subOctaver, drumEnhancer, stereoImager, multibandLimiter, multibandSat
