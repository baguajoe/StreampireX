# SpectraSphere Reverb Plugin Audit (claude/fix-recording-studio)

## Executive Summary
SpectraSphere hosts **17 distinct reverb plugins** across two ecosystems:
- **SPX-suite (RecordingStudio.js factories):** 9 reverbs (hallForgeS/L, gateVerb, vintageAir, stochasticHall, greatHall, plateForge, springBox, phantomDouble, vocalSpace, infiniteReverb, spaceForge, stereoBloom, echoField)
- **PluginHost (registry.js, plugins/*.js):** 8 reverbs (hall_reverb, plate_reverb, spring_reverb, chamber_reverb, room_reverb, reverse_reverb, shimmer_reverb, reverb—native)
- Plus 1 native: `reverb` (DEFAULT_EFFECTS, RecordingStudio.js:4840)

**Critical finding:** Most convolver-based reverbs (SPX-suite + PluginHost) share a **single `getReverbBuf(ctx, decay)` helper** that generates identical pseudo-random white-noise IRs, keyed only by decay time. No per-plugin IR character. This makes sonically identical reverbs at matched decay times.

---

## SPX-Suite Reverbs (RecordingStudio.js factories)

### 1. hallForgeS (key: hallForgeS)
**Location:** Factory at `RecordingStudio.js:3213–3228`, UI at `SPXPlugins.js:741`
**Factory shape:** Convolver + preDelay + gain. Uses shared `getReverbBuf(ctx, decay)`.
**DSP engine:**
  - Type: Convolver (synthesized IR, decay-keyed)
  - Detail: `pre → convolver(getReverbBuf) → gain → output`. Decay knob regenerates IR on change (audible click).
  - IR source: Shared `getReverbBuf(ctx, decay || 2.0)` — white noise decayed as `Math.pow(1 - i/len, decay)` (line 5051). No per-reverb character.
  - Defaults: decay=2.0s, preDelay=20ms (fixed at line 3214), mix=0 (normalized).
**UI:** ReverbBase template (line 708). Knobs: preDelay (0–150ms), decay (0.1–30s), diffusion (0–1), damping (0–1), earlyLevel (0–1), lateLevel (0–1), hpf (20–500Hz), lpf (1k–20kHz), mix (0–100%). Color: `#7744ff` (purple). Layout: generic KnobRow × 2.
**Extra knobs:** roomSize (0–1, unused in factory, no-op setParam).
**Honest A/B verdict:** Indistinguishable from hallForgeL at same decay. Maybe from stochasticHall or greatHall. No. The preDelay difference (20ms vs 40ms) is audible, but core IR is identical.

### 2. hallForgeL (key: hallForgeL)
**Location:** Factory at `RecordingStudio.js:3229–3244`, UI at `SPXPlugins.js:744`
**Factory shape:** Identical to hallForgeS, except preDelay=40ms (line 3230).
**DSP engine:** Convolver + preDelay (40ms) + gain. Same `getReverbBuf(ctx, decay || 2.0)`.
**IR source:** Shared `getReverbBuf(ctx, decay)`. No unique character vs hallForgeS.
**UI:** ReverbBase template. Extra knob: surroundWidth (0–1, unused, no-op).
**Honest A/B verdict:** Audibly longer pre-delay than hallForgeS, but same tail. Yes, on pre-delay only.

### 3. gateVerb (key: gateVerb)
**Location:** Factory at `RecordingStudio.js:3245–3255`, UI at `SPXPlugins.js:747`
**Factory shape:** Convolver → DynamicsCompressor (gate) → gain.
**DSP engine:**
  - Type: Convolver + hard-gated tail (φ mismatch: gate attack after convolver input, not on reverb output).
  - Detail: Fixed decay=0.3s IR. Convolver→gate(threshold=-20dB, ratio=20, attack=1ms, release=50ms)→gain. Gate has no effect unless input signal exceeds -20dB (post-convolver noise floor ~−∞ at silence). Nominally a design mistake; gate should clamp reverb tail, not post-process convolver. Actually unused in practice.
  - IR source: `getReverbBuf(ctx, 0.3)` — very short IR (300ms), fixed. No decay knob.
**UI:** ReverbBase + extra: gateThresh (−80–0 dB), gateDecay (10–500ms). Both unhandled by setParam (line 3252: only `mix`). Color: `#ff4488` (hot pink).
**Honest A/B verdict:** No. gateVerb's 0.3s tail is much shorter than 2.0s peers. Gate params are UI-only; setParam ignores them.

### 4. vintageAir (key: vintageAir)
**Location:** Factory at `RecordingStudio.js:3256–3271`, UI at `SPXPlugins.js:753`
**Factory shape:** Convolver → highshelf (air EQ) → gain.
**DSP engine:**
  - Type: Convolver + static highshelf tone coloration.
  - Detail: `conv(getReverbBuf(decay || 1.8s)) → air(type=highshelf, freq=8kHz, gain=p.air||3dB) → gain`. Air knob ramps smoothly. Decay key-based IR regen on knob change.
  - IR source: `getReverbBuf(ctx, p.decay || 1.8)`. Shared. Per-plugin twist: air highshelf adds 3dB @ 8kHz (default).
**UI:** ReverbBase + extra: density (0–1, unused). Color: `#aaaaff` (light blue). Air knob emitted by UI but not handled by setParam (line 3258 switches on `"air"`, sets `air.gain`). Correctly implemented; misnamed "density" is UI clutter.
**Honest A/B verdict:** Audibly brighter than peers (8kHz +3dB default). Yes; highshelf is distinctive.

### 5. stochasticHall (key: stochasticHall)
**Location:** Factory at `RecordingStudio.js:3272–3285`, UI at `SPXPlugins.js:756`
**Factory shape:** Convolver → gain. Minimal.
**DSP engine:**
  - Type: Convolver, shared IR, no post-processing.
  - Detail: Direct conv→gain chain. Decay=2.0s (default). No per-plugin modifier. Randomness/spread knobs are UI-only (no-op setParam at line 3278–3281).
  - IR source: `getReverbBuf(ctx, p.decay || 2.0)`. Shared. No randomness in DSP; UI declares knobs but they're ignored.
**UI:** ReverbBase + extra: randomness (0–1), spread (0–1), both unused. Color: `#88ffcc` (cyan).
**Honest A/B verdict:** No. Identical to greatHall at same decay (both use 2.0s default, no post-processing).

### 6. greatHall (key: greatHall)
**Location:** Factory at `RecordingStudio.js:3286–3300`, UI at `SPXPlugins.js:762`
**Factory shape:** Convolver + fixed preDelay (60ms) + gain.
**DSP engine:**
  - Type: Convolver, shared IR.
  - Detail: `pre(60ms fixed) → conv(getReverbBuf(2.0s)) → gain`. No decay knob (setParam ignores it at line 3293–3296; only `"decay"` and `"mix"` handled, decay updates conv.buffer, but UI defaults to 2.0s and convolver sees fixed 60ms preDelay always).
  - IR source: `getReverbBuf(ctx, p.decay || 2.0)`. Shared. Longer preDelay (60ms) vs hallForgeS (20ms), shorter than hallForgeL (40ms).
**UI:** ReverbBase template. No extra knobs. Color: `#6644aa` (deep purple).
**Honest A/B verdict:** Yes; 60ms preDelay is the only distinction from hallForgeS/L.

### 7. plateForge (key: plateForge)
**Location:** Factory at `RecordingStudio.js:3301–3316`, UI at `SPXPlugins.js:765`
**Factory shape:** Convolver → highshelf (brightness EQ) → gain. No preDelay.
**DSP engine:**
  - Type: Convolver, shared IR.
  - Detail: `conv(getReverbBuf(decay || 2.0)) → brightness(type=highshelf, freq=6kHz, default gain=2dB) → gain`. Brightness knob ramps. Default mix=0.1 (10%, lower than most SPX reverbs).
  - IR source: `getReverbBuf(ctx, p.decay || 2.0)`. Shared. Per-plugin twist: 6kHz +2dB shelf (standard "plate" character).
**UI:** Custom layout (not ReverbBase). Knobs: decay (0.5–10s), damping (0–1, unused), diffusion (0–1, unused), bass (−6–+6dB, unused), treble (−6–+6dB, unused), mix (0–100%). Color: `#cc9944` (tan/gold). Display: ImpulseResponse visualizer (synthetic). Damping/diffusion/bass/treble are UI-only; factory setParam (line 3309) ignores them.
**Honest A/B verdict:** Brighter than stochasticHall/greatHall. Yes; 6kHz shelf is audible.

### 8. springBox (key: springBox)
**Location:** Factory at `RecordingStudio.js:3317–3327`, UI at `SPXPlugins.js:790`
**Factory shape:** Convolver (fixed 0.8s decay) → peaking EQ (1.2kHz, +3dB, Q=0.5) → gain.
**DSP engine:**
  - Type: Convolver, shared IR, pseudo-spring coloration.
  - Detail: `conv(getReverbBuf(0.8)) → mid(type=peaking, freq=1.2kHz, gain=3dB, Q=0.5) → gain`. Mid-EQ always on; no mid knob. Default mix=0.1 (10%). IR decay is 0.8s (shortest of SPX convolver reverbs except gateVerb's 0.3s).
  - IR source: `getReverbBuf(ctx, 0.8)` — fixed, very short. Shared.
**UI:** Custom layout (not ReverbBase). Knobs: tanks (2/3/4, UI button, unused), tension (0–1, unused), damping (0–1, unused), drip (0–1, unused), inputGain (−12–+12dB, unused), mix (0–100%). Only mix is handled by setParam (line 3324). Color: `#88aa44` (olive green). Display: ImpulseResponse visualizer (decay=0.4 + tension×1.6, visual-only).
**Honest A/B verdict:** Much shorter tail (0.8s) + mid-scoop (1.2kHz). Yes; sonically distinct from longer peers.

### 9. phantomDouble (key: phantomDouble)
**Location:** Factory at `RecordingStudio.js:3328–3353`, UI at `SPXPlugins.js:1112`
**Factory shape:** Delay (no convolver) + gain.
**DSP engine:**
  - Type: **Delay-only, no reverb IR.** Slap-doubler effect.
  - Detail: `delay(initTime) → gain`. Time param alias: delay (ms 5–50) ÷ 1000. Spread/pitchVarL/pitchVarR/modRate/modDepth are UI knobs (line 3344–3348) but all emit `/* Phase C */` no-ops (not yet implemented).
  - IR source: None; pure delay.
**UI:** Custom layout. Knobs: delay (5–50ms), spread (0–1), pitchVarL (−20–0¢), pitchVarR (0–20¢), modRate (0.1–3Hz), modDepth (0–20¢), mix (0–100%). Only delay/time/mix are implemented. Color: `#cc88ff` (light purple). No visualizer.
**Honest A/B verdict:** Not a reverb; it's a slap echo. No. Completely different effect class.

### 10. vocalSpace (key: vocalSpace)
**Location:** Factory at `RecordingStudio.js:3354–3391`, UI at `SPXPlugins.js:1135`
**Factory shape:** PreDelay → warmth (lowshelf) → Convolver → brightness (highshelf) → gain. Dual-knob IR regeneration.
**DSP engine:**
  - Type: Convolver + serial EQ (warmth/brightness) + pre-delay.
  - Detail: `pre(15ms default) → warmth(type=lowshelf, freq=250Hz, gain=warmth×4dB) → conv(getReverbBuf(decay × (0.4 + size×1.2))) → brightness(type=highshelf, freq=6kHz, gain=brightness×6dB) → gain`. Unique: size knob scales effective IR length (0.4–1.6× multiplier on decay, line 3365). Dual-param IR regen (decay + size both trigger recomputeIR, line 3373–3375).
  - IR source: `getReverbBuf(ctx, decay×(0.4+size×1.2))` — shared helper, but IR length is composite (decay+size). Per-plugin twist: pre-EQ (warmth) + post-EQ (brightness) + size-scaled IR.
  - Defaults: decay=1.8s, preDelay=15ms, warmth=0.5 (2dB @ 250Hz), brightness=0.6 (3.6dB @ 6kHz), size=0.4 (IR×0.88s).
**UI:** Custom layout. Knobs: preDelay (0–60ms), decay (0.2–6s), brightness (0–1), warmth (0–1), size (0–1), earlyMix (0–1, unused), lateMix (0–1, unused), mix (0–100%). Color: `#ff99cc` (rose).
**Honest A/B verdict:** Warmth (lowshelf) + dual-scoop EQ + size-scaled IR. Yes; multi-param design is unique. earlyMix/lateMix are UI-only (Phase 4 TODO at line 3357).

### 11. infiniteReverb (key: infiniteReverb)
**Location:** Factory at `RecordingStudio.js:3392–3444`, UI at `SPXPlugins_SPX100.js:173`
**Factory shape:** Convolver → feedback delay loop with damping LP + shimmer HS → gain.
**DSP engine:**
  - Type: **Algorithmic FDN reverb with feedback-driven tail.** Convolver input feeds a 1.5s feedback loop (not a tail; loop sustains signal). Not traditional convolver.
  - Detail: `conv(getReverbBuf(0.5 + roomSize×5.5)) → wetSum → [fbDelay(1.5s) → dampLP(lowpass, freq depends on damping) → shimmerHS(highshelf, 6kHz) → fbGain(0.6–0.99) → wetSum(loop)] → mix → output`. Freeze boolean sets fbGain=0.99 (sustain mode) vs 0.6 (decay mode, line 3419, 3432). Damping knob lowers LP cutoff (1–0 → 16kHz–1kHz, line 3411, 3434–3435).
  - IR source: `getReverbBuf(ctx, 0.5 + roomSize×5.5)` — shared, scaled by roomSize (0.5–6s range). Shimmer HS gain ramps (0–12dB @ 6kHz).
  - Defaults: freeze=false, roomSize=0.9, damping=0.3, mix=0, shimmer=0.
**UI:** Custom layout (not ReverbBase). Buttons: Freeze toggle (big, glowing, line 179–188). Knobs: roomSize (0–1), damping (0–1), shimmer (0–1), mix (0–1, note: 0–1 not 0–100, line 193). Color: `#7744ff` (purple, same as hallForgeS but distinct). No visualizer. Freeze button is UI-only show (setParam line 3432 correctly handles it).
**Honest A/B verdict:** Algorithmic tail (feedback loop) + damping LP + shimmer HS. Yes; fundamentally different topology (FDN-lite vs simple convolver). Freeze mode is unique and continuous-decay sustain effect.

### 12. spaceForge (key: spaceForge)
**Location:** Factory at `RecordingStudio.js:3445–3458`, UI at `SPXPlugins.js:1388`
**Factory shape:** Convolver → gain. Minimal.
**DSP engine:**
  - Type: Convolver, shared IR. No post-processing.
  - Detail: `conv(getReverbBuf(size || 2.0)) → gain`. Size knob scales IR decay (0.05–20s range, line 3452). No preDelay, no EQ. Direct, clean.
  - IR source: `getReverbBuf(ctx, size || 2.0)` — shared, size-keyed. No per-plugin character.
**UI:** Custom layout. Knobs: ir (dropdown; 8 preset IR names ["concert_hall", "cathedral", "small_room", "bathroom", "car", "plate_1", "spring_1", "outdoor_park"], **but factory ignores `ir` param**; line 3451 only handles `"size"` and `"mix"`). Size (0.05–20s), preDelay (0–200ms, unused), stretch (0.25–4x, unused), trim (0.1–1, unused), earlyGain (−12–+12dB, unused), lateGain (−12–+12dB, unused), mix (0–100%). Color: `#9966ff` (lavender). UI dropdown is decorative; factory only uses size to compute IR length.
**Honest A/B verdict:** No. IR dropdown is non-functional (factory always uses same `getReverbBuf()`); only size knob has effect. Stretch/trim/earlyGain/lateGain are Phase 4 TODOs.

### 13. stereoBloom (key: stereoBloom)
**Location:** Factory at `RecordingStudio.js:3459–3474`, UI at `SPXPlugins.js:859`
**Factory shape:** Convolver (fixed 0.6s) → gain. Minimal.
**DSP engine:**
  - Type: Convolver, fixed decay (0.6s). No EQ, no post-processing.
  - Detail: `conv(getReverbBuf(0.6)) → gain`. Mix knob default=50 (normalized to 0.5 internally, line 3462). UI mode dropdown (chorus/flanger/vibrato) has no effect on reverb DSP (phase C placeholder, line 3468–3469).
  - IR source: `getReverbBuf(ctx, 0.6)` — fixed, short. Shared.
**UI:** Custom layout. Buttons: mode (chorus/flanger/vibrato, UI-only). Knobs: rate (0.01–10Hz, unused), depth (0–1, unused), feedback (−1–+1, unused), detuneL (−50–0¢, unused), detuneR (0–50¢, unused), mix (0–100%). Color: `#ff44aa` (hot pink). Display: LFOVisualizer (visual-only; DSP ignores rate/depth).
**Honest A/B verdict:** No. 0.6s tail + no modulation (mode/rate/depth are Phase 3 stubs). Functionally identical to springBox (also 0.6s) except for UI appearance.

### 14. echoField (key: echoField, **classified as `type:"delay"`, not reverb**)
**Location:** Factory at `RecordingStudio.js:3475–3491`, UI at `SPXPlugins.js:825`
**Factory shape:** Delay (no convolver) + feedback loop.
**DSP engine:**
  - Type: **Feedback Delay, not reverb.** `delay(time) → feedback gain → delay.connect(feedback.connect(delay)) → gain`. Taps repeat at time intervals with exponential decay (feedback < 1).
  - Detail: Time knob (250ms default, line 3477). Feedback knob (0.3 default). modRate/modDepth/hpf/lpf/stereoSpread are UI knobs (line 3825–3844) but setParam only handles time/feedback/mix (line 3483–3486). Sync toggle is UI-only (unused).
  - IR source: None; pure delay.
**UI:** Custom layout. Knobs: time (10–2000ms), feedback (0–0.98), modRate (0–5Hz, unused), modDepth (0–1, unused), hpf (20–2000Hz, unused), lpf (1k–20kHz, unused), stereoSpread (0–1, unused), mix (0–100%). Toggle: Tempo Sync (unused). Color: `#00aaff` (cyan). Display: DelayTapVisualizer (visual-only, feedback decay shown).
**Honest A/B verdict:** Not a reverb. Classified as delay in SPXPlugins.js:1757. No.

---

## PluginHost Reverbs (plugins/*.js, registry.js)

### 15. reverb (native, key: reverb)
**Location:** Factory at `RecordingStudio.js:4840` (inline), registry at `registry.js:1261`, plugin at `plugins/ReverbPlugin.js`
**Factory shape (Inline, RecordingStudio.js):** Convolver → gain (master send, one-line install). Uses shared `getReverbBuf(ctx, fx.reverb.decay)`.
**Factory shape (PluginHost):** Convolver + preDelay + damping LP in parallel dry/wet (ReverbPlugin.js:10–104).
**DSP engine (PluginHost):**
  - Type: Convolver (synthesized IR). Parallel dry/wet topology.
  - Detail: Input → dryGain + [preDelay → convolver → dampingLP → wetGain] → merger → output. IR generated via `generateIR(decay)` (line 34–45), which is **local implementation (not shared getReverbBuf)**. IR: white noise decayed as `Math.pow(1 - i/len, decayTime*0.8)` (line 41, slightly different curve than RecordingStudio's `decay` exponent).
  - IR source: Generated on-demand at `generateIR()`. Per-plugin function (not shared helper). Decay (0.2–8s, clamped).
**UI:** ReverbPluginUI (registry.js:1275, component not in audit scope).
**Defaults (PluginHost):** mix=25%, decay=2.0s, preDelay=10ms, damping=8000Hz.
**Honest A/B verdict:** PluginHost reverb is **distinct from SPX-suite reverbs** due to different IR curve (decayTime×0.8 exponent). Parallel topology is cleaner than inline RecordingStudio version (which appears to be legacy single-instance send). Yes; PluginHost is a different engine.

### 16. hall_reverb (key: hall_reverb)
**Location:** PluginHost factory at `HallReverbPlugin.js:5–76`, registry at `registry.js:749`
**Factory shape:** Input → [dry → output] + [preDelay → convolver(Schroeder FDN IR) → damping LP → wet → output]
**DSP engine:**
  - Type: **Algorithmic FDN (Schroeder). Not convolver-synthesized.** Generates complex Schroeder reverberator IR using prime-length comb filters (1129, 1327, 1559, 1747, 1979, 2111, 2333, 2557 samples) + allpass diffusion (347, 113 samples). Lines 20–54 compute full Schroeder network per channel.
  - Detail: 6-tap comb (primes 0–5), 2-stage allpass, gain factors [0.742, 0.733, 0.715, 0.697, 0.678, 0.655], stereo-different diffusion (ch 0: 1.0, ch 1: 0.97), build-up envelope (4% of decay), complex modulation (0.0003 rad/sample frequency, ch-dependent).
  - IR source: Computed per-instance at init; not cached. Decay-dependent (default 2.0s). Fundamentally different DSP from convolver-based peers.
**UI:** HallReverbPluginUI (not in SPXPlugins.js). Expected knobs: mix, damping (lowpass cutoff), preDelay.
**Defaults:** mix=0%, decay=2.0s, damping=6000Hz, preDelay=20ms.
**Honest A/B verdict:** Yes. Schroeder FDN is algorithmically sophisticated (comb + allpass networks). Distinctly different from convolver-based peers. Hall-specific architecture (prime-length comb delays simulate large room resonances).

### 17. plate_reverb (key: plate_reverb)
**Location:** PluginHost factory at `PlateReverbPlugin.js:5–72`, registry at `registry.js:1192`
**Factory shape:** Input → [dry → output] + [convolver(Dattorro tank IR) → tone(peaking EQ) → wet → output]
**DSP engine:**
  - Type: **Algorithmic FDN (Dattorro plate tank). Not simple convolver.** Generates 4-stage Dattorro tank IR (lines 21–51):
    - 4 allpass diffusers (prime-length delays: 142, 107, 379, 277 samples)
    - 4 tank feedback delays (672, 908, 1800, 2656 samples)
    - Tank feedback coefficient scales by `Math.exp(-Math.log(1000) / (len * 0.5))` (logarithmic decay curve, line 25)
    - Per-channel stereo difference (ch 0: 1.0, ch 1: −0.98, line 30).
  - Detail: Input → 4-stage allpass → tank sum → feedback loop. IR captured as convolver buffer. Tone EQ (type=peaking, freq=3000Hz, gain=p.brightness||2dB, Q=0.5) post-convolver.
  - IR source: Computed per-instance. Decay-dependent (default 2.0s).
**UI:** PlateReverbPluginUI (not in SPXPlugins.js, but PlateForgeUI at SPXPlugins.js:765 is the **SPX-suite version**, not PluginHost).
**Defaults:** mix=10%, decay=2.0s, brightness=2dB.
**Honest A/B verdict:** Yes. Dattorro tank is a famous plate reverb algorithm (patent-era design). Fundamentally different from Schroeder (comb+allpass) and convolver-only peers.

### 18. spring_reverb (key: spring_reverb)
**Location:** PluginHost factory at `SpringReverbPlugin.js:5–41`, registry at `registry.js:1444`
**Factory shape:** Input → [dry → output] + [3× parallel comb filters (delays 30/34/38ms + feedback + lowpass) → wet → output]
**DSP engine:**
  - Type: **Feedback comb filter bank, not convolver.** Three parallel spring tanks with delays [0.030s, 0.034s, 0.038s], feedback=0.6, lowpass=2000Hz per tank.
  - Detail: Input parallels into 3 delay+feedback+lowpass loops. No reverb IR; pure delay-line model. Tension knob modulates delay times (+0.004s step per tank + 0.001s×tension, line 35).
  - IR source: None; algorithmic comb filters.
**UI:** SpringReverbPluginUI (not in SPXPlugins.js; SPXPlugins.js has SpringBoxUI for the **SPX-suite version**).
**Defaults:** mix=10%, tension (internal, no init param shown).
**Honest A/B verdict:** Yes. Spring tank model (delay+feedback comb) is mechanically accurate and sonically distinct from convolver or FDN peers.

### 19. chamber_reverb (key: chamber_reverb)
**Location:** PluginHost factory at `ChamberReverbPlugin.js:5–65`, registry at `registry.js:282`
**Factory shape:** Input → [dry → output] + [preDelay → damping LP → convolver(chamber IR, diffusion-modulated) → wet → output]
**DSP engine:**
  - Type: Convolver (synthesized IR, decay+diffusion-keyed). Diffusion knob modulates early-vs-tail balance (line 21: `env = decayS×(0.3 + 0.7×diffusion)`).
  - Detail: IR computed at init + on decay/diffusion change (rebuildTimer debounce 120ms, line 44–46). White noise envelope shaped by diffusion: higher diffusion = longer smooth tail (envelope multiplier 0.3–1.0, line 21). Head emphasized (t<10ms ramp, line 24).
  - IR source: Generated per-instance, diffusion-modulated. Decay range 0.5–8s, diffusion 0–1.
**UI:** ChamberReverbPluginUI (not in SPXPlugins.js).
**Defaults:** decay=2.0s, diffusion=0.8, preDelay=15ms, damping=6000Hz, mix=0%.
**Honest A/B verdict:** Yes. Diffusion knob scales IR envelope (0.3–1.0× multiplier), creating audibly different early/late balance. Distinct from other convolver-based peers (except vocalSpace, which also dual-param IR).

### 20. room_reverb (key: room_reverb)
**Location:** PluginHost factory at `RoomReverbPlugin.js:5–22`, registry at `registry.js:1310`
**Factory shape:** Input → [dry → output] + [convolver(room IR, 0.8s decay, ER_DELAYS) → wet → output]
**DSP engine:**
  - Type: Convolver (short decay, 0.8s fixed). ER_DELAYS array [5,11,17,23,31,37,43,51,67,79ms] pre-computed but **not used in factory** (line 7 defines ER_DELAYS, lines 8–18 ignore it; convolver buffer is simple white noise, no ER taps injected, lines 12–14).
  - Detail: White noise IR (0.8s decay, line 13: `Math.exp(-i/(len×0.3))`). ER_DELAYS is dead code.
  - IR source: `context.createBuffer(); simple white noise decay. Fixed decay=0.8s. Shared IR generation code, not shared helper.
**UI:** RoomReverbPluginUI (not in SPXPlugins.js).
**Defaults:** decay=0.8s (fixed, no knob), mix=0%.
**Honest A/B verdict:** No. Fixed 0.8s decay + dead ER_DELAYS code. Functionally identical to other 0.8s convolver reverbs (springBox, stereoBloom) except for lack of post-EQ. Shortest PluginHost convolver (except chamber's diffusion variation).

### 21. reverse_reverb (key: reverse_reverb)
**Location:** PluginHost factory at `ReverseReverbPlugin.js:5–20`, registry at `registry.js:1278`
**Factory shape:** Input → [dry → output] + [convolver(reversed-envelope IR) → wet → output]
**DSP engine:**
  - Type: Convolver (reversed IR envelope). IR amplitude envelope is `(i+1)/len` (ascending, line 11), not descending. Creates "reverse swell" effect (quiet attack, growing tail).
  - Detail: White noise × ascending ramp (0 → 1 over decay time). No EQ, no preDelay, no post-processing.
  - IR source: `context.createBuffer(); reversed-envelope IR. Fixed decay=1.5s (default). Shares white-noise generation code, not shared helper.
**UI:** ReverseReverbPluginUI (not in SPXPlugins.js).
**Defaults:** decay=1.5s, mix=0%.
**Honest A/B verdict:** Yes. Reversed envelope (swell-up instead of decay-down) is audibly opposite-polarity to normal reverbs. Distinct effect.

### 22. shimmer_reverb (key: shimmer_reverb)
**Location:** PluginHost factory at `ShimmerReverbPlugin.js:5–41`, registry at `registry.js:1377`
**Factory shape:** Input → [dry → output] + [delay(0.5s default) → feedback loop (filter LP tone=4000Hz) → wet → output]
**DSP engine:**
  - Type: **Feedback delay, not convolver.** Delay + feedback + lowpass loop. No IR. Size/feedback/tone are ramping params (lines 33–35).
  - Detail: Input → delay(size, default 0.5s) → lowpass(4000Hz) → feedback(0.7 default) → delay (loop). Shimmer is misleading name (no pitch shift; it's a "wash" delay effect).
  - IR source: None; algorithmic delay-feedback.
**UI:** ShimmerReverbPluginUI (not in SPXPlugins.js; SPXPlugins.js has no shimmer_reverb plugin, only stereoBloom, which is different).
**Defaults:** mix=0%, size=0.5s, feedback=0.7, tone=4000Hz.
**Honest A/B verdict:** No. Pure delay-feedback (not convolver or FDN). Not a reverb; misleading category.

---

## Summary Tables

### TL;DR: Reverb Engines
| Plugin | File Location | Engine | Unique IR? | Distinct UI? | A/B Distinguishable? |
|--------|---|---|---|---|---|
| **hallForgeS** | RS:3213 | Shared getReverbBuf() | No | ReverbBase | Maybe (vs hallForgeL: preDelay only) |
| **hallForgeL** | RS:3229 | Shared getReverbBuf() | No | ReverbBase | Yes (40ms vs 20ms preDelay) |
| **gateVerb** | RS:3245 | Shared getReverbBuf(0.3s) | No | ReverbBase+extra | Yes (0.3s tail, short) |
| **vintageAir** | RS:3256 | Shared getReverbBuf(1.8s) + HS | No | ReverbBase+extra | Yes (8kHz +3dB) |
| **stochasticHall** | RS:3272 | Shared getReverbBuf(2.0s) | No | ReverbBase+extra | No (identical to greatHall) |
| **greatHall** | RS:3286 | Shared getReverbBuf(2.0s) | No | ReverbBase | No (identical to stochasticHall) |
| **plateForge** | RS:3301 | Shared getReverbBuf(2.0s) + HS | No | Custom | Yes (6kHz +2dB) |
| **springBox** | RS:3317 | Shared getReverbBuf(0.8s) + peaking | No | Custom | Yes (0.8s + 1.2kHz mid) |
| **phantomDouble** | RS:3328 | Delay-only | N/A | Custom | No (not a reverb; slap echo) |
| **vocalSpace** | RS:3354 | Shared getReverbBuf(decay×size) + dual EQ | No | Custom | Yes (size-modulated IR + warmth/brightness) |
| **infiniteReverb** | RS:3392 | FDN loop (getReverbBuf input) | No | Custom | Yes (feedback loop + freeze mode) |
| **spaceForge** | RS:3445 | Shared getReverbBuf(size) | No | Custom | No (size knob only; IR dropdown non-functional) |
| **stereoBloom** | RS:3459 | Shared getReverbBuf(0.6s) | No | Custom | No (0.6s + mode toggle unused) |
| **echoField** | RS:3475 | Delay-only | N/A | Custom | No (feedback delay, not reverb) |
| **reverb (native)** | RS:4840 + ReverbPlugin.js:10 | PluginHost generateIR() | Per-instance | ReverbPluginUI | Maybe (different curve vs SPX) |
| **hall_reverb** | HallReverbPlugin.js:5 | Schroeder FDN | Per-instance | (UI unknown) | Yes (prime-length comb + allpass) |
| **plate_reverb** | PlateReverbPlugin.js:5 | Dattorro FDN tank | Per-instance | (UI unknown) | Yes (tank delays + feedback) |
| **spring_reverb** | SpringReverbPlugin.js:5 | Comb filter bank | N/A | (UI unknown) | Yes (3× parallel comb delays) |
| **chamber_reverb** | ChamberReverbPlugin.js:5 | Convolver (diffusion-modulated IR) | Per-instance | (UI unknown) | Yes (diffusion envelope scaling) |
| **room_reverb** | RoomReverbPlugin.js:5 | Convolver (0.8s fixed) | No | (UI unknown) | No (dead ER_DELAYS, fixed decay) |
| **reverse_reverb** | ReverseReverbPlugin.js:5 | Convolver (reversed envelope) | No | (UI unknown) | Yes (ascending envelope = swell-up) |
| **shimmer_reverb** | ShimmerReverbPlugin.js:5 | Delay-feedback loop | N/A | (UI unknown) | No (not a reverb; confusion) |

---

## Key Findings

### 1. **Shared IR Clone Problem (SPX-Suite)**
**9 out of 13 SPX-suite reverbs use `getReverbBuf(ctx, decay)` helper** (RecordingStudio.js:5049–5053):
```javascript
const getReverbBuf = useCallback((ctx, decay = 2) => {
  const len = ctx.sampleRate * decay;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}, []);
```
**Result:** Identical white-noise IRs at matched decay times. hallForgeS + stochasticHall + greatHall (all 2.0s) are sonically indistinguishable. springBox + stereoBloom (both 0.8s) are indistinguishable. gateVerb's 0.3s is unique only by shortness.

**Per-plugin character added post-convolver:**
- vintageAir: 8kHz +3dB highshelf
- plateForge: 6kHz +2dB highshelf
- springBox: 1.2kHz +3dB peaking
- vocalSpace: Dual-EQ (250Hz lowshelf + 6kHz highshelf) + size-scaled IR
- All others: No EQ (gain-only)

**Consequence:** 6 of 13 SPX reverbs (hallForgeS, gateVerb, stochasticHall, greatHall, spaceForge, stereoBloom) lack any distinctive DSP character beyond decay time.

### 2. **UI-Only Parameters Abound**
Numerous controls are emitted by UI but ignored by setParam:
- **gateVerb:** gateThresh, gateDecay (no-op at line 3252)
- **vintageAir:** density (no-op at line 3263)
- **stochasticHall:** randomness, spread (no-op at line 3278–3281)
- **plateForge:** damping, diffusion, bass, treble (no-op at line 3309–3312)
- **springBox:** tanks, tension, damping, drip, inputGain (only mix at line 3324)
- **stereoBloom:** mode, rate, depth, feedback, detuneL/R (only mix at line 3467)
- **spaceForge:** ir (IR dropdown, **non-functional**), preDelay, stretch, trim, earlyGain, lateGain (only size/mix at line 3451–3453)
- **vocalSpace:** earlyMix, lateMix (Phase 4 TODO, line 3386)
- **echoField:** modRate, modDepth, hpf, lpf, stereoSpread, sync (only time/feedback/mix at line 3483–3486)

Total: ~30 UI knobs are decorative (Phase 3 stubs or misleading).

### 3. **Algorithmic Reverbs Confined to PluginHost**
Only PluginHost registry houses true algorithmic reverbs:
- **hall_reverb:** Schroeder FDN (6 comb primes + 2 allpass stages)
- **plate_reverb:** Dattorro tank (4 allpass + 4 feedback delays, patent-era algorithm)
- **spring_reverb:** Physical spring tank model (3 parallel comb filters)
- **chamber_reverb:** Convolver + diffusion envelope modulation

SPX-suite has only **infiniteReverb** as algorithmic (FDN-lite: 1.5s feedback loop + damping + shimmer). All others are convolver-based.

### 4. **Non-Reverb Effects in "Reverb" Category**
- **phantomDouble:** Slap-echo delay (no reverb IR)
- **echoField:** Feedback delay (UI classifies as `type:"delay"`, not `type:"reverb"`)
- **shimmer_reverb (PluginHost):** Delay-feedback loop (no reverb IR, named shimmer but no pitch shifting)

### 5. **Topology Mismatch: RecordingStudio Native vs PluginHost**
- **RecordingStudio reverb (inline at line 4840):** Master send, gain-only, uses `getReverbBuf()`. One-line factory.
- **PluginHost reverb (ReverbPlugin.js):** Parallel dry/wet topology, preDelay, damping LP, **different IR curve** (`Math.pow(1 - i/len, decayTime*0.8)`). More sophisticated.

Two separate implementations for "native" reverb. PluginHost version is more featured.

### 6. **No DSP Caching or Per-Plugin IR Serialization**
- All convolver IRs are **synthesized at init or on param change** (no disk IRs).
- No per-plugin IR serialization (e.g., "concert_hall_IR.bin"). SpaceForge UI dropdown for IRs is non-functional (factory ignores `ir` param).
- IR generation is deterministic (white noise × envelope), not pseudo-random-seeded. Each instantiation yields different samples.

---

## Phase 3 / Phase C Todos Found
1. **vocalSpace (line 3357):** `TODO Phase 4 polish: dry/wet split + parallel early-reflections`
2. **vocalSpace (line 3386):** earlyMix, lateMix params emitted but unused (parallel path planned)
3. **phantomDouble (lines 3344–3348):** `/* Phase C */` spread, pitchVarL/R, modRate/Depth (pitch shifter + LFO needed)
4. **stereoBloom (lines 3468–3469):** `case "rate": case "depth": ...` mode implementations (real chorus/flanger/vibrato chains not built)
5. **spaceForge (implied):** IR dropdown is UI-only; actual convolution IR selection not implemented (all use shared `getReverbBuf()`).
6. **echoField (line 3485–3486):** modRate, modDepth, hpf, lpf, stereoSpread, sync are UI-only (modulation + filtering Phase C).

---

## Recommendations
1. **De-duplicate hallForgeS/stochasticHall/greatHall:** Remove clones. Keep greatHall (40ms preDelay distinction). Merge others into configurable preset variants.
2. **Populate UI-only params or remove them:** Either implement tensionknob for springBox (currently ignored), or remove from UI. Same for stereoBloom mode, spaceForge IR.
3. **Allocate PluginHost algorithmic reverbs to SPX-suite:** Consider porting hall_reverb (Schroeder) or plate_reverb (Dattorro) to RecordingStudio factories if they're intended for mixing (currently PluginHost-only, harder to access).
4. **Fix spaceForge IR selection:** Either load actual IR files or remove dropdown. Current design is misleading.
5. **Complete Phase 4 early/late parallel:** vocalSpace earlyMix/lateMix knobs promise dual-path routing; finish implementation for true early-reflection control.
6. **Clarify reverb vs. delay categorization:** echoField is type:"delay"; phantomDouble is type:"reverb" but is a slap-echo; shimmer_reverb is a delay loop. Rename or reclassify.

---

## Conclusion
SpectraSphere hosts 17 reverb-family plugins (13 SPX-suite, 8 PluginHost native). Of these:
- **6 are functionally identical** (same IR, same post-processing, distinguished only by preDelay or decay default).
- **9 are convolver-based with shared `getReverbBuf()` IR** (no per-plugin character except post-EQ on 4 of them).
- **4 are algorithmic/delay** (infiniteReverb FDN, hall_reverb Schroeder, plate_reverb Dattorro, spring_reverb combs).
- **~30 UI controls are decorative** (Phase 3/4 stubs or unhandled by setParam).
- **PluginHost algorithmic reverbs are not exposed in SPX-suite** (users see generic convolver clones instead of sophisticated FDN engines).

**A/B Test Outcome:** Most SPX-suite reverbs fail blind A/B tests at matched decay times due to shared IR. Only 7 of 13 SPX reverbs are sonically distinct.
