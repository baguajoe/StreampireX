# Phase F4-A.3 — Differentiation Design Proposal

Synthesizes findings from `reverb_family_audit.md` (17 plugins) + `compressor_family_audit.md` (14 plugins) against the design grid in your F4-A.3 spec.

**TL;DR:** 17 reverb-tagged plugins → keep 8, hide/reclassify 9. 14 compressors → keep 9, hide/merge 5. Estimated effort: **DSP 12 h + UI 14 h = ~26 h**, beyond your 12–18 h estimate. Trim list provided at the bottom for a 14-h "must-have" path.

---

## REVERB PLAN

### A. Keepers (the 8 from your spec)

| # | Final name | Internal key | Audit source | DSP plan | UI plan | DSP h | UI h |
|---|---|---|---|---|---|---|---|
| 1 | **HallReverb** | `hall` (rename existing native `reverb`) | PluginHost `hall_reverb` exists (Schroeder FDN, 6 combs + 2 allpass) — real algorithm | Port `hall_reverb` Schroeder engine into RS factory; expose Decay/Pre-Delay/Damping/HF Damping/Width/Mix | Cathedral aesthetic, blue/gold, IR waveform display, decay tail graph | 1.0 | 1.5 |
| 2 | **PlateReverb** | `plate` | PluginHost `plate_reverb` exists (Dattorro tank, 4 allpass + 4 feedback delays) — real algorithm | Port Dattorro engine into RS factory; expose Decay/Pre-Delay/Diffusion/Damping/Brightness/Mix | Polished steel/gray, plate-vibration animation, brushed-metal panel | 1.0 | 1.5 |
| 3 | **SpringReverb** | `spring` | PluginHost `spring_reverb` exists (3 parallel comb filters) | Port spring tank model; add cascade allpass + modulated delay for "boing"; expose Decay/Springs(1-3)/Tone/Boing/Mix | Vintage amp aesthetic, brown/orange, animated spring graphic | 1.5 | 1.5 |
| 4 | **RoomReverb** | `room` | PluginHost `room_reverb` (verify engine in audit follow-up) | Short convolver with synthesized room IR (200–800 ms); expose Size/Damping/Brightness/Mix | Studio-booth aesthetic, warm brown/cream, room-dimensions readout | 0.75 | 1.25 |
| 5 | **ChamberReverb** | `chamber` | PluginHost `chamber_reverb` (convolver + diffusion modulation) | Port chamber engine; expose Decay/Damping/Color/Mix | Echo-chamber aesthetic, dark slate/silver | 0.75 | 1.25 |
| 6 | **GateVerb** | `gateVerb` | SPX `gateVerb` exists but topology is wrong (gate placed AFTER convolver — silent input means silent reverb input means gate never engages) | Rebuild: convolver → gain envelope (controlled by an input-side detector) → out. Expose Decay/G.Thresh/G.Decay/Mix | 80s rack aesthetic, red LED bar, threshold meter | 1.5 | 1.5 |
| 7 | **ShimmerReverb** | `shimmer` | PluginHost `shimmer_reverb` is delay-loop only — no pitch shift. Need to build the shimmer | Hall convolver + pitch-shifted feedback (octave-up via PitchShifter or playbackRate buffer trick). Expose Decay/Shimmer/Octave/Damping/Mix | Ethereal aesthetic, purple/magenta, shimmer-particles animation | 2.0 | 1.5 |
| 8 | **VintageAir** | `vintageAir` | Currently SPX plate-conv + 8kHz shelf. Spec wants plate + tape saturation | Add tape-saturation WaveShaper + bias-controlled hysteresis pre-stage (low-CPU model). Expose Decay/Tape Wow/Flutter/Bias/Mix | Tape-machine aesthetic, beige/orange, VU meter, animated reels | 1.5 | 1.75 |
| | | | | | **Reverb subtotals** | **10.0** | **11.75** |

### B. Hide / reclassify / merge (the other 9)

| Plugin | Current state | Recommendation |
|---|---|---|
| `hallForgeS`, `hallForgeL` | Convolver clones with shared `getReverbBuf`, distinguished only by 20 vs 40 ms preDelay | **Merge into `hall` as preset variants** |
| `stochasticHall`, `greatHall` | Identical clones of hallForgeS at default decay | **Hide** (deprecated; data-migrate users to `hall`) |
| `plateForge` | Convolver + 6 kHz shelf | **Merge into `plate`** as preset |
| `springBox` | Convolver + 1.2 kHz peak | **Merge into `spring`** as preset |
| `spaceForge` | IR dropdown UI is non-functional (factory ignores `ir` param) | **Hide** until real IRs ship |
| `vocalSpace` | Phase-4-stub early/late split; convolver-with-EQ | **Hide or merge into `room`** with vocal preset |
| `infiniteReverb` | Real FDN-lite engine (unique) | **Keep as 9th reverb** OR move to mastering. Worth ~1.5 h of distinct UI if kept. |
| `phantomDouble` | Slap-echo — not a reverb | **Reclassify as delay** (move to `type:"delay"`) |
| `echoField`, `stereoBloom` | Already delay-flavored or delay-derivative | **Already type:"delay"** — leave |

---

## COMPRESSOR PLAN

### A. Keepers (the 9 from your spec)

| # | Final name | Internal key | Audit source | DSP plan | UI plan | DSP h | UI h |
|---|---|---|---|---|---|---|---|
| 1 | **Compressor (basic)** | `compressor` | Native DynComp, no character | **Leave DSP as-is** (it's the "transparent VCA" reference); modernize UI | Modern flat aesthetic, teal accents, GR bar meter | 0 | 0.5 |
| 2 | **FetStrike (1176)** | `fetStrike` | SPX version has NO saturation; PluginHost `fet_comp` has the FET formula | Add WaveShaper using `(π+2)·x / (π+2·\|x\|)` from `fet_comp`; clamp ratio to {4,8,12,20, "all-buttons-in"=20+pre-clip}; attack 50µs–1ms range | 1176 panel, blue/silver bezel, **large VU needle** for GR, **ratio button bank** (4/8/12/20), "All buttons in" toggle | 1.5 | 2.0 |
| 3 | **OptoPress (LA-2A)** | `optoPress` | Already has HF pre-emph + tanh sat — closest to spec | Refine: program-dependent release (slow→fast on transients), add transformer saturation pre-stage; collapse UI to **Peak Reduction + Gain only** | LA-2A aesthetic, brown/gold panel, single large VU with **Comp/Limit toggle** | 1.0 | 1.75 |
| 4 | **GlueBus (SSL G)** | `glueBus` | Just DynComp + makeup, no character | Add subtle slew-rate limiter on attack (~5% transparency loss), HF lift +0.5 dB at 12 kHz | SSL black panel with colored bands, **LED ladder GR meter**, square detented knobs, Auto-Release toggle (real DSP this time) | 1.0 | 1.75 |
| 5 | **TubeComp (Vari-Mu)** | `tubeComp` (new SPX key — currently only PluginHost `tube_comp` exists) | PluginHost `tube_comp` has soft-clip + lowshelf, real algorithm | Port to SPX-suite; even-harmonic emphasis (asymmetric tanh), slow release | Manley/Fairchild aesthetic, cream/wood, **twin VU needles** (input + GR), warm orange glow gradient | 1.0 | 2.0 |
| 6 | **WarmPress** | `warmPress` | Already has tanh saturation + mode selector (UI-only) | Wire up the mode selector to actually swap engines (optical / vca / vari-mu — three internal preset sets); add Mix knob | Modern hybrid aesthetic, gradient warm-cool, **dual meters** (GR + sat) | 0.75 | 1.25 |
| 7 | **VocalComp** | `vocalComp` (new SPX key — PluginHost `vocal_comp` exists) | PluginHost has presence EQ but de-esser missing | Build: pre-EQ tilt + de-esser sidechain + comp + post-presence boost (dual-stage). Knobs: Threshold/Ratio/De-Ess/Presence/Air/Mix | Vocal-strip aesthetic, mic graphic, **sibilance meter**, presence indicator | 1.5 | 1.75 |
| 8 | **MultiPress** | `multiPress` | Already 4-band, distinct DSP | **Leave DSP** (works); rebuild UI to actually show 4 bands | Mastering aesthetic, **4-band crossover graph**, 4 GR meters (one per band) | 0 | 1.75 |
| 9 | **ParallelCrush** | `parallelCrush` | Distinct DSP (parallel wet/dry), good engine | **Leave DSP**; rebuild UI showing parallel topology | "Parallel processing" aesthetic, dry/wet split visualization | 0 | 1.5 |
| | | | | | **Comp subtotals** | **7.75** | **14.25** |

### B. Hide / merge (the other 5 dynamics)

| Plugin | Current state | Recommendation |
|---|---|---|
| `transGate` | Gate (DynComp at ratio 20) with sidechain HPF/LPF | **Reclassify as Gate** (already conceptually one) — leave in family but separate panel |
| `brickWall` | Hard limiter | **Reclassify as Limiter** — separate from comp family |
| `masterWall` | Hard limiter for master | **Already a limiter** — leave |
| `multibandLimiter` | Multiband limiter | **Already a limiter** — leave |
| PluginHost `vca_comp` | DynComp + nulled enhancement EQ | **Hide** (redundant with native compressor) |

---

## TOTALS

| | DSP h | UI h | Total h |
|---|---:|---:|---:|
| Reverbs (8 keepers) | 10.00 | 11.75 | 21.75 |
| Compressors (9 keepers) | 7.75 | 14.25 | 22.00 |
| Shared hardware-UI components (VU needle, LED ladder, ButtonBank, AnalogKnob, hardware panel skins) | 0.00 | 4.00 | 4.00 |
| **Grand total (full scope)** | **17.75** | **30.00** | **47.75** |
| Your stated estimate | — | — | 12–18 |

**Reality:** the full scope is roughly 2.5–3× the budget. Two ways to land in budget:

### Option A — Full scope across multiple sessions (~48 h)
Honest total. Run all 8 reverbs and 9 compressors with distinct DSP and hardware UI. Spans ~6 working sessions at 8 h each. Defers F4 (marquee + toolbar) further.

### Option B — Differentiate-DSP-only-now, defer-hardware-UI (~17.75 h)
Land all distinct DSP this round. Use minimal but theme-coded UI (color + meter type only — no animated panels, no needle/LED-ladder hardware). Schedule hardware UI as Phase F4-A.6-bis later. **Closest to your 12–18 h estimate.** Recommended.

### Option C — Top-priority subset only (~14 h)
- DSP: All 8 reverbs (10 h) + only the **3 most differentiating compressors** (fetStrike, optoPress, tubeComp = 3.5 h) = 13.5 h
- Reuse generic UI for compressors except the 3 highlighted ones
- Leave warmPress, glueBus, vocalComp, multiPress, parallelCrush DSP/UI unchanged
- **Lowest-risk path**, fits your budget

---

## RECOMMENDED PATH

**Option B (~18 h).** Reasoning:
1. The user complaint is "they all sound the same" — that's a **DSP problem first**. Fixing DSP across the board addresses the core issue in one round.
2. Hardware UI is a polish layer; it's emotionally valuable but not load-bearing for the "distinguishable" goal. Color-coded distinct meters (GR vs VU vs LED) is enough to convey identity.
3. Hardware-UI work splits cleanly into a later session — the components (VU needle, LED ladder) are reusable and can be added per-plugin without touching DSP.
4. Keeps F4 (marquee + toolbar) within reach once differentiation lands.

If you accept Option B, F4-A.5 (DSP) is the next concrete step. F4-A.6 (full hardware UI) becomes a separate later phase.

---

## APPROVAL CHECKLIST

Please confirm or adjust:

1. **Reverb keep-list (8):** hall, plate, spring, room, chamber, gateVerb, shimmer, vintageAir — OK?
2. **Reverb hide-list (9):** hallForgeS/L, stochasticHall, greatHall, plateForge, springBox, spaceForge, vocalSpace, phantomDouble. Plus: keep `infiniteReverb` as 9th OR hide. **Decision needed.**
3. **Compressor keep-list (9):** compressor, fetStrike, optoPress, glueBus, tubeComp, warmPress, vocalComp, multiPress, parallelCrush — OK?
4. **Compressor hide-list:** PluginHost `vca_comp` hidden. OK?
5. **Reclassify:** `transGate` → Gate family; `brickWall` → Limiter family. **Decision needed.**
6. **Scope:** Option A (full, ~48 h), Option B (DSP-only-now, ~18 h), or Option C (subset, ~14 h)? **Recommend B.**
7. **Defer hardware UI to F4-A.6-bis if Option B?** Y/N
8. **Two new SPX keys (`tubeComp`, `vocalComp`):** OK to add to `ALL_FX_EXTENDED`?
