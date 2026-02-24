// =============================================================================
// presetStore.js — Preset Manager for StreamPireX Plugin System
// =============================================================================
// Manages factory presets (from registry) and user presets (localStorage + API).
// CRUD operations: list, save, load, delete, rename.
// =============================================================================

import { getPluginDef } from '../registry';

const STORAGE_KEY = 'spx_plugin_presets';

class PresetStore {
  constructor() {
    this._userPresets = this._loadFromStorage();
    this._listeners = new Set();
  }

  // ── Get all presets for a plugin (factory + user) ──
  getPresets(pluginId) {
    const def = getPluginDef(pluginId);
    const factory = (def?.factoryPresets || []).map((p, i) => ({
      id: `factory_${pluginId}_${i}`,
      pluginId,
      name: p.name,
      params: { ...p.params },
      isFactory: true,
    }));

    const user = (this._userPresets[pluginId] || []).map(p => ({
      ...p,
      isFactory: false,
    }));

    return [...factory, ...user];
  }

  // ── Get factory presets only ──
  getFactoryPresets(pluginId) {
    return this.getPresets(pluginId).filter(p => p.isFactory);
  }

  // ── Get user presets only ──
  getUserPresets(pluginId) {
    return this.getPresets(pluginId).filter(p => !p.isFactory);
  }

  // ── Save a user preset ──
  savePreset(pluginId, name, params) {
    if (!this._userPresets[pluginId]) this._userPresets[pluginId] = [];

    const preset = {
      id: `user_${pluginId}_${Date.now()}`,
      pluginId,
      name,
      params: { ...params },
      createdAt: new Date().toISOString(),
    };

    this._userPresets[pluginId].push(preset);
    this._persist();
    this._notify();
    return preset;
  }

  // ── Update existing user preset ──
  updatePreset(presetId, params) {
    for (const pluginId of Object.keys(this._userPresets)) {
      const presets = this._userPresets[pluginId];
      const idx = presets.findIndex(p => p.id === presetId);
      if (idx >= 0) {
        presets[idx].params = { ...params };
        presets[idx].updatedAt = new Date().toISOString();
        this._persist();
        this._notify();
        return presets[idx];
      }
    }
    return null;
  }

  // ── Rename preset ──
  renamePreset(presetId, newName) {
    for (const pluginId of Object.keys(this._userPresets)) {
      const preset = this._userPresets[pluginId].find(p => p.id === presetId);
      if (preset) {
        preset.name = newName;
        this._persist();
        this._notify();
        return preset;
      }
    }
    return null;
  }

  // ── Delete preset ──
  deletePreset(presetId) {
    for (const pluginId of Object.keys(this._userPresets)) {
      const idx = this._userPresets[pluginId].findIndex(p => p.id === presetId);
      if (idx >= 0) {
        this._userPresets[pluginId].splice(idx, 1);
        this._persist();
        this._notify();
        return true;
      }
    }
    return false;
  }

  // ── Load preset params ──
  loadPreset(presetId) {
    const all = Object.values(this._userPresets).flat();
    return all.find(p => p.id === presetId) || null;
  }

  // ── Import/Export for API sync ──
  exportAll() {
    return JSON.parse(JSON.stringify(this._userPresets));
  }

  importAll(data) {
    this._userPresets = data || {};
    this._persist();
    this._notify();
  }

  // ── Sync with backend API ──
  async syncToServer(token) {
    try {
      const bu = process.env.REACT_APP_BACKEND_URL || '';
      await fetch(`${bu}/api/studio/presets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ presets: this.exportAll() }),
      });
    } catch (e) {
      console.warn('[PresetStore] sync failed:', e);
    }
  }

  async loadFromServer(token) {
    try {
      const bu = process.env.REACT_APP_BACKEND_URL || '';
      const res = await fetch(`${bu}/api/studio/presets`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.presets) this.importAll(data.presets);
    } catch (e) {
      console.warn('[PresetStore] load failed:', e);
    }
  }

  // ── Change listeners ──
  subscribe(cb) {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  _notify() {
    this._listeners.forEach(cb => { try { cb(); } catch (e) {} });
  }

  // ── LocalStorage ──
  _loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  _persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._userPresets));
    } catch (e) {
      console.warn('[PresetStore] localStorage write failed');
    }
  }
}

// Singleton
let _instance = null;
export const getPresetStore = () => {
  if (!_instance) _instance = new PresetStore();
  return _instance;
};

export default PresetStore;