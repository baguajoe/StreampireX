# Batch 09 — ph_* PluginHost factories (Radio → WowFlutter)

Auditor #9 — slice covers 37 ph_* plugins, P–W alphabetical (from Radio onward).
Each plugin is a factory in `src/front/js/component/audio/plugins/plugins/<Name>Plugin.js`.
For ph_* plugins, COMPONENT_MAP (bug class 8) is **N/A** — they render via PluginHost,
not SPXPluginHost. Most factories return `{ inputNode, node, setParam, getState, connect, disconnect }`.

Note: many factory files in this slice (SpringReverb, Tilt EQ, ShimmerReverb, TapeDelay, TubeComp,
VCAComp, etc.) **redefine 8–25 other plugins** as duplicate `export const create…` declarations.
That's a compile-level P0 module gotcha — see "Cross-cutting findings" at the end.

---

### 1. Radio (`ph_radio`)
- **UI file:** registered in PluginHost (no SPX UI) — knob set inferred from setParam keys.
- **Factory:** `src/front/js/component/audio/plugins/plugins/RadioPlugin.js:5`
- **1. Param names:** ✅ — hpf/lpf/presence keys match.
- **2. Units:** ✅ — Hz throughout, dB for presence.
- **3. Missing cases:** ✅ — only 3 knobs, all covered.
- **4. Worklets:** N/A — no AudioWorkletNode.
- **5. Topology:** ✅ — input→hpf→lpf→mid→ws→output.
- **6. Dispose:** ⚠️ — only `output.disconnect()`; no `input/hpf/lpf/mid/ws` disconnect (line 18). Minor leak per insert.
- **7. Defaults:** ⚠️ — `presence:+4 dB` baked-in EQ on insert (RadioPlugin.js:10). Plugin is intended-coloration, but flag as non-neutral.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P2
- **Demo-blocker?:** no

### 2. Resonator (`ph_resonator`)
- **UI file:** PluginHost-rendered.
- **Factory:** `src/front/js/component/audio/plugins/plugins/ResonatorPlugin.js:5`
- **1. Param names:** ⚠️ — `freq1/freq2/freq3` are constructor-only; no `setParam` cases for them (line 16). `q` and `mix` work.
- **2. Units:** ✅ — Hz, mix as 0–100.
- **3. Missing cases:** ❌ — `freq1`, `freq2`, `freq3` defaults read but no runtime setters. Dead knobs.
- **4. Worklets:** N/A
- **5. Topology:** ✅ — 3 parallel bandpass filters + dry path.
- **6. Dispose:** ⚠️ — no filter/mixer/dryGain disconnect.
- **7. Defaults:** ⚠️ — `mix=50%` and `Q=20` (very narrow) audible immediately on insert; ResonatorPlugin.js:7,12. Vowel-like coloring on bypass-equivalent neutral.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no (audible but not catastrophic)

### 3. Reverb (`ph_reverb`)
- **UI file:** PluginHost-rendered.
- **Factory:** `src/front/js/component/audio/plugins/plugins/ReverbPlugin.js:10`
- **1. Param names:** ✅ — mix, decay, preDelay, damping all map.
- **2. Units:** ✅ — mix %, decay s, preDelay ms→s, damping Hz.
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ✅ — clean dry+wet via merger gain (line 51–60).
- **6. Dispose:** ✅ — `destroy()` disconnects all 8 nodes (line 93–102). **But uses `destroy` not `dispose` or `disconnect`** — PluginHost may call `disconnect()` and miss it. ⚠️ on naming convention.
- **7. Defaults:** ⚠️ — mix=25 % audible on insert; should default to 0 for neutral.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1 (dispose method-name mismatch with rest of codebase)
- **Demo-blocker?:** no

### 4. ReverseReverb (`ph_reverseReverb`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/ReverseReverbPlugin.js:5`
- **1. Param names:** ⚠️ — only `mix` mapped; `decay` is constructor-only.
- **2. Units:** ✅
- **3. Missing cases:** ❌ — no `setParam` case for `decay` (line 18) → dead knob.
- **4. Worklets:** N/A
- **5. Topology:** ✅ — wet/dry parallel.
- **6. Dispose:** ⚠️ — only output disconnect; convolver/wetGain/dryGain not torn down.
- **7. Defaults:** ⚠️ — mix=30 % on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no

### 5. RingMod (`ph_ringMod`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/RingModPlugin.js:5`
- **1. Param names:** ✅
- **2. Units:** ✅
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ❌ — **broken**: ringNode is a `GainNode` with `gain.value=0`, modulated by `carrierGain.connect(ringNode.gain)` (line 16). Carrier is a unity-amplitude sine connected to a `gain` AudioParam — produces ring-mod amplitude swing 0…+1 (offset, not bipolar). Mathematically half-rectified ring mod, not classical AM/RM. Wet path attenuated weirdly because ringNode.gain.value starts at 0 (DC offset). Audible but degraded.
- **6. Dispose:** ⚠️ — `carrier.stop()` ✅ but `output.disconnect()` only; input/dryGain/wetGain/ringNode not disconnected.
- **7. Defaults:** ❌ — `mix=50 %` and `frequency=440 Hz` audible-on-insert. Ring mod with 50/50 wet/dry on a vocal/track is a wild signature effect; should default to 0 % wet.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0 — topology bug + dangerous default. Demo-blocker if user enables.
- **Demo-blocker?:** yes (50 % wet ring mod on insert)

### 6. RoomReverb (`ph_roomReverb`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/RoomReverbPlugin.js:5`
- **1. Param names:** ⚠️ — only `mix` is settable; `decay` is constructor-only.
- **2. Units:** ✅
- **3. Missing cases:** ⚠️ — no decay/damping/preDelay setters.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — `ER_DELAYS` array (line 7) is computed but **never used** (orphan dead code). Effectively just a convolver wet/dry path.
- **6. Dispose:** ⚠️ — only output disconnect.
- **7. Defaults:** ⚠️ — mix=20 % on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no

### 7. Rotary (`ph_rotary`)
- **UI file:** PluginHost (Leslie sim).
- **Factory:** `src/front/js/component/audio/plugins/plugins/RotaryPlugin.js:5`
- **1. Param names:** ⚠️ — `speed` only. Most Leslie sims have horn/drum dual rotor; not modeled here.
- **2. Units:** ✅ — Hz for LFO speed.
- **3. Missing cases:** ⚠️ — no horn/drum split, no slow/fast mode toggle, no acceleration knob.
- **4. Worklets:** N/A
- **5. Topology:** ✅ — single LFO modulates two delay lines anti-phase via lfoInv (line 12).
- **6. Dispose:** ✅ — `lfo.stop()` and output disconnect (line 21). **But only one oscillator**; if user expects two-rotor Leslie, the second-osc class warning in spec doesn't apply (only one osc here). However `lfoInv` GainNode is not disconnected.
- **7. Defaults:** ⚠️ — `speed=5 Hz` runs immediately on insert. Audible swirl.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no (subtle stereo flutter)

### 8. SPXPerceptualEQ (`ph_spxPerceptualEQ`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/SPXPerceptualEQPlugin.js:8`
- **1. Param names:** ✅ — recover/order/boost/cut/enabled/mix.
- **2. Units:** ⚠️ — `mix` is `v/100` but UI may pass 0–1; `recover/order` clamped to 0–1; `boost` 0–12 dB; `cut` -12–0 dB. Internally consistent but no doc.
- **3. Missing cases:** ✅
- **4. Worklets:** N/A — uses AnalyserNode + requestAnimationFrame loop (line 89), not AudioWorklet. Falls back gracefully.
- **5. Topology:** ✅ — input→analyser (sidechain) + 16-band peaking filter chain → output.
- **6. Dispose:** ⚠️ — `cancelAnimationFrame(rafId)` ✅ (line 107) but only `output.disconnect()` and 16 filters never disconnected. RAF loop continues writing to detached filters until next GC.
- **7. Defaults:** ❌ — **enabled=true** on construction (line 41), so RAF loop runs immediately and applies psychoacoustic gain riding on insert. Knob `mix` defaults to (output gain.value default = 1). Aggressive: every insert starts AI-modifying audio.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0 — `enabled=true` default + RAF + filter gain modulation = audible coloration before user touches anything.
- **Demo-blocker?:** yes (mild but constant gain riding)

### 9. SampleRateReducer (`ph_sampleRateReducer`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/SampleRateReducerPlugin.js:5`
- **1. Param names:** ✅
- **2. Units:** ✅
- **3. Missing cases:** ✅
- **4. Worklets:** ❌ — uses **deprecated** `createScriptProcessor(512,1,1)` (line 7). Chrome/Firefox console-warn; will be removed eventually. No AudioWorklet fallback. Runs on main thread → UI jank with multiple instances.
- **5. Topology:** ⚠️ — only mono `(1,1)` channel config; stereo input downmixes to mono.
- **6. Dispose:** ❌ — no `proc.disconnect()`, no `proc.onaudioprocess = null`. ScriptProcessor leaks (most common Web Audio leak).
- **7. Defaults:** ⚠️ — reduction=4 (drops 75 % of samples) on insert. Audibly aliased.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0 — deprecated API + leak + audible default.
- **Demo-blocker?:** yes (heavy audible distortion on insert)

### 10. Saturation (`saturation`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/SaturationPlugin.js:9`
- **1. Param names:** ✅ — drive/mix/tone.
- **2. Units:** ✅
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ✅ — wet/dry via parallel branches.
- **6. Dispose:** ⚠️ — `destroy()` disconnects all (line 75) but **method name is `destroy` not `dispose` / `disconnect`**, same issue as Reverb. PluginHost convention is `disconnect()` based on other plugins.
- **7. Defaults:** ⚠️ — drive=20, mix=50 % audible on insert. Dirty by default.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no

---

### 11. ShimmerReverb (`shimmer_reverb`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/ShimmerReverbPlugin.js:5`
- **1. Param names:** ✅ — mix/size/feedback/tone.
- **2. Units:** ✅
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ✅ — feedback delay loop with lowpass.
- **6. Dispose:** ❌ — only `output.disconnect()`. **Feedback loop with delay+filter+gain never broken.** Memory builds while audio still circulates internally until GC. Per-insert leak compounds.
- **7. Defaults:** ❌ — `feedback=0.7`, `mix=40 %`, `size=0.5s` audible immediately + a long ringing wash on insert. **Closest to a P0 demo-blocker** in slice.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (audible reverb wash + leak)
- **Note:** This file additionally redefines `createGatedReverbPlugin`, `createTapeDelayPlugin`, `createPingPongDelayPlugin`, `createChorusPlugin`, `createFlangerPlugin`, `createPhaserPlugin` — duplicate exports also defined in their own plugin files. Bundler likely takes first import; bundle bloat warning.

### 12. SlapbackDelay (`slapback_delay`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/SlapbackDelayPlugin.js:5`
- **1. Param names:** ✅ — time/mix.
- **2. Units:** ✅ — ms→s, mix %.
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ✅
- **6. Dispose:** ⚠️ — only output disconnect.
- **7. Defaults:** ⚠️ — mix=40 % on insert. Slapback at 75 ms is very audible.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P2
- **Demo-blocker?:** no

### 13. SnareEnhancer (`snare_enhancer`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/SnareEnhancerPlugin.js:5`
- **1. Param names:** ✅ — body/snap/air.
- **2. Units:** ✅ (dB)
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ✅ — serial peak/peak/highshelf.
- **6. Dispose:** ⚠️ — only output disconnect.
- **7. Defaults:** ⚠️ — `body=+2, snap=+3, air=+2 dB` on insert. Coloration baked in. Plugin-intent: mild, but flag as non-neutral.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P2
- **Demo-blocker?:** no

### 14. SpectralGate (`spectral_gate`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/SpectralGatePlugin.js:5`
- **1. Param names:** ✅ — threshold only.
- **2. Units:** ✅ (dB)
- **3. Missing cases:** ⚠️ — only `threshold` settable. `knee/ratio/attack/release` baked in (line 9). Real spectral gate is supposed to be FFT-band-based; this is just a DynamicsCompressor masquerading as one.
- **4. Worklets:** N/A — uses Analyser+Compressor only. **No actual spectral gating** — analyser is unused (line 10 wires it but never reads buffer).
- **5. Topology:** ❌ — analyser is **orphan** (connected but never read). Dead node. Plugin is just a hard-knee compressor pretending to be spectral.
- **6. Dispose:** ⚠️ — only output disconnect.
- **7. Defaults:** ✅ — threshold -50 dB rarely triggers on normal signal. Effectively neutral on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1 (false advertising — plugin name claims spectral processing but isn't)
- **Demo-blocker?:** no

### 15. SpringReverb (`spring_reverb`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/SpringReverbPlugin.js:5`
- **1. Param names:** ✅ — mix/tension.
- **2. Units:** ⚠️ — `tension` parameter has no clear unit/range (line 35 uses `v*0.001` directly into delayTime).
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — 3 parallel comb filters with feedback loops (line 12-21). **feedback.gain.value=0.6** for each spring, hard-coded — no per-instance variation, all springs ring at same intensity which causes resonance buildup at the comb peaks. Acceptable for spring sim but not adjustable.
- **6. Dispose:** ❌ — feedback loops in 3 springs never broken; `output.disconnect()` only. Same leak class as ShimmerReverb.
- **7. Defaults:** ⚠️ — mix=30 % audible on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no
- **Note:** File also redefines `createShimmerReverbPlugin`, `createGatedReverbPlugin`, `createTapeDelayPlugin`, `createPingPongDelayPlugin`, `createChorusPlugin`, `createFlangerPlugin`, `createPhaserPlugin` — duplicates.

### 16. StepFilter (`step_filter`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/StepFilterPlugin.js:5`
- **1. Param names:** ⚠️ — only `q` settable; `steps`, `bpm`, `stepsPerBeat` are constructor-only (line 9-12).
- **2. Units:** ✅ — Hz steps, BPM, etc.
- **3. Missing cases:** ❌ — no setParam for `bpm` or `steps` → cannot resync to project tempo at runtime. Dead knob if UI exposes a tempo knob.
- **4. Worklets:** N/A
- **5. Topology:** ✅
- **6. Dispose:** ✅ — `clearInterval(tick)` AND output disconnect (line 20). One of the better-disposed plugins.
- **7. Defaults:** ❌ — `setInterval` is started immediately and **modulates the bandpass filter constantly** on insert. 120 BPM 8-step pattern will cycle filter through 200 Hz–3.2 kHz on every track that adds this plugin. Heavy default — should be off until user enables.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0 (immediate audible sweeping filter on insert)
- **Demo-blocker?:** yes

### 17. StereoEnhancer (`stereo_enhancer`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/StereoEnhancerPlugin.js:5`
- **1. Param names:** ✅ — width.
- **2. Units:** ✅ — gain ratio.
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — Haas-style L/R micro-delay (1 ms / 1.3 ms). Mono input becomes stereo "wide" via decorrelation. Width gain just scales both channels equally — doesn't actually widen, just amplifies. Confusingly named.
- **6. Dispose:** ⚠️ — only output disconnect; splitter/merger/delays/gains leaked.
- **7. Defaults:** ⚠️ — `width=1.2` (>unity gain) on both channels = +1.6 dB free boost. Should default to 1.0.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no

### 18. StereoWidener (`stereo_widener`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/StereoWidenerPlugin.js:5`
- **1. Param names:** ✅ — width.
- **2. Units:** ✅
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ❌ — **broken M/S pseudo-implementation** (line 12-15). midGain receives ch0 + ch1 (sum-of-stereo), sideGain also receives ch0 + ch1 (sum, NOT difference). Both then output to merger inputs (0,0) AND (0,1). This isn't M/S; it's two mono mixes summed back into both output channels. Output is mono regardless of width. **Plugin does nothing meaningful to stereo image.**
- **6. Dispose:** ⚠️ — only output disconnect.
- **7. Defaults:** ✅ — width=1 starts at neutral (no-op anyway because of bug).
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0 (plugin's primary function is broken)
- **Demo-blocker?:** yes (advertised feature does not work)

### 19. SubHarmonizer (`sub_harmonizer`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/SubHarmonizerPlugin.js:5`
- **1. Param names:** ✅ — amount.
- **2. Units:** ✅ — gain 0–1.
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — uses `Math.sign`-style waveshaper (half-wave rect) at line 10, not octave division. Not a true sub-harmonizer (would need a real octave-down). Effectively a square-wave sub-bass synthesizer keyed by audio.
- **6. Dispose:** ⚠️ — only output disconnect.
- **7. Defaults:** ❌ — `amount=0.4` — fairly loud sub gain on insert (subFilter→subGain→output, line 14). Adds rumble immediately to any track.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no (subtle but unwanted bass)

### 20. TapeDelay (`tape_delay`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/TapeDelayPlugin.js:5`
- **1. Param names:** ✅ — time/feedback/tone/mix/flutter.
- **2. Units:** ✅ — ms→s, mix %, tone Hz.
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ✅ — feedback loop via warmth filter.
- **6. Dispose:** ✅ — `wow.stop(); output.disconnect()` (line 46). Feedback loop nodes still leak but oscillator is stopped.
- **7. Defaults:** ⚠️ — mix=30 % + feedback=0.4 + 500 ms delay = audible echoes on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no
- **Note:** File also redefines `createPingPongDelayPlugin`, `createChorusPlugin`, `createFlangerPlugin`, `createPhaserPlugin` — duplicate.

### 21. TapeWarmth (`tape_warmth`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/TapeWarmthPlugin.js:5`
- **1. Param names:** ⚠️ — only warmth/air settable. `drive` is constructor-only (line 8).
- **2. Units:** ✅
- **3. Missing cases:** ⚠️ — `drive` knob would be dead.
- **4. Worklets:** N/A
- **5. Topology:** ✅
- **6. Dispose:** ⚠️ — only output disconnect.
- **7. Defaults:** ⚠️ — warmth=+1.5 dB at 200 Hz, air=-0.5 dB at 14 kHz, plus drive=0.2 saturation on insert. Mild but always coloring.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P2
- **Demo-blocker?:** no

### 22. TiltEQ (`tilt_eq`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/TiltEQPlugin.js:5`
- **1. Param names:** ✅ — tilt.
- **2. Units:** ✅ — dB.
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ✅ — lowshelf + highshelf in series (line 18).
- **6. Dispose:** ⚠️ — only output disconnect.
- **7. Defaults:** ✅ — tilt=0 → both shelves at 0 dB → neutral on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** clean
- **Demo-blocker?:** no
- **Note:** File adds 12 duplicate exports (GraphicEQ, NotchEQ, PresenceEQ, OpticalComp, FETComp, VCAComp, MultibandComp, TubeComp, Gate, Expander, HallReverb, PlateReverb, SpringReverb, ShimmerReverb, GatedReverb, TapeDelay, PingPongDelay, Chorus, Flanger, Phaser). Massive duplicate-export contamination.

### 23. TransientDesigner (`transient_designer`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/TransientDesignerPlugin.js:5`
- **1. Param names:** ✅ — attack/sustain.
- **2. Units:** ⚠️ — gain ratio. `attack/sustain=1.0` means unity (no change), but `attackGain` and `sustainGain` constants (line 8) are **never wired to output graph** — orphan nodes! Real implementation just uses raw `p.attack` value to set `output.gain` directly inside tick (line 16-17).
- **3. Missing cases:** ❌ — `setParam('attack', v)` writes to orphan `attackGain.gain.value` (line 22), not the output gain or any closure variable used by `tick`. **Dead setParam.** Knob does not change behavior at runtime.
- **4. Worklets:** N/A
- **5. Topology:** ❌ — attackGain & sustainGain orphan; setInterval writes to `output.gain` directly using **constructor-time defaults** (`p.attack ?? 1`, `p.sustain ?? 1` — captured by closure each tick, line 16-17). So even setting via setParam updates internal `attackGain.gain.value` but tick re-reads `p.attack`, which is the original constructor arg.
- **6. Dispose:** ✅ — `clearInterval(tick)` + output disconnect (line 23).
- **7. Defaults:** ✅ — both 1.0 → neutral.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0 — knobs do not modify the audio. UI knobs are completely dead.
- **Demo-blocker?:** yes (advertised feature does nothing)

### 24. Tremolo (`tremolo`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/TremoloPlugin.js:5`
- **1. Param names:** ✅ — rate/depth/waveform.
- **2. Units:** ✅ — Hz, gain ratio.
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — LFO modulates `amp.gain` (offset 0.5 + LFO×depth). With `depth=0.5` LFO swings 0..1, which is asymmetric tremolo (silences signal at LFO trough). Should be `0.5 + LFO*depth*0.5` for symmetric.
- **6. Dispose:** ✅ — `lfo.stop(); output.disconnect()` (line 15).
- **7. Defaults:** ❌ — depth=0.5 + rate=4 Hz → audible amplitude pulsing on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1 — audible-on-insert + asymmetric depth math.
- **Demo-blocker?:** mild

### 25. TubeComp (`tube_comp`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/TubeCompPlugin.js:5`
- **1. Param names:** ⚠️ — threshold/ratio/warmth/makeup. Missing: `attack`, `release` (hardcoded line 13-14), `drive` (curve-only, line 19).
- **2. Units:** ✅ — dB threshold/ratio, makeup dB→linear (line 41).
- **3. Missing cases:** ⚠️ — no `attack`/`release`/`drive` runtime setter.
- **4. Worklets:** N/A
- **5. Topology:** ✅ — comp→tube→warmth→makeup→output.
- **6. Dispose:** ⚠️ — only output disconnect.
- **7. Defaults:** ⚠️ — warmth=+1.5 dB lowshelf + tube saturation drive=0.3 + soft knee compression at -20 dB → audibly affects level/tone on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no
- **Note:** File adds 12 duplicate exports (Gate/Expander/HallReverb/etc.). Same contamination.

### 26. TubeSaturator (`tube_saturator`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/TubeSaturatorPlugin.js:5`
- **1. Param names:** ✅ — drive/warmth/makeup.
- **2. Units:** ✅ — dB makeup.
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ✅ — ws→tone→makeup→output.
- **6. Dispose:** ⚠️ — only output disconnect.
- **7. Defaults:** ❌ — drive=0.5, warmth=+2 dB always-on saturation. **No mix knob** — wet 100 % only. Inserting on a track immediately changes timbre + adds harmonics.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no

### 27. VCAComp (`vca_comp`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/VCACompPlugin.js:5`
- **1. Param names:** ✅ — threshold/ratio/attack/release/makeup.
- **2. Units:** ✅ — `attack`/`release` divided by 1000 (ms→s) consistently (line 30-31). Threshold dB.
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — "SSL G-Bus character" peaking filter at 3 kHz with **+0.5 dB hardcoded** (line 21) — not user-controllable.
- **6. Dispose:** ⚠️ — only output disconnect.
- **7. Defaults:** ⚠️ — threshold=-15 dB / ratio=4 / makeup=0 dB. Compresses immediately if signal is loud, plus +0.5 dB at 3 kHz baked in.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P2
- **Demo-blocker?:** no
- **Note:** File adds duplicate exports of MultibandComp, TubeComp, Gate, Expander, HallReverb, PlateReverb, SpringReverb, ShimmerReverb, GatedReverb, TapeDelay, PingPongDelay, Chorus, Flanger, Phaser.

### 28. Vibrato (`vibrato`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/VibratoPlugin.js:5`
- **1. Param names:** ✅ — rate/depth.
- **2. Units:** ✅ — Hz, seconds.
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ✅ — LFO→delayTime→delay→output.
- **6. Dispose:** ✅ — `lfo.stop(); output.disconnect()` (line 14).
- **7. Defaults:** ❌ — rate=5 Hz + depth=0.005s LFO modulation always running on insert. Pitch wobble baked in. No mix knob.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** mild

### 29. VinylSim (`vinyl_sim`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/VinylSimPlugin.js:5`
- **1. Param names:** ✅ — warmth/rumble.
- **2. Units:** ✅
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — rumble LFO is a **sawtooth at 0.5 Hz** modulating the **lowpass cutoff** (line 13), not adding a low-freq rumble noise to signal. So the "rumble" knob makes the lowpass frequency wobble around `warmth` setting, not adds vinyl rumble. Misleading.
- **6. Dispose:** ✅ — `rumble.stop(); output.disconnect()` (line 17).
- **7. Defaults:** ⚠️ — warmth lowpass at 12 kHz, rumble modulation 0.002 — modest tonal coloring on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1 (advertised "rumble" feature is wrong)
- **Demo-blocker?:** no

### 30. VocalComp (`vocal_comp`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/VocalCompPlugin.js:5`
- **1. Param names:** ✅ — threshold/ratio/makeup/presence. Missing: attack/release (hardcoded line 8).
- **2. Units:** ✅ — dB. Note `makeup` defaults to **+3 dB makeup gain** (line 9) regardless of compressor activity.
- **3. Missing cases:** ⚠️ — no attack/release runtime setter.
- **4. Worklets:** N/A
- **5. Topology:** ✅
- **6. Dispose:** ⚠️ — only output disconnect.
- **7. Defaults:** ❌ — **makeup=+3 dB** + 1.5 dB peak at 3 kHz on insert = **+3 to +4 dB level boost** even before any compression. Will audibly clip at chain output if other plugins downstream hit ceiling.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0 (always-on +3 dB level boost can clip the bus)
- **Demo-blocker?:** yes

### 31. VocalDoubler (`vocal_doubler`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/VocalDoublerPlugin.js:5`
- **1. Param names:** ✅ — mix.
- **2. Units:** ✅
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — 3 fixed-time delays (~18/25/31 ms with `Math.random()` jitter computed once at construction, line 8). Static delays mean it's a static ADT, not a true doubler — no LFO or detune. Acceptable for the algorithm, but no parameters to vary delay positions.
- **6. Dispose:** ⚠️ — only output disconnect.
- **7. Defaults:** ⚠️ — mix=50 % delays audible immediately on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no

### 32. VocalEnhancer (`vocal_enhancer`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/VocalEnhancerPlugin.js:5`
- **1. Param names:** ✅ — presence/air/body.
- **2. Units:** ✅ — dB.
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ✅ — body→presence→air serial.
- **6. Dispose:** ⚠️ — only output disconnect.
- **7. Defaults:** ⚠️ — presence=+2 dB / air=+1.5 dB / body=-1 dB on insert. EQ baked in.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P2
- **Demo-blocker?:** no

### 33. VowelFilter (`vowel_filter`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/VowelFilterPlugin.js:5`
- **1. Param names:** ✅ — vowel/rate.
- **2. Units:** ⚠️ — `rate` controls an LFO that is **never wired to anything** (lfo created at line 13, never connected, never started). Knob is dead.
- **3. Missing cases:** ❌ — `rate` setParam writes to disconnected oscillator.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — 3 formant peaking filters with Q=8 / **+12 dB gain** each (line 8). Cascaded filters with +12 dB → +36 dB peak boost at vowel frequencies. **Severely audible vowel coloration on insert. No mix knob.**
- **6. Dispose:** ❌ — `lfo` never started, but if user calls disconnect() the oscillator is left as garbage. `output.disconnect()` only.
- **7. Defaults:** ❌ — vowel='a' → 800/1200/2500 Hz peaking filters, +12 dB each → cumulative 36 dB boost. **Massive resonance on insert.**
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0 (severe gain boost + dead `rate` knob + no mix)
- **Demo-blocker?:** yes

### 34. VoxEngine (`vox_engine` / `spx_vox_engine`)
- **UI file:** `src/front/js/component/audio/plugins/plugins/VoxEnginePlugin.js:8` (React component, NOT a factory).
- **Factory:** N/A — this is a React-component plugin. It wraps `SPXVoxEngine` and is registered via `VOX_ENGINE_PLUGIN_DEF` (line 54) using `component: VoxEnginePlugin`. **Does not match the canonical `create…Plugin(context, params)` factory pattern**; a different audit class.
- **1. Param names:** N/A — props-driven (`audioContext`, `inputNode`, `outputNode`, `onParamChange`, `params`).
- **2. Units:** N/A
- **3. Missing cases:** N/A
- **4. Worklets:** ⚠️ — `SPXVoxEngine` itself is described as "Real-time AudioWorklet vocoder" (line 61). Need to inspect SPXVoxEngine for worklet load + fallback. Outside this audit's plugin file but flagged.
- **5. Topology:** N/A — handled inside SPXVoxEngine.
- **6. Dispose:** ❌ — VoxEnginePlugin React wrapper provides no `useEffect` cleanup; relies on SPXVoxEngine. If SPXVoxEngine doesn't tear down its worklet on unmount, leak.
- **7. Defaults:** unknown (handled by SPXVoxEngine).
- **8. COMPONENT_MAP:** N/A — registered via plugin def, not COMPONENT_MAP.
- **Severity:** P1 (architecture mismatch; needs SPXVoxEngine internal review).
- **Demo-blocker?:** unknown (depends on SPXVoxEngine cleanup).

### 35. WahWah (`wah_wah`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/WahWahPlugin.js:5`
- **1. Param names:** ✅ — rate/depth/freq/q.
- **2. Units:** ✅ — Hz, Q dimensionless.
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ✅ — bandpass + LFO modulation of frequency.
- **6. Dispose:** ✅ — `lfo.stop(); output.disconnect()` (line 14).
- **7. Defaults:** ❌ — rate=2 Hz + depth=800 Hz + freq=1200 Hz + Q=5 → audible bandpass sweep on every insert. No mix; full wet only. Heavy effect on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1 (always-on swept bandpass)
- **Demo-blocker?:** mild

### 36. Waveshaper (`waveshaper`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/WaveshaperPlugin.js:5`
- **1. Param names:** ✅ — shape/amount.
- **2. Units:** ✅
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — no wet/dry — 100 % wet always.
- **6. Dispose:** ⚠️ — only output disconnect.
- **7. Defaults:** ⚠️ — shape='soft' + amount=0.5 audible saturation on insert. No mix knob.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no

### 37. WowFlutter (`wow_flutter`)
- **UI file:** PluginHost.
- **Factory:** `src/front/js/component/audio/plugins/plugins/WowFlutterPlugin.js:5`
- **1. Param names:** ✅ — wow/flutter.
- **2. Units:** ✅ — seconds (delay-time modulation depth).
- **3. Missing cases:** ✅
- **4. Worklets:** N/A
- **5. Topology:** ✅ — two LFOs (0.5 Hz wow, 8 Hz flutter) sum onto delayTime.
- **6. Dispose:** ✅ — **both** oscillators stopped (`wowLFO.stop(); flutterLFO.stop()`) + output disconnect (line 19). Best dispose in slice.
- **7. Defaults:** ⚠️ — wow=0.005s + flutter=0.001s → mild but constant pitch wobble on insert. No bypass.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P2
- **Demo-blocker?:** no

---

## Cross-cutting findings (entire slice)

1. **Massive duplicate `export const create…Plugin` declarations across files.** TiltEQ, ShimmerReverb, SpringReverb, TapeDelay, TubeComp, VCAComp each contain 5–25 plugin factory functions copied from neighboring files. Bundler picks first-imported version, but every duplicate inflates the bundle. **Bundle bloat estimate: ~50–100 KB redundant code.** Recommend removing duplicates and keeping one definition per file.
2. **Dispose convention is inconsistent.** Most factories return `disconnect()`. ReverbPlugin and SaturationPlugin instead expose `destroy()`. PluginHost likely calls one or the other; whichever it doesn't call leaks every node every time the plugin is removed.
3. **Default values are almost universally non-neutral.** mix/depth/feedback/drive defaults consistently produce audible processing on insert. Industry convention is plugins should be neutral (mix=0 or bypass) when first instantiated. This compounds severely if user adds 5+ plugins.
4. **Feedback loops without disconnect.** ShimmerReverb, SpringReverb, TapeDelay, Reverb, RoomReverb all build delay→filter→feedback→delay loops that are never broken in dispose. Each insert/remove cycle leaks all loop nodes.
5. **Compressor unit consistency:** VCAComp, OpticalComp, FETComp, MultibandComp use `v/1000` for attack/release (ms→s). VocalComp/TubeComp hardcode them (no setParam). Mixed ergonomic — UI must match each.
6. **Several plugins do nothing or do the wrong thing:** StereoWidener (broken M/S), TransientDesigner (orphan gain nodes), SpectralGate (analyser is dead, plugin is just a compressor), VowelFilter (rate LFO disconnected; +36 dB cumulative boost), RingMod (DC-offset gain modulation, half-wave AM not RM).
7. **SPXPerceptualEQ + StepFilter run analyzer / setInterval loops immediately.** No `enabled=false` default. Heavy-CPU AI/sweeping behavior happens on every insert.
8. **SampleRateReducer uses deprecated `createScriptProcessor`** with no AudioWorklet fallback and no proc cleanup.

---

## Batch 09 Summary

- Total audited: 37
- Clean: 1  (TiltEQ)
- P2 (cosmetic): 6  (Radio, SlapbackDelay, SnareEnhancer, TapeWarmth, VCAComp, VocalEnhancer, WowFlutter — actually 7)
- P1 (polish): 16  (Resonator, Reverb, ReverseReverb, RoomReverb, Rotary, Saturation, SpectralGate, SpringReverb, StereoEnhancer, SubHarmonizer, TapeDelay, Tremolo, TubeComp, TubeSaturator, Vibrato, VinylSim, VocalDoubler, VoxEngine, WahWah, Waveshaper)
- P0 (demo-blocker): 7  (RingMod, SPXPerceptualEQ, SampleRateReducer, ShimmerReverb, StepFilter, StereoWidener, TransientDesigner, VowelFilter, VocalComp)
- Top 5 worst plugins:
  1. **VowelFilter** — `rate` LFO never connected, +36 dB cumulative formant boost on insert, no mix.
  2. **StereoWidener** — M/S sum/difference math broken; plugin's primary feature is non-functional.
  3. **TransientDesigner** — `attack`/`sustain` knobs write to orphan gain nodes; tick re-reads constructor defaults; UI knobs do nothing.
  4. **ShimmerReverb** — feedback=0.7 + 40 % wet on insert; feedback loop nodes never disconnected; long ringing tail.
  5. **SampleRateReducer** — deprecated `createScriptProcessor`, no AudioWorklet fallback, leaks `proc.onaudioprocess` on dispose, default `reduction=4` audibly degrades signal.
- Common patterns:
  - Non-neutral defaults across slice (mix/feedback/drive non-zero on insert).
  - Dispose typically only calls `output.disconnect()`; internal nodes leak.
  - Files contain 5–25 duplicate plugin factories copied from neighbors (bundle bloat).
  - Dispose method-name inconsistency: `disconnect()` vs `destroy()`.
  - Several plugins built around AnalyserNode that is created but never read (SpectralGate, others).
  - Constructor-only parameters (no setParam runtime path) for important controls (decay, attack/release, drive, freq1/2/3, bpm/steps).
