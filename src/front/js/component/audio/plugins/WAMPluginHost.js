// =============================================================================
// WAMPluginHost.js — Web Audio Modules 2.0 Integration for StreamPireX
// =============================================================================
// Extends the existing PluginHost singleton to support WAM 2.0 plugins.
// WAM plugins are WebAssembly-compiled VST-style instruments and effects
// that run natively in the browser — no install required.
//
// INSTALL:
//   Copy to: src/front/js/component/audio/plugins/WAMPluginHost.js
//
// USAGE IN PluginHost.js:
//   import { loadWAMPlugin, destroyWAMPlugin, getWAMHostGroup } from './WAMPluginHost';
//   // Then call loadWAMPlugin() inside addPlugin() when pluginId starts with 'wam:'
//
// WAM 2.0 spec: https://github.com/webaudiomodules/api
// =============================================================================

// ── WAM Host Group (shared across all plugin instances) ──────────────────────
let _wamHostGroupId = null;
let _wamHostGroupKey = null;
let _wamSDKLoaded = false;

const WAM_SDK_URL = 'https://mainline.i3s.unice.fr/wam2/packages/sdk/src/index.js';

/**
 * Load the WAM 2.0 SDK once per session.
 * The SDK provides the WAM host group infrastructure needed for
 * plugin ↔ DAW MIDI and audio communication.
 */
export const initWAMSDK = async (audioContext) => {
  if (_wamSDKLoaded && _wamHostGroupId) return { groupId: _wamHostGroupId, groupKey: _wamHostGroupKey };

  try {
    // Dynamically import WAM SDK
    const { initializeWamHost } = await import(/* webpackIgnore: true */ WAM_SDK_URL);
    const [groupId, groupKey] = await initializeWamHost(audioContext);
    _wamHostGroupId   = groupId;
    _wamHostGroupKey  = groupKey;
    _wamSDKLoaded     = true;
    console.log('[WAMHost] SDK initialized. Group:', groupId);
    return { groupId, groupKey };
  } catch (err) {
    console.error('[WAMHost] Failed to load WAM SDK:', err);
    throw new Error('WAM SDK unavailable. Check your network connection.');
  }
};

export const getWAMHostGroup = () => ({ groupId: _wamHostGroupId, groupKey: _wamHostGroupKey });

// ── WAM Plugin Registry (user-installed plugins) ─────────────────────────────
// Stored in localStorage under 'spx_wam_plugins'
const STORAGE_KEY = 'spx_wam_plugins';

export const getInstalledWAMPlugins = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
};

export const saveInstalledWAMPlugins = (plugins) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins));
};

export const installWAMPlugin = (pluginMeta) => {
  const existing = getInstalledWAMPlugins();
  if (existing.find(p => p.url === pluginMeta.url)) return; // already installed
  existing.push({
    ...pluginMeta,
    installedAt: Date.now(),
  });
  saveInstalledWAMPlugins(existing);
};

export const uninstallWAMPlugin = (url) => {
  const existing = getInstalledWAMPlugins().filter(p => p.url !== url);
  saveInstalledWAMPlugins(existing);
};

// ── Load a WAM plugin instance into the audio graph ──────────────────────────
/**
 * Load and instantiate a WAM plugin.
 * @param {AudioContext} audioContext
 * @param {string} pluginUrl - URL to the WAM plugin's index.js
 * @returns {Object} WAM plugin instance with audioNode, destroy(), etc.
 */
export const loadWAMPlugin = async (audioContext, pluginUrl) => {
  const { groupId, groupKey } = await initWAMSDK(audioContext);

  // Dynamically import the plugin module from its URL
  let WAMPlugin;
  try {
    const module = await import(/* webpackIgnore: true */ pluginUrl);
    WAMPlugin = module.default || module;
  } catch (err) {
    throw new Error(`Failed to load WAM plugin from ${pluginUrl}: ${err.message}`);
  }

  // Create WAM plugin instance
  const instance = await WAMPlugin.createInstance(groupId, audioContext, {});

  const audioNode = instance.audioNode;

  return {
    instance,
    audioNode,
    inputNode:  audioNode,
    outputNode: audioNode,

    // Get plugin metadata
    get descriptor() { return instance.descriptor || {}; },

    // Parameter control
    setParam: async (paramId, value) => {
      try {
        const params = await instance.getParameterValues(false, paramId);
        if (params[paramId] !== undefined) {
          await instance.setParameterValues({ [paramId]: { id: paramId, value } });
        }
      } catch (e) {
        console.warn('[WAM] setParam failed:', e);
      }
    },

    // Get all parameter info
    getParamInfo: async () => {
      try {
        return await instance.getParameterInfo();
      } catch { return {}; }
    },

    // Get current parameter values
    getParamValues: async () => {
      try {
        return await instance.getParameterValues();
      } catch { return {}; }
    },

    // MIDI support
    scheduleMIDIEvent: (time, data) => {
      try { instance.scheduleEvents({ type: 'wam-midi', time, data }); } catch {}
    },

    // State save/load (for project serialization)
    getState: async () => {
      try { return await instance.getState(); } catch { return null; }
    },
    setState: async (state) => {
      try { await instance.setState(state); } catch {}
    },

    // GUI
    hasGUI: () => !!instance.createGui,
    createGUI: async () => {
      if (!instance.createGui) return null;
      return await instance.createGui();
    },

    // Cleanup
    destroy: () => {
      try {
        audioNode.disconnect();
        if (instance.destroy) instance.destroy();
      } catch {}
    },
  };
};

/**
 * Destroy a WAM plugin instance and clean up audio nodes.
 */
export const destroyWAMPlugin = (wamInstance) => {
  if (wamInstance?.destroy) wamInstance.destroy();
};
