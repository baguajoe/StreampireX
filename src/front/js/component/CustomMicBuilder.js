// =============================================================================
// CustomMicBuilder.js — User-Created Microphone Profile Builder
// =============================================================================
// Lets users build custom mic emulation profiles by adding filter stages,
// setting compressor/saturation parameters, and visualizing the combined
// frequency response curve in real-time.
//
// Saved profiles integrate directly into MicSimulator's MIC_PROFILES system.
//
// Usage:
//   <CustomMicBuilder
//     onSave={(profileId, profile) => { /* add to MIC_PROFILES */ }}
//     onClose={() => setShowBuilder(false)}
//     existingProfile={null}  // pass a profile object to edit
//   />
// =============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';

// =============================================================================
// CONSTANTS
// =============================================================================

const FILTER_TYPES = [
  { value: 'highpass',  label: 'High Pass',  icon: '↗', description: 'Cuts frequencies below cutoff' },
  { value: 'lowpass',   label: 'Low Pass',   icon: '↘', description: 'Cuts frequencies above cutoff' },
  { value: 'lowshelf',  label: 'Low Shelf',  icon: '⬇', description: 'Boost/cut all lows' },
  { value: 'highshelf', label: 'High Shelf', icon: '⬆', description: 'Boost/cut all highs' },
  { value: 'peaking',   label: 'Peaking EQ',  icon: '⛰', description: 'Boost/cut around a frequency' },
];

const PRESET_TEMPLATES = [
  { name: 'Blank', icon: '📄', filters: [], compressor: null, saturation: 0 },
  { name: 'Warm Dynamic', icon: '🔥', filters: [
    { type: 'highpass', frequency: 80, Q: 0.7, gain: 0 },
    { type: 'lowshelf', frequency: 200, Q: 1, gain: 2 },
    { type: 'peaking', frequency: 3500, Q: 0.8, gain: 3 },
    { type: 'highshelf', frequency: 10000, Q: 1, gain: -3 },
  ], compressor: { threshold: -18, knee: 10, ratio: 3, attack: 0.01, release: 0.15 }, saturation: 0.05 },
  { name: 'Bright Condenser', icon: '✨', filters: [
    { type: 'highpass', frequency: 40, Q: 0.7, gain: 0 },
    { type: 'peaking', frequency: 4000, Q: 0.8, gain: 2.5 },
    { type: 'peaking', frequency: 8000, Q: 1.0, gain: 3.0 },
    { type: 'highshelf', frequency: 12000, Q: 1, gain: 3.0 },
  ], compressor: { threshold: -22, knee: 8, ratio: 2, attack: 0.003, release: 0.1 }, saturation: 0.02 },
  { name: 'Radio Voice', icon: '📻', filters: [
    { type: 'highpass', frequency: 100, Q: 1.0, gain: 0 },
    { type: 'lowshelf', frequency: 150, Q: 1, gain: -4 },
    { type: 'peaking', frequency: 1500, Q: 0.5, gain: 4 },
    { type: 'peaking', frequency: 4000, Q: 0.7, gain: 5 },
    { type: 'lowpass', frequency: 14000, Q: 0.8, gain: 0 },
  ], compressor: { threshold: -10, knee: 5, ratio: 8, attack: 0.002, release: 0.05 }, saturation: 0.12 },
  { name: 'Lo-Fi Vintage', icon: '📼', filters: [
    { type: 'highpass', frequency: 120, Q: 0.5, gain: 0 },
    { type: 'peaking', frequency: 800, Q: 0.4, gain: 3 },
    { type: 'lowpass', frequency: 8000, Q: 0.6, gain: 0 },
  ], compressor: { threshold: -12, knee: 20, ratio: 6, attack: 0.02, release: 0.2 }, saturation: 0.2 },
];

const COLORS = ['#FF6B6B', '#00FFC8', '#4A9EFF', '#FFD700', '#FF6600', '#B180D7', '#FF69B4', '#00D4AA'];

const FREQ_MIN = 20;
const FREQ_MAX = 20000;

// =============================================================================
// FREQUENCY RESPONSE CALCULATION
// =============================================================================

const computeResponse = (filters, numPoints = 256) => {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const ratio = i / (numPoints - 1);
    const freq = FREQ_MIN * Math.pow(FREQ_MAX / FREQ_MIN, ratio);
    let totalGain = 0;

    filters.forEach(f => {
      const f0 = f.frequency || 1000;
      const Q = f.Q || 1.0;
      const gain = f.gain || 0;

      switch (f.type) {
        case 'highpass': {
          const r = f0 / freq;
          if (r > 1) totalGain -= 12 * Math.log2(r) * Q;
          break;
        }
        case 'lowpass': {
          const r = freq / f0;
          if (r > 1) totalGain -= 12 * Math.log2(r) * Q;
          break;
        }
        case 'lowshelf': {
          const r = freq / f0;
          const response = 1 / (1 + Math.pow(r, 2));
          totalGain += gain * response;
          break;
        }
        case 'highshelf': {
          const r = f0 / freq;
          const response = 1 / (1 + Math.pow(r, 2));
          totalGain += gain * response;
          break;
        }
        case 'peaking': {
          const delta = Math.log2(freq / f0);
          const response = Math.exp(-0.5 * Math.pow(delta * Q * 2, 2));
          totalGain += gain * response;
          break;
        }
        default: break;
      }
    });

    points.push({ freq, gain: Math.max(-24, Math.min(24, totalGain)) });
  }
  return points;
};

// =============================================================================
// FREQUENCY RESPONSE CANVAS
// =============================================================================

const FrequencyResponseCanvas = ({ filters, width = 400, height = 160, color = '#00FFC8' }) => {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const pad = { top: 10, right: 10, bottom: 22, left: 35 };
    const pw = width - pad.left - pad.right;
    const ph = height - pad.top - pad.bottom;

    // Background
    ctx.fillStyle = 'rgba(10, 22, 40, 0.95)';
    ctx.fillRect(0, 0, width, height);

    // Grid
    const freqLabels = [50, 100, 500, '1k', '5k', '10k'];
    const freqVals = [50, 100, 500, 1000, 5000, 10000];
    const logMin = Math.log10(FREQ_MIN);
    const logMax = Math.log10(FREQ_MAX);

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    freqVals.forEach((f, i) => {
      const x = pad.left + ((Math.log10(f) - logMin) / (logMax - logMin)) * pw;
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + ph); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(freqLabels[i].toString(), x, height - 4);
    });

    [-12, -6, 0, 6, 12].forEach(g => {
      const y = pad.top + ((12 - g) / 24) * ph;
      ctx.strokeStyle = g === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = g === 0 ? 1 : 0.5;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + pw, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${g > 0 ? '+' : ''}${g}`, pad.left - 4, y + 3);
    });

    // Curve
    const points = computeResponse(filters, 256);
    if (points.length === 0) return;

    // Fill
    ctx.beginPath();
    const zeroY = pad.top + ph / 2;
    ctx.moveTo(pad.left, zeroY);
    points.forEach((pt, i) => {
      const x = pad.left + (i / (points.length - 1)) * pw;
      const y = pad.top + ((12 - pt.gain) / 24) * ph;
      ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + pw, zeroY);
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ph);
    fillGrad.addColorStop(0, `${color}18`);
    fillGrad.addColorStop(0.5, `${color}05`);
    fillGrad.addColorStop(1, `${color}18`);
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Line
    ctx.beginPath();
    points.forEach((pt, i) => {
      const x = pad.left + (i / (points.length - 1)) * pw;
      const y = pad.top + ((12 - pt.gain) / 24) * ph;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = `${color}66`;
    ctx.shadowBlur = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad.left, pad.top, pw, ph);
  }, [filters, width, height, color]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${width}px`, height: `${height}px`, borderRadius: '6px', display: 'block' }}
    />
  );
};

// =============================================================================
// FILTER STAGE EDITOR
// =============================================================================

const FilterStageEditor = ({ filter, index, onChange, onRemove, color }) => {
  const typeInfo = FILTER_TYPES.find(t => t.value === filter.type) || FILTER_TYPES[0];
  const showGain = ['lowshelf', 'highshelf', 'peaking'].includes(filter.type);
  const showQ = ['highpass', 'lowpass', 'peaking'].includes(filter.type);

  return (
    <div className="cmb-filter-stage" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="cmb-filter-header">
        <span className="cmb-filter-icon">{typeInfo.icon}</span>
        <select
          value={filter.type}
          onChange={e => onChange({ ...filter, type: e.target.value })}
          className="cmb-filter-type-select"
        >
          {FILTER_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <span className="cmb-filter-num">#{index + 1}</span>
        <button className="cmb-filter-remove" onClick={onRemove} title="Remove filter">✕</button>
      </div>

      <div className="cmb-filter-params">
        <div className="cmb-param">
          <label>Freq</label>
          <input
            type="range" min={20} max={20000} step={1}
            value={filter.frequency}
            onChange={e => onChange({ ...filter, frequency: Number(e.target.value) })}
          />
          <span className="cmb-param-val">
            {filter.frequency >= 1000 ? `${(filter.frequency / 1000).toFixed(1)}k` : filter.frequency} Hz
          </span>
        </div>

        {showGain && (
          <div className="cmb-param">
            <label>Gain</label>
            <input
              type="range" min={-12} max={12} step={0.5}
              value={filter.gain || 0}
              onChange={e => onChange({ ...filter, gain: Number(e.target.value) })}
            />
            <span className="cmb-param-val">
              {(filter.gain || 0) > 0 ? '+' : ''}{(filter.gain || 0).toFixed(1)} dB
            </span>
          </div>
        )}

        {showQ && (
          <div className="cmb-param">
            <label>Q</label>
            <input
              type="range" min={0.1} max={10} step={0.1}
              value={filter.Q || 1}
              onChange={e => onChange({ ...filter, Q: Number(e.target.value) })}
            />
            <span className="cmb-param-val">{(filter.Q || 1).toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const CustomMicBuilder = ({ onSave, onClose, existingProfile = null }) => {
  const [name, setName] = useState(existingProfile?.name || 'My Custom Mic');
  const [description, setDescription] = useState(existingProfile?.description || '');
  const [icon, setIcon] = useState(existingProfile?.icon || '🎤');
  const [color, setColor] = useState(existingProfile?.color || '#00FFC8');
  const [filters, setFilters] = useState(existingProfile?.filters || []);
  const [useCompressor, setUseCompressor] = useState(!!existingProfile?.compressor);
  const [compressor, setCompressor] = useState(existingProfile?.compressor || {
    threshold: -18, knee: 10, ratio: 3, attack: 0.01, release: 0.15,
  });
  const [saturation, setSaturation] = useState(existingProfile?.saturation || 0);
  const [noiseFloor, setNoiseFloor] = useState(existingProfile?.noiseFloor || -70);

  // ── Add filter stage ──
  const addFilter = () => {
    if (filters.length >= 8) return; // Max 8 filters
    setFilters([...filters, { type: 'peaking', frequency: 1000, Q: 1.0, gain: 0 }]);
  };

  // ── Update filter ──
  const updateFilter = (index, updated) => {
    setFilters(filters.map((f, i) => i === index ? updated : f));
  };

  // ── Remove filter ──
  const removeFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  // ── Load template ──
  const loadTemplate = (template) => {
    setFilters([...template.filters]);
    if (template.compressor) {
      setUseCompressor(true);
      setCompressor({ ...template.compressor });
    } else {
      setUseCompressor(false);
    }
    setSaturation(template.saturation || 0);
  };

  // ── Build profile object ──
  const buildProfile = () => ({
    name,
    icon,
    type: 'Custom',
    description: description || `Custom mic profile: ${name}`,
    color,
    filters: filters.map(f => {
      const cleaned = { type: f.type, frequency: f.frequency };
      if (['highpass', 'lowpass', 'peaking'].includes(f.type)) cleaned.Q = f.Q || 1.0;
      if (['lowshelf', 'highshelf', 'peaking'].includes(f.type)) cleaned.gain = f.gain || 0;
      return cleaned;
    }),
    compressor: useCompressor ? { ...compressor } : null,
    saturation,
    noiseFloor,
  });

  // ── Save ──
  const handleSave = () => {
    const profileId = `custom_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const profile = buildProfile();
    if (onSave) onSave(profileId, profile);
  };

  // ── Icons for picker ──
  const ICONS = ['🎤', '🎙️', '📻', '🔊', '🎵', '🎧', '🔈', '⚡', '🎶', '💎', '🌟', '🔥'];

  return (
    <div className="cmb-overlay">
      <div className="cmb-modal">
        {/* Header */}
        <div className="cmb-header">
          <h3><span>{icon}</span> Custom Mic Builder</h3>
          <button className="cmb-close" onClick={onClose}>✕</button>
        </div>

        <div className="cmb-body">
          {/* Left column: settings */}
          <div className="cmb-left">
            {/* Profile Info */}
            <div className="cmb-section">
              <h4>Profile Info</h4>
              <div className="cmb-row">
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Profile name" className="cmb-name-input" maxLength={30}
                />
              </div>
              <div className="cmb-row">
                <input
                  type="text" value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Short description" className="cmb-desc-input" maxLength={80}
                />
              </div>
              <div className="cmb-row cmb-icon-row">
                <span className="cmb-label">Icon:</span>
                <div className="cmb-icon-picker">
                  {ICONS.map(ic => (
                    <button
                      key={ic}
                      className={`cmb-icon-btn ${icon === ic ? 'active' : ''}`}
                      onClick={() => setIcon(ic)}
                    >{ic}</button>
                  ))}
                </div>
              </div>
              <div className="cmb-row cmb-color-row">
                <span className="cmb-label">Color:</span>
                <div className="cmb-color-picker">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      className={`cmb-color-btn ${color === c ? 'active' : ''}`}
                      style={{ background: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Templates */}
            <div className="cmb-section">
              <h4>Start from Template</h4>
              <div className="cmb-templates">
                {PRESET_TEMPLATES.map((t, i) => (
                  <button key={i} className="cmb-template-btn" onClick={() => loadTemplate(t)}>
                    <span>{t.icon}</span> {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Chain */}
            <div className="cmb-section">
              <div className="cmb-section-header">
                <h4>Filter Chain ({filters.length}/8)</h4>
                <button
                  className="cmb-add-btn"
                  onClick={addFilter}
                  disabled={filters.length >= 8}
                >+ Add Filter</button>
              </div>

              {filters.length === 0 ? (
                <div className="cmb-empty">No filters — click "Add Filter" or choose a template</div>
              ) : (
                <div className="cmb-filters-list">
                  {filters.map((f, i) => (
                    <FilterStageEditor
                      key={i}
                      filter={f}
                      index={i}
                      color={COLORS[i % COLORS.length]}
                      onChange={(updated) => updateFilter(i, updated)}
                      onRemove={() => removeFilter(i)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Compressor */}
            <div className="cmb-section">
              <div className="cmb-section-header">
                <h4>Compressor</h4>
                <label className="cmb-toggle">
                  <input type="checkbox" checked={useCompressor} onChange={e => setUseCompressor(e.target.checked)} />
                  <span>{useCompressor ? 'ON' : 'OFF'}</span>
                </label>
              </div>

              {useCompressor && (
                <div className="cmb-comp-params">
                  <div className="cmb-param">
                    <label>Threshold</label>
                    <input type="range" min={-40} max={0} step={1} value={compressor.threshold}
                      onChange={e => setCompressor({ ...compressor, threshold: Number(e.target.value) })} />
                    <span className="cmb-param-val">{compressor.threshold} dB</span>
                  </div>
                  <div className="cmb-param">
                    <label>Ratio</label>
                    <input type="range" min={1} max={20} step={0.5} value={compressor.ratio}
                      onChange={e => setCompressor({ ...compressor, ratio: Number(e.target.value) })} />
                    <span className="cmb-param-val">{compressor.ratio}:1</span>
                  </div>
                  <div className="cmb-param">
                    <label>Attack</label>
                    <input type="range" min={0.001} max={0.1} step={0.001} value={compressor.attack}
                      onChange={e => setCompressor({ ...compressor, attack: Number(e.target.value) })} />
                    <span className="cmb-param-val">{(compressor.attack * 1000).toFixed(0)} ms</span>
                  </div>
                  <div className="cmb-param">
                    <label>Release</label>
                    <input type="range" min={0.01} max={0.5} step={0.01} value={compressor.release}
                      onChange={e => setCompressor({ ...compressor, release: Number(e.target.value) })} />
                    <span className="cmb-param-val">{(compressor.release * 1000).toFixed(0)} ms</span>
                  </div>
                  <div className="cmb-param">
                    <label>Knee</label>
                    <input type="range" min={0} max={40} step={1} value={compressor.knee}
                      onChange={e => setCompressor({ ...compressor, knee: Number(e.target.value) })} />
                    <span className="cmb-param-val">{compressor.knee}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Saturation & Noise */}
            <div className="cmb-section">
              <h4>Character</h4>
              <div className="cmb-param">
                <label>Saturation</label>
                <input type="range" min={0} max={0.3} step={0.005} value={saturation}
                  onChange={e => setSaturation(Number(e.target.value))} />
                <span className="cmb-param-val">{(saturation * 100).toFixed(0)}%</span>
              </div>
              <div className="cmb-param">
                <label>Noise Floor</label>
                <input type="range" min={-90} max={-30} step={1} value={noiseFloor}
                  onChange={e => setNoiseFloor(Number(e.target.value))} />
                <span className="cmb-param-val">{noiseFloor} dB</span>
              </div>
            </div>
          </div>

          {/* Right column: preview */}
          <div className="cmb-right">
            <div className="cmb-preview-section">
              <h4>Frequency Response Preview</h4>
              <FrequencyResponseCanvas
                filters={filters}
                width={380}
                height={180}
                color={color}
              />
            </div>

            <div className="cmb-profile-preview">
              <h4>Profile Summary</h4>
              <div className="cmb-summary">
                <div className="cmb-summary-row">
                  <span className="cmb-summary-icon" style={{ fontSize: '2rem' }}>{icon}</span>
                  <div>
                    <div className="cmb-summary-name" style={{ color }}>{name}</div>
                    <div className="cmb-summary-type">Custom Mic</div>
                  </div>
                </div>
                <div className="cmb-summary-desc">{description || 'No description'}</div>
                <div className="cmb-summary-stats">
                  <span>{filters.length} filter{filters.length !== 1 ? 's' : ''}</span>
                  <span>{useCompressor ? `Comp ${compressor.ratio}:1` : 'No comp'}</span>
                  <span>Sat: {(saturation * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="cmb-actions">
              <button className="cmb-cancel-btn" onClick={onClose}>Cancel</button>
              <button
                className="cmb-save-btn"
                onClick={handleSave}
                disabled={!name.trim() || filters.length === 0}
                style={{ background: color }}
              >
                💾 Save Mic Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomMicBuilder;