# Phase D2.1.E — Apply Modulation / Pitch / Creative Default Changes

Applied proposed changes from `phase_d_audit_modulation_pitch.md` to neutralize
modulation, pitch, and creative plugin defaults so plugins are silent or
transparent on insert.

---

## Changes applied

### SPX PLUGIN_DEFAULTS (src/front/js/component/SPXPlugins.js, ~line 1906)

| Plugin | Param | Before | After |
|---|---|---:|---:|
| stereoBloom | mix | 50 | 0 |
| vortexMod | mix | 50 | 0 |
| vortexMod | feedback | 0.4 | 0.2 |
| chorusEnsemble | mix | 0.5 | 0 |
| pitchLock | humanize | 0.3 | 0 |
| pitchRandomizer | amount | 10 | 0 |
| subOctaver | oct1Level | 0.7 | 0 |
| subOctaver | oct2Level | 0.3 | 0 |
| ringMod | mix | 50 | 0 |
| vocoderSPX | mix | 100 | 0 |
| voiceForge | v1Vol | 0.8 | 0 |
| voiceForge | v2Vol | 0.7 | 0 |
| voiceForge | v3Vol | 0.6 | 0 |
| voiceForge | v4Vol | 0.5 | 0 |
| voiceForge | mix | 50 | 0 |

(autoWah mix already 0 per current file; formantFilter mix already 0.)

### SPX factory `??` fallbacks (src/front/js/pages/RecordingStudio.js)

| Plugin | Site | Change |
|---|---|---|
| stereoBloom | `normalizeMix(p.mix, 0.25)` | `0.25 → 0` |
| pitchRandomizer | `centsToDepth(...10)`, `safe(cents, 10, ...)` | `10 → 0` |
| subOctaver | `safe(p.oct1Level, 0.7, ...)` init + setParam | `0.7 → 0` |
| subOctaver | `safe(p.oct2Level, 0.3, ...)` init + setParam | `0.3 → 0` |
| ringMod | `((p.mix != null ? p.mix : 50) / 100)` | `50 → 0` |
| ringMod | setParam mix `safe(..., 0.5, ...)` | `0.5 → 0` |
| formantFilter | setParam mix `safe(..., 1, ...)` | `1 → 0` |
| vocoderSPX | `(p.mix != null ? p.mix : 100) / 100` | `100 → 0` |
| vocoderSPX | setParam mix `safe(..., 1, ...)` | `1 → 0` |
| voiceForge | mixInit fallback `... 50 ... 0.5 ...` | `50 → 0`, `0.5 → 0` |
| voiceForge | per-voice baseVol `safe(..., 0.7, ...)` | `0.7 → 0` |
| voiceForge | setParam vNVol `safe(v, 0.7, ...)` | `0.7 → 0` |
| voiceForge | setParam mix `safe(..., 0.5, ...)` | `0.5 → 0` |

(autoWah factory has no mix node; chorusEnsemble factory leaves mix unhandled; vortexMod factory has no mix or feedback nodes — PLUGIN_DEFAULTS-only.)

### registry.js (src/front/js/component/audio/plugins/registry.js)

| Plugin | Param | Before | After |
|---|---|---:|---:|
| auto_pan | depth | 0.8 | 0 |
| auto_tune | speed | 0.5 | 0 |
| choir | mix | 50 | 0 |
| chorus | rate | 1.5 | 1 |
| chorus | mix | 50 | 0 |
| flanger | rate | 0.3 | 0.5 |
| flanger | feedback | 0.5 | 0.2 |
| flanger | mix | 50 | 0 |
| harmonizer | mix | 50 | 0 |
| octaver | mix1 | 50 | 0 |
| octaver | mix2 | 30 | 0 |
| phaser | mix | 50 | 0 |
| resonator | mix | 50 | 0 |
| ring_mod | mix | 50 | 0 |
| rotary | mix | 100 | 0 |
| tremolo | rate | 4 | 1 |
| tremolo | depth | 0.7 | 0 |
| vibrato | rate | 3 | 1 |
| vibrato | depth | 0.005 | 0 |
| vocal_doubler | mix | 50 | 0 |
| vocal_enhancer | presence | 3 | 0 |
| vocal_enhancer | air | 2 | 0 |
| vocal_enhancer | warmth | 1 | 0 |

### ph_* factory `??` fallbacks (src/front/js/component/audio/plugins/plugins/)

| File | Change |
|---|---|
| AutoPanPlugin.js | `rate ?? 0.5 → 1`; `depth ?? 0.4 → 0` (both branches) |
| ChoirPlugin.js | `mix ?? 50 → 0` |
| ChorusPlugin.js (createChorusPlugin) | `rate ?? 1.5 → 1`; `mix ?? 50 → 0` |
| ChorusPlugin.js (createFlangerPlugin block) | `feedback ?? 0.5 → 0.2`; `rate ?? 0.3 → 0.5`; `mix ?? 50 → 0` |
| ChorusPlugin.js (createPhaserPlugin block) | `mix ?? 50 → 0` |
| FlangerPlugin.js | `feedback ?? 0.5 → 0.2`; `rate ?? 0.3 → 0.5`; `mix ?? 50 → 0` (createFlanger); `mix ?? 50 → 0` (createPhaser) |
| PhaserPlugin.js | `mix ?? 50 → 0` |
| TremoloPlugin.js | `rate ?? 4 → 1`; `depth ?? 0.5 → 0` |
| VibratoPlugin.js | `rate ?? 5 → 1`; `depth ?? 0.005 → 0` |
| ResonatorPlugin.js | `mix ?? 50 → 0` |
| RingModPlugin.js | `initMix ... : 50 → 0` |
| VocalDoublerPlugin.js | `mix ?? 50 → 0` |
| VocalEnhancerPlugin.js | `presence ?? 2 → 0`; `air ?? 1.5 → 0`; `body ?? -1 → 0` |
| AutoTunePlugin.js | `speed ... 0.5 → 0` |
| HarmonizerPlugin.js | `mix ... 0.5 → 0` |
| OctaverPlugin.js | `mix1 ... 50 → 0`; `mix2 ... 30 → 0` |

(RotaryPlugin.js has no mix node — registry default carries it.)

---

## D2.2 Cross-source reconciliations

- **VocalEnhancer**: registry exposes `warmth` knob, factory only listens for
  `body`. Set both `body` factory default to 0 AND `warmth` registry default
  to 0 so each path is neutral, but live UI changes to `warmth` still don't
  reach the factory. Flag for D2.3 logic fix.
- **Chorus** rate: registry says 1.5 → audit picks 1; ChorusPlugin factory
  default also moved to 1. Reconciled.
- **Flanger** rate / feedback: registry was 0.3 / 0.5; ChorusPlugin and
  FlangerPlugin factories had 0.3 / 0.5. All three sources reconciled to
  0.5 / 0.2.
- **Tremolo** rate: registry 4 / factory 4 → both moved to 1. depth 0.7
  registry, factory had 0.5 → both moved to 0.
- **Vibrato** rate: registry 3 / factory 5 → both moved to 1. depth 0.005
  both → both 0.
- **AutoPan** depth: registry 0.8 / factory 0.4 → both moved to 0.
- **AutoTune** speed: registry 0.5 / factory 0.5 → both moved to 0.

---

## D2.1.E Summary
- Plugins touched: 22
- Param defaults changed: ~55
- Cross-source reconciliations: 7 (Chorus rate, Flanger rate+feedback, Tremolo rate+depth, Vibrato rate+depth, AutoPan depth, AutoTune speed; VocalEnhancer warmth/body flagged for D2.3)
- Files touched:
  - `src/front/js/component/SPXPlugins.js` (4 edits)
  - `src/front/js/pages/RecordingStudio.js` (12 edits)
  - `src/front/js/component/audio/plugins/registry.js` (15 edits)
  - 14 ph_* plugin files (1–3 edits each)
- Skipped (judgment-call / already-neutral): tapeStop, freqShifter (SPX), granularFreeze, pitchForge (SPX), PitchShifter (ph_*), FrequencyShifter (ph_*), pitchLock retune/bypass, autoWah ranges, Phaser stages, Choir voices/detune, vocoderSPX bands/carrier
