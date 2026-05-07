# Phase B Batch B1.1 — UI↔factory param-name fixes

## Plugin progress log

### 1. ironCore — FIXED
- Files: `src/front/js/pages/RecordingStudio.js` (1 edit)
- UI keys: slewRate, coreSize, dcMag, resonance, outputGain
- Engine cases added: slewRate (alias of saturation, ws curve sat),
  coreSize (alias of punch, ws curve depth), dcMag (xfmr.gain, ×8 dB),
  resonance (xfmr.Q, mapped 0.5..4.5), outputGain (new GainNode `og`,
  dB→linear). Added `og` GainNode after xfmr; outputNode now `og`.

### 2. consoleSoul — FIXED
- Files: `src/front/js/pages/RecordingStudio.js` (1 edit)
- UI keys: crosstalk, noiseFloor, tolerance, channelColor, sumSaturation
- Engine cases added: channelColor (alias of color), sumSaturation
  (augments curve drive), crosstalk (alias of air → hi.gain). noiseFloor
  and tolerance accepted as no-ops (no noise/tolerance node).

### 3. harmonicExcite — FIXED
- Files: `src/front/js/pages/RecordingStudio.js` (1 edit)
- UI keys: freq, drive, even, odd, mix, airBoost
- Engine cases added: freq (alias of frequency), drive/even/odd (rebuild
  ws curve with even+odd harmonic ratios), mix (g.gain, %→0..1), airBoost
  (new high-shelf `air` at 10 kHz, dB direct). Added air biquad in chain.

### 4. optoPress — FIXED
- Files: `src/front/js/pages/RecordingStudio.js` (1 edit)
- UI keys: peakReduction, gainControl, hfEmphasis, tubeSaturation, outputGain
- Engine cases added: peakReduction (0..100% → c.threshold -60..0 dB),
  hfEmphasis (new high-shelf `hf` at 5 kHz pre-comp, scaled ×6 dB),
  tubeSaturation (new waveshaper `ws` post-comp), gainControl (new
  makeup `mk` GainNode, 0..40 dB), outputGain (new `og`, dB→linear).
  Topology: hf → c → ws → mk → og.

### 5. gainRider — FIXED
- Files: `src/front/js/pages/RecordingStudio.js` (1 edit)
- UI keys: targetLevel, speed, maxGain, minGain, lookahead, smooth, gateThresh
- Engine cases added: targetLevel (alias of target), speed (0..1 →
  c.attack 200..10 ms + c.release 1000..100 ms), smooth (0..1 →
  c.knee 0..30). maxGain/minGain/lookahead/gateThresh accepted as
  explicit no-ops (no available node).

### 6. sibilantCut — FIXED
- Files: `src/front/js/pages/RecordingStudio.js` (1 edit)
- UI keys: freq, bandwidth, threshold, ratio, attackSpeed, mode, listenSC
- Engine cases added: freq (alias of frequency), bandwidth (0..1 → ds.Q
  10..0.5), ratio (1..20 → static cut depth -1..-12 dB). threshold/
  attackSpeed/mode/listenSC accepted as explicit no-ops (true dynamic
  de-ess needs sidechain compressor tree — Phase C).

### 7. phantomDouble — FIXED
- Files: `src/front/js/pages/RecordingStudio.js` (1 edit)
- UI keys: delay, spread, pitchVarL, pitchVarR, modRate, modDepth, mix
- Engine cases added: delay (ms ÷ 1000 → d.delayTime s, primary fix —
  resolves UI `delay` ↔ engine `time` mismatch). `time` alias kept.
  spread/pitchVarL/pitchVarR/modRate/modDepth: explicit no-ops, Phase C
  candidates (need LFO + pitch-shift trees).

### 8. granularFreeze — FIXED (mainly COMPONENT_MAP + explicit no-ops)
- Files: `src/front/js/pages/RecordingStudio.js` (1 edit),
  `src/front/js/component/SPXPlugins.js` COMPONENT_MAP (1 edit)
- UI keys already wired: freeze, grainSize, density, mix, outputGain
- Added explicit no-op cases for: pitch, spread, position, randomize,
  attack, release (all Phase C — need granular-engine node tree).
- COMPONENT_MAP: added GranularFreezeUI.

### 9. noiseReduction — FIXED
- Files: `src/front/js/pages/RecordingStudio.js` (1 edit),
  `src/front/js/component/SPXPlugins.js` COMPONENT_MAP (1 edit)
- UI keys already wired: threshold, reduction, attack, release, outputGain
- Engine cases added: smoothing (0..1 → c.knee 0..30 dB).
- Explicit no-ops for: learn, learnDone (UI workflow flags),
  preserveTransients (needs detector — Phase C).
- COMPONENT_MAP: added NoiseReductionUI.

### 10. vocoderSPX — FIXED
- Files: `src/front/js/pages/RecordingStudio.js` (1 edit),
  `src/front/js/component/SPXPlugins.js` COMPONENT_MAP (1 edit)
- UI keys already wired: bands, carrierFreq, unvoiced, mix, outputGain
- Engine cases added: formantShift (semitones → multiplies all band
  freqs by 2^(s/12)). Added `applyFreqsWithFormant` to fold formant
  scale into freq application.
- Explicit no-ops for: carrierType, attack, release, breathiness, freeze
  (need oscillator carrier + envelope follower tree — Phase C).
- COMPONENT_MAP: added VocoderSPXUI.

## Phase C candidates (logged from skip-list)

- **sibilantCut.threshold/ratio (dynamic SC)** — needs sidechain compressor
  + dynamic-EQ band tree. Static notch only.
- **sibilantCut.mode (dynamic/broadband/split)** — needs band-split tree.
- **phantomDouble.spread / pitchVarL/R / modRate / modDepth** — needs LFO
  + pitch-shift node tree for true ADT.
- **granularFreeze.pitch / spread / position / randomize / attack / release**
  — needs full granular-engine (grain scheduler + pitch shifter + envelope).
- **vocoderSPX.carrierType / attack / release / breathiness / freeze** —
  needs internal oscillator carrier + per-band envelope follower.
- **gainRider.maxGain / minGain / lookahead / gateThresh** — needs envelope
  follower with explicit limit clamps + delay-line lookahead + gate.
- **noiseReduction.preserveTransients** — needs transient detector.
- **consoleSoul.noiseFloor / tolerance** — needs noise generator + per-
  channel variance.

## B1.1 Summary
- Fixed: 10/10
- Skipped (Phase C): 0 — every plugin received at least the UI↔factory
  alias fixes and added cases for available-node knobs. Knobs that need
  new audio node trees were added as explicit no-ops with Phase C tags.
- COMPONENT_MAP additions: VocoderSPXUI, GranularFreezeUI, NoiseReductionUI
- Files touched:
  - `src/front/js/pages/RecordingStudio.js` — 10 edits
  - `src/front/js/component/SPXPlugins.js` — 1 edit (COMPONENT_MAP)
