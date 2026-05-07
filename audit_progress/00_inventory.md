# PLUGIN INVENTORY — full canonical list (extracted 2026-05-06)

Source: `src/front/js/component/SPXPlugins.js` lines 1508–1625
(`ALL_FX_EXTENDED`) + `COMPONENT_MAP` lines 1755–1768 +
`src/front/js/component/audio/plugins/plugins/*.js` (111 ph_* factories).

---

## A. ALL_FX_EXTENDED — 105 entries

### A1. Native effects (component=null) — 18 plugins
These have no SPX plugin window; they're native ConsoleFX entries.
Lines 1510–1527.

| key | name | type |
|---|---|---|
| eq | EQ | eq |
| compressor | Compressor | comp |
| gate | Gate | comp |
| deesser | De-Esser | comp |
| limiter | Limiter | limit |
| reverb | Reverb | reverb |
| delay | Delay | delay |
| chorus | Chorus | reverb |
| flanger | Flanger | reverb |
| phaser | Phaser | filter |
| tremolo | Tremolo | filter |
| filter | Filter | filter |
| distortion | Distortion | distortion |
| bitcrusher | Bit Crush | distortion |
| tapeSaturation | Tape Sat | distortion |
| exciter | Exciter | distortion |
| stereoWidener | Stereo W | reverb |
| gainUtility | Gain | eq |

### A2. SPX Analog Suite — 4 plugins (lines 1529–1532)
- tapeForge → TapeForgeUI
- valveGlow → ValveGlowUI
- ironCore → IronCoreUI
- consoleSoul → ConsoleSoulUI

### A3. SPX Dynamics — 8 plugins (lines 1534–1541)
- brickWall → BrickWallUI
- warmPress → WarmPressUI
- glueBus → GlueBusUI
- fetStrike → FETStrikeUI
- optoPress → OptoPressUI
- parallelCrush → ParallelCrushUI
- multiPress → MultiPressUI
- transGate → TransGateUI

### A4. SPX EQ — 2 plugins (lines 1543–1544)
- ironBand → IronBandUI
- spectraCurve → SpectraCurveUI

### A5. SPX Spatial — 12 plugins (lines 1546–1557)
- hallForgeS → HallForgeSmallUI
- hallForgeL → HallForgeLargeUI
- gateVerb → GateVerbUI
- vintageAir → VintageAirUI
- stochasticHall → StochasticHallUI
- greatHall → GreatHallUI
- plateForge → PlateForgeUI
- springBox → SpringBoxUI
- echoField → EchoFieldUI
- stereoBloom → StereoBloomUI
- pitchForge → PitchForgeUI
- dualDelay → DualDelayUI

### A6. SPX Vocal Suite — 6 plugins (lines 1559–1564)
- pitchLock → PitchLockUI
- voiceForge → VoiceForgeUI
- breathGate → BreathGateUI
- sibilantCut → SibilantCutUI
- phantomDouble → PhantomDoubleUI
- vocalSpace → VocalSpaceUI

### A7. SPX Mastering — 9 plugins (lines 1566–1574)
- masterWall → MasterWallUI
- stereoForge → StereoForgeUI
- loudnessMeter → LoudnessMeterUI
- harmonicExcite → HarmonicExciteUI
- vinylPress → VinylPressUI
- spaceForge → SpaceForgeUI
- vortexMod → VortexModUI
- gainRider → GainRiderUI
- harmonicSum → HarmonicSumUI

### A8. SPX additional / creative — 22 plugins (lines 1575–1596)
- pultecForge → PultecForgeUI
- graphicEQ → GraphicEQUI
- tiltEQ → TiltEQUI
- baxandallEQ → BaxandallEQUI
- vocoderSPX → VocoderSPXUI
- granularFreeze → GranularFreezeUI
- noiseReduction → NoiseReductionUI
- ringMod → RingModUI
- formantFilter → FormantFilterUI
- spectrumAnalyzer → SpectrumAnalyzerUI
- tapeStop → TapeStopUI
- transientShaper → TransientShaperUI
- enhancer808 → EnhancerSPX808UI
- infiniteReverb → InfiniteReverbUI
- reverseDelay → ReverseDelayUI
- subOctaver → SubOctaverUI
- tempoDelay → TempoDelayUI
- pitchRandomizer → PitchRandomizerUI
- autoWah → AutoWahUI
- drumEnhancer → DrumEnhancerUI
- vocalSaturator → VocalSaturatorUI
- gainStager → GainStagerUI

### A9. "Missing plugins from COMPONENT_MAP" — 15 plugins (lines 1599–1613)
- ditherForge → DitherForgeUI
- dcBlock → DCBlockUI
- stereoImager → StereoImagerUI
- midSideComp → MidSideCompUI
- multibandLimiter → MultibandLimiterUI
- multibandSat → MultibandSatUI
- goniometer → GoniometerUI
- phaseScope → PhaseScopeUI
- loudnessMeter2 → LoudnessMeter2UI
- loFiCrusher → LoFiCrusherUI
- chorusEnsemble → ChorusEnsembleUI
- declicker → DeclickerUI
- dehummer → DehummerUI
- dialogueIsolator → DialogueIsolatorUI
- cabinetSim → CabinetSimUI

### A10. New Ozone-level mastering — 9 plugins (lines 1616–1624)
- matchEQ → MatchEQUI
- lowEndFocus → LowEndFocusUI
- codecPreview → CodecPreviewUI
- midSideEQ → MidSideEQUI
- dynamicEQ → DynamicEQUI
- spectralRecovery → SpectralRecoveryUI
- loudnessTarget → LoudnessTargetUI
- msImager → MSImagerUI
- freqShifter → FreqShifterUI

---

## B. COMPONENT_MAP — 43 registered UIs (lines 1755–1768)

```
TapeForgeUI, ValveGlowUI, IronCoreUI, ConsoleSoulUI,
BrickWallUI, WarmPressUI, GlueBusUI, FETStrikeUI, OptoPressUI,
ParallelCrushUI, MultiPressUI, TransGateUI,
IronBandUI, SpectraCurveUI,
HallForgeSmallUI, HallForgeLargeUI, GateVerbUI, VintageAirUI,
StochasticHallUI, GreatHallUI, PlateForgeUI, SpringBoxUI,
EchoFieldUI, StereoBloomUI, PitchForgeUI, DualDelayUI,
PitchLockUI, VoiceForgeUI, BreathGateUI, SibilantCutUI,
PhantomDoubleUI, VocalSpaceUI,
MasterWallUI, StereoForgeUI, LoudnessMeterUI, HarmonicExciteUI,
VinylPressUI, DitherForgeUI, DCBlockUI, SpaceForgeUI, VortexModUI,
GainRiderUI, HarmonicSumUI
```

### COMPONENT_MAP gaps (UIs declared in ALL_FX_EXTENDED but NOT registered)

These render as `null` in SPXPluginHost — clicking the plugin opens an
empty window. Confirmed gap: 44 components.

PultecForgeUI, GraphicEQUI, TiltEQUI, BaxandallEQUI, VocoderSPXUI,
GranularFreezeUI, NoiseReductionUI, RingModUI, FormantFilterUI,
SpectrumAnalyzerUI, TapeStopUI, TransientShaperUI, EnhancerSPX808UI,
InfiniteReverbUI, ReverseDelayUI, SubOctaverUI, TempoDelayUI,
PitchRandomizerUI, AutoWahUI, DrumEnhancerUI, VocalSaturatorUI,
GainStagerUI, StereoImagerUI, MidSideCompUI, MultibandLimiterUI,
MultibandSatUI, GoniometerUI, PhaseScopeUI, LoudnessMeter2UI,
LoFiCrusherUI, ChorusEnsembleUI, DeclickerUI, DehummerUI,
DialogueIsolatorUI, CabinetSimUI, MatchEQUI, LowEndFocusUI,
CodecPreviewUI, MidSideEQUI, DynamicEQUI, SpectralRecoveryUI,
LoudnessTargetUI, MSImagerUI, FreqShifterUI

---

## C. ph_* PluginHost factories — 111 files

Path: `src/front/js/component/audio/plugins/plugins/`

Alphabetical:

AICompressor, AIDeRoom, AIEQMatch, AINoiseReduce, AIVocalClean,
AirEQ, AmpSim, AutoFilter, AutoPan, AutoTune,
BassEnhancer, BitDepth, Bitcrusher, BreathGate, BrickwallLimiter,
Cassette, ChamberReverb, ChannelStrip, Choir, Chorus,
CombFilter, Compressor, ConvolutionShaper, DCFilter, DeEsser,
Delay, DottedEighthDelay, DrumBus, DustScratch, DynamicEQ,
EQ3Band, EnvelopeFilter, Expander, FETComp, Flanger,
FrequencyShifter, Fuzz, Gain, Gate, GatedReverb,
GranularFreeze, GraphicEQ, GraphicEQ4Band, GraphicEQ5Band,
GraphicEQ6Band, HaasEffect, HallReverb, HarmonicExciter, Harmonizer,
HiHatShimmer, KickEnhancer, Limiter, LinearPhaseEQ, Looper,
LoudnessMaximizer, MasteringEQ, MidSideBalance, MidSideEQ,
MidSideProcessor, MonoMaker, MultibandComp, MultitapDelay, NotchEQ,
Octaver, OpticalComp, Overdrive, ParallelComp, PhaseFlip,
Phaser, Phone, PingPongDelay, PitchShifter, PlateReverb,
PresenceEQ, Radio, Resonator, Reverb, ReverseReverb,
RingMod, RoomReverb, Rotary, SPXPerceptualEQ, SampleRateReducer,
Saturation, ShimmerReverb, SlapbackDelay, SnareEnhancer, SpectralGate,
SpringReverb, StepFilter, StereoEnhancer, StereoWidener, SubHarmonizer,
TapeDelay, TapeWarmth, TiltEQ, TransientDesigner, Tremolo,
TubeComp, TubeSaturator, VCAComp, Vibrato, VinylSim,
VocalComp, VocalDoubler, VocalEnhancer, VowelFilter, VoxEngine,
WahWah, Waveshaper, WowFlutter

(Total: 111)

---

## D. Total counts

- ALL_FX_EXTENDED entries: **105** (18 native + 87 SPX-with-UI)
- COMPONENT_MAP registered: **43**
- COMPONENT_MAP gaps: **44** (UIs declared but unregistered)
- ph_* factories: **111**
- **Grand total plugins to audit: ~213** (with overlap on names like
  graphicEQ/GraphicEQPlugin, ringMod/RingModPlugin — note these are
  separate engines: SPX-native vs ph_* — audit each separately).
