// =============================================================================
// PluginHost.js — Plugin Instance Manager for StreamPireX DAW
// =============================================================================
// Manages plugin insert chains per track.
//   - addPlugin / removePlugin / movePlugin / bypass / setParam
//   - Chains: rackInput → plugin1 → plugin2 → ... → rackOutput
//   - Worklet loading & registration
//   - Serialize / deserialize for project save/load
// =============================================================================

import { getPluginDef } from './registry';
import { createGainPlugin } from './plugins/GainPlugin';
import { createEQ3BandPlugin } from './plugins/EQ3BandPlugin';
import { createCompressorPlugin } from './plugins/CompressorPlugin';
import { createReverbPlugin } from './plugins/ReverbPlugin';
import { createDelayPlugin } from './plugins/DelayPlugin';
import { createLimiterPlugin } from './plugins/LimiterPlugin';
import { createDeEsserPlugin } from './plugins/DeEsserPlugin';
import { createSaturationPlugin } from './plugins/SaturationPlugin';

let _nextId = 1;
const _loadedWorklets = new Set();

// Factory map: pluginId → create function
const PLUGIN_FACTORIES = {
  gain:       createGainPlugin,
  eq_3band:   createEQ3BandPlugin,
  compressor: createCompressorPlugin,
  reverb:     createReverbPlugin,
  delay:      createDelayPlugin,
  limiter:    createLimiterPlugin,
  deesser:    createDeEsserPlugin,
  saturation: createSaturationPlugin,
};

class PluginHost {
  constructor() {
    // trackId → [PluginInstance, ...]
    this.racks = new Map();
    this._listeners = new Map();
  }

  // ── Get or init rack for track ──
  _getRack(trackId) {
    if (!this.racks.has(trackId)) this.racks.set(trackId, []);
    return this.racks.get(trackId);
  }

  // ── Load worklet module if needed ──
  async _ensureWorklet(context, def) {
    if (def.processor.kind !== 'worklet') return;
    const name = def.processor.workletName;
    if (_loadedWorklets.has(name)) return;

    if (def.processor.moduleUrl) {
      await context.audioWorklet.addModule(def.processor.moduleUrl);
    } else {
      // Inline worklet — use compressorWorkletSource for compressor
      const { getCompressorWorkletSource } = await import('../worklets/compressorWorkletSource');
      const src = getCompressorWorkletSource(name);
      const blob = new Blob([src], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await context.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
    }
    _loadedWorklets.add(name);
  }

  // ── Add plugin to track ──
  async addPlugin(trackGraph, pluginId, index = -1) {
    const def = getPluginDef(pluginId);
    if (!def) throw new Error(`Unknown plugin: ${pluginId}`);

    const ctx = trackGraph.context;
    await this._ensureWorklet(ctx, def);

    const factory = PLUGIN_FACTORIES[pluginId];
    if (!factory) throw new Error(`No factory for plugin: ${pluginId}`);

    const instanceId = `inst_${_nextId++}`;
    const defaultParams = {};
    def.params.forEach(p => { defaultParams[p.id] = p.default; });

    const instance = factory(ctx, defaultParams);

    const pluginInstance = {
      instanceId,
      pluginId,
      def,
      params: { ...defaultParams },
      bypassed: false,
      node: instance.node,         // main audio node (or chain wrapper)
      inputNode: instance.inputNode || instance.node,
      outputNode: instance.outputNode || instance.node,
      setParam: instance.setParam,  // (paramId, value) => void
      destroy: instance.destroy,    // cleanup
      _bypassGain: null,
    };

    // Create bypass infrastructure
    pluginInstance._bypassGain = ctx.createGain();
    pluginInstance._bypassGain.gain.value = 1;

    const rack = this._getRack(trackGraph.id);
    if (index >= 0 && index < rack.length) {
      rack.splice(index, 0, pluginInstance);
    } else {
      rack.push(pluginInstance);
    }

    this._rewire(trackGraph);
    this._emit('change', { trackId: trackGraph.id, action: 'add', instanceId });
    return instanceId;
  }

  // ── Remove plugin ──
  removePlugin(trackGraph, instanceId) {
    const rack = this._getRack(trackGraph.id);
    const idx = rack.findIndex(p => p.instanceId === instanceId);
    if (idx === -1) return;

    const inst = rack[idx];
    rack.splice(idx, 1);

    // Disconnect and cleanup
    try { inst.inputNode.disconnect(); } catch (e) {}
    try { inst.outputNode.disconnect(); } catch (e) {}
    try { inst._bypassGain.disconnect(); } catch (e) {}
    if (inst.destroy) inst.destroy();

    this._rewire(trackGraph);
    this._emit('change', { trackId: trackGraph.id, action: 'remove', instanceId });
  }

  // ── Move plugin to new index ──
  movePlugin(trackGraph, instanceId, newIndex) {
    const rack = this._getRack(trackGraph.id);
    const idx = rack.findIndex(p => p.instanceId === instanceId);
    if (idx === -1) return;

    const [inst] = rack.splice(idx, 1);
    const clampedIdx = Math.max(0, Math.min(rack.length, newIndex));
    rack.splice(clampedIdx, 0, inst);

    this._rewire(trackGraph);
    this._emit('change', { trackId: trackGraph.id, action: 'move', instanceId });
  }

  // ── Set parameter ──
  setParam(trackGraph, instanceId, paramId, value) {
    const rack = this._getRack(trackGraph.id);
    const inst = rack.find(p => p.instanceId === instanceId);
    if (!inst) return;

    inst.params[paramId] = value;
    if (inst.setParam) inst.setParam(paramId, value);
    this._emit('paramChange', { trackId: trackGraph.id, instanceId, paramId, value });
  }

  // ── Bypass toggle ──
  bypass(trackGraph, instanceId, bypassed) {
    const rack = this._getRack(trackGraph.id);
    const inst = rack.find(p => p.instanceId === instanceId);
    if (!inst) return;

    inst.bypassed = bypassed;
    this._rewire(trackGraph);
    this._emit('change', { trackId: trackGraph.id, action: 'bypass', instanceId, bypassed });
  }

  // ── Load preset ──
  loadPreset(trackGraph, instanceId, presetParams) {
    const rack = this._getRack(trackGraph.id);
    const inst = rack.find(p => p.instanceId === instanceId);
    if (!inst) return;

    Object.entries(presetParams).forEach(([paramId, value]) => {
      inst.params[paramId] = value;
      if (inst.setParam) inst.setParam(paramId, value);
    });
    this._emit('presetLoad', { trackId: trackGraph.id, instanceId, params: presetParams });
  }

  // ── Get rack for track ──
  getRack(trackId) {
    return this._getRack(trackId);
  }

  // ── Rewire the insert chain ──
  _rewire(trackGraph) {
    const rack = this._getRack(trackGraph.id);

    // Disconnect existing insert chain
    trackGraph.disconnectInsertPassthrough();
    try { trackGraph.insertRackInput.disconnect(); } catch (e) {}
    rack.forEach(inst => {
      try { inst.inputNode.disconnect(); } catch (e) {}
      try { inst.outputNode.disconnect(); } catch (e) {}
      try { inst._bypassGain.disconnect(); } catch (e) {}
    });

    if (rack.length === 0) {
      // No plugins — direct passthrough
      trackGraph.reconnectInsertPassthrough();
      return;
    }

    // Chain: rackInput → [plugin1 → plugin2 → ...] → rackOutput
    let prevOutput = trackGraph.insertRackInput;

    rack.forEach(inst => {
      if (inst.bypassed) {
        // Bypass: skip the plugin node, connect through bypass gain
        inst._bypassGain.gain.value = 1;
        prevOutput.connect(inst._bypassGain);
        prevOutput = inst._bypassGain;
      } else {
        prevOutput.connect(inst.inputNode);
        prevOutput = inst.outputNode;
      }
    });

    prevOutput.connect(trackGraph.insertRackOutput);
  }

  // ── Serialize rack for project save ──
  serializeRack(trackId) {
    const rack = this._getRack(trackId);
    return rack.map(inst => ({
      instanceId: inst.instanceId,
      pluginId: inst.pluginId,
      params: { ...inst.params },
      bypassed: inst.bypassed,
    }));
  }

  // ── Deserialize: restore rack from saved data ──
  async deserializeRack(trackGraph, savedRack) {
    // Clear existing
    const rack = this._getRack(trackGraph.id);
    [...rack].forEach(inst => this.removePlugin(trackGraph, inst.instanceId));

    // Restore
    for (const saved of savedRack) {
      const instanceId = await this.addPlugin(trackGraph, saved.pluginId);
      // Apply saved params
      Object.entries(saved.params || {}).forEach(([paramId, value]) => {
        this.setParam(trackGraph, instanceId, paramId, value);
      });
      if (saved.bypassed) {
        this.bypass(trackGraph, instanceId, true);
      }
    }
  }

  // ── Clear all plugins for a track ──
  clearRack(trackGraph) {
    const rack = this._getRack(trackGraph.id);
    [...rack].forEach(inst => this.removePlugin(trackGraph, inst.instanceId));
  }

  // ── Events ──
  on(event, cb) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(cb);
    return () => this._listeners.get(event)?.delete(cb);
  }

  _emit(event, data) {
    this._listeners.get(event)?.forEach(cb => {
      try { cb(data); } catch (e) { console.error(`[PluginHost] ${event}:`, e); }
    });
  }
}

// Singleton
let _hostInstance = null;
export const getPluginHost = () => {
  if (!_hostInstance) _hostInstance = new PluginHost();
  return _hostInstance;
};

export default PluginHost;