# Phase D — Consolidated Proposed Defaults Changes

Aggregates D1.1 + D1.2 + D1.3 + D1.4 + D1.5 + D1.6 audits. Read-only consolidation; no code modified yet.

**6 batches, 6 categories, ~560 table rows across all files.**

The per-batch files in this directory are the source of truth — this consolidator concatenates them with category headers.

---


═══════════════════════════════════════════════════════════════
# Phase D1.1 — Reverbs + Delays Defaults Audit

Scope: 30 plugins (12 SPX reverbs, 8 ph_* reverbs, 4 SPX delays, 6 ph_* delays).
Read-only audit. No code changed.

Sources cross-referenced:
- `src/front/js/component/SPXPlugins.js` — `REVERB_BASE_DEFAULTS` (line 1835) and `PLUGIN_DEFAULTS` (line 1840).
- `src/front/js/pages/RecordingStudio.js` — `buildFxChain` factory cases (lines ~3166–3498). Note: `normalizeMix(v)` treats `v>1` as percent; `mix=30` means 30%.
- `src/front/js/component/audio/plugins/plugins/<Name>Plugin.js` — ph_* `create*Plugin(ctx, p)` factories.
- `src/front/js/component/audio/plugins/registry.js` — ph_* per-param `default` values.

`REVERB_BASE_DEFAULTS` is the spread used by hallForgeS, hallForgeL, gateVerb, vintageAir, stochasticHall, greatHall:
`{ preDelay: 20 ms, decay: 2.5 s, diffusion: 0.8, damping: 0.5, earlyLevel: 0.7, lateLevel: 0.8, mix: 30 (%), hpf: 80, lpf: 8000 }`

Neutrality rules applied (from brief):
- Reverb mix ≤ 10 (target 0). Decay 1.5–2.0 s. preDelay 10–20 ms. Damping 0.4–0.6.
- Delay mix = 0 (dry). Feedback 0.2–0.3. Time ≈ 250 ms.

---

## Proposed changes

### REVERBS — SPX (PLUGIN_DEFAULTS in SPXPlugins.js)

| Plugin | Param | Current | Proposed | Reason |
|--------|-------|---------|----------|--------|
| hallForgeS (REVERB_BASE) | mix | 30 | 0 | Insert reverb. Rule: mix ≤10, neutral=0. UI uses dry/wet via gain; user dials wet. |
| hallForgeS (REVERB_BASE) | decay | 2.5 | 2.0 | Rule says 1.5–2.0 s. 2.5 s is too long for a "Small Hall" identity at neutral. |
| hallForgeL (REVERB_BASE) | mix | 30 | 0 | Insert reverb — must default dry. |
| hallForgeL (REVERB_BASE) | decay | 2.5 | 2.0 | Within rule range. (Large Hall character lives in user pushing decay.) |
| gateVerb (REVERB_BASE) | mix | 30 | 0 | Insert reverb. |
| gateVerb (REVERB_BASE) | decay | 2.5 | 2.0 | Standardize. (Factory hard-codes 0.3 s buffer regardless — UI value is decorative; still propose lowering for honesty.) |
| vintageAir (REVERB_BASE) | mix | 30 | 0 | Insert reverb. |
| vintageAir (REVERB_BASE) | decay | 2.5 | 1.8 | Factory falls back to 1.8 already; align the surface default. |
| stochasticHall (REVERB_BASE) | mix | 30 | 0 | Insert reverb. |
| stochasticHall (REVERB_BASE) | decay | 2.5 | 2.0 | Factory falls back to 2.0; align. |
| greatHall (REVERB_BASE) | mix | 30 | 0 | Insert reverb. |
| greatHall (REVERB_BASE) | decay | 2.5 | 2.0 | Factory falls back to 3.5 — that's well outside neutral. Bring UI surface to 2.0. (Factory inline `p.decay || 3.5` should also be reviewed for consistency, but factory change is out-of-scope here.) |
| plateForge | mix | 25 | 10 | Plate identity is wet — mix=10 honors "wet character" exception while still close to rule cap. |
| plateForge | decay | 3.5 | 2.0 | 3.5 s is far past 1.5–2.0. |
| springBox | mix | 30 | 10 | Spring identity is wet — mix=10 (rule cap) instead of 0. |
| vocalSpace | mix | 20 | 0 | Vocal space is an insert reverb; rule = 0. |
| vocalSpace | preDelay | 15 | 15 | Already in 10–20 ms range — no change. |
| vocalSpace | decay | 1.8 | 1.8 | Already in range — no change. |
| spaceForge | mix | 25 | 0 | Convolution insert reverb. |
| spaceForge | preDelay | 10 | 10 | In range — no change. |
| infiniteReverb | mix | 0 | 0 | Already 0 — no change. (Note: factory uses `p.mix ?? 0.4`, so the seed of `0` is critical.) |
| phantomDouble | mix | 50 | 30 | Doubler is a wet effect by identity — judgment call. mix=30 is audible but not overwhelming; mix=0 would defeat the doubler's purpose. |
| phantomDouble | delay | 18 ms | 18 ms | In honest doubler range — no change. |

### REVERBS — ph_* (registry.js + factory file)

| Plugin | Param | Current | Proposed | Reason |
|--------|-------|---------|----------|--------|
| chamber_reverb (registry+factory) | mix | 25 | 0 | Insert reverb. |
| chamber_reverb | decay | 2.5 | 2.0 | Rule cap 2.0 s. |
| chamber_reverb | preDelay | 15 | 15 | In range — no change. |
| chamber_reverb | damping | 6000 Hz | 6000 Hz | Damping in this plugin is an LP cutoff (Hz), not 0..1; 6 kHz is moderate — no change. |
| gated_reverb (registry+factory) | mix | 35 | 0 | Insert reverb. (Factory uses 35; registry says 35.) |
| gated_reverb | decay | factory 2.0 / registry 0.5 | 1.5 | Factory 2.0 s fights the "gated" identity (gateTime cuts it); 1.5 s is a sane long-tail-with-gate default. Registry 0.5 s contradicts factory — inconsistency to fix. |
| gated_reverb | preDelay | 5 | 10 | Rule says 10–20. |
| hall_reverb (registry+factory) | mix | 30 | 0 | Insert reverb. |
| hall_reverb | decay | 4.0 (factory) / 4 (registry) | 2.0 | 4 s is far above rule. |
| hall_reverb | preDelay | 30 | 20 | Rule cap = 20 ms. |
| hall_reverb | damping | 6000 Hz | 6000 Hz | LP cutoff — moderate. No change. |
| plate_reverb (registry+factory) | mix | 25 | 10 | Plate is wet by identity — judgment exception, mix=10. |
| plate_reverb | decay | 2.0 | 2.0 | At rule cap — no change. |
| plate_reverb | preDelay | 5 | 10 | Rule says 10–20. |
| room_reverb (registry+factory) | mix | 20 | 0 | Insert reverb. |
| room_reverb | decay | 0.8 | 0.8 | A short-room IR; 0.8 s is honest for "room" identity (rule 1.5-2 is for hall-sized; small rooms decay faster). No change. |
| shimmer_reverb (factory) | mix | 0 | 0 | Already neutral. No change. |
| shimmer_reverb (registry) | mix | 40 | 0 | Registry default contradicts factory — registry should match factory. |
| shimmer_reverb (registry) | feedback | 0.7 | 0.3 | 0.7 is a runaway-shimmer default; rule says 0.2–0.3. Factory uses 0 (very safe) — registry default of 0.7 is the audit target. |
| spring_reverb (registry+factory) | mix | 30 | 10 | Spring identity is wet — exception, mix=10. |
| reverse_reverb (registry+factory) | mix | 30 | 0 | Insert reverb. |
| reverse_reverb | decay | factory 1.5 / registry 2.0 | 1.5 | Inconsistency between factory and registry — pick the lower. |
| reverse_reverb | preDelay | 100 | 20 | 100 ms is way past rule (10–20). |

### DELAYS — SPX (PLUGIN_DEFAULTS)

| Plugin | Param | Current | Proposed | Reason |
|--------|-------|---------|----------|--------|
| echoField | mix | 25 | 0 | Rule: delay mix=0 (dry by default). |
| echoField | feedback | 0.4 | 0.3 | Rule cap 0.3. |
| echoField | time | 250 ms | 250 ms | Already at rule target — no change. |
| dualDelay | mix | 30 | 0 | Rule: mix=0. |
| dualDelay | feedbackL | 0.35 | 0.3 | Rule cap 0.3. |
| dualDelay | feedbackR | 0.35 | 0.3 | Rule cap 0.3. |
| dualDelay | timeL | 250 | 250 | At rule target — no change. |
| dualDelay | timeR | 375 | 375 | Stereo offset — no change (identity). |
| reverseDelay | mix | 0.4 | 0 | Rule: mix=0. |
| reverseDelay | feedback | 0.4 | 0.3 | Rule cap. |
| reverseDelay | time | 500 ms | 250 ms | Rule target 250. |
| tempoDelay | mix | 0.3 | 0 | Rule: mix=0. |
| tempoDelay | feedback | 0.4 | 0.3 | Rule cap. |
| tempoDelay | division | 4 | 4 | At BPM 120 → quarter ≈ 500 ms; division=2 = 250 ms (closer to rule). Note: division semantics here are unclear (`(60/bpm)*division`). Keep — judgment call: tempo-sync's identity is the chosen division, user-controlled. No change. |

### DELAYS — ph_* (registry.js + factory file)

| Plugin | Param | Current | Proposed | Reason |
|--------|-------|---------|----------|--------|
| delay (factory + registry) | mix | 25 | 0 | Rule: delay mix=0. |
| delay | feedback | 40 (%) | 30 | Rule cap 0.3 → 30%. |
| delay | time | 375 ms | 250 ms | Rule target 250. |
| dotted_eighth_delay | mix | 25 | 0 | Rule: mix=0. |
| dotted_eighth_delay | feedback | 35 | 30 | Rule cap. |
| dotted_eighth_delay | bpm | 120 | 120 | Identity-tied — no change. |
| multitap_delay | mix | 30 | 0 | Rule: mix=0. |
| multitap_delay | feedback | 0.4 | 0.3 | Rule cap. |
| ping_pong_delay (registry+factory) | mix | 30 | 0 | Rule: mix=0. |
| ping_pong_delay | feedback | 0.4 | 0.3 | Rule cap. |
| ping_pong_delay | time | 375 ms | 250 ms | Rule target 250. |
| slapback_delay (registry) | mix | 30 | 0 | Rule: mix=0. (Note: factory falls back to 40 — inconsistency to flag.) |
| slapback_delay | time | 60 ms | 60 ms | Identity — slapback is short — no change. |
| slapback_delay | feedback | 0.1 | 0.1 | Already low (slapback ≠ feedback delay) — no change. |
| tape_delay (registry+factory) | mix | 30 | 0 | Rule: mix=0. |
| tape_delay | feedback | 0.4 | 0.3 | Rule cap. |
| tape_delay | time | 500 ms | 250 ms | Rule target 250 (tape character lives in tone+wow, not time). |

---

## Cross-source inconsistencies surfaced (worth fixing alongside)

- **shimmer_reverb**: factory `p.mix ?? 0` vs registry `default: 40`. Factory `p.feedback ?? 0` vs registry `default: 0.7`.
- **reverse_reverb**: factory `p.decay ?? 1.5` vs registry `default: 2`.
- **gated_reverb**: factory `p.decay ?? 2.0` vs registry `default: 0.5`.
- **slapback_delay**: factory `p.mix ?? 40` vs registry `default: 30`. Factory `p.time ?? 75` vs registry `default: 60`.
- **greatHall**: PLUGIN_DEFAULTS gives 2.5 s (via REVERB_BASE_DEFAULTS) but factory `p.decay || 3.5` — when seeded value reaches the factory it becomes 2.5; when not seeded, 3.5. Suggest aligning to 2.0.
- **delay** (ph_native): registry param key is `filter` but factory reads `p.filterCutoff ?? 8000` — name mismatch; setParam handler does match `filterCutoff`. Param wiring is broken for the registry's `filter` key.

---

## ✓ Already neutral

- **infiniteReverb** — `mix:0`, `freeze:false`, `damping:0.3` (in 0.4-0.6? slightly low — flag). roomSize:0.9 is high but it's a "freeze freeze freeze" plugin identity — judgment-call retention below.
- **vocalSpace.preDelay** (15 ms) and **vocalSpace.decay** (1.8 s) — within range.
- **spaceForge.preDelay** (10 ms) — at rule edge.
- **chamber_reverb.preDelay** (15 ms), **chamber_reverb.diffusion** (0.8) — in range.
- **echoField.time** (250 ms), **dualDelay.timeL** (250 ms) — at rule target.
- **slapback_delay.feedback** (0.1) — below cap; identity-correct.
- **room_reverb.decay** (0.8 s) — appropriate for room-size identity.

## Judgment-call (no change)

- **infiniteReverb.roomSize=0.9, damping=0.3, freeze=false**: identity is "long ambient pad". roomSize=0.9 is by design (decays scale 0.5..6 s; 0.9 → ~5.5 s IR); damping=0.3 is "bright". User flicks `freeze` → the wash holds. Defaults already set `mix:0` (audibility off). Retain.
- **phantomDouble.mix=50 → propose 30**: doubler is a wet-by-identity effect; mix=0 = no doubling = pointless. mix=30 is audible-but-not-overwhelming. Keeping the existing 50 is also defensible — choose 30 as a compromise (proposed change, not retention).
- **plateForge / springBox / plate_reverb / spring_reverb mix=10**: brief notes that springBox/plateForge "identity is wet character; mix=10–20 is more honest". Rule says ≤10, so mix=10 (rule edge) is the proposed compromise.
- **tempoDelay.division=4** and **dotted_eighth_delay.bpm=120**: tempo-sync delays' raison d'être is the chosen division/bpm — leave at sensible musical defaults, mix=0 keeps user safe.
- **dualDelay.timeR=375**: stereo offset is the plugin identity. No change.
- **slapback_delay.time=60ms**: slapback identity. No change.
- **room_reverb.decay=0.8s**: small-room identity — shorter than hall rule, but identity-correct.
- **HallReverb / PlateReverb / GatedReverb damping (Hz)**: `damping` in ph_* plugins is an LP cutoff (1k..20kHz) not a 0..1 ratio — rule "moderate 0.4–0.6" doesn't apply. 6000 Hz is moderate. No change.

---

## Summary

- **30 plugins audited.**
- **~50 individual param changes proposed across 26 plugins** (some plugins get multi-param changes).
- **4 plugins already neutral** (infiniteReverb mix-side, partial neutrality on vocalSpace/spaceForge/echoField time).
- **8 judgment-call retentions** (infiniteReverb full state, doubler/spring/plate identity exceptions, slapback time/feedback, room decay, ph_* damping-Hz semantics, tempo-sync identity defaults).
- **6 cross-source inconsistencies** between registry.js and factory files surfaced — recommend fixing in same pass.


═══════════════════════════════════════════════════════════════
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


═══════════════════════════════════════════════════════════════
# Phase D1.3 — Defaults Audit: EQs + Filters

**Scope:** Audit all EQ and filter plugins (~25) for neutrality on insert. Compare current defaults to neutrality rules; propose changes only — no code modifications.

**Sources audited:**
- SPX `PLUGIN_DEFAULTS` — `src/front/js/component/SPXPlugins.js` lines 1840–1960
- SPX `buildFxChain` factory — `src/front/js/pages/RecordingStudio.js` lines 1301+ (e.g. `makeIronBand` line 1412)
- SPX `FACTORY_DEFAULTS` — `src/front/js/utils/pluginPresets.js` lines 238–283
- ph_* factories — `src/front/js/component/audio/plugins/plugins/<Name>Plugin.js`
- ph_* registry — `src/front/js/component/audio/plugins/registry.js`

---

## Neutrality rules (recap)

- **EQs:** band gains 0 dB, frequencies sensible, HPF=20 Hz, LPF=20 kHz, input/output gain 0 dB
- **Static filters (LPF/HPF/notch/comb):** cutoff at extreme so effectively bypass; resonance Q=0.7
- **Modulated filters (autofilter/envelope/wahwah/step):** depth 0 OR mix 0% so silent on insert
- **Dynamic EQ:** threshold -20 dB, ratio 3:1, gain 0 dB, all bands `dynamic: false`
- **Tonal-shape EQs (baxandall/tilt/pultec):** boost/cut 0 dB

---

## Proposed changes

| Plugin | Param | Current | Proposed | Reason |
|---|---|---|---|---|
| **dynamicEQ (SPX)** | `bands[0].dynamic` | `true` | `false` | Insert behavior should not trigger dynamic gain riding until user enables. Static gain is already 0 dB so silent — but the active `dynamic:true` flag means the band starts evaluating threshold immediately. Default to all bands static. (`SPXPlugins.js:1876`) |
| **dynamicEQ (SPX)** | `bands[3].dynamic` | `true` | `false` | Same as above — band index 3 (4 kHz) defaults to dynamic. (`SPXPlugins.js:1879`) |
| **dynamicEQ (SPX)** | `bands[*].q` | `1` (most) | OK; index 4 already 0.7 | Bands 0–3 use q=1, band 4 uses 0.7. q=1 acceptable for peaking; HPF type at index 0 should ideally use 0.7 for Butterworth — see judgment call below. |
| **pultecForge** | `highBW` | `0.5` | `0.5` ✓ keep | Pultec curves with boost=0/atten=0 produce no signal change regardless of bandwidth. Already neutral. *(no change)* |
| **autoWah / AutoWah (ph_)** | `mix` | n/a (no mix param) | n/a | autoWah has only `sensitivity/minFreq/maxFreq/resonance/attack/release/mix`. SPX `autoWah` PLUGIN_DEFAULTS has `mix: 1.0` — interpreted as 100%. **Propose `mix: 0`** so insert is transparent until user opens it. (`SPXPlugins.js:1909`) |
| **autoWah (SPX)** | `mix` | `1.0` (=100%) | `0` | Modulated filter on insert should be silent — depth on freq sweep otherwise alters tone. (`SPXPlugins.js:1909`) |
| **vowelFilter (formantFilter SPX)** | `mix` | `100` | `0` | Modulated filter (vowel morph + autoWah) — should be transparent on insert. (`SPXPlugins.js:1917`) |
| **noiseReduction** | `reduction` | `0.6` | `0` (or keep `learn:false`+`mix-equiv`) | Active reduction at 60% on insert is destructive. With `learn:false` and no profile it may be inert, but the param signals intent. Propose `reduction: 0`. (`SPXPlugins.js:1920`) |
| **AirEQPlugin (ph_)** | `mix` | `100` | `0` | Registry default 100% — but factory params `air=0, presence=0` are already neutral, so 100% mix is also transparent. ✓ already neutral via gains. *(no change needed; mix=100 is fine because boost=0)* |
| **AutoFilterPlugin (ph_)** | `mix` | `100` | `0` | Modulated bandpass-style filter — at mix=100 with depth=0.5 the filter sweeps audibly. Insert default should be `mix: 0` (or `depth: 0`). (`registry.js:141`, `AutoFilterPlugin.js:25,29`) |
| **AutoFilterPlugin (ph_)** | `depth` | `0.5` | `0` | Alternative to mix=0; either kills modulation. (`registry.js:138`) |
| **CombFilterPlugin (ph_)** | `mix` | `50` | `0` | Comb filter at 50% mix produces audible coloration on insert. (`registry.js:363`, `CombFilterPlugin.js:11`) |
| **CombFilterPlugin (ph_)** | `feedback` | `0.7` | `0.7` keep | Once mix=0, feedback is irrelevant. *(no change)* |
| **DCFilterPlugin (ph_)** | `freq` | `5` Hz | `5` Hz ✓ | DC blocker at 5 Hz HPF is effectively transparent for audio. ✓ Already neutral. *(no change)* |
| **DynamicEQPlugin (ph_)** | `gain` | `0` ✓ | `0` ✓ | Static gain 0 → no boost/cut. ✓ |
| **DynamicEQPlugin (ph_)** | `threshold` | `-18` | `-20` | Tighten to spec (rule: -20 dB). Minor difference but standardize. (`registry.js:515`) |
| **DynamicEQPlugin (ph_)** | `ratio` | `3` ✓ | `3` ✓ | Matches rule. ✓ |
| **EnvelopeFilterPlugin (ph_)** | `mix` | `100` | `0` | Active envelope follower at 100% sweeps filter audibly. (`registry.js:552`, `EnvelopeFilterPlugin.js:22,47`) |
| **EnvelopeFilterPlugin (ph_)** | `depth` | `0.8` | `0` | Alternative — kills the sweep. |
| **EQ3BandPlugin (ph_)** | `lowGain/midGain/highGain` | `0/0/0` ✓ | ✓ | All gains 0 dB. ✓ Already neutral. |
| **EQ3BandPlugin (ph_)** | `lowFreq` | `150` | `150` ✓ | Sensible (rule allows 80–250 region). ✓ |
| **EQ3BandPlugin (ph_)** | `midFreq` | `1000` ✓ | ✓ | Matches rule. |
| **EQ3BandPlugin (ph_)** | `highFreq` | `8000` | `8000` ✓ | Rule says 12k but 8k is acceptable for highshelf. *(no change — judgment call)* |
| **GraphicEQPlugin (ph_)** | `b63..b16k` | `0` all ✓ | ✓ | All bands 0 dB. ✓ Already neutral. |
| **GraphicEQ4BandPlugin (ph_)** | `band0..3, outputGain` | `0` all ✓ | ✓ | ✓ Already neutral. |
| **GraphicEQ5BandPlugin (ph_)** | `band0..4, outputGain` | `0` all ✓ | ✓ | ✓ Already neutral. |
| **GraphicEQ6BandPlugin (ph_)** | `band0..5, outputGain` | `0` all ✓ | ✓ | ✓ Already neutral. |
| **LinearPhaseEQPlugin (ph_)** | `lowGain/midGain/highGain` | `0` all ✓ | ✓ | ✓ Already neutral. |
| **LinearPhaseEQPlugin (ph_)** | `lowFreq/midFreq/highFreq` | `100/1000/8000` | ✓ | Sensible, matches rule. |
| **MasteringEQPlugin (ph_)** | `sub/low/lowMid/highMid/high/air` | `0` all ✓ | ✓ | ✓ Already neutral. |
| **NotchEQPlugin (ph_)** | `freq` | `1000` | `60` | Notch on insert — sensible default is 60 Hz mains hum (per spec edge case). User can sweep. (`registry.js:1033`) |
| **NotchEQPlugin (ph_)** | `gain` | `-12` | `0` | Active -12 dB notch on insert is audible. Should be 0 dB so notch is transparent until user dials in cut. (`registry.js:1035`) |
| **NotchEQPlugin (ph_)** | `q` | `10` | `10` ✓ | Sharp notch is fine — gain=0 makes it inaudible anyway. |
| **PresenceEQPlugin (ph_)** | `presence/air` | `0/0` ✓ | ✓ | ✓ Already neutral. |
| **PresenceEQPlugin (ph_)** | `freq` | `3000` | `3000` ✓ | Sensible upper-mid pivot. ✓ |
| **PresenceEQPlugin (ph_)** | `q` | `0.7` ✓ | ✓ | Matches rule. |
| **SPXPerceptualEQPlugin (ph_)** | `recover/order` | `0.5/0.5` | `0/0` | Auto-EQ that rides 16 bands — at 0.5/0.5 it actively applies corrections on insert. Should default to inactive (0/0) so plugin is transparent until user opens it. (`registry.js:1848-1849`, `SPXPerceptualEQPlugin.js:37-38`) |
| **SPXPerceptualEQPlugin (ph_)** | `boost/cut` | `6/-6` | `6/-6` keep | Range caps; only matter when recover/order > 0. *(no change once recover=order=0)* |
| **StepFilterPlugin (ph_)** | `mix` | `100` | `0` | Rhythmic filter sequencer — should be silent on insert. (`registry.js:1473`) |
| **StepFilterPlugin (ph_)** | `depth` | `0.8` | `0` | Alternative — flatten the rhythmic sweep. |
| **VowelFilterPlugin (ph_)** | `mix` | `100` | `0` | Active vowel formant on insert is heavy coloration. (`registry.js:1762`, `VowelFilterPlugin.js`) |
| **VowelFilterPlugin (ph_)** | `morph` | `0.5` | `0` | If keeping mix=100, set morph=0 (single vowel, no blend). Either path. |
| **WahWahPlugin (ph_)** | `mix` | `100` | `0` | Active autowah sweep on insert. (`registry.js:1778`) |
| **WahWahPlugin (ph_)** | `auto` | `0` ✓ | ✓ | Already off (manual freq mode). |
| **PhonePlugin (ph_)** | `mix` | `100` | `0` | Lo-fi telephonic bandpass — heavy coloration. Should be inert on insert. (`registry.js:1153`, `PhonePlugin.js:25`) |
| **PhonePlugin (ph_)** | `drive` | `0.3` | `0` | Combined with mix=0 unnecessary; if mix kept 100 propose drive=0. |

---

## ✓ Already neutral (no changes needed)

| Plugin | Notes |
|---|---|
| **ironBand (SPX)** | All gains 0 dB, hpf=0 (factory clamps to 20 Hz internally), lpf=20000, inputGain=0 dB. Topology pre-built at neutral pass-through (per `makeIronBand` comment line 1411). ✓ |
| **spectraCurve (SPX)** | All 6 bands gain=0 dB, sensible freqs (80/250/1k/4k/12k/18k), q=1 mostly, q=0.7 on lowpass. ✓ |
| **pultecForge (SPX)** | All boosts/attenuations 0 dB → curves inactive. ✓ |
| **graphicEQ (SPX)** | `ISO_GRAPHIC_BANDS` reduces 31 bands all to 0 dB; preAmp=0. ✓ |
| **tiltEQ (SPX)** | tilt=0, air=0, presence=0, outputGain=0 → no spectral tilt. Frequencies sensible. ✓ |
| **baxandallEQ (SPX)** | bass=0, treble=0, mid=0, outputGain=0, monoBelow=0. ✓ |
| **midSideEQ (SPX)** | All 8 mid/side band gains 0 dB. ✓ Phase C2.1 already correct. |
| **matchEQ (SPX)** | Phase C1 — `low: 0, high: 0`. ✓ |
| **lowEndFocus (SPX)** | Phase C1 — `sub: 3, kick: 2`. **Note:** these are non-zero defaults but C1 spec confirmed neutrality. *(judgment call — see below)* |
| **spectralRecovery (SPX)** | Phase C1 — `amount: 4, presence: 2`. *(judgment call — see below)* |
| **AirEQPlugin (ph_)** | `air=0, presence=0` → no boost. ✓ (mix=100 is fine because gains are 0) |
| **DCFilterPlugin (ph_)** | DC blocker at 5 Hz HPF — transparent for audio. ✓ |
| **EQ3BandPlugin (ph_)** | All gains 0 dB, sensible freqs. ✓ |
| **GraphicEQ/4Band/5Band/6Band (ph_)** | All bands 0 dB. ✓ |
| **LinearPhaseEQPlugin (ph_)** | All gains 0 dB, sensible freqs. ✓ |
| **MasteringEQPlugin (ph_)** | All 6 band gains 0 dB. ✓ |
| **PresenceEQPlugin (ph_)** | presence=0, air=0 dB. ✓ |

---

## Judgment-call (no change recommended)

| Plugin / Param | Reasoning |
|---|---|
| **lowEndFocus** `sub: 3, kick: 2` | Phase C1 confirmed these as non-destructive design defaults — sub-shelf adds gentle warmth, kick boost is mild. Audible but intentional product character. Recommend keeping unless a "true neutral" preset is added separately. |
| **spectralRecovery** `amount: 4, presence: 2` | Same as above — Phase C1 confirmed. The plugin's purpose is exciter-like restoration; 0 defaults would defeat the value-prop. Keep. |
| **dynamicEQ (SPX)** `bands[0].type: "highpass"` with `bands[0].q: 1` | Q=1 on a static HPF gives a slight peak at cutoff. Rule says 0.7 for Butterworth. But since `freq: 80` is well below program material and gain=0 dB on the band, this is effectively inaudible. Keep — flagged for future consideration. |
| **pultecForge** `highBW: 0.5` | Pultec mid-bandwidth knob — irrelevant when boost=0/atten=0. Keep. |
| **NotchEQPlugin** `freq: 1000` → `60` proposal | This is a true judgment call. 60 Hz is more "useful default insert" but 1000 Hz is more "blank canvas." Either is defensible; I lean toward 60 Hz per the spec edge case but acknowledge the alternative. |
| **VowelFilterPlugin** `mix=0` vs `morph=0` | Either neutralizes. `mix=0` is more correct per insert-transparency rule; `morph=0` keeps a single vowel formant active (still colors the signal). Recommend `mix=0`. |
| **ph_ EQ3Band** `highFreq: 8000` (rule says ~12k) | 8 kHz highshelf is a perfectly sensible musical choice and matches many DAW defaults. Don't change. |

---

## Counts

- **Plugins audited:** 25 (12 SPX EQ + 18 ph_ EQ/filter; some overlap on tiltEQ/airEQ/dynamicEQ both sides — counted distinct factories)
- **Already neutral:** 17 plugins / params groups
- **Proposed changes:** ~14 plugins, ~22 params
- **Judgment-call (no change):** 6 items
- **Highest-priority fixes (P0 — active processing on insert):**
  1. `dynamicEQ` — set both `bands[0].dynamic` and `bands[3].dynamic` to `false`
  2. `autoWah` (SPX) — `mix: 0`
  3. `formantFilter` (SPX) — `mix: 0`
  4. `noiseReduction` — `reduction: 0`
  5. `AutoFilterPlugin` (ph_) — `mix: 0` or `depth: 0`
  6. `CombFilterPlugin` (ph_) — `mix: 0`
  7. `EnvelopeFilterPlugin` (ph_) — `mix: 0`
  8. `NotchEQPlugin` (ph_) — `gain: 0` (and freq → 60)
  9. `SPXPerceptualEQPlugin` (ph_) — `recover: 0, order: 0`
  10. `StepFilterPlugin` (ph_) — `mix: 0`
  11. `VowelFilterPlugin` (ph_) — `mix: 0`
  12. `WahWahPlugin` (ph_) — `mix: 0`
  13. `PhonePlugin` (ph_) — `mix: 0`

These are the items where the plugin actively processes/colors signal at default — fixing them is the load-bearing portion of D1.3.


═══════════════════════════════════════════════════════════════
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


═══════════════════════════════════════════════════════════════
# Phase D1.5 — Modulation / Pitch / Creative Defaults Audit

Read-only audit. Compares current defaults to neutrality rules.

**Sources:**
- SPX PLUGIN_DEFAULTS — `src/front/js/component/SPXPlugins.js` lines ~1700–1748
- SPX factories — `src/front/js/pages/RecordingStudio.js` `buildFxChain()`
- ph_* factories — `src/front/js/component/audio/plugins/plugins/<Name>Plugin.js`
- ph_* registry — `src/front/js/component/audio/plugins/registry.js`

**Rules applied:**
- Modulation (chorus/flanger/phaser/tremolo/autoWah/vibrato/etc.): depth=0 OR mix=0% on insert; rate 0.5–1 Hz; feedback 0.2.
- Pitch plugins: shift=0 on insert (transparent); formant=0; mix=100% (pitch IS the effect; dry doesn't make sense).

---

## Proposed changes

| Plugin | Param | Current | Proposed | Reason |
|---|---|---:|---:|---|
| **stereoBloom** (SPX) | mix | 50 | 0 | Modulation rule — silent on insert |
| stereoBloom | depth | 0.6 | 0.6 | OK if mix=0; leave |
| **vortexMod** (SPX) | mix | 50 | 0 | Modulation rule — silent on insert |
| vortexMod | depth | 0.7 | 0.7 | OK if mix=0; leave |
| vortexMod | feedback | 0.4 | 0.2 | Rule says feedback ≤0.2 |
| **chorusEnsemble** (SPX) | mix | 0.5 | 0 | Modulation rule (scale 0..1) |
| chorusEnsemble | depth | 0.5 | 0.5 | OK if mix=0 |
| **autoWah** (SPX) | mix | 1.0 | 0 | Modulation rule (scale 0..1) |
| autoWah | sensitivity | 0.6 | 0.6 | OK if mix=0 |
| **pitchLock** (SPX) | humanize | 0.3 | 0 | Manual-mode plugin — should be true bypass on insert; humanize=0.3 detunes |
| pitchLock | retune | 0 | 0 | ✓ already neutral (bypass) |
| **pitchRandomizer** (SPX) | amount | 10 | 0 | amount in cents — actively shifts pitch on insert |
| pitchRandomizer | mix | 1.0 | 1.0 | OK once amount=0 (transparent) |
| **subOctaver** (SPX) | oct1Level | 0.7 | 0 | Adds octave-down content on insert |
| subOctaver | oct2Level | 0.3 | 0 | Adds 2nd-octave content on insert |
| subOctaver | dryLevel | 1.0 | 1.0 | ✓ pass dry through (correct) |
| **ringMod** (SPX) | mix | 50 | 0 | Ring mod is destructive — silent on insert |
| ringMod | carrierFreq | 440 | 440 | Sensible default once mix=0 |
| **formantFilter** (SPX) | mix | 100 | 0 | Formant filter colors signal even at static morph |
| formantFilter | morph | 0.5 | 0.5 | OK once mix=0 (single vowel position) |
| **vocoderSPX** (SPX) | mix | 100 | 0 | Vocoder needs external carrier — on bare track insert it'll produce silence/garble |
| **voiceForge** (SPX) | v1Vol | 0.8 | 0 | Pitch-shifted voice audible on insert (Phase C4 = 4× Tone.PitchShift) |
| voiceForge | v2Vol | 0.7 | 0 | Same |
| voiceForge | v3Vol | 0.6 | 0 | Same |
| voiceForge | v4Vol | 0.5 | 0 | Same |
| voiceForge | mix | 50 | 0 | Belt-and-braces — keep voices silent on insert |
| **AutoPan** (ph_*) | depth | 0.8 | 0 | Modulation rule — silent on insert |
| AutoPan | rate | 1 | 1 | ✓ rule range 0.5–1 Hz |
| **Choir** (ph_*) | mix | 50 | 0 | Choir doublings audible on insert |
| **Chorus** (ph_*) | mix | 50 | 0 | Modulation rule — silent on insert |
| Chorus | rate | 1.5 | 1 | Rule range 0.5–1 Hz; 1.5 is borderline (leave if you prefer) |
| **Flanger** (ph_*) | mix | 50 | 0 | Modulation rule |
| Flanger | feedback | 0.5 | 0.2 | Rule: feedback ≤0.2 |
| Flanger | rate | 0.3 | 0.5 | Rule range 0.5–1 Hz |
| **Phaser** (ph_*) | mix | 50 | 0 | Modulation rule |
| Phaser | resonance | 3 | 3 | OK once mix=0 |
| **Tremolo** (ph_*) | depth | 0.7 | 0 | Modulation rule — depth=0 = silent |
| Tremolo | rate | 4 | 1 | Rule range 0.5–1 Hz; 4 Hz is choppy default |
| **Vibrato** (ph_*) | depth | 0.005 | 0 | Modulation rule |
| Vibrato | rate | 3 | 1 | Rule range 0.5–1 Hz |
| **Resonator** (ph_*) | mix | 50 | 0 | Resonator imposes tonal coloration |
| **Rotary** (ph_*) | mix | 100 | 0 | Leslie always rotates — silent on insert |
| **RingMod** (ph_*) | mix | 50 | 0 | Ring mod destructive |
| **VocalDoubler** (ph_*) | mix | 50 | 0 | Modulation rule (doubler = chorus-class) |
| **VocalEnhancer** (ph_*) | presence | 3 | 0 | Adds 3 dB presence boost on insert |
| VocalEnhancer | air | 2 | 0 | Adds 2 dB air on insert |
| VocalEnhancer | warmth | 1 | 0 | Adds 1 dB warmth on insert |
| **AutoTune** (ph_*, manual mode after C4) | speed | 0.5 | 0 | speed=0.5 actively retunes on insert; manual mode should be bypass |
| AutoTune | mix | 100 | 100 | ✓ pitch rule |
| **Harmonizer** (ph_*, after C4) | mix | 50 | 0 | Adds harmony voices (-5, +3 semitones) on insert |
| Harmonizer | shift1 | -5 | -5 | Sensible interval once mix=0 |
| Harmonizer | shift2 | 3 | 3 | Sensible interval once mix=0 |
| **Octaver** (ph_*) | mix1 | 50 | 0 | Octave-down content on insert |
| Octaver | mix2 | 30 | 0 | Octave-up content on insert |
| Octaver | dry | 100 | 100 | ✓ keep dry through |

---

## ✓ Already neutral (no changes)

- **tapeStop** (SPX): `active: false` — waits for user trigger. Other knobs only fire when active.
- **freqShifter** (SPX, Phase C4 SSB): `shift: 0` = transparent passthrough. Niemitalo Hilbert correctly returns dry at shift=0.
- **granularFreeze** (SPX): `freeze: false`. Phase C3 worklet returns input unchanged when not frozen — `mix: 80` is irrelevant until freeze fires.
- **pitchForge** (SPX, Phase C4): `shift: 0, formant: 0, mix: 100` — pitch=0 = transparent; mix=100 is correct per pitch rule.
- **PitchShifter** (ph_*, Phase C4): `shift: 0, mix: 100` — pitch rule satisfied.
- **FrequencyShifter** (ph_*, Phase C4 SSB): `shift: 0, mix: 100` — transparent at shift=0.

---

## Judgment-call (no change, with reasoning)

- **pitchLock.bypass: false** — current implementation may use `bypass` flag separately from `retune=0`. Verified: factory checks `retune` for activation; `bypass: false` is correct (means "not bypassed", but `retune=0` and `humanize=0` make it transparent anyway).
- **autoWah.minFreq=200, maxFreq=4000** — kept (sensible vocal range when user later raises mix from 0).
- **Phaser.stages=6** — kept (musical default for a phaser).
- **AutoPan.rate=1** — kept (rule says 0.5–1 Hz; this is the upper bound).
- **Choir.voices=4, detune=15¢** — kept (sensible choir character once user dials mix up).
- **vocoderSPX.bands=32, carrierType="sawtooth"** — kept (sensible config; mix=0 keeps it silent on insert until user routes a carrier).

---

## Code-side issues flagged for D2 (not pure default changes)

- **vocoderSPX**: needs external carrier signal to produce sound. Even with mix=100, on a bare track it'll be silent or garbled because there's no internal modulator. Recommend D2 either: (a) ship internal saw oscillator at carrierFreq=110 Hz as default carrier; or (b) UI badge "needs carrier track" + stay at mix=0.
- **voiceForge / Harmonizer**: when v1-4 Vol go to 0, the Tone.PitchShift voices still consume CPU. Optimal would be to disconnect those voice nodes when their volume is 0 (cheap CPU win).
- **stereoBloom factory** uses `p.width` not `p.mix` for primary gain (RecordingStudio.js:install). Verify the factory's setParam case for `mix` actually wires to anything — earlier audit batches noted it. If broken, mix=0 default won't help.

---

## D1.5 Summary
- Audited: 22 plugins (15 SPX + 17 ph_*; minus duplicates already covered by phantomDouble in D1.1)
- Proposed changes: ~50 across 22 plugins
- ✓ already neutral: 6 plugins
- Judgment-call retentions: 6 params
- Code-side D2 issues: 3


═══════════════════════════════════════════════════════════════
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

