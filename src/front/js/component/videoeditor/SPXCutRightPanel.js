/**
 * SPXCutRightPanel.js
 * 3 tabs: Effects Stack, Transform, Presets.
 * Zero inline CSS.
 */
import React, { useCallback, useState } from 'react';

const BLEND_MODES = [
  'normal','multiply','screen','overlay','darken','lighten',
  'color-dodge','color-burn','hard-light','soft-light',
  'difference','exclusion','hue','saturation','color','luminosity',
];

// ── Effects Stack Tab ─────────────────────────────────────────
function EffectsStackTab({ clip, actions }) {
  const [selectedFxId, setSelectedFxId] = useState(null);

  if (!clip) {
    return (
      <div className="spxcut-no-clip-msg">
        <span className="spxcut-no-clip-msg-icon">🎞️</span>
        <span className="spxcut-no-clip-msg-text">Select a clip to view its effects stack</span>
      </div>
    );
  }

  const selectedFx = clip.effects.find(e => e.id === selectedFxId);

  return (
    <div>
      {clip.effects.length === 0 && (
        <div className="spxcut-no-clip-msg size-h80">
          <span className="spxcut-no-clip-msg-text">Drag effects from the FX Library panel</span>
        </div>
      )}

      <div className="spxcut-fx-stack">
        {clip.effects.map((fx) => (
          <div
            key={fx.id}
            className={`spxcut-fx-stack-item${selectedFxId === fx.id ? ' fx-selected' : ''}`}
            onClick={() => setSelectedFxId(selectedFxId === fx.id ? null : fx.id)}
          >
            <span className="spxcut-fx-drag-handle">⠿</span>
            <button
              className={`spxcut-fx-enable-toggle${fx.enabled ? ' fx-enabled' : ''}`}
              onClick={(e) => { e.stopPropagation(); actions.toggleEffect(clip.id, fx.id); }}
              title={fx.enabled ? 'Disable' : 'Enable'}
            />
            <span className={`spxcut-fx-name${fx.enabled ? ' fx-enabled' : ''}`}>
              {fx.icon && <span className="spxcut-fx-icon-spacer">{fx.icon}</span>}
              {fx.name}
            </span>
            <button
              className="spxcut-fx-remove-btn"
              onClick={(e) => { e.stopPropagation(); actions.removeEffect(clip.id, fx.id); }}
              title="Remove"
            >✕</button>
          </div>
        ))}
      </div>

      {/* Parameter editor for selected effect */}
      {selectedFx && selectedFx.params && Object.keys(selectedFx.params).length > 0 && (
        <div className="spxcut-fx-params">
          {Object.entries(selectedFx.params).map(([key, val]) => {
            if (typeof val === 'number') {
              const isPercent = key.toLowerCase().includes('opacity') || key.toLowerCase().includes('wet') || key.toLowerCase().includes('mix');
              const isDecimal = val >= 0 && val <= 1 && key !== 'bits';
              const min  = isDecimal ? 0   : (key.includes('gain') || key.includes('Gain') ? -24 : -100);
              const max  = isDecimal ? 1   : (key.includes('gain') || key.includes('Gain') ? 24  : 100);
              const step = isDecimal ? 0.01 : 1;
              return (
                <div key={key} className="spxcut-param-row">
                  <span className="spxcut-param-label">{key}</span>
                  <input
                    type="range"
                    className="spxcut-param-slider"
                    min={min} max={max} step={step}
                    value={val}
                    onChange={e => actions.updateEffectParam(clip.id, selectedFx.id, key, parseFloat(e.target.value))}
                  />
                  <span className="spxcut-param-value">{isDecimal ? val.toFixed(2) : Math.round(val)}</span>
                </div>
              );
            }
            if (typeof val === 'boolean') {
              return (
                <div key={key} className="spxcut-param-row">
                  <span className="spxcut-param-label">{key}</span>
                  <label className="spxcut-form-checkbox">
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={e => actions.updateEffectParam(clip.id, selectedFx.id, key, e.target.checked)}
                    />
                    {val ? 'On' : 'Off'}
                  </label>
                </div>
              );
            }
            if (typeof val === 'string' && val.startsWith('#')) {
              return (
                <div key={key} className="spxcut-param-row">
                  <span className="spxcut-param-label">{key}</span>
                  <input
                    type="color"
                    value={val}
                    onChange={e => actions.updateEffectParam(clip.id, selectedFx.id, key, e.target.value)}
                  />
                  <span className="spxcut-param-value">{val}</span>
                </div>
              );
            }
            return (
              <div key={key} className="spxcut-param-row">
                <span className="spxcut-param-label">{key}</span>
                <span className="spxcut-param-value">{String(val).slice(0, 12)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Transform Tab ─────────────────────────────────────────────
function TransformTab({ clip, actions }) {
  const [uniformScale, setUniformScale] = useState(true);

  if (!clip) {
    return (
      <div className="spxcut-no-clip-msg">
        <span className="spxcut-no-clip-msg-icon">↔️</span>
        <span className="spxcut-no-clip-msg-text">Select a clip to edit transform</span>
      </div>
    );
  }

  const t = clip.transform;
  const update = (key, val) => actions.updateTransform(clip.id, { [key]: val });
  const updateNum = (key, e) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) update(key, v);
  };

  return (
    <div className="spxcut-transform">

      {/* Position */}
      <div className="spxcut-transform-group">
        <div className="spxcut-transform-group-title">Position</div>
        <div className="spxcut-transform-row">
          <span className="spxcut-transform-label">X</span>
          <input className="spxcut-transform-input" type="number" value={Math.round(t.x)} onChange={e => updateNum('x', e)} />
          <span className="spxcut-transform-unit">px</span>
        </div>
        <div className="spxcut-transform-row">
          <span className="spxcut-transform-label">Y</span>
          <input className="spxcut-transform-input" type="number" value={Math.round(t.y)} onChange={e => updateNum('y', e)} />
          <span className="spxcut-transform-unit">px</span>
        </div>
      </div>

      {/* Scale */}
      <div className="spxcut-transform-group">
        <div className="spxcut-transform-group-title">Scale</div>
        <div className="spxcut-transform-row">
          <span className="spxcut-transform-label">Scale X</span>
          <input
            className="spxcut-transform-input"
            type="number" step="0.01"
            value={t.scaleX.toFixed(2)}
            onChange={e => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) {
                actions.updateTransform(clip.id, uniformScale ? { scaleX: v, scaleY: v } : { scaleX: v });
              }
            }}
          />
          <span className="spxcut-transform-unit">×</span>
          <button
            className={`spxcut-transform-link${uniformScale ? ' link-active' : ''}`}
            onClick={() => setUniformScale(!uniformScale)}
            title={uniformScale ? 'Unlink scale' : 'Link scale'}
          >🔗</button>
        </div>
        <div className="spxcut-transform-row">
          <span className="spxcut-transform-label">Scale Y</span>
          <input
            className="spxcut-transform-input"
            type="number" step="0.01"
            value={t.scaleY.toFixed(2)}
            onChange={e => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) {
                actions.updateTransform(clip.id, uniformScale ? { scaleX: v, scaleY: v } : { scaleY: v });
              }
            }}
          />
          <span className="spxcut-transform-unit">×</span>
        </div>
      </div>

      {/* Rotation */}
      <div className="spxcut-transform-group">
        <div className="spxcut-transform-group-title">Rotation</div>
        <div className="spxcut-transform-row">
          <span className="spxcut-transform-label">Angle</span>
          <input
            className="spxcut-transform-input"
            type="number" step="0.1"
            value={t.rotation.toFixed(1)}
            onChange={e => updateNum('rotation', e)}
          />
          <span className="spxcut-transform-unit">°</span>
        </div>
      </div>

      {/* Opacity */}
      <div className="spxcut-transform-group">
        <div className="spxcut-transform-group-title">Opacity</div>
        <div className="spxcut-transform-row">
          <span className="spxcut-transform-label">Opacity</span>
          <input
            type="range" className="spxcut-param-slider"
            min={0} max={1} step={0.01}
            value={t.opacity}
            onChange={e => update('opacity', parseFloat(e.target.value))}
          />
          <span className="spxcut-param-value">{Math.round(t.opacity * 100)}%</span>
        </div>
      </div>

      {/* Blend Mode */}
      <div className="spxcut-transform-group">
        <div className="spxcut-transform-group-title">Compositing</div>
        <div className="spxcut-transform-row">
          <span className="spxcut-transform-label">Blend</span>
          <select
            className="spxcut-blend-select"
            value={t.blendMode}
            onChange={e => update('blendMode', e.target.value)}
          >
            {BLEND_MODES.map(m => (
              <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Reset button */}
      <button
        className="spxcut-modal-btn"
        onClick={() => actions.updateTransform(clip.id, { x:0, y:0, scaleX:1, scaleY:1, rotation:0, opacity:1, blendMode:'normal' })}
      >
        Reset Transform
      </button>
    </div>
  );
}

// ── Presets Tab ───────────────────────────────────────────────
function PresetsTab({ clip, actions }) {
  // Derive applied presets from clip.effects (preset chips reflect actual state)
  const appliedPresets = new Set((clip?.effects || []).map(e => e.name));

  const apply = useCallback((preset) => {
    if (!clip) return;
    actions.addEffect(clip.id, { name: preset, type: 'preset', icon: '🎞️', defaultParams: {} });
  }, [clip, actions]);

  // Quick access presets (most popular from both banks)
  const QUICK_PRESETS = [
    'Cinematic Warm', 'Teal & Orange', 'Bleach Bypass', 'Vintage Film',
    'Moody Noir', 'Golden Hour', 'Epic Blockbuster', 'Wedding Classic',
    'Film Grain Fine', 'Soft Focus', 'Vignette Soft', 'Cross Process',
  ];

  return (
    <div className="spxcut-presets-panel">
      {!clip && (
        <div className="spxcut-no-clip-msg size-h60">
          <span className="spxcut-no-clip-msg-text">Select a clip to apply presets</span>
        </div>
      )}

      <div className="spxcut-preset-category">
        <div className="spxcut-preset-cat-header">
          <span className="spxcut-preset-cat-name">Quick Apply</span>
        </div>
        <div className="spxcut-preset-grid">
          {QUICK_PRESETS.map((p, i) => (
            <button
              key={i}
              className={`spxcut-preset-chip${appliedPresets.has(p) ? ' preset-applied' : ''}`}
              onClick={() => apply(p)}
              disabled={!clip}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="spxcut-separator" />

      <div className="spxcut-preset-category">
        <div className="spxcut-preset-cat-header">
          <span className="spxcut-preset-cat-name">SPX LUT Pack</span>
          <span className="spxcut-preset-cat-count">15</span>
        </div>
        <div className="spxcut-preset-grid">
          {['SPX Film Emulsion','SPX Teal Tension','SPX Chrome Dust','SPX Neon Pulse','SPX Arctic Drift',
            'SPX Amber Road','SPX Velvet Night','SPX Bleached Sun','SPX Copper Wire','SPX Jade Forest',
            'SPX Blood Moon','SPX Silver Screen','SPX Haze Layer','SPX Infrared Burn','SPX Golden Ratio'].map((p, i) => (
            <button
              key={i}
              className={`spxcut-preset-chip${appliedPresets.has(p) ? ' preset-applied' : ''}`}
              onClick={() => apply(p)}
              disabled={!clip}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Right Panel ──────────────────────────────────────────
function SPXCutRightPanel({ state, actions, selectors, drag }) {
  const activeClip = selectors.getActiveClip();

  return (
    <div className="spxcut-right-panel">
      <div className="spxcut-tabs">
        <button
          className={`spxcut-tab${state.activeRightTab === 'effects' ? ' tab-active' : ''}`}
          onClick={() => actions.setRightTab('effects')}
        >FX</button>
        <button
          className={`spxcut-tab${state.activeRightTab === 'transform' ? ' tab-active' : ''}`}
          onClick={() => actions.setRightTab('transform')}
        >Transform</button>
        <button
          className={`spxcut-tab${state.activeRightTab === 'presets' ? ' tab-active' : ''}`}
          onClick={() => actions.setRightTab('presets')}
        >Presets</button>
      </div>

      <div className="spxcut-tab-content">
        {state.activeRightTab === 'effects'   && <EffectsStackTab clip={activeClip} actions={actions} />}
        {state.activeRightTab === 'transform' && <TransformTab    clip={activeClip} actions={actions} />}
        {state.activeRightTab === 'presets'   && <PresetsTab      clip={activeClip} actions={actions} />}
      </div>
    </div>
  );
}

export default SPXCutRightPanel;
