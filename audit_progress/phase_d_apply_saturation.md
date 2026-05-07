# Phase D2.1.D — Apply Saturation/Distortion/Waveshaper Defaults

## Final progress

### Pass 1: SPX PLUGIN_DEFAULTS (SPXPlugins.js) — DONE (12/12)
tapeForge, valveGlow, ironCore, consoleSoul, drumEnhancer, vocalSaturator,
harmonicExcite, harmonicSum, vinylPress, enhancer808, loFiCrusher, multibandSat

### Pass 2: SPX factory `??/||` fallbacks (RecordingStudio.js) — DONE (10/12)
- tapeForge, valveGlow, ironCore, consoleSoul, harmonicExcite, harmonicSum,
  drumEnhancer, vocalSaturator (drive→amount bridge), loFiCrusher, multibandSat
- vinylPress and enhancer808 factory fallbacks were already neutral.

### Pass 3: ph_* registry.js defaults — DONE (19/19)
amp_sim, bass_enhancer, bit_depth, bitcrusher, cassette, convolution_shaper,
dust_scratch, fuzz, harmonic_exciter, hi_hat_shimmer, kick_enhancer, overdrive,
saturation, snare_enhancer, tape_warmth, tube_saturator, vinyl_sim, waveshaper,
wow_flutter
- vinyl_sim.warmth: unit converted from `0..1` to `0..20000 Hz`, default 20000 (D2 unit-fix flag).

### Pass 4: ph_* factory files — DONE (19/19)
- AmpSimPlugin (drive→0, mix→0)
- BassEnhancerPlugin (sub→0, punch→0)
- BitDepthPlugin (bits→24, dither→0)
- BitcrusherPlugin (rate→1, mix→100)
- CassettePlugin (drive/noise/hfLoss/mix→0)
- ConvolutionShaperPlugin (drive/mix→0)
- DustScratchPlugin (already neutral)
- FuzzPlugin (drive→0, tone→8000, mix→0)
- HarmonicExciterPlugin (drive/even/odd/mix→0)
- HiHatShimmerPlugin (drive/mix→0)
- KickEnhancerPlugin (sub/click→0)
- OverdrivePlugin (drive→0, tone→8000, level→1, mix→0)
- SaturationPlugin (drive→0, mix→0, tone→20000)
- SnareEnhancerPlugin (body/snap/air→0)
- TapeWarmthPlugin (drive/warmth/air→0)
- TubeSaturatorPlugin (drive/warmth→0)
- VinylSimPlugin (warmth→20000, rumble→0)
- WaveshaperPlugin (amount→0; param-name bridge for drive/curve)
- WowFlutterPlugin (wow/flutter→0)
