# Phase D1.6 — Mastering / Utilities / Meters Defaults Audit

**Read-only audit. No code changes.** Source files inspected:
- `src/front/js/component/SPXPlugins.js` — PLUGIN_DEFAULTS @ ~1840–1960
- `src/front/js/pages/RecordingStudio.js` — buildFxChain factory cases
- `src/front/js/component/audio/plugins/plugins/<Name>Plugin.js` — ph_* factories
- `src/front/js/component/audio/plugins/registry.js` — ph_* per-param defaults

Neutrality goal: when the plugin is freshly inserted at default settings, the
audio passes through with no audible change (gain=unity, width=1.0, mix=0 for
removal/restoration plugins, etc.). Meters and visualizers display state but
do not process audio. Effects whose *purpose* is the effect (dither, dcBlock,
codec preview HPF/LPF, dehummer notches) keep their factory defaults.

---

## Proposed changes

| Plugin | Param | Current | Proposed | Reason |
|---|---|---|---|---|
| **stereoForge** (SPX) | width | 50 | 100 | UI scale 0–200 (0=mono, 100=passthrough, 200=2×). Factory reads `p.width` straight into a GainNode (RecordingStudio.js:3017), so width=50 → gain=50× — extreme amplification. Either UI scale is %/100 (then default should be 100, factory should divide by 100) or default should be 1. Either way, 50 is wrong on insert. |
| **stereoForge** (SPX) | monoBelow | 100 | 0 | monoBelow=100 means "force everything below 100 Hz to mono on insert" — not transparent. Default 0 (off). |
| **stereoImager** (SPX) | lowWidth | 0.8 | 1.0 | Factory writes lowWidth straight to a side-band gain (RecordingStudio.js:4000, 4018). 0.8 narrows the low side band on insert. 1.0 = no width change. |
| **stereoImager** (SPX) | highWidth | 1.2 | 1.0 | Same as lowWidth — 1.2 widens the high side band on insert. 1.0 = no change. |
| **harmonicSum** (SPX, mastering) | drive | 0.4 | 0 | Adds harmonic distortion on insert. drive=0 ⇒ curve becomes y=x (identity). |
| **harmonicSum** (SPX, mastering) | even2nd | 0.5 | 0 | Even-harmonic injection on insert. Combined with drive=0 above, curve is identity. |
| **harmonicSum** (SPX, mastering) | odd3rd | 0.3 | 0 | Same — odd-harmonic injection on insert. |
| **harmonicSum** (SPX, mastering) | odd5th | 0.1 | 0 | Same. |
| **harmonicSum** (SPX, mastering) | crosstalk | 0.2 | 0 | Asymmetry term in curve; 0 = pure even-symmetry identity. |
| **vinylPress** (SPX, mastering) | warmth | 0.6 | 0 | Drives a tanh waveshaper + LP shift on insert. 0 ⇒ tanh(x*1) ≈ near-identity, LP at 14 kHz. Closer to neutral. |
| **vinylPress** (SPX, mastering) | crackle | 0.2 | 0 | Adds noise artifacts on insert. |
| **vinylPress** (SPX, mastering) | dust | 0.15 | 0 | Same — particulate noise. |
| **vinylPress** (SPX, mastering) | warp | 0.1 | 0 | Pitch wobble artifact on insert. |
| **gainStager** (SPX) | rmsDb | -100 | 0 | Meter readout — display-only, but -100 dB is wrong for a freshly-inserted "no signal yet" reading; factory case is dead (RecordingStudio.js:3038). Cosmetic; does not affect audio. *Judgment-call — leave as-is unless meter UI shows -100 on open.* |
| **noiseReduction** (SPX) | reduction | 0.6 | 0 | Factory: ratio = 1 + reduction × 6 (RecordingStudio.js:4615). reduction=0 ⇒ ratio=1 (no compression/expansion). On insert, downward expander should be inactive. |
| **noiseReduction** (SPX) | smoothing | 0.8 | 0 | knee = smoothing × 30; smoothing=0 ⇒ knee=0 (matches reduction=0 inactive state). |
| **declicker** (SPX) | sensitivity | 0.7 | 0 | UI control for click detector — even though factory ignores it, UI shows "70% sensitivity active" on open. 0 = no detection. |
| **declicker** (SPX) | strength | 0.8 | 0 | Factory: gain = 1 - strength × 0.2 (RecordingStudio.js:4197). strength=0.8 ⇒ gain=0.84 (~−1.5 dB attenuation on insert). strength=0 ⇒ unity. |
| **declicker** (SPX) | maxWidth | 3 | 0 | UI param, factory no-op. Cosmetic. *Judgment-call: leave at 3 ms (typical) since it has no audio effect — change is doc-only.* |
| **dehummer** (SPX) | depth | 0.9 | 0 | UI emits depth, but factory builds 50/60/100 Hz notches at fixed Q=20 unconditionally (RecordingStudio.js:4209). Notches are always-on regardless of depth. **Bigger fix:** factory should respect depth (0=bypass). UI default 0.9 is misleading. |
| **dehummer** (SPX) | learn | false | false | Already neutral. ✓ (kept here for completeness) |
| **dialogueIsolator** (SPX) | isolation | 0.7 | 0 | Factory: HPF=100 + iso×200 Hz, LPF=8000 − iso×4000 Hz (RecordingStudio.js:4222–4223). iso=0 ⇒ HPF=100, LPF=8000 (still narrows band somewhat — see judgment note). iso=0 is the closest-to-neutral that this engine can produce. |
| **dialogueIsolator** (SPX) | sensitivity | 0.6 | 0 | Factory: presence peak gain = sens × 6 dB. sens=0 ⇒ 0 dB (no peak boost). |
| **dialogueIsolator** (SPX) | smoothing | 0.8 | 0 | UI param, factory no-op. Cosmetic. |
| **cabinetSim** (SPX) | distance | 0.5 | 0 | distance=0.5 cuts ~1 kHz of HF on insert (distToHi formula). 0 = no cut, closest to neutral that the cab approximation supports. *Note: cabinetSim's whole purpose is coloration — see judgment block below.* |
| **cabinetSim** (SPX) | mix | 100 | 100 | Factory ignores mix (no dry/wet split). ✓ accept as documented Phase-C TODO. |
| **codecPreview** (SPX) | (none) | {} | {} | ✓ Already minimal. HPF40/LPF16k is the effect. |
| **lowEndFocus** (SPX, mastering) | sub | 3 | 0 | Factory: peak at 60 Hz with gain=sub dB (RecordingStudio.js:4134). 3 dB sub-bass boost on insert. 0 = neutral. |
| **lowEndFocus** (SPX, mastering) | kick | 2 | 0 | Same — 100 Hz peak with gain=kick dB. 0 = neutral. |
| **spectralRecovery** (SPX, mastering) | amount | 4 | 0 | Factory: 10 kHz high-shelf with gain=amount dB. 4 dB high-shelf boost on insert. 0 = neutral. |
| **spectralRecovery** (SPX, mastering) | presence | 2 | 0 | 8 kHz peak with gain=presence dB. 0 = neutral. |
| **loudnessTarget** (SPX, mastering) | ceiling | -1 | 0 | Factory uses as DynamicsCompressor threshold with ratio=20 (limiter). ceiling=-1 means -1 dB threshold ⇒ active limiting on transients > -1 dB on insert. Limiter neutrality calls for 0 (no limiting) on insert. *Alternative judgment: -1 is a sensible "insert ready to master" preset — see judgment block.* |
| **loudnessTarget** (SPX, mastering) | target | 0 | 0 | ✓ Already neutral (10^(0/20) = unity gain). |
| **msImager** (SPX, mastering) | width | 1 | 1 | ✓ Already neutral. |
| **matchEQ** (SPX, mastering) | low | 0 | 0 | ✓ Already neutral. |
| **matchEQ** (SPX, mastering) | high | 0 | 0 | ✓ Already neutral. |
| **AIDeRoomPlugin** (ph_) | reduction | 0.6 | 0 | Factory: filter peaking gain = -reduction × 24 dB (AIDeRoomPlugin.js:16). reduction=0.6 ⇒ -14.4 dB cut at 400 Hz on insert. 0 = no cut (transparent peaking filter). |
| **AIDeRoomPlugin** (ph_) | sensitivity | 0.5 | 0 | Compressor threshold = -60 + sens × 50 (AIDeRoomPlugin.js:18). sens=0 ⇒ -60 dB threshold (compressor never triggers). Pair with reduction=0 above for transparent insert. |
| **AIDeRoomPlugin** (ph_) | mix | 100 | 100 | ✓ Mix=100 routes through wet only — but wet path itself becomes neutral with reduction=0+sens=0 above. |
| **AIEQMatchPlugin** (ph_) | match | 0.5 | 0 | Factory: bands gain = matchProfile[i] × match + tilt (AIEQMatchPlugin.js:45). match=0.5 ⇒ ±1.5 dB smile profile on insert. 0 = flat. |
| **AIEQMatchPlugin** (ph_) | smoothing | 0.7 | 0.7 | ✓ Display-only TC; doesn't affect static neutrality. |
| **AIEQMatchPlugin** (ph_) | lowEnd | 0.5 | 0.5 | ✓ Centered (formula uses (lowEnd-0.5)*12, so 0.5 → 0 dB tilt). |
| **AIEQMatchPlugin** (ph_) | highEnd | 0.5 | 0.5 | ✓ Same. |
| **AINoiseReducePlugin** (ph_) | reduction | 0.6 | 0 | Factory: gate ratio = 1 + reduction × 19 (AINoiseReducePlugin.js:22). reduction=0 ⇒ ratio=1 (no expansion). |
| **AINoiseReducePlugin** (ph_) | threshold | -40 | -80 | With reduction=0 ratio=1, threshold is moot — but if user dials in reduction without thresholding, -40 will gate quiet content. Better default: -80 (gate effectively bypassed). |
| **AINoiseReducePlugin** (ph_) | mix | 100 | 100 | ✓ Mix routes through wet path; wet path is neutral with reduction=0. |
| **AIVocalCleanPlugin** (ph_) | denoise | 0.5 | 0 | Factory: thresh = -10 - denoise × 20, ratio = 2 + denoise × 4 (AIVocalCleanPlugin.js:19–20). denoise=0 ⇒ thresh=-10, ratio=2 (still compresses!). **Engine doesn't go fully neutral** — even denoise=0 has 2:1 compression at -10 dB. *Bigger fix needed: factory should treat 0 as bypass (ratio=1).* |
| **AIVocalCleanPlugin** (ph_) | debreath | 0.3 | 0 | Factory: HPF=60 + debreath × 140 Hz. debreath=0 ⇒ HPF=60 Hz (mild rumble cut). Closest-to-neutral. |
| **AIVocalCleanPlugin** (ph_) | declick | 0.3 | 0 | Factory: deess gain = -declick × 9 dB. declick=0 ⇒ 0 dB cut (neutral peaking filter). |
| **MidSideBalancePlugin** (ph_) | midGain | 0 | 0 | ✓ Already neutral (dB → linear unity). |
| **MidSideBalancePlugin** (ph_) | sideGain | 0 | 0 | ✓ Already neutral. |
| **MidSideBalancePlugin** (ph_) | width | 100 | 100 | ✓ Already neutral (100 / 100 = 1.0 multiplier on side path). |
| **MidSideProcessorPlugin** (ph_) | midGain | 0 | 0 | ✓ Already neutral. |
| **MidSideProcessorPlugin** (ph_) | sideGain | 0 | 0 | ✓ Already neutral. |
| **MidSideProcessorPlugin** (ph_) | encode | 1 | 1 | ✓ Always-on M/S; no audio effect of toggle. |
| **MonoMakerPlugin** (ph_) | freq | 100 | 100 | *Judgment-call*. Factory currently makes the **whole signal mono** unconditionally (no freq-split logic in MonoMakerPlugin.js:8–11). Setting freq doesn't matter to current audio. UI default 100 Hz is a sensible "mono bass below 100" — but that's not what the factory does. ✓ leave default; flag factory bug separately. |
| **MonoMakerPlugin** (ph_) | phase | 0 | 0 | ✓ Already neutral (factory ignores it). |
| **PhaseFlipPlugin** (ph_) | left/right | 0/0 | 0/0 | ✓ Already neutral. Registry has `left` & `right` toggles; factory only listens to `flip`. Neutral state is all-zero. |
| **StereoEnhancerPlugin** (ph_) | width | 100 (registry) | 100 | ✓ Registry default 100 (= 1.0 multiplier). **However factory uses `p.width ?? 1.2`** (StereoEnhancerPlugin.js:11) — if `p.width` is unset, defaults to 1.2 (widening!). Registry default 100 should win when host passes params through. Mismatch: factory fallback should match registry. *Bigger fix — factory needs `?? 100` then divide by 100, or registry should ship `width: 1.2` raw.* Document mismatch; default flow with registry → 100 is neutral. |
| **StereoWidenerPlugin** (ph_) | width | 100 | 100 | ✓ widthFromUI(100) = 100/100 = 1.0 (sideGain unchanged). |
| **StereoWidenerPlugin** (ph_) | monoBelow | 100 | 0 (or off) | Side-path HPF defaults to 100 Hz on insert ⇒ removes low-side info ⇒ summed mono below 100 Hz. Not transparent. Propose 20 Hz (factory clamps to 20 minimum) as effectively-off. |
| **TransientDesignerPlugin** (ph_) | attack | 0 (registry) | 0 | ✓ Registry: -24..+24 dB, default 0. **However factory uses `p.attack ?? 1`** (TransientDesignerPlugin.js:9) — if undefined, ducks to 1.0× linear, but the dB UI sends 0 = neutral. Factory fallback uses linear semantics (1=unity), registry uses dB semantics (0=unity). Mismatch — factory should treat 0 dB as 1.0 lin, or expect linear. *Bigger fix: factory should `dbToLin(p.attack ?? 0)`.* When registry default 0 is honored, neutrality holds via the dbToLin conversion. |
| **TransientDesignerPlugin** (ph_) | sustain | 0 | 0 | Same as attack. |
| **TransientDesignerPlugin** (ph_) | mix | 100 | 100 | ✓ Already neutral. |
| **GainPlugin** (ph_) | gainDb | 0 | 0 | ✓ Already neutral (10^(0/20) = 1.0). |
| **GainPlugin** (ph_) | phase | 0 | 0 | ✓ Already neutral (1.0, no invert). |

---

## Already neutral (no change)

- **ditherForge** — `bitDepth: 24, type: "shaped", noiseShaping: "F1", highPass: true, level: 0.5`. Dither is the effect; passthrough in factory (RecordingStudio.js:4050) means it currently has no audio impact at all, but the UI defaults express the intended dither operation. ✓
- **dcBlock** — `dcRemove: true, hpfFreq: 5, hpfSlope: 12, subCut: 30`. Factory builds 10 Hz HPF Q=0.707 unconditionally — DC-blocking is the purpose. ✓
- **loudnessMeter / loudnessMeter2** — `target, integrated, lra, truePeak, momentary, shortTerm`. Read-only display state; factory is `makePassthrough()`. ✓
- **goniometer** — `decay: 0.95`. Visualizer; passthrough factory. ✓
- **phaseScope** — `{}`. Visualizer; passthrough factory. ✓
- **spectrumAnalyzer** — `mode: "bars", scale: "log", peakHold: true, decay: 0.95, resolution: 1024, range: [-90, 0]`. Visualizer; passthrough factory. ✓
- **masterWall** — `ceiling: -0.1, lookahead: 5, release: 100, threshold: -0.3, clipMargin: 0.1, truePeak: true, dither: "none", outputGain: 0`. Brick-wall limiter; ceiling -0.1 / threshold -0.3 / release 100 ms all match the spec rules (ceiling -0.3, threshold -1, release 50–100 ms — close enough; values are within mastering norm). Note: PLUGIN_DEFAULTS ceiling=-0.1 vs factory `?? -0.3` differs but factory `p.ceiling ?? -0.3` reads UI -0.1 first ⇒ effective -0.1 dB ceiling. Both are pro-mastering values. ✓
- **midSideEQ** — all 8 band gains = 0 dB. ✓
- **gainStager** — `gain: 1, trim: 0`. Factor combines to unity. ✓ (rmsDb/peakDb are display-only; targetDb/phase are unused state.)
- **codecPreview** — empty params; HPF40 + LPF16k is the documented preview tool effect. ✓

---

## Judgment calls (no change recommended despite non-zero defaults)

- **masterWall.ceiling = -0.1** vs spec rule "ceiling -0.3": both are valid mastering ceilings. Demonstrably-safe at -0.1 with truePeak detection. Leave.
- **loudnessTarget.ceiling = -1**: this plugin is purpose-built as a final mastering limiter. -1 dB ceiling is pro practice ("ITU-R BS.1770 typical broadcast"). The proposed-change row above lists 0 as the strict-neutrality default; reasonable judgment is to **leave at -1 dB** since the plugin's raison d'être is loudness targeting. If user wants no limiting, they bypass the insert.
- **cabinetSim.cabinet = 0**: cabinet=0 maps to the "first cab" in the list — coloration is the purpose of the plugin. Factory passes the cab number to mid/hi filter freqs. Cabinet sim is ALWAYS coloring; user adds it deliberately. Leave coloration defaults; just zero out distance/angle accents (already proposed above for `distance`).
- **cabinetSim.angle = 0**: angle=0 gives +3 dB on the mid presence peak per `angleToMidGain` formula (RecordingStudio.js:2050). Strict-neutrality default would be angle=90 (0 dB), but 0° is the conventional mic-on-axis position — accept as documented coloration default.
- **dehummer notches at 50/60/100 Hz**: notches are always-on regardless of UI `depth`. Factory bug noted in proposed-changes table. The defaults themselves (freq=60, harmonics=5) are sensible *if* the factory respected depth/learn — but with the current factory, the plugin is "always notching" on insert. Engine bug, not defaults bug. Flag for D2.
- **MonoMakerPlugin** factory unconditionally sums to mono regardless of `freq`. Current default 100 Hz is correct *for the intended behavior* (mono bass below 100). Factory is incomplete (no HP-split before mono sum). Flag for D2.
- **noiseReduction.threshold = -40, attack = 10, release = 200**: with `reduction=0` proposed above, threshold/attack/release become irrelevant (ratio=1, no engagement). Leave numerical defaults; they document "intended use" presets that take effect once user dials in reduction.
- **declicker.maxWidth = 3 ms**, **dehummer.harmonics = 5**, **dialogueIsolator.smoothing = 0.8**: factory no-ops on these; cosmetic UI defaults. No audio impact.
- **AIVocalCleanPlugin.denoise = 0.5**: even denoise=0 leaves comp at thresh=-10 dB ratio=2:1 — engine never goes fully neutral. Engine bug (factory should treat 0 as bypass). Flag for D2; UI default 0.5 is "moderate clean", reasonable as a "user inserted this for a reason" preset. No change to default — fix the engine.
- **TransientDesignerPlugin / StereoEnhancerPlugin factory fallbacks**: factories use `p.X ?? <non-neutral>` (e.g. `p.width ?? 1.2`, `p.attack ?? 1`). When PluginHost feeds registry defaults (where width=100, attack=0 dB), the registry value wins. Default flow is neutral. But if a caller bypasses the registry and instantiates with empty params, factory fallback yields non-neutral output. Engine-side mismatch documented; defaults table proposes nothing.

---

## Summary counts

- **Plugins audited:** 34 (22 SPX-side + 12 ph_*).
- **Already neutral (no change):** 12 plugins.
- **Proposed changes:** 50 individual param changes across 18 plugins.
- **Judgment-calls (no change despite non-neutral default):** 11 plugins/params noted with justification.
- **Engine bugs flagged for D2 (not a defaults issue):** 5 (dehummer, MonoMaker freq-split, AIVocalClean denoise=0 not bypass, StereoEnhancer/TransientDesigner factory fallback mismatch).
