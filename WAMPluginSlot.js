// =============================================================================
// WAMPluginSlot.js — WAM Plugin Instance in the DAW Plugin Rack
// =============================================================================
// Renders a loaded WAM plugin inside PluginRackPanel.
// Handles GUI launch, parameter display, bypass, and removal.
//
// INSTALL:
//   Copy to: src/front/js/component/audio/components/plugins/WAMPluginSlot.js
//
// USE IN PluginRackPanel.js:
//   Add WAM plugin support to handleAddPlugin() — see patch below.
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadWAMPlugin } from '../../plugins/WAMPluginHost';

const S = {
  bg:       '#161b22',
  card:     '#1f2937',
  border:   '#30363d',
  teal:     '#00ffc8',
  orange:   '#FF6600',
  text:     '#e6edf3',
  dim:      '#8b949e',
  red:      '#cf222e',
  green:    '#2ea043',
};

// ── WAM Plugin Slot ───────────────────────────────────────────────────────────
const WAMPluginSlot = ({
  pluginMeta,       // { name, url, developer, type, ... }
  trackGraph,       // AudioContext track graph
  onRemove,         // () => void
  onWAMLoaded,      // (wamInstance) => void — call after audio node is ready
}) => {
  const [wamInstance, setWamInstance] = useState(null);
  const [params, setParams]           = useState({});
  const [paramInfo, setParamInfo]     = useState({});
  const [bypassed, setBypassed]       = useState(false);
  const [guiOpen, setGuiOpen]         = useState(false);
  const [guiElement, setGuiElement]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const guiContainerRef               = useRef(null);
  const instanceRef                   = useRef(null);

  // Load WAM plugin on mount
  useEffect(() => {
    if (!trackGraph?.context || !pluginMeta?.url) return;

    let cancelled = false;
    const load = async () => {
      try {
        const inst = await loadWAMPlugin(trackGraph.context, pluginMeta.url);
        if (cancelled) { inst.destroy(); return; }

        instanceRef.current = inst;
        setWamInstance(inst);

        // Wire into track audio graph
        trackGraph.insertRackInput.connect(inst.inputNode);
        inst.outputNode.connect(trackGraph.insertRackOutput);

        // Get parameters
        const info   = await inst.getParamInfo();
        const values = await inst.getParamValues();
        setParamInfo(info);
        setParams(values);

        if (onWAMLoaded) onWAMLoaded(inst);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load plugin');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    return () => {
      cancelled = true;
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
    };
  }, [pluginMeta?.url, trackGraph]);

  // Open native GUI
  const handleOpenGUI = useCallback(async () => {
    if (!wamInstance?.hasGUI()) return;
    try {
      const el = await wamInstance.createGUI();
      setGuiElement(el);
      setGuiOpen(true);
    } catch (e) {
      console.error('[WAMSlot] GUI failed:', e);
    }
  }, [wamInstance]);

  // Attach GUI element to container div
  useEffect(() => {
    if (guiOpen && guiElement && guiContainerRef.current) {
      guiContainerRef.current.innerHTML = '';
      guiContainerRef.current.appendChild(guiElement);
    }
  }, [guiOpen, guiElement]);

  // Handle bypass
  const handleBypass = useCallback(() => {
    if (!wamInstance) return;
    const next = !bypassed;
    setBypassed(next);
    try {
      // Disconnect/reconnect to bypass
      if (next) {
        wamInstance.inputNode.disconnect();
        trackGraph.insertRackInput.connect(trackGraph.insertRackOutput);
      } else {
        trackGraph.insertRackInput.disconnect(trackGraph.insertRackOutput);
        trackGraph.insertRackInput.connect(wamInstance.inputNode);
      }
    } catch {}
  }, [wamInstance, bypassed, trackGraph]);

  // Handle param change
  const handleParamChange = useCallback(async (paramId, value) => {
    if (!wamInstance) return;
    await wamInstance.setParam(paramId, parseFloat(value));
    setParams(prev => ({ ...prev, [paramId]: parseFloat(value) }));
  }, [wamInstance]);

  const paramEntries = Object.entries(paramInfo).slice(0, 8); // show max 8 params inline

  return (
    <div style={{
      background:   S.card,
      border:       `1px solid ${bypassed ? S.dim : S.teal + '40'}`,
      borderRadius: 8,
      overflow:     'hidden',
      opacity:      bypassed ? 0.55 : 1,
      transition:   'opacity 0.2s, border-color 0.2s',
    }}>

      {/* Plugin Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            8,
        padding:        '8px 12px',
        borderBottom:   `1px solid ${S.border}`,
        background:     S.bg,
      }}>
        <span style={{ fontSize: '0.85rem' }}>
          {pluginMeta.type === 'instrument' ? '🎹' : '🎛️'}
        </span>
        <span style={{ fontWeight: 700, color: S.teal, fontSize: '0.85rem', flex: 1 }}>
          {pluginMeta.name}
        </span>
        <span style={{ color: S.dim, fontSize: '0.65rem' }}>WAM</span>

        {/* Bypass */}
        <button
          onClick={handleBypass}
          title={bypassed ? 'Enable' : 'Bypass'}
          style={{
            background:  bypassed ? `${S.orange}20` : `${S.green}20`,
            border:      `1px solid ${bypassed ? S.orange : S.green}`,
            color:       bypassed ? S.orange : S.green,
            borderRadius: 4, padding: '2px 8px',
            fontSize: '0.65rem', cursor: 'pointer',
          }}>
          {bypassed ? 'BYP' : 'ON'}
        </button>

        {/* Open GUI */}
        {wamInstance?.hasGUI() && (
          <button
            onClick={handleOpenGUI}
            title="Open plugin GUI"
            style={{
              background: `${S.teal}20`, border: `1px solid ${S.teal}`,
              color: S.teal, borderRadius: 4, padding: '2px 8px',
              fontSize: '0.65rem', cursor: 'pointer',
            }}>
            GUI
          </button>
        )}

        {/* Remove */}
        <button
          onClick={onRemove}
          title="Remove plugin"
          style={{
            background: 'transparent', border: 'none',
            color: S.dim, cursor: 'pointer', fontSize: '0.9rem', padding: '0 2px',
          }}>×</button>
      </div>

      {/* Loading / Error states */}
      {loading && (
        <div style={{ padding: '12px 16px', color: S.dim, fontSize: '0.78rem' }}>
          ⏳ Loading {pluginMeta.name}...
        </div>
      )}
      {error && (
        <div style={{ padding: '10px 12px', color: S.red, fontSize: '0.75rem' }}>
          ⚠ {error}
        </div>
      )}

      {/* Inline Parameters (if no GUI or GUI not open) */}
      {!loading && !error && !guiOpen && paramEntries.length > 0 && (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {paramEntries.map(([paramId, info]) => {
            const val  = params[paramId] ?? info.defaultValue ?? 0;
            const min  = info.minValue  ?? 0;
            const max  = info.maxValue  ?? 1;
            return (
              <div key={paramId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ color: S.dim, fontSize: '0.7rem', width: 90, flexShrink: 0 }}>
                  {info.label || paramId}
                </label>
                <input
                  type="range" min={min} max={max}
                  step={(max - min) / 1000}
                  value={val}
                  onChange={e => handleParamChange(paramId, e.target.value)}
                  style={{ flex: 1, accentColor: S.teal }}
                />
                <span style={{ color: S.text, fontSize: '0.7rem', width: 40, textAlign: 'right' }}>
                  {Number(val).toFixed(2)}
                </span>
              </div>
            );
          })}
          {Object.keys(paramInfo).length > 8 && (
            <p style={{ color: S.dim, fontSize: '0.65rem', margin: 0 }}>
              +{Object.keys(paramInfo).length - 8} more params — open GUI for full control
            </p>
          )}
        </div>
      )}

      {/* Native GUI container */}
      {guiOpen && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setGuiOpen(false)}
            style={{
              position: 'absolute', top: 6, right: 6, zIndex: 10,
              background: S.bg, border: `1px solid ${S.border}`,
              color: S.dim, borderRadius: 4, padding: '2px 8px',
              fontSize: '0.7rem', cursor: 'pointer',
            }}>
            Close GUI
          </button>
          <div
            ref={guiContainerRef}
            style={{ minHeight: 200, background: '#000' }}
          />
        </div>
      )}
    </div>
  );
};

export default WAMPluginSlot;

// =============================================================================
// PATCH FOR PluginRackPanel.js
// =============================================================================
// Add WAM plugin support to your existing PluginRackPanel.js.
// Find the handleAddPlugin function and add the WAM branch:
//
// BEFORE (in PluginRackPanel.js):
//   const handleAddPlugin = useCallback(async (pluginId) => {
//     if (!trackGraph) return;
//     try {
//       await hostRef.current.addPlugin(trackGraph, pluginId);
//       refreshRack();
//     } catch (e) { ... }
//   }, [trackGraph, refreshRack]);
//
// AFTER:
//   import WAMPluginSlot from './WAMPluginSlot';
//   import { getInstalledWAMPlugins } from '../../plugins/WAMPluginHost';
//
//   const [wamSlots, setWamSlots] = useState([]); // { id, pluginMeta }
//
//   const handleAddPlugin = useCallback(async (pluginId) => {
//     if (!trackGraph) return;
//     if (pluginId.startsWith('wam:')) {
//       // WAM plugin — get meta from installed list
//       const url = pluginId.replace('wam:', '');
//       const meta = getInstalledWAMPlugins().find(p => p.url === url);
//       if (!meta) return;
//       setWamSlots(prev => [...prev, { id: `wam_${Date.now()}`, pluginMeta: meta }]);
//       return;
//     }
//     // Regular built-in plugin
//     try {
//       await hostRef.current.addPlugin(trackGraph, pluginId);
//       refreshRack();
//     } catch (e) { console.error('[PluginRack] Failed to add plugin:', e); }
//   }, [trackGraph, refreshRack]);
//
// Then in PluginRackPanel JSX, after the existing plugin slots, add:
//   {wamSlots.map(slot => (
//     <WAMPluginSlot
//       key={slot.id}
//       pluginMeta={slot.pluginMeta}
//       trackGraph={trackGraph}
//       onRemove={() => setWamSlots(prev => prev.filter(s => s.id !== slot.id))}
//     />
//   ))}
// =============================================================================
