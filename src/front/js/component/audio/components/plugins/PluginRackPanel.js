// =============================================================================
// PluginRackPanel.jsx — Plugin Insert Rack for a Track
// =============================================================================
// Renders the full plugin chain for a track. Add, remove, reorder, bypass,
// set params. Integrates with PluginHost singleton.
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getPluginHost } from '../../audio/plugins/PluginHost';
import PluginSlot from './PluginSlot';
import PluginBrowserModal from './PluginBrowserModal';

const PluginRackPanel = ({ trackGraph, trackName, trackColor, onClose }) => {
  const [rack, setRack] = useState([]);
  const [showBrowser, setShowBrowser] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const hostRef = useRef(getPluginHost());

  // Sync rack state from PluginHost
  const refreshRack = useCallback(() => {
    if (!trackGraph) return;
    const host = hostRef.current;
    const current = host.getRack(trackGraph.id);
    setRack([...current]);
  }, [trackGraph]);

  useEffect(() => {
    refreshRack();
    const unsub = hostRef.current.on('change', (data) => {
      if (data.trackId === trackGraph?.id) refreshRack();
    });
    return unsub;
  }, [trackGraph, refreshRack]);

  const handleAddPlugin = useCallback(async (pluginId) => {
    if (!trackGraph) return;
    try {
      await hostRef.current.addPlugin(trackGraph, pluginId);
      refreshRack();
    } catch (e) {
      console.error('[PluginRack] Failed to add plugin:', e);
    }
  }, [trackGraph, refreshRack]);

  const handleRemove = useCallback((instanceId) => {
    if (!trackGraph) return;
    hostRef.current.removePlugin(trackGraph, instanceId);
    refreshRack();
  }, [trackGraph, refreshRack]);

  const handleBypass = useCallback((instanceId, bypassed) => {
    if (!trackGraph) return;
    hostRef.current.bypass(trackGraph, instanceId, bypassed);
    refreshRack();
  }, [trackGraph, refreshRack]);

  const handleSetParam = useCallback((instanceId, paramId, value) => {
    if (!trackGraph) return;
    hostRef.current.setParam(trackGraph, instanceId, paramId, value);
    refreshRack();
  }, [trackGraph, refreshRack]);

  const handleLoadPreset = useCallback((instanceId, presetParams) => {
    if (!trackGraph) return;
    hostRef.current.loadPreset(trackGraph, instanceId, presetParams);
    refreshRack();
  }, [trackGraph, refreshRack]);

  // Drag and drop reorder
  const handleDragStart = useCallback((idx) => (e) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((idx) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((dropIdx) => (e) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx || !trackGraph) return;
    const inst = rack[dragIdx];
    if (inst) {
      hostRef.current.movePlugin(trackGraph, inst.instanceId, dropIdx);
      refreshRack();
    }
    setDragIdx(null);
  }, [dragIdx, rack, trackGraph, refreshRack]);

  const handleDragEnd = useCallback(() => setDragIdx(null), []);

  if (!trackGraph) {
    return (
      <div style={styles.panel}>
        <div style={styles.empty}>Select a track to view its plugin rack</div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 4, height: 20, borderRadius: 2, background: trackColor || '#00ffc8' }} />
          <span style={styles.trackName}>{trackName || 'Track'}</span>
          <span style={styles.label}>INSERT RACK</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.count}>{rack.length} plugin{rack.length !== 1 ? 's' : ''}</span>
          {onClose && <button style={styles.closeBtn} onClick={onClose}>✕</button>}
        </div>
      </div>

      {/* Plugin Slots */}
      <div style={styles.slotList}>
        {rack.length === 0 ? (
          <div style={styles.emptyRack}>
            <div style={styles.emptyIcon}>🔌</div>
            <div style={styles.emptyText}>No plugins</div>
            <div style={styles.emptyHint}>Click "Add Plugin" to get started</div>
          </div>
        ) : (
          rack.map((inst, idx) => (
            <div
              key={inst.instanceId}
              onDragOver={handleDragOver(idx)}
              onDrop={handleDrop(idx)}
            >
              <PluginSlot
                instance={inst}
                index={idx}
                onSetParam={handleSetParam}
                onBypass={handleBypass}
                onRemove={handleRemove}
                onLoadPreset={handleLoadPreset}
                onDragStart={handleDragStart(idx)}
                onDragEnd={handleDragEnd}
                isDragging={dragIdx === idx}
              />
            </div>
          ))
        )}
      </div>

      {/* Add Plugin Button */}
      <button style={styles.addBtn} onClick={() => setShowBrowser(true)}>
        <span style={styles.addIcon}>+</span> Add Plugin
      </button>

      {/* Signal Flow Indicator */}
      {rack.length > 0 && (
        <div style={styles.signalFlow}>
          <span style={styles.flowLabel}>Signal: </span>
          <span style={styles.flowNode}>IN</span>
          {rack.map((inst, i) => (
            <React.Fragment key={inst.instanceId}>
              <span style={styles.flowArrow}>→</span>
              <span style={{ ...styles.flowNode, opacity: inst.bypassed ? 0.3 : 1 }}>
                {inst.def?.name?.split(' ')[0] || inst.pluginId}
              </span>
            </React.Fragment>
          ))}
          <span style={styles.flowArrow}>→</span>
          <span style={styles.flowNode}>OUT</span>
        </div>
      )}

      {/* Plugin Browser Modal */}
      <PluginBrowserModal
        isOpen={showBrowser}
        onClose={() => setShowBrowser(false)}
        onAddPlugin={handleAddPlugin}
      />
    </div>
  );
};

const styles = {
  panel: { background: '#111a24', borderRadius: 8, border: '1px solid #1e2d3d', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #1e2d3d' },
  trackName: { fontSize: 14, fontWeight: 600, color: '#e0e8f0' },
  label: { fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: '#5a7088' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  count: { fontSize: 11, color: '#5a7088' },
  closeBtn: { background: 'none', border: 'none', color: '#5a7088', fontSize: 16, cursor: 'pointer', padding: '0 4px' },
  slotList: { flex: 1, overflow: 'auto', padding: '8px 10px' },
  emptyRack: { textAlign: 'center', padding: '40px 20px' },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#5a7088', marginBottom: 4 },
  emptyHint: { fontSize: 11, color: '#3a4a5a' },
  addBtn: { margin: '8px 10px 10px', padding: '8px 16px', background: '#00ffc8' + '15', border: '1px dashed #00ffc8' + '40', borderRadius: 6, color: '#00ffc8', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addIcon: { fontSize: 18, lineHeight: 1 },
  signalFlow: { padding: '6px 14px 10px', borderTop: '1px solid #1e2d3d', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  flowLabel: { fontSize: 10, color: '#3a4a5a', fontWeight: 700 },
  flowNode: { fontSize: 10, background: '#1a2332', padding: '2px 6px', borderRadius: 3, color: '#8899aa', fontFamily: "'JetBrains Mono', monospace" },
  flowArrow: { fontSize: 10, color: '#00ffc8' + '60' },
  empty: { padding: 40, textAlign: 'center', color: '#5a7088' },
};

export default PluginRackPanel;