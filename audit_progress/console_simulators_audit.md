# Console Simulators Audit

Read-only audit of console-character dropdowns in `src/front/js/pages/RecordingStudio.js`. No source files modified.

---

## CONSOLE_BOARDS definition
**Location:** `RecordingStudio.js:199–221`

21 entries: `none` (Bypass) + 20 active console boards. Each entry has `name` (display) and `color` (UI border accent). No per-console parameters live in `CONSOLE_BOARDS` itself — actual DSP parameters live in a separate `configs` map inside `applyConsoleCharacter`.

```
none, ssl4ke, ssl4kg, neve8078, neve1073, api1604, tridentA, studer900, mciJH636,
ssl9000, neve8068, api2488, helios69, neveVR, emiTG, sslAWS, amekAngela,
harrison, neve8014, sonyMXP, calrec
```

## Dropdowns
- **Per-track:** `RecordingStudio.js:7794–7796`. Renders `Object.entries(CONSOLE_BOARDS)`. Bound to `trackConsoleChar[t.id]`. State setter: `setTrackConsoleChar`.
- **Master:** `RecordingStudio.js:7901–7903`. Same source. Bound to `masterConsoleChar`. State setter: `setMasterConsoleChar`.

Both dropdowns share the same option list (21 items each).

## applyConsoleCharacter function
**Location:** `RecordingStudio.js:1266–1306`

```
input → highpass(c[0]Hz, c[1]Q)
      → tanh saturation (drive c[2], asymmetric c[3])
      → low-shelf  (freq c[4], gain c[5] dB)
      → high-shelf (freq c[6], gain c[7] dB)
      → tanh saturation (drive c[8], asymmetric c[9])
      → output gain (linear c[10])
      → output
```

Five-stage chain — every active console runs the same topology, distinguished only by the 11-element parameter array. `none` short-circuits to a direct passthrough at `:1267`. Unknown boardId also passthrough at `:1292`.

## Per-console table

| Console (display) | Key | HPF Hz | Sat drive (in/out) | LS dB / HS dB | Gain | Distinct DSP? | Has UI panel? | A/B audible? |
|---|---|---|---|---|---|---|---|---|
| Bypass | `none` | — | — | — | 1.0 | passthrough | n/a | N (silent) |
| SSL 4000E | `ssl4ke` | 18 | 1.2 / 1.1 | -0.8 / +1.2 | 0.98 | Y | **NO** | Y |
| SSL 4000G | `ssl4kg` | 15 | 1.1 / 1.05 | -0.5 / +0.8 | 0.99 | Y | **NO** | Y |
| Neve 8078 | `neve8078` | 30 | 1.6 / 1.4 (asym) | +1.5 / -0.5 | 0.95 | Y | **NO** | Y |
| Neve 1073 | `neve1073` | 50 | 1.8 / 1.6 (asym) | +2.0 / -0.8 | 0.93 | Y | **NO** | Y |
| API 1604 | `api1604` | 20 | 1.3 / 1.25 | +0.5 / +1.0 | 0.97 | Y | **NO** | Y |
| Trident A | `tridentA` | 25 | 1.4 / 1.3 (asym) | +1.0 / +0.6 | 0.96 | Y | **NO** | Y |
| Studer 900 | `studer900` | 22 | 1.05 / 1.02 | -0.3 / +0.3 | 1.0 | Y (subtle) | **NO** | Maybe |
| MCI JH-636 | `mciJH636` | 28 | 1.5 / 1.35 (asym) | +1.2 / +0.8 | 0.96 | Y | **NO** | Y |
| SSL 9000 | `ssl9000` | 12 | 1.15 / 1.1 | -0.3 / +1.0 | 0.99 | Y (subtle) | **NO** | Maybe |
| Neve 8068 | `neve8068` | 35 | 1.7 / 1.45 (asym) | +1.8 / -0.6 | 0.94 | Y | **NO** | Y |
| API 2488 | `api2488` | 22 | 1.35 / 1.3 | +0.8 / +1.2 | 0.97 | Y | **NO** | Y |
| Helios T69 | `helios69` | 40 | 1.9 / 1.5 (asym) | +2.5 / -1.0 | 0.92 | Y | **NO** | Y (most colored) |
| Neve VR | `neveVR` | 20 | 1.45 / 1.3 (asym) | +1.2 / +0.2 | 0.96 | Y | **NO** | Y |
| EMI TG12345 | `emiTG` | 45 | 2.0 / 1.6 (asym) | +3.0 / -1.5 | 0.90 | Y | **NO** | Y (heavy) |
| SSL AWS | `sslAWS` | 10 | 1.1 / 1.05 | -0.2 / +0.6 | 1.0 | Y (clean) | **NO** | Maybe |
| Amek Angela | `amekAngela` | 32 | 1.55 / 1.4 (asym) | +1.6 / -0.3 | 0.95 | Y | **NO** | Y |
| Harrison 32 | `harrison` | 8 | 1.05 / 1.02 | +0.2 / +0.4 | 1.0 | Y (very clean) | **NO** | Subtle |
| Neve 8014 | `neve8014` | 60 | 2.1 / 1.7 (asym) | +3.5 / -2.0 | 0.88 | Y | **NO** | Y (heaviest) |
| Sony MXP-3000 | `sonyMXP` | 14 | 1.2 / 1.1 | +0.3 / +0.8 | 0.98 | Y | **NO** | Y |
| Calrec | `calrec` | 16 | 1.15 / 1.08 | -0.1 / +0.5 | 0.99 | Y (subtle) | **NO** | Maybe |

## Wiring (where the DSP is applied)

| Site | File:line | Source → Dest |
|---|---|---|
| Per-track playback chain | `:6209–6213` | `panNode → consoleOut → masterGain` (per audible track during playback) |
| Per-track live mixer | `:5937–5939` | `meter → consoleOut → ...` |
| Bus tracks | `:5964` | bus `meter → busConsoleOut` |
| Master bus | `:6019` (and useEffect at `:1167`) | `masterGain → masterConsoleOut → masterPan` |

All four sites call the same `applyConsoleCharacter`. `none` triggers passthrough at every site (`:1267`). State-driven rebuilds: `consoleSignature` memo at `:6258` rebuilds the live graph when the per-track map changes; `masterConsoleChar` useEffect at `:1167` rebuilds the master path on master-console change.

## Summary

- **Total consoles in dropdown:** 21 (1 bypass + 20 active)
- **Consoles with distinct DSP:** 20 of 20 active — every one has a unique 11-element config
- **Consoles that are placeholder names:** **0** — all are real DSP
- **Consoles with editable UI panel:** **0** — dropdown-only

### DSP depth
| Tier | Count |
|---|---|
| Pure passthrough (no-op) | 1 (`none`) |
| Just gain change | 0 |
| Single EQ curve | 0 |
| EQ + saturation | 0 |
| **Full 5-stage chain (HPF → sat → LS → HS → sat → gain)** | **20** |

### Honest user-visible behavior

- **Audibly:** Selecting different consoles DOES produce different sound. The differences range from very subtle (Harrison 32 at HPF 8 Hz, sat 1.05) to heavy (Neve 8014 at HPF 60 Hz, sat 2.1, +3.5/-2.0 dB shelves). At default test signal levels, "Helios T69" / "EMI TG12345" / "Neve 8014" are clearly audible; "Studer 900" / "SSL AWS" / "Calrec" are subtle in casual listening.
- **Visually:** **Nothing happens** when a console is selected besides:
  - The dropdown's selected value updates
  - The dropdown's border color may change (each console has a `color` field used somewhere for UI accent)
  - **No panel appears, no knobs appear, no EQ curve is drawn, no saturation curve is shown.**

The user's report — "may not work or have no UI" — is half-correct: **DSP works, UI doesn't exist.** The user can't tell the consoles do anything because there's no visual feedback besides the dropdown text itself. They have to listen and A/B by ear.

### Recommendation

**Option B (UI only) — recommended.** DSP is complete and distinct across all 20 consoles. What's missing is the user-facing affordance to (a) confirm the console is engaged, (b) see what it's doing, (c) optionally tweak parameters.

| Sub-task | Hours |
|---|---|
| **Read-only console panel** — when a non-`none` board is selected, show a small panel under or beside the dropdown with: console name, color stripe, current HPF/EQ/sat values displayed (read-only), maybe a tiny EQ curve preview | 2 |
| **Live-tweakable mode** — promote the 11 hard-coded parameters per console to runtime AudioParams; expose 11 knobs (HPF freq + Q, in-sat drive + asym, low shelf freq + gain, high shelf freq + gain, out-sat drive + asym, output gain). Per-console preset = current array values | 3 |
| **A/B + reset** — toggle between user-tweaked and factory preset; "Restore" button | 0.5 |
| **Preset memory** — save user tweaks per console (e.g. "SSL 4000E + my tweaks") | 1 |
| **Total** | **6.5 h** |

If only the read-only path is shipped (Option B-Lite, 2 h), the user can at least *see* what's happening when they pick a console. Live editability is a stretch goal.

**Option A (build DSP from scratch) is not applicable** — DSP is already in place and audibly distinct.

**Option C (DSP works, needs UI)** = same as Option B.
