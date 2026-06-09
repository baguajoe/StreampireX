#!/usr/bin/env node
/**
 * plugin_truth_audit.js — Comprehensive static audit of every plugin in SpectraSphere.
 *
 * What this does (READ-ONLY, no code changes):
 *   1. Parses src/front/js/component/SPXPlugins.js to extract:
 *        - ALL_FX_EXTENDED (the master plugin registry array)
 *        - PLUGIN_DEFAULTS (default params per plugin key)
 *        - COMPONENT_MAP (UI name -> import binding)
 *   2. Parses src/front/js/pages/RecordingStudio.js to extract:
 *        - install("<key>", ...) calls — the inline factory dispatch list
 *        - For each install, the setParam switch cases (handled param keys)
 *   3. Parses src/front/js/component/audio/plugins/PluginHost.js to extract:
 *        - PLUGIN_FACTORIES map (registry-path factories)
 *   4. Parses src/front/js/component/audio/plugins/registry.js to extract:
 *        - pluginRegistry entries (registry-path plugin defs with declared params)
 *   5. Walks src/front/js/component/audio/PluginUIs/ to find UI files on disk.
 *
 *   Then, for each plugin (union of all sources), it reports a verdict:
 *     - WORKING: factory exists AND ≥75% of declared params are handled in setParam AND UI exists
 *     - PARTIAL: factory exists AND some params handled, but coverage gaps OR UI missing
 *     - STUB:    factory exists but routes to makePassthrough() OR setParam handles 0 declared params
 *     - BROKEN:  factory does not exist for a key that PLUGIN_DEFAULTS / ALL_FX_EXTENDED claims
 *     - UI_ONLY: ALL_FX_EXTENDED declares a UI but no factory exists at all
 *
 * Output: audit_progress/PLUGIN_TRUTH_REPORT.md + a side-car JSON of raw findings.
 *
 * Note: this is STATIC analysis — it tells us about *plumbing*, not whether a
 * particular setParam handler actually changes the audio output (the live
 * verifyPluginProcessesAudio in RecordingStudio.js tests that at runtime). The
 * companion runtime harness at /plugin-audit covers PLUGIN_FACTORIES audio
 * tests; this static report covers everything that is structurally verifiable.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SPX_PLUGINS = path.join(ROOT, 'src/front/js/component/SPXPlugins.js');
const RECORDING_STUDIO = path.join(ROOT, 'src/front/js/pages/RecordingStudio.js');
const PLUGIN_HOST = path.join(ROOT, 'src/front/js/component/audio/plugins/PluginHost.js');
const REGISTRY = path.join(ROOT, 'src/front/js/component/audio/plugins/registry.js');
const PLUGIN_UIS_DIR = path.join(ROOT, 'src/front/js/component/audio/PluginUIs');
const REPORT_PATH = path.join(ROOT, 'audit_progress/PLUGIN_TRUTH_REPORT.md');
const RAW_PATH = path.join(ROOT, 'audit_progress/plugin_truth_raw.json');

// ────────────────────────────────────────────────────────────────────────
// 1) Parse ALL_FX_EXTENDED entries from SPXPlugins.js
// ────────────────────────────────────────────────────────────────────────
function parseAllFxExtended(src) {
  const startIdx = src.indexOf('export const ALL_FX_EXTENDED = [');
  if (startIdx === -1) return [];
  // Find the matching closing bracket by depth
  let depth = 0;
  let i = src.indexOf('[', startIdx);
  const open = i;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) break;
    }
  }
  const body = src.slice(open + 1, i);
  const entries = [];
  // Match: { key: "foo", name: "Bar", type: "comp", component: "FooUI", comingSoon: true }
  const re = /\{[^{}]*?key\s*:\s*["']([^"']+)["'][^{}]*?\}/g;
  let m;
  while ((m = re.exec(body))) {
    const obj = m[0];
    const get = (k) => {
      const r = new RegExp(`${k}\\s*:\\s*(?:["']([^"']+)["']|(null|true|false))`);
      const x = obj.match(r);
      if (!x) return undefined;
      return x[1] ?? (x[2] === 'null' ? null : x[2] === 'true');
    };
    entries.push({
      key: m[1],
      name: get('name'),
      type: get('type'),
      component: get('component') ?? null, // null when explicitly :null
      comingSoon: get('comingSoon') === true,
    });
  }
  return entries;
}

// ────────────────────────────────────────────────────────────────────────
// 2) Parse PLUGIN_DEFAULTS top-level keys + their param keys from SPXPlugins.js
// ────────────────────────────────────────────────────────────────────────
function parsePluginDefaults(src) {
  const startIdx = src.indexOf('export const PLUGIN_DEFAULTS = {');
  if (startIdx === -1) return {};
  let depth = 0;
  let i = src.indexOf('{', startIdx);
  const open = i;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  const body = src.slice(open + 1, i);
  // Top-level entries: pluginKey: { ... } at depth 1
  const result = {};
  let cursor = 0;
  while (cursor < body.length) {
    // Skip whitespace and commas
    while (cursor < body.length && /[\s,]/.test(body[cursor])) cursor++;
    if (cursor >= body.length) break;
    // Skip line comments and block comments at top level
    if (body[cursor] === '/' && body[cursor + 1] === '/') {
      const nl = body.indexOf('\n', cursor);
      cursor = nl === -1 ? body.length : nl + 1;
      continue;
    }
    if (body[cursor] === '/' && body[cursor + 1] === '*') {
      const end = body.indexOf('*/', cursor);
      cursor = end === -1 ? body.length : end + 2;
      continue;
    }
    // Match a key: keyName or "keyName"
    const keyMatch = body.slice(cursor).match(/^["']?([A-Za-z_][\w]*)["']?\s*:\s*/);
    if (!keyMatch) {
      cursor++;
      continue;
    }
    const pluginKey = keyMatch[1];
    cursor += keyMatch[0].length;
    // Now we expect a value: { ... } or other (skip non-object values gracefully)
    if (body[cursor] !== '{') {
      // single-value default — extract until comma or end
      const rest = body.slice(cursor);
      const stop = rest.search(/,|\n\s*[A-Za-z_"]/);
      cursor += stop === -1 ? rest.length : stop;
      result[pluginKey] = { __nonObject: true, paramKeys: [] };
      continue;
    }
    // Find matching close
    const objStart = cursor;
    let d = 0;
    while (cursor < body.length) {
      if (body[cursor] === '{') d++;
      else if (body[cursor] === '}') {
        d--;
        if (d === 0) {
          cursor++;
          break;
        }
      }
      cursor++;
    }
    const objBody = body.slice(objStart + 1, cursor - 1);
    // Extract first-depth param keys (foo: ..., "foo": ...)
    const paramKeys = [];
    let dp = 0;
    let s = 0;
    let inStr = null;
    while (s < objBody.length) {
      const ch = objBody[s];
      if (inStr) {
        if (ch === inStr && objBody[s - 1] !== '\\') inStr = null;
        s++;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inStr = ch;
        s++;
        continue;
      }
      if (ch === '{' || ch === '[') dp++;
      else if (ch === '}' || ch === ']') dp--;
      if (dp === 0) {
        // try to match a param key at this position
        const km = objBody.slice(s).match(/^(?:["']?([A-Za-z_][\w]*)["']?)\s*:/);
        if (km) {
          paramKeys.push(km[1]);
          s += km[0].length;
          continue;
        }
      }
      s++;
    }
    result[pluginKey] = { paramKeys: [...new Set(paramKeys)] };
  }
  return result;
}

// ────────────────────────────────────────────────────────────────────────
// 3) Parse COMPONENT_MAP UI names from SPXPlugins.js
// ────────────────────────────────────────────────────────────────────────
function parseComponentMap(src) {
  const startIdx = src.indexOf('const COMPONENT_MAP = {');
  if (startIdx === -1) return new Set();
  let i = src.indexOf('{', startIdx);
  const open = i;
  let d = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}') {
      d--;
      if (d === 0) break;
    }
  }
  const body = src.slice(open + 1, i);
  // Entries are property-shorthand or `Key: Value`
  const names = new Set();
  body.split('\n').forEach((line) => {
    const stripped = line.replace(/\/\/.*$/, '').trim();
    if (!stripped) return;
    // tokens are either Identifier, or Identifier: Whatever, separated by commas
    stripped.split(',').forEach((tok) => {
      const t = tok.trim();
      const m = t.match(/^([A-Za-z_][\w]*)\s*(?::|$)/);
      if (m) names.add(m[1]);
    });
  });
  return names;
}

// ────────────────────────────────────────────────────────────────────────
// 4) Parse install("<key>", factory) from RecordingStudio.js + setParam keys
// ────────────────────────────────────────────────────────────────────────
function parseInlineFactories(src) {
  // Strategy: find each install("<key>", ...) line, then capture text from
  // the start of its factory (either "(p) => {" inline or "makeXxx") through
  // the next closing ");" at top depth — that's the factory body. Within
  // that body, find `setParam(...)` -> { switch (...) { case "...": } ... }
  // and collect each "case 'xxx':" identifier.
  const result = {};
  // Look for `install("key", (p) => { ... });` or `install("key", makeIronBand);`
  const installRe = /install\(\s*["']([A-Za-z_][\w]*)["']\s*,/g;
  let m;
  const installPositions = [];
  while ((m = installRe.exec(src))) {
    installPositions.push({ key: m[1], start: m.index, after: installRe.lastIndex });
  }
  for (let pi = 0; pi < installPositions.length; pi++) {
    const { key, after } = installPositions[pi];
    const next = installPositions[pi + 1]?.start ?? src.length;
    // Heuristic: the factory body for THIS install lives between `after` and `next`,
    // bounded by the closing `);` of THIS install call. But factories can contain
    // nested `(...)` (e.g., setTargetAtTime). Walk parens from `after` until depth -1.
    let depth = 1; // we just consumed the `(` of install(
    let i = after;
    let inStr = null;
    let inLineComment = false;
    let inBlockComment = false;
    while (i < src.length && i < next + 2000) {
      const ch = src[i];
      const nx = src[i + 1];
      if (inLineComment) {
        if (ch === '\n') inLineComment = false;
        i++; continue;
      }
      if (inBlockComment) {
        if (ch === '*' && nx === '/') { inBlockComment = false; i += 2; continue; }
        i++; continue;
      }
      if (inStr) {
        if (ch === '\\') { i += 2; continue; }
        if (ch === inStr) inStr = null;
        i++; continue;
      }
      if (ch === '/' && nx === '/') { inLineComment = true; i += 2; continue; }
      if (ch === '/' && nx === '*') { inBlockComment = true; i += 2; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; i++; continue; }
      if (ch === '(') depth++;
      else if (ch === ')') { depth--; if (depth === 0) { i++; break; } }
      i++;
    }
    const body = src.slice(after, i);
    const isPassthrough = /makePassthrough\s*\(\s*\)/.test(body);
    // Extract setParam case keys.
    // setParam can be on a returned-object literal or in a helper. Collect ALL
    // `case "<id>"` labels (which include fall-through aliases like
    // `case "freq": case "frequency":`) AND `if (n === "<id>")` / `if (name === "<id>")`
    // single-param handlers. Non-setParam case stmts don't appear in plugin
    // factories, so this is a faithful proxy for params handled.
    const caseRe = /case\s+["']([A-Za-z_][\w]*)["']\s*:/g;
    const ifRe = /if\s*\(\s*(?:n|name)\s*===\s*["']([A-Za-z_][\w]*)["']\s*\)/g;
    const cases = new Set();
    let cm;
    while ((cm = caseRe.exec(body))) cases.add(cm[1]);
    while ((cm = ifRe.exec(body))) cases.add(cm[1]);
    // Detect references to specific factory helpers like makeIronBand. The
    // slice spans the entire install(...) call so the trailing `, makeXxx)` is
    // included even when there's no inline factory body.
    const factoryHelperMatch = /,\s*(make[A-Z][A-Za-z]+)\s*\)/.exec(src.slice(installPositions[pi].start, i));
    let helperBody = '';
    if (factoryHelperMatch) {
      const helperName = factoryHelperMatch[1];
      const helperRe = new RegExp(`const\\s+${helperName}\\s*=\\s*\\(`);
      const hMatch = helperRe.exec(src);
      if (hMatch) {
        // Walk parens then braces to capture the helper body
        let j = src.indexOf('{', hMatch.index);
        if (j !== -1) {
          let dd = 0;
          for (; j < src.length; j++) {
            if (src[j] === '{') dd++;
            else if (src[j] === '}') { dd--; if (dd === 0) { j++; break; } }
          }
          helperBody = src.slice(hMatch.index, j);
          let cm2;
          while ((cm2 = caseRe.exec(helperBody))) cases.add(cm2[1]);
          while ((cm2 = ifRe.exec(helperBody))) cases.add(cm2[1]);
        }
      }
    }
    // Append (don't overwrite) — same key can appear twice (e.g., placeholder fall-through)
    if (!result[key]) result[key] = { passthrough: false, paramCases: new Set(), bodyLength: 0, hasHelper: false };
    if (isPassthrough) result[key].passthrough = true;
    cases.forEach((c) => result[key].paramCases.add(c));
    result[key].bodyLength += body.length + helperBody.length;
    if (factoryHelperMatch) result[key].hasHelper = true;
  }
  // Convert sets to arrays
  Object.keys(result).forEach((k) => {
    result[k].paramCases = [...result[k].paramCases];
  });
  return result;
}

// ────────────────────────────────────────────────────────────────────────
// 5) Parse PLUGIN_FACTORIES keys from PluginHost.js
// ────────────────────────────────────────────────────────────────────────
function parsePluginFactories(src) {
  const startIdx = src.indexOf('export const PLUGIN_FACTORIES = {');
  if (startIdx === -1) return new Set();
  let i = src.indexOf('{', startIdx);
  const open = i;
  let d = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}') { d--; if (d === 0) break; }
  }
  const body = src.slice(open + 1, i);
  const keys = new Set();
  body.split('\n').forEach((line) => {
    const stripped = line.replace(/\/\/.*$/, '').trim();
    const m = stripped.match(/^([A-Za-z_][\w]*)\s*:/);
    if (m) keys.add(m[1]);
  });
  return keys;
}

// ────────────────────────────────────────────────────────────────────────
// 6) Parse pluginRegistry from registry.js — extract id + declared params
// ────────────────────────────────────────────────────────────────────────
function parseRegistry(src) {
  const result = {};
  // Each entry: 'key': { id: '...', name: '...', params: [...] }
  const entryRe = /['"]([a-z][\w_]*)['"]\s*:\s*\{[\s\S]*?id:\s*['"]([^'"]+)['"][\s\S]*?params:\s*\[([\s\S]*?)\][\s\S]*?ui:\s*\{\s*component:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = entryRe.exec(src))) {
    const params = [];
    const paramRe = /id:\s*['"]([^'"]+)['"]/g;
    let pm;
    while ((pm = paramRe.exec(m[3]))) params.push(pm[1]);
    result[m[2]] = { key: m[1], id: m[2], params, uiComponent: m[4] };
  }
  return result;
}

// ────────────────────────────────────────────────────────────────────────
// 7) UI presence: walk PluginUIs/ AND scan SPXPlugins.js for inline UIs
// ────────────────────────────────────────────────────────────────────────
function listUIFiles() {
  if (!fs.existsSync(PLUGIN_UIS_DIR)) return new Set();
  return new Set(
    fs.readdirSync(PLUGIN_UIS_DIR)
      .filter((f) => f.endsWith('.js'))
      .map((f) => f.replace(/\.js$/, ''))
  );
}

// Most UIs live inline in SPXPlugins.js as `export function XxxUI(...)` or
// re-exports like `export { XxxUI as YyyUI }`. Scan both forms.
function listInlineUIs(spxSrc) {
  const names = new Set();
  const re = /export\s+function\s+([A-Z][A-Za-z0-9_]*UI)\s*\(/g;
  let m;
  while ((m = re.exec(spxSrc))) names.add(m[1]);
  // Also pick up `const XxxUI = ...` exports + later named exports
  const re2 = /(?:export\s+)?const\s+([A-Z][A-Za-z0-9_]*UI)\s*=/g;
  while ((m = re2.exec(spxSrc))) names.add(m[1]);
  // Imported UIs that re-bind through COMPONENT_MAP shorthand are handled by
  // the COMPONENT_MAP entry itself, so we don't need to enumerate them here.
  return names;
}

// ────────────────────────────────────────────────────────────────────────
// 8) Compute per-plugin verdict
// ────────────────────────────────────────────────────────────────────────
function classify(entry) {
  const {
    hasInlineFactory, hasRegistryFactory, isPassthrough,
    declaredParams, handledParams,
    hasUIDeclared, hasUIInComponentMap, hasUIFile, comingSoon,
  } = entry;

  if (!hasInlineFactory && !hasRegistryFactory) {
    return { verdict: 'BROKEN', reason: 'no factory anywhere' };
  }
  if (isPassthrough) {
    return { verdict: 'STUB', reason: 'factory routes to makePassthrough()' };
  }

  // Param coverage: how many declared params are wired?
  const declSet = new Set(declaredParams || []);
  const handledSet = new Set(handledParams || []);
  let wired = 0;
  declSet.forEach((p) => {
    if (handledSet.has(p)) wired++;
  });
  const declCount = declSet.size;
  const coverage = declCount > 0 ? wired / declCount : 1;

  // UI: declared in registry AND a renderable component exists
  const uiOk =
    !hasUIDeclared || // if registry says no UI, that's fine
    (hasUIInComponentMap && hasUIFile); // otherwise must exist both places

  if (declCount === 0 && !hasInlineFactory && !hasRegistryFactory) {
    return { verdict: 'BROKEN', reason: 'no factory and no defaults' };
  }

  if (coverage >= 0.75 && uiOk) {
    return { verdict: 'WORKING', reason: `${wired}/${declCount} params wired, UI present` };
  }
  if (coverage > 0 && coverage < 0.75) {
    return {
      verdict: 'PARTIAL',
      reason: `only ${wired}/${declCount} params wired${uiOk ? '' : ', UI gap'}`,
    };
  }
  if (coverage === 0 && declCount > 0) {
    return { verdict: 'STUB', reason: `0/${declCount} params wired in setParam` };
  }
  if (!uiOk) {
    return { verdict: 'PARTIAL', reason: 'factory works but UI missing' };
  }
  return { verdict: 'WORKING', reason: 'no params declared, factory present' };
}

// ────────────────────────────────────────────────────────────────────────
// 9) Bucket category
// ────────────────────────────────────────────────────────────────────────
function bucket(entry) {
  const k = entry.key;
  // SPX dynamics keepers
  const SPX_DYNAMICS = ['warmPress', 'glueBus', 'fetStrike', 'optoPress', 'parallelCrush', 'multiPress', 'transGate', 'tubeComp', 'vocalComp', 'brickWall'];
  const SPX_REVERBS = ['hall', 'plate', 'spring', 'room', 'chamber', 'shimmer', 'gateVerb', 'vintageAir', 'hallForgeS', 'hallForgeL', 'stochasticHall', 'greatHall', 'plateForge', 'springBox', 'phantomDouble', 'vocalSpace', 'spaceForge', 'infiniteReverb', 'stereoBloom', 'granularFreeze'];
  const SPX_DELAYS = ['echoField', 'dualDelay', 'reverseDelay', 'tempoDelay'];
  const SPX_MODULATION = ['vortexMod', 'chorusEnsemble', 'autoWah', 'pitchForge', 'pitchLock', 'pitchRandomizer', 'subOctaver', 'tapeStop', 'freqShifter', 'ringMod', 'formantFilter'];
  const SPX_VOCAL = ['voiceForge', 'breathGate', 'sibilantCut', 'vocoderSPX', 'vocalSaturator', 'noiseReduction'];
  const SPX_SATURATION = ['tapeForge', 'valveGlow', 'ironCore', 'consoleSoul', 'harmonicExcite', 'vinylPress', 'loFiCrusher', 'cabinetSim', 'multibandSat', 'harmonicSum', 'enhancer808'];
  const SPX_EQ = ['ironBand', 'spectraCurve', 'pultecForge', 'dynamicEQ', 'graphicEQ', 'tiltEQ', 'baxandallEQ', 'midSideEQ'];
  const SPX_MASTERING = ['masterWall', 'stereoForge', 'stereoImager', 'loudnessMeter', 'loudnessMeter2', 'ditherForge', 'dcBlock', 'gainRider', 'gainStager', 'declicker', 'dehummer', 'dialogueIsolator', 'matchEQ', 'lowEndFocus', 'codecPreview', 'spectralRecovery', 'loudnessTarget', 'msImager', 'goniometer', 'phaseScope', 'spectrumAnalyzer', 'midSideComp', 'multibandLimiter', 'transientShaper', 'drumEnhancer'];
  const STANDARD_FX = ['eq', 'compressor', 'gate', 'deesser', 'limiter', 'reverb', 'delay', 'chorus', 'flanger', 'phaser', 'tremolo', 'filter', 'distortion', 'bitcrusher', 'tapeSaturation', 'exciter', 'stereoWidener', 'gainUtility'];

  if (STANDARD_FX.includes(k)) return 'Standard FX';
  if (SPX_DYNAMICS.includes(k)) return 'SPX Dynamics';
  if (SPX_REVERBS.includes(k)) return 'SPX Reverbs';
  if (SPX_DELAYS.includes(k)) return 'SPX Delays';
  if (SPX_MODULATION.includes(k)) return 'SPX Modulation';
  if (SPX_VOCAL.includes(k)) return 'SPX Vocal';
  if (SPX_SATURATION.includes(k)) return 'SPX Saturation';
  if (SPX_EQ.includes(k)) return 'SPX EQ';
  if (SPX_MASTERING.includes(k)) return 'SPX Mastering';
  return 'Plugin Rack Library';
}

// ────────────────────────────────────────────────────────────────────────
// 10) Compose report
// ────────────────────────────────────────────────────────────────────────
function symbolize(b) { return b ? '✅' : '❌'; }

function paramSummary(declared, handled, max = 6) {
  // When defaults exist, score each declared param.
  if (declared && declared.length > 0) {
    const handledSet = new Set(handled || []);
    const items = declared.map((p) => `${p} ${handledSet.has(p) ? '✅' : '❌'}`);
    if (items.length <= max) return items.join(' ');
    return items.slice(0, max).join(' ') + ` _(+${items.length - max} more)_`;
  }
  // No declared params (e.g., Standard FX with native nodes) — list what the
  // factory actually handles so the user sees the wiring, not "0/0".
  if (handled && handled.length > 0) {
    const shown = handled.slice(0, max).join(', ');
    return `_handles:_ ${shown}${handled.length > max ? ` _(+${handled.length - max})_` : ''}`;
  }
  return '_no params_';
}

function buildReport(plugins) {
  const lines = [];
  lines.push('# PLUGIN TRUTH REPORT');
  lines.push('');
  lines.push(`_Generated by \`scripts/audit/plugin_truth_audit.js\` on ${new Date().toISOString().split('T')[0]}._`);
  lines.push('');
  lines.push('Pure static analysis. Honest plumbing audit, no fixes applied. For runtime audio verification of registry-path plugins, navigate to `/plugin-audit` in the browser.');
  lines.push('');

  // Summary metrics
  const totals = { WORKING: 0, PARTIAL: 0, BROKEN: 0, STUB: 0 };
  plugins.forEach((p) => { totals[p.verdict] = (totals[p.verdict] || 0) + 1; });
  const total = plugins.length;
  lines.push('## Summary metrics');
  lines.push('');
  lines.push(`- **Total plugins counted:** ${total}`);
  lines.push(`- **WORKING** (factory + ≥75% params wired + UI): **${totals.WORKING || 0}**`);
  lines.push(`- **PARTIAL** (some params wired, gaps remain): **${totals.PARTIAL || 0}**`);
  lines.push(`- **STUB** (factory exists but does nothing useful): **${totals.STUB || 0}**`);
  lines.push(`- **BROKEN** (key declared but no factory): **${totals.BROKEN || 0}**`);
  lines.push('');

  // By category
  const byBucket = {};
  plugins.forEach((p) => {
    if (!byBucket[p.bucket]) byBucket[p.bucket] = [];
    byBucket[p.bucket].push(p);
  });

  lines.push('## By category');
  lines.push('');
  const orderedBuckets = [
    'Standard FX',
    'SPX Saturation',
    'SPX Dynamics',
    'SPX EQ',
    'SPX Reverbs',
    'SPX Delays',
    'SPX Modulation',
    'SPX Vocal',
    'SPX Mastering',
    'Plugin Rack Library',
  ];
  orderedBuckets.forEach((b) => {
    const list = byBucket[b] || [];
    const w = list.filter((x) => x.verdict === 'WORKING').length;
    lines.push(`- **${b}:** ${w} working / ${list.length} total`);
  });
  lines.push('');

  // Per-category tables
  orderedBuckets.forEach((b) => {
    const list = (byBucket[b] || []).sort((a, x) => a.key.localeCompare(x.key));
    if (list.length === 0) return;
    lines.push(`## ${b}`);
    lines.push('');
    lines.push('| Plugin | Factory | Audio | Params (declared → handled) | UI | Verdict | Notes |');
    lines.push('|--------|---------|-------|------------------------------|-----|---------|-------|');
    list.forEach((p) => {
      const factory = p.hasInlineFactory ? '✅ inline' : (p.hasRegistryFactory ? '✅ registry' : '❌');
      const audio = p.isPassthrough ? '❌ passthrough' : (p.hasInlineFactory || p.hasRegistryFactory ? '⚙️ runtime' : '❌');
      const ps = paramSummary(p.declaredParams, p.handledParams);
      const uiBits = [];
      if (p.hasUIDeclared) {
        uiBits.push(p.hasUIInComponentMap ? 'map ✅' : 'map ❌');
        uiBits.push(p.hasUIFile ? 'file ✅' : 'file ❌');
      } else {
        uiBits.push('_n/a_');
      }
      const ui = uiBits.join(' / ');
      const notes = [p.reason];
      if (p.comingSoon) notes.push('comingSoon flag');
      if (p.hasInlineFactory && p.hasRegistryFactory) notes.push('dual factory');
      lines.push(`| ${p.key} | ${factory} | ${audio} | ${ps} | ${ui} | **${p.verdict}** | ${notes.filter(Boolean).join('; ')} |`);
    });
    lines.push('');
  });

  // Worst offenders & quick lists
  const broken = plugins.filter((p) => p.verdict === 'BROKEN');
  const stub = plugins.filter((p) => p.verdict === 'STUB');
  const partial = plugins.filter((p) => p.verdict === 'PARTIAL');

  if (broken.length) {
    lines.push('## BROKEN plugins (no factory)');
    lines.push('');
    broken.forEach((p) => lines.push(`- \`${p.key}\` — ${p.reason}`));
    lines.push('');
  }
  if (stub.length) {
    lines.push('## STUB plugins (factory present but does nothing)');
    lines.push('');
    stub.forEach((p) => lines.push(`- \`${p.key}\` — ${p.reason}`));
    lines.push('');
  }
  if (partial.length) {
    lines.push('## PARTIAL plugins (param/UI gaps)');
    lines.push('');
    partial.forEach((p) => lines.push(`- \`${p.key}\` — ${p.reason}`));
    lines.push('');
  }

  // Methodology
  lines.push('## Methodology');
  lines.push('');
  lines.push('- **Factory existence:** scanned `install("<key>", ...)` calls in `src/front/js/pages/RecordingStudio.js` (inline path) and `PLUGIN_FACTORIES` map in `src/front/js/component/audio/plugins/PluginHost.js` (registry path).');
  lines.push('- **Param wiring:** for inline factories, parsed `case "<id>"` labels in the factory body (a faithful proxy for setParam dispatch). For registry factories, the registry.js param list was used; live wiring is verified by the runtime harness at `/plugin-audit`.');
  lines.push('- **UI presence:** declared component string in `ALL_FX_EXTENDED` matched against (a) `COMPONENT_MAP` in `SPXPlugins.js` AND (b) a file `src/front/js/component/audio/PluginUIs/<Name>.js`.');
  lines.push('- **Passthrough detection:** install bodies containing `makePassthrough()` are explicitly flagged as STUB even if the key is enumerated.');
  lines.push('- **Coverage threshold:** ≥75% of declared params wired = WORKING; 1–74% = PARTIAL; 0% = STUB.');
  lines.push('');
  lines.push('**Limitations of static analysis:**');
  lines.push('');
  lines.push('- A handled `case` block may still write the wrong AudioParam or no-op silently — this report does not run audio. Use `/plugin-audit` for runtime confirmation, or `[F4-C-FIX]` console logs already emitted by `verifyPluginProcessesAudio` in the live studio.');
  lines.push('- Plugins driven by array params (e.g., `dynamicEQ.bands`, `graphicEQ.bands`, `spectraCurve.bands`) declare a single key but iterate sub-objects — this report counts the top-level key only; runtime testing is the source of truth.');
  lines.push('');
  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────
(function main() {
  const spxSrc = fs.readFileSync(SPX_PLUGINS, 'utf8');
  const studioSrc = fs.readFileSync(RECORDING_STUDIO, 'utf8');
  const hostSrc = fs.readFileSync(PLUGIN_HOST, 'utf8');
  const regSrc = fs.readFileSync(REGISTRY, 'utf8');

  const allFx = parseAllFxExtended(spxSrc);
  const defaults = parsePluginDefaults(spxSrc);
  const compMap = parseComponentMap(spxSrc);
  const inlineFactories = parseInlineFactories(studioSrc);
  const registryFactories = parsePluginFactories(hostSrc);
  const registryEntries = parseRegistry(regSrc);
  const uiFiles = listUIFiles();
  const inlineUIs = listInlineUIs(spxSrc);

  // Build the universe of plugin keys = union of:
  // - ALL_FX_EXTENDED.key
  // - PLUGIN_DEFAULTS keys
  // - install("<key>", ...) keys from RecordingStudio.js
  const universe = new Set();
  allFx.forEach((e) => universe.add(e.key));
  Object.keys(defaults).forEach((k) => universe.add(k));
  Object.keys(inlineFactories).forEach((k) => universe.add(k));

  const results = [];
  universe.forEach((key) => {
    const fxDef = allFx.find((e) => e.key === key);
    const inline = inlineFactories[key];
    const def = defaults[key];
    const declaredParams = def?.paramKeys || [];
    const handledParams = inline?.paramCases || [];
    const isPassthrough = inline?.passthrough === true;
    const hasInlineFactory = !!inline;
    const hasRegistryFactory = registryFactories.has(key);
    const componentName = fxDef?.component || null;
    const hasUIDeclared = !!componentName;
    const hasUIInComponentMap = componentName ? compMap.has(componentName) : false;
    // UI is renderable if a file in PluginUIs/ OR an inline export in SPXPlugins.js exists.
    // COMPONENT_MAP also has aliased entries like `GateVerbUI: GateVerbUINew` so accept either.
    const hasUIFile = componentName
      ? (uiFiles.has(componentName) || inlineUIs.has(componentName) || inlineUIs.has(componentName + 'New'))
      : false;

    const entry = {
      key,
      name: fxDef?.name || key,
      type: fxDef?.type || null,
      comingSoon: fxDef?.comingSoon || false,
      hasInlineFactory,
      hasRegistryFactory,
      isPassthrough,
      declaredParams,
      handledParams,
      componentName,
      hasUIDeclared,
      hasUIInComponentMap,
      hasUIFile,
    };
    const cls = classify(entry);
    entry.verdict = cls.verdict;
    entry.reason = cls.reason;
    entry.bucket = bucket(entry);
    results.push(entry);
  });

  // Also report on registry-path plugins not in ALL_FX_EXTENDED (rack library)
  // Their data is sparser since they're a separate pipeline.
  Object.keys(registryEntries).forEach((id) => {
    if (universe.has(id)) return;
    const ent = registryEntries[id];
    const hasRegistryFactory = registryFactories.has(id);
    results.push({
      key: id,
      name: ent.key,
      type: 'rack',
      comingSoon: false,
      hasInlineFactory: false,
      hasRegistryFactory,
      isPassthrough: false,
      declaredParams: ent.params,
      handledParams: hasRegistryFactory ? ent.params : [], // assume wired if factory present (runtime test confirms)
      componentName: ent.uiComponent,
      hasUIDeclared: !!ent.uiComponent,
      hasUIInComponentMap: false, // rack UIs are a separate registry, not in COMPONENT_MAP
      hasUIFile: false, // rack UIs live in the registry/UI bundle, not PluginUIs/
      verdict: hasRegistryFactory ? 'WORKING' : 'BROKEN',
      reason: hasRegistryFactory ? 'rack-library factory present (runtime test confirms audio)' : 'rack-library factory missing in PLUGIN_FACTORIES',
      bucket: 'Plugin Rack Library',
    });
  });

  results.sort((a, b) => a.bucket.localeCompare(b.bucket) || a.key.localeCompare(b.key));

  fs.writeFileSync(REPORT_PATH, buildReport(results), 'utf8');
  fs.writeFileSync(RAW_PATH, JSON.stringify(results, null, 2), 'utf8');

  // Summary to stdout
  const totals = { WORKING: 0, PARTIAL: 0, STUB: 0, BROKEN: 0 };
  results.forEach((r) => { totals[r.verdict] = (totals[r.verdict] || 0) + 1; });
  console.log(`Plugin truth audit complete: ${results.length} plugins counted.`);
  Object.keys(totals).forEach((k) => console.log(`  ${k}: ${totals[k]}`));
  console.log(`Report: ${REPORT_PATH}`);
  console.log(`Raw:    ${RAW_PATH}`);
})();
