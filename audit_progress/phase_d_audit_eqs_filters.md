# Phase D1.3 — Defaults Audit: EQs + Filters

**Scope:** Audit all EQ and filter plugins (~25) for neutrality on insert. Compare current defaults to neutrality rules; propose changes only — no code modifications.

**Sources audited:**
- SPX `PLUGIN_DEFAULTS` — `src/front/js/component/SPXPlugins.js` lines 1840–1960
- SPX `buildFxChain` factory — `src/front/js/pages/RecordingStudio.js` lines 1301+ (e.g. `makeIronBand` line 1412)
- SPX `FACTORY_DEFAULTS` — `src/front/js/utils/pluginPresets.js` lines 238–283
- ph_* factories — `src/front/js/component/audio/plugins/plugins/<Name>Plugin.js`
- ph_* registry — `src/front/js/component/audio/plugins/registry.js`

---

## Neutrality rules (recap)

- **EQs:** band gains 0 dB, frequencies sensible, HPF=20 Hz, LPF=20 kHz, input/output gain 0 dB
- **Static filters (LPF/HPF/notch/comb):** cutoff at extreme so effectively bypass; resonance Q=0.7
- **Modulated filters (autofilter/envelope/wahwah/step):** depth 0 OR mix 0% so silent on insert
- **Dynamic EQ:** threshold -20 dB, ratio 3:1, gain 0 dB, all bands `dynamic: false`
- **Tonal-shape EQs (baxandall/tilt/pultec):** boost/cut 0 dB

---

## Proposed changes

| Plugin | Param | Current | Proposed | Reason |
|---|---|---|---|---|
| **dynamicEQ (SPX)** | `bands[0].dynamic` | `true` | `false` | Insert behavior should not trigger dynamic gain riding until user enables. Static gain is already 0 dB so silent — but the active `dynamic:true` flag means the band starts evaluating threshold immediately. Default to all bands static. (`SPXPlugins.js:1876`) |
| **dynamicEQ (SPX)** | `bands[3].dynamic` | `true` | `false` | Same as above — band index 3 (4 kHz) defaults to dynamic. (`SPXPlugins.js:1879`) |
| **dynamicEQ (SPX)** | `bands[*].q` | `1` (most) | OK; index 4 already 0.7 | Bands 0–3 use q=1, band 4 uses 0.7. q=1 acceptable for peaking; HPF type at index 0 should ideally use 0.7 for Butterworth — see judgment call below. |
| **pultecForge** | `highBW` | `0.5` | `0.5` ✓ keep | Pultec curves with boost=0/atten=0 produce no signal change regardless of bandwidth. Already neutral. *(no change)* |
| **autoWah / AutoWah (ph_)** | `mix` | n/a (no mix param) | n/a | autoWah has only `sensitivity/minFreq/maxFreq/resonance/attack/release/mix`. SPX `autoWah` PLUGIN_DEFAULTS has `mix: 1.0` — interpreted as 100%. **Propose `mix: 0`** so insert is transparent until user opens it. (`SPXPlugins.js:1909`) |
| **autoWah (SPX)** | `mix` | `1.0` (=100%) | `0` | Modulated filter on insert should be silent — depth on freq sweep otherwise alters tone. (`SPXPlugins.js:1909`) |
| **vowelFilter (formantFilter SPX)** | `mix` | `100` | `0` | Modulated filter (vowel morph + autoWah) — should be transparent on insert. (`SPXPlugins.js:1917`) |
| **noiseReduction** | `reduction` | `0.6` | `0` (or keep `learn:false`+`mix-equiv`) | Active reduction at 60% on insert is destructive. With `learn:false` and no profile it may be inert, but the param signals intent. Propose `reduction: 0`. (`SPXPlugins.js:1920`) |
| **AirEQPlugin (ph_)** | `mix` | `100` | `0` | Registry default 100% — but factory params `air=0, presence=0` are already neutral, so 100% mix is also transparent. ✓ already neutral via gains. *(no change needed; mix=100 is fine because boost=0)* |
| **AutoFilterPlugin (ph_)** | `mix` | `100` | `0` | Modulated bandpass-style filter — at mix=100 with depth=0.5 the filter sweeps audibly. Insert default should be `mix: 0` (or `depth: 0`). (`registry.js:141`, `AutoFilterPlugin.js:25,29`) |
| **AutoFilterPlugin (ph_)** | `depth` | `0.5` | `0` | Alternative to mix=0; either kills modulation. (`registry.js:138`) |
| **CombFilterPlugin (ph_)** | `mix` | `50` | `0` | Comb filter at 50% mix produces audible coloration on insert. (`registry.js:363`, `CombFilterPlugin.js:11`) |
| **CombFilterPlugin (ph_)** | `feedback` | `0.7` | `0.7` keep | Once mix=0, feedback is irrelevant. *(no change)* |
| **DCFilterPlugin (ph_)** | `freq` | `5` Hz | `5` Hz ✓ | DC blocker at 5 Hz HPF is effectively transparent for audio. ✓ Already neutral. *(no change)* |
| **DynamicEQPlugin (ph_)** | `gain` | `0` ✓ | `0` ✓ | Static gain 0 → no boost/cut. ✓ |
| **DynamicEQPlugin (ph_)** | `threshold` | `-18` | `-20` | Tighten to spec (rule: -20 dB). Minor difference but standardize. (`registry.js:515`) |
| **DynamicEQPlugin (ph_)** | `ratio` | `3` ✓ | `3` ✓ | Matches rule. ✓ |
| **EnvelopeFilterPlugin (ph_)** | `mix` | `100` | `0` | Active envelope follower at 100% sweeps filter audibly. (`registry.js:552`, `EnvelopeFilterPlugin.js:22,47`) |
| **EnvelopeFilterPlugin (ph_)** | `depth` | `0.8` | `0` | Alternative — kills the sweep. |
| **EQ3BandPlugin (ph_)** | `lowGain/midGain/highGain` | `0/0/0` ✓ | ✓ | All gains 0 dB. ✓ Already neutral. |
| **EQ3BandPlugin (ph_)** | `lowFreq` | `150` | `150` ✓ | Sensible (rule allows 80–250 region). ✓ |
| **EQ3BandPlugin (ph_)** | `midFreq` | `1000` ✓ | ✓ | Matches rule. |
| **EQ3BandPlugin (ph_)** | `highFreq` | `8000` | `8000` ✓ | Rule says 12k but 8k is acceptable for highshelf. *(no change — judgment call)* |
| **GraphicEQPlugin (ph_)** | `b63..b16k` | `0` all ✓ | ✓ | All bands 0 dB. ✓ Already neutral. |
| **GraphicEQ4BandPlugin (ph_)** | `band0..3, outputGain` | `0` all ✓ | ✓ | ✓ Already neutral. |
| **GraphicEQ5BandPlugin (ph_)** | `band0..4, outputGain` | `0` all ✓ | ✓ | ✓ Already neutral. |
| **GraphicEQ6BandPlugin (ph_)** | `band0..5, outputGain` | `0` all ✓ | ✓ | ✓ Already neutral. |
| **LinearPhaseEQPlugin (ph_)** | `lowGain/midGain/highGain` | `0` all ✓ | ✓ | ✓ Already neutral. |
| **LinearPhaseEQPlugin (ph_)** | `lowFreq/midFreq/highFreq` | `100/1000/8000` | ✓ | Sensible, matches rule. |
| **MasteringEQPlugin (ph_)** | `sub/low/lowMid/highMid/high/air` | `0` all ✓ | ✓ | ✓ Already neutral. |
| **NotchEQPlugin (ph_)** | `freq` | `1000` | `60` | Notch on insert — sensible default is 60 Hz mains hum (per spec edge case). User can sweep. (`registry.js:1033`) |
| **NotchEQPlugin (ph_)** | `gain` | `-12` | `0` | Active -12 dB notch on insert is audible. Should be 0 dB so notch is transparent until user dials in cut. (`registry.js:1035`) |
| **NotchEQPlugin (ph_)** | `q` | `10` | `10` ✓ | Sharp notch is fine — gain=0 makes it inaudible anyway. |
| **PresenceEQPlugin (ph_)** | `presence/air` | `0/0` ✓ | ✓ | ✓ Already neutral. |
| **PresenceEQPlugin (ph_)** | `freq` | `3000` | `3000` ✓ | Sensible upper-mid pivot. ✓ |
| **PresenceEQPlugin (ph_)** | `q` | `0.7` ✓ | ✓ | Matches rule. |
| **SPXPerceptualEQPlugin (ph_)** | `recover/order` | `0.5/0.5` | `0/0` | Auto-EQ that rides 16 bands — at 0.5/0.5 it actively applies corrections on insert. Should default to inactive (0/0) so plugin is transparent until user opens it. (`registry.js:1848-1849`, `SPXPerceptualEQPlugin.js:37-38`) |
| **SPXPerceptualEQPlugin (ph_)** | `boost/cut` | `6/-6` | `6/-6` keep | Range caps; only matter when recover/order > 0. *(no change once recover=order=0)* |
| **StepFilterPlugin (ph_)** | `mix` | `100` | `0` | Rhythmic filter sequencer — should be silent on insert. (`registry.js:1473`) |
| **StepFilterPlugin (ph_)** | `depth` | `0.8` | `0` | Alternative — flatten the rhythmic sweep. |
| **VowelFilterPlugin (ph_)** | `mix` | `100` | `0` | Active vowel formant on insert is heavy coloration. (`registry.js:1762`, `VowelFilterPlugin.js`) |
| **VowelFilterPlugin (ph_)** | `morph` | `0.5` | `0` | If keeping mix=100, set morph=0 (single vowel, no blend). Either path. |
| **WahWahPlugin (ph_)** | `mix` | `100` | `0` | Active autowah sweep on insert. (`registry.js:1778`) |
| **WahWahPlugin (ph_)** | `auto` | `0` ✓ | ✓ | Already off (manual freq mode). |
| **PhonePlugin (ph_)** | `mix` | `100` | `0` | Lo-fi telephonic bandpass — heavy coloration. Should be inert on insert. (`registry.js:1153`, `PhonePlugin.js:25`) |
| **PhonePlugin (ph_)** | `drive` | `0.3` | `0` | Combined with mix=0 unnecessary; if mix kept 100 propose drive=0. |

---

## ✓ Already neutral (no changes needed)

| Plugin | Notes |
|---|---|
| **ironBand (SPX)** | All gains 0 dB, hpf=0 (factory clamps to 20 Hz internally), lpf=20000, inputGain=0 dB. Topology pre-built at neutral pass-through (per `makeIronBand` comment line 1411). ✓ |
| **spectraCurve (SPX)** | All 6 bands gain=0 dB, sensible freqs (80/250/1k/4k/12k/18k), q=1 mostly, q=0.7 on lowpass. ✓ |
| **pultecForge (SPX)** | All boosts/attenuations 0 dB → curves inactive. ✓ |
| **graphicEQ (SPX)** | `ISO_GRAPHIC_BANDS` reduces 31 bands all to 0 dB; preAmp=0. ✓ |
| **tiltEQ (SPX)** | tilt=0, air=0, presence=0, outputGain=0 → no spectral tilt. Frequencies sensible. ✓ |
| **baxandallEQ (SPX)** | bass=0, treble=0, mid=0, outputGain=0, monoBelow=0. ✓ |
| **midSideEQ (SPX)** | All 8 mid/side band gains 0 dB. ✓ Phase C2.1 already correct. |
| **matchEQ (SPX)** | Phase C1 — `low: 0, high: 0`. ✓ |
| **lowEndFocus (SPX)** | Phase C1 — `sub: 3, kick: 2`. **Note:** these are non-zero defaults but C1 spec confirmed neutrality. *(judgment call — see below)* |
| **spectralRecovery (SPX)** | Phase C1 — `amount: 4, presence: 2`. *(judgment call — see below)* |
| **AirEQPlugin (ph_)** | `air=0, presence=0` → no boost. ✓ (mix=100 is fine because gains are 0) |
| **DCFilterPlugin (ph_)** | DC blocker at 5 Hz HPF — transparent for audio. ✓ |
| **EQ3BandPlugin (ph_)** | All gains 0 dB, sensible freqs. ✓ |
| **GraphicEQ/4Band/5Band/6Band (ph_)** | All bands 0 dB. ✓ |
| **LinearPhaseEQPlugin (ph_)** | All gains 0 dB, sensible freqs. ✓ |
| **MasteringEQPlugin (ph_)** | All 6 band gains 0 dB. ✓ |
| **PresenceEQPlugin (ph_)** | presence=0, air=0 dB. ✓ |

---

## Judgment-call (no change recommended)

| Plugin / Param | Reasoning |
|---|---|
| **lowEndFocus** `sub: 3, kick: 2` | Phase C1 confirmed these as non-destructive design defaults — sub-shelf adds gentle warmth, kick boost is mild. Audible but intentional product character. Recommend keeping unless a "true neutral" preset is added separately. |
| **spectralRecovery** `amount: 4, presence: 2` | Same as above — Phase C1 confirmed. The plugin's purpose is exciter-like restoration; 0 defaults would defeat the value-prop. Keep. |
| **dynamicEQ (SPX)** `bands[0].type: "highpass"` with `bands[0].q: 1` | Q=1 on a static HPF gives a slight peak at cutoff. Rule says 0.7 for Butterworth. But since `freq: 80` is well below program material and gain=0 dB on the band, this is effectively inaudible. Keep — flagged for future consideration. |
| **pultecForge** `highBW: 0.5` | Pultec mid-bandwidth knob — irrelevant when boost=0/atten=0. Keep. |
| **NotchEQPlugin** `freq: 1000` → `60` proposal | This is a true judgment call. 60 Hz is more "useful default insert" but 1000 Hz is more "blank canvas." Either is defensible; I lean toward 60 Hz per the spec edge case but acknowledge the alternative. |
| **VowelFilterPlugin** `mix=0` vs `morph=0` | Either neutralizes. `mix=0` is more correct per insert-transparency rule; `morph=0` keeps a single vowel formant active (still colors the signal). Recommend `mix=0`. |
| **ph_ EQ3Band** `highFreq: 8000` (rule says ~12k) | 8 kHz highshelf is a perfectly sensible musical choice and matches many DAW defaults. Don't change. |

---

## Counts

- **Plugins audited:** 25 (12 SPX EQ + 18 ph_ EQ/filter; some overlap on tiltEQ/airEQ/dynamicEQ both sides — counted distinct factories)
- **Already neutral:** 17 plugins / params groups
- **Proposed changes:** ~14 plugins, ~22 params
- **Judgment-call (no change):** 6 items
- **Highest-priority fixes (P0 — active processing on insert):**
  1. `dynamicEQ` — set both `bands[0].dynamic` and `bands[3].dynamic` to `false`
  2. `autoWah` (SPX) — `mix: 0`
  3. `formantFilter` (SPX) — `mix: 0`
  4. `noiseReduction` — `reduction: 0`
  5. `AutoFilterPlugin` (ph_) — `mix: 0` or `depth: 0`
  6. `CombFilterPlugin` (ph_) — `mix: 0`
  7. `EnvelopeFilterPlugin` (ph_) — `mix: 0`
  8. `NotchEQPlugin` (ph_) — `gain: 0` (and freq → 60)
  9. `SPXPerceptualEQPlugin` (ph_) — `recover: 0, order: 0`
  10. `StepFilterPlugin` (ph_) — `mix: 0`
  11. `VowelFilterPlugin` (ph_) — `mix: 0`
  12. `WahWahPlugin` (ph_) — `mix: 0`
  13. `PhonePlugin` (ph_) — `mix: 0`

These are the items where the plugin actively processes/colors signal at default — fixing them is the load-bearing portion of D1.3.
