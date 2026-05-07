# Batch 08 — ph_* PluginHost factories: H through P

Auditor #8. Scope: 29 ph_* factories (HaasEffect → PresenceEQ).
Convention: COMPONENT_MAP gap (bug class 8) is N/A for ph_* engines (PluginHost
renders these via WAMPluginHost / registry.js, not SPX windows).

UI rendering for these is generic (registry.js → params → knob bank). Per-plugin
UI files are not separate — all rendered uniformly through PluginHost. Param-name
matching (bug class 1) compares **registry.js param `id`** vs **factory
`setParam` cases**.

Note on duplicated factory exports: `HallReverbPlugin.js` and a few peers
contain stale duplicate exports of other plugin factories (PlateReverb,
PingPongDelay, Chorus, Flanger, Phaser, etc.). These duplicates are dead code:
PluginHost.js imports each factory from its own dedicated file.

---

### 1. HaasEffect (`haas_effect`)
- **UI file:** generic registry-driven (no dedicated UI file)
- **Factory:** `src/front/js/component/audio/plugins/plugins/HaasEffectPlugin.js`
- **1. Param names:** ❌ — registry params are `delay`, `width`, `mix`; factory only handles `delay` (line 15). `width` and `mix` are silent dead knobs.
- **2. Units:** ✅ — delay ms→s conversion correct (`v/1000` line 15).
- **3. Missing cases:** ❌ — `width` (no case), `mix` (no case). Two of three knobs dead.
- **4. Worklets:** N/A — no AudioWorkletNode usage.
- **5. Topology:** ⚠️ — splitter/delay/merger forms a Haas pair, but no wet/dry mix gain. Mix knob can't function even if cased.
- **6. Dispose:** ❌ — no dispose/destroy method. Returned `disconnect` only disconnects output (line 16). Internal splitter/delay/merger leak per insert.
- **7. Defaults:** ⚠️ — registry default delay 15ms vs factory default 20ms (line 9) — inconsistent. Effect is permanently 100% wet.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (mix and width knobs are dead)

### 2. HallReverb (`hall_reverb`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/HallReverbPlugin.js`
- **1. Param names:** ⚠️ — registry: decay/preDelay/mix/damping/diffusion/earlyLevel. Factory cases: `mix`, `damping`, `preDelay`. `decay`, `diffusion`, `earlyLevel` dead (decay used at construction only; diffusion/earlyLevel never wired).
- **2. Units:** ✅ — preDelay ms→s, damping Hz, mix /100, decay s. All consistent.
- **3. Missing cases:** ❌ — 3 of 6 knobs dead.
- **4. Worklets:** N/A
- **5. Topology:** ✅ — dry/wet path with preDelay→convolver→damping→wet. Convolver buffer assigned at construction (line 55).
- **6. Dispose:** ❌ — no dispose; only output.disconnect. IR buffer (sr * decay samples, ~1.4MB stereo at 4s/44.1kHz) leaks per insert/remove.
- **7. Defaults:** ⚠️ — mix=30% audible on insert; decay=4s creates long tail. Reasonable for reverb but not neutral.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no (dominant knobs work)

### 3. HarmonicExciter (`harmonic_exciter`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/HarmonicExciterPlugin.js`
- **1. Param names:** ❌ — registry: freq/drive/even/odd/mix. Factory cases: `amount`, `freq`. `drive`, `even`, `odd`, `mix` dead. Factory uses `amount` which is not a registry param.
- **2. Units:** ⚠️ — registry mix is %; factory has no mix. exciteGain default reads `p.amount??0.3` (line 12) — never matches anything from registry.
- **3. Missing cases:** ❌ — 4 of 5 knobs dead.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — parallel dry+excited path (always 100% dry + variable excite gain), no mix knob.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ⚠️ — exciteGain default 0.3 → audible HF coloration on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (4 of 5 knobs silent)

### 4. Harmonizer (`harmonizer`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/HarmonizerPlugin.js`
- **1. Param names:** ❌ — registry: shift1/shift2/mix/formant. Factory only handles `voiceN` (voice0/voice1/voice2). NONE of the registry knobs map.
- **2. Units:** N/A — no params actually wire.
- **3. Missing cases:** ❌ — all 4 registry params dead.
- **4. Worklets:** N/A — uses delays+allpass placeholder (no real pitch shift).
- **5. Topology:** ⚠️ — 3 voices fixed at semitones [-7, 0, 5] internally with no actual pitch shift (just delays+allpass). Engine doesn't harmonize — just smears.
- **6. Dispose:** ❌ — no cleanup; allpass/delay/gain nodes leak per voice.
- **7. Defaults:** ⚠️ — voice gains default 0.4 each → audible smear/comb on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (no UI control connects; engine isn't actually a harmonizer)

### 5. HiHatShimmer (`hi_hat_shimmer`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/HiHatShimmerPlugin.js`
- **1. Param names:** ❌ — registry: freq/drive/mix. Factory cases: `shimmer`, `air`, `hpf`. Zero overlap.
- **2. Units:** N/A — no overlap.
- **3. Missing cases:** ❌ — freq, drive, mix all silent.
- **4. Worklets:** N/A
- **5. Topology:** ✅ — hpf→shimmer peak→air shelf→output (no wet/dry).
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ⚠️ — shimmer +3dB and air +2dB default → tonal change on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (entire panel is dead)

### 6. KickEnhancer (`kick_enhancer`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/KickEnhancerPlugin.js`
- **1. Param names:** ❌ — registry: punch/sub/click/mix. Factory cases: `sub`, `click`. `punch`, `mix` dead.
- **2. Units:** ✅ — registry sub/click are dB; factory writes to peaking-filter gain (dB) — units match.
- **3. Missing cases:** ❌ — punch, mix dead.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — sub→click→comp chain; no wet/dry, no `punch` node — knob has nowhere to land.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ⚠️ — sub +4dB, click +3dB plus comp threshold -12dB → audible coloration + level reduction on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no (2 of 4 knobs work)

### 7. Limiter (`limiter`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/LimiterPlugin.js`
- **1. Param names:** ⚠️ — registry: ceiling/release/lookahead. Factory cases: ceiling/release/drive. `lookahead` registry param has no case (no actual lookahead implemented). `drive` is orphan in factory.
- **2. Units:** ✅ — ceiling dB, release ms→s, drive dB→linear all correct.
- **3. Missing cases:** ⚠️ — `lookahead` dead; `drive` orphan.
- **4. Worklets:** ✅ — uses DynamicsCompressorNode (ratio 20, attack 1ms), no AudioWorkletNode. No worklet fallback needed.
- **5. Topology:** ⚠️ — returns `node`/`inputNode`=driveGain and `outputNode`=limiter (not `output`). API style differs from peers (no `connect`/`disconnect` exposed). PluginHost may not see output correctly.
- **6. Dispose:** ✅ — `destroy()` disconnects driveGain and limiter (lines 50-53), guarded with try/catch. Best in batch.
- **7. Defaults:** ✅ — ceiling -0.3dBTP, drive 0dB, release 50ms — neutral on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no (works as a limiter; lookahead silent)

### 8. LinearPhaseEQ (`linear_phase_e_q`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/LinearPhaseEQPlugin.js`
- **1. Param names:** ❌ — registry: lowGain/lowFreq/midGain/midFreq/highGain/highFreq (3-band). Factory cases: only `freq`, `gain`, `q` (single peaking filter). NONE of the 6 registry knobs map.
- **2. Units:** N/A — no overlap.
- **3. Missing cases:** ❌ — all 6 registry params dead.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — single peaking biquad + 1 allpass (does not implement linear-phase or 3-band). Misleading name and structure.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ✅ — gain 0dB so neutral on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (entire UI is dead)

### 9. Looper (`looper`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/LooperPlugin.js`
- **1. Param names:** ❌ — registry: length/speed/mix/feedback. Factory only handles `record`, `play` (booleans). All 4 registry params dead. Registry has no record/play exposure.
- **2. Units:** N/A
- **3. Missing cases:** ❌ — length/speed/mix/feedback dead; record/play not in registry.
- **4. Worklets:** ❌ — uses **deprecated** `ScriptProcessorNode` (line 10) instead of AudioWorkletNode. No fallback. Will warn in modern browsers.
- **5. Topology:** ❌ — `input.connect(proc); proc.connect(output); input.connect(output)` (line 12) — input is summed dry into output AND through proc passthrough → signal doubled. On play, source also adds → triple-summed during playback.
- **6. Dispose:** ❌ — no dispose. `recordedBuffer`, `source`, `proc` all leak. Recording array `rec` (line 9) accumulates forever during recording — unbounded memory growth.
- **7. Defaults:** ⚠️ — feedback=100%, mix=100% in registry → if wired, runaway feedback.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (deprecated API + leaks + dead UI)

### 10. LoudnessMaximizer (`loudness_maximizer`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/LoudnessMaximizerPlugin.js`
- **1. Param names:** ❌ — registry: ceiling/loudness/transient. Factory cases: `threshold`, `gain`. None match.
- **2. Units:** ⚠️ — `gain` factory case is dB→linear (correct math), but registry has no `gain` knob.
- **3. Missing cases:** ❌ — ceiling/loudness/transient dead.
- **4. Worklets:** N/A — does not use spx-limiter worklet; uses 2-stage DynamicsCompressorNode chain. No worklet fallback needed.
- **5. Topology:** ✅ — comp→makeup→ceiling chain reasonable for a maximizer.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ⚠️ — threshold=-12dB, gain=+6dB makeup → audible level boost on insert. Not neutral.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (registry knobs don't connect)

### 11. MasteringEQ (`mastering_e_q`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/MasteringEQPlugin.js`
- **1. Param names:** ⚠️ — registry: sub/low/lowMid/highMid/high/air. Factory cases: low/lowMid/highMid/high/air (5 of 6). `sub` (registry HPF gain) has no case — factory's `sub` is fixed HPF at 20Hz.
- **2. Units:** ✅ — all gains in dB, factory writes directly to peaking/shelf gain.
- **3. Missing cases:** ⚠️ — `sub` dead.
- **4. Worklets:** N/A
- **5. Topology:** ✅ — sub HPF → low → lowMid → highMid → high → air → output. Clean chain.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ✅ — all gains 0dB → neutral on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P2
- **Demo-blocker?:** no (5 of 6 knobs work, neutral default)

### 12. MidSideBalance (`mid_side_balance`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/MidSideBalancePlugin.js`
- **1. Param names:** ❌ — registry: midGain/sideGain/width. Factory cases: `mid`, `side`. None match exactly.
- **2. Units:** ❌ — registry midGain/sideGain are dB (-12..+12); factory writes to gain directly (linear). UI 0dB → factory gain 0 → mute. Unit mismatch.
- **3. Missing cases:** ❌ — `width` knob dead; midGain/sideGain mis-named.
- **4. Worklets:** N/A
- **5. Topology:** ❌ — splitter→midGain (both channels mixed) AND splitter→sideGain (both channels mixed); both feed both merger inputs. This is NOT mid/side encoding (would need M=(L+R)/2, S=(L-R)/2 then re-encode). Routes left and right through both gains in parallel. Audibly broken.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ⚠️ — mid=1, side=1 default → unity but topology is wrong.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (M/S routing is broken; not a real M/S processor)

### 13. MidSideEQ (`mid_side_e_q`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/MidSideEQPlugin.js`
- **1. Param names:** ❌ — registry: midLow/midHigh/sideLow/sideHigh. Factory cases: midFreq/midGain/sideFreq/sideGain. NONE match.
- **2. Units:** N/A — names mismatched.
- **3. Missing cases:** ❌ — all 4 registry params dead.
- **4. Worklets:** N/A
- **5. Topology:** ❌ — splitter ch0 → midEQ → merger ch0; splitter ch1 → sideEQ → merger ch1. This is L/R routing, NOT mid/side. No M/S encode/decode at all.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ✅ — gains 0dB neutral on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (UI dead, topology not actually M/S)

### 14. MidSideProcessor (`mid_side_processor`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/MidSideProcessorPlugin.js`
- **1. Param names:** ❌ — registry: encode/midGain/sideGain. Factory cases: `mid`, `side`. None match. `encode` knob dead.
- **2. Units:** ❌ — registry midGain/sideGain dB; factory writes linear.
- **3. Missing cases:** ❌ — encode/midGain/sideGain all dead.
- **4. Worklets:** N/A
- **5. Topology:** ❌ — same broken splitter-mixed-into-both topology as MidSideBalance. Not real M/S.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ⚠️ — unity gains but routing wrong.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (duplicate broken M/S; same code as MidSideBalance)

### 15. MonoMaker (`mono_maker`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/MonoMakerPlugin.js`
- **1. Param names:** ❌ — registry: freq, phase. Factory `setParam: ()=>{}` — no-op.
- **2. Units:** N/A
- **3. Missing cases:** ❌ — both knobs dead.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — sums L+R via splitter→single mixGain (0.5)→both merger channels. Always-on full mono of all frequencies. There's no frequency split; the registry's `freq` (which should mono-only-below-X) is fictional.
- **6. Dispose:** ❌ — no dispose (returns no-op `disconnect`-like callable but no internal cleanup).
- **7. Defaults:** ❌ — Forces mono summation immediately on insert without any UI control. Audible loss of stereo — this is a high-risk default for mastering scenarios.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (irreversibly mono-sums on insert; no UI control)

### 16. MultibandComp (`multiband_comp`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/MultibandCompPlugin.js`
- **1. Param names:** ❌ — registry: xover1/xover2/xover3/compLow/compMid/compHigh. Factory cases: crossover1/crossover2 + threshold0..2/ratio0..2. `xover3` has no case; xover1/xover2 mis-named (registry uses `xover1`, factory expects `crossover1`); compLow/compMid/compHigh not present at all.
- **2. Units:** ⚠️ — registry compLow etc. are 0..1 (mapped to threshold? unclear); factory expects threshold0..2 in dB. Unit + name mismatch.
- **3. Missing cases:** ❌ — all 6 registry knobs effectively dead due to name mismatch.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — Linkwitz-Riley-style 3-band split via lowpass+highpass+lowpass+highpass cascade + 3 compressors → merger gain. Bands overlap (crossover slope only 12dB/oct via single biquad) but routing is reasonable. 3-band path exists but mid band routing has bug: `hpf1.connect(lpf2)` then `lpf2.connect(comps[1])` AND `hpf1.connect(hpf2)` — hpf1 feeds both lpf2 AND hpf2 (correct); but hpf2 only goes to comps[2], so high band sums correctly.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ⚠️ — thresholds default -18dB → audible compression on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (UI knobs name-mismatched; effectively all dead)

### 17. MultitapDelay (`multitap_delay`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/MultitapDelayPlugin.js`
- **1. Param names:** ❌ — registry: tap1/tap2/tap3/feedback/mix. Factory only has `feedback` case (which is empty body line 17). All 5 knobs effectively dead.
- **2. Units:** N/A
- **3. Missing cases:** ❌ — all knobs.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — 4 hardcoded taps at [125, 250, 375, 500] ms (not 3 like registry). No feedback path — tap delays don't loop back. Dry path always 0.7.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ⚠️ — taps audible on insert (registry default mix=30 ignored).
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (entire panel dead, body of feedback case is empty `forEach((t,i)=>{})`)

### 18. NotchEQ (`notch_e_q`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/NotchEQPlugin.js`
- **1. Param names:** ⚠️ — registry: freq/q/gain. Factory cases: freq/q. `gain` dead (a true notch has fixed -∞ at f0; gain knob is conceptually a depth control but not implemented).
- **2. Units:** ✅ — Hz, Q dimensionless.
- **3. Missing cases:** ⚠️ — `gain` dead.
- **4. Worklets:** N/A
- **5. Topology:** ✅ — single notch biquad in series.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ✅ — notch is the very identity of "cuts at freq"; default Q=10 freq=1000Hz removes a narrow band on insert. Borderline "audible default" but user-expected for notch.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P2
- **Demo-blocker?:** no (freq+q work, gain dead but matters less for fixed notch)

### 19. Octaver (`octaver`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/OctaverPlugin.js`
- **1. Param names:** ❌ — registry: oct1/oct2/mix1/mix2/dry. Factory cases: dry/octDown/octUp. `oct1`, `oct2`, `mix1`, `mix2` dead.
- **2. Units:** N/A — names mismatched.
- **3. Missing cases:** ❌ — 4 of 5 dead.
- **4. Worklets:** N/A — would need granular engine for true octave shift; uses passthrough gains.
- **5. Topology:** ❌ — `octDownGain` and `octUpGain` are just gain stages on the dry input — no actual pitch shift. SubOsc (line 10) is created with gain=0 and never goes anywhere (orphan node, line 11-12). Octaver does nothing audible different from gain.
- **6. Dispose:** ⚠️ — `subOsc.stop()` called in disconnect (line 17), but other gain nodes leak.
- **7. Defaults:** ⚠️ — octDown=0.5 default → if it actually shifted pitch, would be audible.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (fake octaver — no pitch shift; UI dead)

### 20. OpticalComp (`optical_comp`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/OpticalCompPlugin.js`
- **1. Param names:** ❌ — registry: peakReduction/gainControl/tubeSat/mix. Factory cases: threshold/ratio/attack/release/makeup. NONE match.
- **2. Units:** N/A — no overlap.
- **3. Missing cases:** ❌ — all 4 registry params dead.
- **4. Worklets:** N/A
- **5. Topology:** ✅ — DynamicsCompressorNode + makeupGain. Clean.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ⚠️ — threshold -18dB default → audible compression on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (registry knobs don't connect)

### 21. Overdrive (`overdrive`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/OverdrivePlugin.js`
- **1. Param names:** ⚠️ — registry: drive/tone/level/mix. Factory cases: drive, tone. `level`, `mix` dead.
- **2. Units:** ✅ — drive 0..1 matches registry; tone Hz matches but factory writes tone to peaking gain (dB) — wait: registry `tone` is Hz (200..8000), factory `setParam` writes `post.gain.setTargetAtTime(v...)` — that's a dB value into a gain field at a fixed 1000Hz peaking filter. **Unit mismatch**: UI sends Hz value 2000, factory interprets as +2000dB on a peak. Catastrophic.
- **3. Missing cases:** ❌ — level, mix dead; tone broken.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — pre HPF→tanh waveshaper→post peaking→output. No wet/dry.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ⚠️ — drive=0.6 default → audible distortion on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (tone knob will catastrophically over-boost; level/mix dead)

### 22. ParallelComp (`parallel_comp`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/ParallelCompPlugin.js`
- **1. Param names:** ⚠️ — registry: threshold/ratio/crush/mix/wetGain. Factory cases: blend/threshold/ratio. `crush`, `wetGain` dead. `mix` dead — factory uses `blend` (registry has no `blend`).
- **2. Units:** ✅ — threshold dB, ratio :1, blend %.
- **3. Missing cases:** ❌ — crush, mix, wetGain dead.
- **4. Worklets:** N/A
- **5. Topology:** ✅ — dry+comp parallel, blended via two gains.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ⚠️ — threshold -30dB, ratio 10, blend 50% default → audible parallel compression on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no (3 of 5 knobs work via threshold/ratio; mix/blend name mismatch is fixable rename)

### 23. PhaseFlip (`phase_flip`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/PhaseFlipPlugin.js`
- **1. Param names:** ❌ — registry: left/right (per-channel toggles). Factory case: `flip` only — flips both channels together. left/right dead.
- **2. Units:** N/A — booleans.
- **3. Missing cases:** ❌ — left, right dead.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — single gain node with ±1; both channels flipped together (no splitter). Not per-channel.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ✅ — gain=1 (no flip) on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no (does flip but only globally; UI promises per-channel)

### 24. Phaser (`phaser`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/PhaserPlugin.js`
- **1. Param names:** ⚠️ — registry: rate/depth/resonance/stages/mix. Factory cases: rate/depth/resonance/mix. `stages` dead (fixed at 6).
- **2. Units:** ✅ — rate Hz, depth Hz, mix %.
- **3. Missing cases:** ⚠️ — `stages` dead.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — `stages.reduce((a, b) => { a.connect(b); return b; }, input.connect(stages[0]) && stages[0])` (line 26) — uses `input.connect(stages[0])` return value as initial accumulator. Works but obscure. LFO modulates frequency on all stages in parallel via lfoGain.
- **6. Dispose:** ✅ — `lfo.stop(); output.disconnect()` (line 45). Better than peers.
- **7. Defaults:** ⚠️ — mix=50%, depth=500Hz, rate=0.5Hz → audible sweep on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P2
- **Demo-blocker?:** no (4 of 5 work; only stages count fixed)

### 25. Phone (`phone`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/PhonePlugin.js`
- **1. Param names:** ❌ — registry: preset/mix/drive. Factory `setParam: ()=>{}` — no-op.
- **2. Units:** N/A
- **3. Missing cases:** ❌ — all 3 knobs dead.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — fixed 300Hz HPF → 3400Hz LPF → tanh waveshaper. Telephone band-limit is right idea but completely fixed; preset/mix/drive controls do nothing.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ❌ — completely transforms signal to telephone-band on insert with no way to dial back via UI.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (entire UI is dead; effect is 100% wet always)

### 26. PingPongDelay (`ping_pong_delay`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/PingPongDelayPlugin.js`
- **1. Param names:** ⚠️ — registry: time/feedback/spread/mix. Factory cases: time/feedback/mix. `spread` dead.
- **2. Units:** ⚠️ — time ms→s correct. BUT in setParam case `time` (line 38), `delayR.delayTime.setTargetAtTime(v/500...)` — that's `time*2/1000`, NOT `time/1000` (since v is in ms). Looks intentional (ping-pong uses 2x for the right channel) — OK, but inconsistent with delayL `v/1000`. Construction had `delayR = time*2` so this matches. ✅ on second look.
- **3. Missing cases:** ⚠️ — `spread` dead.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — feedbackL connects to delayR and feedbackR connects to delayL — proper ping-pong cross-feedback. But splitter→delayL takes ch0 and splitter→delayR takes ch1, so input must be stereo for ping-pong to start; mono input gives only L tap. No spread control.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ⚠️ — feedback 0.4, mix=30 → audible delay on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no (3 of 4 work)

### 27. PitchShifter (`pitch_shifter`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/PitchShifterPlugin.js`
- **1. Param names:** ❌ — registry: shift/formant/mix. Factory case: `semitones` only. NONE match.
- **2. Units:** N/A — no overlap.
- **3. Missing cases:** ❌ — all 3 registry params dead.
- **4. Worklets:** ❌ — claims pitch shift but uses a single delay node (line 8) with delay time tied to abs(semitones). NO pitch shift at all — not a granular/AudioWorklet PSOLA engine. Delay-only. Engine completely fake.
- **5. Topology:** ❌ — input→delay(0.01s)→output. Just a tiny fixed-ish delay; pitch is unchanged.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ✅ — shift=0 default makes the delay constant; no audible change.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (no pitch shift implemented; UI dead)

### 28. PlateReverb (`plate_reverb`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/PlateReverbPlugin.js`
- **1. Param names:** ⚠️ — registry: decay/brightness/preDelay/mix/diffusion. Factory cases: mix, brightness. `decay`, `preDelay`, `diffusion` dead (decay used at construction; preDelay never used; diffusion never wired).
- **2. Units:** ✅ — mix %, brightness dB.
- **3. Missing cases:** ❌ — 3 of 5 dead.
- **4. Worklets:** N/A
- **5. Topology:** ✅ — Dattorro-style allpass+tank IR generation; convolver buffer assigned at construction (line 53). preDelay declared in registry but no preDelay node exists in factory.
- **6. Dispose:** ❌ — no dispose. IR (sr*decay samples ~700KB stereo) leaks per insert/remove.
- **7. Defaults:** ⚠️ — mix=25%, brightness +2dB on insert. Audible.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P1
- **Demo-blocker?:** no (mix+brightness work; lots dead)

### 29. PresenceEQ (`presence_e_q`)
- **UI file:** generic
- **Factory:** `src/front/js/component/audio/plugins/plugins/PresenceEQPlugin.js`
- **1. Param names:** ❌ — registry: presence/freq/q/air. Factory cases: presenceGain/presenceFreq/bodyGain/bodyFreq. NONE match. (`presence` registry id ≠ factory `presenceGain`.)
- **2. Units:** N/A — names mismatched.
- **3. Missing cases:** ❌ — all 4 registry params dead.
- **4. Worklets:** N/A
- **5. Topology:** ⚠️ — body peaking → presence peaking → output. No `air` shelf despite registry having `air` knob.
- **6. Dispose:** ❌ — no dispose.
- **7. Defaults:** ✅ — gains 0dB, neutral on insert.
- **8. COMPONENT_MAP:** N/A
- **Severity:** P0
- **Demo-blocker?:** yes (UI completely dead; no air filter)

---

## Batch 08 Summary
- Total audited: 29
- Clean: 0
- P2 (cosmetic): 3 (MasteringEQ, NotchEQ, Phaser)
- P1 (polish): 6 (HallReverb, KickEnhancer, Limiter, ParallelComp, PhaseFlip, PingPongDelay, PlateReverb — 7 actually)
- P0 (demo-blocker): 19 (HaasEffect, HarmonicExciter, Harmonizer, HiHatShimmer, LinearPhaseEQ, Looper, LoudnessMaximizer, MidSideBalance, MidSideEQ, MidSideProcessor, MonoMaker, MultibandComp, MultitapDelay, Octaver, OpticalComp, Overdrive, Phone, PitchShifter, PresenceEQ)
- Top 5 worst plugins (in approximate order):
  1. **Looper** — uses deprecated ScriptProcessorNode, leaks unbounded memory during recording, signal triple-summed during playback, dead UI
  2. **PitchShifter** — fake engine: delay node only, no pitch shift at all, UI dead
  3. **Harmonizer** — fake engine: delays+allpass with hardcoded semitones, no real harmonization, UI dead
  4. **MidSideEQ / MidSideBalance / MidSideProcessor** (tie) — broken M/S routing (no encode/decode), UIs dead, three plugins share the wrong topology
  5. **Overdrive** — `tone` knob is a unit-mismatch catastrophe: UI Hz value goes into a peaking-filter dB gain (registry 2000 → factory writes +2000dB), would crash audio
- Common patterns:
  - **Param-name divergence is endemic**: registry was rewritten with rich param sets, but the underlying factories were never updated. ~70% of these plugins have UI knobs that map to non-existent factory cases.
  - **No dispose/destroy method on 28 of 29 plugins**: only LimiterPlugin implements `destroy()`. Every other plugin leaks Web Audio nodes per insert/remove. Long sessions will exhaust memory.
  - **"Stub" engines masquerading as DSP**: PitchShifter (delay only), Harmonizer (delay+allpass), Octaver (gain stages with orphan oscillator), MultitapDelay (empty feedback case body). The factory was scaffolded but never finished.
  - **Duplicated dead code**: HallReverbPlugin.js, MidSideEQPlugin.js, NotchEQPlugin.js, OpticalCompPlugin.js, PingPongDelayPlugin.js, PlateReverbPlugin.js and PresenceEQPlugin.js each contain stale duplicate exports of unrelated factories. PluginHost.js correctly imports each from its own dedicated file, so duplicates are dead — but they bloat bundles and confuse search.
  - **Defaults not neutral**: many plugins are immediately audible on insert (Hall=30% wet, OpticalComp=-18dB threshold, Overdrive=drive 0.6, MonoMaker=hard mono of full spectrum). Limiter and MasteringEQ are the rare exceptions.
  - **Mid/Side family**: three separate plugins (MidSideBalance, MidSideEQ, MidSideProcessor) all implement the same wrong routing — splitter feeds mid+side gains in parallel (not encode → process → decode). None of the M/S plugins actually do M/S.
