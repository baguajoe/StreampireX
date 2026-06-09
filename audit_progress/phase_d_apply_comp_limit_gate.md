# Phase D2.1.B — COMPRESSORS / LIMITERS / GATES Defaults Apply

## Progress log

### Batch 1 (5 ph_* plugins): ph_AICompressor, ph_BreathGate, ph_Compressor, ph_DeEsser, ph_DrumBus

- **ph_AICompressor** (AICompressorPlugin.js): ratio 4→2, knee 8→6, release 150→100; style[0] knee 8→6.
- **ph_BreathGate** (BreathGatePlugin.js): threshold -45→-40, reduction -12→-20, release 150→100.
- **ph_Compressor** (CompressorPlugin.js): worklet+native fallback `??` defaults: threshold -18→-10, ratio 4→2, release 150→100.
- **ph_DeEsser** (DeEsserPlugin.js): freq 6500→7000, threshold -25→-20, ratio 6→3.
- **ph_DrumBus** (DrumBusPlugin.js): punch 4 dB → 0 dB. (compress 0.5 left per judgment-call.)

### Batch 2 (5 ph_* plugins): ph_FETComp, ph_Gate, ph_Limiter, ph_LoudnessMaximizer, ph_OpticalComp

- **ph_FETComp** (FETCompPlugin.js): threshold -15→-10, ratio 8→2, attack 0.5→10 ms, release 50→100 ms.
- **ph_Gate** (GatePlugin.js): attack 5→1 ms (reconcile with registry).
- **ph_Limiter** (LimiterPlugin.js): release 50→100 ms.
- **ph_LoudnessMaximizer** (LoudnessMaximizerPlugin.js): loudness -14→0 LUFS, final ceiling release 50→100 ms. (transient 0.5 left per judgment-call.)
- **ph_OpticalComp** (OpticalCompPlugin.js): peakReduction 50→25, ratio 4→2, attack 30→10 ms, release 500→100 ms, tubeSat 0.4→0.

### Batch 3 (6 ph_* plugins): ph_ParallelComp, ph_SpectralGate, ph_TubeComp, ph_VCAComp, ph_VocalComp, ph_MultibandComp

- **ph_ParallelComp** (ParallelCompPlugin.js): threshold -30→-10, ratio 10→2, blend 50→100.
- **ph_SpectralGate** (SpectralGatePlugin.js): worklet+factory threshold -50→-40, release 60→100 ms.
- **ph_TubeComp** (TubeCompPlugin.js): threshold -20→-10, ratio 3→2, knee 12→6, attack 20→10 ms, release 300→100 ms, drive 0.3→0, warmth 1.5→0.
- **ph_VCAComp** (VCACompPlugin.js): threshold -15→-10, ratio 4→2, enhance gain 0.5→0.
- **ph_VocalComp** (VocalCompPlugin.js): threshold -20→-10, ratio 4→2, knee 8→6, attack 5→10 ms, release 80→100 ms, presence 1.5→0.
- **ph_MultibandComp** (MultibandCompPlugin.js): threshold0/1/2 -18→-10, ratio0/1/2 4→2.

### Batch 4 (SPX PLUGIN_DEFAULTS in SPXPlugins.js, 15 plugins)

- **brickWall**: release 50→100.
- **warmPress**: threshold -18→-10, ratio 4→2.
- **glueBus**: ratio 4→2, attack 3→10, makeupGain 2→0.
- **fetStrike**: threshold -15→-10, ratio 8→2, attack 0.5→10, release 50→100, saturation 0.3→0.
- **optoPress**: peakReduction 50→17, tubeSaturation 0.4→0.
- **parallelCrush**: threshold -25→-10, ratio 10→2, attack 5→10, release 80→100, mix 50→100, crush 0.7→0.
- **multiPress**: all bands threshold -10, ratio 2.
- **transGate**: release 200→100, range -80→-20.
- **midSideComp**: midThresh -18→-10, midRatio 3→2, sideThresh -24→-10, sideRatio 4→2, release 150→100.
- **masterWall**: ceiling -0.1→-0.3, threshold -0.3→-1, clipMargin 0.1→0.3.
- **gainRider**: targetLevel -18→-10, speed 0.5→0.95, maxGain 12→0, smooth 0.7→0.2.
- **breathGate**: threshold -45→-40, release 150→100, breathReduction -12→-20.
- **sibilantCut**: freq 7500→7000, threshold -18→-20, ratio 6→3.

### Batch 5 (RecordingStudio.js SPX factories)

- **warmPress**: factory `||` defaults threshold -18→-10, ratio 3→2, attack 30→10, release 150→100, knee 12→6.
- **glueBus**: factory threshold -12→-10, ratio 4→2, makeup 2→0.
- **fetStrike**: factory threshold -15→-10, ratio 6→2, attack 1→10, release 50→100, makeup 4→0.
- **optoPress**: factory peakReduction 50→17, threshold -20→-10, ratio 3→2, attack 50→10, release 300→100, tubeSaturation initial 0.4→0.
- **parallelCrush**: factory threshold -25→-10, ratio 10→2, attack 5→10, release 80→100, crush 0.7→0, mix 50→100.
- **multiPress**: factory bands all -10/2/10ms/100ms.
- **transGate**: factory release 200→100, hold+release sum init.
- **masterWall**: factory worklet processor `defaultValue` threshold -6→-1, init Threshold default -6→-1.
- **gainRider**: factory targetLevel -18→-10, speed 0.5→0.95, smooth 0.7→0.2.
- **breathGate**: factory threshold -45→-40, release 0.15→0.1.
- **sibilantCut**: factory ratio 6→3.
- **midSideComp**: factory midThresh -18→-10, midRatio 3→2, release 150→100.
- **multibandLimiter**: factory implicit release 0.05→0.1.

### Batch 6 (registry.js, dynamics plugins)

- **a_i_compressor**: ratio 4→2, release 150→100.
- **breath_gate**: threshold -45→-40, reduction -12→-20, release 150→100.
- **compressor**: threshold -18→-10, ratio 4→2, release 150→100.
- **de_esser**: freq 6500→7000, threshold -25→-20, ratio 6→3.
- **drum_bus**: punch 4→0.
- **f_e_t_comp**: threshold -15→-10, ratio 8→2, attack 0.5→10, release 50→100.
- **gate**: release 200→100, range -80→-20.
- **limiter**: release 50→100.
- **loudness_maximizer**: loudness -14→0.
- **multiband_comp**: compLow/Mid/High 0.3→0.75.
- **optical_comp**: peakReduction 50→25, tubeSat 0.4→0.
- **parallel_comp**: threshold -25→-10, ratio 10→2, crush 0.7→0, mix 50→100.
- **tube_comp**: threshold -18→-10, ratio 4→2, release 150→100, tubeSat 0.4→0.
- **v_c_a_comp**: ratio 4→2, attack 3→10, makeup 2→0.
- **vocal_comp**: threshold -18→-10, ratio 3→2, attack 5→10, release 80→100.
