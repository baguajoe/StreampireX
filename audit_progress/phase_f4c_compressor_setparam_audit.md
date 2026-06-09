# Phase F4-C-FIX — compressor setParam wiring audit

Static scan of every install() factory for the listed compressor-like
plugins. For each, lists every `case "X":` in the setParam switch and
the AudioParam (or helper) it writes to. Flags missing standard
cases (threshold/ratio/attack/release/knee).


## Summary

| Plugin | Line | Cases handled | Missing standard | Has default? |
|---|---|---|---|---|
| `compressor` | 1749 | `threshold`, `ratio`, `attack`, `release` | missing: knee | yes |
| `limiter` | 1782 | `threshold`, `knee`, `ratio`, `attack`, `release` | — | yes |
| `gate` | 1799 | `threshold`, `attack`, `release` | missing: ratio, knee | yes |
| `deesser` | 1816 | `frequency`, `threshold` | missing: ratio, attack, release, knee | yes |
| `warmPress` | 2400 | `threshold`, `ratio`, `attack`, `release`, `knee`, `makeup`, `makeupGain`, `model`, `mix` | — | yes |
| `glueBus` | 2526 | `threshold`, `ratio`, `attack`, `release`, `makeup`, `makeupGain`, `autoGain` | missing: knee | yes |
| `fetStrike` | 2584 | `threshold`, `ratio`, `attack`, `release`, `makeup`, `saturation`, `allButtonRatio` | missing: knee | yes |
| `optoPress` | 2645 | `peakReduction`, `threshold`, `ratio`, `attack`, `release`, `hfEmphasis`, `tubeSaturation`, `gainControl`, `outputGain` | missing: knee | yes |
| `parallelCrush` | 2738 | `threshold`, `ratio`, `attack`, `release`, `crush`, `wetGain`, `dryGain`, `mix` | missing: knee | yes |
| `tubeComp` | 2806 | `threshold`, `ratio`, `attack`, `release`, `drive`, `warmth`, `makeup`, `stereoLink` | missing: knee | yes |
| `vocalComp` | 2869 | `threshold`, `ratio`, `attack`, `release`, `deEss`, `presence`, `air`, `mix` | missing: knee | yes |
| `multiPress` | 2957 | `xover1`, `xover2`, `xover3`, `b1Thresh`, `b2Thresh`, `b3Thresh`, `b4Thresh`, `b1Ratio`, `b2Ratio`, `b3Ratio`, `b4Ratio`, `b1Gain`, `b2Gain`, `b3Gain`, `b4Gain`, `lowThreshold`, `highThreshold` | missing: threshold, ratio, attack, release, knee | yes |
| `transGate` | 3055 | `threshold`, `attack`, `hold`, `release`, `range`, `hysteresis`, `scHPF`, `scLPF`, `lookahead`, `flip` | missing: ratio, knee | yes |
| `brickWall` | 3119 | — | — | — |  *no setParam switch found* |
| `masterWall` | 3129 | `ceiling`, `threshold`, `release`, `lookahead`, `clipMargin`, `outputGain`, `gain`, `truePeak`, `dither` | missing: ratio, attack, knee | yes |
| `gainRider` | 3392 | `targetLevel`, `target`, `speed`, `smooth`, `maxGain`, `minGain`, `lookahead`, `gateThresh` | missing: threshold, ratio, attack, release, knee | yes |
| `transientShaper` | 3426 | `attack`, `sustain`, `speed`, `outputGain` | missing: threshold, ratio, release, knee | yes |
| `breathGate` | 3482 | — | — | — |  *no setParam switch found* |
| `sibilantCut` | 3492 | `freq`, `frequency`, `bandwidth`, `ratio`, `amount`, `threshold`, `attackSpeed`, `mode`, `listenSC` | missing: attack, release, knee | yes |
| `midSideComp` | 3556 | `midThresh`, `midRatio`, `attack`, `release`, `sideThresh`, `sideRatio`, `makeup` | missing: threshold, ratio, knee | yes |
| `multibandLimiter` | 3579 | `ceiling`, `lookahead`, `xover1`, `xover2`, `xover3` | missing: threshold, ratio, attack, release, knee | yes |

## Per-plugin setParam case → target

### `compressor` (line 1749)
- ⚠️ missing: knee

| Case | Target | First-line excerpt |
|---|---|---|
| `threshold` | c.threshold | `c.threshold.setTargetAtTime(safe(v, -20, -100, 0), t, TAU); break;` |
| `ratio` | c.ratio | `c.ratio.setTargetAtTime(safe(v, 4, 1, 20), t, TAU); break;` |
| `attack` | c.attack | `c.attack.setTargetAtTime(safe(v, 0.01, 0, 1), t, TAU); break;` |
| `release` | c.release | `c.release.setTargetAtTime(safe(v, 0.1, 0, 1), t, TAU); break;           default:` |

*default branch present:* yes

### `limiter` (line 1782)

| Case | Target | First-line excerpt |
|---|---|---|
| `threshold` | lim.threshold | `lim.threshold.setTargetAtTime(safe(v, -1, -100, 0), t, TAU); break;` |
| `knee` | lim.knee | `lim.knee.setTargetAtTime(safe(v, 0, 0, 40), t, TAU); break;` |
| `ratio` | lim.ratio | `lim.ratio.setTargetAtTime(safe(v, 20, 1, 20), t, TAU); break;` |
| `attack` | lim.attack | `lim.attack.setTargetAtTime(safe(v, 0.001, 0, 1), t, TAU); break;` |
| `release` | lim.release | `lim.release.setTargetAtTime(safe(v, 0.01, 0, 1), t, TAU); break;           defau` |

*default branch present:* yes

### `gate` (line 1799)
- ⚠️ missing: ratio, knee

| Case | Target | First-line excerpt |
|---|---|---|
| `threshold` | gt.threshold | `gt.threshold.setTargetAtTime(safe(v, -40, -100, 0), t, TAU); break;` |
| `attack` | gt.attack | `gt.attack.setTargetAtTime(safe(v, 0.001, 0, 1), t, TAU); break;` |
| `release` | gt.release | `gt.release.setTargetAtTime(safe(v, 0.1, 0, 1), t, TAU); break;           default` |

*default branch present:* yes

### `deesser` (line 1816)
- ⚠️ missing: ratio, attack, release, knee

| Case | Target | First-line excerpt |
|---|---|---|
| `frequency` | bp.frequency | `bp.frequency.setTargetAtTime(safe(v, 7000, 20, 20000), t, TAU); break;` |
| `threshold` | bp.gain | `bp.gain.setTargetAtTime(safe(-Math.abs(v ?? 6), -6, -60, 0), t, TAU); break;    ` |

*default branch present:* yes

### `warmPress` (line 2400)

| Case | Target | First-line excerpt |
|---|---|---|
| `threshold` | c.threshold | `c.threshold.setTargetAtTime(safe(v, -18, -100, 0), t, TAU); break;` |
| `ratio` | c.ratio | `c.ratio.setTargetAtTime(safe(v, 3, 1, 20), t, TAU); break;` |
| `attack` | c.attack | `c.attack.setTargetAtTime(safe((v != null ? v : 10) / 1000, 0.01, 0, 1), t, TAU);` |
| `release` | c.release | `c.release.setTargetAtTime(safe((v != null ? v : 100) / 1000, 0.1, 0, 1), t, TAU)` |
| `knee` | c.knee | `c.knee.setTargetAtTime(safe(v, 6, 0, 40), t, TAU); break;` |
| `makeup` | *(no AudioParam ramp detected — review manually)* | `` |
| `makeupGain` | mk.gain | `mk.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 16), ` |
| `model` | helper:setMode | `setMode(typeof v === "string" ? v : "optical"); break;` |
| `mix` | wetGain.gain | `{             const m = safe((v != null ? v : 100) / 100, 1, 0, 1);             ` |

*default branch present:* yes

### `glueBus` (line 2526)
- ⚠️ missing: knee

| Case | Target | First-line excerpt |
|---|---|---|
| `threshold` | c.threshold | `lastThresh = safe(v, -12, -100, 0);             c.threshold.setTargetAtTime(last` |
| `ratio` | c.ratio | `c.ratio.setTargetAtTime(safe(v, 4, 1, 20), t, TAU); break;` |
| `attack` | c.attack | `c.attack.setTargetAtTime(safe((v \|\| 10) / 1000, 0.01, 0, 1), t, TAU); break;` |
| `release` | c.release | `c.release.setTargetAtTime(safe((v \|\| 100) / 1000, 0.1, 0, 1), t, TAU); break;` |
| `makeup` | *(no AudioParam ramp detected — review manually)* | `` |
| `makeupGain` | g.gain | `baseMakeupDb = safe(v, 0, -60, 24);             g.gain.setTargetAtTime(computeMa` |
| `autoGain` | g.gain | `autoGain = !!v;             g.gain.setTargetAtTime(computeMakeupLinear(), t, TAU` |

*default branch present:* yes

### `fetStrike` (line 2584)
- ⚠️ missing: knee

| Case | Target | First-line excerpt |
|---|---|---|
| `threshold` | c.threshold | `c.threshold.setTargetAtTime(safe(v, -15, -100, 0), t, TAU); break;` |
| `ratio` | c.ratio | `// If allButton is engaged, ratio is locked to 20 and ignores knob.             ` |
| `attack` | c.attack | `c.attack.setTargetAtTime(safe((v \|\| 1) / 1000, 0.001, 0, 1), t, TAU); break;` |
| `release` | c.release | `c.release.setTargetAtTime(safe((v \|\| 50) / 1000, 0.05, 0, 1), t, TAU); break;` |
| `makeup` | g.gain | `g.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 4, -60, 24) / 20), 1, 0, 4), t,` |
| `saturation` | ws.curve | `{             satState = safe(v, 0, 0, 1);             const eff = allButton ? M` |
| `allButtonRatio` | c.ratio | `{             allButton = !!v;             if (allButton) {               c.rati` |

*default branch present:* yes

### `optoPress` (line 2645)
- ⚠️ missing: knee

| Case | Target | First-line excerpt |
|---|---|---|
| `peakReduction` | c.threshold | `c.threshold.setTargetAtTime(safe(-safe(v, 50, 0, 100) * 0.6, -30, -100, 0), t, T` |
| `threshold` | c.threshold | `c.threshold.setTargetAtTime(safe(v, -20, -100, 0), t, TAU); break;` |
| `ratio` | c.ratio | `c.ratio.setTargetAtTime(safe(v, 3, 1, 20), t, TAU); break;` |
| `attack` | c.attack | `c.attack.setTargetAtTime(safe((v \|\| 50) / 1000, 0.05, 0, 1), t, TAU); break;  ` |
| `release` | c.release | `c.release.setTargetAtTime(safe((v \|\| 300) / 1000, 0.3, 0, 1), t, TAU); break;` |
| `hfEmphasis` | hf.gain | `hf.gain.setTargetAtTime(safe(safe(v, 0, 0, 1) * 6, 0, -60, 24), t, TAU); break;` |
| `tubeSaturation` | ws.curve | `ws.curve = buildSatCurve(v); break;` |
| `gainControl` | mk.gain | `mk.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, 0, 40) / 20), 1, 0, 100), t` |
| `outputGain` | og.gain | `og.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 4), t` |

*default branch present:* yes

### `parallelCrush` (line 2738)
- ⚠️ missing: knee

| Case | Target | First-line excerpt |
|---|---|---|
| `threshold` | comp.threshold | `comp.threshold.setTargetAtTime(safe(v, -25, -100, 0), t, TAU); break;` |
| `ratio` | comp.ratio | `comp.ratio.setTargetAtTime(safe(v, 10, 1, 20), t, TAU); break;` |
| `attack` | comp.attack | `comp.attack.setTargetAtTime(safe((v \|\| 5) / 1000, 0.005, 0, 1), t, TAU); break` |
| `release` | comp.release | `comp.release.setTargetAtTime(safe((v \|\| 80) / 1000, 0.08, 0, 1), t, TAU); brea` |
| `crush` | ws.curve | `ws.curve = buildCrushCurve(v); break;` |
| `wetGain` | wetTrim.gain | `wetTrim.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -12, 12) / 20), 1, 0, ` |
| `dryGain` | dryTrim.gain | `dryTrim.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -12, 12) / 20), 1, 0, ` |
| `mix` | wetGain.gain | `{             const m = safe((v != null ? v : 50) / 100, 0.5, 0, 1);            ` |

*default branch present:* yes

### `tubeComp` (line 2806)
- ⚠️ missing: knee

| Case | Target | First-line excerpt |
|---|---|---|
| `threshold` | c.threshold | `c.threshold.setTargetAtTime(safe(v, -14, -100, 0), t, TAU); break;` |
| `ratio` | c.ratio | `c.ratio.setTargetAtTime(safe(v, 3, 1, 20), t, TAU); break;` |
| `attack` | c.attack | `c.attack.setTargetAtTime(safe((v != null ? v : 20) / 1000, 0.02, 0, 1), t, TAU);` |
| `release` | c.release | `c.release.setTargetAtTime(safe((v != null ? v : 300) / 1000, 0.3, 0, 1), t, TAU)` |
| `drive` | ws.curve | `ws.curve = buildTubeCurve(v); break;` |
| `warmth` | warmth.gain | `warmth.gain.setTargetAtTime(safe(safe(v, 0.5, 0, 1) * 6, 3, -24, 24), t, TAU); b` |
| `makeup` | mk.gain | `mk.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 16), ` |
| `stereoLink` | *(no AudioParam ramp detected — review manually)* | `/* UI-only — see comment above */ break;           default: break;` |

*default branch present:* yes

### `vocalComp` (line 2869)
- ⚠️ missing: knee

| Case | Target | First-line excerpt |
|---|---|---|
| `threshold` | mainComp.threshold | `mainComp.threshold.setTargetAtTime(safe(v, -16, -100, 0), t, TAU); break;` |
| `ratio` | mainComp.ratio | `mainComp.ratio.setTargetAtTime(safe(v, 3, 1, 20), t, TAU); break;` |
| `attack` | mainComp.attack | `mainComp.attack.setTargetAtTime(safe((v != null ? v : 5) / 1000, 0.005, 0, 1), t` |
| `release` | mainComp.release | `mainComp.release.setTargetAtTime(safe((v != null ? v : 80) / 1000, 0.08, 0, 1), ` |
| `deEss` | deEss.gain | `deEss.gain.setTargetAtTime(safe(-safe(v, 0.4, 0, 1) * 8, -3, -24, 24), t, TAU); ` |
| `presence` | presence.gain | `presence.gain.setTargetAtTime(safe(safe(v, 0.3, 0, 1) * 6, 2, -24, 24), t, TAU);` |
| `air` | airShelf.gain | `airShelf.gain.setTargetAtTime(safe(safe(v, 0.2, 0, 1) * 8, 1.6, -24, 24), t, TAU` |
| `mix` | wetGain.gain | `{             const m = safe((v != null ? v : 100) / 100, 1, 0, 1);             ` |

*default branch present:* yes

### `multiPress` (line 2957)
- ⚠️ missing: threshold, ratio, attack, release, knee

| Case | Target | First-line excerpt |
|---|---|---|
| `xover1` | b1lp1.frequency | `{             const f = safe(v, 100, 20, 20000);             b1lp1.frequency.set` |
| `xover2` | b2lp1.frequency | `{             const f = safe(v, 1000, 20, 20000);             b2lp1.frequency.se` |
| `xover3` | b3lp1.frequency | `{             const f = safe(v, 8000, 20, 20000);             b3lp1.frequency.se` |
| `b1Thresh` | c1.threshold | `c1.threshold.setTargetAtTime(safe(v, -20, -100, 0), t, TAU); break;` |
| `b2Thresh` | c2.threshold | `c2.threshold.setTargetAtTime(safe(v, -18, -100, 0), t, TAU); break;` |
| `b3Thresh` | c3.threshold | `c3.threshold.setTargetAtTime(safe(v, -16, -100, 0), t, TAU); break;` |
| `b4Thresh` | c4.threshold | `c4.threshold.setTargetAtTime(safe(v, -14, -100, 0), t, TAU); break;` |
| `b1Ratio` | c1.ratio | `c1.ratio.setTargetAtTime(safe(v, 3, 1, 20), t, TAU); break;` |
| `b2Ratio` | c2.ratio | `c2.ratio.setTargetAtTime(safe(v, 3, 1, 20), t, TAU); break;` |
| `b3Ratio` | c3.ratio | `c3.ratio.setTargetAtTime(safe(v, 4, 1, 20), t, TAU); break;` |
| `b4Ratio` | c4.ratio | `c4.ratio.setTargetAtTime(safe(v, 4, 1, 20), t, TAU); break;` |
| `b1Gain` | g1.gain | `g1.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -24, 24) / 20), 1, 0, 16), ` |
| `b2Gain` | g2.gain | `g2.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -24, 24) / 20), 1, 0, 16), ` |
| `b3Gain` | g3.gain | `g3.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -24, 24) / 20), 1, 0, 16), ` |
| `b4Gain` | g4.gain | `g4.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -24, 24) / 20), 1, 0, 16), ` |
| `lowThreshold` | c1.threshold | `c1.threshold.setTargetAtTime(safe(v, -20, -100, 0), t, TAU); break;` |
| `highThreshold` | c4.threshold | `c4.threshold.setTargetAtTime(safe(v, -14, -100, 0), t, TAU); break;           de` |

*default branch present:* yes

### `transGate` (line 3055)
- ⚠️ missing: ratio, knee

| Case | Target | First-line excerpt |
|---|---|---|
| `threshold` | comp.threshold | `comp.threshold.setTargetAtTime(safe(v, -40, -100, 0), t, TAU); break;` |
| `attack` | comp.attack | `comp.attack.setTargetAtTime(safe((v \|\| 1) / 1000, 0.001, 0, 1), t, TAU); break` |
| `hold` | comp.release | `holdMs = safe(v, 50, 0, 2000);             comp.release.setTargetAtTime(safe((ho` |
| `release` | comp.release | `releaseMs = safe(v, 200, 10, 4000);             comp.release.setTargetAtTime(saf` |
| `range` | *(no AudioParam ramp detected — review manually)* | `// Phase C5: needs worklet for proper floor attenuation.             break;` |
| `hysteresis` | comp.knee | `comp.knee.setTargetAtTime(safe(v, 3, 0, 40), t, TAU); break;` |
| `scHPF` | scHPF.frequency | `scHPF.frequency.setTargetAtTime(safe(v, 80, 20, 20000), t, TAU); break;` |
| `scLPF` | scLPF.frequency | `scLPF.frequency.setTargetAtTime(safe(v, 8000, 20, 20000), t, TAU); break;` |
| `lookahead` | lookahead.delayTime | `lookahead.delayTime.setTargetAtTime(safe((v \|\| 1) / 1000, 0.001, 0, 0.05), t, ` |
| `flip` | *(no AudioParam ramp detected — review manually)* | `// Phase C5: ducker (inverted gate) needs worklet.             flipMode = !!v;  ` |

*default branch present:* yes

### `brickWall` (line 3119)
- no setParam switch found

### `masterWall` (line 3129)
- ⚠️ missing: ratio, attack, knee

| Case | Target | First-line excerpt |
|---|---|---|
| `ceiling` | fbLim.threshold | `{             const cv = safe(v, -0.3, -12, 0);             setAP('ceiling', cv)` |
| `threshold` | fbLim.threshold | `{             const tv = safe(v, -6, -24, 0);             setAP('threshold', tv)` |
| `release` | fbLim.release | `{             const rv = safe(v, 100, 10, 1000);             setAP('release', rv` |
| `lookahead` | fbDelay.delayTime | `{             const lv = safe(v, 5, 0, 10);             setAP('lookahead', lv); ` |
| `clipMargin` | *(no AudioParam ramp detected — review manually)* | `setAP('clipMargin', safe(v, 0.3, 0, 6)); break;` |
| `outputGain` | *(no AudioParam ramp detected — review manually)* | `` |
| `gain` | output.gain | `{             const gv = safe(v, 0, -12, 12);             setAP('outputGain', gv` |
| `truePeak` | *(no AudioParam ramp detected — review manually)* | `setAP('truePeak', v ? 1 : 0); break;` |
| `dither` | *(no AudioParam ramp detected — review manually)* | `/* APPROXIMATE: noise-shaped dither not implemented */ break;           default:` |

*default branch present:* yes

### `gainRider` (line 3392)
- ⚠️ missing: threshold, ratio, attack, release, knee

| Case | Target | First-line excerpt |
|---|---|---|
| `targetLevel` | *(no AudioParam ramp detected — review manually)* | `` |
| `target` | c.threshold | `c.threshold.setTargetAtTime(safe(v, -18, -100, 0), t, TAU); break;` |
| `speed` | c.attack | `{             const s = safe(v, 0.5, 0, 1);             c.attack.setTargetAtTime` |
| `smooth` | c.knee | `c.knee.setTargetAtTime(safe(safe(v, 0.7, 0, 1) * 30, 20, 0, 40), t, TAU); break;` |
| `maxGain` | *(no AudioParam ramp detected — review manually)* | `/* no makeup-gain node — accepted no-op */ break;` |
| `minGain` | *(no AudioParam ramp detected — review manually)* | `/* no min-gain node — accepted no-op */ break;` |
| `lookahead` | *(no AudioParam ramp detected — review manually)* | `/* no delay-line node — accepted no-op */ break;` |
| `gateThresh` | *(no AudioParam ramp detected — review manually)* | `/* no gate node — accepted no-op */ break;           default: break;` |

*default branch present:* yes

### `transientShaper` (line 3426)
- ⚠️ missing: threshold, ratio, release, knee

| Case | Target | First-line excerpt |
|---|---|---|
| `attack` | fastG.gain | `fastG.gain.setTargetAtTime(safe(Math.pow(10, dbFromKnob(safe(v, 0, -1, 1)) / 20)` |
| `sustain` | slowG.gain | `slowG.gain.setTargetAtTime(safe(Math.pow(10, dbFromKnob(safe(v, 0, -1, 1)) / 20)` |
| `speed` | fastC.attack | `{             const s = safe(v, 0.5, 0, 1);             fastC.attack.setTargetAt` |
| `outputGain` | out.gain | `out.gain.setTargetAtTime(safe(v, 1, 0, 4), t, TAU); break;           default: br` |

*default branch present:* yes

### `breathGate` (line 3482)
- no setParam switch found

### `sibilantCut` (line 3492)
- ⚠️ missing: attack, release, knee

| Case | Target | First-line excerpt |
|---|---|---|
| `freq` | *(no AudioParam ramp detected — review manually)* | `` |
| `frequency` | ds.frequency | `ds.frequency.setTargetAtTime(safe(v, 7000, 20, 20000), t, TAU); break;` |
| `bandwidth` | ds.Q | `ds.Q.setTargetAtTime(safe(10 - safe(v, 0.5, 0, 1) * 9.5, 5, 0.0001, 1000), t, TA` |
| `ratio` | ds.gain | `{             const r = safe(v, 6, 1, 20);             ds.gain.setTargetAtTime(s` |
| `amount` | ds.gain | `ds.gain.setTargetAtTime(safe(-Math.abs(v ?? 6), -6, -60, 0), t, TAU); break;` |
| `threshold` | *(no AudioParam ramp detected — review manually)* | `/* no dynamic SC node — accepted no-op */ break;` |
| `attackSpeed` | *(no AudioParam ramp detected — review manually)* | `/* no envelope follower — accepted no-op */ break;` |
| `mode` | *(no AudioParam ramp detected — review manually)* | `/* dynamic/broadband/split — needs SC tree (Phase C) */ break;` |
| `listenSC` | *(no AudioParam ramp detected — review manually)* | `/* SC monitor needs split — accepted no-op */ break;           default: break;` |

*default branch present:* yes

### `midSideComp` (line 3556)
- ⚠️ missing: threshold, ratio, knee

| Case | Target | First-line excerpt |
|---|---|---|
| `midThresh` | c.threshold | `c.threshold.setTargetAtTime(safe(v, -18, -100, 0), t, TAU); break;` |
| `midRatio` | c.ratio | `c.ratio.setTargetAtTime(safe(v, 3, 1, 20), t, TAU); break;` |
| `attack` | c.attack | `c.attack.setTargetAtTime(safe((v \|\| 0) / 1000, 0.005, 0, 1), t, TAU); break;` |
| `release` | c.release | `c.release.setTargetAtTime(safe((v \|\| 0) / 1000, 0.1, 0, 1), t, TAU); break;   ` |
| `sideThresh` | *(no AudioParam ramp detected — review manually)* | `` |
| `sideRatio` | *(no AudioParam ramp detected — review manually)* | `` |
| `makeup` | *(no AudioParam ramp detected — review manually)* | `break;           default: break;` |

*default branch present:* yes

### `multibandLimiter` (line 3579)
- ⚠️ missing: threshold, ratio, attack, release, knee

| Case | Target | First-line excerpt |
|---|---|---|
| `ceiling` | l1.threshold | `{             const c = safe(v, -0.3, -6, 0);             l1.threshold.setTarget` |
| `lookahead` | dly.delayTime | `{             // 0..10 ms → 0..0.01 s. Note: this is a pre-split delay, not true` |
| `xover1` | b1lp1.frequency | `{             const f = safe(v, 200, 20, 20000);             b1lp1.frequency.set` |
| `xover2` | b2lp1.frequency | `{             const f = safe(v, 2000, 20, 20000);             b2lp1.frequency.se` |
| `xover3` | b3lp1.frequency | `{             const f = safe(v, 8000, 20, 20000);             b3lp1.frequency.se` |

*default branch present:* yes
