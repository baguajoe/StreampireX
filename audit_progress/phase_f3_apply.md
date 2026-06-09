# Phase F3 — Compressor Instrumentation (Bug #1)

## Three console.warn calls added in `src/front/js/pages/RecordingStudio.js`

| Site | Line | What it logs |
|---|---|---|
| `registerInstance` | 988 | `[REGISTER] <trackId>:<pluginKey> instance stored` — fires when buildFxChain creates a plugin instance and writes it into the registry |
| `updateEffect` (native UI dispatch) | 5725 | `[UE-DISPATCH] <trackId>:<fxKey> → instance found: <bool> param: <name> val: <value>` — fires on every native-FX knob turn (basic compressor lives here) |
| `SPXPluginHost onChange` | 7710 | `[SPX-DISPATCH] <trackId>:<openFxKey> → instance found: <bool>` — fires on every SPX-plugin knob turn (warmPress, glueBus, fetStrike, optoPress, multiPress live here) |

## What to expect in the logs

**Healthy case** (registry working):
```
[REGISTER] 1714929847123:compressor instance stored
[UE-DISPATCH] 1714929847123:compressor → instance found: true param: threshold val: -40
[UE-DISPATCH] 1714929847123:compressor → instance found: true param: ratio val: 20
```
Instance found `true` on every dispatch → bug is NOT registry drift; look elsewhere (factory units, AudioParam set semantics).

**Drift case** (the leading hypothesis):
```
[REGISTER] 1714929847123:compressor instance stored
[UE-DISPATCH] 1714929847456:compressor → instance found: false param: threshold val: -40
```
Different `trackId` between register and dispatch → confirms the registry-key drift hypothesis. Track gets re-issued an id between build and dispatch, so the lookup misses and `setParam` silently no-ops.

**Mixed case**:
```
[REGISTER] 1714929847123:compressor instance stored
[UE-DISPATCH] 1714929847123:compressor → instance found: true param: threshold val: -40    ← knob 1 works
[UE-DISPATCH] 1714929847456:compressor → instance found: false param: ratio val: 20         ← knob 2 misses
```
Track id changed mid-flight (e.g., a re-render reissued the id) → narrows down to a specific state-update path that causes the id to change.

## Build
`webpack 5.99.9 compiled with 9 warnings in 192271 ms` — size warnings only, 0 errors.

## STATUS: PAUSED for user testing
