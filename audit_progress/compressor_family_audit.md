# SpectraSphere Compressor Family Audit
**Branch:** `claude/fix-recording-studio` | **Date:** 2026-05-07

## 1. Native Compressor (Web Audio)
**Location:** factory at `/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js:1491`, UI at `/workspaces/SpectraSphere/src/front/js/component/ConsoleFXPanel.js:950`

### A. DSP Differentiation
**Engine:** DynamicsCompressor (Web Audio)
**Distinct DSP from siblings?** No — standard Web Audio default with no colorization
**Character coloration:** None
**Attack curve:** Web Audio default
**Release curve:** Web Audio default
**Knee shape:** Default 30dB
**Topology one-liner:** `in → DynamicsCompressor → out`

### B. UI Differentiation
**Layout:** Generic knob sliders
**Color theme:** #ffff00 (yellow)
**Meter type:** CompGraph (custom visualization)
**Mode switches/buttons:** None
**Knob style:** Continuous sliders (linear/dB range)
**Visual character:** Modern flat / Generic

### C. Audible difference
**A/B verdict:** No — baseline Web Audio compressor with zero character.

---

## 2. WarmPress (SPX Suite)
**Location:** factory at `RecordingStudio.js:2141`, UI at `SPXPlugins.js:356`

### A. DSP Differentiation
**Engine:** DynamicsCompressor + WaveShaper saturation
**Distinct DSP from siblings?** Yes — only compressor using tanh(x*1.3) static warmth
**Character coloration:** Saturation (WaveShaper with tanh curve, oversample 2x)
**Attack curve:** Web Audio default (custom default: 10ms → 30ms)
**Release curve:** Web Audio default (custom default: 100ms → 150ms)
**Knee shape:** 6dB (soft, not configurable)
**Topology one-liner:** `in → DynComp(thresh:-10, ratio:3) → tanh(x*1.3) WaveShaper → out`

### B. UI Differentiation
**Layout:** Custom mode selector (optical/vca/vari-mu buttons) + KnobRow
**Color theme:** #00ffc8 (cyan)
**Meter type:** GainReductionMeter
**Mode switches/buttons:** Model selector (optical/vca/vari-mu) — UI only, not DSP
**Knob style:** Continuous with fractional dB/ms steps
**Visual character:** Hardware aesthetic (mode selector) distinct from siblings

### C. Audible difference
**A/B verdict:** Yes — the static tanh saturation adds harmonic warmth, knee=6 is noticeably softer than FET variants.

---

## 3. GlueBus (SPX Suite)
**Location:** factory at `RecordingStudio.js:2163`, UI at `SPXPlugins.js:395`

### A. DSP Differentiation
**Engine:** DynamicsCompressor + makeup Gain
**Distinct DSP from siblings?** Partial — no saturation, makeup gain only
**Character coloration:** None (makeup gain is linear, no coloration)
**Attack curve:** Web Audio default (custom default: 10ms)
**Release curve:** Web Audio default (custom default: 100ms)
**Knee shape:** 6dB (soft, not configurable)
**Topology one-liner:** `in → DynComp(thresh:-12, ratio:4, knee:6) → makeup → out`

### B. UI Differentiation
**Layout:** KnobRow + Auto Gain toggle
**Color theme:** #00cc88 (green)
**Meter type:** GainReductionMeter
**Mode switches/buttons:** Auto Gain toggle (UI only)
**Knob style:** Continuous sliders
**Visual character:** Modern flat / Generic

### C. Audible difference
**A/B verdict:** Maybe — knee=6 softer than FET, but identical DynComp engine with makeup. Differs from warmPress only by lack of saturation.

---

## 4. FETStrike (SPX Suite)
**Location:** factory at `RecordingStudio.js:2182`, UI at `SPXPlugins.js:427`

### A. DSP Differentiation
**Engine:** DynamicsCompressor + makeup Gain (no saturation in RecordingStudio version; PluginHost version has saturation)
**Distinct DSP from siblings?** No in RecordingStudio; Yes in PluginHost (with saturation)
**Character coloration:** None (RecordingStudio); Saturation via formula (π+2)*x/(π+2*|x|) in PluginHost
**Attack curve:** Web Audio default (hard-coded: 1ms)
**Release curve:** Web Audio default (hard-coded: 50ms)
**Knee shape:** 2dB (hard knee for FET character)
**Topology one-liner:** `in → DynComp(knee:2, attack:1ms, release:50ms, ratio:6) → makeup → out`

### B. UI Differentiation
**Layout:** KnobRow + "All Button" toggle (ratio 20:1)
**Color theme:** #ff9900 (orange)
**Meter type:** GainReductionMeter
**Mode switches/buttons:** All Button toggle (hardwired to ratio=20)
**Knob style:** Continuous sliders
**Visual character:** Hardware aesthetic (All Button simulates 1176 hardware mode) distinct from siblings

### C. Audible difference
**A/B verdict:** Maybe — knee=2 is distinctly harder than warmPress/glueBus, but no saturation in main engine. PluginHost version is Yes due to saturation formula.

---

## 5. OptoPress (SPX Suite)
**Location:** factory at `RecordingStudio.js:2201`, UI at `SPXPlugins.js:460`

### A. DSP Differentiation
**Engine:** DynamicsCompressor + WaveShaper saturation + pre-emphasis highShelf + makeup/output gains
**Distinct DSP from siblings?** Yes — only compressor with HF emphasis pre-filter
**Character coloration:** Saturation (WaveShaper with tanh(x*k)/tanh(k), k=1+sat*3, oversample 2x)
**Attack curve:** Web Audio default (hard-coded: 50ms by default; configurable)
**Release curve:** Web Audio default (hard-coded: 300ms by default; program-dependent alias via peakReduction)
**Knee shape:** 15dB (softest knee of any compressor — "program memory" character)
**Topology one-liner:** `in → highShelf(5kHz) → DynComp(knee:15) → tanh-sat WaveShaper → makeup → output`

### B. UI Differentiation
**Layout:** KnobRow (5 sliders: peak reduction, gain, HF emphasis, tube sat, output)
**Color theme:** #88bbff (light blue)
**Meter type:** Text label "PROGRAM-DEPENDENT RELEASE"
**Mode switches/buttons:** None (UI parameters: peakReduction→threshold mapping, hfEmphasis→highShelf, tubeSaturation→curve)
**Knob style:** Continuous sliders (normalized 0–1 for peakReduction/sat, dB for others)
**Visual character:** Hardware emulation (program-dependent behavior description) very distinct

### C. Audible difference
**A/B verdict:** Yes — knee=15 extremely soft, HF pre-emphasis unique, program-dependent release (hardwired tanh ratio) audibly distinct from fixed ratios.

---

## 6. ParallelCrush (SPX Suite)
**Location:** factory at `RecordingStudio.js:2247`, UI at `SPXPlugins.js:484`

### A. DSP Differentiation
**Engine:** DynamicsCompressor (heavy) + WaveShaper (crush curve) in parallel with dry path
**Distinct DSP from siblings?** Yes — only true parallel compressor with mix control
**Character coloration:** Saturation (WaveShaper with asymmetric tanh+clip crush curve, oversample 2x)
**Attack curve:** Web Audio default (custom default: 5ms)
**Release curve:** Web Audio default (custom default: 80ms)
**Knee shape:** 2dB (hard knee for crush aggression)
**Topology one-liner:** `in → [dry_path: dryGain] ⊕ [wet_path: DynComp → crush_WaveShaper → wetGain] → output`

### B. UI Differentiation
**Layout:** KnobRow + mix blend slider
**Color theme:** #cc44ff (magenta)
**Meter type:** GainReductionMeter
**Mode switches/buttons:** None
**Knob style:** Continuous sliders
**Visual character:** Modern flat / Parallel compression topology visually distinct

### C. Audible difference
**A/B verdict:** Yes — parallel architecture + crush waveshaper (tanh + asymmetric clip hybrid) creates aggressive, punchy distortion unlike serial compressors.

---

## 7. MultiPress (SPX Suite)
**Location:** factory at `RecordingStudio.js:2310`, UI at `SPXPlugins.js:513`

### A. DSP Differentiation
**Engine:** 4-band multiband compression (LR-style cascaded xovers + 4 DynamicsCompressors)
**Distinct DSP from siblings?** Yes — only true 4-band multiband (others are 3-band)
**Character coloration:** None (makeup gains per-band only)
**Attack curve:** Web Audio default (hard-coded: 10ms all bands)
**Release curve:** Web Audio default (hard-coded: 100ms all bands)
**Knee shape:** Default 30dB (per-band, not configurable)
**Topology one-liner:** `in → 4×xover(LR-cascaded) → [4×DynComp + makeup]→ summer → out`

### B. UI Differentiation
**Layout:** 4×band rows (xover freq, thresh, ratio, gain per band)
**Color theme:** #ff6644 (red-orange)
**Meter type:** Implicit band-specific GR visualization
**Mode switches/buttons:** None
**Knob style:** Continuous sliders (band-specific ranges)
**Visual character:** Multiband layout distinct from single-band; modern flat

### C. Audible difference
**A/B verdict:** Yes — 4-band separation creates very different tonal balance than single-band. Only true multiband in suite.

---

## 8. TransGate (SPX Suite)
**Location:** factory at `RecordingStudio.js:2407`, UI at `SPXPlugins.js:552`

### A. DSP Differentiation
**Engine:** DynamicsCompressor (high ratio) + sidechain HPF/LPF + lookahead delay
**Distinct DSP from siblings?** Partial — gate topology (not compressor), but uses DynComp at high ratio
**Character coloration:** None (sidechain filtering only; ratio=20 acts as gate)
**Attack curve:** Web Audio default (configurable lookahead, default 1ms)
**Release curve:** Web Audio default (hold+release combined, default 50+100ms)
**Knee shape:** Hysteresis knee (default 3dB)
**Topology one-liner:** `in → lookahead_delay → scHPF(80Hz) → scLPF(8kHz) → DynComp(ratio:20) → out`

### B. UI Differentiation
**Layout:** KnobRow + lookahead, threshold, hysteresis
**Color theme:** (implicit, SPXPlugins.js shows UI)
**Meter type:** None (gate behavior)
**Mode switches/buttons:** None
**Knob style:** Continuous sliders
**Visual character:** Gate-specific (not standard compressor) but modern flat

### C. Audible difference
**A/B verdict:** Yes — downward gate topology (not compressor). Sidechain filtering + lookahead create transient detection unlike any compressor.

---

## 9. BrickWall (SPX Suite)
**Location:** factory at `RecordingStudio.js:2471`, UI at `SPXPlugins_SPX100.js` (not found in SPXPlugins.js explicitly; see code)

### A. DSP Differentiation
**Engine:** DynamicsCompressor (high ratio limiter)
**Distinct DSP from siblings?** No — just DynComp with hardwired knee=0, ratio=20, attack=1ms, release=10ms
**Character coloration:** None
**Attack curve:** Web Audio default (hard-coded: 1ms)
**Release curve:** Web Audio default (hard-coded: 10ms)
**Knee shape:** 0dB (brick-wall hard knee)
**Topology one-liner:** `in → DynComp(thresh:ceiling, ratio:20, knee:0, attack:1ms, release:10ms) → out`

### B. UI Differentiation
**Layout:** Single knob (ceiling threshold only)
**Color theme:** (implicit)
**Meter type:** None
**Mode switches/buttons:** None
**Knob style:** Single dB slider
**Visual character:** Minimal / Modern flat

### C. Audible difference
**A/B verdict:** No — pure limiter, identical engine to FETStrike but with different defaults. Audibly different only by threshold/release values.

---

## 10. PluginHost: FETComp
**Location:** factory at `/workspaces/SpectraSphere/src/front/js/component/audio/plugins/plugins/FETCompPlugin.js:5`

### A. DSP Differentiation
**Engine:** DynamicsCompressor + WaveShaper saturation
**Distinct DSP from siblings?** Yes — saturation formula (π+2)*x/(π+2*|x|)
**Character coloration:** Saturation (WaveShaper with FET-specific formula, oversample 2x)
**Attack curve:** Web Audio default (hard-coded: 0.5ms default)
**Release curve:** Web Audio default (hard-coded: 50ms default)
**Knee shape:** 2dB (hard)
**Topology one-liner:** `in → inputGain → DynComp(knee:2) → saturation_WaveShaper → outputGain → out`

### B. UI Differentiation
**Layout:** PluginRackUI (external, not defined in FETCompPlugin.js)
**Color theme:** (from registry)
**Meter type:** (external)
**Mode switches/buttons:** (external)
**Knob style:** (external)
**Visual character:** (external)

### C. Audible difference
**A/B verdict:** Yes — hard knee + distinctive saturation formula create FET character.

---

## 11. PluginHost: VCAComp
**Location:** factory at `/workspaces/SpectraSphere/src/front/js/component/audio/plugins/plugins/VCACompPlugin.js:5`

### A. DSP Differentiation
**Engine:** DynamicsCompressor + peaking EQ (3kHz enhancement, NOT applied by default: gain.value=0)
**Distinct DSP from siblings?** Partial — enhancement filter present but nulled at init
**Character coloration:** Filter coloration (peaking EQ 3kHz, not applied by default)
**Attack curve:** Web Audio default
**Release curve:** Web Audio default
**Knee shape:** 4dB (softer than FET)
**Topology one-liner:** `in → DynComp(knee:4) → enhance_peaking(3kHz, Q:2, gain:0) → makeup → out`

### B. UI Differentiation
**Layout:** PluginRackUI (external)
**Color theme:** (from registry)
**Meter type:** (external)
**Mode switches/buttons:** (external)
**Knob style:** (external)
**Visual character:** (external)

### C. Audible difference
**A/B verdict:** Maybe — knee=4 softer than FET, enhancement filter present but not audio-enabling unless makeup parameter adjusted dynamically. Essentially vanilla DynComp.

---

## 12. PluginHost: TubeComp
**Location:** factory at `/workspaces/SpectraSphere/src/front/js/component/audio/plugins/plugins/TubeCompPlugin.js:5` (also duplicated in VCACompPlugin.js, MultibandCompPlugin.js)

### A. DSP Differentiation
**Engine:** DynamicsCompressor + WaveShaper saturation + lowShelf warmth filter
**Distinct DSP from siblings?** Yes — soft saturation + warmth filter unique
**Character coloration:** Saturation (WaveShaper soft-clip: (1+drive)*x/(1+drive*|x|), oversample 4x) + Lowshelf (200Hz, gain=1.5 default)
**Attack curve:** Web Audio default (hard-coded: 20ms)
**Release curve:** Web Audio default (hard-coded: 300ms)
**Knee shape:** 12dB (very soft, "tube style")
**Topology one-liner:** `in → DynComp(knee:12) → tube_WaveShaper(drive) → lowShelf(200Hz) → makeup → out`

### B. UI Differentiation
**Layout:** PluginRackUI (external)
**Color theme:** (from registry)
**Meter type:** (external)
**Mode switches/buttons:** (external)
**Knob style:** (external)
**Visual character:** (external)

### C. Audible difference
**A/B verdict:** Yes — soft knee (12dB) + drive-dependent saturation + warmth shelf create warm, smooth tube character distinct from all others.

---

## 13. PluginHost: VocalComp
**Location:** factory at `/workspaces/SpectraSphere/src/front/js/component/audio/plugins/plugins/VocalCompPlugin.js:5`

### A. DSP Differentiation
**Engine:** DynamicsCompressor + peaking EQ presence boost
**Distinct DSP from siblings?** Partial — presence EQ (3kHz) applied by default (gain=p.presence??0)
**Character coloration:** Filter coloration (peaking EQ 3kHz, Q:1, default gain 0 but overridable)
**Attack curve:** Web Audio default
**Release curve:** Web Audio default
**Knee shape:** 6dB (soft)
**Topology one-liner:** `in → DynComp(knee:6) → presence_peaking(3kHz, Q:1) → makeup → out`

### B. UI Differentiation
**Layout:** PluginRackUI (external)
**Color theme:** (from registry)
**Meter type:** (external)
**Mode switches/buttons:** (external)
**Knob style:** (external)
**Visual character:** (external)

### C. Audible difference
**A/B verdict:** Maybe — presence EQ (Q:1 wider than VCAComp's Q:2) can add vocal "air" but is often disabled. Differs from VCAComp only by Q and context (vocal-tuned defaults).

---

## 14. PluginHost: MultibandComp (3-band)
**Location:** factory at `/workspaces/SpectraSphere/src/front/js/component/audio/plugins/plugins/MultibandCompPlugin.js:5`

### A. DSP Differentiation
**Engine:** 3-band multiband (LR-style xovers + 3 DynamicsCompressors)
**Distinct DSP from siblings?** Yes — 3-band multiband (differs from SPX 4-band MultiPress)
**Character coloration:** None (makeup gains per-band)
**Attack curve:** Web Audio default (hard-coded: 10ms all bands)
**Release curve:** Web Audio default (hard-coded: 100ms all bands)
**Knee shape:** Default 30dB (per-band)
**Topology one-liner:** `in → 3×xover(LR-cascaded) → [3×DynComp + merger] → out`

### B. UI Differentiation
**Layout:** PluginRackUI (external)
**Color theme:** (from registry)
**Meter type:** (external)
**Mode switches/buttons:** (external)
**Knob style:** (external)
**Visual character:** (external)

### C. Audible difference
**A/B verdict:** Yes — 3-band separation (differs from SPX 4-band by frequency split).

---

## TL;DR Summary Table

| Plugin | Key | DSP Engine | Has Saturation? | UI Style | A/B Distinguishable? |
|--------|-----|-----------|-----------------|----------|----------------------|
| Compressor | compressor | DynamicsCompressor | No | Generic knobs | No |
| WarmPress | warmPress | DynComp + tanh(1.3) WaveShaper | Yes (tanh) | Mode selector (ui-only) | Yes |
| GlueBus | glueBus | DynComp + makeup | No | Generic knobs | Maybe |
| FETStrike | fetStrike | DynComp (knee:2) + makeup | No* | Hardware "All Button" | Maybe |
| OptoPress | optoPress | DynComp + HFshelf + tanh-sat WaveShaper | Yes (tanh(k)) | Hardware "Program Memory" | Yes |
| ParallelCrush | parallelCrush | DynComp (parallel) + crush WaveShaper | Yes (tanh+clip) | Parallel architecture | Yes |
| MultiPress | multiPress | 4-band multiband | No | Band-specific layout | Yes |
| TransGate | transGate | DynComp (gate, ratio:20) + sidechain HPF/LPF | No | Gate topology | Yes |
| BrickWall | brickWall | DynComp (hard knee, ratio:20) | No | Single knob limiter | No |
| FET (PluginHost) | fet_comp | DynComp + saturation formula | Yes (π+2 formula) | External | Yes |
| VCA (PluginHost) | vca_comp | DynComp + peaking EQ (nulled) | No (enhancement not applied) | External | Maybe |
| Tube (PluginHost) | tube_comp | DynComp (knee:12) + soft-clip WaveShaper + lowShelf | Yes (soft-clip + shelf) | External | Yes |
| Vocal (PluginHost) | vocal_comp | DynComp + peaking EQ (voice-tuned) | No | External | Maybe |
| Multiband (PluginHost) | multiband_comp | 3-band multiband | No | External | Yes |

---

## Findings

**Count by engine type:**
- 8 DynamicsCompressor + different defaults/saturation/filters
- 2 Multiband (4-band SPX, 3-band PluginHost)
- 1 Gate (TransGate, DynComp at ratio 20)
- 1 Parallel compressor (ParallelCrush)

**Genuine DSP differentiation (Yes/Maybe):**
- **Genuinely distinct:** warmPress (static tanh), optoPress (HF+program), parallelCrush (parallel+crush), tube (soft-clip+shelf), multipress (4-band), transGate (gate+sidechain), fet (hard knee+FET formula), multiband (3-band)
- **Just DynComp with defaults:** compressor, glueBus, brickWall, vca (enhance nulled), vocal (presence often nulled)
- **Count:** 8 distinct, 5 just defaults → **62% genuine DSP variety**

**Saturation analysis:**
- **With saturation:** warmPress (tanh), optoPress (tanh), parallelCrush (asymmetric), fet (FET formula), tube (soft-clip)
- **Without:** compressor, glueBus, fetStrike (SPX version), transGate, brickWall, vca, vocal, multiband, multipress
- **Count:** 5 with saturation; 9 without → **36% have character coloration**

**UI character (hardware-emulation vs generic):**
- **Hardware aesthetic:** warmPress (mode selector), optoPress (program memory label), fetStrike (All Button), transGate (gate label)
- **Generic flat:** compressor, glueBus, brickWall, parallelCrush, multipress
- **External (PluginHost):** 5 plugins (ui delegated)
- **Count:** 4 hardware-themed vs 5 generic vs 5 external → **27% have hardware UI**

**Critical issue:** Many compressors are **pure DynamicsCompressor with only default parameter changes**. RecordingStudio's fetStrike has **no saturation** (PluginHost version does). GlueBus, brickWall, and vca (when enhance nulled) offer minimal audible differentiation—they're essentially the same DSP engine renamed.

