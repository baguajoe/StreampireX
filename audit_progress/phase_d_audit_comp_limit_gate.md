# Phase D1.2 — Compressors / Limiters / Gates Defaults Audit

Read-only audit. Compares current defaults to neutrality rules supplied by the
caller. Each row links a single param to a specific neutrality rule. Sources:

- SPX `PLUGIN_DEFAULTS`: `src/front/js/component/SPXPlugins.js` lines 1840-1935.
- SPX factory defaults: `src/front/js/pages/RecordingStudio.js` `case 'pluginKey'` blocks (≈2090-2960).
- ph_* factory defaults: `src/front/js/component/audio/plugins/plugins/<Name>Plugin.js`.
- Registry declared defaults: `src/front/js/component/audio/plugins/registry.js`.

Where SPX `PLUGIN_DEFAULTS` and the factory disagree, both are listed. Proposed
values target neutral insert behavior (no audible character on bypass-toggle).

---

## Proposed changes

| Plugin | Param | Current | Proposed | Reason |
|--------|-------|---------|----------|--------|
| **SPX brickWall** | release | 50 ms (DEFAULTS) | 100 ms | Limiter neutrality: 50–100 ms; 100 ms is steadier on transients than 50 ms. |
| **SPX warmPress** | threshold | -18 dB | -10 dB | Comp neutrality: -10 to -6 dB; -18 already engages on moderate signal. |
| **SPX warmPress** | ratio | 4 (DEFAULTS) / 3 (factory `safe()` fallback) | 2 | Comp neutrality: 1.5:1–2:1. |
| **SPX warmPress** | release | 100 ms (DEFAULTS) / 150 ms (factory) | 100 ms | Reconcile: factory uses 150, DEFAULTS uses 100. Standardize on 100 ms. |
| **SPX warmPress** | knee | 6 dB (DEFAULTS) / 12 dB (factory) | 6 dB | Reconcile: factory hardcodes 12 dB, DEFAULTS says 6. Use 6 dB neutral. |
| **SPX warmPress** | attack | 10 ms (DEFAULTS) / 30 ms (factory) | 10 ms | Reconcile mismatch; rule says 10 ms. |
| **SPX glueBus** | threshold | -10 dB (DEFAULTS) / -12 dB (factory fallback) | -10 dB | Reconcile and align with rule (-10 to -6). |
| **SPX glueBus** | ratio | 4 | 2 | Comp neutrality: 1.5:1–2:1. (Bus glue at 2:1 still glues subtly.) |
| **SPX glueBus** | attack | 3 ms (DEFAULTS) / 10 ms (factory) | 10 ms | Reconcile; rule says 10 ms. |
| **SPX glueBus** | makeupGain | 2 dB | 0 dB | Caller flagged inserted loudness; bypass-toggle should be level-matched. |
| **SPX fetStrike** | threshold | -15 dB | -10 dB | Comp neutrality: -10 to -6 dB. (Vintage character user-dialed.) |
| **SPX fetStrike** | ratio | 8 | 2 | Comp neutrality: 1.5:1–2:1; FETs at 8:1 are heavy by default. |
| **SPX fetStrike** | attack | 0.5 ms (DEFAULTS) / 1 ms (factory) | 10 ms | Comp neutrality 10 ms; FET fast attack is character — user-dialed. |
| **SPX fetStrike** | release | 50 ms | 100 ms | Comp neutrality 100 ms. |
| **SPX fetStrike** | saturation | 0.3 (DEFAULTS) / 0 implicit (factory has no node) | 0 | Vintage character should not be inserted by default. |
| **SPX fetStrike** | makeup (factory only) | 4 dB | 0 dB | Inserted loudness; level-match for bypass-toggle. |
| **SPX optoPress** | peakReduction | 50 % (≈-30 dB threshold) | 17 % (≈-10 dB) | Map % → threshold via existing factory formula `-pr*0.6`; 17% gives -10 dB neutral. |
| **SPX optoPress** | tubeSaturation | 0.4 | 0 | Vintage character not inserted by default. |
| **SPX optoPress** | hfEmphasis | 0 | 0 | (Already neutral — listed for reconciliation only.) |
| **SPX optoPress** | ratio (factory) | 3 (factory) — not in DEFAULTS | 2 | Comp neutrality 1.5:1–2:1. |
| **SPX optoPress** | attack (factory) | 50 ms | 10 ms | Comp neutrality 10 ms. |
| **SPX optoPress** | release (factory) | 300 ms | 100 ms | Comp neutrality 100 ms. |
| **SPX parallelCrush** | threshold | -25 dB | -10 dB | Comp neutrality -10 to -6 (note: parallel comp threshold often runs hot on purpose, but rule says -10). |
| **SPX parallelCrush** | ratio | 10 | 2 | Comp neutrality 1.5:1–2:1; user dials high. |
| **SPX parallelCrush** | attack | 5 ms | 10 ms | Comp neutrality 10 ms. |
| **SPX parallelCrush** | release | 80 ms | 100 ms | Comp neutrality 100 ms. |
| **SPX parallelCrush** | crush | 0.7 | 0 | Caller flagged: transparent insert default; high crush is character. |
| **SPX parallelCrush** | mix | 50 % | 100 % | Caller rule: parallel at 100% wet is the neutral baseline (engine still has independent dry path so users can blend). |
| **SPX multiPress** | b1Thresh | -20 dB | -10 dB | Comp neutrality -10 to -6 dB (per band). |
| **SPX multiPress** | b1Ratio | 3 | 2 | Comp neutrality 1.5:1–2:1. |
| **SPX multiPress** | b2Thresh | -18 dB | -10 dB | Comp neutrality. |
| **SPX multiPress** | b2Ratio | 3 | 2 | Comp neutrality. |
| **SPX multiPress** | b3Thresh | -16 dB | -10 dB | Comp neutrality. |
| **SPX multiPress** | b3Ratio | 4 | 2 | Comp neutrality. |
| **SPX multiPress** | b4Thresh | -14 dB | -10 dB | Comp neutrality. |
| **SPX multiPress** | b4Ratio | 4 | 2 | Comp neutrality. |
| **SPX multiPress** | (all bands attack) | varies 3-10 ms (factory hardcoded) | 10 ms | Comp neutrality 10 ms. |
| **SPX multiPress** | (all bands release) | varies 50-120 ms (factory hardcoded) | 100 ms | Comp neutrality 100 ms. |
| **SPX transGate** | range | -80 dB | -20 dB | Gate neutrality: subtle range. (Note: factory currently flags `range` as Phase C5 worklet TODO — defaults still document UI intent.) |
| **SPX transGate** | release | 200 ms | 100 ms | Gate neutrality 100 ms. |
| **SPX midSideComp** | midThresh | -18 dB | -10 dB | Comp neutrality. |
| **SPX midSideComp** | midRatio | 3 | 2 | Comp neutrality. |
| **SPX midSideComp** | sideThresh | -24 dB | -10 dB | Comp neutrality (still routed but no-op until M/S split lands). |
| **SPX midSideComp** | sideRatio | 4 | 2 | Comp neutrality. |
| **SPX midSideComp** | release | 150 ms | 100 ms | Comp neutrality 100 ms. |
| **SPX multibandLimiter** | release (implicit factory) | 50 ms | 100 ms | Limiter neutrality 50–100 ms; 100 ms is steadier across bands. |
| **SPX masterWall** | threshold (worklet param) | -6 dB | -1 dB | Limiter neutrality threshold -1 dB. (Ceiling -0.1 already meets rule.) |
| **SPX masterWall** | ceiling | -0.1 dB (DEFAULTS) | -0.3 dB | Limiter neutrality -0.3 dB; reconcile with brickWall/multibandLimiter (-0.3). |
| **SPX masterWall** | clipMargin | 0.1 dB (DEFAULTS) / 0.3 (factory `safe()`) | 0.3 dB | Reconcile mismatch; 0.3 dB is the clearer headroom. |
| **SPX gainRider** | targetLevel | -18 dB | -10 dB | Comp neutrality threshold -10 to -6. (Active gain-rider on insert at -18 is too aggressive.) |
| **SPX gainRider** | speed | 0.5 (≈attack 105 ms / release 550 ms) | 0.95 (≈attack 10 ms / release 100 ms) | Map yields neutral 10 ms / 100 ms via factory formula `0.2 - s*0.19` and `1.0 - s*0.9`. |
| **SPX gainRider** | maxGain | 12 dB | 0 dB | No-op in current factory, but documented bound implies +12 dB ride; neutral default is 0 dB so engine when wired won't add gain. |
| **SPX gainRider** | smooth | 0.7 | 0.2 | Maps to knee. 0.7×30 = 21 dB knee. Neutral knee is 6 dB → 0.2 ≈ 6 dB. |
| **SPX breathGate** | threshold | -45 dB | -40 dB | Gate neutrality threshold -40 dB. |
| **SPX breathGate** | release | 150 ms | 100 ms | Gate neutrality 100 ms. |
| **SPX breathGate** | breathReduction (DEFAULTS only) | -12 dB | -20 dB | Gate "range" rule -20 dB. |
| **SPX sibilantCut** | freq | 7500 Hz | 7000 Hz | De-esser rule: 6–8 kHz; 7000 is the conventional center. |
| **SPX sibilantCut** | ratio | 6 | 3 | De-esser neutrality ratio 3:1. |
| **SPX sibilantCut** | threshold | -18 dB | -20 dB | De-esser neutrality -20 dB. (No-op until SC tree lands, but documents UI intent.) |
| **ph_AICompressor** | ratio | 4 | 2 | Comp neutrality 1.5:1–2:1. (Threshold -18 → keep, see judgment-call.) |
| **ph_AICompressor** | release | 150 ms (factory + registry) | 100 ms | Comp neutrality 100 ms. |
| **ph_AICompressor** | knee | 8 dB (factory) | 6 dB | Comp neutrality 6 dB. |
| **ph_BrickwallLimiter** | release | 100 ms | 100 ms | (Already neutral — listed in ✓ section.) |
| **ph_BrickwallLimiter** | lookahead | 5 ms | 5 ms | (Not in neutrality rules — neutral.) |
| **ph_BreathGate** | threshold | -45 dB | -40 dB | Gate neutrality -40 dB. |
| **ph_BreathGate** | release | 150 ms | 100 ms | Gate neutrality 100 ms. |
| **ph_BreathGate** | reduction | -12 dB | -20 dB | Gate "range" rule -20 dB. |
| **ph_Compressor** | threshold | -18 dB | -10 dB | Comp neutrality -10 to -6 dB. |
| **ph_Compressor** | ratio | 4 | 2 | Comp neutrality 1.5:1–2:1. |
| **ph_Compressor** | release | 150 ms | 100 ms | Comp neutrality 100 ms. |
| **ph_DeEsser** | threshold | -25 dB | -20 dB | De-esser neutrality -20 dB. |
| **ph_DeEsser** | ratio | 6 | 3 | De-esser neutrality 3:1. |
| **ph_DeEsser** | freq | 6500 Hz | 7000 Hz | De-esser rule 6–8 kHz; 7000 is conventional center (6500 also acceptable; trivial change). |
| **ph_DrumBus** | compress | 0.5 (→ thresh -17.5, ratio 6) | 0.0 (→ thresh -30, ratio 2) — or expose direct `threshold`/`ratio` params | Mapping puts ratio 6 + thresh -17.5 by default; below comp neutrality. (Drum bus is character; see judgment-call.) |
| **ph_DrumBus** | punch | 4 dB (pre-emph) | 0 dB | Inserted gain on insert; should be neutral by default. |
| **ph_DrumBus** | transient | 0.5 (→ attack 10.5 ms / release 125 ms) | 0.5 | (Already meets rule near 10 ms / 125 ≈ 100 ms.) — see ✓. |
| **ph_Expander** | threshold | -40 dB | -40 dB | (Already neutral — see ✓.) |
| **ph_Expander** | ratio | 2 | 2 | (Already neutral — see ✓.) |
| **ph_FETComp** | threshold | -15 dB | -10 dB | Comp neutrality -10 to -6 dB. |
| **ph_FETComp** | ratio | 8 | 2 | Comp neutrality 1.5:1–2:1. |
| **ph_FETComp** | attack | 0.5 ms | 10 ms | Comp neutrality 10 ms. |
| **ph_FETComp** | release | 50 ms | 100 ms | Comp neutrality 100 ms. |
| **ph_Gate** | threshold | -40 dB | -40 dB | (Already neutral — see ✓.) |
| **ph_Gate** | attack | 5 ms (factory) / 1 ms (registry) | 1 ms | Reconcile mismatch; gate neutrality 1 ms. |
| **ph_Gate** | release | 100 ms | 100 ms | (Already neutral — see ✓.) |
| **ph_Gate** | range | (no factory param) / -80 dB (registry) | -20 dB | Gate neutrality -20 dB. |
| **ph_Limiter** | ceiling | -0.3 dB | -0.3 dB | (Already neutral — see ✓.) |
| **ph_Limiter** | release | 50 ms | 100 ms | Limiter neutrality 50–100 ms; 100 ms preferred (rule midpoint). |
| **ph_LoudnessMaximizer** | loudness | -14 LUFS (→ comp threshold -14 dB + makeup +7 dB) | 0 LUFS (→ threshold 0 dB, makeup 0 dB) | Inserts ~7 dB loudness on bypass-toggle. Maximizer should be inert at default. |
| **ph_LoudnessMaximizer** | transient | 0.5 (→ attack ~25 ms) | 0.4 (→ attack ~20 ms) — minor | Comp neutrality 10 ms; current 25 ms is acceptable (see judgment-call). |
| **ph_LoudnessMaximizer** | (final ceiling release) | 50 ms (hardcoded) | 100 ms | Limiter neutrality 50–100; 100 preferred. |
| **ph_MultibandComp** | threshold0/1/2 | -18 dB each | -10 dB each | Comp neutrality. |
| **ph_MultibandComp** | ratio0/1/2 | 4 each | 2 each | Comp neutrality. |
| **ph_MultibandComp** | release (hardcoded) | 100 ms | 100 ms | (✓ neutral.) |
| **ph_MultibandComp** | attack (hardcoded) | 10 ms | 10 ms | (✓ neutral.) |
| **ph_MultibandComp** | compLow/Mid/High (registry) | 0.3 (→ thresh -28) | 0.75 (→ thresh -10) | Map via factory `compToThreshold` formula; 0.75 ≈ -10 dB neutral. |
| **ph_OpticalComp** | peakReduction | 50 % (→ thresh -20) | 25 % (→ thresh -10) | Comp neutrality threshold -10 dB; map via `prToThreshold` -40 × pr/100. |
| **ph_OpticalComp** | ratio (hardcoded) | 4 | 2 | Comp neutrality. |
| **ph_OpticalComp** | attack (hardcoded) | 30 ms | 10 ms | Comp neutrality. |
| **ph_OpticalComp** | release (hardcoded) | 500 ms | 100 ms | Comp neutrality. |
| **ph_OpticalComp** | tubeSat | 0.4 | 0 | Vintage character not inserted by default. |
| **ph_ParallelComp** | threshold | -30 dB | -10 dB | Comp neutrality. |
| **ph_ParallelComp** | ratio | 10 | 2 | Comp neutrality. |
| **ph_ParallelComp** | blend | 50 % | 100 % | Caller rule: parallel default 100% wet. |
| **ph_SpectralGate** | threshold (factory) | -50 dB / (-40 in registry) | -40 dB | Reconcile to gate-style -40 dB. |
| **ph_SpectralGate** | release | 60 ms | 100 ms | Gate neutrality 100 ms. |
| **ph_TubeComp** | threshold | -20 dB (factory) / -18 (registry) | -10 dB | Comp neutrality. |
| **ph_TubeComp** | ratio | 3 (factory) / 4 (registry) | 2 | Comp neutrality. |
| **ph_TubeComp** | attack (hardcoded) | 20 ms | 10 ms | Comp neutrality. |
| **ph_TubeComp** | release (hardcoded) | 300 ms | 100 ms | Comp neutrality. |
| **ph_TubeComp** | knee (hardcoded) | 12 dB | 6 dB | Comp neutrality. |
| **ph_TubeComp** | drive (factory) / tubeSat (registry) | 0.3 / 0.4 | 0 | Vintage character not inserted by default. |
| **ph_TubeComp** | warmth | 1.5 dB | 0 dB | Inserted EQ tilt on bypass-toggle; level-match. |
| **ph_VCAComp** | threshold | -15 dB (factory) / -10 (registry) | -10 dB | Reconcile and align (rule). |
| **ph_VCAComp** | ratio | 4 | 2 | Comp neutrality. |
| **ph_VCAComp** | attack | 0.01 (10 ms) factory / 3 ms registry | 10 ms | Reconcile; rule says 10 ms. |
| **ph_VCAComp** | release | 0.1 s factory / 100 ms registry | 100 ms | (Already aligned at 100 ms after unit reconciliation.) |
| **ph_VCAComp** | makeup | 0 dB factory / 2 dB registry | 0 dB | Reconcile; level-match for bypass-toggle. |
| **ph_VCAComp** | enhance (hardcoded peaking +0.5 dB @ 3 kHz) | +0.5 dB | 0 dB | Inserted "SSL G-Bus character"; not neutral. |
| **ph_VocalComp** | threshold | -20 dB (factory) / -18 (registry) | -10 dB | Comp neutrality. |
| **ph_VocalComp** | ratio | 4 (factory) / 3 (registry) | 2 | Comp neutrality. |
| **ph_VocalComp** | attack (hardcoded) | 5 ms | 10 ms | Comp neutrality. |
| **ph_VocalComp** | release (hardcoded) | 80 ms | 100 ms | Comp neutrality. |
| **ph_VocalComp** | knee (hardcoded) | 8 dB | 6 dB | Comp neutrality. |
| **ph_VocalComp** | presence | 1.5 dB | 0 dB | Inserted EQ tilt; not neutral. |

---

## ✓ Already neutral

- **SPX brickWall** — ceiling -0.3 dB, lookahead 3 ms, outputGain 0 dB. Truepeak/ispDetect flags (no-ops): inert.
- **SPX transientShaper** — attack 0, sustain 0, speed 0.5, outputGain 1. Caller note confirmed: zero attack/sustain knobs are neutral; parallel-blend engine produces dry-equivalent output at these values.
- **SPX masterWall** — release 100 ms, lookahead 5 ms, outputGain 0 dB, truePeak true.
- **SPX multibandLimiter** — ceiling -0.3 dB, lookahead 3 ms, xover1/2/3 200/2000/8000 Hz (sensible band splits, not "neutral" in the dB sense but reasonable defaults).
- **ph_BrickwallLimiter** — ceiling -0.3 dB, lookahead 5 ms, release 100 ms, outputGain 0 dB. Fully neutral.
- **ph_ChannelStrip** — inputGain 0, hpf 0 (off), lpf 20000 (off), phase 0, outputGain 0. Not strictly a dynamics plugin but listed in scope; entirely transparent.
- **ph_Expander** — threshold -40 dB, ratio 2. Matches gate/expander neutrality rule.
- **ph_Gate** — threshold -40 dB, release 100 ms, hold 50 ms. (Attack 5 ms factory / 1 ms registry: reconcile to 1 ms — see proposed.)
- **ph_AICompressor** — threshold -18, makeup 0, attack 10. (Threshold -18 borderline; see judgment-call. Other params neutral.)
- **ph_BreathGate**, **ph_DeEsser**, **ph_DrumBus** transient knob — partial neutrals listed inline.

## Judgment-call (no change)

- **SPX transientShaper** — `outputGain` defaults to **1** (linear unity). The `safe(p.outputGain, 1, 0, 4)` clamp range hints "linear gain 0..4", not dB. The UI may emit dB. Not a defaults bug; revisit if UI-engine unit mismatch is a real bug (out of scope here).
- **SPX optoPress** — leaving `tubeSaturation: 0.4` is defensible if the brand identity calls for "this is the vintage opto sound." Caller's edge-case note allows dialing-in character; proposing 0 is the safer transparent default. Either is justifiable; flagged proposed change but reviewer should decide.
- **SPX gainRider** — factory's "no makeup-gain node — accepted no-op" comment means `maxGain`/`minGain` knobs do nothing right now. Until a true rider lands (worklet), only `targetLevel`, `speed`, `smooth` change behavior. Proposed defaults still apply because they document intent.
- **ph_AICompressor** threshold -18 dB — registry min is -40, max 0. Rule says -10 to -6. -18 is one stop louder than rule (engages on more material). For an "AI" auto-tuner the comp expects to ride aggressively. Leaving at -18 is defensible for branding; proposing change to -10 keeps it neutral. Marked **judgment-call**.
- **ph_DrumBus** — explicitly a character bus comp (the whole point is punch + glue). Setting `compress: 0.0` defeats the plugin. Caller's "edge-case" rule for `glueBus`/`parallelCrush` applies: parallel/glue character tools may keep some character — but `punch: 4` (a pre-emphasis gain) clearly violates level-match. Recommend changing `punch` only, leave `compress: 0.5` if branding requires.
- **ph_LoudnessMaximizer** transient 0.5 → attack 25.5 ms — caller rule says 10 ms. 25 ms preserves transients (the explicit purpose of the knob). Leaving 0.5 (a documented user-friendly default) is defensible. Proposed minor change to 0.4 listed but optional.
- **SPX parallelCrush mix=50** — caller's neutrality rule says parallel comps default to 100 % wet. The plugin name "parallelCrush" implies a parallel-routed engine where `mix` is the dry/wet crossfader, so 50 % is the conventional "parallel comp" default. Proposed 100 % to follow the rule strictly; note the design intent diverges.
- **SPX/ph_ Multiband bands** — proposing -10 dB across all four bands is uniform but ignores real-world band-specific calibration (e.g. lows often run hotter). Proposed values follow the rule literally; reviewer may want a slight per-band offset (say -10/-10/-12/-14) to keep per-band gain reduction balanced.
- **Registry vs factory mismatches** — multiple plugins (warmPress, glueBus, fetStrike, optoPress, masterWall, ph_Gate, ph_VCAComp, ph_TubeComp, ph_VocalComp, ph_SpectralGate) have *different* defaults between PLUGIN_DEFAULTS, factory `??`/`safe()` fallbacks, and registry params. Worth a separate cleanup pass to make all three sources agree. Not a "defaults choice" issue; an internal-consistency issue.
