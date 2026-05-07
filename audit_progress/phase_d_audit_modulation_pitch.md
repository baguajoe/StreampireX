# Phase D1.5 — Modulation / Pitch / Creative Defaults Audit

Read-only audit. Compares current defaults to neutrality rules.

**Sources:**
- SPX PLUGIN_DEFAULTS — `src/front/js/component/SPXPlugins.js` lines ~1700–1748
- SPX factories — `src/front/js/pages/RecordingStudio.js` `buildFxChain()`
- ph_* factories — `src/front/js/component/audio/plugins/plugins/<Name>Plugin.js`
- ph_* registry — `src/front/js/component/audio/plugins/registry.js`

**Rules applied:**
- Modulation (chorus/flanger/phaser/tremolo/autoWah/vibrato/etc.): depth=0 OR mix=0% on insert; rate 0.5–1 Hz; feedback 0.2.
- Pitch plugins: shift=0 on insert (transparent); formant=0; mix=100% (pitch IS the effect; dry doesn't make sense).

---

## Proposed changes

| Plugin | Param | Current | Proposed | Reason |
|---|---|---:|---:|---|
| **stereoBloom** (SPX) | mix | 50 | 0 | Modulation rule — silent on insert |
| stereoBloom | depth | 0.6 | 0.6 | OK if mix=0; leave |
| **vortexMod** (SPX) | mix | 50 | 0 | Modulation rule — silent on insert |
| vortexMod | depth | 0.7 | 0.7 | OK if mix=0; leave |
| vortexMod | feedback | 0.4 | 0.2 | Rule says feedback ≤0.2 |
| **chorusEnsemble** (SPX) | mix | 0.5 | 0 | Modulation rule (scale 0..1) |
| chorusEnsemble | depth | 0.5 | 0.5 | OK if mix=0 |
| **autoWah** (SPX) | mix | 1.0 | 0 | Modulation rule (scale 0..1) |
| autoWah | sensitivity | 0.6 | 0.6 | OK if mix=0 |
| **pitchLock** (SPX) | humanize | 0.3 | 0 | Manual-mode plugin — should be true bypass on insert; humanize=0.3 detunes |
| pitchLock | retune | 0 | 0 | ✓ already neutral (bypass) |
| **pitchRandomizer** (SPX) | amount | 10 | 0 | amount in cents — actively shifts pitch on insert |
| pitchRandomizer | mix | 1.0 | 1.0 | OK once amount=0 (transparent) |
| **subOctaver** (SPX) | oct1Level | 0.7 | 0 | Adds octave-down content on insert |
| subOctaver | oct2Level | 0.3 | 0 | Adds 2nd-octave content on insert |
| subOctaver | dryLevel | 1.0 | 1.0 | ✓ pass dry through (correct) |
| **ringMod** (SPX) | mix | 50 | 0 | Ring mod is destructive — silent on insert |
| ringMod | carrierFreq | 440 | 440 | Sensible default once mix=0 |
| **formantFilter** (SPX) | mix | 100 | 0 | Formant filter colors signal even at static morph |
| formantFilter | morph | 0.5 | 0.5 | OK once mix=0 (single vowel position) |
| **vocoderSPX** (SPX) | mix | 100 | 0 | Vocoder needs external carrier — on bare track insert it'll produce silence/garble |
| **voiceForge** (SPX) | v1Vol | 0.8 | 0 | Pitch-shifted voice audible on insert (Phase C4 = 4× Tone.PitchShift) |
| voiceForge | v2Vol | 0.7 | 0 | Same |
| voiceForge | v3Vol | 0.6 | 0 | Same |
| voiceForge | v4Vol | 0.5 | 0 | Same |
| voiceForge | mix | 50 | 0 | Belt-and-braces — keep voices silent on insert |
| **AutoPan** (ph_*) | depth | 0.8 | 0 | Modulation rule — silent on insert |
| AutoPan | rate | 1 | 1 | ✓ rule range 0.5–1 Hz |
| **Choir** (ph_*) | mix | 50 | 0 | Choir doublings audible on insert |
| **Chorus** (ph_*) | mix | 50 | 0 | Modulation rule — silent on insert |
| Chorus | rate | 1.5 | 1 | Rule range 0.5–1 Hz; 1.5 is borderline (leave if you prefer) |
| **Flanger** (ph_*) | mix | 50 | 0 | Modulation rule |
| Flanger | feedback | 0.5 | 0.2 | Rule: feedback ≤0.2 |
| Flanger | rate | 0.3 | 0.5 | Rule range 0.5–1 Hz |
| **Phaser** (ph_*) | mix | 50 | 0 | Modulation rule |
| Phaser | resonance | 3 | 3 | OK once mix=0 |
| **Tremolo** (ph_*) | depth | 0.7 | 0 | Modulation rule — depth=0 = silent |
| Tremolo | rate | 4 | 1 | Rule range 0.5–1 Hz; 4 Hz is choppy default |
| **Vibrato** (ph_*) | depth | 0.005 | 0 | Modulation rule |
| Vibrato | rate | 3 | 1 | Rule range 0.5–1 Hz |
| **Resonator** (ph_*) | mix | 50 | 0 | Resonator imposes tonal coloration |
| **Rotary** (ph_*) | mix | 100 | 0 | Leslie always rotates — silent on insert |
| **RingMod** (ph_*) | mix | 50 | 0 | Ring mod destructive |
| **VocalDoubler** (ph_*) | mix | 50 | 0 | Modulation rule (doubler = chorus-class) |
| **VocalEnhancer** (ph_*) | presence | 3 | 0 | Adds 3 dB presence boost on insert |
| VocalEnhancer | air | 2 | 0 | Adds 2 dB air on insert |
| VocalEnhancer | warmth | 1 | 0 | Adds 1 dB warmth on insert |
| **AutoTune** (ph_*, manual mode after C4) | speed | 0.5 | 0 | speed=0.5 actively retunes on insert; manual mode should be bypass |
| AutoTune | mix | 100 | 100 | ✓ pitch rule |
| **Harmonizer** (ph_*, after C4) | mix | 50 | 0 | Adds harmony voices (-5, +3 semitones) on insert |
| Harmonizer | shift1 | -5 | -5 | Sensible interval once mix=0 |
| Harmonizer | shift2 | 3 | 3 | Sensible interval once mix=0 |
| **Octaver** (ph_*) | mix1 | 50 | 0 | Octave-down content on insert |
| Octaver | mix2 | 30 | 0 | Octave-up content on insert |
| Octaver | dry | 100 | 100 | ✓ keep dry through |

---

## ✓ Already neutral (no changes)

- **tapeStop** (SPX): `active: false` — waits for user trigger. Other knobs only fire when active.
- **freqShifter** (SPX, Phase C4 SSB): `shift: 0` = transparent passthrough. Niemitalo Hilbert correctly returns dry at shift=0.
- **granularFreeze** (SPX): `freeze: false`. Phase C3 worklet returns input unchanged when not frozen — `mix: 80` is irrelevant until freeze fires.
- **pitchForge** (SPX, Phase C4): `shift: 0, formant: 0, mix: 100` — pitch=0 = transparent; mix=100 is correct per pitch rule.
- **PitchShifter** (ph_*, Phase C4): `shift: 0, mix: 100` — pitch rule satisfied.
- **FrequencyShifter** (ph_*, Phase C4 SSB): `shift: 0, mix: 100` — transparent at shift=0.

---

## Judgment-call (no change, with reasoning)

- **pitchLock.bypass: false** — current implementation may use `bypass` flag separately from `retune=0`. Verified: factory checks `retune` for activation; `bypass: false` is correct (means "not bypassed", but `retune=0` and `humanize=0` make it transparent anyway).
- **autoWah.minFreq=200, maxFreq=4000** — kept (sensible vocal range when user later raises mix from 0).
- **Phaser.stages=6** — kept (musical default for a phaser).
- **AutoPan.rate=1** — kept (rule says 0.5–1 Hz; this is the upper bound).
- **Choir.voices=4, detune=15¢** — kept (sensible choir character once user dials mix up).
- **vocoderSPX.bands=32, carrierType="sawtooth"** — kept (sensible config; mix=0 keeps it silent on insert until user routes a carrier).

---

## Code-side issues flagged for D2 (not pure default changes)

- **vocoderSPX**: needs external carrier signal to produce sound. Even with mix=100, on a bare track it'll be silent or garbled because there's no internal modulator. Recommend D2 either: (a) ship internal saw oscillator at carrierFreq=110 Hz as default carrier; or (b) UI badge "needs carrier track" + stay at mix=0.
- **voiceForge / Harmonizer**: when v1-4 Vol go to 0, the Tone.PitchShift voices still consume CPU. Optimal would be to disconnect those voice nodes when their volume is 0 (cheap CPU win).
- **stereoBloom factory** uses `p.width` not `p.mix` for primary gain (RecordingStudio.js:install). Verify the factory's setParam case for `mix` actually wires to anything — earlier audit batches noted it. If broken, mix=0 default won't help.

---

## D1.5 Summary
- Audited: 22 plugins (15 SPX + 17 ph_*; minus duplicates already covered by phantomDouble in D1.1)
- Proposed changes: ~50 across 22 plugins
- ✓ already neutral: 6 plugins
- Judgment-call retentions: 6 params
- Code-side D2 issues: 3
