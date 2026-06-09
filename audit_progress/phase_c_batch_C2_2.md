# Phase C Batch C2.2 — DSP rebuild progress

## 1. StereoWidener (ph_*) — DONE
- File: src/front/js/component/audio/plugins/plugins/StereoWidenerPlugin.js
- Topology: M/S encode (splitter → midSum + (L-R)/2 sideSum) → side HPF (monoBelow) → side gain (width) → M/S decode (M+S to L, M-S to R) → merger.
- setParam: width (0..200% → 0..2 sideGain), monoBelow (20..300 Hz HPF on side path).
- destroy(): disconnects 12 nodes.
- Registry params (`width`, `monoBelow`) all bound.

## 2. MidSideProcessor (ph_*) — DONE
- File: src/front/js/component/audio/plugins/plugins/MidSideProcessorPlugin.js
- Topology: full M/S split → independent midGain + sideGain (dB→linear) → M/S decode.
- setParam: midGain dB, sideGain dB, encode (informational no-op).
- destroy(): disconnects 12 nodes.
- Registry params (`encode`, `midGain`, `sideGain`) all bound.

## 3. formantFilter (SPX) — DONE
- File: src/front/js/pages/RecordingStudio.js (formantFilter case)
- Added: autoWah LFO (sine osc) modulating each formant filter's frequency
  via 3 parallel gain nodes (depths scaled to 30/40/50% of each filter's
  morphed center). Wet/dry mix paths (input → wet chain + dry → og).
- New setParam cases: autoWah (bool), wahRate (Hz), wahDepth (0..1), mix (0..100 %).
- Existing cases preserved: vowelA, vowelB, morph, q, outputGain.
- dispose: stopOscs(lfo) + disposeNodes(inGain, f1, f2, f3, lfoG1..3, wet, dry, og).

## 4. subOctaver (SPX) — DONE
- File: src/front/js/pages/RecordingStudio.js (subOctaver case)
- Topology: dry path + oct1 (preLP → |x| WaveShaper → LPF → gain) + oct2
  (cascade |x| WaveShaper → LPF → gain). |x| rectifier halves perceived freq.
- setParam: oct1Level, oct2Level, dryLevel, filter (0..1 → 60..600 Hz LPF cutoff),
  trackSpeed (0..1 → smoothing TAU 0.05..0.005s), legacy `mix`.
- dispose: disposeNodes(inGain, preLP, oct1WS, oct1LP, oct1Gain, oct2WS, oct2LP, oct2Gain, dryGain, out).

## 5. drumEnhancer (SPX) — DONE
- File: src/front/js/pages/RecordingStudio.js (drumEnhancer case)
- Topology: c (compressor) → sub (lowshelf @60Hz) → lo (peak @80Hz) → hi (peak @6kHz) → air (highshelf @10kHz) → og.
- New setParam cases: glue (compressor threshold mapping), sub (0..1 → 0..9 dB lowshelf), air (0..1 → 0..6 dB highshelf), outputGain (0..4 linear).
- Existing cases preserved: punch, snap.
- dispose: disposeNodes(c, sub, lo, hi, air, og).

## C2.2 Summary
- Fixed: 5/5
- Partial: 0
- Skipped (Phase C3/C5): 0
- Files touched:
  - src/front/js/component/audio/plugins/plugins/StereoWidenerPlugin.js (1 rewrite)
  - src/front/js/component/audio/plugins/plugins/MidSideProcessorPlugin.js (1 rewrite)
  - src/front/js/pages/RecordingStudio.js (3 case-block edits: formantFilter, subOctaver, drumEnhancer)
- Registry params adjusted: none (factories now match registry-declared params).
