import React from 'react';

const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '120px 1fr auto',
  gap: '10px',
  alignItems: 'center',
  padding: '8px 0',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

export default function KeyframePanel({
  selectedClip,
  propertyOptions = [],
  selectedProperty,
  setSelectedProperty,
  currentValue,
  currentTime,
  keyframes = [],
  onAddKeyframe,
  onRemoveKeyframe,
  onSeekToKeyframe,
}) {
  if (!selectedClip) {
    return (
      <div className="keyframe-panel">
        <h4>Keyframes</h4>
        <p>Select a clip to edit animation.</p>
      </div>
    );
  }

  return (
    <div className="keyframe-panel">
      <h4>Keyframes — {selectedClip.title || selectedClip.id}</h4>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Animated Property</label>
        <select
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          style={{ width: '100%', padding: 8 }}
        >
          {propertyOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => onAddKeyframe?.(selectedProperty, currentTime, currentValue)}>
          + Add Keyframe
        </button>
        <div style={{ opacity: 0.8, fontSize: 12, paddingTop: 8 }}>
          Time: {Number(currentTime || 0).toFixed(2)}s | Value: {Number(currentValue || 0).toFixed(2)}
        </div>
      </div>

      <div>
        {keyframes.length === 0 ? (
          <p>No keyframes for this property yet.</p>
        ) : (
          keyframes.map((kf) => (
            <div key={kf.id} style={rowStyle}>
              <button onClick={() => onSeekToKeyframe?.(kf.time)}>
                {kf.time.toFixed(2)}s
              </button>
              <div>
                Value: {Number(kf.value).toFixed(2)} | Mode: {kf.interpolation}
              </div>
              <button onClick={() => onRemoveKeyframe?.(selectedProperty, kf.id)}>
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
