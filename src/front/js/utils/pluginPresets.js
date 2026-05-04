// =============================================================================
// pluginPresets.js — localStorage-backed user-preset CRUD for SPX / native FX.
// =============================================================================
// Plugin presets live under `spx-presets-<pluginKey>-<name>`. The pluginKey is
// the same key that buildFxChain in RecordingStudio.js uses (eg. "spectraCurve",
// "warmPress", "eq"), so a preset saved on one track loads on every other one
// of the same plugin. A separate `enabled` field is intentionally NOT stored —
// presets only carry tone, never bypass state.
// Schema version bump: load() will reject presets whose `_v` !== PRESET_VERSION
// to avoid breaking when the param shape changes (eg. ironBand bands array).
// =============================================================================

const PREFIX = "spx-presets-";
const PRESET_VERSION = 1;

const safeStorage = () => {
  try { return typeof localStorage !== "undefined" ? localStorage : null; }
  catch { return null; }
};

export const savePreset = (pluginKey, name, params) => {
  const ls = safeStorage(); if (!ls || !pluginKey || !name) return false;
  try {
    const blob = { _v: PRESET_VERSION, _saved: Date.now(), params: { ...params } };
    delete blob.params.enabled;
    ls.setItem(`${PREFIX}${pluginKey}-${name}`, JSON.stringify(blob));
    return true;
  } catch (e) { console.warn("[presets] save failed:", e); return false; }
};

export const loadPreset = (pluginKey, name) => {
  const ls = safeStorage(); if (!ls || !pluginKey || !name) return null;
  try {
    const raw = ls.getItem(`${PREFIX}${pluginKey}-${name}`);
    if (!raw) return null;
    const blob = JSON.parse(raw);
    if (blob?._v !== PRESET_VERSION) return null;
    return blob.params || null;
  } catch (e) { console.warn("[presets] load failed:", e); return null; }
};

export const listPresets = (pluginKey) => {
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

export const deletePreset = (pluginKey, name) => {
  const ls = safeStorage(); if (!ls || !pluginKey || !name) return false;
  try { ls.removeItem(`${PREFIX}${pluginKey}-${name}`); return true; }
  catch { return false; }
};
