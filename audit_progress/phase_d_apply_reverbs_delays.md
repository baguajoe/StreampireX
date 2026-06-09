# Phase D2.1.A — Apply Reverbs + Delays Defaults — COMPLETE

## SPX PLUGIN_DEFAULTS (SPXPlugins.js)
- REVERB_BASE_DEFAULTS: mix 30→0, decay 2.5→2.0
- vintageAir: decay override added (1.8)
- plateForge: decay 3.5→2.0, mix 25→10
- springBox: mix 30→10
- vocalSpace: mix 20→0
- spaceForge: mix 25→0
- phantomDouble: mix 50→30
- echoField: feedback 0.4→0.3, mix 25→0
- dualDelay: feedbackL/R 0.35→0.3, mix 30→0
- reverseDelay: time 500→250, feedback 0.4→0.3, mix 0.4→0
- tempoDelay: feedback 0.4→0.3, mix 0.3→0

## SPX factory defaults (RecordingStudio.js)
- hallForgeS: decay 1.2→2.0, mix 0.25→0
- hallForgeL: decay 2.5→2.0, mix 0.3→0
- gateVerb: mix 0.4→0
- vintageAir: mix 0.2→0
- stochasticHall: mix 0.25→0
- greatHall: decay 3.5→2.0, mix 0.3→0
- plateForge: decay 1.5→2.0, mix 0.25→0.1
- springBox: mix 0.3→0.1
- phantomDouble: mix 0.4→0.3
- vocalSpace: mix 0.2→0
- spaceForge: mix 0.3→0
- echoField: feedback 0.4→0.3, mix 0.3→0
- reverseDelay: time 500→250, mix 0.25→0
- tempoDelay: feedback 0.35→0.3, mix 0.3→0
- dualDelay: mix 0.25→0

## registry.js (ph_*)
- chamber_reverb: decay 2.5→2.0, mix 25→0
- delay: time 375→250, feedback 40→30, mix 25→0, filter→filterCutoff (cross-source fix)
- dotted_eighth_delay: feedback 35→30, mix 25→0
- gated_reverb: decay 0.5→1.5, mix 35→0, preDelay 5→10
- hall_reverb: decay 4→2.0, preDelay 30→20, mix 30→0
- multitap_delay: feedback 0.4→0.3, mix 30→0
- ping_pong_delay: time 375→250, feedback 0.4→0.3, mix 30→0
- plate_reverb: preDelay 5→10, mix 25→10
- reverse_reverb: decay 2→1.5, preDelay 100→20, mix 30→0
- room_reverb: mix 20→0
- shimmer_reverb: mix 40→0, feedback 0.7→0.3
- slapback_delay: mix 30→0
- spring_reverb: mix 30→10
- tape_delay: time 500→250, feedback 0.4→0.3, mix 30→0

## ph_* factory files (dedicated per-plugin only — duplicates in HallReverbPlugin/PlateReverbPlugin/SpringReverbPlugin/TapeDelayPlugin/PingPongDelayPlugin/ShimmerReverbPlugin are dead code per PluginHost imports)
- ChamberReverbPlugin.js: decay 2.5→2.0, mix 25→0
- DelayPlugin.js: time 375→250, feedback 40→30, mix 25→0
- DottedEighthDelayPlugin.js: feedback 35→30, mix 25→0
- GatedReverbPlugin.js: decay 2.0→1.5, preDelay 5→10, mix 35→0
- HallReverbPlugin.js: decay 4.0→2.0, preDelay 30→20, mix 30→0
- MultitapDelayPlugin.js: feedback 0.4→0.3, mix 30→0
- PingPongDelayPlugin.js: time 375→250, feedback 0.4→0.3, mix 30→0
- PlateReverbPlugin.js: mix 25→10
- ReverseReverbPlugin.js: mix 30→0 (decay already 1.5)
- RoomReverbPlugin.js: mix 20→0
- ShimmerReverbPlugin.js: already neutral (mix 0, feedback 0)
- SlapbackDelayPlugin.js: time 75→60, mix 40→0
- SpringReverbPlugin.js: mix 30→10
- TapeDelayPlugin.js: time 500→250, feedback 0.4→0.3, mix 30→0

## Cross-source reconciliations
- delay: registry param key `filter` → `filterCutoff` (matches factory + setParam handler)
- shimmer_reverb: registry mix 40→0 (matches factory 0); registry feedback 0.7→0.3 (factory still 0 by audit — already-neutral)
- reverse_reverb: registry decay 2→1.5 (matches factory 1.5)
- gated_reverb: registry decay 0.5 → 1.5 (factory was 2.0 — both updated to 1.5)
- slapback_delay: registry mix 30→0; factory mix 40→0 + factory time 75→60

## D2.1.A Summary
- Plugins touched: 26 (12 SPX reverbs/specials, 4 SPX delays, 8 ph_* reverbs, 6 ph_* delays — incl. shared reverb-base updates)
- Param defaults changed: ~60+ across all sources
- Cross-source reconciliations: 6 (delay filter naming, shimmer mix, shimmer feedback, reverse decay, gated decay, slapback mix)
- Files touched:
  - src/front/js/component/SPXPlugins.js (12 edits)
  - src/front/js/pages/RecordingStudio.js (16+ edits)
  - src/front/js/component/audio/plugins/registry.js (12 plugin blocks)
  - 14 ph_* factory files (.../plugins/plugins/*Plugin.js)
- Skipped (judgment-call): infiniteReverb (already neutral), tempoDelay.division, dotted_eighth_delay.bpm, slapback_delay.feedback, room_reverb.decay, ph_* damping (Hz cutoff semantics), dualDelay.timeR (stereo offset identity)
