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
