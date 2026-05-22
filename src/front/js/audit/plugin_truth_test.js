// =============================================================================
// plugin_truth_test.js — Browser-side runtime audit of registry-path plugins.
// =============================================================================
// Companion to scripts/audit/plugin_truth_audit.js (the static auditor). This
// harness exercises every entry in PLUGIN_FACTORIES with REAL audio in an
// OfflineAudioContext and reports per-plugin:
//   - Factory throws or returns the wrong shape?
//   - Default-params output ≈ raw input (passthrough)?
//   - For each declared param: does ramping it min → max change the RMS?
//
// Limitations:
//   - Inline factories defined inside RecordingStudio.js (closures over the
//     studio's lexical scope) are NOT exportable and therefore not testable
//     here. Static analysis covers them; this harness covers the registry.
//   - Plugins that prefer AudioWorkletNode and fall back to native nodes will
//     be tested via the fallback path (no worklets registered in the offline
//     context). The result reports `worklet: 'fallback'` so that's clear.
// =============================================================================

import { PLUGIN_FACTORIES } from '../component/audio/plugins/PluginHost';
import pluginRegistry from '../component/audio/plugins/registry';

const SR = 48000;
const RENDER_SECONDS = 1.0;
// RMS delta below which we treat a parameter as "did nothing" (≈0.5 dB).
const MIN_DELTA_DB_WIRED = 0.5;
// dB threshold for the passthrough check — output ≈ input means "didn't process".
const PASSTHROUGH_DB = 0.5;

function rmsOf(buf) {
  let acc = 0;
  for (let i = 0; i < buf.length; i++) acc += buf[i] * buf[i];
  return Math.sqrt(acc / buf.length);
}

function dB(x) {
  return 20 * Math.log10(Math.max(1e-9, x));
}

// White-noise + 1 kHz sine reference signal. Stable mix, no DC, broadband
// energy so EQ/filter changes show up in RMS deltas.
function makeTestSignal(ctx) {
  const len = Math.floor(SR * RENDER_SECONDS);
  const buf = ctx.createBuffer(1, len, SR);
  const d = buf.getChannelData(0);
  const omega = (2 * Math.PI * 1000) / SR;
  for (let i = 0; i < len; i++) {
    const noise = (Math.random() * 2 - 1) * 0.3;
    const sine = Math.sin(omega * i) * 0.3;
    d[i] = noise + sine;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.start(0);
  return src;
}

// Render the offline context and return the mono Float32Array of the result
// PLUS the raw test-signal RMS for passthrough comparison.
async function renderOffline(buildGraph) {
  const ctx = new OfflineAudioContext(1, SR * RENDER_SECONDS, SR);
  const src = makeTestSignal(ctx);
  // Fork a tap of the raw input so we can measure the input RMS in the same
  // render pass — avoids drift from re-randomized noise on a second render.
  const inputTap = ctx.createGain();
  src.connect(inputTap);
  const result = await buildGraph(ctx, inputTap);
  // result: { node: outputNode, inputRmsBuf?: Float32Array? }  — caller
  // already connects to ctx.destination if they want.
  const rendered = await ctx.startRendering();
  return rendered.getChannelData(0);
}

// Compute the RMS of the entire signal AND the second-half (steady-state, after
// any factory init transient like an LFO sweep settles). We use steady-state
// for param-delta comparisons.
function steadyStateRms(buf) {
  const half = Math.floor(buf.length / 2);
  return rmsOf(buf.subarray(half));
}

function shapeOk(inst) {
  if (!inst || typeof inst !== 'object') return false;
  if (!inst.inputNode || typeof inst.inputNode.connect !== 'function') return false;
  if (!inst.outputNode || typeof inst.outputNode.connect !== 'function') return false;
  if (typeof inst.setParam !== 'function') return false;
  // Either dispose() (inline contract) or destroy() (registry contract) is
  // accepted — both teardown shapes ship in the codebase.
  if (typeof inst.dispose !== 'function' && typeof inst.destroy !== 'function') return false;
  return true;
}

function safeTeardown(inst) {
  try { if (typeof inst.dispose === 'function') inst.dispose(); } catch (_e) { /* noop */ }
  try { if (typeof inst.destroy === 'function') inst.destroy(); } catch (_e) { /* noop */ }
}

// Render with the plugin inserted, using `setParam` to pin a single param
// at `value` before rendering starts. Returns the rendered buffer.
async function renderWithPluginParam(factory, defaults, paramName, value) {
  const ctx = new OfflineAudioContext(1, SR * RENDER_SECONDS, SR);
  const src = makeTestSignal(ctx);
  let inst;
  try {
    inst = factory(ctx, { ...defaults });
  } catch (e) {
    return { error: `factory threw: ${e?.message || e}` };
  }
  if (!shapeOk(inst)) {
    safeTeardown(inst);
    return { error: 'factory returned invalid shape' };
  }
  try {
    if (paramName != null) inst.setParam(paramName, value);
  } catch (e) {
    safeTeardown(inst);
    return { error: `setParam threw: ${e?.message || e}` };
  }
  try {
    src.connect(inst.inputNode);
    inst.outputNode.connect(ctx.destination);
  } catch (e) {
    safeTeardown(inst);
    return { error: `connect threw: ${e?.message || e}` };
  }
  let rendered;
  try {
    rendered = await ctx.startRendering();
  } catch (e) {
    safeTeardown(inst);
    return { error: `render threw: ${e?.message || e}` };
  }
  safeTeardown(inst);
  return { buffer: rendered.getChannelData(0) };
}

// Render the raw test signal (no plugin) for input-RMS reference.
async function renderRaw() {
  const ctx = new OfflineAudioContext(1, SR * RENDER_SECONDS, SR);
  const src = makeTestSignal(ctx);
  src.connect(ctx.destination);
  const rendered = await ctx.startRendering();
  return rendered.getChannelData(0);
}

// Audit one plugin id end-to-end.
async function auditOnePlugin(id, factory, registryDef) {
  const result = {
    id,
    name: registryDef?.name || id,
    category: registryDef?.category || 'unknown',
    factoryShapeOk: false,
    processesAudio: false,
    inputDb: null,
    defaultDb: null,
    paramResults: [],
    errors: [],
    workletPath: 'unknown',
    verdict: 'BROKEN',
  };

  // 1) Render input reference (used for passthrough check).
  let inputBuf;
  try {
    inputBuf = await renderRaw();
  } catch (e) {
    result.errors.push(`raw render failed: ${e?.message || e}`);
    return result;
  }
  result.inputDb = dB(steadyStateRms(inputBuf));

  // 2) Render at default params.
  // Build a defaults object from registryDef.params, falling back to {}.
  const defaults = {};
  if (registryDef?.params) {
    registryDef.params.forEach((p) => { defaults[p.id] = p.default; });
  }
  // Detect worklet vs fallback by listening for the "[CompressorPlugin] Worklet
  // unavailable" warning emitted by some factories. We use a console wrap.
  let sawWorkletFallback = false;
  const origWarn = console.warn;
  console.warn = (...args) => {
    const s = args.join(' ');
    if (/worklet/i.test(s) && /(unavailable|fail|disabled)/i.test(s)) sawWorkletFallback = true;
    origWarn.apply(console, args);
  };

  let defaultBuf;
  try {
    const r = await renderWithPluginParam(factory, defaults, null, null);
    if (r.error) {
      result.errors.push(`default render: ${r.error}`);
      console.warn = origWarn;
      return result;
    }
    defaultBuf = r.buffer;
    result.factoryShapeOk = true;
  } finally {
    console.warn = origWarn;
  }
  result.workletPath = sawWorkletFallback ? 'fallback' : 'native-or-worklet';
  result.defaultDb = dB(steadyStateRms(defaultBuf));

  // 3) Passthrough detection: if default output RMS is within ±0.5 dB of
  // the input RMS AND sample-by-sample diff is tiny, factory is a passthrough.
  const dbDelta = Math.abs(result.defaultDb - result.inputDb);
  let avgDiff = 0;
  for (let i = 0; i < Math.min(inputBuf.length, defaultBuf.length); i++) {
    avgDiff += Math.abs(inputBuf[i] - defaultBuf[i]);
  }
  avgDiff /= Math.min(inputBuf.length, defaultBuf.length);
  result.processesAudio = !(dbDelta < PASSTHROUGH_DB && avgDiff < 0.001);

  // 4) Per-param min/max ramp test.
  if (registryDef?.params) {
    for (const p of registryDef.params) {
      // Skip non-numeric or single-valued params.
      if (typeof p.min !== 'number' || typeof p.max !== 'number' || p.min === p.max) {
        result.paramResults.push({ name: p.id, wired: null, deltaDb: null, note: 'non-rampable' });
        continue;
      }
      const minR = await renderWithPluginParam(factory, defaults, p.id, p.min);
      const maxR = await renderWithPluginParam(factory, defaults, p.id, p.max);
      if (minR.error || maxR.error) {
        result.paramResults.push({
          name: p.id, wired: false, deltaDb: null,
          note: `error: ${minR.error || maxR.error}`,
        });
        continue;
      }
      const minDb = dB(steadyStateRms(minR.buffer));
      const maxDb = dB(steadyStateRms(maxR.buffer));
      const delta = Math.abs(maxDb - minDb);
      result.paramResults.push({
        name: p.id,
        wired: delta >= MIN_DELTA_DB_WIRED,
        deltaDb: Number.isFinite(delta) ? +delta.toFixed(2) : null,
        note: '',
      });
    }
  }

  // 5) Verdict.
  const wired = result.paramResults.filter((r) => r.wired === true).length;
  const rampable = result.paramResults.filter((r) => r.wired !== null).length;
  const coverage = rampable > 0 ? wired / rampable : 1;
  if (!result.factoryShapeOk) result.verdict = 'BROKEN';
  else if (!result.processesAudio) result.verdict = 'STUB';
  else if (rampable > 0 && coverage === 0) result.verdict = 'STUB';
  else if (coverage >= 0.75) result.verdict = 'WORKING';
  else if (coverage > 0) result.verdict = 'PARTIAL';
  else result.verdict = 'WORKING'; // no rampable params but processes audio

  return result;
}

export async function runRegistryAudit({ onProgress, signal } = {}) {
  // Build id → registryDef lookup. registry.js exports as default.
  const regById = {};
  Object.values(pluginRegistry || {}).forEach((def) => {
    if (def?.id) regById[def.id] = def;
  });

  const ids = Object.keys(PLUGIN_FACTORIES);
  const total = ids.length;
  const results = [];
  let i = 0;
  for (const id of ids) {
    if (signal?.aborted) break;
    i++;
    const factory = PLUGIN_FACTORIES[id];
    const def = regById[id] || null;
    let result;
    try {
      result = await auditOnePlugin(id, factory, def);
    } catch (e) {
      result = {
        id, name: id, category: 'unknown',
        factoryShapeOk: false, processesAudio: false,
        inputDb: null, defaultDb: null,
        paramResults: [], errors: [`audit threw: ${e?.message || e}`],
        workletPath: 'unknown', verdict: 'BROKEN',
      };
    }
    results.push(result);
    if (typeof onProgress === 'function') onProgress({ i, total, current: result });
  }
  return results;
}

export function buildMarkdownReport(results) {
  const totals = { WORKING: 0, PARTIAL: 0, STUB: 0, BROKEN: 0 };
  results.forEach((r) => { totals[r.verdict] = (totals[r.verdict] || 0) + 1; });
  const date = new Date().toISOString().split('T')[0];
  const lines = [];
  lines.push('# Plugin Truth Report — Runtime (registry path)');
  lines.push('');
  lines.push(`_Generated by /plugin-audit on ${date}._`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total tested:** ${results.length}`);
  lines.push(`- **WORKING:** ${totals.WORKING}`);
  lines.push(`- **PARTIAL:** ${totals.PARTIAL}`);
  lines.push(`- **STUB:** ${totals.STUB}`);
  lines.push(`- **BROKEN:** ${totals.BROKEN}`);
  lines.push('');
  // Group by category
  const byCat = {};
  results.forEach((r) => {
    const c = r.category || 'unknown';
    if (!byCat[c]) byCat[c] = [];
    byCat[c].push(r);
  });
  Object.keys(byCat).sort().forEach((cat) => {
    lines.push(`## ${cat}`);
    lines.push('');
    lines.push('| Plugin | Audio | Wired params | Verdict | Notes |');
    lines.push('|--------|-------|--------------|---------|-------|');
    byCat[cat].sort((a, b) => a.id.localeCompare(b.id)).forEach((r) => {
      const audio = r.processesAudio ? '✅' : '❌ passthrough';
      const wired = r.paramResults.filter((p) => p.wired === true).length;
      const rampable = r.paramResults.filter((p) => p.wired !== null).length;
      const ps = r.paramResults
        .filter((p) => p.wired !== null)
        .map((p) => `${p.name}${p.wired ? '✅' : '❌'}${p.deltaDb != null ? `(${p.deltaDb}dB)` : ''}`)
        .join(' ');
      const notes = [];
      if (r.workletPath === 'fallback') notes.push('worklet fallback');
      if (r.errors.length) notes.push(`errors: ${r.errors.join('; ')}`);
      lines.push(`| ${r.id} | ${audio} | ${wired}/${rampable} ${ps} | **${r.verdict}** | ${notes.join('; ')} |`);
    });
    lines.push('');
  });
  return lines.join('\n');
}
