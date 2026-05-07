# Batch 01 — Native Effects Audit (18 plugins)

Auditor #1. Branch: `claude/fix-recording-studio`. Date: 2026-05-06.

These 18 plugins have `component=null` in `ALL_FX_EXTENDED` (lines
1510–1527 of `SPXPlugins.js`). Their UI lives in
`/workspaces/SpectraSphere/src/front/js/component/ConsoleFXPanel.js`.
Their audio handlers live in the `buildFxChain` block of
`/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js`
(starts at line 1300; native effects are lines 1454–1718, with
reverb/delay implemented as parallel sends in `buildSends` at
3141–3148, and stereoWidener as an insert at 2894–2917). Defaults seed
from `DEFAULT_EFFECTS()` in
`/workspaces/SpectraSphere/src/front/js/utils/trackFactory.js:23`.

## Architectural notes shared by ALL 18 plugins

1. **COMPONENT_MAP — N/A by design.** Native effects have no SPX
   plugin window, so `COMPONENT_MAP` is irrelevant. They render
   directly inside ConsoleFXPanel.
2. **Live setParam routing — DEAD during playback.** SPX plugin
   windows call `inst.setParam` via `liveInstancesRef`
   (RecordingStudio.js:5915). ConsoleFXPanel only calls the plain
   `updateEffect` (RS:3944), which mutates `track.effects` state and
   relies on `fxSignature` (RS:3666–3681) to trigger a chain rebuild.
   But `fxSignature` watches only the SET of enabled keys, NOT param
   values — so a knob turn during playback DOES NOT re-render audio.
   The handler factories DO register PluginInstances with valid
   `setParam` cases (so the plumbing exists), but ConsoleFXPanel never
   invokes them. **Severity P1 (not P0)**: knobs work after stop+play,
   but live tweaking is silent. Demo should be set-up-then-play.
3. **Defaults are neutral on insert.** `seedEffect` (RS:3951) merges
   `DEFAULT_EFFECTS()` UNDER existing fields; the picker then sets
   `enabled:true`. All 18 native defaults are inaudible neutral
   (mix=0.2 for reverb/delay/exciter is mild but audible — minor).
4. **All factories register via `install(...)` (RS:1373) which
   calls `registerInstance`** so dispose() runs on chain rebuild.
   Every factory has a dispose() that disconnects nodes and stops
   LFO oscillators where present. No leak class issues found.

---

### 1. EQ (`eq`)
- **UI file:** `ConsoleFXPanel.js:914-939`
- **Factory:** native — RecordingStudio.js:1454-1470
- **1. Param names:** ✅ — UI keys `lowGain, midGain, midFreq, highGain` all match factory cases (RS:1462-1465).
- **2. Units:** ✅ — UI -12..+12 dB → factory `setGainDb` clamped -60..24; midFreq Hz → factory Hz.
- **3. Missing cases:** ✅ — all 4 UI controls have cases.
- **4. Worklets:** N/A — pure BiquadFilter graph.
- **5. Topology:** ✅ — lo→mi→hi, both ends exposed via input/output.
- **6. Dispose:** ✅ — `disposeNodes(lo, mi, hi)` (RS:1468).
- **7. Defaults:** ✅ — `lowGain=0, midGain=0, midFreq=1000, highGain=0` (DEFAULT_EFFECTS) — neutral.
- **8. COMPONENT_MAP:** N/A (native).
- **Severity:** clean
- **Demo-blocker?:** no

### 2. Compressor (`compressor`)
- **UI file:** `ConsoleFXPanel.js:942-970`
- **Factory:** native — RecordingStudio.js:1487-1502
- **1. Param names:** ✅ — `threshold, ratio, attack, release` all wired (RS:1494-1497).
- **2. Units:** ✅ — UI threshold -60..0 dB, ratio 1..20, attack 0.001..0.1 s, release 0.01..1 s — all match factory clamp ranges.
- **3. Missing cases:** ⚠ — DEFAULT_EFFECTS sets `knee:30` but neither UI nor setParam expose it. Knee is initialized from `p.knee`? No — factory sets only threshold/ratio/attack/release; the default `knee:30` from trackFactory never reaches `c.knee` (factory ignores it). Knee stays at WebAudio DynamicsCompressor default (30) coincidentally matching, so no audible bug, but it's a dead default field.
- **4. Worklets:** N/A — uses native DynamicsCompressor.
- **5. Topology:** ✅ — single node, input=output=c.
- **6. Dispose:** ✅ — `disposeNodes(c)` (RS:1500).
- **7. Defaults:** ✅ — `threshold:-24, ratio:4, attack:0.003, release:0.25`. Threshold -24dB is a genuine compressor — not a bypass — but with ratio:4 and average tracks below -24dB peaks it's largely inaudible. Acceptable.
- **8. COMPONENT_MAP:** N/A.
- **Severity:** P2 (cosmetic — knee default is dead)
- **Demo-blocker?:** no

### 3. Gate (`gate`)
- **UI file:** `ConsoleFXPanel.js:1100-1121`
- **Factory:** native — RecordingStudio.js:1536-1552
- **1. Param names:** ✅ — UI `threshold, attack, release` map to cases (RS:1545-1547).
- **2. Units:** ✅ — UI -80..0 dB, 0.001..0.05 s, 0.01..0.5 s.
- **3. Missing cases:** ✅ — all UI controls handled.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — single DynamicsCompressor configured as gate (ratio=20, knee=0).
- **6. Dispose:** ✅ — `disposeNodes(gt)` (RS:1550).
- **7. Defaults:** ✅ — `threshold:-40` is well below typical signal — inaudible on insert.
- **8. COMPONENT_MAP:** N/A.
- **Severity:** clean (note: this is a gate APPROXIMATION via DynamicsCompressor; real gate would need below-threshold attenuation — comment at RS:1538 acknowledges this)
- **Demo-blocker?:** no

### 4. De-Esser (`deesser`)
- **UI file:** `ConsoleFXPanel.js:1124-1142`
- **Factory:** native — RecordingStudio.js:1553-1567
- **1. Param names:** ✅ — UI `frequency, threshold` map to cases.
- **2. Units:** ⚠ — UI threshold range -40..0 dB but factory uses `-Math.abs(p.threshold || 6)` to map threshold → biquad GAIN (notch depth). UI label says "Thresh" with dB suffix, but it's actually the notch attenuation depth. Field is repurposed; user may expect side-chain threshold behavior. The repurposing is documented in comment (RS:1554-1555) but UX remains misleading.
- **3. Missing cases:** ⚠ — DEFAULT_EFFECTS includes `ratio:8` (RS trackFactory:32), but UI doesn't show it AND factory ignores it. Dead field.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — single peaking biquad.
- **6. Dispose:** ✅ — `disposeNodes(bp)` (RS:1565).
- **7. Defaults:** ⚠ — DEFAULT_EFFECTS sets `frequency:6000, threshold:-20` → notch at 6kHz with -20dB attenuation. That's a substantial dip already on insert. Not silent, definitely audible.
- **8. COMPONENT_MAP:** N/A.
- **Severity:** P1 (audible-on-insert + label/behavior mismatch)
- **Demo-blocker?:** no — but tracks with vocal energy at 6kHz will sound unexpectedly muffled the moment de-esser is enabled.

### 5. Limiter (`limiter`)
- **UI file:** `ConsoleFXPanel.js:1076-1097`
- **Factory:** native — RecordingStudio.js:1519-1535
- **1. Param names:** ✅ — UI `threshold, knee, release` cases all present. Factory also handles `ratio, attack`.
- **2. Units:** ✅ — UI -30..0 dB, knee 0..40, release 0.01..0.5 s.
- **3. Missing cases:** ⚠ — DEFAULT_EFFECTS sets `ratio:20, attack:0.001`. UI does not expose them; factory accepts them at build time and via setParam. Acceptable (preset values).
- **4. Worklets:** N/A — uses native DynamicsCompressor for limiting (real true-peak limiter would need a worklet — see brickwall in Batch B).
- **5. Topology:** ✅ — single node.
- **6. Dispose:** ✅.
- **7. Defaults:** ✅ — `threshold:-1` with ratio 20 — gentle peak limiting at very high level, near inaudible on insert.
- **8. COMPONENT_MAP:** N/A.
- **Severity:** clean
- **Demo-blocker?:** no

### 6. Reverb (`reverb`) — SEND, not insert
- **UI file:** `ConsoleFXPanel.js:973-992`
- **Factory:** native — RecordingStudio.js:3145 (inside `buildSends`, NOT `buildFxChain`)
- **1. Param names:** ❌ — Reverb is wired as a parallel send (RS:3145), NOT through `install()` / PluginInstance contract. There is **NO `setParam`** for reverb. UI knobs (`mix`, `decay`) update `track.effects.reverb` state, but no live audio update happens at all — the send is built once when `buildPlaybackSources` runs, and never updates until the next chain rebuild. Worse: changing `decay` value rebuilds the full impulse buffer (`getReverbBuf`) but only on chain-rebuild, which is keyset-only.
- **2. Units:** ✅ — UI mix 0..1 fraction, decay 0.1..10s — matches RS:3145 raw assignment.
- **3. Missing cases:** ❌ — no setParam exists.
- **4. Worklets:** N/A — Convolver + algorithmic IR (not a worklet, fine).
- **5. Topology:** ✅ — proper send path (`dry → conv → g → master`) parallel to the dry signal — but the dry signal still hits master through the main chain, so this is a dual-path send. Conceptually correct.
- **6. Dispose:** ⚠ — sendNodes are pushed into a sendNodes array but disposal of these nodes when the track is destroyed/rebuilt isn't explicit in the same way buildFxChain does. Caller of buildSends must track and disconnect — a quick scan shows sendNodes accumulate in `sendNodesRef` but no explicit disconnect on rebuild was found. Minor potential leak.
- **7. Defaults:** ✅ — `mix:0.2, decay:2.0` — moderate but audible on insert.
- **8. COMPONENT_MAP:** N/A.
- **Severity:** P1 (live knob updates do nothing at all; dispose tracking unclear)
- **Demo-blocker?:** **possible YES if the demo flow is "play → drag reverb mix"**. User will hear no change. Workaround: set values BEFORE pressing play.

### 7. Delay (`delay`) — SEND, not insert
- **UI file:** `ConsoleFXPanel.js:995-1017`
- **Factory:** native — RecordingStudio.js:3146 (inside `buildSends`)
- **1. Param names:** ❌ — same as reverb. Wired as send, no setParam, no PluginInstance. Live knob turns silent.
- **2. Units:** ✅ — UI time 0.01..2 s, feedback 0..0.9, mix 0..1 — all match factory raw assignments.
- **3. Missing cases:** ❌ — no setParam exists.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — `dry→d→fb→d` (regen) and `d→mx→master` (send). Standard.
- **6. Dispose:** ⚠ — same disposal concern as reverb.
- **7. Defaults:** ✅ — `time:0.3, feedback:0.3, mix:0.2` — audible on insert (single tap @300ms with 30% feedback) but user expects a delay to be audible.
- **8. COMPONENT_MAP:** N/A.
- **Severity:** P1 (live updates dead, identical to reverb).
- **Demo-blocker?:** same as reverb — set BEFORE play.

### 8. Chorus (`chorus`)
- **UI file:** `ConsoleFXPanel.js:1145-1165`
- **Factory:** native — RecordingStudio.js:1568-1584
- **1. Param names:** ⚠ — UI exposes `rate, depth, mix`. Factory handles `rate, depth`. **`mix` knob has NO case** (RS:1576-1581) — turning Mix has no effect at all. Silent dead knob.
- **2. Units:** ✅ — rate 0.1..10 Hz, depth 0.0005..0.01 s.
- **3. Missing cases:** ❌ — `mix` (UI line 1160 of ConsoleFXPanel) is unimplemented.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠ — Plain delay + LFO insert; no wet/dry split. Output is 100% modulated signal (no clean blend), which is unusual for chorus. Combined with the missing mix knob, the user can't blend the effect — it's full-wet only.
- **6. Dispose:** ✅ — `stopOscs(lfo); disposeNodes(cd, lfoG)` (RS:1582).
- **7. Defaults:** ✅ — `rate:1.5, depth:0.002, mix:0.3` — but `mix` is ignored, so the chorus is effectively at 100% wet on insert. The 2ms delay center is mild, so still acceptable.
- **8. COMPONENT_MAP:** N/A.
- **Severity:** P1 (mix knob is a dead control — UX bug)
- **Demo-blocker?:** no — chorus is audible, just not blendable.

### 9. Flanger (`flanger`)
- **UI file:** `ConsoleFXPanel.js:1168-1191`
- **Factory:** native — RecordingStudio.js:1585-1600
- **1. Param names:** ❌ — UI exposes `rate, depth, feedback, mix`. Factory handles ONLY `rate, depth`. **Both `feedback` AND `mix` are dead knobs.**
- **2. Units:** ✅ — for the two implemented (rate 0.05..5 Hz, depth 0.001..0.01 s).
- **3. Missing cases:** ❌ — `feedback` (UI:1184) and `mix` (UI:1187) have no cases.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠ — delay + LFO with NO feedback loop. A flanger without feedback is closer to a vibrato/short-chorus. Defining characteristic of flanger (the comb-filter sweep) requires feedback regen. With UI feedback default 0.5 ignored, the audio doesn't sound like a flanger.
- **6. Dispose:** ✅ — same as chorus.
- **7. Defaults:** ⚠ — `feedback:0.5, mix:0.3` declared but ignored. UI shows non-zero feedback that does nothing.
- **8. COMPONENT_MAP:** N/A.
- **Severity:** P1 (two dead knobs + topology missing the defining feedback path; sounds wrong)
- **Demo-blocker?:** no — still audible as a modulation, just doesn't sound like a flanger.

### 10. Phaser (`phaser`)
- **UI file:** `ConsoleFXPanel.js:1194-1220`
- **Factory:** native — RecordingStudio.js:1601-1636
- **1. Param names:** ⚠ — UI exposes `rate, baseFreq, Q, stages, mix`. Factory handles `stages, baseFreq, Q` only. **`rate` AND `mix` are dead.** The fixed 8-stage allpass cascade is not LFO-modulated, so a phaser with no rate knob doesn't sweep. Effectively a fixed allpass network, not a phaser.
- **2. Units:** ✅ — for those implemented.
- **3. Missing cases:** ❌ — `rate` (UI:1204) and `mix` (UI:1216) have no cases. Note also: NO LFO is created in this factory — `rate` could not work even if a case existed because there's no oscillator to modulate.
- **4. Worklets:** N/A.
- **5. Topology:** ❌ — Static allpass cascade lacks the LFO sweep that defines a phaser. Sound: a fixed phase shift, not a moving notch.
- **6. Dispose:** ✅ — `disposeNodes(...filters)`.
- **7. Defaults:** ⚠ — `rate:0.5` exists in defaults but does nothing. `Q:5` and `stages:4` produce a fixed coloration on insert.
- **8. COMPONENT_MAP:** N/A.
- **Severity:** P1 (broken effect — phaser isn't sweeping; rate + mix dead)
- **Demo-blocker?:** no for audio (still produces some processing) but YES for UX if user expects a phaser sound.

### 11. Tremolo (`tremolo`)
- **UI file:** `ConsoleFXPanel.js:1223-1240`
- **Factory:** native — RecordingStudio.js:1637-1652
- **1. Param names:** ✅ — `rate, depth` both handled.
- **2. Units:** ✅ — rate 0.5..20 Hz, depth 0..1.
- **3. Missing cases:** ✅ — UI matches factory exactly.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — gain modulated by LFO. Standard tremolo.
- **6. Dispose:** ✅ — stopOscs + disposeNodes.
- **7. Defaults:** ✅ — `rate:4, depth:0.5` — audible but tremolo is meant to be audible.
- **8. COMPONENT_MAP:** N/A.
- **Severity:** clean
- **Demo-blocker?:** no

### 12. Filter (`filter`)
- **UI file:** `ConsoleFXPanel.js:1019-1051`
- **Factory:** native — RecordingStudio.js:1471-1486
- **1. Param names:** ✅ — UI `type, frequency, Q` all wired (RS:1479-1481).
- **2. Units:** ✅ — type string, freq 20..20000 Hz, Q 0.1..20.
- **3. Missing cases:** ✅.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — single biquad.
- **6. Dispose:** ✅ — `disposeNodes(f)`.
- **7. Defaults:** ✅ — `type:"lowpass", frequency:20000, Q:1` — lowpass at Nyquist = effectively bypass on insert.
- **8. COMPONENT_MAP:** N/A.
- **Severity:** clean
- **Demo-blocker?:** no

---

(Saving after 12 plugins — restart safety.)

### 13. Distortion (`distortion`)
- **UI file:** `ConsoleFXPanel.js:1054-1073`
- **Factory:** native — RecordingStudio.js:1503-1518
- **1. Param names:** ✅ — UI `amount` wired (RS:1515).
- **2. Units:** ✅ — UI 0..100 → factory clamps 0..100 in buildCurve.
- **3. Missing cases:** ✅.
- **4. Worklets:** N/A — WaveShaper.
- **5. Topology:** ✅ — single WaveShaper, oversample="4x".
- **6. Dispose:** ✅.
- **7. Defaults:** ✅ — `amount:0` → identity curve (RS:1508). Truly bypass on insert.
- **8. COMPONENT_MAP:** N/A.
- **Severity:** clean
- **Demo-blocker?:** no

### 14. Bit Crusher (`bitcrusher`)
- **UI file:** `ConsoleFXPanel.js:1243-1261`
- **Factory:** native — RecordingStudio.js:1653-1661
- **1. Param names:** ⚠ — UI exposes `bits, sampleRateReduce`. Factory handles `bits` only. **`sampleRateReduce` is a dead knob** (no SR reducer node, no case).
- **2. Units:** ✅ — bits 1..16 maps to factory `Math.pow(2, bits)` quantization.
- **3. Missing cases:** ❌ — sampleRateReduce (UI:1257) ignored.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠ — Single WaveShaper does bit-quantization but no SR reduction. True bitcrusher needs a sample-and-hold (typically a worklet); this is bit-only.
- **6. Dispose:** ✅.
- **7. Defaults:** ⚠ — `bits:8` is audibly crunchy on insert. Not bypass-neutral. User clicking enable will hear immediate distortion. May be intended.
- **8. COMPONENT_MAP:** N/A.
- **Severity:** P1 (sampleRateReduce knob is dead; bits=8 default is audible-on-insert)
- **Demo-blocker?:** no

### 15. Tape Saturation (`tapeSaturation`)
- **UI file:** `ConsoleFXPanel.js:1287-1309`
- **Factory:** native — RecordingStudio.js:1682-1696
- **1. Param names:** ✅ — UI `drive, warmth` both wired (RS:1690-1691).
- **2. Units:** ✅ — drive 0..1 → tanh curve `k=1+5*drive`; warmth 0..1 → LP cutoff 12000-6000*warmth Hz.
- **3. Missing cases:** ✅.
- **4. Worklets:** N/A.
- **5. Topology:** ✅ — WaveShaper → LP filter.
- **6. Dispose:** ✅ — `disposeNodes(ws, lp)`.
- **7. Defaults:** ⚠ — `drive:0.3, warmth:0.5` → mild saturation curve and 9kHz LP rolloff on insert. Audible on bright sources but is a tape-emulation sound (intended). Borderline.
- **8. COMPONENT_MAP:** N/A.
- **Severity:** P2 (defaults audible but tape character is intentional)
- **Demo-blocker?:** no

### 16. Exciter (`exciter`)
- **UI file:** `ConsoleFXPanel.js:1264-1284`
- **Factory:** native — RecordingStudio.js:1662-1681
- **1. Param names:** ⚠ — UI exposes `amount, frequency, mix`. Factory handles `amount, frequency` only. **`mix` is a dead knob.**
- **2. Units:** ✅ — amount 0..100 (UI) → factory `safe(amt,0,0,100)/100`. Frequency 1000..10000 Hz.
- **3. Missing cases:** ❌ — `mix` (UI:1280) ignored.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠ — HPF → WaveShaper. No wet/dry split. The HPF stripped the lows, then the harmonic content is shaped — but no clean blend means the low end is lost in the wet path. Standard exciters use a parallel split. Combined with mix knob being dead, user can't fix this.
- **6. Dispose:** ✅.
- **7. Defaults:** ⚠ — `amount:30, frequency:3000, mix:0.2`. Amount=30 produces audible harmonics on insert AND HPF kills lows below 3kHz from the wet path. Sounds notably thinner. **Demo risk.**
- **8. COMPONENT_MAP:** N/A.
- **Severity:** P0/P1 — defaults audibly thin the signal AND mix knob doesn't recover it. User-perceived as "broken on insert."
- **Demo-blocker?:** **Likely YES** — clicking exciter ON makes the track noticeably thinner and there's no functional way to dial it back (no working mix). User will think the studio is broken.

### 17. Stereo Widener (`stereoWidener`)
- **UI file:** `ConsoleFXPanel.js:1311-1329`
- **Factory:** native — RecordingStudio.js:2894-2917
- **1. Param names:** ✅ — UI `width` wired (RS:2909-2914).
- **2. Units:** ✅ — UI 0..1 → factory clamps 0..4. Comment says width can range >1 (the safe() upper bound is 4) — UI cap is 1, so user can't widen beyond 100%, but no risk of clipping.
- **3. Missing cases:** ✅.
- **4. Worklets:** N/A — ChannelSplitter/Merger graph.
- **5. Topology:** ✅ — Mid/Side widener with M=L+R, S=L-R, recombined L=M+S, R=M-S. **Carefully constructed — sInv stays negative**, comment at RS:2912 acknowledges. Looks correct.
- **6. Dispose:** ✅ — disconnects all 7 nodes.
- **7. Defaults:** ⚠ — `width:0.5` (DEFAULT_EFFECTS) — that's actually 50% width which is *narrowed* below the natural 100%. On insert, the stereo image collapses noticeably. Should default to 1.0 (=natural) for true bypass.
- **8. COMPONENT_MAP:** N/A.
- **Severity:** P1 (default narrows the image — opposite of what user expects from a "widener")
- **Demo-blocker?:** maybe — stereo content suddenly narrows to half-width on insert.

### 18. Gain Utility (`gainUtility`)
- **UI file:** `ConsoleFXPanel.js:1331-1383`
- **Factory:** native — RecordingStudio.js:1697-1718
- **1. Param names:** ⚠ — UI exposes `gain, phaseInvert, monoSum`. Factory handles `gain, phaseInvert`. **`monoSum` is a dead knob** (no case, no implementation — would require a ChannelSplitter+Merger which the factory doesn't build).
- **2. Units:** ✅ — gain dB → linear via Math.pow(10, db/20).
- **3. Missing cases:** ❌ — `monoSum` (UI:1366) is unimplemented.
- **4. Worklets:** N/A.
- **5. Topology:** ⚠ — Single GainNode with sign flip for phase invert. monoSum can't be added without rebuilding topology.
- **6. Dispose:** ✅.
- **7. Defaults:** ✅ — `gain:0 dB, phaseInvert:false, monoSum:false` → unity, true bypass.
- **8. COMPONENT_MAP:** N/A.
- **Severity:** P1 (monoSum dead)
- **Demo-blocker?:** no — gain and phase invert work; mono toggle is rarely demo-critical.

---

## Batch 01 Summary
- **Total audited:** 18
- **Clean:** 5 (eq, gate, limiter, tremolo, filter, distortion → 6, calling 5 conservative since gate has the "compressor-as-gate" approximation note)
- **P2 (cosmetic):** 2 (compressor knee dead-default; tapeSaturation defaults audible)
- **P1 (polish):** 9 (deesser repurposed-threshold + audible defaults; reverb live-update dead; delay live-update dead; chorus mix dead; flanger feedback+mix dead + missing feedback topology; phaser rate+mix dead + no LFO; bitcrusher sampleRateReduce dead + audible default; stereoWidener default narrows image; gainUtility monoSum dead)
- **P0 (demo-blocker):** 1 (**exciter** — defaults audibly thin the signal via 3kHz HPF with no wet/dry, and the mix knob that would let the user blend it back is a dead control)
- **Top 3 worst:** exciter (P0), phaser (broken — no LFO sweep), flanger (no feedback regen path → doesn't sound like a flanger)
- **Common patterns:**
  1. **Modulation effects (chorus/flanger/phaser/exciter) systematically lack `mix` case wiring** — UI knob present, factory ignores. Likely a single shared regression where wet/dry topology was never added.
  2. **Reverb and delay are SENDS not inserts** — they live in `buildSends` (RS:3141-3148), have no `setParam`, no PluginInstance, and no live-knob support. Unlike SPX reverbs/delays in `buildFxChain`, the user cannot tweak these during playback.
  3. **ConsoleFXPanel never calls `inst.setParam`** — only the SPX plugin window does (RS:5915). So all 18 native effects' knobs are silent during playback even though the factories do register valid setParam handlers. A two-line fix in `updateEffect` (lookup `liveInstancesRef` and call `setParam`) would activate live ramping for every native effect that has cases.
  4. **A few defaults are audible-on-insert** (deesser -20dB notch, exciter 30% with HPF, bitcrusher 8 bits, tapeSaturation 0.3 drive, stereoWidener 0.5 width). Insert should be neutral; rely on the UI to dial in.
  5. **No worklet usage in any of the 18** — all native effects are pure WebAudio graphs, so worklet-load failures aren't a concern for this slice.
