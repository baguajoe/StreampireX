# PLUGIN AUDIT — Spec & Format

This file is the SHARED reference for every batch auditor. Read this once,
then audit your assigned plugin slice and write your batch file
incrementally to disk every 10 plugins (so a codespace restart cannot
lose work).

## Working tree

- Repo root: `/workspaces/SpectraSphere`
- Branch: `claude/fix-recording-studio`

## Files you will read

- `src/front/js/component/SPXPlugins.js` (1959 lines) — defines
  `ALL_FX_EXTENDED` at line 1508, `PLUGIN_DEFAULTS` at 1637,
  `COMPONENT_MAP` at 1755, and most SPX UI components themselves.
- `src/front/js/component/SPXPlugins_EQ.js` (409 lines) — UI components
  for EQ-family plugins.
- `src/front/js/component/SPXPlugins_SPX100.js` (713 lines) — UI components
  for the SPX-100 series.
- `src/front/js/component/SPXPlugins_Creative.js` (452 lines) — UI
  components for creative plugins (TapeStop, AutoWah, etc).
- `src/front/js/component/audio/plugins/plugins/<Name>Plugin.js` —
  individual ph_* factory files. Each exports a factory that returns
  `{ input, output, setParam(name, value), dispose() }` (or similar).
- `src/front/js/component/audio/plugins/PluginHost.js` — registers the
  ph_* factories, manages worklets, audio routing.
- `src/front/js/component/audio/plugins/registry.js` — catalogue of
  ph_* keys.

## 8 Bug Classes — check EVERY plugin

For each plugin, score each bug class as ✅ ok / ⚠️ minor / ❌ broken /
N/A. Provide one-line evidence (file:line) for ⚠️/❌.

1. **PARAM NAME MATCHING** — UI knob `onChange` keys must equal the case
   names in the factory's `setParam()` switch. Mismatch = silent dead knob.
2. **UNIT MISMATCHES** — UI 0–100 vs factory expects 0–1; ms vs s; Hz vs
   kHz; dB vs linear; degrees vs radians. Note exact mismatch.
3. **MISSING SETPARAM CASES** — Every UI knob/control should map to a
   `case 'name':` in the factory. Find knobs whose name has no case.
4. **WORKLET DEPENDENCIES** — Plugins using AudioWorkletNode (`spx-limiter`,
   `spx-meter`, custom worklets) must be wrapped in try/catch and have a
   fallback path when the worklet is not loaded. Flag bare `new
   AudioWorkletNode(...)` calls.
5. **TOPOLOGY** — `input` connects forward to `output`; no orphan nodes;
   wet/dry mix is correctly summed; bypass works. Look for nodes built
   in the factory that are never connected to anything.
6. **DISPOSE CLEANUP** — `dispose()` (or equivalent) stops all
   `OscillatorNode`s, disconnects all nodes, clears intervals/timers,
   and releases AudioBufferSourceNodes. Missing cleanup = memory leak
   per insert/remove cycle.
7. **DEFAULT VALUE DANGER** — Defaults that are audible on insert
   (mix > 0, drive > 0, depth > 0, feedback > 0.5) and the user did
   not yet touch a knob. The plugin should be neutral on insert unless
   it's a utility (gain, meter). Flag dangerous defaults.
8. **COMPONENT_MAP GAPS** — UI component name appears in
   `ALL_FX_EXTENDED[].component` but is NOT a key in `COMPONENT_MAP`
   (lines 1755–1768 of SPXPlugins.js). These render as `null` in
   `SPXPluginHost`. List every gap by component name.

## Output format — per plugin

Each plugin entry in your batch file:

```
### N. <PluginName> (`<key>`)
- **UI file:** `src/front/js/component/<File>.js:<line>` (or "no UI")
- **Factory:** `src/front/js/component/audio/plugins/plugins/<Name>Plugin.js` (or "native — see SPXPlugins.js / RecordingStudio")
- **1. Param names:** ✅ / ⚠️ / ❌ — evidence
- **2. Units:** ✅ / ⚠️ / ❌ — evidence
- **3. Missing cases:** ✅ / ⚠️ / ❌ — evidence
- **4. Worklets:** ✅ / ⚠️ / ❌ / N/A — evidence
- **5. Topology:** ✅ / ⚠️ / ❌ — evidence
- **6. Dispose:** ✅ / ⚠️ / ❌ — evidence
- **7. Defaults:** ✅ / ⚠️ / ❌ — evidence
- **8. COMPONENT_MAP:** ✅ registered / ❌ MISSING / N/A
- **Severity:** P0 / P1 / P2 / clean
- **Demo-blocker?:** yes / no
```

If a check is N/A (e.g. component=null native plugins have no
COMPONENT_MAP entry by design), say N/A and explain in one sentence.

## Saving cadence (RESTART PROOF)

After every **10 plugins** audited, append to your batch file
`/workspaces/SpectraSphere/audit_progress/batch_<NN>_<slug>.md` and
flush to disk. Use the `Write` tool to overwrite each time with the
accumulated content. Do NOT wait until the end of your slice.

## Final summary block (end of your batch file)

```
## Batch <NN> Summary
- Total audited: <N>
- Clean: <count>
- P2 (cosmetic): <count>
- P1 (polish): <count>
- P0 (demo-blocker): <count>
- Top 3 worst plugins: <list>
- Common patterns: <observations>
```

Return to caller (the orchestrator) only the summary block — under 250
words. The batch file on disk is the deliverable.
