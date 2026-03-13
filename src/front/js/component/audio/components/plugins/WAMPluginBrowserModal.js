// =============================================================================
// WAMPluginBrowserModal.js — In-DAW WAM Plugin Browser
// =============================================================================
// Shows installed WAM plugins inside the DAW so users can add them to a track
// rack without leaving the session. Appears when user clicks "Add WAM Plugin"
// in PluginRackPanel or PluginBrowserModal.
//
// INSTALL:
//   Copy to: src/front/js/component/audio/components/plugins/WAMPluginBrowserModal.js
//
// USE IN PluginBrowserModal.js:
//   Add a "WAM Plugins" tab that renders this component.
//   Pass onAddWAM={(url) => handleAddPlugin('wam:' + url)} as prop.
// =============================================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getInstalledWAMPlugins } from '../../plugins/WAMPluginHost';

const S = {
  bg:      '#0d1117',
  surface: '#161b22',
  card:    '#1f2937',
  border:  '#30363d',
  teal:    '#00ffc8',
  orange:  '#FF6600',
  text:    '#e6edf3',
  dim:     '#8b949e',
};

const WAMPluginBrowserModal = ({ onAddWAM, onClose }) => {
  const [installed, setInstalled] = useState([]);

  useEffect(() => {
    setInstalled(getInstalledWAMPlugins());
  }, []);

  return (
    <div style={{
      background:   S.surface,
      border:       `1px solid ${S.border}`,
      borderRadius: 10,
      overflow:     'hidden',
      minWidth:     340,
    }}>
      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '12px 16px',
        borderBottom:   `1px solid ${S.border}`,
        background:     S.bg,
      }}>
        <span style={{ fontWeight: 700, color: S.teal, fontSize: '0.9rem' }}>🔌 WAM Plugins</span>
        <Link
          to="/wam-plugin-store"
          style={{ color: S.orange, fontSize: '0.75rem', textDecoration: 'none' }}>
          Browse Store →
        </Link>
      </div>

      {/* Plugin list */}
      <div style={{ maxHeight: 320, overflowY: 'auto', padding: 8 }}>
        {installed.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <p style={{ color: S.dim, fontSize: '0.82rem', margin: '0 0 12px' }}>
              No WAM plugins installed yet.
            </p>
            <Link to="/wam-plugin-store" style={{
              background:    S.teal, color: '#000', fontWeight: 700,
              borderRadius:  6, padding: '6px 16px',
              fontSize:      '0.78rem', textDecoration: 'none',
              display:       'inline-block',
            }}>
              Open Plugin Store
            </Link>
          </div>
        ) : (
          installed.map(plugin => (
            <div key={plugin.url} style={{
              display:       'flex',
              alignItems:    'center',
              gap:           10,
              padding:       '8px 10px',
              borderRadius:  7,
              cursor:        'pointer',
              transition:    'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = S.card}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '1.1rem' }}>
                {plugin.type === 'instrument' ? '🎹' : '🎛️'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: S.text, fontSize: '0.82rem', fontWeight: 600 }}>
                  {plugin.name}
                </div>
                <div style={{ color: S.dim, fontSize: '0.68rem' }}>
                  {plugin.developer} · {plugin.subcategory}
                  {plugin.isCustom && <span style={{ color: S.orange }}> · Custom</span>}
                </div>
              </div>
              <button
                onClick={() => { onAddWAM(plugin.url); onClose?.(); }}
                style={{
                  background:   `${S.teal}20`,
                  border:       `1px solid ${S.teal}`,
                  color:        S.teal,
                  borderRadius: 5,
                  padding:      '3px 10px',
                  fontSize:     '0.72rem',
                  cursor:       'pointer',
                  fontWeight:   600,
                }}>
                Add
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {installed.length > 0 && (
        <div style={{
          padding:      '8px 16px',
          borderTop:    `1px solid ${S.border}`,
          background:   S.bg,
        }}>
          <Link to="/wam-plugin-store" style={{
            color:          S.dim,
            fontSize:       '0.73rem',
            textDecoration: 'none',
          }}>
            + Get more plugins from the store
          </Link>
        </div>
      )}
    </div>
  );
};

export default WAMPluginBrowserModal;
