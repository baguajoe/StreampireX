// =============================================================================
// PluginSlot.jsx — Single Plugin Slot in the Insert Rack
// =============================================================================
// Shows plugin name, bypass toggle, preset dropdown, parameter sliders,
// and remove/drag handles.
// =============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { getPresetStore } from '../../audio/plugins/presets/presetStore';

const PluginSlot = ({
  instance,      // { instanceId, pluginId, def, params, bypassed }
  onSetParam,    // (instanceId, paramId, value) => void
  onBypass,      // (instanceId, bypassed) => void
  onRemove,      // (instanceId) => void
  onLoadPreset,  // (instanceId, presetParams) => void
  onDragStart,   // drag handle
  onDragEnd,
  isDragging,
  index,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [showPresets, setShowPresets] = useState(false);
  const presetStore = useMemo(() => getPresetStore(), []);
  const presets = useMemo(() => presetStore.getPresets(instance.pluginId), [instance.pluginId]);

  const catColors = { utility: '#5ac8fa', eq: '#34c759', dynamics: '#ff9500', spatial: '#af52de', distortion: '#ff3b30' };
  const accentColor = catColors[instance.def?.category] || '#00ffc8';

  const handlePresetSelect = useCallback((preset) => {
    if (onLoadPreset) onLoadPreset(instance.instanceId, preset.params);
    setShowPresets(false);
  }, [instance.instanceId, onLoadPreset]);

  const handleSavePreset = useCallback(() => {
    const name = window.prompt('Preset name:', `${instance.def?.name || 'Plugin'} Custom`);
    if (name) {
      presetStore.savePreset(instance.pluginId, name, instance.params);
    }
  }, [instance, presetStore]);

  const formatValue = (param, value) => {
    if (param.type === 'bool') return value ? 'ON' : 'OFF';
    const v = typeof value === 'number' ? value : parseFloat(value) || 0;
    if (param.unit === 'Hz' && v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    if (param.unit === 'dB') return `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
    if (param.unit === '%') return `${Math.round(v)}%`;
    if (param.unit === 'ms') return `${Math.round(v)}ms`;
    if (param.unit === 's') return `${v.toFixed(1)}s`;
    if (param.unit === ':1') return `${v.toFixed(1)}:1`;
    return v.toFixed(1);
  };

  return (
    <div
      style={{
        ...styles.slot,
        borderLeftColor: accentColor,
        opacity: isDragging ? 0.5 : 1,
        filter: instance.bypassed ? 'brightness(0.6)' : 'none',
      }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.dragHandle} title="Drag to reorder">⋮⋮</span>
        <span style={{ ...styles.index, color: accentColor }}>{index + 1}</span>
        <span style={styles.name} onClick={() => setExpanded(!expanded)}>{instance.def?.name || instance.pluginId}</span>
        <div style={styles.headerBtns}>
          <button style={{ ...styles.bypassBtn, background: instance.bypassed ? '#ff3b30' + '40' : '#34c759' + '30', color: instance.bypassed ? '#ff3b30' : '#34c759' }}
            onClick={() => onBypass(instance.instanceId, !instance.bypassed)} title={instance.bypassed ? 'Enable' : 'Bypass'}>
            {instance.bypassed ? 'OFF' : 'ON'}
          </button>
          <button style={styles.presetBtn} onClick={() => setShowPresets(!showPresets)} title="Presets">♪</button>
          <button style={styles.removeBtn} onClick={() => onRemove(instance.instanceId)} title="Remove">✕</button>
        </div>
      </div>

      {/* Preset Dropdown */}
      {showPresets && (
        <div style={styles.presetDropdown}>
          {presets.map(p => (
            <div key={p.id} style={styles.presetItem} onClick={() => handlePresetSelect(p)}>
              <span>{p.name}</span>
              {p.isFactory && <span style={styles.factoryBadge}>F</span>}
            </div>
          ))}
          <div style={{ ...styles.presetItem, borderTop: '1px solid #2a3a4a', color: '#00ffc8' }} onClick={handleSavePreset}>
            + Save Current
          </div>
        </div>
      )}

      {/* Parameters */}
      {expanded && (
        <div style={styles.params}>
          {(instance.def?.params || []).map(param => (
            <div key={param.id} style={styles.paramRow}>
              <label style={styles.paramLabel}>{param.label}</label>
              {param.type === 'bool' ? (
                <button
                  style={{ ...styles.boolBtn, background: instance.params[param.id] ? '#00ffc8' + '30' : '#1a2332' }}
                  onClick={() => onSetParam(instance.instanceId, param.id, !instance.params[param.id])}
                >
                  {instance.params[param.id] ? 'ON' : 'OFF'}
                </button>
              ) : (
                <>
                  <input
                    type="range"
                    min={param.min} max={param.max} step={param.step || 0.01}
                    value={instance.params[param.id] ?? param.default}
                    onChange={e => onSetParam(instance.instanceId, param.id, parseFloat(e.target.value))}
                    style={styles.slider}
                  />
                  <span style={styles.paramValue}>
                    {formatValue(param, instance.params[param.id] ?? param.default)}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  slot: { background: '#0d1520', borderRadius: 6, borderLeft: '3px solid #00ffc8', marginBottom: 6, transition: 'opacity 0.15s' },
  header: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', cursor: 'default' },
  dragHandle: { cursor: 'grab', color: '#3a4a5a', fontSize: 12, userSelect: 'none' },
  index: { fontSize: 11, fontWeight: 700, minWidth: 16 },
  name: { flex: 1, fontSize: 13, fontWeight: 600, color: '#c8d8e8', cursor: 'pointer' },
  headerBtns: { display: 'flex', gap: 4 },
  bypassBtn: { border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' },
  presetBtn: { background: '#1a2332', border: 'none', borderRadius: 4, padding: '2px 6px', fontSize: 12, color: '#8899aa', cursor: 'pointer' },
  removeBtn: { background: 'none', border: 'none', color: '#5a3a3a', fontSize: 14, cursor: 'pointer', padding: '0 4px' },
  presetDropdown: { background: '#1a2332', border: '1px solid #2a3a4a', borderRadius: 6, margin: '0 10px 6px', maxHeight: 180, overflowY: 'auto' },
  presetItem: { padding: '6px 12px', fontSize: 12, color: '#c8d8e8', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' },
  factoryBadge: { fontSize: 9, background: '#2a3a4a', padding: '1px 5px', borderRadius: 3, color: '#8899aa' },
  params: { padding: '4px 10px 10px' },
  paramRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  paramLabel: { fontSize: 11, color: '#8899aa', minWidth: 60, textAlign: 'right' },
  slider: { flex: 1, height: 4, appearance: 'none', background: '#1a2332', borderRadius: 2, outline: 'none', cursor: 'pointer' },
  paramValue: { fontSize: 11, color: '#00ffc8', minWidth: 50, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" },
  boolBtn: { border: '1px solid #2a3a4a', borderRadius: 4, padding: '2px 10px', fontSize: 11, color: '#c8d8e8', cursor: 'pointer' },
};

export default PluginSlot;