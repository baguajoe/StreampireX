import React, { useState, useRef, useEffect } from 'react';
import SPXVoxEngine from '../../../SPXVoxEngine';

/**
 * VoxEnginePlugin — wraps SPXVoxEngine as a Recording Studio insert plugin.
 * Receives audioContext, inputNode, outputNode from the plugin chain host.
 */
const VoxEnginePlugin = ({ audioContext, inputNode, outputNode, onParamChange, params = {} }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{
      background: '#06060f',
      border: '1px solid #00ffc8',
      borderRadius: 8,
      overflow: 'hidden',
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      {/* Plugin header bar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px', background: '#0d1117',
          cursor: 'pointer', borderBottom: expanded ? '1px solid #21262d' : 'none',
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <span style={{ color: '#00ffc8', fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>
          ⚡ SPX VOXENGINE
        </span>
        <span style={{ color: '#5a7088', fontSize: 11 }}>
          {expanded ? '▲' : '▼'} vocoder / voice instrument
        </span>
      </div>

      {/* Full engine UI when expanded */}
      {expanded && (
        <div style={{ padding: 12 }}>
          <SPXVoxEngine
            audioContext={audioContext}
            inputNode={inputNode}
            outputNode={outputNode}
            compact={true}
          />
        </div>
      )}
    </div>
  );
};

export default VoxEnginePlugin;

// Plugin metadata for PluginHost registration
export const VOX_ENGINE_PLUGIN_DEF = {
  id: 'spx_vox_engine',
  name: 'SPX VoxEngine',
  version: '1.0.0',
  category: 'vocal',
  type: 'insert',
  color: '#00ffc8',
  description: 'Real-time AudioWorklet vocoder — voice modulator, formant filter, unison, harmonizer, arpeggiator',
  component: VoxEnginePlugin,
};
