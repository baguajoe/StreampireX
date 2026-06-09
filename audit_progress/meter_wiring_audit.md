# Meter Wiring Audit — F4-A.7 Plugin UIs

## Summary Verdict

- **Total meters/visualizations across 17 UIs:** 37
- **Wired to live AnalyserNode:** 0
- **Static (knob/param-driven):** 37
- **Animated decorative (rAF but no audio):** 9

**Top-line:** None of the 17 plugin UIs are wired to live audio analysis. Every meter and visualization component receives only params (knob values), computed derivatives of params, or decorative rAF animations that are unrelated to the actual audio signal flowing through the plugin. This is by design: SPXPluginHost passes only `{ params, onChange, onClose }` to each UI; it does NOT pass any AudioNode reference or AnalyserNode. The plugin audio graphs live in RecordingStudio.js, isolated from the UI layer. To enable live audio metering (moving needles that follow actual signal levels), UIs need: (1) a reference to the plugin's output node or an AnalyserNode tap on it, (2) a requestAnimationFrame loop reading analysis data, and (3) state binding to meter `value` props.

---

## Per-Plugin Table

| Plugin | Meter / Viz | Component Used | Value Bound To | AnalyserNode? | rAF? | Reactive? |
|---|---|---|---|---|---|---|
| HallReverbUI | IR decay tail | custom SVG | `decay`, `damping` (params) | No | No | Static (knob-driven) |
| PlateReverbUI | PlateShimmer | custom SVG+CSS | `mix * decay` (params) | No | Yes | Decorative (rAF, no audio) |
| SpringReverbUI | SpringTank | custom SVG paths | `boing`, `springsCount` (params) | No | Yes | Decorative (rAF, no audio) |
| RoomReverbUI | RoomFootprint | custom SVG | `size`, `damping` (params) | No | No | Static (knob-driven) |
| ChamberReverbUI | RoomDiagram | custom SVG | `decay`, `damping` (params) | No | No | Static (knob-driven) |
| GateVerbUI2 | LEDLadder (threshold) | LEDLadder | `gateThresh` (param normalized) | No | Yes (internal) | Static (param-driven, smoothed via LEDLadder) |
| ShimmerReverbUI | ShimmerParticles | canvas | `shimmer` (param as intensity) | No | Yes | Decorative (rAF, no audio) |
| VintageAirUI2 | TapeReel × 2 | SVG with rotate | `tapeWow` (param) | No | Yes | Decorative (rAF, no audio) |
| VintageAirUI2 | VUMeter (output) | VUMeter | `mix * lateLevel` (computed from params) | No | Yes (internal) | Static (param-driven, smoothed via VUMeter) |
| InfiniteReverbUI2 | InfinityVis | SVG+CSS | `freeze`, `roomSize` (params) | No | Yes | Decorative (rAF, no audio) |
| CompressorUI | LEDLadder (GR) | LEDLadder | `fakeDrive` − `ratio` (synthetic, not live) | No | Yes (internal) | Static (computed from params only) |
| FETStrikeUI2 | VUMeter (GR) | VUMeter | `fakeProgramRMS` − `ratio` (synthetic, not live) | No | Yes (internal) | Static (computed from params only) |
| OptoPressUI2 | VUMeter (GR) | VUMeter | `peakReduction` (param) | No | Yes (internal) | Static (knob-driven) |
| GlueBusUI2 | LEDLadder (GR) | LEDLadder | `fakeProgramRMS` − `ratio` (synthetic, not live) | No | Yes (internal) | Static (computed from params only) |
| TubeCompUI | VUMeter (input) | VUMeter | `(threshold + 30) / 30` (synthetic, not live) | No | Yes (internal) | Static (computed from params only) |
| TubeCompUI | VUMeter (GR) | VUMeter | `drive + ratio / threshold` (synthetic, not live) | No | Yes (internal) | Static (computed from params only) |
| WarmPressUI2 | LEDLadder (GR) | LEDLadder | `(−threshold / 30) * (ratio / 12)` (synthetic, not live) | No | Yes (internal) | Static (computed from params only) |
| WarmPressUI2 | LEDLadder (SAT) | LEDLadder | `modelSat + makeupGain / 24` (synthetic, not live) | No | Yes (internal) | Static (computed from params only) |
| VocalCompUI | LEDLadder (sibilance) | LEDLadder | `deEss` (param) | No | Yes (internal) | Static (param-driven) |
| MultiPressUI2 | LEDLadder × 4 (GR per band) | LEDLadder | `(−thresh / 30) * (ratio / 12)` per band (synthetic, not live) | No | Yes (internal) | Static (computed from params only) |
| MultiPressUI2 | CrossoverGraph | custom SVG | `xover1, xover2, xover3` (params) | No | No | Static (knob-driven) |
| ParallelCrushUI2 | LEDLadder (dry) | LEDLadder | `(dryGain + 24) / 48` (param-derived) | No | Yes (internal) | Static (param-driven) |
| ParallelCrushUI2 | LEDLadder (wet) | LEDLadder | `(wetGain + 24) / 48` (param-derived) | No | Yes (internal) | Static (param-driven) |

---

## Per-File Detail

### Reverbs (9)

**HallReverbUI.js (lines 27–74):**
IRWaveform renders an exponential decay envelope scaled by `decay` and `damping` params. No audio analysis; purely decorative—moving the knobs reshape the curve, but it does not reflect actual impulse response or input signal level.

**PlateReverbUI.js (lines 26–90):**
PlateShimmer animates translate + opacity on rAF (~60Hz). Intensity = `mix / 100 * min(1, decay / 4)`. No AnalyserNode; animation is decorative and unrelated to incoming audio. High `mix` × `decay` makes it "look alive" but has no connection to actual signal.

**SpringReverbUI.js (lines 26–106):**
SpringTank renders 3 animated spring coils via requestAnimationFrame. Amplitude and visibility scale with `boing` and `springsCount` params. No audio input; purely visual feedback on knob position.

**RoomReverbUI.js (lines 26–94):**
RoomFootprint draws a static floorplan SVG whose dimensions scale with `size` (0..1). Damping tiles density ∝ `damping` param. No rAF; purely decorative geometry update on knob change.

**ChamberReverbUI.js (lines 25–141):**
RoomDiagram renders a concrete chamber whose rect size scales with `decay` (0.2..6s → 60..150px W, 40..90px H). Hatching opacity = `0.15 + damping * 0.65`. No animation or audio analysis; purely decorative.

**GateVerbUI2.js (lines 235–244):**
LEDLadder for threshold. Value = `(gateThresh + 80) / 80`, range -80..0 dB. No audio analysis; purely a visual reflection of the gate threshold knob position. LEDLadder's internal rAF smooths the display but receives no live data.

**ShimmerReverbUI.js (lines 28–110):**
ShimmerParticles canvas: 12 particles drift upward on rAF, opacity pulsing tied to `shimmer` param (intensity = `shimmer`). No audio input; purely decorative animation that makes the UI feel "alive" but is independent of audio level.

**VintageAirUI2.js (lines 39–153):**
TapeReel: SVG with rotating spokes (3-spoke design). Angle increments on rAF; rotation speed = `0.2 + tapeWow * 0.8` rpm. Also VUMeter value = `(mix / 100) * 0.6 + lateLevel * 0.4`. No audio analysis; both are synthetic proxies based on knob values only.

**InfiniteReverbUI2.js (lines 66–174):**
InfinityVis: SVG infinity glyph + stars. Pulse animation (scale + opacity) on CSS keyframes if not `frozen`. Pulse speed ∝ `roomSize`. No audio input; decorative-only animation state controlled by params.

### Compressors (8)

**CompressorUI.js (lines 39–46):**
LEDLadder for gain reduction. Value = `(grDB / 12)` where `grDB = overshoot − overshoot / ratio` and `overshoot = fakeDrive − threshold` (`fakeDrive = -10` assumed constant). No actual sidechain analysis or input level metering; purely synthetic based on knob positions.

**FETStrikeUI2.js (lines 85–91):**
VUMeter for GR. Value = `min(1, grDB / 15)` where `grDB = overshoot − overshoot / effectiveRatio` and `overshoot = fakeProgramRMS − threshold` (`fakeProgramRMS = -10 + inputGain`). No live audio; entirely synthetic estimate.

**OptoPressUI2.js (lines 155–157):**
VUMeter for gain reduction. Value = `peakReduction / 100` (0..100 param → 0..1). No audio analysis; purely knob-driven.

**GlueBusUI2.js (lines 68–71):**
LEDLadder for gain reduction. Value = `min(1, grDB / 12)` where `grDB = overshoot − overshoot / ratio` and `overshoot = fakeProgramRMS − threshold` (`fakeProgramRMS = -10`). No live data; synthetic estimate only.

**TubeCompUI.js (lines 94–98):**
Twin VUMeters: input level = `(threshold + 30) / 30` and GR = `min(1, (−threshold / 30) * (ratio / 10) + drive * 0.2)`. Both synthetic, knob-derived; no actual signal analysis.

**WarmPressUI2.js (lines 47–59):**
Two LEDLadders: GR = `(−threshold / 30) * (ratio / 12)`, SAT = `modelSat + max(0, makeupGain) / 24`. No audio input; both computed only from knob positions.

**VocalCompUI.js (lines 116):**
LEDLadder for sibilance. Value = `deEss` (0..1 param). No frequency analysis or actual high-frequency content detection; purely a reflection of the de-ess knob.

**MultiPressUI2.js (lines 159–160, per band):**
Four LEDLadders (one per band). Each: `grTarget = (−thresh / 30) * (ratio / 12)`. No audio crossover or frequency-domain analysis; purely synthetic per-band estimates.

**ParallelCrushUI2.js (lines 45–48):**
Two LEDLadders: DRY = `(dryGain + 24) / 48`, WET = `(wetGain + 24) / 48`. No signal analysis; purely visual reflection of dry/wet gain knobs.

---

## What's Missing (The Diagnosis)

**Root cause:** The plugin UI layer (17 React components in PluginUIs/) is architecturally **isolated from the audio graph**. Each UI receives only `params` (normalized 0..1 knob values) and `onChange` callback via SPXPluginHost. The actual AudioNodes—including DSP processing and the opportunity to tap signal levels—exist in RecordingStudio.js's `liveInstancesRef.current.get(trackId:pluginKey)`, where they are created and connected to the audio graph.

The UIs have no way to:
1. Access the plugin's output node (or any intermediate node for analysis)
2. Create an AnalyserNode tap
3. Read live FFT or time-domain data via `getByteFrequencyData()` or `getFloatTimeDomainData()`
4. Update meter state with signal-driven values

Instead, every meter currently shows either:
- A static constant (knob-driven, e.g., "show me the current threshold value as a needle position")
- A fake "estimate" computed from params (e.g., "assume input is always -10 dB RMS, divide overshoot by ratio, show as GR")
- A decorative animation (rAF loop with no audio input, e.g., "spin the reel" or "pulse the infinity symbol")

**To enable live audio metering**, the architectural change would be:
1. SPXPluginHost (or RecordingStudio.js orchestrating SPXPluginHost) creates an AnalyserNode on each plugin's output
2. Pass the AnalyserNode (or a getter function returning it) as a prop to each plugin UI, e.g., `<CompressorUI analyser={nodeRef.current} />`
3. Each UI that needs live metering instantiates a `useEffect` hook that runs `requestAnimationFrame`, calls `analyser.getFloatTimeDomainData(buffer)` or `getByteFrequencyData(buffer)`, computes RMS / peak / FFT in dB, and updates a `[meterValue, setMeterValue]` state
4. On unmount, cancel the rAF loop and disconnect the AnalyserNode

This is not a UI-only fix; it requires changes to the host (SPXPluginHost, RecordingStudio.js) to expose the nodes. No changes to VUMeter.js or LEDLadder.js are required—they already accept and animate any 0..1 value correctly. The current appearance of "liveness" (smooth needles, pulsing animations) is implemented correctly; they just have no live source data.

---

## Appendix: AnalyserNode Availability

Grep for AnalyserNode instantiation across the codebase shows:
- **RecordingStudio.js:** Master fader strip has an AnalyserNode tap for the main output meter. ✓ Live audio works at the master level.
- **Plugin UIs:** Zero instantiations of AnalyserNode, `createAnalyser()`, or calls to `getFloatTimeDomainData()` / `getByteFrequencyData()` / `getByteTimeDomainData()`.

This confirms that the plugin layer is read-only w.r.t. audio: params flow in, no audio data flows out to the UI.
