# D2.3 Bug Application Progress

## CRITICAL

| ID | Severity | Bug | Status | Files |
|----|----------|-----|--------|-------|
| 1  | CRITICAL | stereoForge width 100× gain | FIXED | RecordingStudio.js (~line 3016) |
| 2  | CRITICAL | fuzz factory ignores drive/bias/mix/outputGain | FIXED | FuzzPlugin.js (full rewrite) |
| 3  | CRITICAL | dehummer always-notches | FIXED | RecordingStudio.js (~line 4210) |
| 4  | CRITICAL | MonoMaker no freq-split | FIXED | MonoMakerPlugin.js (full rewrite, M/S-style topology) |
| 5  | CRITICAL | vocoderSPX no internal carrier | FIXED | RecordingStudio.js (~line 4677) — added internal sawtooth oscillator with carrierType/carrierFreq wiring |
| 6  | CRITICAL | delay filter vs filterCutoff mismatch | FIXED | DelayPlugin.js — read `filter` (registry canonical), keep filterCutoff for back-compat |
| 7  | CRITICAL | stereoBloom mix vs width wiring | FIXED | RecordingStudio.js (~line 3413) — drop dead panner, wire mix correctly |

## HIGH

| ID | Severity | Bug | Status | Files |
|----|----------|-----|--------|-------|
| 8  | HIGH | AIVocalClean denoise=0 still compresses | FIXED | AIVocalCleanPlugin.js — denoiseToRatio: 1..6 (1 = no compression) |
| 18 | HIGH | StereoEnhancer width fallback semantic | FIXED | StereoEnhancerPlugin.js — UI scale 0..200 → 0..2 linear via /100 |
| 19 | HIGH | TransientDesigner dB vs linear | FIXED | TransientDesignerPlugin.js — full rewrite, dbToLin conversion |
| 22 | HIGH | bass_enhancer drive not wired | FIXED | BassEnhancerPlugin.js — added tanh WaveShaper in chain |
| 23 | HIGH | dust_scratch single-source noise | FIXED | DustScratchPlugin.js — separate buffers/sources for dust and crackle |
| 24 | HIGH | vocalSaturator cosmetic warmth/air/mix | FIXED | RecordingStudio.js (~line 1924) — added lowshelf/highshelf/dry-wet/output gain wiring |
| 25 | HIGH | loFiCrusher cosmetic noise/wobble | FIXED | RecordingStudio.js (~line 1898) — added noise BufferSource + LFO modulating lp.frequency |
| 26 | HIGH | voiceForge/Harmonizer voice CPU at vol=0 | FIXED | RecordingStudio.js voiceForge factory + HarmonizerPlugin.js — disconnect ps→g when vol=0 |

## D2.3 Summary
- CRITICAL fixed: 7/7
- HIGH fixed: 8/8
- Partial: none
- Skipped: none
- Files touched:
  - src/front/js/pages/RecordingStudio.js (5 edits: stereoForge, dehummer, stereoBloom, vocoderSPX carrier, vocalSaturator, loFiCrusher, voiceForge)
  - src/front/js/component/audio/plugins/plugins/FuzzPlugin.js (full rewrite)
  - src/front/js/component/audio/plugins/plugins/MonoMakerPlugin.js (full rewrite)
  - src/front/js/component/audio/plugins/plugins/DelayPlugin.js (param rename)
  - src/front/js/component/audio/plugins/plugins/AIVocalCleanPlugin.js (ratio fn)
  - src/front/js/component/audio/plugins/plugins/StereoEnhancerPlugin.js (full rewrite for width scale)
  - src/front/js/component/audio/plugins/plugins/TransientDesignerPlugin.js (full rewrite, dbToLin)
  - src/front/js/component/audio/plugins/plugins/BassEnhancerPlugin.js (added drive WaveShaper)
  - src/front/js/component/audio/plugins/plugins/DustScratchPlugin.js (full rewrite, dual sources)
  - src/front/js/component/audio/plugins/plugins/HarmonizerPlugin.js (CPU optimization)
