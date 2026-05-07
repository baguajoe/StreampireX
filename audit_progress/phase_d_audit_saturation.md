# Phase D1.4 — Defaults Audit: SATURATION / DISTORTION / WAVESHAPER

**Read-only audit. No code modified.**

Sources inspected:
- SPX `PLUGIN_DEFAULTS` — `src/front/js/component/SPXPlugins.js` lines 1840-1960.
- SPX factories — `src/front/js/pages/RecordingStudio.js` `buildFxChain` install blocks (lines 1722-4412 covering the audited keys).
- ph_* registry — `src/front/js/component/audio/plugins/registry.js`.
- ph_* factories — `src/front/js/component/audio/plugins/plugins/<Name>Plugin.js`.

Neutrality rules applied:
- drive / amount → 0
- mix → keep 100% wet only when wet path is provably transparent at drive=0; otherwise drop to 0% (engages only when user opens it).
- output gain → 0 dB (linear 1.0)
- tape/cassette/vinyl artifacts (noise, wobble, crackle, dust, hfLoss, warp) → 0 on insert
- exciter harmonics (even/odd/even2nd/odd3rd/odd5th, harmonics) → 0 on insert
- bipolar controls — 0.5 retained when 0.5 is the existing neutral midpoint and the factory uses 0.5 as the no-color anchor.

---

## Proposed-changes table

### SPX-side (PLUGIN_DEFAULTS in SPXPlugins.js)

| Plugin | Param | Current | Proposed | Reason |
|--------|-------|---------|----------|--------|
| tapeForge | drive | 0.5 | 0 | Curve `tanh(x*(1+drive*4))/(1+sat*0.5)` — drive=0 gives `tanh(x)` (mostly linear at small x) but still saturates. Set to 0 + flag for D2 (curve becomes pure linear when both drive=0 and saturation=0). |
| tapeForge | saturation | 0.6 | 0 | At saturation=0 and drive=0 the curve is `tanh(x)/1 = tanh(x)` — coloration. With saturation=0 dividend goes to 1; combined with drive=0 → near-transparent. |
| tapeForge | hfLoss | 0.3 | 0 | LPF cutoff = 18000 − hfLoss*10000. At 0 → 18 kHz cutoff (effectively wide open above audio). Required for transparency. |
| tapeForge | noise | 0.05 | 0 | Audible coloration on insert (factory currently treats noise as no-op — but UI shows it; safe at 0). |
| tapeForge | wow | 0.02 | 0 | Audible pitch warble. Factory has no wow node yet (no-op), but defaults must reflect neutrality. |
| tapeForge | flutter | 0.015 | 0 | Same — no audio node, but the default value is shown to the user. |
| tapeForge | bias | 0.5 | 0.5 | HPF cutoff = 20 + bias*30. 0.5 → 35 Hz (essentially DC block). Neutral midpoint; keep. |
| tapeForge | speed | 15 | 15 | Cosmetic IPS readout — neutral. |
| valveGlow | drive | 0.4 | 0 | Curve `(1+k/2)*x/(1+k*|x|)` with k=drive*10. At drive=0 → k=0 → curve = x = transparent. |
| valveGlow | warmth | 0.6 | 0 | Lowshelf at 250 Hz, gain = warmth*3 dB. Must be 0 for flat response. |
| valveGlow | even2nd | 0.7 | 0 | Currently a no-op in factory (no even-harmonic node), but visible in UI — must show 0. |
| valveGlow | even4th | 0.3 | 0 | Same — no-op in factory; show 0. |
| valveGlow | bias | 0.5 | 0.5 | Bipolar — no audio node yet; 0.5 = neutral midpoint. Keep. |
| valveGlow | outputGain | 0 | 0 | Already neutral. |
| valveGlow | dcBlock | true | true | Subtle 5 Hz HPF — keep on (mastering best practice; already neutral in band). |
| ironCore | slewRate | 0.5 | 0 | Curve `x*(1-|x|*sat)^(punch*2)`. At sat=0 → `x*1 = x` = transparent. |
| ironCore | coreSize | 0.6 | 0 | At sat=0 the punch term has no effect (1^anything = 1). With sat=0 + punch=0 fully transparent. Propose 0 to make the neutral state visually obvious. |
| ironCore | dcMag | 0.2 | 0 | Peaking xfmr at 80 Hz, gain = dcMag*8 dB. Must be 0 for flat. |
| ironCore | resonance | 0.3 | 0 | Q = 0.5 + resonance*4. Even at resonance=0 Q=0.5 (broad). xfmr.gain=0 means Q has no audible effect; resonance=0 is safest visual. |
| ironCore | outputGain | 0 | 0 | Already neutral. |
| consoleSoul | crosstalk | 0.3 | 0 | Highshelf at 12 kHz, gain = crosstalk*4 dB. Must be 0 for flat. |
| consoleSoul | channelColor | 0.5 | 0 | Curve `tanh(x*k)/(1+co*0.3+ss*0.2)` with k=1+co*2+ss*2. At co=0,ss=0 → `tanh(x)/1` — still adds tiny coloration. Set to 0 (combined with sumSaturation=0 → minimal residual; flag D2 for true bypass). |
| consoleSoul | sumSaturation | 0.4 | 0 | Same curve — with both 0, k=1. Required for neutrality. |
| consoleSoul | noiseFloor | -90 | -90 | No-op in factory; -90 dB already inaudible. Keep. |
| consoleSoul | tolerance | 0.02 | 0.02 | No-op cosmetic; keep. |
| harmonicExcite | drive | 0.5 | 0 | Curve `x + drive*(even*0.3*sin(2πx) + odd*0.2*sin(3πx))`. At drive=0 → `x` = transparent regardless of even/odd. |
| harmonicExcite | even | 0.6 | 0 | Visual neutrality even though drive=0 zeroes their effect. |
| harmonicExcite | odd | 0.3 | 0 | Same. |
| harmonicExcite | mix | 30 | 0 | Output gain = mix/100. mix=0 → silence on wet path; safe because drive=0 already kills harmonics, but mix=30 means the user hears the (transparent) HPF'd signal with no exciter content. NOTE: factory has no dry/wet split here — output is wet-only via `g.gain = mix/100`. So mix=0 = silence. **Recommend mix=100 instead** since drive=0 makes the wet path = HPF'd signal (effectively pass-through above 3 kHz). Better: propose mix=100 + drive=0 + even=0 + odd=0 + airBoost=0 → the only coloration left is the 3 kHz HPF which still cuts low end. **Best fix is D2 code-side: add dry path**, then mix=0 becomes truly bypass. **Proposed: mix=0** — accept that user hears nothing until they engage the plugin (insert-effect-bypassed model). |
| harmonicExcite | airBoost | 0 | 0 | Already neutral. |
| harmonicExcite | freq | 3000 | 3000 | HPF cutoff — irrelevant when drive/mix kill the wet path. Keep. |
| vinylPress | warmth | 0.6 | 0 | Curve `tanh(x*(1+warmth))`. At warmth=0 → `tanh(x)` — still saturating. Combined with no drive control means there's no fully-transparent state. Set to 0; flag D2 for bypass-when-warmth=0. |
| vinylPress | crackle | 0.2 | 0 | HPF cutoff = 30 + crackle*20. At 0 → 30 Hz (subsonic cleanup). Visual neutrality. |
| vinylPress | dust | 0.15 | 0 | No-op in factory; visible in UI. Show 0. |
| vinylPress | warp | 0.1 | 0 | No-op in factory; visible in UI. Show 0. |
| vinylPress | riaa | true | true | RIAA EQ no-op in factory; cosmetic. |
| vinylPress | rpm | 33 | 33 | Cosmetic. |
| vinylPress | hpf | 20 | 20 | Subsonic cleanup; benign. |
| vinylPress | outputGain | 0 | 0 | Already neutral. |
| harmonicSum | drive | 0.4 | 0 | Curve `x + drive*(harm + asym)`. At drive=0 → `x` = transparent. |
| harmonicSum | even2nd | 0.5 | 0 | Inactive when drive=0; show 0 for visual neutrality. |
| harmonicSum | odd3rd | 0.3 | 0 | Same. |
| harmonicSum | odd5th | 0.1 | 0 | Same. |
| harmonicSum | crosstalk | 0.2 | 0 | Same. |
| harmonicSum | noiseFloor | -90 | -90 | No-op; -90 dB inaudible. Keep. |
| harmonicSum | outputGain | 0 | 0 | Already neutral. |
| drumEnhancer | punch | 0.5 | 0 | Peaking 80 Hz, gain = punch*6 dB. Must be 0 for flat. |
| drumEnhancer | snap | 0.4 | 0 | Peaking 6 kHz, gain = snap*4 dB. Must be 0. |
| drumEnhancer | glue | 0.4 | 0 | Compressor threshold = -8 - glue*22 dB. At glue=0 → -8 dB threshold — still some compression on loud transients. Set to 0; flag D2 (consider skipping compressor when glue=0 or moving threshold to 0 dB). |
| drumEnhancer | sub | 0.3 | 0 | Lowshelf 60 Hz, gain = sub*9 dB. Must be 0. |
| drumEnhancer | air | 0.3 | 0 | Highshelf 10 kHz, gain = air*6 dB. Must be 0. |
| drumEnhancer | outputGain | 1 | 1 | Linear 1.0 = unity. Keep. |
| vocalSaturator | drive | 0.4 | 0 | (factory uses `amount` and `drive` interchangeably). Curve `(1+a)*x/(1+a*|x|)`. At a=0 → x = transparent. |
| vocalSaturator | warmth | 0.6 | 0 | No-op in factory currently; visible in UI. Show 0. |
| vocalSaturator | presence | 0.4 | 0 | Peaking 3.5 kHz, gain = presence*5 dB. Must be 0 for flat. |
| vocalSaturator | air | 0.3 | 0 | No-op in factory; show 0. |
| vocalSaturator | mix | 0.6 | 0 | No-op in factory (no dry/wet split — wet-only chain). With drive=0 wet=transparent, but the `mix: 0.6` stored value is misleading. Propose 0 (matches "bypassed" intent). Alternatively, since mix is a no-op and the chain is always 100% wet, **0 vs 1 is cosmetic only** — flag D2 for either real dry/wet or hide the knob. |
| vocalSaturator | outputGain | 1 | 1 | Linear unity. Keep. |
| loFiCrusher | bits | 12 | 24 | Higher bit depth = less crush. 24 = ~no quantization (waveshaper LUT only loses ~0 bits at 24). True transparent state. |
| loFiCrusher | rate | 0.5 | 1.0 | Cutoff = 2000 + rate*18000. rate=1 → 20 kHz (full bandwidth, transparent). |
| loFiCrusher | filter | 0.5 | 1.0 | Last-write-wins with rate; 1 → 20 kHz. |
| loFiCrusher | noise | 0.05 | 0 | No-op in factory; visible. |
| loFiCrusher | wobble | 0.02 | 0 | No-op in factory; visible. |
| loFiCrusher | mix | 1.0 | 1.0 | Currently no dry/wet split; mix is no-op. With bits=24/rate=1/filter=1 wet path = transparent → mix=1 is fine. Keep. |
| multibandSat | drive1 | 0.3 | 0 | Per-band tanh curve `tanh(x*k)/tanh(k)` with k=1+drive*9. At drive=0 → k=1 → `tanh(x)/tanh(1) ≈ x*1.31...` — gentle gain boost + soft saturation. **Drive=0 is NOT fully transparent**. Set to 0 + flag D2 (curve normalization makes drive=0 add coloration). |
| multibandSat | drive2 | 0.3 | 0 | Same. |
| multibandSat | drive3 | 0.2 | 0 | Same. |
| multibandSat | drive4 | 0.1 | 0 | Same. |
| multibandSat | mix | 0.5 | 0 | Real dry/wet split exists. With drive=0 wet path still has band-crossover phase issues + tanh-normalize boost — propose mix=0 (full dry) for true bypass. |
| multibandSat | xover1 | 200 | 200 | Topology constant; keep. |
| multibandSat | xover2 | 2000 | 2000 | Keep. |
| multibandSat | xover3 | 8000 | 8000 | Keep. |
| enhancer808 | punch | 0.5 | 0 | Peaking at 1.5×freq, gain = punch*6 dB. Must be 0. |
| enhancer808 | sub | 0.6 | 0 | Lowshelf at freq, gain = sub*12 dB. Must be 0. |
| enhancer808 | harmonic | 0.3 | 0 | `makeTanhCurve(harmonic)` — at 0 returns linear curve (assumed). Visual neutrality. |
| enhancer808 | freq | 60 | 60 | Center freq for sub/punch; values irrelevant with sub=punch=0. Keep. |
| enhancer808 | outputGain | 1.0 | 1.0 | Linear unity. Keep. |

### ph_* (registry.js + factory files)

| Plugin | Param | Current | Proposed | Reason |
|--------|-------|---------|----------|--------|
| amp_sim (AmpSimPlugin) | drive | 30 (%) | 0 | Curve `tanh(x*(1+drive*9))*0.8`. Even at drive=0 → `tanh(x)*0.8` — −1.94 dB makeup loss + soft sat. Set 0 + flag D2 for true bypass when drive=0. |
| amp_sim | cabinet | 0 | 0 | Generic cab. Bandpass at 800 Hz Q=0.5 — heavy color always. **Cabinet is always-on coloration; no "bypass" cabinet exists.** Flag D2 (add cabinet=null option). |
| amp_sim | tone | 3000 | 3000 | Presence freq with gain=0 → no audible effect. Keep. |
| amp_sim | mix | 100 | 100 | Real dry/wet split. Wet has cab+ws → not transparent at drive=0. **Propose mix=0** — actually mix=0 = full dry = true bypass. **Recommend mix=0 + drive=0**. |
| amp_sim | outputGain | 0 (dB) | 0 | Already neutral. |
| bass_enhancer | freq | 80 | 80 | Center for enhancement. Keep. |
| bass_enhancer | drive | 0.4 | 0 | Drive knob isn't even wired in the factory's `setParam`. Visual neutrality. |
| bass_enhancer | sub | 4 (dB) | 0 | Lowshelf 80 Hz. Must be 0 for flat. |
| bass_enhancer | punch | 3 (dB) | 0 | Peaking 120 Hz. Must be 0. |
| bass_enhancer | mix | 100 | 100 | No dry/wet split in factory — knob is cosmetic. With sub=punch=0 chain is flat. Keep. |
| bit_depth (BitDepthPlugin) | bits | 8 | 24 | Quantizer levels=2^bits. 24-bit is effectively transparent (below dither floor). |
| bit_depth | mix | 100 | 100 | At bits=24 wet=transparent. OK. |
| bit_depth | dither | 0.3 | 0 | Random noise injected to wet path. Must be 0 for transparency. |
| bitcrusher | bits | 8 | 16 | Registry max is 16. At 16 quantizer step is `0.5^15 ≈ 3e-5` (≈ −90 dB) — transparent. |
| bitcrusher | rate | 0.5 | 1.0 | rate=1 → no decimation. |
| bitcrusher | mix | 50 | 100 | At bits=16,rate=1 wet path = pass-through → mix=100 fine. (Or 0 for bypass-on-insert; pick 100 to keep insert visible — engages when user adjusts bits/rate.) |
| cassette | drive | 0.4 | 0 | Drive knob scales pre-gain (1+drive*4) into a fixed `tanh(x*3)*0.85` waveshaper. Even at drive=0 the curve still saturates. Set 0 + flag D2. |
| cassette | noise | 0.02 | 0 | Noise generator runs continuously; gain only kills output. Must be 0. |
| cassette | hfLoss | 0.3 | 0 | LPF = 18000 − hfLoss*15000. At 0 → 18 kHz (transparent). |
| cassette | mix | 100 | 0 | Real dry/wet split. Wet always saturates due to fixed `tanh(x*3)*0.85` curve. Propose mix=0 for clean insert; flag D2 for bypass when drive=0. |
| convolution_shaper | drive | 0.5 | 0 | Pre-gain (1+drive*4) into tanh*4 curve + always-on convolution IR. Wet is always colored. |
| convolution_shaper | mix | 30 | 0 | Real dry/wet — set 0 for bypass on insert. |
| convolution_shaper | tone | 2000 | 2000 | LPF cutoff in wet path; irrelevant when mix=0. |
| dust_scratch | dust | 0.2 | 0 | Always-running noise → output. Must be 0. |
| dust_scratch | scratch | 0.1 | 0 | Visible knob (no audio node — no-op). Show 0. |
| dust_scratch | crackle | 0.15 | 0 | Same noise source as dust → output. Must be 0. |
| dust_scratch | mix | 100 | 100 | No real dry/wet (input is always passed through). Knob cosmetic. With dust=crackle=0, output = dry. Keep 100. |
| fuzz | drive | 0.7 | 0 | **CRITICAL:** factory uses `gain.gain.value = p.fuzz??1` (drive maps to fuzz?). Actually the factory ignores `drive` entirely — only handles `fuzz`, `tone`, `level`. Curve is hardcoded hard-clip (`x>0?1:-1`). At drive=0 input gain=0 → silence on wet. Plus tone LPF at 2 kHz — heavy color. **Real fix is D2**: hard-clip is always engaged. Set drive=0; flag D2 for full bypass + curve gating. |
| fuzz | tone | 2000 | 8000 | LPF; raise to 8 kHz (top of registry range — minimal hi-cut). |
| fuzz | bias | 0.5 | 0.5 | No-op in factory. Bipolar midpoint. Keep. |
| fuzz | mix | 100 | 0 | No real dry/wet split in factory! (only `fuzz`/`tone`/`level` are wired). Knob purely visual. Propose 0 to signal "insert is bypassed visually". Flag D2. |
| fuzz | outputGain | 0 | 0 | Already neutral. |
| harmonic_exciter | freq | 3000 | 3000 | HPF cutoff. |
| harmonic_exciter | drive | 0.5 | 0 | Pre-gain into wet path. drive=0 → pre-gain=0.5x — still routes to harmonic shapers. Set 0; flag D2 (drive=0 doesn't kill wet path because pre-gain stays 0.5). |
| harmonic_exciter | even | 0.6 | 0 | Even-harmonic gain. Must be 0. |
| harmonic_exciter | odd | 0.3 | 0 | Odd-harmonic gain. Must be 0. |
| harmonic_exciter | mix | 30 | 0 | Real dry/wet. With even=odd=0 wet=silence. mix=0 = full dry = transparent insert. |
| hi_hat_shimmer | freq | 12000 | 12000 | Center; keep. |
| hi_hat_shimmer | drive | 0.3 | 0 | Peaking gain = drive*12 dB. Must be 0. |
| hi_hat_shimmer | mix | 30 | 0 | Real dry/wet. Plus always-on `air` highshelf at +2 dB even when drive=0! Must mix=0 for transparent insert. Flag D2: hardcoded `air.gain.value=2` is non-neutral. |
| kick_enhancer | punch | 4 (dB) | 0 | Wired to `click` peaking gain in factory (UI label vs param-name mismatch). Either way → 0 dB. |
| kick_enhancer | sub | 3 (dB) | 0 | Lowshelf 80 Hz. Must be 0. |
| kick_enhancer | click | 2 (dB) | 0 | Peaking 3 kHz. Must be 0. |
| kick_enhancer | mix | 100 | 100 | No dry/wet. Plus an always-on compressor (threshold=-12, ratio=4, knee=3) that compresses loud peaks regardless of knobs. **Flag D2** — comp is always engaged. With sub=click=0 the EQ is flat but comp still acts. Propose mix=100 with caveat. |
| overdrive | drive | 0.5 | 0 | Curve k=1+drive*20. At drive=0 → k=1 → `tanh(x)`. Pre-gain=1+drive*2=1. Tone LPF at 2 kHz still colors. Set 0; flag D2 for tone widening or bypass-when-drive=0. |
| overdrive | tone | 2000 | 8000 | LPF — push to 8 kHz max for minimal hi-cut. |
| overdrive | level | 0.7 | 1.0 | Post-gain. 0.7 = −3 dB makeup loss. 1.0 = unity. |
| overdrive | mix | 100 | 0 | Real dry/wet split. Wet path's tone LPF + tanh always color. Propose mix=0 for transparent insert. |
| saturation | drive | 20 (%) | 0 | Curve uses `Math.max(0.01, drive/100)*5` — minimum amount = 0.05. drive=0 still produces `tanh(x*0.05)` ≈ x. Acceptable as "near-transparent" but **flag D2** (the floor of 0.01 should be 0). |
| saturation | tone | 8000 | 20000 | LPF in wet path. 20 kHz = effectively wide open. |
| saturation | mix | 50 | 0 | Real dry/wet split. With drive=0 wet ≈ x → mix could be 100 OR 0; propose 0 for clean insert (user opts in). |
| saturation | type | 0 | 0 | Curve type selector — no-op in factory (only generates tanh). Keep. |
| snare_enhancer | crack | 3 (dB) | 0 | Wired to `body` peaking 200 Hz in factory. Must be 0. |
| snare_enhancer | snap | 3 (dB) | 0 | Peaking 1 kHz. Must be 0. |
| snare_enhancer | body | 2 (dB) | 0 | Wired to `air` highshelf 8 kHz. Must be 0. |
| snare_enhancer | mix | 100 | 100 | No dry/wet split — chain is always wet. With all gains 0 → flat. Keep 100. |
| tape_warmth | drive | 0.4 | 0 | Curve `(1+d)*x/(1+d*|x|)`. At d=0 → x = transparent. |
| tape_warmth | hfLoss | 0.3 | 0 | Currently no-op in factory (no LPF for hfLoss). Visible knob — show 0. |
| tape_warmth | noise | 0.01 | 0 | No-op — visible. Show 0. |
| tape_warmth | mix | 100 | 100 | No dry/wet split. With drive=0 chain = ws(linear) → warmth shelf (1.5 dB) → air shelf (-0.5 dB). **NOT fully transparent — 1.5 dB lowshelf + −0.5 dB highshelf are hardcoded into factory.** Flag D2 — `warmth` and `air` defaults inside factory should default to 0. Need to also propose code-side fix. |
| tube_saturator | drive | 0.4 | 0 | Curve `(1+d)*x/(1+d*|x|)`. At d=0 → x = transparent. |
| tube_saturator | even | 0.7 | 0 | No-op in factory (no even-harmonic node). Show 0. |
| tube_saturator | odd | 0.3 | 0 | No-op. Show 0. |
| tube_saturator | bias | 0.5 | 0.5 | No-op. Bipolar mid. Keep. |
| tube_saturator | mix | 100 | 100 | No dry/wet. Plus hardcoded warmth lowshelf at 200 Hz, gain=2 dB. **Flag D2** — `warmth` factory default should be 0. With drive=0 + warmth=0 → transparent. |
| vinyl_sim | warmth | 0.6 | 12000 | Factory treats warmth as LPF cutoff Hz (factory default 12000). UI registry default `0.6` is misinterpreted as 0.6 Hz. **Major mismatch!** Set to 12000 Hz (or 20000 = transparent). Flag D2 for unit fix. |
| vinyl_sim | crackle | 0.2 | 0 | No-op in factory — visible. Show 0. |
| vinyl_sim | dust | 0.15 | 0 | No-op. Show 0. |
| vinyl_sim | warp | 0.1 | 0 | No-op. Show 0. |
| vinyl_sim | mix | 100 | 100 | No dry/wet. Plus always-on rumble LFO modulating the LPF cutoff! Flag D2 — `rumble` is hardcoded to 0.002. With warmth=20000 chain ≈ HPF 30 + LPF 20 kHz + tiny rumble mod → near-transparent. |
| waveshaper | drive | 0.5 | 0 | Factory uses `amount` not `drive` (param mismatch). Curve at amount=0,shape='soft' → `(π+0)x/(π+0)` = x = transparent. Set drive=0. Flag D2 for param-name unification. |
| waveshaper | curve | 0 | 0 | Maps to `shape` — 0=likely 'soft' → transparent. Keep. |
| waveshaper | mix | 50 | 100 | No real dry/wet split in factory. Knob cosmetic. With amount=0 chain = transparent → mix=100 fine. |
| waveshaper | outputGain | 0 (dB) | 0 | Already neutral. |
| wow_flutter | wow | 0.02 | 0 | LFO depth on delay-time. Must be 0 — but always-on delay (0.02 s base) still introduces 20 ms latency! **Flag D2** — base delay should be conditional on wow/flutter > 0. |
| wow_flutter | flutter | 0.01 | 0 | LFO depth. Must be 0. |
| wow_flutter | speed | 15 | 15 | Cosmetic. |
| wow_flutter | mix | 100 | 100 | No dry/wet split. With wow=flutter=0 chain still has 20 ms fixed delay. Flag D2. |

---

## Already neutral (no change)

- valveGlow.outputGain (0)
- valveGlow.dcBlock (true — benign 5 Hz HPF)
- ironCore.outputGain (0)
- consoleSoul.noiseFloor (-90 dB; below audibility)
- harmonicExcite.airBoost (0)
- harmonicSum.outputGain (0)
- harmonicSum.noiseFloor (-90 dB)
- drumEnhancer.outputGain (1.0 linear unity)
- vocalSaturator.outputGain (1.0 unity)
- vinylPress.outputGain (0)
- enhancer808.outputGain (1.0 unity)
- AmpSimPlugin.outputGain (0)
- BassEnhancerPlugin.freq (cosmetic center)
- KickEnhancerPlugin (no neutral params; comp always on)
- WaveshaperPlugin.outputGain (0)
- FuzzPlugin.outputGain (0)
- All `freq` params on enhancers (cosmetic when gain=0)
- All `xover` params on multibandSat (topology constants)

---

## Judgment-call (no change recommended)

- **valveGlow.bias (0.5)** — bipolar control with no audio node yet. 0.5 = midpoint = neutral. Leave.
- **fuzz.bias (0.5)** — no-op. Bipolar mid. Leave.
- **tube_saturator.bias (0.5)** — no-op. Bipolar mid. Leave.
- **tapeForge.bias (0.5)** — actually wired to HPF cutoff (20 + bias*30 Hz). 0.5 → 35 Hz = subsonic cleanup, near-transparent in audio band. Leave.
- **vinylPress.hpf (20 Hz)** — subsonic; benign. Leave.
- **vinylPress.riaa (true), rpm (33)** — RIAA EQ is no-op in factory; cosmetic readouts. Leave.
- **valveGlow.dcBlock (true)** — 5 Hz HPF is mastering best-practice. Leave.
- **harmonicSum/consoleSoul.noiseFloor (-90 dB)** — below audibility. Leave.
- **multibandSat.xover1/2/3** — split topology only; not gain. Leave.
- **drumEnhancer.outputGain (1)**, **vocalSaturator.outputGain (1)**, **enhancer808.outputGain (1)** — all linear-unity (NOT dB). Already neutral.
- **AmpSimPlugin.cabinet (0 = generic)** — cabinet is always-on coloration regardless of choice. Cannot make neutral via defaults — flag D2 for "no cabinet" mode. Leave default at 0 for now.
- **AmpSimPlugin.tone (3000 Hz)** — presence filter has gain=0 hardcoded (factory line 54), so frequency value is inert. Leave.

---

## Code-side flags for Phase D2 (defaults audit alone cannot fix these)

The following plugins have **non-bypass-able coloration baked into the factory** — defaults audit cannot make them transparent without code changes:

1. **tapeForge** — curve always saturates even with drive=0 + saturation=0 (residual `tanh(x)`). Add `if (drive===0 && saturation===0) skipWaveShaper`.
2. **vinylPress** — `tanh(x*(1+warmth))` curve always saturates even at warmth=0. Add bypass.
3. **multibandSat** — per-band curve `tanh(x*k)/tanh(k)` at drive=0 (k=1) gives ~ +2.4 dB makeup boost + soft sat. Add bypass-when-drive=0 per band.
4. **AmpSimPlugin** — cabinet bandpass is always engaged with no "off" option. Add `cabinet: -1 = bypass`.
5. **CassettePlugin** — fixed `tanh(x*3)*0.85` curve regardless of drive knob. Add bypass.
6. **ConvolutionShaperPlugin** — fixed IR convolution always runs. Wet path never transparent.
7. **FuzzPlugin** — hardcoded hard-clip curve `x>0?1:-1`; no real bypass. Plus param-name mismatch (`fuzz` vs `drive`).
8. **HarmonicExciterPlugin** — wet pre-gain `0.5 + drive*4` stays at 0.5x even with drive=0 (signal still routes through shapers).
9. **HiHatShimmerPlugin** — always-on `air.gain.value=2` (highshelf +2 dB at 14 kHz). Make air responsive to drive.
10. **KickEnhancerPlugin** — always-on compressor (threshold=-12, ratio=4) regardless of knobs.
11. **OverdrivePlugin** — `tone` LPF default 2 kHz always cuts highs. Curve at drive=0 = `tanh(x)`, not pure linear.
12. **SaturationPlugin** — `Math.max(0.01, drive/100)*5` floor — drive=0 still has amount=0.05.
13. **TapeWarmthPlugin** — hardcoded `warmth=1.5` lowshelf + `air=-0.5` highshelf. Make these zero when not specified.
14. **TubeSaturatorPlugin** — hardcoded `warmth=2` lowshelf inside factory. Make zero.
15. **VinylSimPlugin** — `warmth` param treated as Hz (factory) but registry says 0..1. Unit/param mismatch. Plus always-on rumble LFO.
16. **WaveshaperPlugin** — registry uses `drive`/`curve`, factory uses `amount`/`shape`. Param-name mismatch.
17. **WowFlutterPlugin** — base delay 0.02 s always engaged → ~20 ms latency on insert.
18. **DustScratchPlugin** — noise generator always running; only gains route output.
19. **harmonicExcite (SPX)** — `mix` controls wet-output gain only (no dry path). At drive=0 wet = HPF'd-input ≠ true bypass.
20. **vocalSaturator (SPX)** — no dry/wet split despite UI showing `mix` knob.
21. **loFiCrusher (SPX)** — no real dry/wet split (mix is no-op).
22. **drumEnhancer (SPX)** — `glue` compressor threshold floor at -8 dB even with knob=0.
23. **consoleSoul (SPX)** — curve `tanh(x*1)/(1+0+0)` with co=0,ss=0 → still `tanh(x)`. Add full-bypass.

---

## Summary counts

- **SPX plugins audited:** 12 (tapeForge, valveGlow, ironCore, consoleSoul, harmonicExcite, vinylPress, harmonicSum, drumEnhancer, vocalSaturator, loFiCrusher, multibandSat, enhancer808)
- **ph_* plugins audited:** 19
- **Total plugins audited:** 31
- **Total proposed param changes:** ~110
- **Already-neutral params:** ~22
- **Judgment-call (no change):** 11
- **Code-side D2 flags:** 23 distinct issues across 18 plugins
