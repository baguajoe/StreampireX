import React, { useState } from "react";

export default function BeatSyncToolPanel() {
  const [bpm, setBpm] = useState(120);
  const [sensitivity, setSensitivity] = useState(0.65);
  const [mode, setMode] = useState("cuts");

  return (
    <div className="nc-tool-panel">
      <div className="nc-panel-title">Beat Sync</div>

      <div className="nc-tool-grid">
        <label className="nc-tool-field">
          <span>BPM</span>
          <input type="number" value={bpm} onChange={(e) => setBpm(parseInt(e.target.value || 120, 10))} />
        </label>

        <label className="nc-tool-field">
          <span>Mode</span>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="cuts">Cuts</option>
            <option value="camera">Camera Pushes</option>
            <option value="opacity">Opacity Pulses</option>
            <option value="transforms">Transforms</option>
          </select>
        </label>

        <label className="nc-tool-field nc-tool-field-wide">
          <span>Sensitivity</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
          />
          <small>{sensitivity.toFixed(2)}</small>
        </label>
      </div>

      <div className="nc-tool-actions">
        <button className="nc-btn-primary" type="button">Analyze Audio</button>
        <button className="nc-btn-secondary" type="button">Apply Beat Markers</button>
      </div>
    </div>
  );
}
