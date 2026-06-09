// =============================================================================
// pluginPresets.js — preset CRUD + factory presets + factory defaults.
// =============================================================================
// User presets live in localStorage under `spx-presets-<pluginKey>-<name>` and
// survive across sessions. Factory presets are hard-coded below — they appear
// at the top of every plugin's preset dropdown, can be loaded/applied but
// never deleted, and are the same on every device. The pluginKey matches the
// key buildFxChain in RecordingStudio.js dispatches on (eg. "spectraCurve",
// "warmPress", "eq"), so a preset saved on one track loads on every other one
// of the same plugin.
//
// Schema-versioned via `_v`: load() rejects presets whose _v !== PRESET_VERSION
// to avoid silently mis-applying old data when a plugin's param shape changes
// (eg. the ironBand bands array). Bump PRESET_VERSION on any incompatible
// change to a plugin's params.
//
// `enabled` is intentionally NOT stored — presets carry tone, never bypass.
// Loading a preset on a disabled plugin does NOT auto-enable it; the user
// has to toggle the plugin on to hear the loaded preset.
// =============================================================================

const PREFIX = "spx-presets-";
const PRESET_VERSION = 1;

const safeStorage = () => {
  try { return typeof localStorage !== "undefined" ? localStorage : null; }
  catch { return null; }
};

// ── User preset CRUD ───────────────────────────────────────────────────────
export const savePreset = (pluginKey, name, params) => {
  const ls = safeStorage(); if (!ls || !pluginKey || !name) return false;
  try {
    const blob = { _v: PRESET_VERSION, _saved: Date.now(), params: { ...params } };
    delete blob.params.enabled;
    ls.setItem(`${PREFIX}${pluginKey}-${name}`, JSON.stringify(blob));
    return true;
  } catch (e) { console.warn("[presets] save failed:", e); return false; }
};

export const loadUserPreset = (pluginKey, name) => {
  const ls = safeStorage(); if (!ls || !pluginKey || !name) return null;
  try {
    const raw = ls.getItem(`${PREFIX}${pluginKey}-${name}`);
    if (!raw) return null;
    const blob = JSON.parse(raw);
    if (blob?._v !== PRESET_VERSION) return null;
    return blob.params || null;
  } catch (e) { console.warn("[presets] load failed:", e); return null; }
};

export const deletePreset = (pluginKey, name) => {
  const ls = safeStorage(); if (!ls || !pluginKey || !name) return false;
  try { ls.removeItem(`${PREFIX}${pluginKey}-${name}`); return true; }
  catch { return false; }
};

export const listUserPresets = (pluginKey) => {
  const ls = safeStorage(); if (!ls || !pluginKey) return [];
  const out = []; const pfx = `${PREFIX}${pluginKey}-`;
  try {
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.startsWith(pfx)) out.push(k.slice(pfx.length));
    }
  } catch (e) { console.warn("[presets] list failed:", e); }
  return out.sort();
};

// ── Sanitization ───────────────────────────────────────────────────────────
// Strip characters that would break the localStorage key format. Permits
// letters, digits, spaces, dashes, dots, parens, and a few punctuation marks.
// Trim + collapse whitespace + cap length so the dropdown stays tidy.
export const sanitizePresetName = (name) => {
  if (!name) return "";
  return String(name)
    .replace(/[^\w\s\-.()&'+!]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48);
};

// ── Factory presets ────────────────────────────────────────────────────────
// Each entry: { name, params }. Param shape MUST match what buildFxChain in
// RecordingStudio.js reads (e.g. native EQ uses lowGain/midGain/midFreq/
// highGain; warmPress uses threshold/ratio/attack/release; etc.). Values were
// chosen by ear from common production starting points — these are not
// random, they're meant to be useful.
//
// Plugins NOT in this registry simply have no factory presets — they still
// get user presets via the same dropdown, just no FACTORY section. Plugins
// with too-narrow a use case (e.g. dcBlock, ditherForge, loudnessMeter) are
// intentionally omitted.
export const FACTORY_PRESETS = {
  // ── Native effects ────────────────────────────────────────────────────────
  eq: [
    { name: "Vocal Brighten",  params: { lowGain: -1, midGain:  1, midFreq: 3000, highGain:  3 } },
    { name: "Bass Tighten",    params: { lowGain: -3, midGain:  0, midFreq:  800, highGain:  0 } },
    { name: "Telephone",       params: { lowGain:-12, midGain:  6, midFreq: 1500, highGain:-12 } },
    { name: "Mix Bus Polish",  params: { lowGain:  1, midGain:  0, midFreq: 1000, highGain: 1.5 } },
    { name: "Lo-Fi Filter",    params: { lowGain: -6, midGain:  0, midFreq: 1000, highGain: -8 } },
  ],
  compressor: [
    { name: "Vocal Tame",      params: { threshold:-18, ratio: 3,   attack: 0.005, release: 0.15, knee: 12 } },
    { name: "Drum Punch",      params: { threshold:-12, ratio: 4,   attack: 0.001, release: 0.05, knee: 2  } },
    { name: "Glue Bus",        params: { threshold:-10, ratio: 2,   attack: 0.03,  release: 0.3,  knee: 18 } },
    { name: "Mix Bus Gentle",  params: { threshold: -8, ratio: 1.5, attack: 0.05,  release: 0.4,  knee: 24 } },
    { name: "Pumping Sidechain", params: { threshold:-20, ratio: 8, attack: 0.001, release: 0.08, knee: 0 } },
  ],
  reverb: [
    { name: "Vocal Plate",     params: { mix: 0.18, decay: 1.5 } },
    { name: "Drum Room",       params: { mix: 0.12, decay: 0.6 } },
    { name: "Hall",            params: { mix: 0.25, decay: 3.5 } },
    { name: "Slap Echo",       params: { mix: 0.30, decay: 0.3 } },
    { name: "Cathedral",       params: { mix: 0.40, decay: 6.0 } },
  ],
  delay: [
    { name: "1/4 Sync (120BPM)", params: { time: 0.500, feedback: 0.35, mix: 0.25 } },
    { name: "1/8 Triplet",       params: { time: 0.166, feedback: 0.40, mix: 0.20 } },
    { name: "Slap",              params: { time: 0.080, feedback: 0.10, mix: 0.18 } },
    { name: "Dub Echo",          params: { time: 0.375, feedback: 0.65, mix: 0.30 } },
    { name: "Ambient Wash",      params: { time: 0.750, feedback: 0.55, mix: 0.40 } },
  ],
  gate: [
    { name: "Drum Gate",       params: { threshold:-30, attack: 0.001,  release: 0.05 } },
    { name: "Vocal Gate",      params: { threshold:-50, attack: 0.005,  release: 0.10 } },
    { name: "Tight Gate",      params: { threshold:-25, attack: 0.0005, release: 0.02 } },
  ],
  deesser: [
    { name: "Female Vocal",    params: { frequency: 7000, threshold:-18, ratio: 6 } },
    { name: "Male Vocal",      params: { frequency: 6000, threshold:-20, ratio: 5 } },
    { name: "Aggressive Cut",  params: { frequency: 8000, threshold:-12, ratio: 10 } },
  ],
  filter: [
    { name: "Lowpass Sweep",   params: { type: "lowpass",  frequency:  800, Q: 6   } },
    { name: "Highpass Vocal",  params: { type: "highpass", frequency:  100, Q: 0.7 } },
    { name: "Telephone Band",  params: { type: "bandpass", frequency: 1500, Q: 4   } },
    { name: "Hum Notch",       params: { type: "notch",    frequency:   60, Q: 12  } },
  ],
  distortion: [
    { name: "Subtle Saturation", params: { amount: 15 } },
    { name: "Crunch",            params: { amount: 50 } },
    { name: "Fuzz",              params: { amount: 80 } },
  ],
  limiter: [
    { name: "Brick Wall",      params: { threshold:-1,   knee: 0, ratio: 20, attack: 0.001, release: 0.05 } },
    { name: "Soft Limit",      params: { threshold:-3,   knee: 6, ratio: 10, attack: 0.005, release: 0.10 } },
    { name: "Master Limit",    params: { threshold:-0.3, knee: 0, ratio: 20, attack: 0.0005,release: 0.03 } },
  ],
  bitcrusher: [
    { name: "Lo-Fi 8-Bit",     params: { bits: 8, sampleRateReduce: 1 } },
    { name: "Crushed Drums",   params: { bits: 5, sampleRateReduce: 4 } },
    { name: "Vintage Sampler", params: { bits: 12, sampleRateReduce: 2 } },
  ],
  tapeSaturation: [
    { name: "Subtle Warmth",   params: { drive: 0.25, warmth: 0.4 } },
    { name: "Tape Glue",       params: { drive: 0.45, warmth: 0.6 } },
    { name: "Tape Crush",      params: { drive: 0.75, warmth: 0.8 } },
  ],
  // ── SPX plugins (most-used; one-trick plugins skipped) ────────────────────
  spectraCurve: [
    { name: "Vocal Air",       params: { low:  0, lowMid:  0, mid:  1, highMid:  2, high: 3 } },
    { name: "Drum Bus",        params: { low:  1, lowMid:  0, mid: -1, highMid:  1, high: 1 } },
    { name: "Smile Curve",     params: { low:  2, lowMid:  0, mid: -2, highMid:  0, high: 2 } },
    { name: "Mid Scoop",       params: { low:  1, lowMid: -1, mid: -3, highMid: -1, high: 1 } },
  ],
  warmPress: [
    { name: "Vocal Warmth",    params: { threshold:-18, ratio: 3,   attack: 30, release: 150 } },
    { name: "Acoustic Glue",   params: { threshold:-15, ratio: 2.5, attack: 50, release: 200 } },
    { name: "Smooth Bus",      params: { threshold:-12, ratio: 2,   attack: 80, release: 300 } },
  ],
  glueBus: [
    { name: "Mix Glue",        params: { threshold:-10, ratio: 4, attack: 10, release: 100, makeup: 2 } },
    { name: "Drum Bus Glue",   params: { threshold:-12, ratio: 4, attack:  5, release:  60, makeup: 3 } },
    { name: "Master Glue",     params: { threshold: -6, ratio: 2, attack: 30, release: 200, makeup: 1 } },
  ],
  fetStrike: [
    { name: "Vocal FET",       params: { threshold:-15, ratio: 6,  attack: 1, release:  50, makeup: 4 } },
    { name: "Drum Smash",      params: { threshold:-20, ratio: 10, attack: 1, release:  30, makeup: 6 } },
  ],
  hallForgeS: [
    { name: "Vocal Plate",     params: { decay: 1.2, mix: 0.20, preDelay: 0.02 } },
    { name: "Bright Room",     params: { decay: 0.8, mix: 0.15, preDelay: 0.01 } },
    { name: "Drum Plate",      params: { decay: 1.6, mix: 0.25, preDelay: 0.03 } },
  ],
  hallForgeL: [
    { name: "Cathedral",       params: { decay: 4.5, mix: 0.35, preDelay: 0.05 } },
    { name: "Concert Hall",    params: { decay: 2.8, mix: 0.28, preDelay: 0.03 } },
    { name: "Ambient Wash",    params: { decay: 6.0, mix: 0.45, preDelay: 0.08 } },
  ],
  plateForge: [
    { name: "EMT Vocal",       params: { decay: 1.4, mix: 0.22, brightness: 3 } },
    { name: "Bright Plate",    params: { decay: 1.8, mix: 0.30, brightness: 5 } },
  ],
  echoField: [
    { name: "Quarter Sync",    params: { time: 0.500, feedback: 0.40, mix: 0.30 } },
    { name: "Dotted Eighth",   params: { time: 0.375, feedback: 0.50, mix: 0.25 } },
    { name: "Long Tail",       params: { time: 0.750, feedback: 0.65, mix: 0.35 } },
  ],
  dualDelay: [
    { name: "Stereo Wide",     params: { time1: 0.250, time2: 0.375, mix: 0.30 } },
    { name: "Slapback Pair",   params: { time1: 0.080, time2: 0.120, mix: 0.20 } },
  ],
  valveGlow: [
    { name: "Subtle Tube",     params: { warmth: 0.4, drive: 0.3 } },
    { name: "Vocal Saturate",  params: { warmth: 0.6, drive: 0.5 } },
    { name: "Aggressive Tube", params: { warmth: 0.8, drive: 0.8 } },
  ],
  tapeForge: [
    { name: "Tape 1/4-inch",   params: { drive: 0.40, saturation: 0.5, hfLoss: 0.3, bias: 0.5 } },
    { name: "Tape 1/2-inch",   params: { drive: 0.60, saturation: 0.7, hfLoss: 0.5, bias: 0.6 } },
    { name: "Cassette",        params: { drive: 0.30, saturation: 0.4, hfLoss: 0.7, bias: 0.4 } },
  ],
  ironCore: [
    { name: "Punch Trans",     params: { saturation: 0.4, punch: 0.7 } },
    { name: "Iron Drum",       params: { saturation: 0.6, punch: 0.5 } },
  ],
  consoleSoul: [
    { name: "Neve Color",      params: { color: 0.4, air: 0.3 } },
    { name: "SSL Bus",         params: { color: 0.6, air: 0.5 } },
  ],
  brickWall: [
    { name: "Master -0.3",     params: { ceiling: -0.3 } },
    { name: "Master -1.0",     params: { ceiling: -1.0 } },
    { name: "Stream Loud",     params: { ceiling: -1.5 } },
  ],
  vocalSaturator: [
    { name: "Singer Glue",     params: { amount: 0.4, presence: 0.5 } },
    { name: "Rap Edge",        params: { amount: 0.7, presence: 0.7 } },
  ],
};

// ── Factory defaults (Init / Default reset) ───────────────────────────────
// What "Default" should reset to. For native effects this matches the values
// in trackFactory.DEFAULT_EFFECTS so the plugin behaves as if just inserted.
// For SPX plugins these match the `|| <value>` fallbacks in
// RecordingStudio.buildFxChain so audio is identical to a fresh insert.
export const FACTORY_DEFAULTS = {
  eq:             { lowGain: 0, midGain: 0, midFreq: 1000, highGain: 0 },
  compressor:     { threshold:-24, ratio: 4, attack: 0.003, release: 0.25, knee: 30 },
  reverb:         { mix: 0.2, decay: 2.0 },
  delay:          { time: 0.3, feedback: 0.3, mix: 0.2 },
  distortion:     { amount: 0 },
  filter:         { type: "lowpass", frequency: 20000, Q: 1 },
  limiter:        { threshold:-1, knee: 0, ratio: 20, attack: 0.001, release: 0.05 },
  gate:           { threshold:-40, attack: 0.001, release: 0.05 },
  deesser:        { frequency: 6000, threshold:-20, ratio: 8 },
  chorus:         { rate: 1.5, depth: 0.002, mix: 0.3 },
  flanger:        { rate: 0.3, depth: 0.003, feedback: 0.5, mix: 0.3 },
  phaser:         { rate: 0.5, depth: 1000, baseFreq: 1000, Q: 5, stages: 4, mix: 0.3 },
  tremolo:        { rate: 4, depth: 0.5 },
  bitcrusher:     { bits: 8, sampleRateReduce: 1 },
  exciter:        { amount: 30, frequency: 3000, mix: 0.2 },
  tapeSaturation: { drive: 0.3, warmth: 0.5 },
  gainUtility:    { gain: 0, phaseInvert: false, monoSum: false },
  // SPX defaults — match the `|| value` fallbacks in buildFxChain.
  spectraCurve:   { low: 0, lowMid: 0, mid: 0, highMid: 0, high: 0 },
  warmPress:      { threshold:-18, ratio: 3, attack: 30, release: 150 },
  glueBus:        { threshold:-12, ratio: 4, attack: 10, release: 100, makeup: 2 },
  fetStrike:      { threshold:-15, ratio: 6, attack:  1, release:  50, makeup: 4 },
  optoPress:      { threshold:-20, ratio: 3, attack: 50, release: 300 },
  parallelCrush:  { threshold:-30, ratio: 10, mix: 0.5 },
  multiPress:     { lowThreshold:-18, highThreshold:-12 },
  transGate:      { threshold:-40, attack:  1, release: 100 },
  hallForgeS:     { decay: 1.2, mix: 0.25, preDelay: 0.02 },
  hallForgeL:     { decay: 2.5, mix: 0.30, preDelay: 0.04 },
  gateVerb:       { mix: 0.40 },
  vintageAir:     { decay: 1.8, mix: 0.20, air: 3 },
  stochasticHall: { decay: 2.0, mix: 0.25 },
  greatHall:      { decay: 3.5, mix: 0.30 },
  plateForge:     { decay: 1.5, mix: 0.25, brightness: 2 },
  springBox:      { mix: 0.30 },
  echoField:      { time: 0.4, feedback: 0.4, mix: 0.3 },
  dualDelay:      { time1: 0.25, time2: 0.375, mix: 0.25 },
  stereoBloom:    { mix: 0.25, width: 0.5 },
  valveGlow:      { warmth: 0.5, drive: 0.4 },
  tapeForge:      { drive: 0.5, saturation: 0.6, hfLoss: 0.3, bias: 0.5 },
  ironCore:       { saturation: 0.5, punch: 0.5 },
  consoleSoul:    { color: 0.5, air: 0.3 },
  brickWall:      { ceiling: -0.3 },
  masterWall:     { ceiling: -0.1, gain: 0 },
  vocalSaturator: { amount: 0.4, presence: 0.5 },
};

export const getFactoryDefaults = (pluginKey) => FACTORY_DEFAULTS[pluginKey] || null;

export const listFactoryPresets = (pluginKey) => FACTORY_PRESETS[pluginKey] || [];

// ── Unified accessors used by the PresetBar ───────────────────────────────
// listPresets returns { factory: [{name, params}], user: [name] } so the UI
// can render two sections without re-querying. loadPreset transparently
// handles factory and user names — factory names that collide with a user
// preset will hit the factory copy first (factory wins, user can rename).
export const listPresets = (pluginKey) => ({
  factory: listFactoryPresets(pluginKey),
  user: listUserPresets(pluginKey),
});

export const loadPreset = (pluginKey, name) => {
  if (!pluginKey || !name) return null;
  const factory = (FACTORY_PRESETS[pluginKey] || []).find(p => p.name === name);
  if (factory) return { ...factory.params };
  return loadUserPreset(pluginKey, name);
};

export const isFactoryPreset = (pluginKey, name) =>
  !!(FACTORY_PRESETS[pluginKey] || []).find(p => p.name === name);
