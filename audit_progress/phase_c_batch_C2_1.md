# Phase C Batch C2.1 — DSP rebuild (5 plugins, standard Web Audio nodes)

Branch: `claude/fix-recording-studio`
Plugins: multiPress, multibandLimiter, multibandSat, stereoImager, midSideEQ

## Per-plugin progress

### 1. multibandSat — FIXED
- File: `src/front/js/pages/RecordingStudio.js` (factory rewritten).
- Topology: `inBus → 4 parallel band chains (LR-style cascaded LP/HP biquad pairs at xover1/xover2/xover3) → 4 × WaveShaper (tanh curve scaled by drive%) → wetSum → wet*mix`, plus dry path summed with `dry*(1-mix)`.
- Bound: `xover1`, `xover2`, `xover3`, `drive1`–`drive4`, `mix`. Legacy `low`/`mid`/`high` aliases retained.
- New nodes: 13 BiquadFilter + 4 WaveShaper + 4 Gain.

### 2. multiPress — FIXED
- File: `src/front/js/pages/RecordingStudio.js` (factory rewritten).
- Topology: `inBus → 4 parallel xover chains (cascaded LP/HP biquad pairs at xover1/xover2/xover3) → 4 × DynamicsCompressor → 4 × makeup Gain → out`.
- Bound: `xover1/2/3`, `b1Thresh/b1Ratio/b1Gain` ... `b4Thresh/b4Ratio/b4Gain`. Legacy `lowThreshold/highThreshold` retained.
- New nodes: 13 BiquadFilter + 4 DynamicsCompressor + 5 Gain.

### 3. multibandLimiter — FIXED (partial — true lookahead is Phase C5)
- File: `src/front/js/pages/RecordingStudio.js` (factory rewritten).
- Topology: `inBus → DelayNode (lookahead ms / 1000) → 4 parallel band chains (cascaded LP/HP at xover1/xover2/xover3) → 4 × DynamicsCompressor (ratio 20, knee 0, ~0.5 ms attack, brick-wall) → out`.
- Bound: `ceiling` (mapped to all 4 limiter thresholds), `xover1/2/3`, `lookahead` (DelayNode time).
- Note: True sample-accurate lookahead requires AudioWorklet (Phase C5 candidate). Current "lookahead" is a pre-split delay that adds latency but not true side-chain peek-ahead.
- New nodes: DelayNode + 12 BiquadFilter + 4 DynamicsCompressor + 2 Gain.

### 4. midSideEQ — FIXED + NEW UI
- Files: `src/front/js/pages/RecordingStudio.js` (factory rewritten), `src/front/js/component/SPXPlugins.js` (new `MidSideEQUI` component, COMPONENT_MAP entry, PLUGIN_DEFAULTS entry).
- Engine topology: `in → ChannelSplitter (L,R) → encode M=(L+R)/2 + S=(L-R)/2 → Mid 4-band peaking EQ (100/400/3k/10k Hz) + Side 4-band peaking EQ (same freqs) → decode L=M+S, R=M-S → ChannelMerger`.
- UI keys: `midLowGain`, `midLowMidGain`, `midHiMidGain`, `midHiGain`, `sideLowGain`, `sideLowMidGain`, `sideHiMidGain`, `sideHiGain` (all in dB, -12..+12).
- Legacy `midFreq/midGain/sideFreq/sideGain` aliases retained.
- New nodes: ChannelSplitter + ChannelMerger + 4 Gain (M/S encode/decode) + 8 BiquadFilter (peaking) + 3 Gain (decode summers).

### 5. stereoImager — FIXED
- File: `src/front/js/pages/RecordingStudio.js` (factory rewritten).
- Topology: `in → ChannelSplitter (L,R) → encode M=(L+R)/2 + S=(L-R)/2 → M passes through, S split 3 ways via cascaded LP/HP (xover1/xover2) → per-band width Gain (lowWidth/midWidth/highWidth) → sum to processed Side → decode L=M+S', R=M-S' → ChannelMerger`.
- Bound: `lowWidth`, `midWidth`, `highWidth`, `xover1`, `xover2`. Legacy single-knob `width` retained.
- New nodes: ChannelSplitter + ChannelMerger + 4 Gain (M/S encode) + 8 BiquadFilter (3-band Side split) + 5 Gain (band widths + sideOut + invert + L/R sum).

## C2.1 Summary
- Fixed: 5/5
- Partial: 1 — multibandLimiter (true lookahead is Phase C5; current lookahead is a pre-split DelayNode)
- Skipped (Phase C3/C5): 0
- Files touched: `src/front/js/pages/RecordingStudio.js` (5 factory rewrites), `src/front/js/component/SPXPlugins.js` (3 edits — new UI, COMPONENT_MAP entry, PLUGIN_DEFAULTS entry)
- New UIs added: `MidSideEQUI` (8 knobs: 4 Mid bands + 4 Side bands)
