# Phase F4-C-FIX — Consolidated audit summary (5 tasks)

Status of each task plus the most likely root cause for each
user-reported symptom. **No fixes applied for Tasks 1, 2, 3, 4 yet.**
Task 5 was 6/13 partially applied before this pause — see end of doc.

---

## Task 1 — Compressor setParam wiring

**Doc:** `audit_progress/phase_f4c_compressor_setparam_audit.md`

**Verdict on user's "ratio 2:1 vs 20:1 sounds the same":** The
factory wiring is **CORRECT** for every compressor. The native
`compressor` factory at `RecordingStudio.js:1669-1684` has:

```js
case "ratio":     c.ratio.setTargetAtTime(safe(v, 4, 1, 20), t, TAU); break;
case "threshold": c.threshold.setTargetAtTime(safe(v, -20, -100, 0), t, TAU); break;
case "attack":    c.attack.setTargetAtTime(safe(v, 0.01, 0, 1), t, TAU); break;
case "release":   c.release.setTargetAtTime(safe(v, 0.1, 0, 1), t, TAU); break;
```

All 21 compressor-family factories (compressor, limiter, gate, deesser,
warmPress, glueBus, fetStrike, optoPress, parallelCrush, tubeComp,
vocalComp, multiPress, transGate, brickWall, masterWall, gainRider,
transientShaper, breathGate, sibilantCut, midSideComp, multibandLimiter)
were audited. Setters that are absent (e.g. native compressor lacks
`knee`, deesser lacks `attack/release/knee`) are intentional — those
plugins simply don't expose those knobs.

**Most likely true cause of the user's symptom:** The compressor
plugin probably wasn't actually wired into the live-mixer graph when
the user changed the knob (same root cause as Task 4 — see below).
Once playback starts and `buildPlaybackSources` rebuilds the chain,
ratio should produce dramatic differences.

**Recommended diagnostic:** Open DevTools, watch console for
`[UE-DISPATCH] <track>:compressor → instance found: ...`. If
`instance found: false`, the plugin isn't in the live graph. If
`instance found: true`, the param is being ramped — at that point any
remaining "no audible difference" is acoustic, not a wiring bug.

**No code fix required from this audit.** The wiring is correct.

---

## Task 2 — Mastering UI registration

**Doc:** `audit_progress/phase_f4c_mastering_ui_audit.md`

**Verdict:** Confirmed real bug. **15 plugins declare a `component:`
in `ALL_FX_EXTENDED` but have neither a `COMPONENT_MAP` entry nor a
file on disk nor an inline definition in `SPXPlugins.js`.**
`SPXPluginHost` resolves `Comp = COMPONENT_MAP[fxDef.component]`,
hits `undefined`, and `if (!Comp) return null` → popup never opens.

| Mastering plugins broken | Other categories broken |
|---|---|
| `stereoImager` | `formantFilter` (filter) |
| `multibandLimiter` | `spectrumAnalyzer` (eq) |
| `goniometer` | `tapeStop` (creative) |
| `phaseScope` | `transientShaper` (comp) |
|  | `reverseDelay`, `tempoDelay` (delay) |
|  | `subOctaver`, `pitchRandomizer`, `autoWah` (filter) |
|  | `drumEnhancer` (comp) |
|  | `multibandSat` (distortion) |

**Recommended fix scope:** Create a `GenericPlaceholderUI` (or use
the existing `DraggablePanel + ConsoleFXPanel`-style fallback) for
every broken `component:` reference, OR temporarily set those entries
to `component: null` so they render as the legacy DraggablePanel. The
legacy path already works for native plugins and would be a
zero-effort unblock.

---

## Task 3 — Saturation runtime

**Doc:** `audit_progress/phase_f4c_saturation_audit.md`

**Verdict:** The factories themselves are **correct** — every
WaveShaper has its `.curve` assigned at install and the drive/saturation
setParam handlers properly rebuild the curve. The user's "saturation
plugins silent" report is two layered issues:

1. **Default drive / saturation = 0** in `PLUGIN_DEFAULTS`
   (`SPXPlugins.js:1876+`). When you add e.g. `valveGlow` with
   `drive=0`, the curve is `c[i] = (1+0/2)*x/(1+0*|x|) = x` — pure
   identity, no audible saturation.
2. **`harmonicExcite`, `multibandSat`, `ringMod`** also default
   `mix=0` so even if drive were non-zero, the wet path is silent.

**Recommended fix:** Bump defaults in `PLUGIN_DEFAULTS`:

| Plugin | Knob | Current | Suggested |
|---|---|---|---|
| `tapeForge` | drive | 0 | 0.5 |
| `tapeForge` | saturation | 0 | 0.4 |
| `valveGlow` | drive | 0 | 0.4 |
| `valveGlow` | warmth | 0 | 0.3 |
| `ironCore` | slewRate | 0 | 0.4 |
| `ironCore` | coreSize | 0 | 0.5 |
| `consoleSoul` | crosstalk | 0 | 0.2 |
| `consoleSoul` | sumSaturation | 0 | 0.3 |
| `vinylPress` | warmth | 0 | 0.3 |
| `loFiCrusher` | bits | 24 | 12 |
| `loFiCrusher` | rate | 1.0 | 0.7 |
| `cabinetSim` | cabinet | 0 | 0.5 |
| `cabinetSim` | mic | 0 | 0.5 |
| `harmonicExcite` | mix | 0 | 25 (Task 5 already covers) |
| `multibandSat` | mix | 0 | 25 (Task 5 already covers) |
| `vocalSaturator` | drive | 0 | 0.4 |

These are UX choices, not correctness fixes — same character
as Task 5. User approval needed before applying.

---

## Task 4 — Analog Rack / Channel Strip

**Doc:** `audit_progress/phase_f4c_analog_rack_audit.md`

**Verdict:** Confirmed real bug + secondary bug.

**Real bug A — toggle doesn't rebuild live-mixer graph:**
`ConsoleFXPanel.js` toggle handlers call
`updateEffect("tapeSaturation", "enabled", true)`. `updateEffect` skips
`setParam` for `"enabled"` and falls through to `setTracks`. The
`useEffect [tracks]` calls `ensureTrackGraph(track)` which **early-returns
on cache hit at `RecordingStudio.js:6141`** — so the new plugin is
never installed in the live graph. Drive/Warmth sliders then dispatch
to a non-existent live instance and silently no-op.

(`fxSignature` useEffect at line 6570 *would* rebuild — but only
during playback. During live monitoring, the toggle is dead.)

**Recommended fix:** Either
- Modify `updateEffect` to call `rebuildTrackGraph(tracks[ti].id)` when
  `param === "enabled"`, OR
- Change ConsoleFXPanel toggles to use a different handler that
  explicitly busts the cache (mirrors the top-level Tape Saturation
  toggle at `RecordingStudio.js:8546`).

The first option is simpler — one place to change, fixes every
ConsoleFXPanel section's toggle.

**Real bug B — vinylPress crackle is fake:** `RecordingStudio.js:2148`
implements the "crackle" knob as a 20 Hz HPF shift. There's no actual
noise / impulse-train source. The crackle knob is decorative.

**Recommended fix B:** Replace the HPF-only implementation with a
noise `BufferSource` gated by an envelope follower (or random impulse
train) scaled by `p.crackle`. ~30 lines of factory code. User
approval needed because this is new audio behaviour.

---

## Task 5 — Mix-default UX change (PARTIALLY APPLIED — paused)

**Status:** 6 of ~13 edits applied to
`src/front/js/component/SPXPlugins.js` before user paused.

**Already applied (mix: 0 → 25):**
- `REVERB_BASE_DEFAULTS` (cascades to: hallForgeS, hallForgeL, gateVerb,
  vintageAir, stochasticHall, greatHall)
- `vocalSaturator`
- `vocalSpace`, `spaceForge`, `infiniteReverb`
- `echoField`, `dualDelay`, `reverseDelay`, `tempoDelay`
- `stereoBloom`, `vortexMod`, `chorusEnsemble`, `autoWah`
- `ringMod`, `formantFilter`

**Remaining (still mix: 0):**
- `vocoderSPX` (line 1965)
- `voiceForge` (line 1968)
- `harmonicExcite` (line 1976)
- `multibandSat` (line 1985)

**Rollback option:** If you want Task 5 reverted entirely (back to
mix=0 baseline) before the consolidated review, tell me and I'll
restore each line. Otherwise I'll finish the remaining 4 entries.

---

## What I recommend doing next

The user-reported symptoms map to fixes in this order of impact:

1. **Critical: Task 4 fix A** — make `updateEffect` rebuild the
   track graph on `enabled` toggle. Single ~3-line change in
   `RecordingStudio.js:6917-6923`. Unblocks Analog Rack toggles AND
   fixes the "compressor knob does nothing on a freshly-added insert"
   complaint at the same time.

2. **Critical: Task 2 fallback** — add `GenericPlaceholderUI` or
   change the 15 broken `component:` entries to `null` so the popup
   actually opens. This is the "Mastering UI doesn't open" bug.

3. **UX: Task 3 + Task 5 + Task 4 UX defaults** — bump
   `PLUGIN_DEFAULTS` so saturation plugins are audible on insert and
   reverbs/delays are wet-by-default. Single `SPXPlugins.js` edit
   pass.

4. **New behaviour: Task 4 fix B** — wire a real crackle source for
   `vinylPress`. Bigger change (new noise generator), best deferred
   to a focused commit so it's reviewable.

I would **not** ship 1+2+3+4 as one big commit. Suggest:
- Commit A: Task 4 fix A (the rebuild-on-toggle).
- Commit B: Task 2 fallback (the 15 missing UIs).
- Commit C: Task 3 + 5 defaults (PLUGIN_DEFAULTS pass).
- Commit D: Task 4 fix B (vinyl crackle).

Each commit independently smoke-testable.
