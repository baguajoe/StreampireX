# Phase D2.1.C — Apply: EQs + Filters

## Progress

### SPX PLUGIN_DEFAULTS (SPXPlugins.js)
- [x] dynamicEQ bands[0].dynamic: true → false
- [x] dynamicEQ bands[3].dynamic: true → false
- [x] autoWah mix: 1.0 → 0
- [x] formantFilter mix: 100 → 0
- [x] noiseReduction reduction: 0.6 → 0

### SPX factory `??` defaults (RecordingStudio.js)
- [x] formantFilter initMix: ?? 100 → ?? 0
- [x] noiseReduction reduction default in install body: 0.6 → 0
- [x] noiseReduction setParam fallback: 0.6 → 0

### registry.js (~10 plugins)
- [x] auto_filter: depth 0.5 → 0, mix 100 → 0
- [x] comb_filter: mix 50 → 0
- [x] dynamic_e_q: threshold -18 → -20
- [x] envelope_filter: depth 0.8 → 0, mix 100 → 0
- [x] notch_e_q: freq 1000 → 60, gain -12 → 0
- [x] phone: mix 100 → 0, drive 0.3 → 0
- [x] step_filter: depth 0.8 → 0, mix 100 → 0
- [x] vowel_filter: mix 100 → 0
- [x] wah_wah: mix 100 → 0
- [x] spx_perceptual_eq: recover 0.5 → 0, order 0.5 → 0

### ph_* factory `??` defaults
- [x] AutoFilterPlugin.js — depth fallback 0.5 → 0; mix fallback 100 → 0 (init + setParam)
- [x] CombFilterPlugin.js — mix fallback 50 → 0
- [x] DynamicEQPlugin.js — threshold fallback -18 → -20
- [x] DynamicEQPlugin.js (createNotchEQPlugin in same file) — freq fallback 1000 → 60
- [x] NotchEQPlugin.js — freq fallback 1000 → 60
- [x] EnvelopeFilterPlugin.js — depth fallback 0.8 → 0; mix fallback 100 → 0
- [x] PhonePlugin.js — mix fallback 100 → 0; drive fallback 0.3 → 0
- [x] SPXPerceptualEQPlugin.js — recover/order fallbacks 0.5 → 0

### Skipped (no factory `??` to change; registry covered)
- StepFilterPlugin.js — no mix/depth in factory body (factory bodies reserved for D2.3)
- VowelFilterPlugin.js — no mix in factory body
- WahWahPlugin.js — no mix in factory body

## D2.1.C Summary
- Plugins touched: 14
- Param defaults changed: 22
- Cross-source reconciliations: 10 (registry default + ph_ factory `??` reconciled for AutoFilter, CombFilter, DynamicEQ, NotchEQ, EnvelopeFilter, Phone, SPXPerceptualEQ; SPX PLUGIN_DEFAULTS + RecordingStudio factory `??` reconciled for formantFilter and noiseReduction; dynamicEQ SPX defaults internal-consistent)
- Files touched:
  - SPXPlugins.js (5 edits)
  - RecordingStudio.js (3 edits — formantFilter initMix, noiseReduction reduction init + setParam)
  - registry.js (10 edits)
  - AutoFilterPlugin.js (3 edits)
  - CombFilterPlugin.js (1 edit)
  - DynamicEQPlugin.js (2 edits — threshold + bundled NotchEQ freq)
  - NotchEQPlugin.js (1 edit)
  - EnvelopeFilterPlugin.js (1 edit)
  - PhonePlugin.js (1 edit)
  - SPXPerceptualEQPlugin.js (1 edit)
- Skipped (judgment-call): pultecForge highBW, EQ3Band highFreq, lowEndFocus sub/kick, spectralRecovery amount/presence, dynamicEQ SPX bands[0].q, NotchEQ q (per audit "judgment-call" section)
