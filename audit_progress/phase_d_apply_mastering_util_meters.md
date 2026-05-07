# Phase D2.1.F — Mastering / Utilities / Meters Apply Progress

## Status: Complete

## Files touched
- `src/front/js/component/SPXPlugins.js` — 9 PLUGIN_DEFAULTS entries updated
- `src/front/js/pages/RecordingStudio.js` — 13 buildFxChain factory default-literal updates
- `src/front/js/component/audio/plugins/registry.js` — 9 ph_* registry default updates
- `src/front/js/component/audio/plugins/plugins/AIDeRoomPlugin.js` — 4 fallback edits
- `src/front/js/component/audio/plugins/plugins/AIEQMatchPlugin.js` — 2 fallback edits
- `src/front/js/component/audio/plugins/plugins/AINoiseReducePlugin.js` — 4 fallback edits
- `src/front/js/component/audio/plugins/plugins/AIVocalCleanPlugin.js` — 4 fallback edits
- `src/front/js/component/audio/plugins/plugins/StereoEnhancerPlugin.js` — 2 fallback edits (?? 1.2 → ?? 1)
- `src/front/js/component/audio/plugins/plugins/StereoWidenerPlugin.js` — 1 fallback edit (?? 100 → ?? 20)

## Plugin defaults changed (SPX PLUGIN_DEFAULTS)
- stereoForge: width 50→100, monoBelow 100→0
- stereoImager: lowWidth 0.8→1.0, highWidth 1.2→1.0
- noiseReduction: smoothing 0.8→0
- declicker: sensitivity 0.7→0, strength 0.8→0
- dehummer: depth 0.9→0
- dialogueIsolator: isolation 0.7→0, sensitivity 0.6→0, smoothing 0.8→0
- cabinetSim: distance 0.5→0
- lowEndFocus: sub 3→0, kick 2→0
- spectralRecovery: amount 4→0, presence 2→0

## RecordingStudio.js factory `??`/`||` literal-default updates
- stereoImager constructor: lowW 0.8→1.0, highW 1.2→1.0
- stereoImager setParam clamp: lowWidth 0.8→1.0, highWidth 1.2→1.0
- vinylPress constructor: warmth 0.5→0, crackle 0.1→0
- noiseReduction constructor: smoothing 0.2→0
- noiseReduction setParam: smoothing 0.2→0
- lowEndFocus constructor: sub 3→0, kick 2→0
- lowEndFocus setParam: sub 3→0, kick 2→0
- spectralRecovery constructor: amount 4→0, presence 2→0
- spectralRecovery setParam: amount 4→0, presence 2→0
- dialogueIsolator constructor: isoToHp/isoToLp/sensToGain clamp defaults 0.7/0.6→0; initIso/initSens 0.7/0.6→0
- cabinetSim constructor: distToHi clamp 0.5→0; initDist 0.5→0
- cabinetSim setParam: curDist 0.5→0

## ph_* registry defaults changed
- AIDeRoom: reduction 0.6→0, sensitivity 0.5→0
- AIEQMatch: match 0.5→0
- AINoiseReduce: reduction 0.6→0, threshold -40→-80
- AIVocalClean: denoise 0.5→0, debreath 0.3→0, declick 0.3→0
- StereoWidener: monoBelow 100→20

## ph_* factory `??` fallback updates
- AIDeRoomPlugin: reductionToDb default 0.6→0; sensitivityToThresh default 0.5→0; p.reduction ?? 0.6→0; p.sensitivity ?? 0.5→0
- AIEQMatchPlugin: state.match clamp default 0.5→0; setParam match default 0.5→0
- AINoiseReducePlugin: gate.threshold default -40→-80; gate.ratio reduction default 0.6→0 (constructor + setParam + back-compat 'floor')
- AIVocalCleanPlugin: denoiseToThresh/Ratio default 0.5→0; debreathToHpf default 0.3→0; declickToDeessDb default 0.3→0; p.debreath/declick/denoise ?? defaults all → 0
- StereoEnhancerPlugin: p.width ?? 1.2 → ?? 1
- StereoWidenerPlugin: monoBelowFromUI fallback 100→20

## Skipped (judgment-call / engine-bug per audit)
- loudnessTarget.ceiling (-1) — judgment-call, leave as pro-mastering preset
- declicker.maxWidth — UI-only no-op
- dehummer.harmonics, dehummer.notch frequencies — engine bug noted (factory ignores depth)
- MonoMaker.freq — engine missing freq-split; factory unconditional mono-sum (D2.3 territory)
- AIVocalClean engine bug (denoise=0 still 2:1 comp) — D2.3 territory
- TransientDesigner / StereoEnhancer factory dB→linear semantics mismatch — D2.3 territory
- Already-neutral plugins: ditherForge, dcBlock, loudnessMeter, loudnessMeter2, goniometer, phaseScope, spectrumAnalyzer, masterWall, midSideEQ, gainStager (rmsDb/peakDb), codecPreview, MidSideBalance, MidSideProcessor, PhaseFlip, GainPlugin, TransientDesigner registry defaults

## D2.1.F Summary
- Plugins touched: 18 (12 SPX + 6 ph_*)
- Param defaults changed: ~50 across constructors, registry, and PLUGIN_DEFAULTS
- Cross-source reconciliations: 5 plugin pairs (SPX defaults aligned with RecordingStudio.js factory `??` literals; registry defaults aligned with ph_* factory `??` fallbacks)
- Files touched: 9 (SPXPlugins.js, RecordingStudio.js, registry.js, AIDeRoomPlugin.js, AIEQMatchPlugin.js, AINoiseReducePlugin.js, AIVocalCleanPlugin.js, StereoEnhancerPlugin.js, StereoWidenerPlugin.js)
- Skipped (judgment-call): loudnessTarget.ceiling, declicker.maxWidth, dehummer.harmonics, MonoMaker engine bug, AIVocalClean engine non-bypass, TransientDesigner/StereoEnhancer dB-vs-linear semantics
