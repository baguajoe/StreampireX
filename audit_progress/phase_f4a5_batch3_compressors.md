# Phase F4-A.5 Batch 3 — Compressor DSP Refinements

Scope: 4 compressor factories in `src/front/js/pages/RecordingStudio.js`.
Branch: `claude/fix-recording-studio`.

---

## compressor (basic) — DONE
- File: src/front/js/pages/RecordingStudio.js:1495-1510
- Changes: DSP unchanged per spec; transparent VCA reference.
- Knobs wired: threshold, ratio, attack, release (existing).
- Notes: Per spec — leave as-is. Acts as the transparent VCA reference benchmark.
- Build status: not built individually.

---

## fetStrike — DONE
- File: src/front/js/pages/RecordingStudio.js:2186-2247
- Changes: Added FET WaveShaper after DynComp using PluginHost's `((π+2)x) / (π + k|x|)` formula with `k = 1 + drive*4`. Curve N=2048, oversample 2x. Hard knee preserved (knee=2).
- Topology: in → DynComp(knee:2) → WaveShaper(FET curve) → makeup gain → out
- Knobs wired: threshold, ratio, attack, release, makeup, saturation (rebuilds curve), allButtonRatio (locks ratio to 20 + boosts saturation by +0.3 clamped to 1.0)
- Notes:
  - Uses module-scoped `safe()` helper for drive clamp.
  - allButtonRatio "all-buttons-in" mode: while engaged, ratio knob is ignored (locked at 20); on disengage, ratio knob input takes effect at next setParam("ratio"). Saturation curve recomputes immediately on toggle.
  - Saturation state (`satState`) tracked inside closure so allButton toggles can rebuild the effective curve.
- Build status: clean (compiled with 9 warnings — size warnings only).

---

## optoPress — DONE
- File: src/front/js/pages/RecordingStudio.js:2246-2342
- Changes:
  (a) Added program-dependent release via `AnalyserNode` (fftSize=256) polled at ~30 Hz (33 ms setInterval). Computes RMS of `getByteTimeDomainData`, smooths with EMA (α=0.15), maps `envEMA` to release time in [150 ms, 600 ms]. Tracker tapped off post-comp output (`c.connect(an)`).
  (b) Added transformer pre-saturation `WaveShaper` BEFORE the DynComp using `Math.tanh(x * 1.2)` — N=1024, oversample 2x.
  (c) Existing post `tubeSaturation` curve preserved in `ws`.
- Topology: hf → xfmr (tanh*1.2 pre) → DynComp(soft knee=15) → ws (tube post) → mk (gainControl) → og (outputGain)
- Knobs wired: peakReduction, threshold, ratio, attack, release (base value; tracker overrides), hfEmphasis, tubeSaturation, gainControl, outputGain (existing — no new knobs added per spec)
- Notes:
  - Implemented the FULL program-dependent release path (chose option A from spec, not the fallback).
  - `setParam("release", ...)` defines a *base* but the 30 Hz tracker will overwrite within ~33 ms; this is intentional — the knob is treated as a hint, not a fixed value, for VOX color realism.
  - Setinterval guarded with try/catch for headless/test environments; release tracker quietly no-ops on failure.
  - `dispose()` clears the interval and disposes the analyser plus all DSP nodes.
- Build status: clean (compiled with 9 warnings — size warnings only).

---

## glueBus — DONE
- File: src/front/js/pages/RecordingStudio.js:2167-2223
- Changes:
  (a) Added 1 ms lookahead `DelayNode` (`delayTime = 0.001`, capacity 0.005 s) before the DynComp so transient detection is slightly anticipated → softer slew limiting on attack.
  (b) Added always-on `BiquadFilterNode` peaking at 12 kHz, Q=1, +0.5 dB after the comp ("air" lift).
  (c) Wired `autoGain`: when true, makeup gain = `baseMakeupDb + (-threshold/10) * 0.5` dB. So at threshold = -10 dB you get +0.5 dB auto, at -20 dB you get +1.0 dB, etc. Recomputed on threshold or makeup changes and on autoGain toggle.
- Topology: in → DelayNode(1 ms) → DynComp(knee:6) → BiquadFilter(peaking 12 kHz, Q=1, +0.5 dB) → makeup gain → out
- Knobs wired: threshold (also recomputes makeup if autoGain), ratio, attack, release, makeup/makeupGain (sets baseMakeupDb), autoGain (toggles auto offset), sidechainHPF (NOT wired — would require sidechain routing not modeled; PLUGIN_DEFAULTS still ships it, ignored at the DSP layer)
- Notes:
  - autoGain default = true (matches PLUGIN_DEFAULTS).
  - lastThresh and baseMakeupDb tracked in closure so any of {threshold, makeup, autoGain} changes can trigger a coherent makeup recompute.
  - mix knob is in PLUGIN_DEFAULTS but is intended for the wet/dry crossfade typically applied at the bus level — left unwired here so the factory remains a pure inline DSP block (matches existing factory contract).
- Build status: clean (compiled with 9 warnings — size warnings only).

---

## Summary
- 4 of 4 compressor factories handled (1 left as-is per spec, 3 refined).
- Final build: `npx webpack --config webpack.prod.js` — webpack 5.99.9 compiled with 9 warnings in ~181 s. Warnings are entrypoint size only (bundle 10.7 MiB, recommended 244 KiB) — pre-existing.
- No commits, no UI changes, no touches above line 1488 or below line 2342 (reverb section untouched).
