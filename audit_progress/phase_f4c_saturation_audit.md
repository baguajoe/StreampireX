# Phase F4-C-FIX — Task 3 saturation/distortion factory audit

Per-plugin verification of WaveShaper curve assignment, drive-knob
wiring, mix-knob default, and other distortion-relevant params.


## Quick-look table

| Plugin | Line | WaveShapers | Curve assigned? | Mix default expr | Cases handled |
|---|---|---|---|---|---|
| `distortion` | 1766 | ws | ✅ all assigned | `*(no mix line found)*` | 0 |
| `tapeSaturation` | 1945 | ws | ✅ all assigned | `*(no mix line found)*` | 2 |
| `tapeForge` | 1984 | ws | ✅ all assigned | `*(no mix line found)*` | 4 |
| `valveGlow` | 2009 | ws | ✅ all assigned | `*(no mix line found)*` | 2 |
| `ironCore` | 2029 | ws | ✅ all assigned | `*(no mix line found)*` | 7 |
| `consoleSoul` | 2063 | ws | ✅ all assigned | `*(no mix line found)*` | 7 |
| `harmonicExcite` | 2098 | ws | ✅ all assigned | `p.mix != null ? p.mix : 0` | 8 |
| `vinylPress` | 2139 | ws | ✅ all assigned | `*(no mix line found)*` | 2 |
| `loFiCrusher` | 2160 | ws | ✅ all assigned | `*(no mix line found)*` | 7 |
| `vocalSaturator` | 2211 | ws | ✅ all assigned | `*(no mix line found)*` | 7 |
| `multibandSat` | 2252 | ws1, ws2, ws3, ws4 | ✅ all assigned | `setGainLinear(dry.gain, 1 - safe(p.mix != null ? p.mix : 0, 0, 0, 1); setGainLin` | 11 |
| `cabinetSim` | 2345 | *(none)* | ✅ all assigned | `*(no mix line found)*` | 6 |
| `ringMod` | 5868 | *(none)* | ✅ all assigned | `setMix(wet.gain, ((p.mix != null ? p.mix : 0)` | 5 |
| `enhancer808` | 5621 | ws | ✅ all assigned | `*(no mix line found)*` | 5 |
| `bitcrusher` | 1916 | ws | ✅ all assigned | `*(no mix line found)*` | 0 |
| `exciter` | 1925 | ws | ✅ all assigned | `*(no mix line found)*` | 2 |

## Per-plugin detail

### `distortion` (line 1766)

- WaveShapers built: `ws`
- ✅ Curve assigned for all WaveShapers
- *(no mix-init line detected — verify manually)*

### `tapeSaturation` (line 1945)

- WaveShapers built: `ws`
- ✅ Curve assigned for all WaveShapers
- *(no mix-init line detected — verify manually)*

| Case | First-line excerpt |
|---|---|
| `drive` | `ws.curve = makeTanhCurve(v); break;` |
| `warmth` | `lp.frequency.setTargetAtTime(safe(12000 - safe(v, 0, 0, 1) * 6000, 12000, 20, 20000), t, TAU); break;` |

### `tapeForge` (line 1984)

- WaveShapers built: `ws`
- ✅ Curve assigned for all WaveShapers
- *(no mix-init line detected — verify manually)*

| Case | First-line excerpt |
|---|---|
| `drive` | `drv = safe(v, 0.5, 0, 1); ws.curve = buildCurve(drv, sat); break;` |
| `saturation` | `sat = safe(v, 0.6, 0, 1); ws.curve = buildCurve(drv, sat); break;` |
| `hfLoss` | `lp.frequency.setTargetAtTime(safe(18000 - safe(v, 0.3, 0, 1) * 10000, 18000, 20, 20000), t, TAU); break;` |
| `bias` | `hp.frequency.setTargetAtTime(safe(20 + safe(v, 0.5, 0, 1) * 30, 20, 20, 20000), t, TAU); break;` |

### `valveGlow` (line 2009)

- WaveShapers built: `ws`
- ✅ Curve assigned for all WaveShapers
- *(no mix-init line detected — verify manually)*

| Case | First-line excerpt |
|---|---|
| `drive` | `ws.curve = buildCurve(v); break;` |
| `warmth` | `lo.gain.setTargetAtTime(safe(safe(v, 0.5, 0, 1) * 3, 0, -60, 24), t, TAU); break;` |

### `ironCore` (line 2029)

- WaveShapers built: `ws`
- ✅ Curve assigned for all WaveShapers
- *(no mix-init line detected — verify manually)*

| Case | First-line excerpt |
|---|---|
| `slewRate` | `` |
| `saturation` | `sat = safe(v, 0.5, 0, 1); ws.curve = buildCurve(sat, punch); break;` |
| `coreSize` | `` |
| `punch` | `punch = safe(v, 0.5, 0, 1); ws.curve = buildCurve(sat, punch); break;` |
| `dcMag` | `xfmr.gain.setTargetAtTime(safe(safe(v, 0.2, 0, 1) * 8, 0, -60, 24), t, TAU); break;` |
| `resonance` | `xfmr.Q.setTargetAtTime(safe(0.5 + safe(v, 0.3, 0, 1) * 4, 1, 0.0001, 1000), t, TAU); break;` |
| `outputGain` | `og.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 4), t, TAU); break;` |

### `consoleSoul` (line 2063)

- WaveShapers built: `ws`
- ✅ Curve assigned for all WaveShapers
- *(no mix-init line detected — verify manually)*

| Case | First-line excerpt |
|---|---|
| `channelColor` | `` |
| `color` | `curColor = safe(v, 0.5, 0, 1); ws.curve = buildCurve(curColor, curSumSat); break;` |
| `sumSaturation` | `curSumSat = safe(v, 0, 0, 1); ws.curve = buildCurve(curColor, curSumSat); break;` |
| `crosstalk` | `` |
| `air` | `hi.gain.setTargetAtTime(safe(safe(v, 0.3, 0, 1) * 4, 0, -60, 24), t, TAU); break;` |
| `noiseFloor` | `/* no noise generator node — accepted no-op */ break;` |
| `tolerance` | `/* no component-variance node — accepted no-op */ break;` |

### `harmonicExcite` (line 2098)

- WaveShapers built: `ws`
- ✅ Curve assigned for all WaveShapers
- Mix init lines:
  - `p.mix != null ? p.mix : 0`

| Case | First-line excerpt |
|---|---|
| `freq` | `` |
| `frequency` | `hp.frequency.setTargetAtTime(safe(v, 3000, 20, 20000), t, TAU); break;` |
| `drive` | `dr = safe(v, 0.5, 0, 1); ws.curve = buildCurve(dr, ev, od); break;` |
| `even` | `ev = safe(v, 0.6, 0, 1); ws.curve = buildCurve(dr, ev, od); break;` |
| `odd` | `od = safe(v, 0.3, 0, 1); ws.curve = buildCurve(dr, ev, od); break;` |
| `amount` | `dr = safe(v, 0.5, 0, 1); ws.curve = buildCurve(dr, ev, od); break;` |
| `airBoost` | `air.gain.setTargetAtTime(safe(v, 0, -60, 24), t, TAU); break;` |
| `mix` | `g.gain.setTargetAtTime(safe(safe(v, 30, 0, 100) / 100, 0.3, 0, 1), t, TAU); break;` |

### `vinylPress` (line 2139)

- WaveShapers built: `ws`
- ✅ Curve assigned for all WaveShapers
- *(no mix-init line detected — verify manually)*

| Case | First-line excerpt |
|---|---|
| `warmth` | `ws.curve = buildCurve(v); lp.frequency.setTargetAtTime(safe(14000 - safe(v, 0.5, 0, 1) * 4000, 14000, 20, 20000), t, TAU` |
| `crackle` | `hp.frequency.setTargetAtTime(safe(30 + safe(v, 0.1, 0, 1) * 20, 30, 20, 20000), t, TAU); break;` |

### `loFiCrusher` (line 2160)

- WaveShapers built: `ws`
- ✅ Curve assigned for all WaveShapers
- *(no mix-init line detected — verify manually)*

| Case | First-line excerpt |
|---|---|
| `bits` | `ws.curve = makeBitcrushCurve(safe(v, 12, 4, 24)); break;` |
| `rate` | `curLpBase = rateToFreq(v); lp.frequency.setTargetAtTime(safe(curLpBase, 12000, 20, 20000), t, TAU); break;` |
| `filter` | `curLpBase = 2000 + safe(v, 0.5, 0, 1) * 18000; lp.frequency.setTargetAtTime(safe(curLpBase, 12000, 20, 20000), t, TAU); ` |
| `downsample` | `curLpBase = 8000 - safe(v, 0.5, 0, 1) * 4000;  lp.frequency.setTargetAtTime(safe(curLpBase, 8000, 20, 20000), t, TAU); b` |
| `noise` | `noiseGain.gain.setTargetAtTime(safe(v, 0, 0, 1) * 0.1, t, TAU); break;` |
| `wobble` | `updateWobbleDepth(v); break;           // Phase C: mix needs proper dry/wet split (current chain is wet-only).` |
| `mix` | `break;` |

### `vocalSaturator` (line 2211)

- WaveShapers built: `ws`
- ✅ Curve assigned for all WaveShapers
- *(no mix-init line detected — verify manually)*

| Case | First-line excerpt |
|---|---|
| `amount` | `ws.curve = buildCurve(v); break;` |
| `drive` | `ws.curve = buildCurve(safe(v, 0.4, 0, 1)); break;` |
| `presence` | `pres.gain.setTargetAtTime(safe(safe(v, 0.5, 0, 1) * 5, 0, -60, 24), t, TAU); break;` |
| `warmth` | `warmth.gain.setTargetAtTime(safe(safe(v, 0, 0, 1) * 6, 0, -60, 24), t, TAU); break;` |
| `air` | `air.gain.setTargetAtTime(safe(safe(v, 0, 0, 1) * 6, 0, -60, 24), t, TAU); break;` |
| `mix` | `{             const m = safe(v > 1 ? v / 100 : v, 0.5, 0, 1);             wet.gain.setTargetAtTime(m, t, TAU);          ` |
| `outputGain` | `outG.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 4), t, TAU); break;` |

### `multibandSat` (line 2252)

- WaveShapers built: `ws1, ws2, ws3, ws4`
- ✅ Curve assigned for all WaveShapers
- Mix init lines:
  - `setGainLinear(dry.gain, 1 - safe(p.mix != null ? p.mix : 0, 0, 0, 1)`
  - `setGainLinear(wet.gain, safe(p.mix != null ? p.mix : 0, 0, 0, 1)`

| Case | First-line excerpt |
|---|---|
| `xover1` | `{             const f = safe(v, 200, 20, 20000);             b1lp1.frequency.setTargetAtTime(f, t, TAU); b1lp2.frequency` |
| `xover2` | `{             const f = safe(v, 2000, 20, 20000);             b2lp1.frequency.setTargetAtTime(f, t, TAU); b2lp2.frequenc` |
| `xover3` | `{             const f = safe(v, 8000, 20, 20000);             b3lp1.frequency.setTargetAtTime(f, t, TAU); b3lp2.frequenc` |
| `drive1` | `ws1.curve = buildCurve(safe(v, 0.3, 0, 1)); break;` |
| `drive2` | `ws2.curve = buildCurve(safe(v, 0.3, 0, 1)); break;` |
| `drive3` | `ws3.curve = buildCurve(safe(v, 0.2, 0, 1)); break;` |
| `drive4` | `ws4.curve = buildCurve(safe(v, 0.1, 0, 1)); break;` |
| `mix` | `{             const m = safe(v, 0.5, 0, 1);             wet.gain.setTargetAtTime(m, t, TAU);             dry.gain.setTar` |
| `low` | `ws1.curve = buildCurve(safe(v, 0.3, 0, 1)); break;` |
| `mid` | `ws2.curve = buildCurve(safe(v, 0.3, 0, 1)); break;` |
| `high` | `ws3.curve = buildCurve(safe(v, 0.2, 0, 1)); break;` |

### `cabinetSim` (line 2345)

- WaveShapers built: `(none)`
- ✅ Curve assigned for all WaveShapers
- *(no mix-init line detected — verify manually)*

| Case | First-line excerpt |
|---|---|
| `cabinet` | `{             curCab = safe(v, 0, 0, 5);             mid.frequency.setTargetAtTime(safe(cabToMidF(curCab), 800, 20, 2000` |
| `distance` | `{             curDist = safe(v, 0, 0, 1);             hi.frequency.setTargetAtTime(safe(cabToHiF(curCab) + distToHi(curD` |
| `angle` | `mid.gain.setTargetAtTime(safe(angleToMidGain(v), 0, -60, 24), t, TAU);             break;` |
| `type` | `{             // Legacy alias — UI never sends, but kept for back-compat.             const ty = safe(v, 0, 0, 10);     ` |
| `mic` | `` |
| `mix` | `break;` |

### `ringMod` (line 5868)

- WaveShapers built: `(none)`
- ✅ Curve assigned for all WaveShapers
- Mix init lines:
  - `setMix(wet.gain, ((p.mix != null ? p.mix : 0)`

| Case | First-line excerpt |
|---|---|
| `carrierType` | `try { carrier.type = v \|\| "sine"; } catch (e) {} break;` |
| `carrierFreq` | `carrier.frequency.setTargetAtTime(safe(v, 440, 0, 20000), t, TAU); break;` |
| `mode` | `dc.gain.setTargetAtTime(safe(v === "am" ? 0.5 : 0, 0, 0, 4), t, TAU); break;` |
| `mix` | `wet.gain.setTargetAtTime(safe((v \|\| 0) / 100, 0, 0, 1), t, TAU); break;` |
| `outputGain` | `og.gain.setTargetAtTime(safe(Math.pow(10, safe(v, 0, -60, 24) / 20), 1, 0, 4), t, TAU); break;` |

### `enhancer808` (line 5621)

- WaveShapers built: `ws`
- ✅ Curve assigned for all WaveShapers
- *(no mix-init line detected — verify manually)*

| Case | First-line excerpt |
|---|---|
| `freq` | `sub.frequency.setTargetAtTime(safe(v, 60, 20, 20000), t, TAU);                              punch.frequency.setTargetAtT` |
| `sub` | `sub.gain.setTargetAtTime(safe(safe(v, 0, 0, 1) * 12, 0, -60, 24), t, TAU); break;` |
| `punch` | `punch.gain.setTargetAtTime(safe(safe(v, 0, 0, 1) * 6, 0, -60, 24), t, TAU); break;` |
| `harmonic` | `ws.curve = makeTanhCurve(v); break;` |
| `outputGain` | `og.gain.setTargetAtTime(safe(v, 1, 0, 4), t, TAU); break;` |

### `bitcrusher` (line 1916)

- WaveShapers built: `ws`
- ✅ Curve assigned for all WaveShapers
- *(no mix-init line detected — verify manually)*

### `exciter` (line 1925)

- WaveShapers built: `ws`
- ✅ Curve assigned for all WaveShapers
- *(no mix-init line detected — verify manually)*

| Case | First-line excerpt |
|---|---|
| `frequency` | `hp.frequency.setTargetAtTime(safe(v, 3000, 20, 20000), t, TAU); break;` |
| `amount` | `ws.curve = buildCurve(v); break;` |
