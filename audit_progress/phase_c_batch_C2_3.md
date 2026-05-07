# Phase C2 Batch 3 Progress

Plugins: transGate, parallelCrush, Overdrive, tapeStop, pitchRandomizer

## Overdrive (ph_*) — DONE
- File: src/front/js/component/audio/plugins/plugins/OverdrivePlugin.js (Write, full rewrite).
- Topology: in → preGain (1 + drive*2) → WaveShaper (tanh, k = 1 + drive*20) → toneLPF → postGain (level) → wetGain → output, with parallel dry path through dryGain.
- Fix: prior factory wrote `tone` (Hz unit per registry) into a peaking-EQ gain dB param — Hz→dB unit catastrophe. Replaced with proper LPF cutoff. drive curve rebuilt on change. Added mix knob + dry path. dispose() disconnects every node.
- Registry: existing entry already declares correct units (drive 0..1, tone 200..8000 Hz, level 0..1, mix 0..100). No edit needed.

## parallelCrush — DONE
- File: src/front/js/pages/RecordingStudio.js (~line 2200).
- Topology: in → comp (heavy) → WaveShaper (tanh + asymmetric clip, k = 1 + crush*30) → wetTrim → wetGain → out; in → dryTrim → dryGain → out. mix (0..100 %) crossfades.
- Fix: prior factory was serial-only (in → comp → mixGain) with no dry path and ignored crush, attack, release, wetGain, dryGain knobs. All 8 UI knobs now wired.
- Files touched: RecordingStudio.js (1 edit).

## transGate — PARTIAL (downward gate w/ sidechain filters)
- File: src/front/js/pages/RecordingStudio.js (~line 2360).
- Topology: in → lookaheadDelay (0..10 ms) → scHPF → scLPF → comp (ratio 20, threshold-driven) → out.
- Fix: prior factory ignored hold, range, hysteresis, scHPF, scLPF, lookahead, flip. Now wired: hysteresis → comp.knee, hold + release combined into comp.release, scHPF/scLPF as filters in main path (sidechain approximation), lookahead → DelayNode.
- LIMITATIONS (Phase C5 candidate): true sidechain (separate detector path) needs AudioWorklet. range (floor attenuation) is a no-op — DynamicsCompressor cannot implement gate floor without worklet. flip (ducker / inverted gate) flagged as no-op.
- Files touched: RecordingStudio.js (1 edit).

## pitchRandomizer — DONE
- File: src/front/js/pages/RecordingStudio.js (~line 3232 originally; now ~3290).
- Topology: in → delay (centered ~10 ms) → wetGain → out; in → dryGain → out. LFO sine → smoothLPF → lfoGain (depth) → delay.delayTime.
- Fix: prior factory was a single static random allpass — ignored ALL UI knobs. Now: amount (cents 0..100) → delay-mod depth (~2 ms max), rate → LFO frequency, smooth → LPF on LFO output (0.5..30 Hz), mix → dry/wet crossfade. Cap depth keeps pitch wobble musical.
- Files touched: RecordingStudio.js (1 edit).

## tapeStop — DONE
- File: src/front/js/pages/RecordingStudio.js (~line 3393 originally; now ~3450).
- Topology: in → delay (max 1 s) → lp (darken) → trim (gain to silence) → out.
- Fix: prior factory was static dim+darken (no pitch sweep, ignored all knobs). Now: active toggle triggers delayTime ramp 0→0.5 s + LPF sweep 18 k→200 Hz + gain to silence over stopTime. active=false triggers reverse over startTime. curve > 0.5 → exponentialRamp (more "draggy"), else linear.
- LIMITATIONS: Web Audio approximation — true tape-stop pitch tracking needs an AudioWorklet (Phase C5 if exact pitch-feel required). Current implementation is the canonical pseudo-tape-stop using DelayNode automation.
- Files touched: RecordingStudio.js (1 edit).

## C2.3 Summary
- Fixed: 4/5 (Overdrive, parallelCrush, pitchRandomizer, tapeStop)
- Partial: 1 (transGate — sidechain/range/flip approximated; full quality needs AudioWorklet, Phase C5 candidate)
- Skipped: 0
- Files touched: OverdrivePlugin.js (1 Write), RecordingStudio.js (4 Edits)
- Registry params adjusted: none (Overdrive registry already correct)
