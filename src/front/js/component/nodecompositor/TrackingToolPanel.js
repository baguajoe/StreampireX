import React from "react";

export default function TrackingToolPanel({ tracking, setTracking }) {
  const set = (k, v) => setTracking((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="nc-panel">
      <div className="nc-panel-title">Tracking</div>

      <label className="nc-row">
        <input type="checkbox" checked={tracking.enabled} onChange={(e) => set("enabled", e.target.checked)} />
        <span>Enable Tracking</span>
      </label>

      <label className="nc-field">
        <span>Mode</span>
        <select value={tracking.mode} onChange={(e) => set("mode", e.target.value)}>
          <option value="point">Point Track</option>
          <option value="object">Object Attach</option>
        </select>
      </label>

      <label className="nc-field">
        <span>Smoothing</span>
        <input type="range" min="0" max="1" step="0.01" value={tracking.smoothing} onChange={(e) => set("smoothing", parseFloat(e.target.value))} />
      </label>

      <button
        className="nc-btn-primary"
        type="button"
        onClick={() =>
          setTracking((prev) => ({
            ...prev,
            points: [...prev.points, { id: Date.now(), x: 50, y: 50, frame: 0 }],
          }))
        }
      >
        Add Tracking Point
      </button>
    </div>
  );
}
