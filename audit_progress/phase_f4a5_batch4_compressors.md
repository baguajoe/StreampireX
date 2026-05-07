# Phase F4-A.5 — Batch 4 Compressors DSP

Branch: `claude/fix-recording-studio`

Scope: 5 compressor factories — tubeComp (new), warmPress (rewire mode + mix),
vocalComp (new), multiPress (no DSP change), parallelCrush (no DSP change).

UI is out of scope (lands in F4-A.7). All work lives in
`src/front/js/pages/RecordingStudio.js` SPX section.

---

## tubeComp — DONE
- File: src/front/js/pages/RecordingStudio.js:2439-2495 (inserted between parallelCrush and multiPress)
- Engine: DynComp(softKnee=12, slow attack/release) → tube WaveShaper (asymmetric tanh: tanh(xk) + 0.1*tanh(xk^2)*sign(x), oversample 4x — adds 2nd harmonic for tube color, distinct from FET 3rd-harmonic curve in fetStrike) → 200 Hz lowshelf (warmth knob 0..1 mapped to 0..6 dB) → makeup gain (dB)
- Knobs wired: threshold, ratio, attack (ms→s), release (ms→s), drive (rebuilds curve), warmth (lowshelf gain dB), makeup (dB→linear), stereoLink (no-op — documented in inline comment, Web Audio DynComp is already linked)
- Notes: stereoLink toggle is informational; ported from PluginHost/TubeCompPlugin.js with even-harmonic asymmetric tanh per spec.
- Build status: clean (compiled with 9 warnings)

## warmPress — DONE
- File: src/front/js/pages/RecordingStudio.js:2145-2261 (rewrite of existing factory)
- Engine: parallel dry/wet (inNode → dry path → outNode; inNode → comp → ws → makeup → wet path → outNode). Added `setMode(modeName)` helper that updates DynComp knee/attack/release + WaveShaper curve.
  - optical: knee=12, attack=20 ms, release=300 ms, soft tanh sat (k=1.3)
  - vca:     knee=2,  attack=1 ms,  release=80 ms,  identity curve (no sat)
  - vari-mu: knee=15, attack=30 ms, release=400 ms, asymmetric tanh (even harmonics, like tubeComp)
- Knobs wired: threshold, ratio, attack (ms→s), release (ms→s), knee, makeup/makeupGain (dB→linear), model (calls setMode), mix (dry/wet crossfade 0..100→0..1)
- Notes: PLUGIN_DEFAULTS already has `mix: 100` and `model: "optical"`; left untouched per spec. `setMode` is called once at init; if user-provided attack/release params are present at init they re-apply after the preset to honor explicit values.
- Build status: clean (compiled with 9 warnings)

## vocalComp — DONE
- File: src/front/js/pages/RecordingStudio.js:2597-2682 (inserted between tubeComp and multiPress)
- Engine: parallel dry/wet around: tiltHpf (HPF 80 Hz, Q=0.707) → airShelf (highshelf 12 kHz, gain = air*8 dB) → deEss (peaking 7 kHz, Q=3, gain = -deEss*8 dB) → mainComp (DynComp, knee=6) → presence (peaking 3 kHz, Q=1, gain = presence*6 dB)
- Knobs wired: threshold, ratio, attack (ms→s), release (ms→s), deEss (notch depth), presence (3 kHz boost), air (12 kHz shelf), mix (dry/wet 0..100→0..1) — all 8 PLUGIN_DEFAULTS keys.
- Notes: De-esser is the documented FALLBACK — Web Audio's DynamicsCompressorNode has no sidechain input, so frequency-selective de-essing was implemented as a static peaking notch at 7 kHz whose depth tracks the deEss knob. Program-dependent de-essing would require an AudioWorklet, out of scope for this batch. Inline comment in factory documents this clearly.
- Build status: clean (compiled with 9 warnings)

## multiPress — DONE
- File: src/front/js/pages/RecordingStudio.js:2683+ (no changes; pre-existing factory at original location prior to insertions)
- DSP unchanged per spec — already differentiated as 4-band multiband (4× DynComp + LR-style cascaded crossovers + 4× makeup gain). UI rebuild in F4-A.7.
- Build status: clean (compiled with 9 warnings) — verified via cumulative builds above.

## parallelCrush — DONE
- File: src/front/js/pages/RecordingStudio.js:2376-2438 (no changes)
- DSP unchanged per spec — already differentiated as parallel-routed comp + crush WaveShaper (asymmetric tanh+clip) with dry/wet crossfade and per-path dB trims. UI rebuild in F4-A.7.
- Build status: clean (compiled with 9 warnings) — verified via cumulative builds above.

---

## Summary
- 5/5 plugins handled. 2 new factories (tubeComp, vocalComp), 1 rewritten (warmPress mode + mix), 2 documented no-op (multiPress, parallelCrush).
- Final webpack build: `webpack 5.99.9 compiled with 9 warnings`.
- Did not touch: reverbs (RS:3200+), basic compressor (RS:1495), Batch 3 work (compressor leave / fetStrike / optoPress / glueBus), any UI, DEFAULT_EFFECTS in trackFactory.js, PLUGIN_DEFAULTS values.
- No commit/push made.
