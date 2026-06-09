# Phase C5 — Plugin Rebuilds (MasterWall, SpectralGate, GatedReverb)

Final phase. All three plugins rebuilt from previous "fake / approximate"
implementations to production-leaning approaches.

## MasterWall — `src/front/js/pages/RecordingStudio.js` (factory ~L2435)
- Implemented inline `spx-masterwall-limiter` AudioWorklet.
- 5 ms (max 10 ms) sample-accurate lookahead via per-channel ring buffers;
  forward-scans peak buffer to derive needed gain BEFORE the peak hits.
- 2× linear-interpolation oversampling for inter-sample (true) peak detect
  when `truePeak` enabled.
- Hard ceiling at `ceiling + clipMargin` (samples never exceed this).
- AudioParams: `ceiling`, `threshold`, `release`, `lookahead`, `clipMargin`,
  `outputGain`, `truePeak`. `dither` accepted as no-op (noise-shaped dither
  not implemented — flagged in code comment).
- Fallback: original C2.4 DelayNode + DynamicsCompressor topology kicks in
  if worklet load/instantiation fails. Worklet swap is click-free (input
  disconnect is bridged by the new node connect immediately).
- Tag: **ACCEPTABLE** — 2× oversampling (not 4×/8×), no noise-shaped dither.

## SpectralGate — `src/front/js/component/audio/plugins/plugins/SpectralGatePlugin.js`
- Full STFT-based spectral gating worklet (`spx-spectral-gate`).
- 1024-point hand-rolled radix-2 Cooley–Tukey FFT/IFFT with bit-reversal
  table and pre-computed twiddles.
- 50% overlap (hop=512) with double-Hann (analysis + synthesis) windowing
  for COLA reconstruction.
- Per-bin gate: bins below threshold (linear) drive a per-bin gain that
  smooths via attack/release coefficients computed per hop.
- AudioParams: `threshold`, `attack`, `release`, `mix`.
- Latency: ~N samples (~21 ms @ 48 kHz). When `mix < 1`, dry path is
  zero-latency so a slight pre-echo is possible — recommend mix=1.
- Fallback: original DynamicsCompressor-based gate (the C2 behavior) if
  worklet load fails.
- Tag: **ACCEPTABLE** — JS FFT inside a worklet is real DSP; "musical noise"
  artifacts inherent to spectral gating remain (mitigated by smoothing).

## GatedReverb — `src/front/js/component/audio/plugins/plugins/GatedReverbPlugin.js`
- Replaced static gated-IR convolution with a true envelope-controlled gate.
- Topology: input → dry path; input → preDelay → convolver(long Hall IR) →
  wetTrim → gateGain → output. Envelope tap on dry input via AnalyserNode.
- RAF-driven RMS poll (~30 Hz) drives `gateGain` with `setTargetAtTime`
  using attack/release tau values — actual ramps run sample-accurate inside
  the audio graph between polls.
- Gate hold semantics: stays open while RMS > threshold; closes only after
  input has been below threshold for `gateTime` ms.
- IR rebuild debounced (80 ms) on `decay` knob to avoid clicks.
- Knobs: `decay`, `gateTime`, `preDelay`, `mix`, `threshold`, `attack`,
  `release` (5 of which are NEW vs the C2 implementation).
- No worklet — standard Web Audio nodes only.
- Tag: **CLEAN** — algorithm is correct and audible. RAF poll rate is
  acceptable for envelope-following at the time scales humans perceive.

## C5 Summary
- CLEAN: 1 (GatedReverb)
- ACCEPTABLE: 2 (MasterWall, SpectralGate)
- APPROXIMATE: 0
- HIDE-FOR-V2: 0
- Files touched:
  - `src/front/js/pages/RecordingStudio.js` (1 edit, MasterWall factory)
  - `src/front/js/component/audio/plugins/plugins/SpectralGatePlugin.js` (full rewrite)
  - `src/front/js/component/audio/plugins/plugins/GatedReverbPlugin.js` (factory rewrite, TapeDelay/PingPong/etc untouched)
- New worklets:
  - `spx-masterwall-limiter` (inline in RecordingStudio.js MasterWall factory)
  - `spx-spectral-gate` (inline in SpectralGatePlugin.js)
- Recommend hiding from picker: none
