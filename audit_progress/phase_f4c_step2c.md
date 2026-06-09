# Phase F4-C — Step 2c: Hard meters (4 UIs + ShimmerReverbUI)

## Summary

| UI | Meter | Live source | Approach |
|---|---|---|---|
| VocalCompUI | Sibilance LEDLadder | `meters.analyserSibilance` | New 6 kHz BiquadFilter (bandpass, Q=4) tap on input → analyser. Scale ×18 to compensate for narrow-band RMS. |
| MultiPressUI2 | 4× per-band GR LEDLadders | `meters.comps[0..3]` | Each of 4 internal `DynamicsCompressorNode`s exposed as array; `BandColumn` uses `useGRMeter` per band. |
| ParallelCrushUI2 | DRY + WET LEDLadders | `meters.analyserDry` + `meters.analyserWet` | Two analysers — one tapped post-`dryTrim`, one post-`wetTrim`, each pre-mix. Replace gain-knob-derived statics. |
| ShimmerReverbUI | Particle drift density | `meters.analyserOut` | Output analyser RMS multiplied with `shimmer` knob → particles only animate when audio flows. |

## Factory changes (`src/front/js/pages/RecordingStudio.js`)

**parallelCrush** (line ~2697):
- Added `dryAn` + `wetAn` analysers (256 fftSize, 0.85 smoothing)
- Taps: `dryTrim.connect(dryAn)`, `wetTrim.connect(wetAn)` — both pre-mix so each shows its own path's level independent of mix knob
- Exposed `meters: { analyserDry: dryAn, analyserWet: wetAn }`
- `dispose()` extended

**vocalComp** (line ~2842):
- Added `sibBP` (BiquadFilter, type bandpass, frequency 6000 Hz, Q=4) — narrow-band sibilance detector
- Added `sibAn` analyser (smaller smoothing 0.7 for snappier sibilant tracking)
- Tap path: `inNode → sibBP → sibAn` (parallel sink, no audio impact on main wet/dry)
- Exposed `meters: { analyserSibilance: sibAn }`
- `dispose()` extended

**multiPress** (line ~2966):
- No DSP changes — the 4 internal `c1, c2, c3, c4` already exist
- Exposed `meters: { comps: [c1, c2, c3, c4] }` — array form so the UI can index by band

**shimmer** (line ~4368):
- Added `outAn` analyser
- Tap: `wet.connect(outAn)` (post-mix-gain wet output)
- Exposed `meters: { analyserOut: outAn }`
- `dispose()` extended

## UI changes

### VocalCompUI.js
- Imported `useAnalyserValue`
- Added `getInstance` prop
- Replaced `sibilanceTarget = clamp(deEss)` (knob mirror) with:
  ```js
  useAnalyserValue(getInstance()?.meters?.analyserSibilance, { scale: 18 })
  ```
- The `scale: 18` overrides the default 6 because narrow bandpass output is ~3× quieter than full-band. With scale 18 the meter responds visibly to typical vocal sibilance.

### MultiPressUI2.js
- Imported `useGRMeter`
- Added `getInstance` prop on top-level component
- Added `getComp` prop on the `BandColumn` sub-component
- Replaced `BandColumn`'s synthetic `grTarget = ((-thresh)/30) * (ratio/12)` with `useGRMeter(getComp, {targetDb: 12})`
- All 4 `<BandColumn>` instances pass `getComp={() => getInstance()?.meters?.comps?.[i]}` for i=0..3
- Each band's GR ladder now reflects that band's compressor's actual `.reduction`

### ParallelCrushUI2.js
- Imported `useAnalyserValue`
- Added `getInstance` prop
- Replaced `wetTarget = norm(s.wetGain)` and `dryTarget = norm(s.dryGain)` (gain-knob mirrors) with two analyser hook calls
- Each ladder now shows the actual signal level on that path — DRY shows your input level, WET shows post-comp/crush level

### ShimmerReverbUI.js
- Imported `useAnalyserValue`
- Added `getInstance` prop
- Read live output level: `liveOut = useAnalyserValue(meters.analyserOut)`
- Compute `particleIntensity = min(1, shimmer * (0.2 + liveOut * 1.5))` — shimmer knob scales density, but the multiplier with `liveOut` means particles barely move when audio is silent
- Pass `particleIntensity` (instead of raw `s.shimmer`) to `<ShimmerParticles intensity=...>`

## Topology safety (Step 2c)

All new analyser nodes are sinks. Existing wet/dry connections remain unchanged.

The only structural addition is the 6 kHz bandpass filter in vocalComp — it sits on a parallel branch (`inNode.connect(sibBP)`) that terminates in the analyser. The filter chain does not feed back into the main signal path, so no audio character change.

## Build

`webpack 5.99.9 compiled with 9 warnings in 180849 ms` — 0 errors. No bundle regression.

## Final smoke-test recipe (covers all 12 meters from Part 2)

For each plugin, drop on a track, play audio through it, and check:

**Step 2a — easy compressors** (.reduction-driven):
1. **CompressorUI**: pull threshold to -30, ratio to 8, on hot signal. Vertical LED ladder fills as GR climbs. At threshold=0, ladder empty.
2. **FETStrikeUI2**: same — VU needle deflects with GR. Toggle "all-button" — ratio locks to 20, GR jumps. Released, GR stays.
3. **OptoPressUI2**: peak-reduction knob → see VU deflect with audio dynamics (was static at knob position before).
4. **GlueBusUI2**: horizontal red GR ladder + dB readout next to it. Both should track audio.

**Step 2b — medium meters**:
5. **TubeCompUI**: twin VUs — left needle (input) responds to incoming level; right needle (GR, inverted) deflects when comp engages.
6. **WarmPressUI2**: cyan GR ladder responds to compression. Orange SAT ladder lights up with output level — push makeupGain → SAT brightens.
7. **VintageAirUI2**: large VU on the front responds to wet output (no longer a knob mirror).
8. **GateVerbUI2**: red threshold ladder shows live input level. Set gateThresh near current input — gate opens/closes audibly.

**Step 2c — hard meters**:
9. **VocalCompUI**: sibilance ladder lights up on /s/, /sh/, hi-hat-like content; stays dim on bass.
10. **MultiPressUI2**: 4 colored GR ladders independently. Lower b1Thresh on bass → only band 1 ladder fills. Lower b4Thresh on hi-hats → only band 4 fills.
11. **ParallelCrushUI2**: green DRY ladder = input level; red WET ladder = post-crush level (typically quieter due to limiting). Pull mix → master changes but DRY/WET ladders stay stable (they're pre-mix).
12. **ShimmerReverbUI**: with audio playing, particles drift visibly. Stop audio → particles settle / fade. Crank shimmer → density scales but motion only with audio.

## Track strip dB meter (Part 1 fix)

Bonus — now that meters work, also verify Part 1's track strip fix:
- Play audio with no console → meter responds normally
- Pick SSL 4000E or any console → tweak Drive/HF Lift → **track strip dB meter responds** (was static pre-F4-C)

## Status

Step 2c complete. **Awaiting user smoke test of all 12 meters before any commit/push.** Per plan: DO NOT push until both parts smoke-tested clean.
